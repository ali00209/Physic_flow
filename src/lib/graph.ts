import { fmt, math } from './math'
import { findFormula } from './registry'
import { findConstant } from './constants'
import { runSheet, solveFormulaNode, type FormulaSolve } from './evaluate'
import type { SheetRow } from './sheet'

// ---- What the canvas stores -------------------------------------------------

export type SheetRowDef = { id: string; dir: 'in' | 'out'; name: string }
export type CalcData = { lines: string; rows: SheetRowDef[] }
export type FormulaData = { formulaId: string; values: string; target: string }
export type ConstantData = { constId: string }
export type NodeKind = 'calc' | 'formula' | 'const'

export type GraphNode = { id: string; kind: NodeKind; data: CalcData | FormulaData | ConstantData }
export type GraphEdge = { id: string; source: string; sourceHandle: string | null; target: string; targetHandle: string | null }

// ---- What the canvas shows ----------------------------------------------------

export type NodeView = {
	/** Text shown at each handle that has a value: key is the handle id. */
	handleText: Record<string, string>
	/** Calculation sheet: one result per statement. */
	sheetRows?: SheetRow[]
	/** Physics formula: the solved line, or the reason it can't be solved yet. */
	formula?: FormulaSolve
	/** A loop, or a node that can't be computed. */
	error?: string
}

export type GraphResult = { views: Record<string, NodeView> }

const FORMULA_OUT = 'out'

/** The formula variable, or the sheet row, that a handle id refers to. */
export function handleDirection(node: GraphNode, handle: string | null): 'in' | 'out' | null {
	if (!handle) return null
	if (node.kind === 'const') return handle === FORMULA_OUT ? 'out' : null
	if (node.kind === 'formula') {
		if (handle === FORMULA_OUT) return 'out'
		if (handle.startsWith('in:')) return 'in'
		return null
	}
	const row = (node.data as CalcData).rows.find((r) => r.id === handle)
	return row ? row.dir : null
}

/** Whether `goal` can be reached from `start` by following wires forwards. */
export function reaches(edges: GraphEdge[], start: string, goal: string): boolean {
	const seen = new Set<string>()
	const stack = [start]
	while (stack.length) {
		const n = stack.pop()!
		if (n === goal) return true
		if (seen.has(n)) continue
		seen.add(n)
		for (const e of edges) if (e.source === n) stack.push(e.target)
	}
	return false
}

/** Why a wire can't be drawn, or null when it can. */
export function checkConnection(
	nodes: GraphNode[],
	edges: GraphEdge[],
	c: { source: string | null; sourceHandle: string | null; target: string | null; targetHandle: string | null }
): string | null {
	if (!c.source || !c.target) return 'Pick an output and an input.'
	const src = nodes.find((n) => n.id === c.source)
	const dst = nodes.find((n) => n.id === c.target)
	if (!src || !dst) return 'Unknown node.'
	if (handleDirection(src, c.sourceHandle) !== 'out') return 'Wires start at an output.'
	if (handleDirection(dst, c.targetHandle) !== 'in') return 'Wires end at an input.'
	if (c.source === c.target) return 'A node cannot feed itself.'
	if (reaches(edges, c.target, c.source)) return 'That wire would make a loop.'
	return null
}

/**
 * Runs the whole graph in order: every wire carries its source's value to its input, so a change
 * anywhere flows downstream immediately. Each node gets a view for the canvas to show.
 */
export function computeGraph(nodes: GraphNode[], edges: GraphEdge[]): GraphResult {
	const views: Record<string, NodeView> = {}
	const values = new Map<string, unknown>() // `${nodeId}|${handle}` -> value

	// Order nodes so each runs after the nodes that feed it.
	const indeg = new Map(nodes.map((n) => [n.id, 0]))
	for (const e of edges) if (indeg.has(e.target)) indeg.set(e.target, (indeg.get(e.target) ?? 0) + 1)
	const queue = nodes.filter((n) => indeg.get(n.id) === 0).map((n) => n.id)
	const order: string[] = []
	while (queue.length) {
		const id = queue.shift()!
		order.push(id)
		for (const e of edges) {
			if (e.source !== id) continue
			const d = (indeg.get(e.target) ?? 0) - 1
			indeg.set(e.target, d)
			if (d === 0) queue.push(e.target)
		}
	}
	for (const n of nodes) if (!order.includes(n.id)) views[n.id] = { handleText: {}, error: 'Loop: this node cannot be calculated.' }

	const byId = new Map(nodes.map((n) => [n.id, n]))
	for (const id of order) {
		const node = byId.get(id)!
		// The latest wire into an input wins, so later edges override earlier ones.
		const incoming = new Map<string, unknown>()
		const wiredInputs = new Set<string>() // inputs with a wire, whether or not its value exists yet
		for (const e of edges) {
			if (e.target !== id || !e.targetHandle || !e.sourceHandle) continue
			wiredInputs.add(e.targetHandle)
			const key = `${e.source}|${e.sourceHandle}`
			if (values.has(key)) incoming.set(e.targetHandle, values.get(key))
		}

		const view: NodeView = { handleText: {} }
		// A wired input with no value yet says so, instead of looking unconnected.
		for (const h of wiredInputs) if (!incoming.has(h)) view.handleText[h] = 'waiting'
		if (node.kind === 'calc') {
			const data = node.data as CalcData
			const inputs: Record<string, unknown> = {}
			for (const row of data.rows) {
				if (row.dir !== 'in' || !row.name.trim() || !incoming.has(row.id)) continue
				inputs[row.name.trim()] = incoming.get(row.id)
				view.handleText[row.id] = fmt(incoming.get(row.id))
			}
			const { rows, scope } = runSheet(data.lines, inputs)
			view.sheetRows = rows
			for (const row of data.rows) {
				if (row.dir !== 'out' || !row.name.trim()) continue
				const v = scope[row.name.trim()]
				if (v === undefined) continue
				values.set(`${id}|${row.id}`, v)
				view.handleText[row.id] = fmt(v)
			}
		} else if (node.kind === 'const') {
			const c = findConstant((node.data as ConstantData).constId)
			if (c) {
				const v = math.evaluate(c.value)
				values.set(`${id}|${FORMULA_OUT}`, v)
				view.handleText[FORMULA_OUT] = fmt(v)
			} else {
				view.error = 'Unknown constant'
			}
		} else {
			const data = node.data as FormulaData
			const f = findFormula(data.formulaId)
			const raw: Record<string, unknown> = {}
			for (const v of f?.vars ?? []) {
				if (incoming.has(`in:${v.symbol}`)) raw[v.symbol] = incoming.get(`in:${v.symbol}`)
			}
			const solved = solveFormulaNode(data, raw)
			view.formula = solved
			for (const [sym, text] of Object.entries(solved.wired)) view.handleText[`in:${sym}`] = text
			if (solved.result.ok) {
				values.set(`${id}|${FORMULA_OUT}`, solved.result.value)
				view.handleText[FORMULA_OUT] = fmt(solved.result.value)
			}
		}
		views[id] = view
	}
	return { views }
}

import { math } from './math'
import { asciiUnit } from './sheet'
import { resolveFormulaValues, type RawInputs } from './evaluate'
import { findFormula } from './registry'
import type { FormulaData } from './graph'

// ---- Graph kinds: each one is its own node on the canvas ---------------------

export type GraphKind = 'line' | 'scatter' | 'motion'
export const GRAPH_KINDS: GraphKind[] = ['line', 'scatter', 'motion']
export const isGraphKind = (k: string): k is GraphKind => (GRAPH_KINDS as string[]).includes(k)
export const GRAPH_TITLE: Record<GraphKind, string> = {
	line: 'Line graph',
	scatter: 'Scatter graph',
	motion: 'Motion graph',
}

export type MotionQty = 'x' | 'v' | 'a'

/** One formula input on a line or scatter graph. The formula arrives by wire; this keeps only how to draw it. */
export type SeriesSetting = { sweep: string; color: string; visible: boolean }

/**
 * What a graph node keeps. No physical values live here: every value (formulas, range, motion
 * start values) comes in through a wire. Only the drawing choices are stored.
 */
export type GraphData = {
	title: string
	/** Typed values for inputs nothing is wired into, keyed by handle id. A wire always wins. */
	inline: Record<string, string>
	/** Motion graphs only: which quantity is plotted against time. */
	qty: MotionQty
	/** Line and scatter graphs: one entry per formula input. */
	series: SeriesSetting[]
	xMin: string
	xMax: string
	yMin: string
	yMax: string
	xUnit: string
	yUnit: string
	width: number
	height: number
}

export const MAX_STEPS = 1000
export const MIN_STEPS = 2
export const DEFAULT_STEPS = 100
export const MAX_SERIES = 5
const COLORS = ['#4f46e5', '#dc2626', '#059669', '#d97706', '#0891b2']

export const nextColor = (count: number) => COLORS[count % COLORS.length]

export function defaultGraph(kind: GraphKind): GraphData {
	return {
		title: GRAPH_TITLE[kind],
		inline: {},
		qty: 'x',
		series: kind === 'motion' ? [] : [{ sweep: '', color: COLORS[0], visible: true }],
		xMin: '',
		xMax: '',
		yMin: '',
		yMax: '',
		xUnit: '',
		yUnit: '',
		width: 360,
		height: 420,
	}
}

/** The inputs a graph node shows, each with its handle id. Line/scatter: one per formula, plus the shared range. */
export type InputRow = { handle: string; label: string; hint: string }

export function inputRows(kind: GraphKind, data: GraphData): InputRow[] {
	if (kind === 'motion') {
		return [
			{ handle: 'm:x0', label: 'x₀ start position', hint: 'e.g. 0 m' },
			{ handle: 'm:v0', label: 'v₀ start velocity', hint: 'e.g. 2 m/s' },
			{ handle: 'm:a', label: 'a acceleration', hint: 'e.g. 1 m/s^2' },
			{ handle: 'm:start', label: 't start', hint: 'e.g. 0 s' },
			{ handle: 'm:end', label: 't end', hint: 'e.g. 5 s' },
			{ handle: 'm:steps', label: 'steps', hint: 'e.g. 100' },
		]
	}
	return [
		...data.series.map((_, i) => ({ handle: `ser:${i}`, label: `Formula ${i + 1}`, hint: '' })),
		{ handle: 'range:start', label: 'start', hint: 'e.g. 0 A' },
		{ handle: 'range:end', label: 'end', hint: 'e.g. 2 A' },
		{ handle: 'range:steps', label: 'steps', hint: 'e.g. 100' },
	]
}

export const clampSteps = (n: number) => Math.min(MAX_STEPS, Math.max(MIN_STEPS, Math.round(n) || DEFAULT_STEPS))

export function linspace(a: number, b: number, n: number): number[] {
	if (n <= 1) return [a]
	return Array.from({ length: n }, (_, i) => a + ((b - a) * i) / (n - 1))
}

// ---- Reading values -------------------------------------------------------------

/** A value as a plain number in SI units. NaN when it can't be read. */
export function siNumber(v: unknown): number {
	try {
		if (math.typeOf(v as any) === 'Unit') {
			const u = v as any
			return u.toNumber(u.toSI().formatUnits())
		}
		return Number(v)
	} catch {
		return NaN
	}
}

/**
 * A wired value in SI. A value with its own unit is converted; a plain number is taken to be in
 * `unit` (the sweep variable's unit). NaN when it can't be read.
 */
export function inSI(v: unknown, unit: string): number {
	if (v === undefined) return NaN
	try {
		if (math.typeOf(v as any) === 'Unit') return siNumber(v)
		const n = Number(v)
		return unit.trim() ? siNumber(math.unit(n, asciiUnit(unit.trim()))) : n
	} catch {
		return NaN
	}
}

/** The SI unit text for a unit, e.g. "m/s^2" becomes "m / s^2". Empty for no unit. */
export function siUnitOf(unit: string): string {
	if (!unit.trim()) return ''
	try {
		return math.evaluate(`(1 ${asciiUnit(unit.trim())})`).toSI().formatUnits()
	} catch {
		return ''
	}
}

/** Returns the scale that turns SI into the unit the user asked to show. Null when the units don't match. */
export function displayFactor(si: string, override: string): number | null {
	if (!override.trim() || !si) return 1
	try {
		return math.unit(1, si).toNumber(asciiUnit(override.trim()))
	} catch {
		return null
	}
}

// ---- What the canvas shows -----------------------------------------------------

export type VarInfo = { symbol: string; label: string; unit: string }

export type SeriesView = {
	name: string
	color: string
	visible: boolean
	/** The formula variable this series sweeps, or '' when there is no formula. */
	sweep: string
	/** Values after the unit choice. Null marks a point that could not be calculated. */
	xs: number[]
	ys: (number | null)[]
	skipped: number
	error?: string
	/** Line and scatter: the variables the sweep can use. */
	options: VarInfo[]
}

export type GraphView = {
	kind: GraphKind
	/** Every input the node shows, in order, so the node can draw rows before anything is wired. */
	inputs: InputRow[]
	xLabel: string
	yLabel: string
	xFactor: number
	yFactor: number
	series: SeriesView[]
	skipped: number
	error?: string
}

export type GraphInputs = {
	/** For each formula input: the formula card feeding it, and the values wired into that card. */
	cards: Record<number, { data: FormulaData; wired: RawInputs } | undefined>
	/** Values wired into the graph, keyed by handle id. */
	incoming: Map<string, unknown>
}

const MOTION_Y: Record<MotionQty, { label: string; unit: string }> = {
	x: { label: 'Position', unit: 'm' },
	v: { label: 'Velocity', unit: 'm/s' },
	a: { label: 'Acceleration', unit: 'm/s^2' },
}

/**
 * One formula input swept over the shared range. The card's values are resolved once, the formula
 * is compiled once, and each sample is then a single evaluation of plain numbers in SI.
 */
function formulaSeries(s: SeriesSetting, i: number, inputs: GraphInputs) {
	const base: SeriesView = {
		name: `Formula ${i + 1}`,
		color: s.color,
		visible: s.visible,
		sweep: '',
		xs: [],
		ys: [],
		skipped: 0,
		options: [],
	}
	const empty = { xTitle: '', yTitle: '', xSI: '', ySI: '' }
	const fail = (error: string) => ({ view: { ...base, error }, ...empty })

	const card = inputs.cards[i]
	if (!card) return fail(`Connect a formula to Formula ${i + 1}`)
	const f = findFormula(card.data.formulaId)
	if (!f) return fail('Unknown formula')
	base.name = f.name

	const target = card.data.target
	const options: VarInfo[] = f.vars.filter((v) => v.symbol !== target)
	base.options = options
	if (!target) return fail('Choose "Solve for" on the formula card')

	const sweep = options.find((v) => v.symbol === s.sweep) ?? options[0]
	if (!sweep) return fail('No variable to sweep')
	base.sweep = sweep.symbol
	const yVar = f.vars.find((v) => v.symbol === target)!
	const expr = f.solve[target]
	if (!expr) return fail(`No formula for ${target}`)

	const startRaw = inputs.incoming.get('range:start')
	const endRaw = inputs.incoming.get('range:end')
	const stepsRaw = inputs.incoming.get('range:steps')
	if (startRaw === undefined || endRaw === undefined || stepsRaw === undefined) return fail('Connect start, end and steps')

	const a = inSI(startRaw, sweep.unit)
	const b = inSI(endRaw, sweep.unit)
	if (!Number.isFinite(a) || !Number.isFinite(b)) return fail('Start and end need numbers, e.g. 0 A')
	const n = Number(stepsRaw)
	if (!Number.isFinite(n)) return fail('Steps needs a number')

	// Resolve the card once. The sweep variable gets a placeholder here and a new value per sample.
	const resolved = resolveFormulaValues(card.data, { ...card.wired, [sweep.symbol]: 0 })
	if (!resolved.ok) return fail(resolved.error)
	if (resolved.wired[target] !== undefined) return fail(`${target} is wired, so pick another variable to solve for`)

	const scope: Record<string, unknown> = {}
	for (const v of f.vars) {
		if (v.symbol === target || v.symbol === sweep.symbol) continue
		const text = resolved.values[v.symbol]
		if (text === undefined || text.trim() === '') return fail(`Enter a value for ${v.symbol}.`)
		scope[v.symbol] = siNumber(math.evaluate(text))
	}

	let compiled: { evaluate: (scope: Record<string, unknown>) => unknown }
	try {
		compiled = math.compile(expr)
	} catch (e) {
		return fail((e as Error).message)
	}

	const xSI = siUnitOf(sweep.unit)
	const ySI = siUnitOf(yVar.unit)
	const xs = linspace(a, b, clampSteps(n))
	const ys: (number | null)[] = []
	let skipped = 0
	let firstError = ''

	for (const x of xs) {
		scope[sweep.symbol] = x
		let y = NaN
		try {
			y = siNumber(compiled.evaluate(scope))
		} catch (e) {
			if (!firstError) firstError = (e as Error).message
		}
		if (Number.isFinite(y)) ys.push(y)
		else {
			ys.push(null)
			skipped++
		}
	}

	return {
		view: {
			...base,
			xs,
			ys,
			skipped,
			error: skipped === xs.length && firstError ? firstError : undefined,
		} as SeriesView,
		xTitle: `${sweep.label}${sweep.unit ? ` (${xSI || sweep.unit})` : ''}`,
		yTitle: `${yVar.label}${yVar.unit ? ` (${ySI || yVar.unit})` : ''}`,
		xSI,
		ySI,
	}
}

function motionView(qty: MotionQty, inputs: GraphInputs): { view: SeriesView; xTitle: string; yTitle: string } {
	const get = (key: string) => siNumber(inputs.incoming.get(`m:${key}`))
	const x0 = get('x0')
	const v0 = get('v0')
	const acc = get('a')
	const start = get('start')
	const end = get('end')
	const n = Number(inputs.incoming.get('m:steps'))
	const y = MOTION_Y[qty]
	const base: SeriesView = {
		name: `${y.label} against time`,
		color: COLORS[0],
		visible: true,
		sweep: 't',
		xs: [],
		ys: [],
		skipped: 0,
		options: [],
	}
	const xTitle = 'Time (s)'
	const yTitle = `${y.label} (${y.unit})`
	if (![x0, v0, acc, start, end].every(Number.isFinite) || !Number.isFinite(n)) {
		return { view: { ...base, error: 'Connect x₀, v₀, a, start, end and steps' }, xTitle, yTitle }
	}
	const xs = linspace(start, end, clampSteps(n))
	const ys = xs.map((t) => {
		if (qty === 'x') return x0 + v0 * t + 0.5 * acc * t * t
		if (qty === 'v') return v0 + acc * t
		return acc
	})
	return { view: { ...base, xs, ys }, xTitle, yTitle }
}

/** Computes every series and the axes for one graph node. */
export function computeGraphView(kind: GraphKind, data: GraphData, inputs: GraphInputs): GraphView {
	const rows = inputRows(kind, data)
	const isMotion = kind === 'motion'
	let series: SeriesView[]
	let xTitle = 'x'
	let yTitle = 'y'
	let xSI = ''
	let ySI = ''

	if (isMotion) {
		const m = motionView(data.qty, inputs)
		series = [m.view]
		xTitle = m.xTitle
		yTitle = m.yTitle
	} else {
		series = []
		let titled = false
		data.series.forEach((s, i) => {
			const r = formulaSeries(s, i, inputs)
			series.push(r.view)
			if (!titled && r.xTitle) {
				titled = true
				xTitle = r.xTitle
				yTitle = r.yTitle
				xSI = r.xSI
				ySI = r.ySI
			}
		})
	}

	const xFactor = isMotion ? 1 : displayFactor(xSI, data.xUnit)
	const yFactor = isMotion ? 1 : displayFactor(ySI, data.yUnit)
	if (xFactor === null || yFactor === null) {
		return { kind, inputs: rows, xLabel: xTitle, yLabel: yTitle, xFactor: 1, yFactor: 1, series, skipped: 0, error: 'Those units do not match the axis' }
	}

	const scaled = series.map((s) => ({
		...s,
		xs: s.xs.map((x) => x * xFactor),
		ys: s.ys.map((y) => (y === null ? null : y * yFactor)),
	}))
	const xLabel = !isMotion && data.xUnit.trim() ? replaceUnit(xTitle, data.xUnit.trim()) : xTitle
	const yLabel = !isMotion && data.yUnit.trim() ? replaceUnit(yTitle, data.yUnit.trim()) : yTitle
	return {
		kind,
		inputs: rows,
		xLabel,
		yLabel,
		xFactor,
		yFactor,
		series: scaled,
		skipped: scaled.reduce((n, s) => n + s.skipped, 0),
	}
}

/** Swaps the unit shown in a title such as "Velocity (m / s)" for the chosen display unit. */
function replaceUnit(title: string, unit: string): string {
	const i = title.lastIndexOf(' (')
	const label = i >= 0 ? title.slice(0, i) : title
	return `${label} (${unit})`
}

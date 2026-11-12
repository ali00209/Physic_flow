import {
	addEdge,
	Background,
	Controls,
	ReactFlow,
	ReactFlowProvider,
	useEdgesState,
	useNodesState,
	useReactFlow,
	type Connection,
	type Edge,
	type OnConnectEnd,
} from '@xyflow/react'
import { useCallback, useMemo, useState } from 'react'
import { CalcNode, newId, type CalcFlowNode } from './nodes/CalcNode'
import { FormulaNode, type FormulaFlowNode } from './nodes/FormulaNode'
import { GraphCard, type GraphFlowNode } from './nodes/GraphNode'
import { ResultContext } from './ResultContext'
import { Toolbar, defaults, type NewNode } from './Toolbar'
import { DRAG_TYPE, Sidebar, type DragPayload } from './Sidebar'
import './sidebar.css'
import { NodePicker, type PickChoice, type PickerAt } from './NodePicker'
import { ConstantNode, type ConstantFlowNode } from './nodes/ConstantNode'
import { findFormula, useFormulas } from './lib/registry'
import { findConstant, useConstants } from './lib/constants'
import { defaultGraph, isGraphKind, type GraphData } from './lib/graphNode'
import {
	checkConnection,
	computeGraph,
	type CalcData,
	type ConstantData,
	type FormulaData,
	type GraphEdge,
	type GraphNode,
	type NodeKind,
	type SheetRowDef,
} from './lib/graph'

type FlowNode = CalcFlowNode | FormulaFlowNode | ConstantFlowNode | GraphFlowNode

// Defined outside the component so the object identity is stable.
const nodeTypes = { calc: CalcNode, formula: FormulaNode, const: ConstantNode, line: GraphCard, scatter: GraphCard, motion: GraphCard }

export default function App() {
	// React Flow hooks such as useReactFlow need the provider above them.
	return (
		<ReactFlowProvider>
			<Canvas />
		</ReactFlowProvider>
	)
}

function withRow(d: CalcData, row: SheetRowDef): CalcData {
	return { ...d, rows: [...d.rows, row] }
}

type Feeds = { nodes: FlowNode[]; edges: Edge[] }

/**
 * A formula whose variable takes its default from a constant gets a constant node for it, wired into
 * that input. Inputs listed in `skip` (for example the one a dropped wire feeds) are left alone.
 */
function constantFeeds(formulaId: string, formulaNodeId: string, at: { x: number; y: number }, skip: string[] = []): Feeds {
	const feeds: Feeds = { nodes: [], edges: [] }
	const f = findFormula(formulaId)
	if (!f) return feeds
	let row = 0
	for (const v of f.vars) {
		if (!v.constantId || !findConstant(v.constantId) || skip.includes(`in:${v.symbol}`)) continue
		const cid = newId()
		feeds.nodes.push({
			id: cid,
			type: 'const',
			position: { x: at.x - 360, y: at.y + row * 140 },
			data: { constId: v.constantId },
		} as FlowNode)
		feeds.edges.push({ id: `wire-${cid}`, source: cid, sourceHandle: 'out', target: formulaNodeId, targetHandle: `in:${v.symbol}` })
		row++
	}
	return feeds
}

function Canvas() {
	const rf = useReactFlow()
	const [nodes, setNodes, onNodesChange] = useNodesState<FlowNode>([])
	const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([])
	const [notice, setNotice] = useState('')
	const [picker, setPicker] = useState<PickerAt | null>(null)

	// Only what changes a result counts here. Moving a node, selecting it or resizing a graph does not,
	// so dragging stays smooth while the graph is recalculated only when a value or a wire changes.
	const graphSig = useMemo(
		() =>
			JSON.stringify([
				nodes.map((n) => {
					if (!isGraphKind(n.type ?? '')) return [n.id, n.type, n.data]
					const { width: _width, height: _height, ...rest } = n.data as Record<string, unknown>
					return [n.id, n.type, rest]
				}),
				edges.map((e) => [e.id, e.source, e.sourceHandle, e.target, e.targetHandle]),
			]),
		[nodes, edges]
		)

	const graphNodes: GraphNode[] = useMemo(
		() =>
			nodes.map((n) => ({
				id: n.id,
				kind: n.type as NodeKind,
				data: n.data as CalcData | FormulaData | ConstantData | GraphData,
			})),
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[graphSig]
	)
	const graphEdges: GraphEdge[] = useMemo(
		() =>
			edges.map((e) => ({
				id: e.id,
				source: e.source,
				sourceHandle: e.sourceHandle ?? null,
				target: e.target,
				targetHandle: e.targetHandle ?? null,
			})),
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[graphSig]
	)

	// Every change to a node or a wire recomputes the whole graph, so results are always live.
	const formulas = useFormulas()
	const constants = useConstants()
	const result = useMemo(
		() => computeGraph(graphNodes, graphEdges),
		[graphNodes, graphEdges, formulas, constants]
	)

	const onConnect = useCallback(
		(c: Connection) => {
			const why = checkConnection(graphNodes, graphEdges, c)
			if (why) {
				setNotice(why)
				return
			}
			setNotice('')
			// One wire per input: the new wire replaces any wire already on that input.
			setEdges((eds) =>
				addEdge(c, eds.filter((e) => !(e.target === c.target && e.targetHandle === c.targetHandle)))
			)
		},
		[graphNodes, graphEdges, setEdges]
	)

	/** Adds one or more nodes and a wire together, but only if the wire is allowed on the graph after the change. */
	const addWire = (conn: Connection, nextGraph: GraphNode[], patch: (ns: FlowNode[]) => FlowNode[], extraEdges: Edge[] = []) => {
		const why = checkConnection(nextGraph, graphEdges, conn)
		if (why) {
			setNotice(why)
			return false
		}
		setNotice('')
		setNodes(patch)
		setEdges((eds) => [
			...addEdge(conn, eds.filter((e) => !(e.target === conn.target && e.targetHandle === conn.targetHandle))),
			...extraEdges,
		])
		return true
	}

	/** Name and unit a wire carries from one handle. Used to label new rows and to recommend nodes. */
	const describeHandle = (nodeId: string, handleId: string) => {
		const node = nodes.find((n) => n.id === nodeId)
		const view = result.views[nodeId]
		const unit = (view?.handleText[handleId] ?? '').replace(/^[-+\d.eE]+\s*/, '')
		let name = 'value'
		if (node?.type === 'const') {
			name = findConstant((node.data as ConstantData).constId)?.symbol ?? name
		} else if (node?.type === 'calc') {
			name = (node.data as CalcData).rows.find((r) => r.id === handleId)?.name || name
		} else if (node?.type === 'formula') {
			const solved = view?.formula
			if (handleId === 'out') {
				const f = findFormula((node.data as FormulaData).formulaId)
				name = solved && solved.result.ok ? solved.result.symbol : f?.name ?? name
			} else {
				name = handleId.replace(/^in:/, '')
			}
		}
		return { name, unit }
	}

	// Dropping a wire on the body of a calculation sheet adds a row for it and connects the wire to that row.
	const attachToSheet = (sheetId: string, from: string, fromHandle: string, fromType: 'source' | 'target', name: string) => {
		const row: SheetRowDef = { id: newId(), dir: fromType === 'source' ? 'in' : 'out', name }
		const conn: Connection =
			fromType === 'source'
				? { source: from, sourceHandle: fromHandle, target: sheetId, targetHandle: row.id }
				: { source: sheetId, sourceHandle: row.id, target: from, targetHandle: fromHandle }
		addWire(
			conn,
			graphNodes.map((g) => (g.id === sheetId ? { ...g, data: withRow(g.data as CalcData, row) } : g)),
			(ns) =>
				ns.map((n) => (n.id === sheetId ? ({ ...n, data: withRow(n.data as CalcData, row) } as FlowNode) : n))
		)
	}

	const onConnectEnd: OnConnectEnd = (event, state) => {
		if (state.isValid) return
		const from = state.fromNode?.id
		const fromHandle = state.fromHandle
		if (!from || !fromHandle) return

		const p = 'changedTouches' in event ? event.changedTouches[0] : event
		const under = document.elementFromPoint(p.clientX, p.clientY) as HTMLElement | null
		// A drop on a handle is judged by onConnect, so nothing more to do here.
		if (under?.closest('.react-flow__handle')) return

		const handleId = fromHandle.id ?? ''
		const fromType = fromHandle.type
		const { name, unit } = describeHandle(from, handleId)

		const nodeEl = under?.closest('.react-flow__node') as HTMLElement | null | undefined
		if (nodeEl) {
			const targetId = nodeEl.dataset.id
			const target = nodes.find((n) => n.id === targetId)
			if (targetId && targetId !== from && target?.type === 'calc') {
				attachToSheet(targetId, from, handleId, fromType, name)
			}
			return
		}

		// Dropped on empty canvas: offer nodes to spawn on the wire.
		setPicker({
			x: p.clientX,
			y: p.clientY,
			flow: rf.screenToFlowPosition({ x: p.clientX, y: p.clientY }),
			fromNodeId: from,
			fromHandleId: handleId,
			fromType,
			sourceName: name,
			unit,
		})
	}

	const spawn = (choice: PickChoice) => {
		if (!picker) return
		const p = picker
		const id = newId()
		const fromIsSource = p.fromType === 'source'
		let node: FlowNode
		let conn: Connection
		let feeds: Feeds = { nodes: [], edges: [] }

		if (choice.kind === 'calc') {
			const row: SheetRowDef = { id: newId(), dir: fromIsSource ? 'in' : 'out', name: p.sourceName }
			node = { id, type: 'calc', position: p.flow, data: { lines: '', rows: [row] } as CalcData } as FlowNode
			conn = fromIsSource
				? { source: p.fromNodeId, sourceHandle: p.fromHandleId, target: id, targetHandle: row.id }
				: { source: id, sourceHandle: row.id, target: p.fromNodeId, targetHandle: p.fromHandleId }
		} else {
			const f = findFormula(choice.formulaId)
			if (!f) return
			const data: FormulaData = { formulaId: f.id, values: JSON.stringify(defaults(f)), target: '' }
			node = { id, type: 'formula', position: p.flow, data } as FlowNode
			if (fromIsSource) {
				// Connect to the first input whose unit matches the wire, or else the first input.
				const match = f.vars.find((v) => v.unit !== undefined && p.unit !== '' && v.unit.replace(/\s+/g, '') === p.unit.replace(/\s+/g, '')) ?? f.vars[0]
				conn = { source: p.fromNodeId, sourceHandle: p.fromHandleId, target: id, targetHandle: `in:${match.symbol}` }
			} else {
				conn = { source: id, sourceHandle: 'out', target: p.fromNodeId, targetHandle: p.fromHandleId }
			}
			// The input the dropped wire feeds keeps that wire; the other constant defaults still apply.
			feeds = constantFeeds(f.id, id, p.flow, fromIsSource && conn.targetHandle ? [conn.targetHandle] : [])
		}

		const nextGraph: GraphNode[] = [
			...graphNodes,
			{ id, kind: node.type as 'calc' | 'formula', data: node.data as CalcData | FormulaData },
			...feeds.nodes.map((n) => ({ id: n.id, kind: 'const' as const, data: n.data as ConstantData })),
		]
		addWire(conn, nextGraph, (ns) => [...ns, node, ...feeds.nodes], feeds.edges)
		setPicker(null)
	}

	/** Puts a new node at a position; a formula also gets its constant defaults wired in. */
	const placeNode = (n: NewNode, position: { x: number; y: number }) => {
		const id = newId()
		const node = { id, type: n.kind, position, data: n.data } as FlowNode
		const feeds: Feeds = n.kind === 'formula' ? constantFeeds(n.data.formulaId, id, position) : { nodes: [], edges: [] }
		setNodes((ns) => [...ns, node, ...feeds.nodes])
		if (feeds.edges.length) setEdges((eds) => [...eds, ...feeds.edges])
	}

	// New nodes from the toolbar take the next free slot in a grid, so they never sit on top of each other.
	const addNode = (n: NewNode, base: { x: number; y: number }) => {
		const slot = nodes.length
		placeNode(n, { x: base.x + (slot % 3) * 340, y: base.y + Math.floor(slot / 3) * 460 })
	}

	// A sidebar item dropped on the canvas becomes a node where it was dropped.
	const onDrop = (e: React.DragEvent) => {
		const raw = e.dataTransfer.getData(DRAG_TYPE)
		if (!raw) return
		e.preventDefault()
		const payload = JSON.parse(raw) as DragPayload
		const at = rf.screenToFlowPosition({ x: e.clientX, y: e.clientY })
		if (payload.kind === 'calc') placeNode({ kind: 'calc', data: { lines: '', rows: [] } }, at)
		else if (payload.kind === 'const') placeNode({ kind: 'const', data: payload.data }, at)
		else if (payload.kind === 'graph') placeNode({ kind: payload.mode, data: defaultGraph(payload.mode) }, at)
		else {
			const f = findFormula(payload.formulaId)
			if (f) placeNode({ kind: 'formula', data: { formulaId: f.id, values: JSON.stringify(defaults(f)), target: '' } }, at)
		}
	}

	return (
		<ResultContext.Provider value={result}>
			<div className="app-shell">
				<Sidebar />
				<div className="canvas-wrap">
					<ReactFlow
						nodes={nodes}
						edges={edges}
						onNodesChange={onNodesChange}
						onEdgesChange={onEdgesChange}
						onConnect={onConnect}
						onConnectEnd={onConnectEnd}
						onDragOver={(e) => {
							if (e.dataTransfer.types.includes(DRAG_TYPE)) {
								e.preventDefault()
								e.dataTransfer.dropEffect = 'move'
							}
						}}
						onDrop={onDrop}
						nodeTypes={nodeTypes}
						fitView={false}
						defaultEdgeOptions={{ style: { strokeWidth: 2 } }}
					>
						<Background />
						<Controls />
						<Toolbar onAdd={addNode} notice={notice} />
					</ReactFlow>
				</div>
			</div>
			{picker && <NodePicker at={picker} onPick={spawn} onClose={() => setPicker(null)} />}
		</ResultContext.Provider>
	)
}

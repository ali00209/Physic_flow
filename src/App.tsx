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
import { ResultContext } from './ResultContext'
import { Toolbar, defaults, type NewNode } from './Toolbar'
import { NodePicker, type PickChoice, type PickerAt } from './NodePicker'
import { ConstantNode, type ConstantFlowNode } from './nodes/ConstantNode'
import { findFormula, useFormulas } from './lib/registry'
import { findConstant, useConstants } from './lib/constants'
import {
	checkConnection,
	computeGraph,
	type CalcData,
	type ConstantData,
	type FormulaData,
	type GraphEdge,
	type GraphNode,
	type SheetRowDef,
} from './lib/graph'

type FlowNode = CalcFlowNode | FormulaFlowNode | ConstantFlowNode

// Defined outside the component so the object identity is stable.
const nodeTypes = { calc: CalcNode, formula: FormulaNode, const: ConstantNode }

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

function Canvas() {
	const rf = useReactFlow()
	const [nodes, setNodes, onNodesChange] = useNodesState<FlowNode>([])
	const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([])
	const [notice, setNotice] = useState('')
	const [picker, setPicker] = useState<PickerAt | null>(null)

	const graphNodes: GraphNode[] = useMemo(
		() =>
				nodes.map((n) => ({
					id: n.id,
					kind: n.type as 'calc' | 'formula' | 'const',
					data: n.data as CalcData | FormulaData | ConstantData,
				})),
		[nodes]
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
		[edges]
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
	const addWire = (conn: Connection, nextGraph: GraphNode[], patch: (ns: FlowNode[]) => FlowNode[]) => {
		const why = checkConnection(nextGraph, graphEdges, conn)
		if (why) {
			setNotice(why)
			return false
		}
		setNotice('')
		setNodes(patch)
		setEdges((eds) =>
			addEdge(conn, eds.filter((e) => !(e.target === conn.target && e.targetHandle === conn.targetHandle)))
		)
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
		}

		const nextGraph: GraphNode[] = [
			...graphNodes,
			{ id, kind: node.type as 'calc' | 'formula', data: node.data as CalcData | FormulaData },
		]
		addWire(conn, nextGraph, (ns) => [...ns, node])
		setPicker(null)
	}

	// New nodes take the next free slot in a grid, so they never sit on top of each other.
	const addNode = (n: NewNode, base: { x: number; y: number }) => {
		const slot = nodes.length
		const position = { x: base.x + (slot % 3) * 340, y: base.y + Math.floor(slot / 3) * 460 }
		const node = { id: newId(), type: n.kind, position, data: n.data } as FlowNode
		setNodes((ns) => [...ns, node])
	}

	return (
		<ResultContext.Provider value={result}>
			<ReactFlow
				nodes={nodes}
				edges={edges}
				onNodesChange={onNodesChange}
				onEdgesChange={onEdgesChange}
				onConnect={onConnect}
				onConnectEnd={onConnectEnd}
				nodeTypes={nodeTypes}
				fitView={false}
				defaultEdgeOptions={{ style: { strokeWidth: 2 } }}
			>
				<Background />
				<Controls />
				<Toolbar onAdd={addNode} notice={notice} />
			</ReactFlow>
			{picker && <NodePicker at={picker} onPick={spawn} onClose={() => setPicker(null)} />}
		</ResultContext.Provider>
	)
}

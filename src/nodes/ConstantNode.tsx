import { Handle, Position, useReactFlow, type Node, type NodeProps } from '@xyflow/react'
import { useContext } from 'react'
import { findConstant, useConstants } from '../lib/constants'
import { ResultContext } from '../ResultContext'
import type { ConstantData } from '../lib/graph'
import { NODE_WIDTH, ROW_H, HEADER_H } from './layout'

export type ConstantFlowNode = Node<ConstantData, 'const'>

/** A physical constant. Its value leaves through the output, so it can feed a formula or a sheet input. */
export function ConstantNode({ id, data }: NodeProps<ConstantFlowNode>) {
	const rf = useReactFlow()
	const all = useConstants()
	const view = useContext(ResultContext).views[id]
	const c = findConstant(data.constId)
	if (!c) return <div className="card error">Unknown constant</div>

	return (
		<div className="card" style={{ width: NODE_WIDTH, height: HEADER_H + 2 * ROW_H }}>
			<div className="card-header">
				<span>{c.symbol}</span>
				<code>{c.name}</code>
			</div>
			<div className="row" style={{ height: ROW_H }}>
				<select
					className="nodrag"
					value={c.id}
					onChange={(e) => rf.updateNodeData(id, { constId: e.target.value })}
					style={{ flex: 1, minWidth: 0 }}
				>
					{all.map((x) => (
						<option key={x.id} value={x.id}>
							{x.symbol} · {x.name}
						</option>
					))}
				</select>
			</div>
			<div className="row" style={{ height: ROW_H, fontWeight: 600 }}>
				<span>{view?.handleText.out ?? c.value}</span>
				<Handle type="source" position={Position.Right} id="out" />
			</div>
		</div>
	)
}

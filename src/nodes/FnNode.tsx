import { Handle, Position, useReactFlow, type Node, type NodeProps } from '@xyflow/react'
import { functionById } from '../lib/functions'
import type { FnData } from '../lib/graph'
import { useNodeView } from '../ResultStore'
import { DraftInput } from '../Draft'
import './fn-node.css'

export type FnFlowNode = Node<FnData, 'fn'>

/** A maths function node: one input per argument, typed or wired, and the result on the output. */
export function FnNode({ id, data }: NodeProps<FnFlowNode>) {
	const rf = useReactFlow()
	const view = useNodeView(id)
	const def = functionById(data.fnId)
	if (!def) return <div className="card error">Unknown function</div>

	return (
		<div className="card fn">
			<div className="card-header">
				<span>{def.name}</span>
				<code>{def.expr}</code>
			</div>

			{def.args.map((a) => {
				const wired = view?.handleText[`in:${a}`]
				return (
					<div key={a} className="row fn-row">
						<Handle type="target" position={Position.Left} id={`in:${a}`} />
						<span className="fn-sym">{a}</span>
						{wired !== undefined ? (
							<span className="muted fn-state">{wired}</span>
						) : (
							<DraftInput
								className="nodrag fn-input"
								value={data.values[a] ?? ''}
								placeholder="type a value"
								onCommit={(v) => rf.updateNodeData(id, { values: { ...data.values, [a]: v } })}
							/>
						)}
					</div>
				)
			})}

			<div className="row fn-row fn-out">
				<span className="muted">result</span>
				<strong className="fn-state">{view?.handleText.out ?? '—'}</strong>
				<Handle type="source" position={Position.Right} id="out" />
			</div>
			{view?.error && <div className="fn-error">{view.error}</div>}
		</div>
	)
}

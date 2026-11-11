import { Handle, Position, useReactFlow, type Node, type NodeProps } from '@xyflow/react'
import { useContext } from 'react'
import { ResultContext } from '../ResultContext'
import { DraftInput, DraftTextArea } from '../Draft'
import type { CalcData, SheetRowDef } from '../lib/graph'
import { NODE_WIDTH, ROW_H, HEADER_H } from './layout'

export type CalcFlowNode = Node<CalcData, 'calc'>

const LINE_H = 20
const textHeight = (lines: string) => Math.max(3, lines.split('\n').length + 1) * LINE_H + 12
const RESULT_H = 20

/**
 * A calculation sheet. Everything sits in normal document flow: each row is a fixed-height block,
 * and each handle is centred inside its row, so a wire always lands on its row.
 */
export function CalcNode({ id, data }: NodeProps<CalcFlowNode>) {
	const rf = useReactFlow()
	const view = useContext(ResultContext).views[id]
	const set = (patch: Partial<CalcData>) => rf.updateNodeData(id, patch)
	const setRow = (rowId: string, patch: Partial<SheetRowDef>) =>
		set({ rows: data.rows.map((r) => (r.id === rowId ? { ...r, ...patch } : r)) })
	const addRow = (dir: 'in' | 'out') => set({ rows: [...data.rows, { id: newId(), dir, name: '' }] })
	const removeRow = (rowId: string) => set({ rows: data.rows.filter((r) => r.id !== rowId) })

	const taH = textHeight(data.lines)
	const results = view?.sheetRows ?? []
	const resultsH = results.length ? results.length * RESULT_H + 8 : 0
	const height = HEADER_H + data.rows.length * ROW_H + (taH + 8) + ROW_H + resultsH

	return (
		<div className="card" style={{ width: NODE_WIDTH, height }}>
			<div className="card-header">Calculation sheet</div>

			{data.rows.map((row) => {
				const text = view?.handleText[row.id]
				return (
					<div key={row.id} className="row" style={{ height: ROW_H }}>
						{row.dir === 'in' && (
							<Handle type="target" position={Position.Left} id={row.id} />
						)}
						{row.dir === 'out' && <span className="muted" style={{ flex: '1 1 auto' }}>{text ?? ''}</span>}
						<DraftInput
							className="nodrag"
							value={row.name}
							placeholder="name"
							onCommit={(v) => setRow(row.id, { name: v })}
							style={{ width: 96, flex: '0 0 auto' }}
						/>
						{row.dir === 'in' && <span className="muted" style={{ flex: '1 1 auto' }}>{text ?? 'not connected'}</span>}
						<button className="nodrag" onClick={() => removeRow(row.id)} title="Remove row">
							×
						</button>
						{row.dir === 'out' && <Handle type="source" position={Position.Right} id={row.id} />}
					</div>
				)
			})}

			<div style={{ padding: '4px 16px', height: taH + 8, boxSizing: 'border-box' }}>
				<DraftTextArea
					className="nodrag nowheel"
					value={data.lines}
					spellCheck={false}
					placeholder={'distance = (8 + 6 + 3) m;\nspeed = distance / (10 s)'}
					onCommit={(v) => set({ lines: v })}
					style={{ display: 'block', width: '100%', height: taH, boxSizing: 'border-box' }}
				/>
			</div>

			<div className="row" style={{ height: ROW_H }}>
				<button className="nodrag" onClick={() => addRow('in')}>+ input</button>
				<button className="nodrag" onClick={() => addRow('out')}>+ output</button>
			</div>

			{results.length > 0 && (
				<div className="results" style={{ height: resultsH }}>
					{results.map((r, i) => (
						<div key={i} className="result-line" style={{ height: RESULT_H }}>
							<span className="muted">{r.source}</span>
							<strong>{r.result.kind === 'ok' ? r.result.text : r.result.error}</strong>
						</div>
					))}
				</div>
			)}
		</div>
	)
}

export const newId = () => `r${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`

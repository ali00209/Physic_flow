import { Handle, Position, useReactFlow, type Node, type NodeProps } from '@xyflow/react'
import { useContext } from 'react'
import { findFormula, useFormulas } from '../lib/registry'
import { parseFormulaValues } from '../lib/evaluate'
import { findConstant } from '../lib/constants'
import { ResultContext } from '../ResultContext'
import { DraftInput } from '../Draft'
import type { FormulaData } from '../lib/graph'
import { asciiUnit } from '../lib/sheet'
import { NODE_WIDTH, ROW_H, HEADER_H } from './layout'

export type FormulaFlowNode = Node<FormulaData, 'formula'>

/** A physics formula card: one input per variable, and the solved value on the output. */
export function FormulaNode({ id, data }: NodeProps<FormulaFlowNode>) {
	const rf = useReactFlow()
	useFormulas()
	const view = useContext(ResultContext).views[id]
	const f = findFormula(data.formulaId)
	if (!f) return <div className="card error">Unknown formula</div>

	const typed = parseFormulaValues(data.values)
	const set = (patch: Partial<FormulaData>) => rf.updateNodeData(id, patch)
	const setValue = (symbol: string, value: string) =>
		set({ values: JSON.stringify({ ...parseFormulaValues(data.values), [symbol]: value }) })

	const solved = view?.formula
	const height = HEADER_H + (f.vars.length + 3) * ROW_H

	return (
		<div className="card" style={{ width: NODE_WIDTH, height }}>
			<div className="card-header">
				<span>{f.name}</span>
				<code>{f.equation}</code>
				<Handle type="source" position={Position.Right} id="out" />
			</div>

			{f.vars.map((v) => {
				const wired = solved?.wired[v.symbol]
				const isTarget = data.target === v.symbol
				const shown = isTarget ? '' : wired ?? typed[v.symbol] ?? ''
				return (
					<div key={v.symbol} className="row" style={{ height: ROW_H }}>
						<Handle type="target" position={Position.Left} id={`in:${v.symbol}`} />
						<span title={v.label} style={{ width: 24, flex: '0 0 auto' }}>{v.symbol}</span>
						<DraftInput
							className="nodrag"
							disabled={isTarget || wired !== undefined}
							value={shown}
							placeholder={isTarget ? 'solved' : v.constantId ? findConstant(v.constantId)?.value ?? v.label : v.label}
							onCommit={(s) => setValue(v.symbol, s)}
							style={{ minWidth: 0, flex: 1 }}
						/>
						<span className="muted" style={{ flex: '0 0 auto' }}>{v.unit && asciiUnit(v.unit)}</span>
					</div>
				)
			})}

			<div className="row" style={{ height: ROW_H }}>
				<span className="muted">Solve for</span>
				<select className="nodrag" value={data.target} onChange={(e) => set({ target: e.target.value })}>
					<option value="">auto</option>
					{f.vars.map((v) => (
						<option key={v.symbol} value={v.symbol} disabled={solved?.wired[v.symbol] !== undefined}>
							{v.symbol}
							{solved?.wired[v.symbol] !== undefined ? ' (wired)' : ''}
						</option>
					))}
				</select>
			</div>

			<div className="row" style={{ height: ROW_H }}>
				<span className="muted">formula → graph</span>
				<Handle type="source" position={Position.Right} id="def" />
			</div>

			<div className="row" style={{ height: ROW_H, fontWeight: 600 }}>
				{solved?.result.ok ? (
					<span>{solved.result.symbol} = {view?.handleText.out}</span>
				) : (
					<span className="muted" style={{ fontWeight: 400 }}>{solved && !solved.result.ok ? solved.result.error : ''}</span>
				)}
			</div>
		</div>
	)
}

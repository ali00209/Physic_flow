import { useState } from 'react'
import { isCustomConstant, useConstants } from './lib/constants'
import { useFormulas, isCustom } from './lib/registry'
import type { Formula } from './lib/formulas'
import type { ConstantData } from './lib/graph'
import './sidebar.css'

/** What a dragged sidebar item carries. The canvas reads it on drop. */
export const DRAG_TYPE = 'application/x-math-node'
export type DragPayload = { kind: 'calc' } | { kind: 'const'; data: ConstantData } | { kind: 'formula'; formulaId: string }

const FORMULA_SECTIONS = [
	'Mechanics',
	'Fluids & thermal',
	'Atomic & nuclear',
	'Electricity & magnetism',
	'Waves & optics',
	'Geometry',
	'Your formulas',
	'Other',
]

function Item({ payload, title, sub }: { payload: DragPayload; title: string; sub: string }) {
	return (
		<div
			className="sb-item"
			draggable
			title="Drag onto the canvas"
			onDragStart={(e) => {
				e.dataTransfer.setData(DRAG_TYPE, JSON.stringify(payload))
				e.dataTransfer.effectAllowed = 'move'
			}}
		>
			<strong>{title}</strong>
			<span className="muted">{sub}</span>
		</div>
	)
}

/** The node library: search, then accordion sections. Drag any item onto the canvas. */
export function Sidebar() {
	const [query, setQuery] = useState('')
	const formulas = useFormulas()
	const constants = useConstants()
	const q = query.trim().toLowerCase()
	const searching = q !== ''

	const matches = (...parts: string[]) => !searching || parts.join(' ').toLowerCase().includes(q)

	const builtinConstants = constants.filter((c) => !isCustomConstant(c.id) && matches(c.name, c.symbol, c.value))
	const customConstants = constants.filter((c) => isCustomConstant(c.id) && matches(c.name, c.symbol, c.value))

	const sectionOf = (f: Formula) => (isCustom(f.id) ? 'Your formulas' : f.section ?? 'Other')
	const formulaGroups = FORMULA_SECTIONS.map((section) => ({
		section,
		items: formulas.filter(
			(f) =>
				sectionOf(f) === section &&
				matches(f.name, f.equation, ...f.vars.map((v) => `${v.symbol} ${v.label}`))
		),
	})).filter((g) => g.items.length > 0)

	const showCalc = matches('calculation sheet', 'calc')
	const total = (showCalc ? 1 : 0) + builtinConstants.length + customConstants.length + formulaGroups.reduce((n, g) => n + g.items.length, 0)

	return (
		<aside className="sidebar">
			<div className="sb-head">
				<strong>Nodes</strong>
				<input
					placeholder="Search nodes…"
					value={query}
					onChange={(e) => setQuery(e.target.value)}
				/>
				{searching && <span className="muted sb-count">{total} found</span>}
			</div>

			<details open={searching || undefined} className="sb-section">
				<summary>Calculation</summary>
				{showCalc && (
					<div className="sb-body">
						<Item payload={{ kind: 'calc' }} title="Calculation sheet" sub="Plain calculations with units" />
					</div>
				)}
				{!showCalc && <div className="muted sb-empty">No match</div>}
			</details>

			<details open={searching || undefined} className="sb-section">
				<summary>Constants ({builtinConstants.length + customConstants.length})</summary>
				<div className="sb-body">
					{builtinConstants.length > 0 && <div className="sb-title">Popular</div>}
					{builtinConstants.map((c) => (
						<Item key={c.id} payload={{ kind: 'const', data: { constId: c.id } }} title={`${c.symbol} · ${c.name}`} sub={c.value} />
					))}
					{customConstants.length > 0 && <div className="sb-title">Your constants</div>}
					{customConstants.map((c) => (
						<Item key={c.id} payload={{ kind: 'const', data: { constId: c.id } }} title={`${c.symbol} · ${c.name}`} sub={c.value} />
					))}
					{builtinConstants.length + customConstants.length === 0 && <div className="muted sb-empty">No match</div>}
				</div>
			</details>

			<details open={searching || undefined} className="sb-section">
				<summary>Physics formulas ({formulaGroups.reduce((n, g) => n + g.items.length, 0)})</summary>
				{formulaGroups.map((g) => (
					<details key={g.section} open={searching || undefined} className="sb-sub">
						<summary>
							{g.section} <span className="muted">({g.items.length})</span>
						</summary>
						<div className="sb-body">
							{g.items.map((f) => (
								<Item
									key={f.id}
									payload={{ kind: 'formula', formulaId: f.id }}
									title={f.name}
									sub={f.equation}
								/>
							))}
						</div>
					</details>
				))}
				{formulaGroups.length === 0 && <div className="muted sb-empty">No match</div>}
			</details>
		</aside>
	)
}

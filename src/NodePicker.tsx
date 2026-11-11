import { useState } from 'react'
import { useFormulas } from './lib/registry'
import { asciiUnit } from './lib/sheet'
import './picker.css'

/** Where a wire was dropped on empty canvas, and what it carries. */
export type PickerAt = {
	x: number
	y: number
	flow: { x: number; y: number }
	fromNodeId: string
	fromHandleId: string
	fromType: 'source' | 'target'
	sourceName: string
	unit: string
}

export type PickChoice = { kind: 'calc' } | { kind: 'formula'; formulaId: string }

type Item = { key: string; label: string; sub: string; choice: PickChoice; recommended: boolean; text: string }

const squash = (s: string) => s.replace(/\s+/g, '')

/** Lists the nodes that can be spawned on a dropped wire. Formulas whose units match the wire come first. */
export function NodePicker({
	at,
	onPick,
	onClose,
}: {
	at: PickerAt
	onPick: (c: PickChoice) => void
	onClose: () => void
}) {
	const [query, setQuery] = useState('')
	const formulas = useFormulas()

	const items: Item[] = [
		{
			key: 'calc',
			label: 'Calculation sheet',
			sub: 'Plain calculations with units',
			choice: { kind: 'calc' },
			recommended: true,
			text: 'calculation sheet calc',
		},
		...formulas.map<Item>((f) => ({
			key: f.id,
			label: f.name,
			sub: f.equation,
			choice: { kind: 'formula', formulaId: f.id },
			recommended:
				at.unit !== '' && f.vars.some((v) => v.unit !== undefined && squash(asciiUnit(v.unit)) === squash(at.unit)),
			text: `${f.name} ${f.equation} ${f.vars.map((v) => v.label).join(' ')}`,
		})),
	]

	const q = query.trim().toLowerCase()
	const matching = q ? items.filter((i) => i.text.toLowerCase().includes(q)) : items
	const recommended = matching.filter((i) => i.recommended)
	const others = matching.filter((i) => !i.recommended)
	const ordered = [...recommended, ...others]

	const row = (i: Item) => (
		<button key={i.key} className="picker-item" onClick={() => onPick(i.choice)}>
			<strong>{i.label}</strong>
			<span className="muted">{i.sub}</span>
		</button>
	)

	return (
		<>
			<div className="picker-backdrop" onMouseDown={onClose} />
			<div
				className="picker"
				style={{ left: Math.min(at.x, window.innerWidth - 300), top: Math.min(at.y, window.innerHeight - 320) }}
				onMouseDown={(e) => e.stopPropagation()}
			>
				<input
					autoFocus
					placeholder="Search nodes…"
					value={query}
					onChange={(e) => setQuery(e.target.value)}
					onKeyDown={(e) => {
						if (e.key === 'Escape') onClose()
						if (e.key === 'Enter' && ordered[0]) onPick(ordered[0].choice)
					}}
				/>
				{!q && recommended.length > 0 && <div className="picker-title">Recommended</div>}
				{!q && recommended.map(row)}
				{!q && others.length > 0 && <div className="picker-title">All nodes</div>}
				{(q ? ordered : others).map(row)}
				{ordered.length === 0 && <div className="muted picker-empty">No node matches “{query}”</div>}
			</div>
		</>
	)
}

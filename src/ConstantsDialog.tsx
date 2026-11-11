import { useState } from 'react'
import { createPortal } from 'react-dom'
import {
	BUILTIN_CONSTANTS,
	deleteConstant,
	isCustomConstant,
	saveConstant,
	useConstants,
	validateConstant,
	type Constant,
	type ConstantDraft,
} from './lib/constants'
import './constants-dialog.css'

const EMPTY: ConstantDraft = { name: '', symbol: '', value: '' }

/** A separate panel for physical constants: pick one to put on the canvas, or add your own. */
export function ConstantsDialog({ onAdd, onClose }: { onAdd: (id: string) => void; onClose: () => void }) {
	const all = useConstants()
	const [draft, setDraft] = useState<ConstantDraft>(EMPTY)
	const [editingId, setEditingId] = useState<string | null>(null)
	const [error, setError] = useState('')

	const edit = (c: Constant) => {
		setEditingId(c.id)
		setDraft({ name: c.name, symbol: c.symbol, value: c.value })
		setError('')
	}

	const save = () => {
		const r = validateConstant(draft, editingId ?? undefined)
		if (!r.ok) return setError(r.error)
		saveConstant(r.constant)
		setEditingId(null)
		setDraft(EMPTY)
		setError('')
	}

	const builtin = BUILTIN_CONSTANTS
	const custom = all.filter((c) => isCustomConstant(c.id))

	const row = (c: Constant) => (
		<div key={c.id} className="cd-row">
			<span className="cd-symbol">{c.symbol}</span>
			<span className="cd-name">
				{c.name}
				<span className="muted cd-value">{c.value}</span>
			</span>
			<button onClick={() => onAdd(c.id)} title="Put this constant on the canvas">+ add</button>
			{isCustomConstant(c.id) && (
				<>
					<button title="Edit constant" onClick={() => edit(c)}>✎</button>
					<button
						title="Delete constant"
						onClick={() => {
							if (confirm(`Delete "${c.name}"? Cards using it will show an error.`)) deleteConstant(c.id)
						}}
					>
						×
					</button>
				</>
			)}
		</div>
	)

	return createPortal(
		<div className="cd-backdrop" onMouseDown={onClose}>
			<div className="cd" onMouseDown={(e) => e.stopPropagation()} onKeyDown={(e) => e.key === 'Escape' && onClose()}>
				<div className="cd-head">
					<h3>Constants</h3>
					<button onClick={onClose} title="Close">×</button>
				</div>

				<div className="cd-list">
					<div className="cd-title">Popular constants</div>
					{builtin.map(row)}
					{custom.length > 0 && <div className="cd-title">Your constants</div>}
					{custom.map(row)}
				</div>

				<div className="cd-form">
					<div className="cd-title">{editingId ? 'Edit your constant' : 'Add your own constant'}</div>
					<div className="cd-form-grid">
						<input placeholder="Name, e.g. Spring constant" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
						<input placeholder="Symbol, e.g. k" value={draft.symbol} onChange={(e) => setDraft({ ...draft, symbol: e.target.value })} />
						<input placeholder="Value with unit, e.g. 250 N/m" value={draft.value} onChange={(e) => setDraft({ ...draft, value: e.target.value })} />
					</div>
					{error && <div className="cd-error">{error}</div>}
					<div className="cd-actions">
						{editingId && (
							<button
								onClick={() => {
									setEditingId(null)
									setDraft(EMPTY)
									setError('')
								}}
							>
								Cancel edit
							</button>
						)}
						<button className="cd-primary" onClick={save}>{editingId ? 'Save changes' : 'Save constant'}</button>
					</div>
				</div>
			</div>
		</div>,
		document.body
	)
}

import { useState } from 'react'
import { createPortal } from 'react-dom'
import type { Formula } from './lib/formulas'
import { draftFrom, emptyDraft, emptyVar, validateDraft, type FormulaDraft, type VarDraft } from './lib/customFormula'
import { allConstants } from './lib/constants'
import './formula-dialog.css'

/** Create or edit a formula of your own. Saved formulas appear in the formula list. */
export function FormulaDialog({
	initial,
	onSave,
	onCancel,
}: {
	initial: Formula | null
	onSave: (f: Formula) => void
	onCancel: () => void
}) {
	const [d, setD] = useState<FormulaDraft>(() => (initial ? draftFrom(initial) : emptyDraft()))
	const [error, setError] = useState('')

	const setVar = (i: number, patch: Partial<VarDraft>) =>
		setD((x) => ({ ...x, vars: x.vars.map((v, j) => (j === i ? { ...v, ...patch } : v)) }))

	const save = () => {
		const r = validateDraft(d, initial?.id)
		if (!r.ok) return setError(r.error)
		onSave(r.formula)
	}

	return createPortal(
		<div className="fd-backdrop" onMouseDown={onCancel}>
			<div className="fd" onMouseDown={(e) => e.stopPropagation()} onKeyDown={(e) => e.key === 'Escape' && onCancel()}>
				<h3>{initial ? 'Edit formula' : 'New physics formula'}</h3>

				<label>
					Name
					<input autoFocus value={d.name} placeholder="e.g. Ohm's law" onChange={(e) => setD({ ...d, name: e.target.value })} />
				</label>
				<label>
					Equation
					<input value={d.equation} placeholder="e.g. V = I R" onChange={(e) => setD({ ...d, equation: e.target.value })} />
				</label>

				<div className="fd-vars-head muted">
					<span>Symbol</span>
					<span>Label</span>
					<span>Unit</span>
					<span>Default</span>
					<span>Solve for it as</span>
				</div>
				{d.vars.map((v, i) => (
					<div key={i} className="fd-var">
						<input value={v.symbol} placeholder="V" onChange={(e) => setVar(i, { symbol: e.target.value })} />
						<input value={v.label} placeholder="Voltage" onChange={(e) => setVar(i, { label: e.target.value })} />
						<input value={v.unit} placeholder="V" onChange={(e) => setVar(i, { unit: e.target.value })} />
						<div className="fd-default">
							<select value={v.constantId} title="Take the default from a constant" onChange={(e) => setVar(i, { constantId: e.target.value })}>
								<option value="">typed</option>
								{allConstants().map((c) => (
									<option key={c.id} value={c.id}>
										{c.symbol} · {c.name}
									</option>
								))}
							</select>
							<input
								value={v.defaultValue}
								disabled={v.constantId !== ''}
								placeholder="(optional)"
								onChange={(e) => setVar(i, { defaultValue: e.target.value })}
							/>
						</div>
						<div className="fd-solve">
							<input value={v.solve} placeholder="I*R" onChange={(e) => setVar(i, { solve: e.target.value })} />
							<button
								type="button"
								title="Remove variable"
								disabled={d.vars.length <= 2}
								onClick={() => setD((x) => ({ ...x, vars: x.vars.filter((_, j) => j !== i) }))}
							>
								×
							</button>
						</div>
					</div>
				))}
				<button type="button" className="fd-add" onClick={() => setD((x) => ({ ...x, vars: [...x.vars, emptyVar()] }))}>
					+ variable
				</button>

				<p className="muted fd-hint">
					For each variable, write how to get it from the others. For V = I R, the row for V is <code>I*R</code>,
					the row for I is <code>V/R</code>, and the row for R is <code>V/I</code>. Use mathjs syntax:
					<code> ^ </code> for powers, <code>sqrt()</code>, <code>pi</code>. Units are like m/s^2, kg, N.
				</p>

				{error && <div className="fd-error">{error}</div>}

				<div className="fd-actions">
					<button type="button" onClick={onCancel}>Cancel</button>
					<button type="button" className="fd-primary" onClick={save}>Save formula</button>
				</div>
			</div>
		</div>,
		document.body
	)
}

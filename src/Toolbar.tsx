import { Panel, useReactFlow } from '@xyflow/react'
import { useState } from 'react'
import type { Formula } from './lib/formulas'
import { deleteFormula, isCustom, saveFormula, useFormulas } from './lib/registry'
import type { CalcData, ConstantData, FormulaData } from './lib/graph'
import { FormulaDialog } from './FormulaDialog'
import { ConstantsDialog } from './ConstantsDialog'

export type NewNode =
	| { kind: 'calc'; data: CalcData }
	| { kind: 'formula'; data: FormulaData }
	| { kind: 'const'; data: ConstantData }

/** Adds a sheet or a formula card in the middle of the view, and lists the physics formulas. */
export function Toolbar({ onAdd, notice }: { onAdd: (n: NewNode, pos: { x: number; y: number }) => void; notice: string }) {
	const rf = useReactFlow()
	const formulas = useFormulas()
	const [open, setOpen] = useState(false)
	const [constOpen, setConstOpen] = useState(false)
	// null: dialog closed. { formula: null }: creating. { formula: f }: editing f.
	const [editing, setEditing] = useState<{ formula: Formula | null } | null>(null)

	const add = (n: NewNode) => {
		const pos = rf.screenToFlowPosition({ x: window.innerWidth / 2 - 150, y: window.innerHeight / 2 - 120 })
		onAdd(n, pos)
		setOpen(false)
	}

	return (
		<Panel position="top-left">
			<div className="toolbar">
				<button onClick={() => add({ kind: 'calc', data: { lines: '', rows: [] } })}>+ Calculation sheet</button>
				<div style={{ position: 'relative' }}>
					<button onClick={() => setOpen((o) => !o)}>+ Physics formula ▾</button>
					{open && (
						<div className="menu">
							{formulas.map((f) => (
								<div key={f.id} className="menu-row">
									<button
										onClick={() => add({ kind: 'formula', data: { formulaId: f.id, values: JSON.stringify(defaults(f)), target: '' } })}
									>
										<strong>{f.name}</strong> <span className="muted">{f.equation}</span>
									</button>
									{isCustom(f.id) && (
										<>
											<button title="Edit formula" onClick={() => setEditing({ formula: f })}>✎</button>
											<button
												title="Delete formula"
												onClick={() => {
													if (confirm(`Delete "${f.name}"? Cards using it will show an error.`)) deleteFormula(f.id)
												}}
											>
												×
											</button>
										</>
									)}
								</div>
							))}
							<button className="menu-create" onClick={() => setEditing({ formula: null })}>
								✚ Create your own formula…
							</button>
						</div>
					)}
				</div>
				<button onClick={() => setConstOpen(true)}>Constants</button>
				{notice && <span className="notice">{notice}</span>}
			</div>
			{editing && (
				<FormulaDialog
					initial={editing.formula}
					onCancel={() => setEditing(null)}
					onSave={(f) => {
						saveFormula(f)
						setEditing(null)
						setOpen(true)
					}}
				/>
			)}
			{constOpen && (
				<ConstantsDialog
					onAdd={(id) => {
						add({ kind: 'const', data: { constId: id } })
						setConstOpen(false)
					}}
					onClose={() => setConstOpen(false)}
				/>
			)}
		</Panel>
	)
}

export function defaults(f: Formula) {
	return Object.fromEntries(f.vars.filter((v) => v.defaultValue !== undefined).map((v) => [v.symbol, v.defaultValue]))
}

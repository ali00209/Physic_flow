import { createPortal } from 'react-dom'
import { FUNCTION_GROUPS, UNIT_GROUPS, type RefGroup } from './lib/reference'
import './constants-dialog.css'

function Section({ title, groups }: { title: string; groups: RefGroup[] }) {
	return (
		<>
			<h4 className="ref-heading">{title}</h4>
			{groups.map((g) => (
				<div key={g.title}>
					<div className="cd-title">{g.title}</div>
					{g.note && <div className="muted ref-note">{g.note}</div>}
					{g.items.map((it) => (
						<div key={it.code} className="cd-row">
							<code className="ref-code">{it.code}</code>
							<span className="cd-name">{it.meaning}</span>
						</div>
					))}
				</div>
			))}
		</>
	)
}

/** Lists the units and functions a sheet, formula or constant can use. */
export function ReferenceDialog({ onClose }: { onClose: () => void }) {
	return createPortal(
		<div className="cd-backdrop" onMouseDown={onClose}>
			<div className="cd" onMouseDown={(e) => e.stopPropagation()} onKeyDown={(e) => e.key === 'Escape' && onClose()}>
				<div className="cd-head">
					<h3>Units and functions</h3>
					<button onClick={onClose} title="Close">×</button>
				</div>
				<div className="cd-list">
					<Section title="Units" groups={UNIT_GROUPS} />
					<Section title="Functions and operators" groups={FUNCTION_GROUPS} />
					<p className="muted ref-note">
						Write units after a number: <code>9.8 m/s^2</code>, <code>(8 + 6 + 3) m</code>. Powers use <code>^</code>.
						Write a variable on the left and its calculation on the right, one per line, ending with <code>;</code> or a new line.
					</p>
				</div>
			</div>
		</div>,
		document.body
	)
}

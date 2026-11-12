import { Handle, NodeResizer, Position, useReactFlow, type Node, type NodeProps } from '@xyflow/react'
import { useContext, useEffect, useRef, useState } from 'react'
import uPlot from 'uplot'
import 'uplot/dist/uPlot.min.css'
import { ResultContext } from '../ResultContext'
import { DraftInput } from '../Draft'
import {
	MAX_SERIES,
	inputRows,
	isGraphKind,
	nextColor,
	type GraphData,
	type GraphKind,
	type GraphView,
	type SeriesSetting,
} from '../lib/graphNode'
import './graph-node.css'

export type GraphFlowNode = Node<GraphData, GraphKind>

const CHART_H = 210

/** Turns the view's series into aligned columns for uPlot: one shared x list, nulls where a series has no point. */
function alignSeries(view: GraphView) {
	const shown = view.series.filter((s) => s.visible && s.xs.length > 0)
	const xs = Array.from(new Set(shown.flatMap((s) => s.xs))).sort((a, b) => a - b)
	const columns = shown.map((s) => {
		const at = new Map<number, number | null>()
		s.xs.forEach((x, i) => at.set(x, s.ys[i]))
		return xs.map((x) => at.get(x) ?? null)
	})
	return { shown, data: [xs, ...columns] as uPlot.AlignedData }
}

/**
 * The chart. The uPlot instance is created once and then updated in place: new data goes in with
 * setData, and a resize with setSize. It is rebuilt only when its look changes (series, axes, kind).
 */
function Chart({ view, data, kind }: { view: GraphView | undefined; data: GraphData; kind: GraphKind }) {
	const box = useRef<HTMLDivElement>(null)
	const plot = useRef<uPlot | null>(null)
	const lookKey = useRef('')

	// Keep the chart the size of its box, without re-rendering the node on every pixel.
	useEffect(() => {
		const el = box.current
		if (!el) return
		const ro = new ResizeObserver(() => {
			if (plot.current && el.clientWidth > 60) plot.current.setSize({ width: el.clientWidth, height: CHART_H - 8 })
		})
		ro.observe(el)
		return () => ro.disconnect()
	}, [])

	useEffect(() => () => plot.current?.destroy(), [])

	useEffect(() => {
		const el = box.current
		if (!el) return
		const aligned = view ? alignSeries(view) : null
		if (!view || !aligned || aligned.shown.length === 0 || el.clientWidth < 60) {
			plot.current?.destroy()
			plot.current = null
			lookKey.current = ''
			return
		}

		const scatter = kind === 'scatter'
		const bound = (text: string, factor: number) => {
			const n = parseFloat(text)
			return Number.isFinite(n) ? n / factor : null
		}
		const xMin = bound(data.xMin, view.xFactor)
		const xMax = bound(data.xMax, view.xFactor)
		const yMin = bound(data.yMin, view.yFactor)
		const yMax = bound(data.yMax, view.yFactor)

		const look = JSON.stringify([kind, view.xLabel, view.yLabel, xMin, xMax, yMin, yMax, aligned.shown.map((s) => [s.name, s.color])])
		if (plot.current && look === lookKey.current) {
			plot.current.setData(aligned.data)
			return
		}

		plot.current?.destroy()
		lookKey.current = look
		plot.current = new uPlot(
			{
				width: el.clientWidth,
				height: CHART_H - 8,
				cursor: { drag: { x: true, y: true } },
				legend: { show: true },
				scales: {
					x: { time: false, range: (_u, min, max) => [xMin ?? min, xMax ?? max] },
					y: { range: (_u, min, max) => [yMin ?? min, yMax ?? max] },
				},
				axes: [{ label: view.xLabel }, { label: view.yLabel }],
				series: [
					{},
					...aligned.shown.map((s) => ({
						label: s.name,
						stroke: s.color,
						width: scatter ? 0 : 2,
						spanGaps: true,
						points: { show: scatter, size: 6, fill: s.color, stroke: s.color },
					})),
				],
			},
			aligned.data,
			el
		)
	}, [view, data.xMin, data.xMax, data.yMin, data.yMax, kind])

	const hasAny = view?.series.some((s) => s.visible && s.xs.length > 0)
	return (
		<div ref={box} className="gn-chart nodrag nowheel nopan">
			{!hasAny && <div className="muted gn-empty">{view?.error ?? view?.series[0]?.error ?? 'Nothing to plot yet'}</div>}
		</div>
	)
}

/**
 * One graph node. Line, scatter and motion graphs are separate nodes that share this card. The
 * card shows the chart and an input row for every value; the values themselves come in by wire.
 */
export function GraphCard({ id, data, type }: NodeProps<GraphFlowNode>) {
	const kind: GraphKind = isGraphKind(type) ? type : 'line'
	const rf = useReactFlow()
	const [open, setOpen] = useState(false)
	const view = useContext(ResultContext).views[id]
	const gv = view?.graph
	const set = (patch: Partial<GraphData>) => rf.updateNodeData(id, patch)
	const patchSeries = (i: number, p: Partial<SeriesSetting>) =>
		set({ series: data.series.map((s, j) => (j === i ? { ...s, ...p } : s)) })

	const addSeries = () => set({ series: [...data.series, { sweep: '', color: nextColor(data.series.length), visible: true }] })
	const last = data.series.length - 1
	// A formula input can only be removed while nothing is wired into it.
	const lastWired = last >= 0 && view?.handleText[`ser:${last}`] !== undefined
	const removeLast = () => {
		if (!lastWired && last >= 0) set({ series: data.series.slice(0, -1) })
	}

	const rows = inputRows(kind, data)
	const errors = [...new Set((gv?.series ?? []).map((s) => s.error).filter((e): e is string => !!e))]
	if (gv?.error) errors.unshift(gv.error)

	return (
		<div className="card gn" style={{ width: data.width, minHeight: data.height }}>
			<NodeResizer
				minWidth={300}
				minHeight={320}
				onResize={(_e, p) => rf.updateNodeData(id, { width: Math.round(p.width), height: Math.round(p.height) })}
			/>
			<div className="card-header gn-head">
				<DraftInput className="nodrag gn-title" value={data.title} onCommit={(v) => set({ title: v })} />
				<button className="nodrag" title="Settings" onClick={() => setOpen((o) => !o)}>
					⚙
				</button>
			</div>

			<div className="gn-body">
				{rows.map((r) => {
					const wired = view?.handleText[r.handle]
					return (
						<div key={r.handle} className="row gn-row">
							<Handle type="target" position={Position.Left} id={r.handle} />
							<span className="gn-sym">{r.label}</span>
							{wired !== undefined ? (
								<span className="muted gn-state">{wired}</span>
							) : (
								<DraftInput
									className="nodrag gn-inline"
									value={data.inline?.[r.handle] ?? ''}
									placeholder={r.hint || 'type a value'}
									onCommit={(v) => set({ inline: { ...data.inline, [r.handle]: v } })}
								/>
							)}
						</div>
					)
				})}

				{kind !== 'motion' && (
					<div className="row gn-row">
						<button className="nodrag" disabled={data.series.length >= MAX_SERIES} onClick={addSeries}>
							+ formula input
						</button>
						<button className="nodrag" disabled={last < 0 || lastWired} title={lastWired ? 'Unwire it first' : 'Remove the last formula input'} onClick={removeLast}>
							− last input
						</button>
					</div>
				)}

				{open && (
					<div className="gn-settings">
						{kind === 'motion' ? (
							<div className="row gn-row">
								<span className="muted">plot</span>
								<select className="nodrag" value={data.qty} onChange={(e) => set({ qty: e.target.value as GraphData['qty'] })}>
									<option value="x">position (x) against time</option>
									<option value="v">velocity (v) against time</option>
									<option value="a">acceleration (a) against time</option>
								</select>
							</div>
						) : (
							data.series.map((s, i) => {
								const sv = gv?.series[i]
								return (
									<div key={i} className="gn-series" style={{ borderColor: s.color }}>
										<div className="row gn-row">
											<strong className="gn-name">{sv?.name ?? `Formula ${i + 1}`}</strong>
											<input className="nodrag gn-color" type="color" value={s.color} onChange={(e) => patchSeries(i, { color: e.target.value })} />
											<label className="gn-vis nodrag">
												<input type="checkbox" checked={s.visible} onChange={(e) => patchSeries(i, { visible: e.target.checked })} /> show
											</label>
										</div>
										<div className="row gn-row">
											<span className="muted">sweep</span>
											<select className="nodrag" value={sv?.sweep ?? ''} onChange={(e) => patchSeries(i, { sweep: e.target.value })}>
												{(sv?.options ?? []).map((o) => (
													<option key={o.symbol} value={o.symbol}>
														{o.symbol} · {o.label}
													</option>
												))}
											</select>
										</div>
									</div>
								)
							})
						)}
						<div className="muted gn-axes-title">Axes (display only)</div>
						<div className="row gn-row">
							<span className="muted">x</span>
							<DraftInput className="nodrag" value={data.xMin} placeholder="min" onCommit={(v) => set({ xMin: v })} />
							<DraftInput className="nodrag" value={data.xMax} placeholder="max" onCommit={(v) => set({ xMax: v })} />
							<DraftInput className="nodrag" value={data.xUnit} placeholder="unit" onCommit={(v) => set({ xUnit: v })} />
						</div>
						<div className="row gn-row">
							<span className="muted">y</span>
							<DraftInput className="nodrag" value={data.yMin} placeholder="min" onCommit={(v) => set({ yMin: v })} />
							<DraftInput className="nodrag" value={data.yMax} placeholder="max" onCommit={(v) => set({ yMax: v })} />
							<DraftInput className="nodrag" value={data.yUnit} placeholder="unit" onCommit={(v) => set({ yUnit: v })} />
						</div>
					</div>
				)}
			</div>

			<Chart view={gv} data={data} kind={kind} />
			{errors.map((e) => (
				<div key={e} className="gn-error gn-foot">
					{e}
				</div>
			))}
			{gv && gv.skipped > 0 && <div className="muted gn-foot gn-note">{gv.skipped} point{gv.skipped === 1 ? '' : 's'} skipped</div>}
		</div>
	)
}

import { describe, expect, it } from 'vitest'
import { math } from './math'
import { checkConnection, type GraphNode } from './graph'
import { computeGraphView, defaultGraph, displayFactor, inSI, inputRows, linspace, siUnitOf, type GraphData } from './graphNode'

const ohmCard = { data: { formulaId: 'ohm', values: JSON.stringify({ R: '4 ohm' }), target: 'V' }, wired: {} }

/** A line graph with one formula input, and the given values wired into its range. */
function line(incoming: Record<string, unknown>, data?: Partial<GraphData>) {
	const g: GraphData = { ...defaultGraph('line'), ...data }
	return computeGraphView('line', g, { cards: { 0: ohmCard }, incoming: new Map(Object.entries(incoming)) })
}

describe('units on graphs', () => {
	it('gives the SI unit text that mathjs can parse', () => {
		expect(siUnitOf('m/s^2')).toBe('m / s^2')
		expect(siUnitOf('')).toBe('')
		expect(math.unit(3, siUnitOf('m/s^2')).formatUnits()).toBe('m / s^2')
	})

	it('reads a wired number as the sweep unit, and a wired value with its own unit as itself', () => {
		expect(inSI(2, 'A')).toBeCloseTo(2)
		expect(inSI(math.evaluate('500 mA'), 'A')).toBeCloseTo(0.5)
		expect(inSI(undefined, 'A')).toBeNaN()
	})

	it('gives the scale from SI to a display unit, or null when the units differ', () => {
		expect(displayFactor('m', 'cm')).toBeCloseTo(100)
		expect(displayFactor('m', '')).toBe(1)
		expect(displayFactor('m', 's')).toBeNull()
	})

	it('spaces sweep values evenly, including both ends', () => {
		expect(linspace(0, 2, 5)).toEqual([0, 0.5, 1, 1.5, 2])
	})
})

describe('inputs', () => {
	it('gives a formula input per series plus the shared range on line and scatter graphs', () => {
		const g = { ...defaultGraph('line'), series: [{ sweep: '', color: '#000', visible: true }, { sweep: '', color: '#111', visible: true }] }
		expect(inputRows('line', g).map((r) => r.handle)).toEqual(['ser:0', 'ser:1', 'range:start', 'range:end', 'range:steps'])
	})

	it('gives every motion value as its own input', () => {
		expect(inputRows('motion', defaultGraph('motion')).map((r) => r.handle)).toEqual(['m:x0', 'm:v0', 'm:a', 'm:start', 'm:end', 'm:steps'])
	})
})

describe('line graph', () => {
	it('sweeps a formula: V = I R with R = 4 ohm gives V = 8 V at I = 2 A', () => {
		const view = line({ 'range:start': 0, 'range:end': 2, 'range:steps': 5 })
		const s = view.series[0]
		expect(s.error).toBeUndefined()
		expect(s.xs).toEqual([0, 0.5, 1, 1.5, 2])
		expect(s.ys[4]).toBeCloseTo(8)
		expect(s.ys[1]).toBeCloseTo(2)
		expect(s.sweep).toBe('I')
		expect(view.yLabel).toMatch(/Voltage/)
	})

	it('takes the range from wired values that carry their own unit', () => {
		const view = line({ 'range:start': math.evaluate('0 A'), 'range:end': math.evaluate('2 A'), 'range:steps': 5 })
		expect(view.series[0].ys[4]).toBeCloseTo(8)
	})

	it('shows the range in a display unit when one is chosen', () => {
		const view = line({ 'range:start': 0, 'range:end': 2, 'range:steps': 5 }, { xUnit: 'mA' })
		expect(view.xFactor).toBeCloseTo(1000)
		expect(view.series[0].xs[4]).toBeCloseTo(2000)
		expect(view.xLabel).toMatch(/mA/)
	})

	it('asks for start, end and steps until they are wired', () => {
		expect(line({}).series[0].error).toMatch(/Connect start, end and steps/)
	})

	it('asks for a formula until one is wired into the input', () => {
		const g = defaultGraph('line')
		const view = computeGraphView('line', g, { cards: {}, incoming: new Map<string, unknown>([['range:start', 0], ['range:end', 1], ['range:steps', 3]]) })
		expect(view.series[0].error).toMatch(/Connect a formula/)
	})
})

describe('motion graph', () => {
	it('works out x(t) = x0 + v0 t + a t^2 / 2: with v0 = 2 and a = 1, x(2) = 6', () => {
		const data = { ...defaultGraph('motion'), qty: 'x' as const }
		const view = computeGraphView('motion', data, {
			cards: {},
			incoming: new Map<string, unknown>([['m:x0', 0], ['m:v0', 2], ['m:a', 1], ['m:start', 0], ['m:end', 2], ['m:steps', 3]]),
		})
		expect(view.series[0].xs).toEqual([0, 1, 2])
		expect(view.series[0].ys[2]).toBeCloseTo(6)
	})

	it('plots velocity from a wired v0', () => {
		const data = { ...defaultGraph('motion'), qty: 'v' as const }
		const view = computeGraphView('motion', data, {
			cards: {},
			incoming: new Map<string, unknown>([['m:x0', 0], ['m:v0', 10], ['m:a', 1], ['m:start', 0], ['m:end', 1], ['m:steps', 2]]),
		})
		expect(view.series[0].ys[0]).toBeCloseTo(10)
		expect(view.series[0].ys[1]).toBeCloseTo(11)
	})

	it('asks for every motion value until they are wired', () => {
		const view = computeGraphView('motion', defaultGraph('motion'), { cards: {}, incoming: new Map() })
		expect(view.series[0].error).toMatch(/Connect x₀/)
	})
})

describe('graph wiring', () => {
	const formula: GraphNode = { id: 'f', kind: 'formula', data: { formulaId: 'ohm', values: '{}', target: 'V' } }
	const line1: GraphNode = { id: 'g', kind: 'line', data: defaultGraph('line') }
	const motion: GraphNode = { id: 'm', kind: 'motion', data: defaultGraph('motion') }
	const constant: GraphNode = { id: 'c', kind: 'const', data: { constId: 'g' } }

	it('lets a formula’s graph output feed a formula input', () => {
		expect(checkConnection([formula, line1], [], { source: 'f', sourceHandle: 'def', target: 'g', targetHandle: 'ser:0' })).toBeNull()
	})

	it('refuses a formula’s graph output going anywhere else', () => {
		expect(checkConnection([formula, line1], [], { source: 'f', sourceHandle: 'def', target: 'f', targetHandle: 'in:R' })).toMatch(/graph/)
		expect(checkConnection([formula, line1], [], { source: 'f', sourceHandle: 'def', target: 'g', targetHandle: 'range:start' })).toMatch(/graph/)
	})

	it('refuses a plain value going into a formula input', () => {
		expect(checkConnection([constant, line1], [], { source: 'c', sourceHandle: 'out', target: 'g', targetHandle: 'ser:0' })).toMatch(/graph/)
	})

	it('accepts values into the range and into the motion inputs', () => {
		expect(checkConnection([constant, line1], [], { source: 'c', sourceHandle: 'out', target: 'g', targetHandle: 'range:end' })).toBeNull()
		expect(checkConnection([constant, motion], [], { source: 'c', sourceHandle: 'out', target: 'm', targetHandle: 'm:v0' })).toBeNull()
	})
})

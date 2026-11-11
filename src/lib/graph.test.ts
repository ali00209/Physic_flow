import { describe, expect, it } from 'vitest'
import { checkConnection, computeGraph, type GraphEdge, type GraphNode } from './graph'

const sheet = (id: string, lines: string, rows: { id: string; dir: 'in' | 'out'; name: string }[]): GraphNode => ({
	id,
	kind: 'calc',
	data: { lines, rows },
})
const formula = (id: string, values: Record<string, string>, target = ''): GraphNode => ({
	id,
	kind: 'formula',
	data: { formulaId: 'newton2', values: JSON.stringify(values), target },
})
const wire = (source: string, sourceHandle: string, target: string, targetHandle: string): GraphEdge => ({
	id: `${source}-${sourceHandle}-${target}-${targetHandle}`,
	source,
	sourceHandle,
	target,
	targetHandle,
})

describe('computeGraph', () => {
	it('solves a formula from a sheet output, and updates when the sheet changes', () => {
		const nodes = [
			sheet('s', 'mass = 10 kg', [{ id: 'mo', dir: 'out', name: 'mass' }]),
			formula('f', { a: '10 m/s^2' }),
		]
		const edges = [wire('s', 'mo', 'f', 'in:m')]
		expect(computeGraph(nodes, edges).views.f.handleText.out).toBe('100 N')

		nodes[0] = sheet('s', 'mass = 20 kg', [{ id: 'mo', dir: 'out', name: 'mass' }])
		expect(computeGraph(nodes, edges).views.f.handleText.out).toBe('200 N')
	})

	it('shows the reason when a value cannot be used', () => {
		const nodes = [sheet('s', 'x = 5 s', [{ id: 'o', dir: 'out', name: 'x' }]), formula('f', { a: '10 m/s^2' })]
		const view = computeGraph(nodes, [wire('s', 'o', 'f', 'in:m')]).views.f
		expect(view.formula?.result.ok).toBe(false)
	})

	it('uses the latest wire into an input', () => {
		const nodes = [
			sheet('a', 'x = 2 kg', [{ id: 'ao', dir: 'out', name: 'x' }]),
			sheet('b', 'x = 4 kg', [{ id: 'bo', dir: 'out', name: 'x' }]),
			formula('f', { a: '10 m/s^2' }),
		]
		const edges = [wire('a', 'ao', 'f', 'in:m'), wire('b', 'bo', 'f', 'in:m')]
		expect(computeGraph(nodes, edges).views.f.handleText.out).toBe('40 N')
	})

	it('runs a sheet input from a wire by name', () => {
		const nodes = [
			sheet('s', 'mass = 10 kg', [{ id: 'mo', dir: 'out', name: 'mass' }]),
			sheet('t', 'y = q * 2', [
				{ id: 'ti', dir: 'in', name: 'q' },
				{ id: 'to', dir: 'out', name: 'y' },
			]),
		]
		const view = computeGraph(nodes, [wire('s', 'mo', 't', 'ti')]).views.t
		expect(view.handleText.to).toBe('20 kg')
	})

	it('keeps a sheet input untouched when nothing is wired', () => {
		const nodes = [sheet('t', 'y = 3 m', [{ id: 'to', dir: 'out', name: 'y' }])]
		expect(computeGraph(nodes, []).views.t.handleText.to).toBe('3 m')
	})
})

describe('checkConnection', () => {
	const nodes = [sheet('s', 'x = 1', [{ id: 'o', dir: 'out', name: 'x' }]), formula('f', {})]

	it('accepts an output into an input', () => {
		expect(checkConnection(nodes, [], { source: 's', sourceHandle: 'o', target: 'f', targetHandle: 'in:m' })).toBeNull()
	})

	it('refuses a wire that starts at an input', () => {
		expect(checkConnection(nodes, [], { source: 'f', sourceHandle: 'in:m', target: 's', targetHandle: 'o' })).toMatch(/start at an output/)
	})

	it('refuses a wire that closes a loop', () => {
		const loopNodes: GraphNode[] = [
			sheet('s', 'x = 1', [
				{ id: 'si', dir: 'in', name: 'q' },
				{ id: 'so', dir: 'out', name: 'x' },
			]),
			formula('f', {}),
		]
		// s -> f is already wired, so f -> s would close a loop.
		const edges = [wire('s', 'so', 'f', 'in:m')]
		expect(checkConnection(loopNodes, edges, { source: 'f', sourceHandle: 'out', target: 's', targetHandle: 'si' })).toMatch(/loop/)
		// A wire that doesn't close a loop is allowed.
		expect(checkConnection(loopNodes, edges, { source: 's', sourceHandle: 'so', target: 'f', targetHandle: 'in:a' })).toBeNull()
	})

	it('refuses a self loop', () => {
		expect(checkConnection(nodes, [], { source: 'f', sourceHandle: 'out', target: 'f', targetHandle: 'in:m' })).toMatch(/feed itself/)
	})
})

describe('waiting inputs', () => {
	it('says waiting when a wire is present but its source has no value yet', () => {
		const nodes = [
			formula('f', { a: '10 m/s^2' }),
			sheet('t', 'q = 1', [{ id: 'ti', dir: 'in', name: 'q' }]),
		]
		// f has no mass, so it has no output yet; the wire into t is still there.
		const view = computeGraph(nodes, [wire('f', 'out', 't', 'ti')]).views.t
		expect(view.handleText.ti).toBe('waiting')
	})
})

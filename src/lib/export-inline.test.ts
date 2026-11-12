import { describe, expect, it } from 'vitest'
import { computeGraph, handleDirection, type GraphNode } from './graph'
import { evaluateSheet, exportNames } from './sheet'
import { defaultGraph } from './graphNode'

describe('@export in calculation sheets', () => {
	it('lists the exported names in order, once each', () => {
		expect(exportNames('@export speed = d / t\nd = 8 m\n@export d = 8 m\nnot exported = 3')).toEqual(['speed', 'd'])
	})

	it('evaluates an @export line like any other line', () => {
		const r = evaluateSheet('@export distance = (8 + 6) m\nspeed = distance / (2 s)')
		expect(r.rows[0].result.kind).toBe('ok')
		expect(r.scope.distance).toBeDefined()
	})

	it('gives every export an output handle that wires as an output', () => {
		expect(handleDirection({ id: 's', kind: 'calc', data: { lines: '', rows: [] } }, 'export:speed')).toBe('out')
	})

	it('computes an exported value on the sheet, so a wire can carry it', () => {
		const sheet: GraphNode = { id: 's', kind: 'calc', data: { lines: '@export distance = (8 + 6) m', rows: [] } }
		const { views } = computeGraph([sheet], [])
		expect(views.s.handleText['export:distance']).toMatch(/14/)
	})
})

describe('typed values on graph inputs', () => {
	it('uses a typed value where nothing is wired', () => {
		const graph: GraphNode = {
			id: 'g',
			kind: 'motion',
			data: {
				...defaultGraph('motion'),
				inline: { 'm:x0': '0', 'm:v0': '2', 'm:a': '1', 'm:start': '0', 'm:end': '2', 'm:steps': '3' },
			},
		}
		const view = computeGraph([graph], []).views.g.graph!
		expect(view.series[0].error).toBeUndefined()
		expect(view.series[0].ys[2]).toBeCloseTo(6)
	})

	it('lets a wire win over the typed value', () => {
		const sheet: GraphNode = { id: 's', kind: 'calc', data: { lines: '@export time = 3 s', rows: [] } }
		const graph: GraphNode = {
			id: 'g',
			kind: 'motion',
			data: {
				...defaultGraph('motion'),
				inline: { 'm:x0': '0', 'm:v0': '2', 'm:a': '1', 'm:start': '0', 'm:end': '2', 'm:steps': '3' },
			},
		}
		const edges = [{ id: 'e', source: 's', sourceHandle: 'export:time', target: 'g', targetHandle: 'm:end' }]
		const view = computeGraph([sheet, graph], edges).views.g.graph!
		expect(view.series[0].xs[2]).toBeCloseTo(3)
		expect(view.series[0].ys[2]).toBeCloseTo(0 + 2 * 3 + 0.5 * 9)
	})

	it('treats an unreadable typed value as not connected', () => {
		const graph: GraphNode = { id: 'g', kind: 'motion', data: { ...defaultGraph('motion'), inline: { 'm:x0': 'hello ((' } } }
		expect(computeGraph([graph], []).views.g.graph!.series[0].error).toMatch(/Connect/)
	})
})

import { describe, expect, it } from 'vitest'
import { math } from './math'
import { FUNCTIONS, evaluateFunction, functionById } from './functions'
import { computeGraph, handleDirection, type GraphNode } from './graph'

const fn = (id: string) => functionById(id)!

describe('maths function nodes', () => {
	it('gives the right answers for plain numbers', () => {
		expect(evaluateFunction(fn('sqrt'), { x: 9 })).toEqual({ ok: true, value: 3 })
		expect(evaluateFunction(fn('min'), { a: 3, b: 5 })).toEqual({ ok: true, value: 3 })
		expect(evaluateFunction(fn('pow'), { x: 2, y: 5 })).toEqual({ ok: true, value: 32 })
	})

	it('takes units: sin(30 deg) and the square root of an area', () => {
		const sin = evaluateFunction(fn('sin'), { x: math.unit(30, 'deg') }) as { ok: true; value: unknown }
		expect(Number(sin.value)).toBeCloseTo(0.5)
		const root = evaluateFunction(fn('sqrt'), { x: math.evaluate('4 m^2') }) as { ok: true; value: any }
		expect(root.value.formatUnits()).toBe('m')
	})

	it('evaluates every listed function with sample arguments', () => {
		for (const f of FUNCTIONS) {
			const args = Object.fromEntries(f.args.map((a, i) => [a, 0.5 + i]))
			expect(evaluateFunction(f, args).ok, f.id).toBe(true)
		}
	})

	it('puts inputs on handles and the result on the output', () => {
		const node: GraphNode = { id: 'f', kind: 'fn', data: { fnId: 'atan2', values: {} } }
		expect(handleDirection(node, 'in:y')).toBe('in')
		expect(handleDirection(node, 'out')).toBe('out')
		expect(handleDirection(node, 'in:z')).toBe('in')
	})

	it('computes from typed values when nothing is wired', () => {
		const node: GraphNode = { id: 'f', kind: 'fn', data: { fnId: 'sqrt', values: { x: '16' } } }
		const { views } = computeGraph([node], [])
		expect(views.f.handleText.out).toBe('4')
	})

	it('takes a wired input over the typed value', () => {
		const sheet: GraphNode = { id: 's', kind: 'calc', data: { lines: '@export side = 3 m', rows: [] } }
		const node: GraphNode = { id: 'f', kind: 'fn', data: { fnId: 'sqrt', values: { x: '100' } } }
		const edges = [{ id: 'e', source: 's', sourceHandle: 'export:side', target: 'f', targetHandle: 'in:x' }]
		const { views } = computeGraph([sheet, node], edges)
		expect(views.f.handleText['in:x']).toMatch(/3/)
		expect(views.f.handleText.out).toBeDefined()
	})

	it('reports the reason when the arguments cannot be used', () => {
		const node: GraphNode = { id: 'f', kind: 'fn', data: { fnId: 'sqrt', values: { x: 'nonsense (' } } }
		const { views } = computeGraph([node], [])
		expect(views.f.handleText.out).toBeUndefined()
	})
})

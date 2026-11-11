import { describe, expect, it } from 'vitest'
import { math, fmt } from './math'
import { runSheet, solveFormulaNode, toSI } from './evaluate'

const val = (s: string) => math.evaluate(s)

describe('toSI: units and defaults', () => {
	it('takes a plain number in the variable default unit', () => {
		expect(toSI(5, 'kg')).toBe('5')
	})
	it('converts a unit into the variable unit (km/h into m/s)', () => {
		expect(Number(toSI(val('36 km/h'), 'm/s'))).toBeCloseTo(10)
	})
	it('refuses a unit of the wrong dimension', () => {
		expect(() => toSI(val('5 s'), 'kg')).toThrow()
	})
	it('refuses a unit where the variable has no unit', () => {
		expect(() => toSI(val('5 kg'), '')).toThrow()
	})
})

describe('solveFormulaNode', () => {
	it("solves Newton's second law from typed values with default units", () => {
		const r = solveFormulaNode(
			{ formulaId: 'newton2', values: JSON.stringify({ m: '10', a: '10' }), target: '' },
			{}
		)
		expect(r.result.ok).toBe(true)
		if (r.result.ok) expect(fmt(r.result.value)).toBe('100 N')
	})

	it('uses a wired value over a typed one', () => {
		const r = solveFormulaNode(
			{ formulaId: 'newton2', values: JSON.stringify({ m: '99', a: '10 m/s^2' }), target: '' },
			{ m: val('10 kg') }
		)
		expect(r.wired.m).toBeDefined()
		if (r.result.ok) expect(fmt(r.result.value)).toBe('100 N')
		else throw new Error(r.result.error)
	})

	it('shows momentum in its own unit, without parentheses', () => {
		const r = solveFormulaNode(
			{ formulaId: 'momentum', values: JSON.stringify({ m: '5', v: '2' }), target: '' },
			{}
		)
		expect(r.result.ok).toBe(true)
		if (r.result.ok) expect(fmt(r.result.value)).toBe('10 kg m/s')
	})

	it('refuses a wire with incompatible units', () => {
		const r = solveFormulaNode(
			{ formulaId: 'newton2', values: JSON.stringify({ a: '10 m/s^2' }), target: '' },
			{ m: val('5 s') }
		)
		expect(r.result.ok).toBe(false)
		if (!r.result.ok) expect(r.result.error).toMatch(/incompatible/)
	})

	it('refuses to solve for a variable that is wired', () => {
		const r = solveFormulaNode(
			{ formulaId: 'newton2', values: '{}', target: 'm' },
			{ m: val('10 kg') }
		)
		expect(r.result.ok).toBe(false)
	})

	it('asks for the missing value when nothing is set', () => {
		const r = solveFormulaNode({ formulaId: 'newton2', values: '{}', target: '' }, {})
		expect(r.result.ok).toBe(false)
	})
})

describe('runSheet', () => {
	it('chains statements and carries units through', () => {
		const { scope } = runSheet('distance = (8 + 6 + 3) m; speed = distance / (10 s)', {})
		expect(fmt(scope.distance)).toBe('17 m')
		expect(fmt(scope.speed)).toBe('1.7 m/s')
	})

	it('reports a check that passes and one that fails', () => {
		const { rows } = runSheet('a = 5 m = 5 m\nb = 2 m = 3 m', {})
		expect(rows[0].result.kind === 'ok' && rows[0].result.check?.ok).toBe(true)
		expect(rows[1].result.kind === 'ok' && rows[1].result.check?.ok).toBe(false)
	})

	it('uses wired inputs by name', () => {
		const { scope } = runSheet('y = x * 2', { x: val('3 m') })
		expect(fmt(scope.y)).toBe('6 m')
	})
})

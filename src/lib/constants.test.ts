import { describe, expect, it } from 'vitest'
import { BUILTIN_CONSTANTS, validateConstant } from './constants'
import { math } from './math'
import { computeGraph } from './graph'

describe('constants', () => {
	it('every built-in constant has a value that mathjs can read', () => {
		for (const c of BUILTIN_CONSTANTS) {
			expect(() => math.evaluate(c.value), c.name).not.toThrow()
		}
	})

	it('accepts a value with a unit, and a plain number', () => {
		expect(validateConstant({ name: 'Spring', symbol: 'k', value: '250 N/m' }).ok).toBe(true)
		expect(validateConstant({ name: 'Ratio', symbol: 'r', value: '3' }).ok).toBe(true)
	})

	it('rejects a missing name, symbol, or a value that is not a number', () => {
		expect(validateConstant({ name: '', symbol: 'k', value: '1 N/m' }).ok).toBe(false)
		expect(validateConstant({ name: 'x', symbol: '', value: '1 N/m' }).ok).toBe(false)
		expect(validateConstant({ name: 'x', symbol: 'k', value: 'hello' }).ok).toBe(false)
	})

	it('a constant node outputs its value with the unit', () => {
		const r = computeGraph([{ id: 'g1', kind: 'const', data: { constId: 'g' } }], [])
		expect(r.views.g1.handleText.out).toMatch(/9\.80665/)
		expect(r.views.g1.handleText.out).toMatch(/m\/s/)
	})

	it('an unknown constant id is reported on its node', () => {
		const r = computeGraph([{ id: 'x', kind: 'const', data: { constId: 'nope' } }], [])
		expect(r.views.x.error).toBe('Unknown constant')
	})
})

import { describe, expect, it } from 'vitest'
import { math } from './math'
import { FUNCTION_GROUPS, UNIT_GROUPS } from './reference'

describe('units and functions reference', () => {
	it('every listed unit is one the math engine understands', () => {
		const bad: string[] = []
		for (const g of UNIT_GROUPS.filter((g) => g.title !== 'Prefixes')) {
			for (const it of g.items) {
				try {
					math.evaluate(`1 ${it.code}`)
				} catch {
					bad.push(it.code)
				}
			}
		}
		expect(bad).toEqual([])
	})

	it('the prefixes work with a unit', () => {
		for (const example of ['1 km', '1 mA', '1 uF', '1 nm', '1 MW']) {
			expect(() => math.evaluate(example), example).not.toThrow()
		}
	})

	it('every listed function exists, and the numbers are right', () => {
		for (const g of FUNCTION_GROUPS) {
			for (const it of g.items) {
				const m = it.code.match(/^([a-z0-9]+)\(/)
				if (m) expect(typeof (math as any)[m[1]], it.code).toBe('function')
			}
		}
		expect(math.evaluate('sin(30 deg)')).toBeCloseTo(0.5, 9)
		expect(math.evaluate('sqrt(16)')).toBe(4)
		expect(math.evaluate('atan2(1, 1)')).toBeCloseTo(Math.PI / 4, 9)
	})
})

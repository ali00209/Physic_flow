import { describe, expect, it } from 'vitest'
import { validateDraft, type FormulaDraft } from './customFormula'

const ohm: FormulaDraft = {
	name: "Ohm's law",
	equation: 'V = I R',
	vars: [
		{ symbol: 'V', label: 'Voltage', unit: 'V', defaultValue: '', solve: 'I*R' },
		{ symbol: 'I', label: 'Current', unit: 'A', defaultValue: '', solve: 'V/R' },
		{ symbol: 'R', label: 'Resistance', unit: 'ohm', defaultValue: '', solve: 'V/I' },
	],
}

describe('validateDraft', () => {
	it('accepts a complete formula and gives it an id and clean fields', () => {
		const r = validateDraft(ohm)
		expect(r.ok).toBe(true)
		if (r.ok) {
			expect(r.formula.id.startsWith('custom-')).toBe(true)
			expect(r.formula.solve.V).toBe('I*R')
			expect(r.formula.vars[2].unit).toBe('ohm')
		}
	})

	it('keeps the id when editing', () => {
		const r = validateDraft(ohm, 'custom-keep-me')
		expect(r.ok && r.formula.id).toBe('custom-keep-me')
	})

	it('rejects a solve expression that uses an unknown name', () => {
		const bad = { ...ohm, vars: [{ ...ohm.vars[0], solve: 'I*Q' }, ohm.vars[1], ohm.vars[2]] }
		const r = validateDraft(bad)
		expect(r.ok).toBe(false)
		if (!r.ok) expect(r.error).toMatch(/unknown name "Q"/)
	})

	it('rejects a variable that is solved using itself', () => {
		const bad = { ...ohm, vars: [{ ...ohm.vars[0], solve: 'V*2' }, ohm.vars[1], ohm.vars[2]] }
		const r = validateDraft(bad)
		expect(r.ok).toBe(false)
	})

	it('rejects a unit that cannot be read', () => {
		const bad = { ...ohm, vars: [{ ...ohm.vars[0], unit: 'furlongsx' }, ohm.vars[1], ohm.vars[2]] }
		expect(validateDraft(bad).ok).toBe(false)
	})

	it('rejects a missing name and a duplicate symbol', () => {
		expect(validateDraft({ ...ohm, name: ' ' }).ok).toBe(false)
		const dup = { ...ohm, vars: [ohm.vars[0], { ...ohm.vars[1], symbol: 'V' }, ohm.vars[2]] }
		expect(validateDraft(dup).ok).toBe(false)
	})
})

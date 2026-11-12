import { describe, expect, it } from 'vitest'
import { math } from './math'
import { AP_FORMULAS } from './apFormulas'
import type { Formula } from './formulas'

const symbolsOf = (expr: string): string[] => {
	const names: string[] = []
	math.parse(expr).traverse((n: any) => {
		if (n.isSymbolNode) names.push(n.name)
	})
	return names
}

function run(expr: string, scope: Record<string, number>): number {
	try {
		const r = math.evaluate(expr, scope)
		return typeof r === 'number' ? r : NaN
	} catch {
		return NaN
	}
}

function baseValues(f: Formula, offset: number): Record<string, number> {
	const vals: Record<string, number> = {}
	f.vars.forEach((v, i) => {
		vals[v.symbol] = v.unit === 'rad' ? 0.6 : offset + 0.37 * i
	})
	return vals
}

const QUADRATIC = new Set(['ap-kin-displacement:t'])

describe('AP formula sheet', () => {
	it('every variable of every formula has a solve expression', () => {
		for (const f of AP_FORMULAS) for (const v of f.vars) expect(f.solve[v.symbol], `${f.name}: ${v.symbol}`).toBeTruthy()
	})

	it('solve expressions use only the formula variables and mathjs names', () => {
		for (const f of AP_FORMULAS) {
			const own = f.vars.map((v) => v.symbol)
			for (const [target, expr] of Object.entries(f.solve)) {
				for (const name of symbolsOf(expr)) {
					expect(own.includes(name) || name in math, `${f.name}: ${target} uses ${name}`).toBe(true)
				}
			}
		}
	})

	it('the solve expressions agree with one another', () => {
		for (const f of AP_FORMULAS) {
			const syms = f.vars.map((v) => v.symbol)
			let checked = 0
			for (const offset of [0.7, 1.1, 1.9]) {
				const base = baseValues(f, offset)
				for (const target of syms) {
					const point = { ...base }
					const x = run(f.solve[target], base)
					if (!Number.isFinite(x)) continue
					point[target] = x
					for (const y of syms) {
						if (y === target) continue
						// Solving a quadratic gives two roots; the sheet uses the positive one, so the check cannot match an arbitrary start.
						if (QUADRATIC.has(`${f.id}:${y}`)) continue
						const got = run(f.solve[y], point)
						if (!Number.isFinite(got) || !Number.isFinite(point[y])) continue
						checked++
						const err = Math.abs(got - point[y]) / Math.max(1, Math.abs(point[y]))
						expect(err, `${f.name}: solving ${y} after ${target}`).toBeLessThan(1e-6)
					}
				}
			}
			expect(checked, `${f.name} was never checked`).toBeGreaterThan(0)
		}
	})
})

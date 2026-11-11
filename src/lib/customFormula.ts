import type { Formula } from './formulas'
import { asciiUnit } from './sheet'
import { math } from './math'

/** What the user types in the "new formula" dialog. */
export type VarDraft = { symbol: string; label: string; unit: string; defaultValue: string; solve: string }
export type FormulaDraft = { name: string; equation: string; vars: VarDraft[] }

export const emptyDraft = (): FormulaDraft => ({
	name: '',
	equation: '',
	vars: [
		{ symbol: '', label: '', unit: '', defaultValue: '', solve: '' },
		{ symbol: '', label: '', unit: '', defaultValue: '', solve: '' },
	],
})

export function draftFrom(f: Formula): FormulaDraft {
	return {
		name: f.name,
		equation: f.equation,
		vars: f.vars.map((v) => ({
			symbol: v.symbol,
			label: v.label,
			unit: v.unit,
			defaultValue: v.defaultValue ?? '',
			solve: f.solve[v.symbol] ?? '',
		})),
	}
}

const SYMBOL = /^[A-Za-z][A-Za-z0-9_]*$/

/** Checks one "solve for" expression: it may use only the other variables and mathjs names. */
function checkSolve(expr: string, target: string, symbols: string[]): string | null {
	let node
	try {
		node = math.parse(expr)
	} catch (e) {
		return `can't read "${expr}": ${(e as Error).message}`
	}
	const scope: Record<string, number> = {}
	let problem: string | null = null
	node.traverse((n: any) => {
		if (!n.isSymbolNode || problem) return
		const name: string = n.name
		if (name === target) problem = `uses ${target} itself`
		else if (symbols.includes(name)) scope[name] = 2
		else if (!(name in math)) problem = `unknown name "${name}"`
	})
	if (problem) return problem
	try {
		math.evaluate(expr, scope)
	} catch (e) {
		return (e as Error).message
	}
	return null
}

/** Turns the dialog's input into a formula, or says what is wrong with it. */
export function validateDraft(
	d: FormulaDraft,
	existingId?: string
): { ok: true; formula: Formula } | { ok: false; error: string } {
	if (!d.name.trim()) return { ok: false, error: 'Give the formula a name.' }
	if (!d.equation.trim()) return { ok: false, error: 'Write the equation, e.g. E = m c^2.' }
	if (d.vars.length < 2) return { ok: false, error: 'A formula needs at least two variables.' }

	const symbols = d.vars.map((v) => v.symbol.trim())
	for (const [i, v] of d.vars.entries()) {
		const sym = symbols[i]
		if (!SYMBOL.test(sym)) return { ok: false, error: `Variable ${i + 1}: use a letter-based symbol such as m or v0.` }
		if (symbols.indexOf(sym) !== i) return { ok: false, error: `The symbol ${sym} is used twice.` }
		if (v.unit.trim()) {
			try {
				math.evaluate(`(1 ${asciiUnit(v.unit.trim())})`)
			} catch {
				return { ok: false, error: `${sym}: the unit "${v.unit}" is not understood (try m/s^2, kg, N).` }
			}
		}
		if (v.defaultValue.trim()) {
			try {
				math.evaluate(v.defaultValue.trim())
			} catch {
				return { ok: false, error: `${sym}: the default "${v.defaultValue}" is not a value.` }
			}
		}
		if (!v.solve.trim()) return { ok: false, error: `Write how to get ${sym} from the others.` }
		const problem = checkSolve(v.solve.trim(), sym, symbols)
		if (problem) return { ok: false, error: `${sym}: ${problem}` }
	}

	const id = existingId ?? `custom-${d.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 30) || 'formula'}-${Date.now().toString(36)}`
	const formula: Formula = {
		id,
		name: d.name.trim(),
		equation: d.equation.trim(),
		vars: d.vars.map((v) => ({
			symbol: v.symbol.trim(),
			label: v.label.trim() || v.symbol.trim(),
			unit: v.unit.trim(),
			...(v.defaultValue.trim() ? { defaultValue: v.defaultValue.trim() } : {}),
		})),
		solve: Object.fromEntries(d.vars.map((v) => [v.symbol.trim(), v.solve.trim()])),
	}
	return { ok: true, formula }
}

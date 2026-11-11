import { fmt, math } from './math'
import { solveFormula, unitOf } from './formulas'
import { findFormula } from './registry'
import { asciiUnit, evaluateSheet, type SheetRow } from './sheet'

/** Plain values keyed by name (a wire's value, or a sheet input name). */
export type RawInputs = Record<string, unknown>

/** Converts a value to a plain number in a unit. Throws when the units are not compatible. */
export function toSI(v: unknown, unit: string): string {
	const isUnit = math.typeOf(v as any) === 'Unit'
	if (!unit) {
		if (isUnit) throw new Error('unit not expected')
		return String(v)
	}
	// A plain number takes the variable's default unit, so typing 5 into mass means 5 kg.
	if (!isUnit) return String(v)
	const target = math.evaluate(`(1 ${asciiUnit(unit)})`)
	return String((v as any).toNumber(target.formatUnits()))
}

export function parseFormulaValues(raw: string): Record<string, string> {
	try {
		return JSON.parse(raw) ?? {}
	} catch {
		return {}
	}
}

export type FormulaNodeData = { formulaId: string; values: string; target: string }

export type FormulaSolve = {
	/** Inputs that arrived on a wire, with the text shown for each. */
	wired: Record<string, string>
	result: { ok: true; symbol: string; value: unknown } | { ok: false; error: string }
}

/** Solves one formula card. Wired values win over typed ones; everything is worked in SI units. */
export function solveFormulaNode(node: FormulaNodeData, inputs: RawInputs): FormulaSolve {
	const f = findFormula(node.formulaId)
	if (!f) return { wired: {}, result: { ok: false, error: 'Unknown formula' } }

	const values: Record<string, string> = {}
	for (const v of f.vars) if (v.defaultValue !== undefined) values[v.symbol] = v.defaultValue
	Object.assign(values, parseFormulaValues(node.values))

	const wired: Record<string, string> = {}
	for (const v of f.vars) {
		const val = inputs[v.symbol]
		if (val === undefined) continue
		try {
			values[v.symbol] = toSI(val, v.unit)
			wired[v.symbol] = fmt(val)
		} catch {
			return { wired, result: { ok: false, error: `${v.symbol} arrives with incompatible units` } }
		}
	}

	for (const v of f.vars) {
		if (wired[v.symbol] !== undefined) continue
		const raw = values[v.symbol]
		if (raw === undefined || raw.trim() === '') continue
		try {
			values[v.symbol] = toSI(math.evaluate(raw), v.unit)
		} catch (err) {
			return { wired, result: { ok: false, error: `Check ${v.symbol}: ${(err as Error).message}` } }
		}
	}

	const target = node.target || undefined
	if (target && wired[target] !== undefined) {
		return { wired, result: { ok: false, error: `${target} is wired, so pick another variable to solve for` } }
	}

	const res = solveFormula(f, values, target)
	if (!res.ok) return { wired, result: { ok: false, error: res.error } }

	const unit = unitOf(f, res.symbol)
	let value: any = math.evaluate(unit ? `${res.value} ${asciiUnit(unit)}` : res.value)
	// Show the result in the formula's own unit (kg*m/s, not a product of separate units).
	if (unit && math.typeOf(value) === 'Unit') {
		try {
			value = value.to(asciiUnit(unit))
		} catch {
			/* keep the unit mathjs produced */
		}
	}
	return { wired, result: { ok: true, symbol: res.symbol, value } }
}

/** Runs a calculation sheet. Named inputs come from wires; named outputs are read from the scope. */
export function runSheet(text: string, inputs: RawInputs): { rows: SheetRow[]; scope: Record<string, any> } {
	const res = evaluateSheet(text, inputs as Record<string, any>)
	return { rows: res.rows, scope: res.scope as Record<string, any> }
}

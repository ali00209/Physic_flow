import { math } from './math'

/**
 * Maths functions as nodes. Each one has inputs named by its arguments and one output, `result`.
 * Values are the same ones the calculation sheet uses, so units work here too (sin(30 deg)).
 */
export type FnDef = { id: string; name: string; expr: string; args: string[]; group: string }

export const FN_GROUPS = [
	'Roots and powers',
	'Exponentials and logarithms',
	'Trigonometry',
	'Rounding and comparing',
]

export const FUNCTIONS: FnDef[] = [
	{ id: 'sqrt', name: 'Square root', expr: 'sqrt(x)', args: ['x'], group: 'Roots and powers' },
	{ id: 'cbrt', name: 'Cube root', expr: 'cbrt(x)', args: ['x'], group: 'Roots and powers' },
	{ id: 'pow', name: 'Power', expr: 'pow(x, y)', args: ['x', 'y'], group: 'Roots and powers' },
	{ id: 'abs', name: 'Absolute value', expr: 'abs(x)', args: ['x'], group: 'Roots and powers' },
	{ id: 'exp', name: 'Exponential', expr: 'exp(x)', args: ['x'], group: 'Exponentials and logarithms' },
	{ id: 'log', name: 'Natural log', expr: 'log(x)', args: ['x'], group: 'Exponentials and logarithms' },
	{ id: 'log10', name: 'Log base 10', expr: 'log10(x)', args: ['x'], group: 'Exponentials and logarithms' },
	{ id: 'sin', name: 'Sine', expr: 'sin(x)', args: ['x'], group: 'Trigonometry' },
	{ id: 'cos', name: 'Cosine', expr: 'cos(x)', args: ['x'], group: 'Trigonometry' },
	{ id: 'tan', name: 'Tangent', expr: 'tan(x)', args: ['x'], group: 'Trigonometry' },
	{ id: 'asin', name: 'Inverse sine', expr: 'asin(x)', args: ['x'], group: 'Trigonometry' },
	{ id: 'acos', name: 'Inverse cosine', expr: 'acos(x)', args: ['x'], group: 'Trigonometry' },
	{ id: 'atan', name: 'Inverse tangent', expr: 'atan(x)', args: ['x'], group: 'Trigonometry' },
	{ id: 'atan2', name: 'Angle of (x, y)', expr: 'atan2(y, x)', args: ['y', 'x'], group: 'Trigonometry' },
	{ id: 'round', name: 'Round', expr: 'round(x)', args: ['x'], group: 'Rounding and comparing' },
	{ id: 'floor', name: 'Round down', expr: 'floor(x)', args: ['x'], group: 'Rounding and comparing' },
	{ id: 'ceil', name: 'Round up', expr: 'ceil(x)', args: ['x'], group: 'Rounding and comparing' },
	{ id: 'min', name: 'Smaller of two', expr: 'min(a, b)', args: ['a', 'b'], group: 'Rounding and comparing' },
	{ id: 'max', name: 'Larger of two', expr: 'max(a, b)', args: ['a', 'b'], group: 'Rounding and comparing' },
]

export const functionById = (id: string) => FUNCTIONS.find((f) => f.id === id)

/** Runs a function on its arguments. Each argument is a number or a unit value. */
export function evaluateFunction(def: FnDef, args: Record<string, unknown>): { ok: true; value: unknown } | { ok: false; error: string } {
	try {
		const value = math.evaluate(def.expr, { ...args })
		return { ok: true, value }
	} catch (e) {
		return { ok: false, error: (e as Error).message }
	}
}

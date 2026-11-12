import { math } from './math'

export type Variable = {
  symbol: string
  label: string
  unit: string
  defaultValue?: string
  /** A constant (by id) that supplies this variable's default. Used when nothing is wired in. */
  constantId?: string
}

export type Formula = {
  id: string
  name: string
  equation: string
  vars: Variable[]
  /** For each variable: an expression that solves for it using the others. */
  solve: Record<string, string>
  /** The group the formula is listed under in the sidebar. */
  section?: string
}

/**
 * To add a formula, add an entry here. Write one `solve` expression per variable
 * (rearranged form). Use mathjs syntax: ^ for powers, sqrt(), pi, etc.
 */
export const FORMULAS: Formula[] = [
  {
    id: 'newton2',
    name: "Newton's second law",
    equation: 'F = m · a',
    vars: [
      { symbol: 'F', label: 'Force', unit: 'N' },
      { symbol: 'm', label: 'Mass', unit: 'kg' },
      { symbol: 'a', label: 'Acceleration', unit: 'm/s²' },
    ],
    solve: { F: 'm*a', m: 'F/a', a: 'F/m' },
  },
  {
    id: 'kinetic',
    name: 'Kinetic energy',
    equation: 'KE = ½ m v²',
    vars: [
      { symbol: 'KE', label: 'Kinetic energy', unit: 'J' },
      { symbol: 'm', label: 'Mass', unit: 'kg' },
      { symbol: 'v', label: 'Speed', unit: 'm/s' },
    ],
    solve: { KE: '0.5*m*v^2', m: '2*KE/v^2', v: 'sqrt(2*KE/m)' },
  },
  {
    id: 'potential',
    name: 'Gravitational potential energy',
    equation: 'PE = m g h',
    vars: [
      { symbol: 'PE', label: 'Potential energy', unit: 'J' },
      { symbol: 'm', label: 'Mass', unit: 'kg' },
      { symbol: 'g', label: 'Gravity', unit: 'm/s²', constantId: 'g' },
      { symbol: 'h', label: 'Height', unit: 'm' },
    ],
    solve: { PE: 'm*g*h', m: 'PE/(g*h)', g: 'PE/(m*h)', h: 'PE/(m*g)' },
  },
  {
    id: 'momentum',
    name: 'Momentum',
    equation: 'p = m v',
    vars: [
      { symbol: 'p', label: 'Momentum', unit: 'kg·m/s' },
      { symbol: 'm', label: 'Mass', unit: 'kg' },
      { symbol: 'v', label: 'Velocity', unit: 'm/s' },
    ],
    solve: { p: 'm*v', m: 'p/v', v: 'p/m' },
  },
  {
    id: 'kinematics',
    name: 'Kinematics (velocity)',
    equation: 'v = u + a t',
    vars: [
      { symbol: 'v', label: 'Final velocity', unit: 'm/s' },
      { symbol: 'u', label: 'Initial velocity', unit: 'm/s' },
      { symbol: 'a', label: 'Acceleration', unit: 'm/s²' },
      { symbol: 't', label: 'Time', unit: 's' },
    ],
    solve: { v: 'u + a*t', u: 'v - a*t', a: '(v - u)/t', t: '(v - u)/a' },
  },
  {
    id: 'ohm',
    name: "Ohm's law",
    equation: 'V = I R',
    vars: [
      { symbol: 'V', label: 'Voltage', unit: 'V' },
      { symbol: 'I', label: 'Current', unit: 'A' },
      { symbol: 'R', label: 'Resistance', unit: 'Ω' },
    ],
    solve: { V: 'I*R', I: 'V/R', R: 'V/I' },
  },
  {
    id: 'ideal-gas',
    name: 'Ideal gas law',
    equation: 'P V = n R T',
    vars: [
      { symbol: 'P', label: 'Pressure', unit: 'Pa' },
      { symbol: 'V', label: 'Volume', unit: 'm³' },
      { symbol: 'n', label: 'Moles', unit: 'mol' },
      { symbol: 'R', label: 'Gas constant', unit: 'J/(mol·K)', defaultValue: '8.314 J/(mol * K)' },
      { symbol: 'T', label: 'Temperature', unit: 'K' },
    ],
    solve: {
      P: 'n*R*T/V',
      V: 'n*R*T/P',
      n: 'P*V/(R*T)',
      T: 'P*V/(n*R)',
    },
  },
  {
    id: 'circle-area',
    name: 'Area of a circle',
    equation: 'A = π r²',
    vars: [
      { symbol: 'A', label: 'Area', unit: 'm²' },
      { symbol: 'r', label: 'Radius', unit: 'm' },
    ],
    solve: { A: 'pi*r^2', r: 'sqrt(A/pi)' },
  },
  {
    id: 'pythagoras',
    name: 'Pythagorean theorem',
    equation: 'c² = a² + b²',
    vars: [
      { symbol: 'c', label: 'Hypotenuse', unit: '' },
      { symbol: 'a', label: 'Side a', unit: '' },
      { symbol: 'b', label: 'Side b', unit: '' },
    ],
    solve: { c: 'sqrt(a^2 + b^2)', a: 'sqrt(c^2 - b^2)', b: 'sqrt(c^2 - a^2)' },
  },
]

export type SolveResult =
  | { ok: true; symbol: string; value: string }
  | { ok: false; error: string }

/**
 * Solves a formula. If `requested` is empty and exactly one value is blank,
 * that blank is solved for automatically. Values may be expressions like "2*9.81".
 */
export function solveFormula(
  f: Formula,
  values: Record<string, string>,
  requested?: string,
): SolveResult {
  const symbols = f.vars.map((v) => v.symbol)
  const isFilled = (s: string) => (values[s] ?? '').trim() !== ''
  const empty = symbols.filter((s) => !isFilled(s))
  const target = requested || (empty.length === 1 ? empty[0] : undefined)

  if (!target) {
    return {
      ok: false,
      error:
        empty.length === 0
          ? 'All values are filled. Pick a variable to recompute.'
          : `Fill in all but one value (still empty: ${empty.join(', ')}).`,
    }
  }

  const scope: Record<string, unknown> = {}
  for (const s of symbols) {
    if (s === target) continue
    if (!isFilled(s)) return { ok: false, error: `Enter a value for ${s}.` }
    try {
      scope[s] = math.evaluate(values[s])
    } catch (e) {
      return { ok: false, error: `Bad value for ${s}: ${(e as Error).message}` }
    }
  }

  try {
    const value = math.evaluate(f.solve[target], scope)
    return { ok: true, symbol: target, value: math.format(value, { precision: 10 }) }
  } catch (e) {
    return { ok: false, error: (e as Error).message }
  }
}

export const unitOf = (f: Formula, symbol: string) =>
  f.vars.find((v) => v.symbol === symbol)?.unit ?? ''

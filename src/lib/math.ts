import { create, all } from 'mathjs'

// One shared mathjs instance for the whole app. Units (m, s, kg, N, ...) are built in.
export const math = create(all, {})

// Compact display: "0.5 m / s" -> "0.5 m/s"
export const fmt = (v: unknown) =>
	math.format(v, { precision: 12 }).replace(/ \/ /g, '/').replace(/\(([^()]*)\)/g, '$1')

// Turns mathjs unit errors into messages a student can act on.
export function friendlyError(msg: string): string {
  if (/Unexpected type of argument/.test(msg) && /actual: number/.test(msg)) {
    return 'Mixed units and plain numbers: give every number in this operation a unit (e.g. 6 m).'
  }
  if (/Units do not match|Cannot convert/.test(msg)) {
    return `Incompatible units: ${msg}`
  }
  return msg
}

// Compares two values, converting units to the expected unit first (17 m vs 17 m, or 1700 cm vs 17 m).
export function sameValue(a: any, b: any): boolean {
  if (math.typeOf(a) === 'Unit' && math.typeOf(b) === 'Unit') {
    const unit = b.formatUnits()
    return Math.abs(a.toNumber(unit) - b.toNumber(unit)) < 1e-9
  }
  if (math.typeOf(a) === 'Unit' || math.typeOf(b) === 'Unit') return false
  return Math.abs(Number(a) - Number(b)) < 1e-9
}

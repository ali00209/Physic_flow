import { fmt, friendlyError, math, sameValue } from './math'
import { type Formula } from './formulas'
import { allFormulas } from './registry'

export type CheckResult = { ok: boolean; expected: string }

export type LineResult =
  | { kind: 'error'; error: string; comment: string }
  | { kind: 'ok'; name?: string; text: string; comment: string; check?: CheckResult }

export type Statement = { body: string; comment: string; start: number; end: number }

export type SheetRow = { source: string; start: number; end: number; result: LineResult }

/** A statement starting with "@export" is evaluated like any other, and its name becomes an output. */
const EXPORT_PREFIX = /^@export\s+/

/** The names marked with @export, in order: "@export speed = d / t" exports "speed". */
export function exportNames(text: string): string[] {
  const names: string[] = []
  for (const { body } of splitStatements(text)) {
    const m = body.match(/^@export\s+([A-Za-z_]\w*)\s*=/)
    if (m && !names.includes(m[1])) names.push(m[1])
  }
  return names
}

// Formula units use symbols like ² and Ω; mathjs needs ASCII.
export const asciiUnit = (u: string) =>
  u.replace(/²/g, '^2').replace(/³/g, '^3').replace(/Ω/g, 'ohm').replace(/·/g, ' * ')

/**
 * Splits sheet text into statements. A statement ends at a line break or at ";".
 * A "# note" runs to the end of its line and is attached to the last statement on that line.
 * start/end are the statement's character offsets in the text.
 */
export function splitStatements(text: string): Statement[] {
  const out: Statement[] = []
  let lineStart = 0
  for (const physical of text.split('\n')) {
    const hash = physical.indexOf('#')
    const code = hash === -1 ? physical : physical.slice(0, hash)
    const comment = hash === -1 ? '' : physical.slice(hash + 1).trim()
    const line: Statement[] = []
    let cursor = 0
    for (const piece of code.split(';')) {
      const body = piece.trim()
      if (body) {
        const start = lineStart + cursor + (piece.length - piece.trimStart().length)
        line.push({ body, comment: '', start, end: start + body.length })
      }
      cursor += piece.length + 1
    }
    if (line.length) line[line.length - 1].comment = comment
    out.push(...line)
    lineStart += physical.length + 1
  }
  return out
}

// Short keys used by the old "use" syntax: "ideal-gas" -> "idealgas".
export const formulaKey = (f: Formula) => f.id.replace(/[^a-z0-9]/gi, '').toLowerCase()

// Splits "a, b = 1, c = 2 m" on commas that are not inside parentheses.
function splitArgs(s: string): string[] {
  const args: string[] = []
  let depth = 0
  let cur = ''
  for (const ch of s) {
    if (ch === '(') depth++
    if (ch === ')') depth--
    if (ch === ',' && depth === 0) {
      args.push(cur.trim())
      cur = ''
    } else {
      cur += ch
    }
  }
  if (cur.trim()) args.push(cur.trim())
  return args
}

const USE_RE = /^use\s+([A-Za-z]\w*)\s*\((.*)\)$/

/**
 * Reads an old `use formula(...)` statement. Only used when migrating old sheets to formula cards.
 */
export function parseUse(
  body: string,
): { formulaId: string; values: Record<string, string>; unknown: string } | null {
  const m = body.match(USE_RE)
  if (!m) return null
  const f = allFormulas().find((x) => formulaKey(x) === m[1].toLowerCase())
  if (!f) return null

  const values: Record<string, string> = {}
  for (const v of f.vars) if (v.defaultValue !== undefined) values[v.symbol] = v.defaultValue

  let unknown = ''
  for (const arg of splitArgs(m[2])) {
    const assign = arg.match(/^([A-Za-z]\w*)\s*=\s*(.+)$/)
    if (assign) {
      values[assign[1]] = assign[2]
    } else if (/^[A-Za-z]\w*$/.test(arg)) {
      if (!unknown) unknown = arg
      else values[arg] = arg // a sheet variable with the same name
    }
  }
  if (!unknown) {
    const missing = f.vars.filter((v) => !(v.symbol in values))
    if (missing.length === 1) unknown = missing[0].symbol
  }
  return { formulaId: f.id, values, unknown }
}

function evaluateOne(body: string, comment: string, scope: Record<string, unknown>): LineResult {
  const assign = body.match(/^([A-Za-z_]\w*)\s*=\s*(.+)$/)
  const name = assign ? assign[1] : undefined
  if (name && (name === 'to' || math.Unit.isValuelessUnit(name))) {
    return {
      kind: 'error',
      error: `"${name}" is a unit name. Use another variable name (e.g. mass instead of m).`,
      comment,
    }
  }
  const rhs = assign ? assign[2] : body
  const [exprSrc, expectedSrc] = rhs.split('=').map((s) => s.trim())

  let value: any
  try {
    value = math.evaluate(exprSrc, scope)
  } catch (e) {
    return { kind: 'error', error: friendlyError((e as Error).message), comment }
  }
  if (name) scope[name] = value

  let check: CheckResult | undefined
  if (expectedSrc) {
    try {
      const expected: any = math.evaluate(expectedSrc, scope)
      check = { ok: sameValue(value, expected), expected: fmt(expected) }
    } catch (e) {
      return { kind: 'error', error: `Check failed: ${(e as Error).message}`, comment }
    }
  }

  return { kind: 'ok', name, text: fmt(value), comment, check }
}

/**
 * Evaluates a sheet in order with one shared scope. `inputs` are values arriving on the
 * sheet's input ports; they are available to every line by name.
 *
 * Syntax:
 *   name = expression                 defines `name`
 *   name = expression = expected      checks the result against `expected`
 *   ...; ...                          ";" ends a statement, like a line break
 *   ... # note                        note shown beside the result (e.g. "north")
 */
export function evaluateSheet(
  text: string,
  inputs: Record<string, unknown> = {},
): { rows: SheetRow[]; scope: Record<string, unknown> } {
  const scope: Record<string, unknown> = { ...inputs }
  const rows = splitStatements(text).map(({ body, comment, start, end }) => ({
    source: body,
    start,
    end,
    result: evaluateOne(body.replace(EXPORT_PREFIX, ''), comment, scope),
  }))
  return { rows, scope }
}

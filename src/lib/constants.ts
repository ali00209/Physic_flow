import { useSyncExternalStore } from 'react'
import { math } from './math'

/**
 * Physical constants. The built-in list ships with the app; the ones the user adds are saved in this
 * browser's localStorage. Each value is written with its unit, e.g. "9.80665 m/s^2".
 */
export type Constant = { id: string; name: string; symbol: string; value: string }

export const BUILTIN_CONSTANTS: Constant[] = [
	{ id: 'g', name: 'Gravity (Earth surface)', symbol: 'g', value: '9.80665 m/s^2' },
	{ id: 'c', name: 'Speed of light in vacuum', symbol: 'c', value: '299792458 m/s' },
	{ id: 'G', name: 'Gravitational constant', symbol: 'G', value: '6.67430e-11 m^3/(kg s^2)' },
	{ id: 'h', name: 'Planck constant', symbol: 'h', value: '6.62607015e-34 J s' },
	{ id: 'kB', name: 'Boltzmann constant', symbol: 'k_B', value: '1.380649e-23 J/K' },
	{ id: 'NA', name: 'Avogadro constant', symbol: 'N_A', value: '6.02214076e23 / mol' },
	{ id: 'R', name: 'Molar gas constant', symbol: 'R', value: '8.314462618 J/(mol K)' },
	{ id: 'e', name: 'Elementary charge', symbol: 'e', value: '1.602176634e-19 C' },
	{ id: 'me', name: 'Electron mass', symbol: 'm_e', value: '9.1093837015e-31 kg' },
	{ id: 'mp', name: 'Proton mass', symbol: 'm_p', value: '1.67262192369e-27 kg' },
	{ id: 'eps0', name: 'Vacuum permittivity', symbol: 'eps0', value: '8.8541878128e-12 F/m' },
	{ id: 'mu0', name: 'Vacuum permeability', symbol: 'mu0', value: '1.25663706212e-6 N/A^2' },
	{ id: 'sigma', name: 'Stefan–Boltzmann constant', symbol: 'sigma', value: '5.670374419e-8 W/(m^2 K^4)' },
	{ id: 'u', name: 'Unified atomic mass unit', symbol: 'u', value: '1.66e-27 kg' },
	{ id: 'mn', name: 'Neutron mass', symbol: 'm_n', value: '1.67e-27 kg' },
	{ id: 'hc', name: 'Planck constant times speed of light', symbol: 'hc', value: '1.99e-25 J m' },
	{ id: 'ke', name: 'Coulomb constant', symbol: 'k', value: '9.0e9 N m^2/C^2' },
	{ id: 'atm', name: 'One atmosphere', symbol: 'atm', value: '1.0e5 Pa' },
	{ id: 'eV', name: 'Electron volt', symbol: 'eV', value: '1.60e-19 J' },
]

const KEY = 'math-physics-custom-constants-v1'
const listeners = new Set<() => void>()

function readCustom(): Constant[] {
	try {
		const raw = localStorage.getItem(KEY)
		const parsed = raw ? (JSON.parse(raw) as unknown) : []
		return Array.isArray(parsed) ? (parsed as Constant[]) : []
	} catch {
		return []
	}
}

let custom: Constant[] = readCustom()
let all: Constant[] = [...BUILTIN_CONSTANTS, ...custom]

function commit(next: Constant[]) {
	custom = next
	all = [...BUILTIN_CONSTANTS, ...custom]
	try {
		localStorage.setItem(KEY, JSON.stringify(custom))
	} catch {
		// Storage can be full or blocked. The constant still works for this session.
	}
	listeners.forEach((l) => l())
}

export const allConstants = (): Constant[] => all
export const findConstant = (id: string): Constant | undefined => all.find((c) => c.id === id)
export const isCustomConstant = (id: string) => custom.some((c) => c.id === id)

export function saveConstant(c: Constant) {
	commit([...custom.filter((x) => x.id !== c.id), c])
}

export function deleteConstant(id: string) {
	commit(custom.filter((x) => x.id !== id))
}

/** Re-renders when the constant list changes. */
export function useConstants(): Constant[] {
	return useSyncExternalStore(
		(l) => {
			listeners.add(l)
			return () => listeners.delete(l)
		},
		allConstants
	)
}

export type ConstantDraft = { name: string; symbol: string; value: string }

/** Checks what the user typed for a constant. The value must be a number with an optional unit. */
export function validateConstant(
	d: ConstantDraft,
	existingId?: string
): { ok: true; constant: Constant } | { ok: false; error: string } {
	if (!d.name.trim()) return { ok: false, error: 'Give the constant a name.' }
	if (!d.symbol.trim()) return { ok: false, error: 'Give it a symbol, such as G or k.' }
	if (!d.value.trim()) return { ok: false, error: 'Enter its value with a unit, e.g. 6.67e-11 m^3/(kg s^2).' }
	try {
		const v = math.evaluate(d.value.trim())
		const kind = math.typeOf(v)
		if (kind !== 'Unit' && kind !== 'number') throw new Error('not a value')
	} catch {
		return { ok: false, error: `"${d.value}" is not a value. Write a number and a unit, e.g. 9.8 m/s^2.` }
	}
	const id = existingId ?? `custom-${d.symbol.trim().replace(/[^A-Za-z0-9]+/g, '-')}-${Date.now().toString(36)}`
	return {
		ok: true,
		constant: { id, name: d.name.trim(), symbol: d.symbol.trim(), value: d.value.trim() },
	}
}

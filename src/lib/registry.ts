import { useSyncExternalStore } from 'react'
import { FORMULAS, type Formula } from './formulas'
import { AP_FORMULAS } from './apFormulas'

const BUILTIN_SECTION: Record<string, string> = {
	newton2: 'Mechanics',
	kinetic: 'Mechanics',
	potential: 'Mechanics',
	momentum: 'Mechanics',
	kinematics: 'Mechanics',
	ohm: 'Electricity & magnetism',
	'ideal-gas': 'Fluids & thermal',
	'circle-area': 'Geometry',
	pythagoras: 'Geometry',
}
const BUILTIN: Formula[] = FORMULAS.map((f) => ({ ...f, section: BUILTIN_SECTION[f.id] ?? 'Other' }))

/**
 * The formula list the app uses: the built-in formulas plus the ones the user made.
 * User formulas are saved in this browser's localStorage, so they are there after a reload.
 */
const KEY = 'math-physics-custom-formulas-v1'
const listeners = new Set<() => void>()

function readCustom(): Formula[] {
	try {
		const raw = localStorage.getItem(KEY)
		const parsed = raw ? (JSON.parse(raw) as unknown) : []
		return Array.isArray(parsed) ? (parsed as Formula[]) : []
	} catch {
		return []
	}
}

let custom: Formula[] = readCustom()
let all: Formula[] = [...BUILTIN, ...AP_FORMULAS, ...custom]

function commit(next: Formula[]) {
	custom = next
	all = [...BUILTIN, ...AP_FORMULAS, ...custom]
	try {
		localStorage.setItem(KEY, JSON.stringify(custom))
	} catch {
		// Storage can be full or blocked. The formula still works for this session.
	}
	listeners.forEach((l) => l())
}

export const allFormulas = (): Formula[] => all
export const findFormula = (id: string): Formula | undefined => all.find((f) => f.id === id)
export const isCustom = (id: string) => custom.some((f) => f.id === id)

/** Adds a new user formula, or replaces the one with the same id. */
export function saveFormula(f: Formula) {
	commit([...custom.filter((x) => x.id !== f.id), f])
}

export function deleteFormula(id: string) {
	commit(custom.filter((x) => x.id !== id))
}

/** Re-renders when the formula list changes. */
export function useFormulas(): Formula[] {
	return useSyncExternalStore(
		(l) => {
			listeners.add(l)
			return () => listeners.delete(l)
		},
		allFormulas
	)
}

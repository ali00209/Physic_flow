import { useSyncExternalStore } from 'react'
import type { NodeView } from './lib/graph'

/**
 * Each node's latest result. A node subscribes only to its own result, so a change elsewhere on the
 * canvas does not re-render it. A result that comes out the same as before keeps its old object.
 */
const views = new Map<string, NodeView>()
const listeners = new Map<string, Set<() => void>>()

export function publishViews(next: Record<string, NodeView>) {
	const changed: string[] = []
	for (const id of new Set([...views.keys(), ...Object.keys(next)])) {
		const n = next[id]
		const o = views.get(id)
		if (!n) {
			if (o) {
				views.delete(id)
				changed.push(id)
			}
			continue
		}
		if (o && JSON.stringify(o) === JSON.stringify(n)) continue
		views.set(id, n)
		changed.push(id)
	}
	for (const id of changed) listeners.get(id)?.forEach((notify) => notify())
}

/** The latest result of one node, re-rendering only when that result changes. */
export function useNodeView(id: string): NodeView | undefined {
	return useSyncExternalStore(
		(notify) => {
			let set = listeners.get(id)
			if (!set) {
				set = new Set()
				listeners.set(id, set)
			}
			set.add(notify)
			return () => {
				set!.delete(notify)
			}
		},
		() => views.get(id)
	)
}

import { createContext } from 'react'
import type { GraphResult } from './lib/graph'

/** The computed view of every node. Nodes read their own view from here, so they update live. */
export const ResultContext = createContext<GraphResult>({ views: {} })

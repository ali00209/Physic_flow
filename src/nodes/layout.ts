// Node geometry. Handles sit at these exact heights, so every wire lands on its row.
export const NODE_WIDTH = 300
export const HEADER_H = 40
export const ROW_H = 40
export const rowCenter = (i: number) => HEADER_H + i * ROW_H + ROW_H / 2

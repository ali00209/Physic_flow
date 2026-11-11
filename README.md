# Math & Physics Canvas (React Flow)

An infinite canvas for maths and physics, built on React Flow (`@xyflow/react`).

- **Calculation sheet:** statements with units, one per line or separated by `;`. Add input and output
  rows with "+ input" and "+ output", then name them. A named input takes its value from a wire; a
  named output sends its value down a wire.
- **Physics formula card:** choose a formula from the Physics formula menu. Each variable is an input
  handle on the left, and the solved value leaves on the output handle on the right. Plain numbers take
  the variable's default unit, so typing `5` into mass means 5 kg.
- **Wires:** drag from an output handle to an input handle. A wire that would make a loop is refused
  with a message. A new wire into an input replaces the old one.
- **Live:** every change recalculates the whole graph immediately. There is no Run step.

## Run
```bash
npm install
npm run dev
```
Open http://localhost:5173.

## Tests
```bash
npm test                          # unit tests: units, formulas, sheets, wiring rules
npx playwright install chromium   # once
npm run test:e2e                  # browser tests: loading, adding nodes, wires, live edits, loops
```
If Playwright's browser can't be installed, set `CHROMIUM_PATH` to a Chromium or Chrome you already have.

## Deploy

Pushes to `main` run the tests, build the site, and deploy it to GitHub Pages with
`.github/workflows/deploy.yml`. Pull requests run the same tests and build without deploying.

Enable Pages once under **Settings → Pages → Source: GitHub Actions**. The site is then served at
`https://<user>.github.io/<repo>/`.

## Layout
- `src/lib/`: the maths and the graph. Pure TypeScript, no React.
  - `graph.ts`: runs the graph in order and checks wires.
  - `evaluate.ts`: solves formulas and runs sheets.
  - `formulas.ts`: the physics formula library. Add formulas here.
- `src/nodes/`: the sheet and formula cards on the canvas.
- `src/App.tsx`: the canvas, which connects React Flow to the graph.

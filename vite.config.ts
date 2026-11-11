import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// GitHub Pages serves project sites from /<repo>/. User/org sites
// (<name>.github.io) and local dev are served from the root.
const repository = process.env.GITHUB_REPOSITORY?.split('/')[1]
const base =
	process.env.GITHUB_ACTIONS && repository && !repository.endsWith('.github.io')
		? `/${repository}/`
		: '/'

export default defineConfig({ base, plugins: [react()], server: { port: 5173 } })

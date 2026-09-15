import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { pageHtml } from './build/page-html'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), pageHtml()],
})

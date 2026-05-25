import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [
    react(),
    {
      // Electron loads index.html from file:// — Chromium blocks type="module" crossorigin
      // scripts from null-origin file:// even with webSecurity:false. Strip the attribute.
      name: 'remove-crossorigin',
      transformIndexHtml(html) {
        return html.replace(/\scrossorigin(?:="[^"]*")?/g, '');
      },
    },
  ],
  base: './',
})

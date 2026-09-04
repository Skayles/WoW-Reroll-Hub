import { resolve } from 'node:path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'
import type { Plugin } from 'vite'

/** Portraits de personnage servis par Blizzard, seule source d'images distante. */
const RENDER_HOSTS =
  'https://render.worldofwarcraft.com https://render-eu.worldofwarcraft.com https://render-us.worldofwarcraft.com https://render-kr.worldofwarcraft.com https://render-tw.worldofwarcraft.com'

/**
 * Injecte la CSP du renderer.
 *
 * En développement, Vite et React Refresh insèrent un script inline dans la
 * page : une politique `script-src 'self'` seule casserait le rechargement à
 * chaud. La production, elle, reste stricte.
 */
function cspPlugin(): Plugin {
  let dev = false
  return {
    name: 'reroll-hub-csp',
    configResolved(config) {
      dev = config.command === 'serve'
    },
    transformIndexHtml(html) {
      const policy = [
        "default-src 'self'",
        `script-src 'self'${dev ? " 'unsafe-inline'" : ''}`,
        "style-src 'self' 'unsafe-inline'",
        `img-src 'self' data: ${RENDER_HOSTS}`,
        `connect-src 'self'${dev ? ' ws://localhost:* http://localhost:*' : ''}`,
        "object-src 'none'",
        "base-uri 'none'",
        "form-action 'none'"
      ].join('; ')

      return {
        html,
        tags: [
          {
            tag: 'meta',
            attrs: { 'http-equiv': 'Content-Security-Policy', content: policy },
            injectTo: 'head-prepend'
          }
        ]
      }
    }
  }
}

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    resolve: {
      alias: { '@shared': resolve('src/shared') }
    },
    build: {
      rollupOptions: { input: { index: resolve('src/main/index.ts') } }
    }
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    resolve: {
      alias: { '@shared': resolve('src/shared') }
    },
    build: {
      rollupOptions: { input: { index: resolve('src/preload/index.ts') } }
    }
  },
  renderer: {
    root: resolve('src/renderer'),
    resolve: {
      alias: {
        '@shared': resolve('src/shared'),
        '@': resolve('src/renderer/src')
      }
    },
    plugins: [react(), cspPlugin()],
    build: {
      rollupOptions: { input: { index: resolve('src/renderer/index.html') } }
    }
  }
})

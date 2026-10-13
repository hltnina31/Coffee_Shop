import react from '@vitejs/plugin-react'
import process from 'node:process'
import { defineConfig, loadEnv } from 'vite'
import type { Plugin } from 'vite'
import { createReservationStore } from './server/database.ts'
import { handleReservationRequest } from './server/reservations.ts'

function localReservations(env: Record<string, string>): Plugin {
  const store = createReservationStore(env.DATABASE_URL ?? '')
  return {
    name: 'local-reservations',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (req.url?.split('?')[0] !== '/api/reservations') return next()
        res.setHeader('Cache-Control', 'no-store')
        res.setHeader('Content-Type', 'application/json')
        try {
          const chunks: Buffer[] = []
          let size = 0
          for await (const chunk of req) {
            const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
            size += bytes.length
            if (size > 4096) {
              res.statusCode = 413
              res.end(JSON.stringify({ error: { message: 'The request is too large.' } }))
              return
            }
            chunks.push(bytes)
          }
          const result = await handleReservationRequest({
            method: req.method, headers: req.headers, body: Buffer.concat(chunks).toString('utf8'),
          }, store, {
            enabled: env.RESERVATIONS_ENABLED === 'true',
            origin: env.ALLOWED_ORIGIN ?? '',
            hashSecret: env.RESERVATION_HASH_SECRET ?? '',
          })
          res.statusCode = result.status
          for (const [key, value] of Object.entries(result.headers ?? {})) res.setHeader(key, value)
          res.end(JSON.stringify(result.body))
        } catch {
          res.statusCode = 503
          res.end(JSON.stringify({ error: { message: 'We could not verify the save. Keep your details and retry the same request.' } }))
        }
      })
    },
  }
}

export default defineConfig(({ command, mode }) => {
  const fullstack = command === 'serve' && mode === 'fullstack'
  const plugins: Plugin[] = [...react()]
  if (fullstack) {
    // These values stay in the Vite server process; never expose them with define or VITE_.
    const env = loadEnv(mode, process.cwd(), ['DATABASE_URL', 'RESERVATION_HASH_SECRET', 'RESERVATIONS_ENABLED', 'ALLOWED_ORIGIN'])
    const testEnv = loadEnv('test', process.cwd(), 'TEST_DATABASE_URL')
    if (!env.DATABASE_URL || env.DATABASE_URL !== testEnv.TEST_DATABASE_URL) {
      throw new Error('Local fullstack mode requires DATABASE_URL to match the approved TEST_DATABASE_URL.')
    }
    if (env.ALLOWED_ORIGIN !== 'http://localhost:3000' || (env.RESERVATION_HASH_SECRET?.length ?? 0) < 32) {
      throw new Error('Set ALLOWED_ORIGIN to http://localhost:3000 and a reservation hash secret of at least 32 characters in .env.local.')
    }
    plugins.push(localReservations(env))
  }
  return { plugins, ...(fullstack ? { server: { host: 'localhost', port: 3000, strictPort: true } } : {}) }
})

import { Pool } from 'pg'

export type Backend = 'postgres' | 'sqlite'
export function databaseConfigurationError() {
  const value = process.env.DATABASE_URL?.trim()
  if (!value) return 'DATABASE_URL is not configured.'
  try {
    const url = new URL(value)
    if (url.protocol !== 'postgres:' && url.protocol !== 'postgresql:') return 'DATABASE_URL must use the postgres or postgresql scheme.'
    if (!url.hostname || !url.username) return 'DATABASE_URL is incomplete.'
  } catch {
    return 'DATABASE_URL is not a valid PostgreSQL connection URL.'
  }
  return null
}

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 5,
  idleTimeoutMillis: 10_000,
  connectionTimeoutMillis: 10_000,
  statement_timeout: 5_000,
  query_timeout: 7_000,
})

export async function query<T extends Record<string, unknown> = Record<string, unknown>>(text: string, values: unknown[] = []) {
  const result = await pool.query<T>(text, values)
  return result.rows
}

export async function health() {
  try { await pool.query('select 1'); return { connected: true, backend: 'postgres' as Backend } }
  catch { return { connected: false, backend: 'postgres' as Backend } }
}

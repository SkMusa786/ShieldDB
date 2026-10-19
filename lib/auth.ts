import { randomBytes } from 'node:crypto'
import { cookies } from 'next/headers'
import { query } from './db'
import type { Role } from './masking'
import { hashSessionToken } from './auth-crypto'

export const sessionCookie = 'shielddb_session'
const sessionDurationSeconds = 60 * 60 * 8

export type Session = { userId: string; email: string; name: string; role: Role }

export async function createSession(userId: string) {
  const token = randomBytes(32).toString('hex')
  await query('insert into sessions (user_id, token_hash, expires_at) values ($1, $2, now() + interval \'8 hours\')', [userId, hashSessionToken(token)])
  const store = await cookies()
  store.set(sessionCookie, token, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: sessionDurationSeconds })
}

export async function destroySession() {
  const store = await cookies()
  const token = store.get(sessionCookie)?.value
  if (token) await query('delete from sessions where token_hash = $1', [hashSessionToken(token)])
  store.delete(sessionCookie)
}

export async function getSession(): Promise<Session | null> {
  const token = (await cookies()).get(sessionCookie)?.value
  if (!token) return null
  const rows = await query<Session>(`select u.id::text as "userId", u.email, u.name, u.role
    from sessions s join users u on u.id = s.user_id
    where s.token_hash = $1 and s.expires_at > now() and u.disabled = false`, [hashSessionToken(token)])
  return rows[0] ?? null
}

export async function requireSession(roles?: Role[]) {
  const session = await getSession()
  if (!session) return { session: null, response: Response.json({ error: 'Authentication required.' }, { status: 401 }) }
  if (roles && !roles.includes(session.role)) return { session: null, response: Response.json({ error: 'You are not authorized for this action.' }, { status: 403 }) }
  return { session, response: null }
}

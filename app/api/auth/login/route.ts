import { NextResponse } from 'next/server'
import { createSession } from '@/lib/auth'
import { verifyPassword } from '@/lib/auth-crypto'
import { databaseConfigurationError, query } from '@/lib/db'
import type { Role } from '@/lib/masking'
import { writeAudit } from '@/lib/audit'

const roles: Role[] = ['Admin', 'Support Staff', 'Data Analyst']

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as { email?: unknown; password?: unknown; role?: unknown } | null
  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : ''
  const password = typeof body?.password === 'string' ? body.password : ''
  const requestedRole = typeof body?.role === 'string' && roles.includes(body.role as Role) ? body.role as Role : null
  if (!email || !password || !requestedRole || password.length > 1024) return NextResponse.json({ error: 'Enter a valid email, password, and account type.' }, { status: 400 })
  const configurationError = databaseConfigurationError()
  if (configurationError) {
    console.error(`Login service unavailable: ${configurationError}`)
    return NextResponse.json({ error: 'Authentication service is unavailable. Check the server database configuration.' }, { status: 503 })
  }
  try {
    const users = await query<{ id: string; email: string; password_hash: string; role: Role; name: string }>('select id::text, email, password_hash, role, name from users where lower(email) = $1 and disabled = false', [email])
    const user = users[0]
    const valid = user ? await verifyPassword(password, user.password_hash) : false
    if (!user || !valid || user.role !== requestedRole) {
      await writeAudit({ action: 'login_failed', actor: email.slice(0, 254), role: requestedRole, tableName: 'users', method: 'password', success: false })
      return NextResponse.json({ error: 'Invalid credentials or account type.' }, { status: 401 })
    }
    await createSession(user.id)
    await writeAudit({ action: 'login', actor: user.email, role: user.role, tableName: 'users', method: 'password' })
    return NextResponse.json({ user: { name: user.name, email: user.email, role: user.role } })
  } catch (error) {
    const detail = error instanceof Error ? error.message.replace(/postgres(?:ql)?:\/\/\S+/gi, 'DATABASE_URL') : 'unknown database error'
    console.error('Login service unavailable:', detail)
    return NextResponse.json({ error: 'Authentication service is unavailable. Check the server database configuration.' }, { status: 503 })
  }
}

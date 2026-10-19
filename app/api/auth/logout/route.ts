import { NextResponse } from 'next/server'
import { destroySession, getSession } from '@/lib/auth'
import { writeAudit } from '@/lib/audit'

export async function POST() {
  const session = await getSession()
  await destroySession()
  if (session) await writeAudit({ action: 'logout', actor: session.email, role: session.role, tableName: 'sessions', method: 'session' })
  return NextResponse.json({ ok: true })
}

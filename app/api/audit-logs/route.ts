import { NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth'
import { query } from '@/lib/db'
export async function GET() {
  const access = await requireSession(['Admin'])
  if (access.response) return access.response
  try { return NextResponse.json({ logs: await query('select id, created_at, action, actor, role, table_name, field, method, success from audit_logs order by created_at desc limit 100') }) }
  catch (error) { console.error('Unable to load audit logs', error); return NextResponse.json({ error: 'Unable to load audit logs.' }, { status: 503 }) }
}

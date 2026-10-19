import { NextResponse } from 'next/server'
import { getSession, requireSession } from '@/lib/auth'
import { writeAudit } from '@/lib/audit'
import { health, query } from '@/lib/db'
import { defaultPolicies, maskRecord, type MaskingMethod, type Role } from '@/lib/masking'
import { scanDatabase } from '@/lib/pii-scanner'

const roles: Role[] = ['Admin', 'Support Staff', 'Data Analyst']
const methods: MaskingMethod[] = ['full', 'partial', 'last4', 'hash', 'redact']
const approvedColumns = new Set(['id', 'name', 'email', 'phone', 'credit_card', 'account_balance', 'created_at'])

async function policiesFor(role: Role) {
  const rows = await query<Record<string, unknown>>('select role, name_policy, email_policy, phone_policy, credit_card_policy, account_balance_policy from masking_policies where role = $1', [role])
  const row = rows[0]
  if (!row) return defaultPolicies
  return { ...defaultPolicies, [role]: {
    name: row.name_policy as MaskingMethod, email: row.email_policy as MaskingMethod, phone: row.phone_policy as MaskingMethod,
    credit_card: row.credit_card_policy as MaskingMethod, account_balance: row.account_balance_policy as MaskingMethod,
  } }
}

export async function getHealth() { return NextResponse.json(await health()) }

export async function getDashboard() {
  const access = await requireSession()
  if (access.response) return access.response
  try {
    const [findings, countRows, policyRows, activity, queryRows] = await Promise.all([
      scanDatabase(),
      query<{ count: string }>('select count(*)::text as count from customers'),
      query<{ count: string }>('select count(*)::text as count from masking_policies'),
      query<Record<string, unknown>>('select id, created_at, action, actor, role, table_name, field, method, success from audit_logs order by created_at desc limit 5'),
      query<{ count: string }>(`select count(*)::text as count from audit_logs where action = 'query' and created_at >= current_date`),
    ])
    const categories = findings.reduce<Record<string, typeof findings>>((result, finding) => { (result[finding.category] ??= []).push(finding); return result }, {})
    return NextResponse.json({ connected: true, records: Number(countRows[0]?.count ?? 0), findings: findings.length, policies: Number(policyRows[0]?.count ?? 0), queriesProtectedToday: Number(queryRows[0]?.count ?? 0), categories, activity })
  } catch (error) {
    console.error('Unable to load dashboard', error)
    return NextResponse.json({ error: 'Unable to load dashboard metrics.' }, { status: 503 })
  }
}

export async function postScan() {
  const access = await requireSession(['Admin', 'Support Staff'])
  if (access.response) {
    const session = await getSession()
    if (session) await writeAudit({ action: 'authorization_denied', actor: session.email, role: session.role, tableName: 'customers', method: 'database_scan', success: false })
    return access.response
  }
  try {
    const findings = await scanDatabase()
    await writeAudit({ action: 'database_scan', actor: access.session.email, role: access.session.role, tableName: 'customers', method: 'column-name rule' })
    return NextResponse.json({ findings })
  } catch (error) {
    console.error('Unable to scan database', error)
    return NextResponse.json({ error: 'Unable to scan the connected database.' }, { status: 503 })
  }
}

export async function getPolicies() {
  const access = await requireSession(['Admin'])
  if (access.response) {
    const session = await getSession()
    if (session) await writeAudit({ action: 'authorization_denied', actor: session.email, role: session.role, tableName: 'masking_policies', method: 'read', success: false })
    return access.response
  }
  try {
    const rows = await query<Record<string, unknown>>('select id, role, name_policy, email_policy, phone_policy, credit_card_policy, account_balance_policy, created_at, updated_at from masking_policies order by id')
    return NextResponse.json({ policies: rows })
  } catch (error) {
    console.error('Unable to load policies', error)
    return NextResponse.json({ error: 'Policies table is unavailable.' }, { status: 503 })
  }
}

export async function putPolicies(request: Request) {
  const access = await requireSession(['Admin'])
  if (access.response) {
    const session = await getSession()
    if (session) await writeAudit({ action: 'authorization_denied', actor: session.email, role: session.role, tableName: 'masking_policies', method: 'update', success: false })
    return access.response
  }
  const body = await request.json().catch(() => null) as Record<string, unknown> | null
  const role = body?.role
  if (typeof role !== 'string' || !roles.includes(role as Role)) return NextResponse.json({ error: 'Invalid role.' }, { status: 400 })
  const fields = ['name_policy', 'email_policy', 'phone_policy', 'credit_card_policy', 'account_balance_policy']
  const values = fields.map(field => body?.[field])
  if (values.some(value => typeof value !== 'string' || !methods.includes(value as MaskingMethod))) return NextResponse.json({ error: 'Invalid masking method.' }, { status: 400 })
  try {
    const result = await query('update masking_policies set name_policy = $1, email_policy = $2, phone_policy = $3, credit_card_policy = $4, account_balance_policy = $5, updated_at = now() where role = $6', [...values, role])
    if (!result) return NextResponse.json({ error: 'Policy update failed.' }, { status: 503 })
    await writeAudit({ action: 'policy_change', actor: access.session.email, role: access.session.role, tableName: 'masking_policies', field: role, method: 'update' })
    return getPolicies()
  } catch (error) {
    console.error('Unable to update policy', error)
    return NextResponse.json({ error: 'Unable to update policy.' }, { status: 503 })
  }
}

export async function getCustomers() {
  const access = await requireSession()
  if (access.response) return access.response
  try {
    const [rows, policies] = await Promise.all([
      query<Record<string, unknown>>('select * from customers order by id limit 50'),
      policiesFor(access.session.role),
    ])
    await writeAudit({ action: 'masked_customer_read', actor: access.session.email, role: access.session.role, tableName: 'customers', method: 'role_policy' })
    return NextResponse.json({ role: access.session.role, records: rows.map(row => maskRecord(row, access.session.role, policies)) })
  } catch (error) {
    console.error('Unable to load customers', error)
    return NextResponse.json({ error: 'Unable to load customer records.' }, { status: 503 })
  }
}

export async function postQuery(request: Request) {
  const access = await requireSession()
  if (access.response) return access.response
  const body = await request.json().catch(() => null) as { table?: unknown; columns?: unknown } | null
  const table = body?.table
  const columns = Array.isArray(body?.columns) ? body.columns : []
  if (table !== 'customers' || !columns.length || columns.some(column => typeof column !== 'string' || !approvedColumns.has(column))) {
    await writeAudit({ action: 'query', actor: access.session.email, role: access.session.role, tableName: typeof table === 'string' ? table.slice(0, 63) : 'unknown', method: 'rejected_request', success: false })
    return NextResponse.json({ error: 'Choose an approved customer table and columns.' }, { status: 400 })
  }
  try {
    const selected = (columns as string[]).map(column => `"${column}"`).join(', ')
    const rows = await query<Record<string, unknown>>(`select ${selected} from customers limit 100`)
    const policies = await policiesFor(access.session.role)
    await writeAudit({ action: 'query', actor: access.session.email, role: access.session.role, tableName: 'customers', method: 'approved_columns' })
    return NextResponse.json({ rows: rows.map(row => maskRecord(row, access.session.role, policies)) })
  } catch (error) {
    console.error('Unable to execute approved query', error)
    return NextResponse.json({ error: 'Query could not be executed.' }, { status: 400 })
  }
}

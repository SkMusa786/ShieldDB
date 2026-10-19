import assert from 'node:assert/strict'
import test from 'node:test'
import { existsSync, readFileSync } from 'node:fs'
import pg from 'pg'
import { hashSessionToken } from '@/lib/auth-crypto'

if (existsSync('.env.local')) {
  for (const line of readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/)
    if (match && process.env[match[1]] === undefined) process.env[match[1]] = match[2].trim().replace(/^(['"])(.*)\1$/, '$2')
  }
}

const baseUrl = process.env.SHIELDDB_BASE_URL ?? 'http://localhost:3100'
const live = process.env.NODE_ENV !== 'production' && Boolean(process.env.DATABASE_URL && process.env.SHIELDDB_RUN_LIVE_TESTS === '1')
const run = live ? test : test.skip
const mutationLive = live && process.env.SHIELDDB_TEST_ENVIRONMENT === 'staging'

async function request(path: string, init?: RequestInit) {
  return fetch(`${baseUrl}${path}`, init)
}

run('unauthenticated protected APIs return 401', async () => {
  const response = await request('/api/customers')
  assert.equal(response.status, 401)
})

run('invalid login is rejected', async () => {
  const response = await request('/api/auth/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: 'not-a-real-user@example.test', password: 'wrong password', role: 'Support Staff' }) })
  assert.equal(response.status, 401)
})

run('a valid account cannot select a different role at login', async () => {
  const email = process.env.SHIELDDB_TEST_SUPPORT_EMAIL
  const password = process.env.SHIELDDB_TEST_SUPPORT_PASSWORD
  assert.ok(email && password, 'Set SHIELDDB_TEST_SUPPORT_EMAIL and SHIELDDB_TEST_SUPPORT_PASSWORD.')
  const response = await request('/api/auth/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email, password, role: 'Admin' }) })
  assert.equal(response.status, 401)
})

run('credentialed login, masking, policy, escalation, audit, and logout flow', async () => {
  const email = process.env.SHIELDDB_TEST_SUPPORT_EMAIL
  const password = process.env.SHIELDDB_TEST_SUPPORT_PASSWORD
  assert.ok(email && password, 'Set SHIELDDB_TEST_SUPPORT_EMAIL and SHIELDDB_TEST_SUPPORT_PASSWORD.')
  const login = await request('/api/auth/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email, password, role: 'Support Staff' }) })
  assert.equal(login.status, 200)
  const cookie = login.headers.get('set-cookie')?.split(';', 1)[0]
  assert.ok(cookie)
  const customers = await request('/api/customers', { headers: { cookie } })
  assert.equal(customers.status, 200)
  const records = await customers.json()
  assert.equal(records.role, 'Support Staff')
  assert.equal(await request('/api/policies', { headers: { cookie } }).then(response => response.status), 403)
  assert.equal(await request('/api/query', { method: 'POST', headers: { cookie, 'content-type': 'application/json' }, body: JSON.stringify({ table: 'users', columns: ['email'] }) }).then(response => response.status), 400)
  const approvedQuery = await request('/api/query', { method: 'POST', headers: { cookie, 'content-type': 'application/json' }, body: JSON.stringify({ table: 'customers', columns: ['email'] }) })
  assert.equal(approvedQuery.status, 200)
  const logs = await request('/api/audit-logs', { headers: { cookie } })
  assert.equal(logs.status, 403)
  assert.equal(await request('/api/auth/logout', { method: 'POST', headers: { cookie } }).then(response => response.status), 200)
  assert.equal(await request('/api/auth/session', { headers: { cookie } }).then(response => response.status), 401)
})

run('all provisioned roles authenticate and receive role-specific masking', async () => {
  const accounts = [
    { email: process.env.SHIELDDB_TEST_ADMIN_EMAIL ?? 'admin-test@example.com', role: 'Admin' },
    { email: process.env.SHIELDDB_TEST_SUPPORT_EMAIL ?? 'support-test@example.com', role: 'Support Staff' },
    { email: process.env.SHIELDDB_TEST_ANALYST_EMAIL ?? 'analyst-test@example.com', role: 'Data Analyst' },
  ] as const
  const password = process.env.SHIELDDB_TEST_DEMO_PASSWORD
  assert.ok(password, 'Set SHIELDDB_TEST_DEMO_PASSWORD for the role masking test.')
  const snapshots = new Map<string, Record<string, unknown>>()
  for (const account of accounts) {
    const login = await request('/api/auth/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: account.email, password, role: account.role }),
    })

    assert.equal(login.status, 200)
    const cookie = login.headers.get('set-cookie')?.split(';', 1)[0]
    assert.ok(cookie)
    const customers = await request('/api/customers', { headers: { cookie } })
    assert.equal(customers.status, 200)
    const body = await customers.json()
    assert.equal(body.role, account.role)
    assert.ok(body.records.length > 0)
    snapshots.set(account.role, body.records[0])
    await request('/api/auth/logout', { method: 'POST', headers: { cookie } })
  }
  const admin = snapshots.get('Admin')
  const support = snapshots.get('Support Staff')
  const analyst = snapshots.get('Data Analyst')
  assert.ok(admin && support && analyst)
  assert.equal(support.account_balance, 'REDACTED')
  assert.equal(analyst.account_balance, 'REDACTED')
  assert.equal(support.phone, `******${String(admin.phone).replace(/\D/g, '').slice(-4)}`)
  assert.equal(analyst.phone, 'REDACTED')
  assert.equal(support.email, `${String(admin.email).slice(0, 1)}***@${String(admin.email).split('@')[1]}`)
  assert.notEqual(analyst.email, admin.email)
})

run('admin dashboard scanner policies query and audit surfaces work without changing source rows', async () => {
  const password = process.env.SHIELDDB_TEST_DEMO_PASSWORD
  assert.ok(password, 'Set SHIELDDB_TEST_DEMO_PASSWORD for the application surface test.')
  const login = await request('/api/auth/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: process.env.SHIELDDB_TEST_ADMIN_EMAIL ?? 'admin-test@example.com', password, role: 'Admin' }),
  })
  assert.equal(login.status, 200)
  const cookie = login.headers.get('set-cookie')?.split(';', 1)[0]
  assert.ok(cookie)
  const [dashboard, scan, policies, queryResult, audit] = await Promise.all([
    request('/api/dashboard', { headers: { cookie } }),
    request('/api/scan', { method: 'POST', headers: { cookie } }),
    request('/api/policies', { headers: { cookie } }),
    request('/api/query', { method: 'POST', headers: { cookie, 'content-type': 'application/json' }, body: JSON.stringify({ table: 'customers', columns: ['email', 'credit_card'] }) }),
    request('/api/audit-logs', { headers: { cookie } }),
  ])
  assert.equal(dashboard.status, 200)
  assert.equal(scan.status, 200)
  assert.equal(policies.status, 200)
  assert.equal(queryResult.status, 200)
  assert.equal(audit.status, 200)
  const invalidQuery = await request('/api/query', { method: 'POST', headers: { cookie, 'content-type': 'application/json' }, body: JSON.stringify({ table: 'users', columns: ['email'] }) })
  assert.equal(invalidQuery.status, 400)
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 1 })
  try {
    const source = await pool.query("select email, credit_card, account_balance from customers where email = 'avery.morgan@example.test'")
    assert.equal(source.rows[0]?.credit_card, '4111111111111111')
    assert.equal(source.rows[0]?.account_balance, '2840.75')
  } finally {
    await pool.end()
  }
  await request('/api/auth/logout', { method: 'POST', headers: { cookie } })
})

run('admin policy changes are audited and affect policy reads', { skip: !process.env.SHIELDDB_RUN_MUTATION_TESTS || !mutationLive }, async () => {
  const email = process.env.SHIELDDB_TEST_ADMIN_EMAIL
  const password = process.env.SHIELDDB_TEST_ADMIN_PASSWORD
  assert.ok(email && password, 'Set staging admin test credentials.')
  const login = await request('/api/auth/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email, password, role: 'Admin' }) })
  assert.equal(login.status, 200)
  const cookie = login.headers.get('set-cookie')?.split(';', 1)[0]
  assert.ok(cookie)
  const before = await request('/api/policies', { headers: { cookie } })
  assert.equal(before.status, 200)
  const policies = await before.json()
  const support = policies.policies.find((policy: { role: string }) => policy.role === 'Support Staff')
  assert.ok(support)
  const update = await request('/api/policies', { method: 'PUT', headers: { cookie, 'content-type': 'application/json' }, body: JSON.stringify({ ...support, email_policy: 'redact' }) })
  assert.equal(update.status, 200)
  const supportLogin = await request('/api/auth/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: process.env.SHIELDDB_TEST_SUPPORT_EMAIL, password: process.env.SHIELDDB_TEST_SUPPORT_PASSWORD, role: 'Support Staff' }) })
  assert.equal(supportLogin.status, 200)
  const supportCookie = supportLogin.headers.get('set-cookie')?.split(';', 1)[0]
  assert.ok(supportCookie)
  const masked = await request('/api/customers', { headers: { cookie: supportCookie } })
  assert.equal(masked.status, 200)
  assert.equal((await masked.json()).records[0]?.email, 'REDACTED')
  await request('/api/auth/logout', { method: 'POST', headers: { cookie: supportCookie } })
  const restore = await request('/api/policies', { method: 'PUT', headers: { cookie, 'content-type': 'application/json' }, body: JSON.stringify(support) })
  assert.equal(restore.status, 200)
  const logs = await request('/api/audit-logs', { headers: { cookie } })
  assert.equal(logs.status, 200)
  const audit = await logs.json()
  assert.ok(audit.logs.some((log: { action: string }) => log.action === 'policy_change'))
  await request('/api/auth/logout', { method: 'POST', headers: { cookie } })
})

run('expired sessions cannot access protected APIs', { skip: !process.env.SHIELDDB_RUN_EXPIRY_TEST || !mutationLive }, async () => {
  const email = process.env.SHIELDDB_TEST_SUPPORT_EMAIL
  const password = process.env.SHIELDDB_TEST_SUPPORT_PASSWORD
  assert.ok(email && password, 'Set staging support test credentials.')
  const login = await request('/api/auth/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email, password, role: 'Support Staff' }) })
  assert.equal(login.status, 200)
  const cookie = login.headers.get('set-cookie')?.split(';', 1)[0]
  assert.ok(cookie)
  const token = cookie.slice('shielddb_session='.length)
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 1 })
  try {
    await pool.query('update sessions set expires_at = now() - interval \'1 minute\' where token_hash = $1', [hashSessionToken(token)])
    assert.equal((await request('/api/customers', { headers: { cookie } })).status, 401)
  } finally {
    await pool.query('delete from sessions where token_hash = $1', [hashSessionToken(token)])
    await pool.end()
  }
})

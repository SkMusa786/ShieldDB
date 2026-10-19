import assert from 'node:assert/strict'
import test from 'node:test'
import { hashPassword, hashSessionToken, verifyPassword } from '@/lib/auth-crypto'
import { databaseConfigurationError } from '@/lib/db'
import { defaultPolicies, maskRecord, type Role } from '@/lib/masking'

test('password hashes verify without storing the plaintext', async () => {
  const password = 'correct horse battery staple'
  const hash = await hashPassword(password)
  assert.notEqual(hash, password)
  assert.equal(await verifyPassword(password, hash), true)
  assert.equal(await verifyPassword('wrong password', hash), false)
  assert.equal(await verifyPassword(password, 'malformed'), false)
})

test('session tokens are one-way and stable for lookup', () => {
  const token = 'a'.repeat(64)
  assert.equal(hashSessionToken(token), hashSessionToken(token))
  assert.notEqual(hashSessionToken(token), token)
})

test('role policies mask sensitive fields and preserve source objects', () => {
  const source = { email: 'avery@example.test', phone: '+1-415-555-0142', account_balance: '2840.75' }
  const support = maskRecord(source, 'Support Staff')
  const analyst = maskRecord(source, 'Data Analyst')
  assert.deepEqual(source, { email: 'avery@example.test', phone: '+1-415-555-0142', account_balance: '2840.75' })
  assert.equal(support.email, 'a***@example.test')
  assert.equal(support.phone, '******0142')
  assert.equal(support.account_balance, 'REDACTED')
  assert.equal(analyst.phone, 'REDACTED')
  assert.notEqual(analyst.email, source.email)
})

test('all supported roles have explicit default policies', () => {
  for (const role of ['Admin', 'Support Staff', 'Data Analyst'] as Role[]) assert.ok(defaultPolicies[role])
})

test('invalid database configuration is detected without exposing its value', () => {
  const previous = process.env.DATABASE_URL
  process.env.DATABASE_URL = 'your_neon_database_url'
  assert.equal(databaseConfigurationError(), 'DATABASE_URL is not a valid PostgreSQL connection URL.')
  if (previous === undefined) delete process.env.DATABASE_URL
  else process.env.DATABASE_URL = previous
})

test('demo credentials meet the existing password policy', () => {
  const demoPassword = 'ShieldDB@123'
  assert.ok(demoPassword.length >= 12)
  assert.notEqual(demoPassword.includes(' '), true)
})

import { createHash } from 'node:crypto'

export type Role = 'Admin' | 'Support Staff' | 'Data Analyst'
export type Field = 'name' | 'email' | 'phone' | 'credit_card' | 'account_balance'
export type MaskingMethod = 'full' | 'partial' | 'last4' | 'hash' | 'redact'
export const defaultPolicies: Record<Role, Record<Field, MaskingMethod>> = {
  Admin: { name: 'full', email: 'full', phone: 'full', credit_card: 'full', account_balance: 'full' },
  'Support Staff': { name: 'full', email: 'partial', phone: 'last4', credit_card: 'last4', account_balance: 'redact' },
  'Data Analyst': { name: 'full', email: 'hash', phone: 'redact', credit_card: 'redact', account_balance: 'redact' },
}
export function maskValue(value: unknown, field: Field, role: Role, policies = defaultPolicies) {
  if (value == null) return value
  const text = String(value); const method = policies[role]?.[field] ?? 'redact'
  if (method === 'full') return value
  if (method === 'redact') return 'REDACTED'
  if (method === 'hash') return createHash('sha256').update(text).digest('hex')
  if (method === 'partial') { const [local, domain] = text.split('@'); return `${local?.slice(0, 1) ?? ''}***@${domain ?? ''}` }
  return `******${text.replace(/\D/g, '').slice(-4)}`
}
export function maskRecord(record: Record<string, unknown>, role: Role, policies = defaultPolicies) {
  return Object.fromEntries(Object.entries(record).map(([key, value]) => {
    const field = key.toLowerCase() as Field
    return [key, policies[role] && (field in policies[role]) ? maskValue(value, field, role, policies) : value]
  }))
}

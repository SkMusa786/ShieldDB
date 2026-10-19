import { query } from './db'
import type { Role } from './masking'

export async function writeAudit(input: { action: string; actor: string; role: Role; tableName: string; field?: string; method: string; success?: boolean }) {
  try {
    await query(
      'insert into audit_logs (action, actor, role, table_name, field, method, success) values ($1, $2, $3, $4, $5, $6, $7)',
      [input.action, input.actor, input.role, input.tableName, input.field ?? null, input.method, input.success ?? true],
    )
  } catch (error) {
    console.error('Unable to write audit log', error)
  }
}

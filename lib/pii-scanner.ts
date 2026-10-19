import { query } from './db'
export type Finding = { table: string; column: string; category: string; method: string; score: number }
const rules: Array<[RegExp, string]> = [[/email|e_mail/i, 'Email'], [/phone|mobile|tel/i, 'Phone'], [/card|credit/i, 'Credit card'], [/ssn|social_security/i, 'SSN'], [/balance|salary|amount|payment/i, 'Financial']]
export async function scanDatabase(): Promise<Finding[]> {
  const columns = await query<{ table_name: string; column_name: string }>(`select table_name, column_name from information_schema.columns where table_schema = 'public' and table_name in ('customers') order by table_name, ordinal_position`)
  return columns.flatMap(({ table_name, column_name }) => { const match = rules.find(([rule]) => rule.test(column_name)); return match ? [{ table: table_name, column: column_name, category: match[1], method: 'column-name rule', score: 0.9 }] : [] })
}

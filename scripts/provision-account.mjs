import { randomBytes, scrypt as nodeScrypt } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import { promisify } from 'node:util'
import { stdin, stdout } from 'node:process'
import pg from 'pg'

const scrypt = promisify(nodeScrypt)
const roles = new Set(['Admin', 'Support Staff', 'Data Analyst'])
const demoPassword = 'ShieldDB@123'
const demoAccounts = [
  { email: 'admin-test@example.com', name: 'ShieldDB Admin Test', role: 'Admin' },
  { email: 'support-test@example.com', name: 'ShieldDB Support Test', role: 'Support Staff' },
  { email: 'analyst-test@example.com', name: 'ShieldDB Analyst Test', role: 'Data Analyst' },
]

function loadLocalEnvironment() {
  if (!existsSync('.env.local')) return
  for (const line of readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/)
    if (!match || process.env[match[1]] !== undefined) continue
    process.env[match[1]] = match[2].trim().replace(/^(['"])(.*)\1$/, '$2')
  }
}

function usage() {
  console.error('Usage: npm run provision:account -- --email user@example.com --name "Test User" --role "Support Staff"')
  console.error('Demo accounts: npm run provision:demo')
  console.error('Set SHIELDDB_ALLOW_PROVISIONING=1 explicitly before running an administrative command.')
}

function argument(name) {
  const index = process.argv.indexOf(name)
  return index >= 0 ? process.argv[index + 1] : ''
}

function readHidden(prompt) {
  if (!stdin.isTTY || typeof stdin.setRawMode !== 'function') {
    return Promise.reject(new Error('Password input must be interactive; do not pass passwords as command-line arguments.'))
  }
  stdout.write(prompt)
  stdin.setRawMode(true)
  stdin.resume()
  return new Promise((resolve, reject) => {
    let value = ''
    let settled = false
    const cleanup = () => {
      stdin.removeListener('data', onData)
      stdin.removeListener('error', onError)
      if (stdin.isRaw) stdin.setRawMode(false)
      stdin.pause()
    }
    const finish = (callback, result) => {
      if (settled) return
      settled = true
      cleanup()
      stdout.write('\n')
      callback(result)
    }
    const onError = error => finish(reject, new Error(`Password input failed: ${error instanceof Error ? error.message : 'terminal error'}`))
    const onData = chunk => {
      for (const character of chunk.toString()) {
        if (character === '\u0003') return finish(reject, new Error('Password entry cancelled.'))
        if (character === '\r' || character === '\n') return finish(resolve, value)
        if (character === '\u007f' || character === '\b') value = value.slice(0, -1)
        else value += character
      }
    }
    stdin.on('data', onData)
    stdin.once('error', onError)
  })
}

async function hashPassword(password) {
  const salt = randomBytes(16).toString('hex')
  const derived = await scrypt(password, salt, 64)
  return `${salt}:${derived.toString('hex')}`
}

async function provisionUsers(users) {
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 1 })
  try {
    await pool.query('begin')
    for (const user of users) {
      const passwordHash = await hashPassword(user.password)
      await pool.query(`insert into users (email, name, password_hash, role, disabled)
        values ($1, $2, $3, $4, false)
        on conflict (email) do update set name = excluded.name, password_hash = excluded.password_hash,
          role = excluded.role, disabled = false`, [user.email, user.name, passwordHash, user.role])
    }
    await pool.query('commit')
  } catch (error) {
    await pool.query('rollback').catch(() => {})
    throw error
  } finally {
    await pool.end()
  }
}

async function main() {
  loadLocalEnvironment()
  if (process.env.SHIELDDB_ALLOW_PROVISIONING !== '1') throw new Error('Refusing to provision accounts without SHIELDDB_ALLOW_PROVISIONING=1.')
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required.')
  if (process.env.NODE_ENV === 'production') throw new Error('Demo provisioning is disabled when NODE_ENV=production.')

  if (process.argv.includes('--demo')) {
    await provisionUsers(demoAccounts.map(account => ({ ...account, password: demoPassword })))
    console.log('Provisioned the three ShieldDB demonstration accounts with salted password hashes.')
    return
  }

  const email = argument('--email').trim().toLowerCase()
  const name = argument('--name').trim()
  const role = argument('--role').trim()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !name || !roles.has(role)) {
    usage()
    process.exitCode = 2
    return
  }
  const password = await readHidden('Password (not stored in plaintext): ')
  if (password.length < 12 || password.length > 1024) throw new Error('Password must be between 12 and 1024 characters.')
  const confirm = await readHidden('Confirm password: ')
  if (password !== confirm) throw new Error('Passwords do not match.')
  await provisionUsers([{ email, name, role, password }])
  console.log(`Provisioned ${role} account ${email}.`)
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : 'Account provisioning failed.')
  process.exitCode = 1
})

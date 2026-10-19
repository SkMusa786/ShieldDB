import { createHash, randomBytes, scrypt as nodeScrypt, timingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'

const scrypt = promisify(nodeScrypt)

export function hashSessionToken(token: string) {
  return createHash('sha256').update(token).digest('hex')
}

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString('hex')
  const derived = await scrypt(password, salt, 64) as Buffer
  return `${salt}:${derived.toString('hex')}`
}

export async function verifyPassword(password: string, stored: string) {
  const [salt, encoded] = stored.split(':')
  if (!salt || !encoded || !/^[0-9a-f]+$/i.test(encoded) || encoded.length % 2 !== 0) return false
  try {
    const expected = Buffer.from(encoded, 'hex')
    const actual = await scrypt(password, salt, expected.length) as Buffer
    return expected.length > 0 && expected.length === actual.length && timingSafeEqual(expected, actual)
  } catch {
    return false
  }
}

'use client'

import { FormEvent, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Brand } from './page'
import type { Role } from '@/lib/masking'

export default function LoginForm({ role }: { role: Role }) {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  async function submit(event: FormEvent) {
    event.preventDefault(); setError(''); setLoading(true)
    try {
      const response = await fetch('/api/auth/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email, password, role }) })
      const body = await response.json().catch(() => ({ error: 'Authentication service returned an invalid response.' }))
      if (!response.ok) throw new Error(body.error || 'Unable to sign in.')
      router.replace('/')
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to sign in.') } finally { setLoading(false) }
  }
  return <main className="flex min-h-screen items-center justify-center bg-[#f7f9fc] p-6"><div className="w-full max-w-md"><Brand /><div className="mt-10 rounded-2xl border border-[#e5eaf1] bg-white p-7 shadow-sm"><Link href="/login" className="text-sm font-semibold text-[#0d9aaa]">← All account types</Link><h1 className="mt-6 font-display text-2xl font-bold text-[#142033]">{role} sign in</h1><p className="mt-2 text-sm text-[#728096]">Use your authorized ShieldDB credentials.</p><form onSubmit={submit} className="mt-7 space-y-4"><label className="block text-sm font-semibold text-[#142033]">Work email<input required type="email" autoComplete="email" value={email} onChange={event => setEmail(event.target.value)} className="mt-2 w-full rounded-xl border border-[#e5eaf1] bg-[#f7f9fc] px-4 py-3 font-normal outline-none focus:border-[#18b8c8]" /></label><label className="block text-sm font-semibold text-[#142033]">Password<input required type="password" autoComplete="current-password" value={password} onChange={event => setPassword(event.target.value)} className="mt-2 w-full rounded-xl border border-[#e5eaf1] bg-[#f7f9fc] px-4 py-3 font-normal outline-none focus:border-[#18b8c8]" /></label>{error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}<button disabled={loading} className="w-full rounded-xl bg-[#142033] px-4 py-3 font-semibold text-white disabled:opacity-60">{loading ? 'Signing in…' : 'Sign in securely'}</button></form></div></div></main>
}

import Link from 'next/link'
import { ShieldCheck } from 'lucide-react'

const accounts = [
  ['admin', 'Admin', 'Full visibility and policy administration'],
  ['support', 'Support Staff', 'Customer support with protected contact data'],
  ['analyst', 'Data Analyst', 'Analytics access with privacy-first masking'],
] as const

export default function LoginSelection() {
  return <main className="flex min-h-screen items-center justify-center bg-[#f7f9fc] p-6"><div className="w-full max-w-3xl"><Brand /><h1 className="mt-10 text-center font-display text-3xl font-bold text-[#142033]">Choose your workspace</h1><p className="mt-2 text-center text-[#728096]">Sign in with the account assigned to you.</p><div className="mt-8 grid gap-4 md:grid-cols-3">{accounts.map(([path, role, description]) => <Link key={path} href={`/login/${path}`} className="rounded-2xl border border-[#e5eaf1] bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-[#18b8c8]"><div className="font-display text-lg font-bold text-[#142033]">{role}</div><p className="mt-2 text-sm leading-6 text-[#728096]">{description}</p><span className="mt-5 block text-sm font-semibold text-[#0d9aaa]">Continue securely →</span></Link>)}</div></div></main>
}

export function Brand() {
  return <div className="flex items-center justify-center gap-3"><div className="flex size-10 items-center justify-center rounded-xl bg-[#18b8c8] text-white"><ShieldCheck size={22} /></div><span className="font-display text-2xl font-bold text-[#142033]">Shield<span className="text-[#18b8c8]">DB</span></span></div>
}

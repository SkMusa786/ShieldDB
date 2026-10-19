import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = { title: 'ShieldDB — Smart Data Masking', description: 'PII protection and dynamic data masking workspace' }
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en"><body>{children}</body></html> }

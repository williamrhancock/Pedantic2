import './globals.css'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { TrpcProvider } from '@/lib/trpc-provider'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Visual Agentic Workflow Builder',
  description: 'A local-first visual workflow builder for agentic processes',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <TrpcProvider>
          {children}
        </TrpcProvider>
      </body>
    </html>
  )
}
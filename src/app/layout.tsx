import './globals.css'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { TrpcProvider } from '@/lib/trpc-provider'
import { ThemeProvider } from '@/contexts/ThemeContext'

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
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider>
          <TrpcProvider>
            {children}
          </TrpcProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
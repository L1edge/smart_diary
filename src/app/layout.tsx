import type { Metadata } from 'next'
import { Space_Grotesk } from 'next/font/google'
import '../globals.css'

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-space-grotesk',
})

export const metadata: Metadata = {
  title: 'Smart Diary',
  description: 'Dark futuristic journal experience',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning className={spaceGrotesk.variable}>
      <body className="min-h-screen bg-[#000000] font-sans">{children}</body>
    </html>
  )
}
import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'RevOverflow — Meet Yara, Your AI Revenue Manager',
  description: 'Connect Square, Clover, or Toast and tell Yara your revenue goal. She finds the opportunities, brings customers back, runs the promotions, and proves every dollar she generates — for less than the cost of one employee.',
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://revoverflow.com'),
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Inter:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased">
        {children}
      </body>
    </html>
  )
}

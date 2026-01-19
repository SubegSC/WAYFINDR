export const metadata = {
  title: 'WAYFINDR',
  description: 'Intelligent navigation for accessible routes across campus',
  icons: {
    icon: '/logo.webp',
    apple: '/logo.webp',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}

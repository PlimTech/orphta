import type { Metadata } from "next"
import localFont from "next/font/local"
import dynamic from "next/dynamic"
import "./globals.css"

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
})
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
})

export const metadata: Metadata = {
  title: "Orphta — Fábrica de softwares para builders",
  description:
    "Orphta cria produtos digitais premium com estratégia, design e engenharia integrados para empresas que precisam acelerar software.",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  // Load the WebGL background client-side only so it's shared across pages
  const WebGLShader = dynamic(
    () => import("@/components/ui/web-gl-shader").then((m) => m.WebGLShader),
    { ssr: false },
  )
  return (
    <html lang="pt-BR" className="dark" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} min-h-screen antialiased`}>
        <div className="relative min-h-screen">
          {/* Global rainbow shader background with a gradient fallback to prevent dark flash on SSR */}
          <div className="pointer-events-none fixed inset-0 -z-10">
            <div className="absolute inset-0 bg-gradient-to-b from-zinc-900 via-zinc-950 to-black" />
            <div className="absolute inset-0 mix-blend-screen opacity-60">
              <WebGLShader />
            </div>
          </div>
          {children}
        </div>
      </body>
    </html>
  )
}

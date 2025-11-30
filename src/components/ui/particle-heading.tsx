"use client"

import { useEffect, useRef, useState } from "react"
import { TextParticle } from "@/components/ui/text-particle"

type Props = {
  text: string
  className?: string
  // font size used by the canvas sampling
  fontSize?: number
  colorHex?: string
}

export function ParticleHeading({
  text,
  className,
  fontSize = 80,
  colorHex = "#ffffff",
}: Props) {
  const wrapperRef = useRef<HTMLDivElement>(null)
  const [computed, setComputed] = useState(fontSize)
  const [preferStatic, setPreferStatic] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    if (typeof window === "undefined") return
    const reduceMq = window.matchMedia("(prefers-reduced-motion: reduce)")
    const mobileMq = window.matchMedia("(max-width: 768px)")
    const update = () => {
      const mobile = mobileMq.matches
      setIsMobile(mobile)
      setPreferStatic(mobile || reduceMq.matches)
    }
    update()
    reduceMq.addEventListener("change", update)
    mobileMq.addEventListener("change", update)
    return () => {
      reduceMq.removeEventListener("change", update)
      mobileMq.removeEventListener("change", update)
    }
  }, [])

  useEffect(() => {
    const el = wrapperRef.current
    if (!el) return
    const ro = new ResizeObserver(() => {
      const w = el.clientWidth
      // clamp heading size by width; smaller baseline for mobile to avoid overflow
      const minSize = isMobile ? 32 : 48
      const maxSize = isMobile ? 64 : 96
      const divisor = isMobile ? 10 : 8
      const next = Math.max(minSize, Math.min(maxSize, Math.floor(w / divisor)))
      setComputed(next)
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [isMobile])

  const height = Math.round(computed * 1.1)

  if (preferStatic) {
    return (
      <div
        ref={wrapperRef}
        className={["relative w-full", className].filter(Boolean).join(" ")}
      >
        <h2 className="text-3xl font-semibold leading-tight text-white sm:text-4xl md:text-5xl">
          {text}
        </h2>
      </div>
    )
  }

  return (
    <div
      ref={wrapperRef}
      className={["relative w-full", className].filter(Boolean).join(" ")}
      style={{ height }}
    >
      <TextParticle
        text={text}
        fontSize={computed}
        particleColor={colorHex}
        particleSize={1}
        particleDensity={7}
        className="absolute inset-0 mix-blend-screen"
        fontFamily="Inter, system-ui, sans-serif"
      />
      {/* Semantic heading for SEO/accessibility */}
      <h2 className="sr-only">{text}</h2>
    </div>
  )
}

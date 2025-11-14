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

  useEffect(() => {
    const el = wrapperRef.current
    if (!el) return
    const ro = new ResizeObserver(() => {
      const w = el.clientWidth
      // clamp heading size by width (mobile friendly)
      const next = Math.max(48, Math.min(96, Math.floor(w / 8)))
      setComputed(next)
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const height = Math.round(computed * 1.1)

  return (
    <div ref={wrapperRef} className={["relative w-full", className].filter(Boolean).join(" ")} style={{ height }}> 
      <TextParticle
        text={text}
        fontSize={computed}
        particleColor={colorHex}
        particleSize={1}
        particleDensity={5}
        className="absolute inset-0 mix-blend-screen"
        fontFamily="Inter, system-ui, sans-serif"
      />
      {/* Semantic heading for SEO/accessibility */}
      <h2 className="sr-only">{text}</h2>
    </div>
  )
}

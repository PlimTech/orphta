"use client"

import {
  createElement,
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"

export enum Tag {
  H1 = "h1",
  H2 = "h2",
  H3 = "h3",
  P = "p",
}

type FontOptions = {
  fontFamily?: string
  fontSize?: string
  fontWeight?: number | string
  letterSpacing?: string
  lineHeight?: string
}

type AnimationOptions = {
  vaporizeDuration?: number
  fadeInDuration?: number
  waitDuration?: number
}

type Direction = "left-to-right" | "right-to-left"

type Alignment = "left" | "center" | "right"

export interface VaporizeTextCycleProps {
  texts: string[]
  font?: FontOptions
  color?: string
  spread?: number
  density?: number
  animation?: AnimationOptions
  direction?: Direction
  alignment?: Alignment
  tag?: Tag
  className?: string
}

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  progress: number
  alpha: number
}

const defaultAnimation: Required<AnimationOptions> = {
  vaporizeDuration: 2,
  fadeInDuration: 1,
  waitDuration: 0.8,
}

const defaultFont: Required<Omit<FontOptions, "letterSpacing" | "lineHeight">> & {
  letterSpacing: string
  lineHeight: string
} = {
  fontFamily: "Inter, sans-serif",
  fontSize: "48px",
  fontWeight: 600,
  letterSpacing: "0.02em",
  lineHeight: "1.05",
}

const alignmentMap: Record<Alignment, string> = {
  left: "items-start text-left",
  center: "items-center text-center",
  right: "items-end text-right",
}

const directionFactor: Record<Direction, number> = {
  "left-to-right": 1,
  "right-to-left": -1,
}

const VaporText = memo(({ text, TagComponent, color }: { text: string; TagComponent: Tag; color?: string }) => {
  return createElement(
    TagComponent,
    {
      className:
        "relative z-10 inline-flex w-full flex-col overflow-hidden uppercase tracking-tight",
      style: {
        color,
        textShadow: "0 10px 40px rgba(255,255,255,0.35)",
      },
    },
    <span aria-hidden className="pointer-events-none select-none">
      {text}
    </span>,
  )
})
VaporText.displayName = "VaporText"

export default function VaporizeTextCycle({
  texts,
  font,
  color = "rgb(255,255,255)",
  spread = 5,
  density = 4,
  animation,
  direction = "left-to-right",
  alignment = "left",
  tag = Tag.H2,
  className,
}: VaporizeTextCycleProps) {
  // Stabilize texts array across parent re-renders.
  const textsKey = useMemo(() => JSON.stringify(texts ?? []), [texts])
  const textList = useMemo(() => {
    try {
      const arr = JSON.parse(textsKey) as string[]
      return Array.isArray(arr) && arr.length ? arr : ["Orphta"]
    } catch {
      return texts && texts.length ? [...texts] : ["Orphta"]
    }
  }, [textsKey])
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [prevIndex, setPrevIndex] = useState(0)
  const [phase, setPhase] = useState<"vapor" | "fade" | "hold">("hold")
  const [vaporProgress, setVaporProgress] = useState(0) // 0..1 erasing previous text
  const [fadeProgress, setFadeProgress] = useState(1) // 0..1 fading in current text
  const rafRef = useRef<number | null>(null)
  const animationTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const settings = { ...defaultAnimation, ...animation }
  const typography = { ...defaultFont, ...font }
  const TagComponent = tag
  const particlesRef = useRef<Particle[]>([])
  const animationFrameRef = useRef<number | null>(null)
  const isVisibleRef = useRef(true)
  const [isVisible, setIsVisible] = useState(true)

  useEffect(() => {
    isVisibleRef.current = isVisible
  }, [isVisible])

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          // Keep animating unless the element is far off-screen
          setIsVisible(entry.isIntersecting || entry.intersectionRatio > 0)
        })
      },
      // Generous rootMargin avoids frequent pause/resume when near viewport edges
      { threshold: 0, rootMargin: "200px 0px 200px 0px" },
    )

    if (containerRef.current) observer.observe(containerRef.current)

    return () => {
      observer.disconnect()
    }
  }, [])

  const spawnParticle = useCallback(
    (canvas: HTMLCanvasElement): Particle => {
      const { width, height } = canvas.getBoundingClientRect()
      return {
        x: direction === "left-to-right" ? -10 : width + 10,
        y: Math.random() * height,
        vx: directionFactor[direction] * (0.4 + Math.random() * 1.2) * spread,
        vy: (Math.random() - 0.5) * spread * 0.3,
        life: 200 + Math.random() * 200,
        progress: 0,
        alpha: 0.15 + Math.random() * 0.25,
      }
    },
    [direction, spread],
  )

  useEffect(() => {
    const canvas = canvasRef.current
    const wrapper = containerRef.current
    if (!canvas || !wrapper) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const resize = () => {
      const rect = wrapper.getBoundingClientRect()
      const dpr = window.devicePixelRatio || 1
      canvas.width = rect.width * dpr
      canvas.height = rect.height * dpr
      canvas.style.width = `${rect.width}px`
      canvas.style.height = `${rect.height}px`
      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.scale(dpr, dpr)
    }

    resize()
    window.addEventListener("resize", resize)

    const particleCount = Math.max(8, Math.floor(density * 32))
    particlesRef.current = Array.from({ length: particleCount }, () => spawnParticle(canvas))

    const animateParticles = () => {
      const rect = wrapper.getBoundingClientRect()
      ctx.clearRect(0, 0, rect.width, rect.height)

      // Always advance particles so the effect doesn't freeze mid-mask
      {
        particlesRef.current.forEach((particle, index) => {
          particle.x += particle.vx * 0.016
          particle.y += particle.vy * 0.016
          particle.progress += 1
          const alphaFalloff = Math.max(0, 1 - particle.progress / particle.life)
          ctx.beginPath()
          ctx.fillStyle = `rgba(255,255,255,${particle.alpha * alphaFalloff})`
          ctx.arc(particle.x, particle.y, 1.5 + Math.random() * 2.5, 0, Math.PI * 2)
          ctx.fill()

          if (
            particle.progress >= particle.life ||
            particle.x < -20 ||
            particle.x > rect.width + 20 ||
            particle.y < -20 ||
            particle.y > rect.height + 20
          ) {
            particlesRef.current[index] = spawnParticle(canvas)
          }
        })

        // Removed the horizontal band under headings which looked like a bar
        // If a grounding tint is desired, re-enable with a very low alpha.
        // ctx.fillStyle = "rgba(73,140,255,0.04)"
        // ctx.fillRect(0, rect.height * 0.55, rect.width, rect.height)
      }

      animationFrameRef.current = requestAnimationFrame(animateParticles)
    }

    animateParticles()

    return () => {
      window.removeEventListener("resize", resize)
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current)
    }
  }, [density, spawnParticle])

  // Time-driven animation loop to respect durations precisely
  useEffect(() => {
    if (!textList.length) return

    if (phase === "vapor") {
      // animate erase of previous text
      const start = performance.now()
      setPrevIndex(currentIndex)
      setVaporProgress(0)
      const step = (now: number) => {
        const t = Math.min(1, (now - start) / (settings.vaporizeDuration * 1000))
        setVaporProgress(t)
        if (t < 1) {
          rafRef.current = requestAnimationFrame(step)
        } else {
          // switch to new text and start fading it in
          setPrevIndex((p) => p) // keep reference for layout
          setPhase("fade")
        }
      }
      rafRef.current = requestAnimationFrame(step)
      return () => {
        if (rafRef.current) cancelAnimationFrame(rafRef.current)
      }
    }

    if (phase === "fade") {
      // move to next text and fade it in
      setPrevIndex((p) => p) // keep previous index
      const next = (currentIndex + 1) % textList.length
      setCurrentIndex(next)
      setFadeProgress(0)
      const start = performance.now()
      const step = (now: number) => {
        const t = Math.min(1, (now - start) / (settings.fadeInDuration * 1000))
        setFadeProgress(t)
        if (t < 1) {
          rafRef.current = requestAnimationFrame(step)
        } else {
          setPhase("hold")
        }
      }
      rafRef.current = requestAnimationFrame(step)
      return () => {
        if (rafRef.current) cancelAnimationFrame(rafRef.current)
      }
    }

    if (phase === "hold") {
      // hold the text, then start vaporizing it
      animationTimeoutRef.current = setTimeout(() => setPhase("vapor"), settings.waitDuration * 1000)
      return () => {
        if (animationTimeoutRef.current) clearTimeout(animationTimeoutRef.current)
      }
    }
  }, [phase, currentIndex, textList, settings.vaporizeDuration, settings.fadeInDuration, settings.waitDuration])

  const hiddenSeoText = useMemo(() => textList.join(" • "), [textList])

  const alignmentClasses = alignmentMap[alignment]

  const textStyle: React.CSSProperties = {
    fontFamily: typography.fontFamily,
    fontSize: typography.fontSize,
    fontWeight: typography.fontWeight,
    letterSpacing: typography.letterSpacing,
    lineHeight: typography.lineHeight,
  }

  const maskDirection = direction === "left-to-right" ? "to right" : "to left"
  const maskPercent = Math.round(vaporProgress * 1000) / 10 // 1 decimal precision
  const nextOpacity = phase === "vapor" ? Math.min(1, 0.15 + vaporProgress * 0.85) : phase === "fade" ? fadeProgress : 1

  return (
    <div
      ref={containerRef}
      className={[
        "relative flex w-full flex-col overflow-visible",
        alignmentClasses,
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      style={{ color, minHeight: "1em" }}
    >
      {/* Remove extra background glow to avoid dark banding behind H2 titles */}
      <div className="pointer-events-none absolute inset-0 -z-10" />
      <canvas ref={canvasRef} className="pointer-events-none absolute inset-0 -z-10" />
      <div className="relative inline-flex w-full flex-col">
        <div style={{ ...textStyle }} className="relative inline-flex w-full flex-col">
          <div
            className="relative inline-flex"
            style={{ width: "fit-content", alignSelf: alignment === "center" ? "center" : alignment === "right" ? "flex-end" : "flex-start" }}
          >
            {/* Previous text being vaporized (masked away) */}
            <div
              className="absolute inset-0 will-change-[clip-path,opacity]"
              style={{
                // Use clip-path instead of mask to avoid browser quirks when both stops equal
                clipPath:
                  direction === "left-to-right"
                    ? `inset(0% 0% 0% ${maskPercent}%)`
                    : `inset(0% ${maskPercent}% 0% 0%)`,
                pointerEvents: "none",
                opacity: phase === "vapor" ? 1 : 0,
                transition: "opacity 0.2s linear",
              }}
            >
              <VaporText text={textList[prevIndex] ?? ""} TagComponent={TagComponent} color={color} />
            </div>

            {/* New text crossfades: slightly visible during vapor for continuity */}
            <div style={{ opacity: nextOpacity }}>
              <VaporText text={textList[currentIndex] ?? ""} TagComponent={TagComponent} color={color} />
            </div>
          </div>
        </div>
      </div>
      <span className="sr-only" aria-live="polite">
        {hiddenSeoText}
      </span>
    </div>
  )
}

"use client"

import { useEffect, useRef, useState } from "react"
import * as d3 from "d3"
import type { Feature, FeatureCollection, GeoJsonProperties, MultiPolygon, Polygon } from "geojson"

interface RotatingEarthProps {
  width?: number
  height?: number
  className?: string
}

interface DotData {
  lng: number
  lat: number
  phase: number
}

interface Connection {
  from: [number, number]
  to: [number, number]
}

// Central Brazil origin so effects clearly originate from the middle of Brazil
const ORIGIN_BR: [number, number] = [-54.0, -14.0]
const HUBS: Connection[] = [
  { from: ORIGIN_BR, to: [-74.006, 40.7128] }, // New York
  { from: ORIGIN_BR, to: [2.3522, 48.8566] },  // Paris
  { from: ORIGIN_BR, to: [139.6917, 35.6895] }, // Tokyo
  { from: ORIGIN_BR, to: [-0.1276, 51.5074] }, // London
  { from: ORIGIN_BR, to: [-58.3816, -34.6037] }, // Buenos Aires
]

type LandGeometry = Polygon | MultiPolygon
type LandFeature = Feature<LandGeometry, GeoJsonProperties>
type LandCollection = FeatureCollection<LandGeometry, GeoJsonProperties>

// Cache land data and generated dots to avoid re-fetch and re-processing
const landCache: { features: LandCollection | null; dots: DotData[] | null } = {
  features: null,
  dots: null,
}
let landPromise: Promise<LandCollection> | null = null

export default function RotatingEarthShopifyStyle({
  width = 900,
  height = 900,
  className = "",
}: RotatingEarthProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [preferStatic, setPreferStatic] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const isVisibleRef = useRef(true)
  const hasLoadedRef = useRef(false)

  useEffect(() => {
    if (typeof window === "undefined") return
    const reduceMq = window.matchMedia("(prefers-reduced-motion: reduce)")
    const mobileMq = window.matchMedia("(max-width: 768px)")
    const update = () => {
      setPreferStatic(reduceMq.matches)
      setIsMobile(mobileMq.matches)
    }
    update()
    mobileMq.addEventListener("change", update)
    reduceMq.addEventListener("change", update)
    return () => {
      mobileMq.removeEventListener("change", update)
      reduceMq.removeEventListener("change", update)
    }
  }, [])

  useEffect(() => {
    if (preferStatic) return
    if (!canvasRef.current) return

    const canvas = canvasRef.current
    const context = canvas.getContext("2d")
    if (!context) return

    let rafId: number | null = null

    const observer = new IntersectionObserver(
      ([entry]) => {
        isVisibleRef.current = entry.isIntersecting
        if (entry.isIntersecting) {
          lastFrameTime = -Infinity
          render(currentTimestamp)
        }
      },
      { threshold: 0 },
    )
    observer.observe(canvas)

    const size = Math.min(
      width,
      height,
      Math.max(280, Math.min(window.innerWidth, window.innerHeight) * (isMobile ? 0.9 : 0.82)),
    )
    const containerWidth = size
    const containerHeight = size
    const radius = size / 2.1

    // Lower DPR to reduce GPU cost while keeping crisp edges
    const dpr = Math.min(window.devicePixelRatio || 1, isMobile ? 1.0 : 1.1)
    canvas.width = size * dpr
    canvas.height = size * dpr
    canvas.style.width = `${size}px`
    canvas.style.height = `${size}px`
    canvas.style.aspectRatio = "1 / 1"
    context.setTransform(dpr, 0, 0, dpr, 0, 0)

    const projection = d3
      .geoOrthographic()
      .scale(radius)
      .translate([containerWidth / 2, containerHeight / 2])
      .clipAngle(90)

    const path = d3.geoPath().projection(projection).context(context)

    const pointInPolygon = (point: [number, number], polygon: number[][]): boolean => {
      const [x, y] = point
      let inside = false

      for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        const [xi, yi] = polygon[i]
        const [xj, yj] = polygon[j]

        if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) {
          inside = !inside
        }
      }

      return inside
    }

    const pointInFeature = (point: [number, number], feature: LandFeature): boolean => {
      const geometry = feature.geometry

      if (geometry.type === "Polygon") {
        const coordinates = geometry.coordinates as number[][][]
        if (!pointInPolygon(point, coordinates[0])) return false
        for (let i = 1; i < coordinates.length; i++) {
          if (pointInPolygon(point, coordinates[i])) return false
        }
        return true
      }

      if (geometry.type === "MultiPolygon") {
        const coordinates = geometry.coordinates as number[][][][]
        for (const polygon of coordinates) {
          if (pointInPolygon(point, polygon[0])) {
            let inHole = false
            for (let i = 1; i < polygon.length; i++) {
              if (pointInPolygon(point, polygon[i])) {
                inHole = true
                break
              }
            }
            if (!inHole) return true
          }
        }
      }

      return false
    }

    const generateDotsInPolygon = (feature: LandFeature, dotSpacing = 14) => {
      const dots: [number, number][] = []
      const bounds = d3.geoBounds(feature)
      const [[minLng, minLat], [maxLng, maxLat]] = bounds

      const stepSize = dotSpacing * 0.08

      for (let lng = minLng; lng <= maxLng; lng += stepSize) {
        for (let lat = minLat; lat <= maxLat; lat += stepSize) {
          const point: [number, number] = [lng, lat]
          if (pointInFeature(point, feature)) {
            dots.push(point)
          }
        }
      }

      return dots
    }

    const allDots: DotData[] = landCache.dots ? [...landCache.dots] : []
    // Static starfield (screen-space) for background
    type Star = { x: number; y: number; r: number; phase: number; alpha: number }
    const stars: Star[] = []
    // Dynamic networking routes that spawn over time
    type DynamicRoute = { to: [number, number]; start: number; life: number; speed: number }
    const dynamicRoutes: DynamicRoute[] = []
    let lastRouteAt = 0
    let currentTimestamp = 0
    let currentTimeSeconds = 0
    let lastFrameTime = -Infinity
    let landFeatures: LandCollection | null = landCache.features

    const render = (elapsed?: number) => {
      if (typeof elapsed === "number") {
        currentTimestamp = elapsed
        currentTimeSeconds = elapsed / 1000
      }

      const timeSeconds = currentTimeSeconds

      context.clearRect(0, 0, containerWidth, containerHeight)

      // Draw starfield behind globe (twinkling slightly)
      context.save()
      const compPrevStars = context.globalCompositeOperation
      context.globalCompositeOperation = "lighter"
      for (const s of stars) {
        const tw = 0.75 + 0.25 * Math.sin(timeSeconds * 0.8 + s.phase)
        const a = s.alpha * tw
        const g = context.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.r * 3)
        g.addColorStop(0, `rgba(255,255,255,${0.8 * a})`)
        g.addColorStop(1, "rgba(255,255,255,0)")
        context.beginPath()
        context.fillStyle = g
        context.arc(s.x, s.y, s.r * 3, 0, Math.PI * 2)
        context.fill()
      }
      context.globalCompositeOperation = compPrevStars
      context.restore()

      const currentScale = projection.scale()
      const scaleFactor = currentScale / radius
      const cx = containerWidth / 2
      const cy = containerHeight / 2

      // Darker, non-glossy ocean (removes intense center glow)
      const oceanGradient = context.createRadialGradient(
        cx,
        cy,
        currentScale * 0.05,
        cx,
        cy,
        currentScale,
      )
      oceanGradient.addColorStop(0, "#08121a")
      oceanGradient.addColorStop(0.5, "#061017")
      oceanGradient.addColorStop(1, "#03070b")

      context.save()
      context.beginPath()
      context.arc(cx, cy, currentScale, 0, 2 * Math.PI)
      context.clip()
      context.fillStyle = oceanGradient
      context.fillRect(cx - currentScale, cy - currentScale, currentScale * 2, currentScale * 2)

      if (landFeatures) {
        const graticule = d3.geoGraticule()
        context.beginPath()
        path(graticule())
        // Softer longitude/latitude grid lines
        context.strokeStyle = "rgba(120, 200, 190, 0.12)"
        context.lineWidth = 0.6 * scaleFactor
        context.stroke()

        // Fill landmass first so continents pop
        context.beginPath()
        landFeatures.features.forEach((feature) => path(feature))
        context.fillStyle = "rgba(60, 110, 120, 0.2)"
        context.fill()

        // Land outline subtler and more natural
        context.strokeStyle = "rgba(180, 236, 220, 0.35)"
        context.lineWidth = 0.8 * scaleFactor
        context.stroke()

        // Colorized city lights/points with gentle twinkle
        allDots.forEach((dot) => {
          const projected = projection([dot.lng, dot.lat])
          if (
            projected &&
            projected[0] >= 0 &&
            projected[0] <= containerWidth &&
            projected[1] >= 0 &&
            projected[1] <= containerHeight
          ) {
            const wave = 0.5 + 0.5 * Math.sin(timeSeconds * 0.6 + dot.phase)
            const radiusGlow = (0.6 + wave * 0.5) * scaleFactor
            const alpha = 0.12 + wave * 0.24
            // Hue varies slightly with longitude for a colorful, non-pearl look
            const hue = ((dot.lng + 180) / 360) * 240 // 0..240 (red->cyan)
            const sat = 70
            const light = 65
            context.beginPath()
            context.fillStyle = `hsla(${hue}, ${sat}%, ${light}%, ${alpha})`
            context.arc(projected[0], projected[1], radiusGlow, 0, 2 * Math.PI)
            context.fill()
          }
        })

        // Spawn/cleanup dynamic networking routes from Brazil origin to random land dots
        if (timeSeconds - lastRouteAt > 2.4 && dynamicRoutes.length < 1 && allDots.length > 0) {
          lastRouteAt = timeSeconds
          const pick = allDots[Math.floor(Math.random() * allDots.length)]
          dynamicRoutes.push({
            to: [pick.lng, pick.lat],
            start: timeSeconds,
            life: 6 + Math.random() * 2,
            speed: 0.08 + Math.random() * 0.06,
          })
        }
        for (let i = dynamicRoutes.length - 1; i >= 0; i--) {
          if (timeSeconds - dynamicRoutes[i].start > dynamicRoutes[i].life) dynamicRoutes.splice(i, 1)
        }

        const staticProjected = HUBS.map((conn) => ({
          from: projection(conn.from),
          to: projection(conn.to),
          speed: 0.22,
        })).filter(
          (c): c is { from: [number, number]; to: [number, number]; speed: number } => Boolean(c.from && c.to),
        )

        const dynamicProjected = dynamicRoutes
          .map((r) => ({ from: projection(ORIGIN_BR), to: projection(r.to), speed: r.speed }))
          .filter(
            (c): c is { from: [number, number]; to: [number, number]; speed: number } => Boolean(c.from && c.to),
          )

        const connections = [...staticProjected, ...dynamicProjected]

        // anchor markers (fixed on geo locations)
        const anchorPoints: [number, number][] = []
        connections.forEach(({ from, to }) => {
          anchorPoints.push(from, to)
        })
        context.save()
        const prevComp = context.globalCompositeOperation
        context.globalCompositeOperation = "lighter"
        anchorPoints.forEach(([ax, ay]) => {
          context.beginPath()
          const r = 2 * scaleFactor
          const grd = context.createRadialGradient(ax, ay, 0, ax, ay, r * 2)
          grd.addColorStop(0, "hsla(190, 95%, 70%, 0.6)")
          grd.addColorStop(1, "hsla(190, 95%, 70%, 0)")
          context.fillStyle = grd
          context.arc(ax, ay, r * 1.1, 0, Math.PI * 2)
          context.fill()
          context.beginPath()
          context.fillStyle = "#fff"
          context.arc(ax, ay, 0.8 * scaleFactor, 0, Math.PI * 2)
          context.fill()
        })
        context.globalCompositeOperation = prevComp
        context.restore()

        connections.forEach(({ from, to, speed }) => {
          context.save()
          context.beginPath()
          context.moveTo(from[0], from[1])
          const midX = (from[0] + to[0]) / 2
          const midY = (from[1] + to[1]) / 2 - radius * 0.35
          context.quadraticCurveTo(midX, midY, to[0], to[1])
          // Colorized arc light (origin hue -> destination hue)
          const hueFrom = ((from[0] / containerWidth) * 240) % 240
          const hueTo = ((to[0] / containerWidth) * 240) % 240
          const grad = context.createLinearGradient(from[0], from[1], to[0], to[1])
          grad.addColorStop(0, `hsla(${hueFrom},80%,65%,0)`) 
          grad.addColorStop(0.5, `hsla(${(hueFrom + hueTo) / 2},85%,65%,0.35)`) 
          grad.addColorStop(1, `hsla(${hueTo},90%,70%,0.5)`) 
          context.strokeStyle = grad
          context.lineWidth = 1.2 * scaleFactor
          context.stroke()

          // moving "rocket" along the curve
          const t = (timeSeconds * (speed ?? 0.15)) % 1
          const x = (1 - t) * (1 - t) * from[0] + 2 * (1 - t) * t * midX + t * t * to[0]
          const y = (1 - t) * (1 - t) * from[1] + 2 * (1 - t) * t * midY + t * t * to[1]
          // Rocket trail using additive blending
          const compPrev = context.globalCompositeOperation
          context.globalCompositeOperation = "lighter"
          for (let i = 4; i >= 1; i--) {
            const ti = Math.max(0, t - i * 0.045)
            const xi = (1 - ti) * (1 - ti) * from[0] + 2 * (1 - ti) * ti * midX + ti * ti * to[0]
            const yi = (1 - ti) * (1 - ti) * from[1] + 2 * (1 - ti) * ti * midY + ti * ti * to[1]
            const fade = i / 4
            const r = (1.4 + (1 - fade) * 1.2) * scaleFactor
            context.beginPath()
            context.fillStyle = `hsla(${hueTo}, 90%, 70%, ${0.16 * fade})`
            context.arc(xi, yi, r, 0, Math.PI * 2)
            context.fill()
          }
          // Rocket core
          context.beginPath()
          context.fillStyle = `hsla(${hueTo}, 95%, 75%, 0.95)`
          context.arc(x, y, 2.6 * scaleFactor, 0, Math.PI * 2)
          context.fill()
          context.globalCompositeOperation = compPrev
          context.restore()
        })
      }

      context.restore()
      context.beginPath()
      context.arc(cx, cy, currentScale, 0, 2 * Math.PI)
      context.strokeStyle = "rgba(160, 210, 220, 0.18)"
      context.lineWidth = 0.9 * scaleFactor
      context.stroke()
    }

    const buildStars = () => {
      const starCount = Math.min(30, Math.max(10, Math.floor((containerWidth + containerHeight) / (isMobile ? 34 : 30))))
      stars.length = 0
      for (let i = 0; i < starCount; i++) {
        stars.push({
          x: Math.random() * containerWidth,
          y: Math.random() * containerHeight,
          r: 0.6 + Math.random() * 1.6,
          phase: Math.random() * Math.PI * 2,
          alpha: 0.35 + Math.random() * 0.55,
        })
      }
    }

    let retryAttempts = 0
    const loadWorldData = async () => {
      if (hasLoadedRef.current) return
      hasLoadedRef.current = true

      const loadFrom = async (url: string) => {
        const res = await fetch(url)
        if (!res.ok) throw new Error(`Failed to load land data from ${url}`)
        const data = (await res.json()) as LandCollection
        if (!Array.isArray(data.features) || data.features.length < 5) {
          throw new Error(`Land data missing features from ${url}`)
        }
        return data
      }

      try {
        if (!landFeatures) {
          if (!landPromise) {
            landPromise = loadFrom("/geo/ne_110m_land.json").catch(() =>
              loadFrom("https://raw.githubusercontent.com/martynafford/natural-earth-geojson/refs/heads/master/110m/physical/ne_110m_land.json"),
            )
          }
          landFeatures = await landPromise
          landCache.features = landFeatures
        }

        if (!landCache.dots && landFeatures) {
          const dotsLocal: DotData[] = []
          const dotSpacing = isMobile ? 46 : window.innerWidth < 1024 ? 38 : 30
          landFeatures.features.forEach((feature) => {
            const dots = generateDotsInPolygon(feature, dotSpacing)
            dots.forEach(([lng, lat]) => {
              dotsLocal.push({ lng, lat, phase: Math.random() * Math.PI * 2 })
            })
          })
          const maxDots = isMobile ? 2200 : 4000
          if (dotsLocal.length > maxDots) {
            for (let i = dotsLocal.length - 1; i > 0; i--) {
              const j = Math.floor(Math.random() * (i + 1))
              ;[dotsLocal[i], dotsLocal[j]] = [dotsLocal[j], dotsLocal[i]]
            }
            dotsLocal.length = maxDots
          }
          landCache.dots = dotsLocal
        }

        if (landCache.dots) {
          allDots.length = 0
          allDots.push(...landCache.dots)
        }

        if (stars.length === 0) buildStars()
        render(0)
      } catch (err) {
        console.error(err)
        hasLoadedRef.current = false
        setError("Failed to load land map data")
        if (retryAttempts < 3) {
          retryAttempts += 1
          setTimeout(() => {
            if (!hasLoadedRef.current) void loadWorldData()
          }, 1200 * retryAttempts)
        }
      }
    }

    // render placeholder ocean + stars immediately
    buildStars()
    render(0)

    const rotation: [number, number] = [60, -10]
    let autoRotate = true
    const rotationSpeed = isMobile ? 0.055 : 0.085
    const frameInterval = 80 // ~12fps to reduce load

    const tick = (elapsed: number) => {
      // Skip rendering when off-screen to avoid long-task spam
      if (!isVisibleRef.current) {
        lastFrameTime = elapsed
        currentTimestamp = elapsed
        currentTimeSeconds = elapsed / 1000
        rafId = requestAnimationFrame(tick)
        return
      }

      if (elapsed - lastFrameTime < frameInterval) {
        rafId = requestAnimationFrame(tick)
        return
      }
      lastFrameTime = elapsed
      currentTimestamp = elapsed
      currentTimeSeconds = elapsed / 1000
      if (autoRotate) {
        rotation[0] += rotationSpeed
        if (rotation[0] > 180) rotation[0] -= 360
        if (rotation[0] < -180) rotation[0] += 360
        projection.rotate(rotation)
      }
      render(elapsed)
      rafId = requestAnimationFrame(tick)
    }
    rafId = requestAnimationFrame(tick)

    const handleMouseDown = (event: MouseEvent) => {
      autoRotate = false
      const startX = event.clientX
      const startY = event.clientY
      const startRotation = [...rotation] as [number, number]

      const handleMouseMove = (moveEvent: MouseEvent) => {
        const sensitivity = 0.4
        const dx = moveEvent.clientX - startX
        const dy = moveEvent.clientY - startY

        rotation[0] = startRotation[0] + dx * sensitivity
        rotation[1] = Math.max(-90, Math.min(90, startRotation[1] - dy * sensitivity))

        projection.rotate(rotation)
        render(currentTimestamp)
      }

      const handleMouseUp = () => {
        document.removeEventListener("mousemove", handleMouseMove)
        document.removeEventListener("mouseup", handleMouseUp)
        setTimeout(() => {
          autoRotate = true
        }, 800)
      }

      document.addEventListener("mousemove", handleMouseMove)
      document.addEventListener("mouseup", handleMouseUp)
    }

    const handleTouchStart = (event: TouchEvent) => {
      if (!event.touches.length) return
      autoRotate = false
      const startX = event.touches[0].clientX
      const startY = event.touches[0].clientY
      const startRotation = [...rotation] as [number, number]

      const handleTouchMove = (moveEvent: TouchEvent) => {
        if (!moveEvent.touches.length) return
        const touch = moveEvent.touches[0]
        const sensitivity = 0.35
        const dx = touch.clientX - startX
        const dy = touch.clientY - startY

        rotation[0] = startRotation[0] + dx * sensitivity
        rotation[1] = Math.max(-90, Math.min(90, startRotation[1] - dy * sensitivity))

        projection.rotate(rotation)
        render(currentTimestamp)
      }

      const handleTouchEnd = () => {
        document.removeEventListener("touchmove", handleTouchMove)
        document.removeEventListener("touchend", handleTouchEnd)
        setTimeout(() => {
          autoRotate = true
        }, 800)
      }

      document.addEventListener("touchmove", handleTouchMove, { passive: false })
      document.addEventListener("touchend", handleTouchEnd)
    }

    canvas.addEventListener("mousedown", handleMouseDown)
    canvas.addEventListener("touchstart", handleTouchStart, { passive: false })
    // Block wheel to avoid page/browser zoom while cursor over canvas
    const wheelBlocker = (e: WheelEvent) => e.preventDefault()
    canvas.addEventListener("wheel", wheelBlocker, { passive: false })
    // Block Safari pinch-zoom gestures while interacting with the canvas
    const gestureBlocker = (e: Event) => e.preventDefault()
    // Safari-specific gesture events
    canvas.addEventListener("gesturestart", gestureBlocker as EventListener, { passive: false })
    canvas.addEventListener("gesturechange", gestureBlocker as EventListener, { passive: false })
    canvas.addEventListener("gestureend", gestureBlocker as EventListener, { passive: false })
    // Zoom disabled by request; keep only drag to rotate
    canvas.addEventListener("mouseleave", () => {
      // if mouse leaves canvas, ensure rotation resumes after a short delay
      setTimeout(() => (autoRotate = true), 500)
    })

    // Always start loading immediately (desktop/mobile)
    if (!hasLoadedRef.current) void loadWorldData()

    return () => {
      if (rafId) cancelAnimationFrame(rafId)
      observer.disconnect()
      canvas.removeEventListener("mousedown", handleMouseDown)
      canvas.removeEventListener("touchstart", handleTouchStart as EventListener)
      canvas.removeEventListener("wheel", wheelBlocker as EventListener)
      // Safari-specific gesture events
      canvas.removeEventListener("gesturestart", gestureBlocker as EventListener)
      canvas.removeEventListener("gesturechange", gestureBlocker as EventListener)
      canvas.removeEventListener("gestureend", gestureBlocker as EventListener)
    }
  }, [width, height, preferStatic, isMobile])

  if (preferStatic) {
    return (
      <div className={`relative w-full flex items-center justify-center ${className}`} style={{ overscrollBehavior: "contain" }}>
        <div className="relative w-full max-w-[460px] sm:max-w-[520px]" style={{ aspectRatio: "1 / 1" }}>
          <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_30%_30%,rgba(45,212,191,0.35),transparent_45%),radial-gradient(circle_at_65%_60%,rgba(59,130,246,0.28),transparent_40%),radial-gradient(circle,rgba(0,0,0,0.65),rgba(0,0,0,0.9))] shadow-[0_30px_80px_rgba(0,0,0,0.55)]" />
        </div>
        <div className="pointer-events-none absolute inset-x-0 bottom-4 flex justify-center">
          <span className="rounded-full bg-black/60 px-3 py-1 text-[10px] uppercase tracking-[0.35em] text-emerald-100/80 backdrop-blur">
            Mapa estilizado
          </span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={`flex items-center justify-center ${className}`}>
        <p className="text-sm text-red-400">{error}</p>
      </div>
    )
  }

  return (
    <div className={`relative w-full flex items-center justify-center ${className}`} style={{ overscrollBehavior: "contain" }}>
      <div className="relative w-full max-w-[460px] sm:max-w-[520px]" style={{ aspectRatio: "1 / 1" }}>
        <canvas
          ref={canvasRef}
          className="block h-full w-full rounded-full"
          style={{ touchAction: "none" }}
        />
      </div>
      <div className="pointer-events-none absolute inset-x-0 bottom-4 flex justify-center">
        <span className="rounded-full bg-black/40 px-3 py-1 text-[10px] uppercase tracking-[0.3em] text-emerald-200/70 backdrop-blur-sm">
          Drag to rotate
        </span>
      </div>
    </div>
  )
}

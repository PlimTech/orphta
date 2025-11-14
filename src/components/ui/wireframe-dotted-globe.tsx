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

export default function RotatingEarthShopifyStyle({
  width = 900,
  height = 900,
  className = "",
}: RotatingEarthProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!canvasRef.current) return

    const canvas = canvasRef.current
    const context = canvas.getContext("2d")
    if (!context) return

    const size = Math.min(width, height, window.innerWidth, window.innerHeight)
    const containerWidth = size
    const containerHeight = size
    const radius = size / 2.1

    const dpr = window.devicePixelRatio || 1
    canvas.width = size * dpr
    canvas.height = size * dpr
    canvas.style.width = `${size}px`
    canvas.style.height = `${size}px`
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

    const allDots: DotData[] = []
    // Static starfield (screen-space) for background
    type Star = { x: number; y: number; r: number; phase: number; alpha: number }
    const stars: Star[] = []
    type Burst = { lng: number; lat: number; start: number; hue: number; speed: number; life: number }
    const bursts: Burst[] = []
    let lastBurstAt = 0
    // Dynamic networking routes that spawn over time
    type DynamicRoute = { to: [number, number]; start: number; life: number; speed: number }
    const dynamicRoutes: DynamicRoute[] = []
    let lastRouteAt = 0
    let currentTimestamp = 0
    let currentTimeSeconds = 0
    let lastFrameTime = -Infinity
    let landFeatures: LandCollection | null = null

    const render = (elapsed?: number) => {
      const timestamp = typeof elapsed === "number" ? elapsed : currentTimestamp
      if (Number.isFinite(timestamp) && timestamp - lastFrameTime < 1000 / 30) {
        return
      }
      if (Number.isFinite(timestamp)) {
        lastFrameTime = timestamp as number
        currentTimestamp = timestamp as number
        currentTimeSeconds = (timestamp as number) / 1000
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

        context.beginPath()
        landFeatures.features.forEach((feature) => path(feature))
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
            const radiusGlow = (0.55 + wave * 0.45) * scaleFactor
            const alpha = 0.08 + wave * 0.2
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

        // Fireworks bursts (make more visible with additive blending)
        // Spawn new burst occasionally
        if (timeSeconds - lastBurstAt > 0.9 && bursts.length < 6) {
          lastBurstAt = timeSeconds
          const choice = allDots[Math.floor(Math.random() * allDots.length)]
          if (choice) {
            bursts.push({
              lng: choice.lng,
              lat: choice.lat,
              start: timeSeconds,
              hue: (((choice.lng + 180) / 360) * 300) % 300,
              speed: 26 + Math.random() * 12,
              life: 1.8 + Math.random() * 0.8,
            })
          }
        }

        // Draw bursts
        context.save()
        const prevComposite = context.globalCompositeOperation
        context.globalCompositeOperation = "lighter"
        for (let i = bursts.length - 1; i >= 0; i--) {
          const b = bursts[i]
          const age = timeSeconds - b.start
          if (age > b.life) {
            bursts.splice(i, 1)
            continue
          }
          const p = projection([b.lng, b.lat])
          if (!p) continue
          const [bx, by] = p
          const progress = age / b.life
          const radius = (progress * b.speed + 4) * scaleFactor
          const segments = 48
          const alpha = 0.75 * (1 - progress)
          for (let s = 0; s < segments; s++) {
            const a = (s / segments) * Math.PI * 2
            const x = bx + Math.cos(a) * radius
            const y = by + Math.sin(a) * radius
            const hue = (b.hue + s * 5) % 360
            const size = (1.6 + (1 - progress) * 1.2) * scaleFactor
            context.beginPath()
            context.fillStyle = `hsla(${hue}, 85%, ${65 - progress * 25}%, ${alpha})`
            context.arc(x, y, size, 0, Math.PI * 2)
            context.fill()
          }
          // inner flash
          const flashR = (6 - progress * 5) * scaleFactor
          if (flashR > 0.5) {
            const flash = context.createRadialGradient(bx, by, 0, bx, by, flashR)
            flash.addColorStop(0, `hsla(${b.hue},90%,70%,0.7)`)
            flash.addColorStop(1, "hsla(0,0%,100%,0)")
            context.beginPath()
            context.fillStyle = flash
            context.arc(bx, by, flashR, 0, Math.PI * 2)
            context.fill()
          }
        }
        context.globalCompositeOperation = prevComposite
        context.restore()

        // Spawn/cleanup dynamic networking routes from Brazil origin to random land dots
        if (timeSeconds - lastRouteAt > 1.4 && dynamicRoutes.length < 8 && allDots.length > 0) {
          lastRouteAt = timeSeconds
          const pick = allDots[Math.floor(Math.random() * allDots.length)]
          dynamicRoutes.push({
            to: [pick.lng, pick.lat],
            start: timeSeconds,
            life: 10 + Math.random() * 6,
            speed: 0.18 + Math.random() * 0.16,
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
          const r = 3.5 * scaleFactor
          const grd = context.createRadialGradient(ax, ay, 0, ax, ay, r * 2)
          grd.addColorStop(0, "hsla(190, 95%, 70%, 0.9)")
          grd.addColorStop(1, "hsla(190, 95%, 70%, 0)")
          context.fillStyle = grd
          context.arc(ax, ay, r * 1.6, 0, Math.PI * 2)
          context.fill()
          context.beginPath()
          context.fillStyle = "#fff"
          context.arc(ax, ay, 1.2 * scaleFactor, 0, Math.PI * 2)
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
          const t = (timeSeconds * (speed ?? 0.22)) % 1
          const x = (1 - t) * (1 - t) * from[0] + 2 * (1 - t) * t * midX + t * t * to[0]
          const y = (1 - t) * (1 - t) * from[1] + 2 * (1 - t) * t * midY + t * t * to[1]
          // Rocket trail using additive blending
          const compPrev = context.globalCompositeOperation
          context.globalCompositeOperation = "lighter"
          for (let i = 12; i >= 1; i--) {
            const ti = Math.max(0, t - i * 0.02)
            const xi = (1 - ti) * (1 - ti) * from[0] + 2 * (1 - ti) * ti * midX + ti * ti * to[0]
            const yi = (1 - ti) * (1 - ti) * from[1] + 2 * (1 - ti) * ti * midY + ti * ti * to[1]
            const fade = i / 12
            const r = (2.2 + (1 - fade) * 2.2) * scaleFactor
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

    const loadWorldData = async () => {
      try {
        const response = await fetch(
          "https://raw.githubusercontent.com/martynafford/natural-earth-geojson/refs/heads/master/110m/physical/ne_110m_land.json",
        )
        if (!response.ok) throw new Error("Failed to load land data")

        const data = (await response.json()) as LandCollection
        landFeatures = data

        landFeatures.features.forEach((feature) => {
          const dots = generateDotsInPolygon(feature, 16)
          dots.forEach(([lng, lat]) => {
            allDots.push({ lng, lat, phase: Math.random() * Math.PI * 2 })
          })
        })

        // Build star field once sizes are known
        const starCount = Math.min(160, Math.max(100, Math.floor((containerWidth + containerHeight) / 12)))
        stars.length = 0
        for (let i = 0; i < starCount; i++) {
          stars.push({
            x: Math.random() * containerWidth,
            y: Math.random() * containerHeight,
            r: 0.6 + Math.random() * 1.8,
            phase: Math.random() * Math.PI * 2,
            alpha: 0.35 + Math.random() * 0.65,
          })
        }

        render(0)
      } catch (err) {
        console.error(err)
        setError("Failed to load land map data")
      }
    }

    const rotation: [number, number] = [60, -10]
    let autoRotate = true
    const rotationSpeed = 0.065

    const rotationTimer = d3.timer((elapsed) => {
      currentTimestamp = elapsed
      currentTimeSeconds = elapsed / 1000
      if (autoRotate) {
        rotation[0] += rotationSpeed
        // keep values bounded so rotation loops cleanly forever
        if (rotation[0] > 180) rotation[0] -= 360
        if (rotation[0] < -180) rotation[0] += 360
        projection.rotate(rotation)
      }
      render(elapsed)
    })

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

    canvas.addEventListener("mousedown", handleMouseDown)
    // Block wheel to avoid page/browser zoom while cursor over canvas
    const wheelBlocker = (e: WheelEvent) => e.preventDefault()
    canvas.addEventListener("wheel", wheelBlocker, { passive: false })
    // Zoom disabled by request; keep only drag to rotate
    canvas.addEventListener("mouseleave", () => {
      // if mouse leaves canvas, ensure rotation resumes after a short delay
      setTimeout(() => (autoRotate = true), 500)
    })

    loadWorldData()

    return () => {
      rotationTimer.stop()
      canvas.removeEventListener("mousedown", handleMouseDown)
      canvas.removeEventListener("wheel", wheelBlocker as EventListener)
    }
  }, [width, height])

  if (error) {
    return (
      <div className={`flex items-center justify-center ${className}`}>
        <p className="text-sm text-red-400">{error}</p>
      </div>
    )
  }

  return (
    <div className={className}>
      <canvas
        ref={canvasRef}
        className="h-auto w-full"
        style={{ maxWidth: "100%", height: "auto", display: "block" }}
      />
      <div className="pointer-events-none absolute inset-x-0 bottom-10 flex justify-center">
        <span className="rounded-full bg-black/40 px-3 py-1 text-[10px] uppercase tracking-[0.3em] text-emerald-200/70 backdrop-blur-sm">
          Drag to rotate
        </span>
      </div>
    </div>
  )
}

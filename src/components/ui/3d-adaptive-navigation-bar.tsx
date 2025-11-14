"use client"

import React, { useEffect, useRef, useState } from "react"
import { AnimatePresence, motion, useSpring } from "framer-motion"

interface NavItem {
  label: string
  id: string
}

const NAV_ITEMS: NavItem[] = [
  { label: "Home", id: "home" },
  { label: "Problem", id: "problem" },
  { label: "Solution", id: "solution" },
  { label: "Contact", id: "contact" },
]

/**
 * 3D Adaptive Navigation Pill
 * Smart navigation with hover expansion and subtle lighting
 */
export const PillBase: React.FC = () => {
  const [activeSection, setActiveSection] = useState("home")
  const [expanded, setExpanded] = useState(false)
  const [hovering, setHovering] = useState(false)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const pillWidth = useSpring(220, { stiffness: 220, damping: 25, mass: 1 })
  const pillShift = useSpring(0, { stiffness: 220, damping: 25, mass: 1 })

  useEffect(() => {
    if (hovering) {
      setExpanded(true)
      pillWidth.set(640)
      if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current)
    } else {
      hoverTimeoutRef.current = setTimeout(() => {
        setExpanded(false)
        pillWidth.set(220)
      }, 600)
    }

    return () => {
      if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current)
    }
  }, [hovering, pillWidth])

  useEffect(() => {
    const handleScroll = () => {
      const sections = NAV_ITEMS
        .map((item) => document.getElementById(item.id))
        .filter(Boolean) as HTMLElement[]

      const topThreshold = window.innerHeight * 0.35

      for (const section of sections) {
        const rect = section.getBoundingClientRect()
        if (rect.top <= topThreshold && rect.bottom >= topThreshold) {
          setActiveSection(section.id)
          break
        }
      }
    }

    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  const handleMouseEnter = () => setHovering(true)
  const handleMouseLeave = () => setHovering(false)

  const handleSectionClick = (sectionId: string) => {
    setIsTransitioning(true)
    setActiveSection(sectionId)
    setHovering(false)

    const node = document.getElementById(sectionId)
    if (node) {
      node.scrollIntoView({ behavior: "smooth", block: "start" })
    }

    setTimeout(() => {
      setIsTransitioning(false)
    }, 400)
  }

  const activeItem = NAV_ITEMS.find((item) => item.id === activeSection)

  return (
    <motion.nav
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className="relative rounded-full"
      style={{
        width: pillWidth,
        height: "64px",
        // Base surface + subtle rainbow border to match RainbowButton
        background: `
          linear-gradient(135deg, rgba(10,12,20,0.92), rgba(8,10,18,0.92)) padding-box,
          linear-gradient(90deg,
            hsl(var(--color-1) / 0.38),
            hsl(var(--color-2) / 0.38),
            hsl(var(--color-3) / 0.38),
            hsl(var(--color-4) / 0.38),
            hsl(var(--color-5) / 0.38)) border-box
        `,
        backgroundOrigin: "border-box",
        backgroundClip: "padding-box, border-box",
        border: "1px solid transparent",
        boxShadow: expanded
          ? `
            0 4px 12px rgba(5, 10, 20, 0.55),
            0 15px 35px rgba(120, 150, 255, 0.18),
            inset 0 2px 2px rgba(255, 255, 255, 0.08),
            inset 0 -3px 12px rgba(0, 0, 0, 0.4),
            inset 3px 3px 8px rgba(120, 150, 255, 0.12),
            inset -3px 3px 8px rgba(120, 150, 255, 0.08)
          `
          : isTransitioning
            ? `
              0 4px 10px rgba(2, 6, 23, 0.55),
              0 12px 30px rgba(0, 0, 0, 0.55),
              inset 0 2px 1px rgba(255, 255, 255, 0.06),
              inset 0 -2px 12px rgba(0, 0, 0, 0.35),
              inset 2px 2px 8px rgba(120, 150, 255, 0.08),
              inset -2px 2px 8px rgba(120, 150, 255, 0.06)
            `
            : `
              0 4px 10px rgba(5, 10, 25, 0.45),
              0 12px 30px rgba(0, 0, 0, 0.5),
              inset 0 2px 1px rgba(255, 255, 255, 0.04),
              inset 0 -2px 10px rgba(0, 0, 0, 0.35),
              inset 2px 2px 6px rgba(120, 150, 255, 0.06),
              inset -2px 2px 6px rgba(120, 150, 255, 0.05)
            `,
        x: pillShift,
        overflow: "hidden",
        transition: "box-shadow 0.3s ease-out",
      }}
    >
      <div className="absolute inset-0 overflow-hidden rounded-full">
        <motion.div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(90deg, hsl(var(--color-1)/.18), transparent, hsl(var(--color-5)/.14))",
          }}
          animate={{ opacity: expanded ? 0.9 : 0.35 }}
          transition={{ duration: 0.4 }}
        />
        <motion.div
          className="absolute -left-10 top-0 h-full w-20 rotate-12 blur-2xl"
          style={{ background: "hsl(var(--color-3) / 0.55)" }}
          animate={{ x: expanded ? 160 : -30, opacity: expanded ? 0.7 : 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        />
        <motion.div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(circle at top, hsl(var(--color-3)/.28), transparent 55%)",
          }}
          animate={{ opacity: hovering ? 1 : 0.35 }}
        />
      </div>
      <div className="relative z-10 flex h-full w-full items-center gap-3 px-6">
        <AnimatePresence initial={false} mode="wait">
          {expanded ? (
            <motion.ul
              key="expanded"
              className="flex flex-1 items-center justify-between text-sm font-semibold text-slate-100"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
            >
              {NAV_ITEMS.map((item) => (
                <li key={item.id}>
                  <button
                    className="relative flex items-center gap-1 rounded-full px-3 py-1 transition-colors"
                    onClick={() => handleSectionClick(item.id)}
                  >
                    <span className="text-xs uppercase tracking-[0.2em] text-cyan-300/70">0{NAV_ITEMS.indexOf(item) + 1}</span>
                    <span className={item.id === activeSection ? "text-white" : "text-white/60"}>{item.label}</span>
                    {item.id === activeSection && (
                      <motion.span
                        layoutId="nav-active-dot"
                        className="absolute -bottom-1 left-1/2 h-1 w-6 -translate-x-1/2 rounded-full bg-gradient-to-r from-cyan-300 via-sky-400 to-cyan-300"
                      />
                    )}
                  </button>
                </li>
              ))}
            </motion.ul>
          ) : (
            <motion.div
              key="compact"
              className="flex w-full items-center justify-between"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
            >
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-cyan-400" />
                <p className="text-sm uppercase tracking-[0.3em] text-white/80">{activeItem?.label ?? "Home"}</p>
              </div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.5em] text-white/60">Menu</div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.nav>
  )
}

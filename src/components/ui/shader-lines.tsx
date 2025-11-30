"use client"

/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useRef, useState } from "react"

declare global {
  interface Window {
    THREE: any
  }
}

export function ShaderAnimation() {
  const containerRef = useRef<HTMLDivElement>(null)
  const [enabled, setEnabled] = useState(false)
  const sceneRef = useRef<{
    camera: any | null
    scene: any | null
    renderer: any | null
    uniforms:
      | {
          time: { type: string; value: number }
          resolution: { type: string; value: any }
        }
      | null
    animationId: number | null
  }>({
    camera: null,
    scene: null,
    renderer: null,
    uniforms: null,
    animationId: null,
  })

  useEffect(() => {
    if (typeof window === "undefined") return
    const mobileMq = window.matchMedia("(max-width: 768px)")
    const reduceMq = window.matchMedia("(prefers-reduced-motion: reduce)")
    const update = () => setEnabled(!(mobileMq.matches || reduceMq.matches))
    update()
    mobileMq.addEventListener("change", update)
    reduceMq.addEventListener("change", update)
    return () => {
      mobileMq.removeEventListener("change", update)
      reduceMq.removeEventListener("change", update)
    }
  }, [])

  useEffect(() => {
    if (!enabled) return
    let script: HTMLScriptElement | null = null
    let cleanup: (() => void) | undefined

    const start = () => {
      if (containerRef.current && window.THREE) {
        cleanup = initThreeJS()
      }
    }

    if (window.THREE) {
      start()
    } else {
      script = document.createElement("script")
      script.src = "https://cdnjs.cloudflare.com/ajax/libs/three.js/89/three.min.js"
      script.onload = start
      document.head.appendChild(script)
    }

    return () => {
      if (cleanup) cleanup()
      if (script && document.head.contains(script)) {
        document.head.removeChild(script)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled])

  const initThreeJS = () => {
    if (!containerRef.current || !window.THREE) return

    const THREE = window.THREE
    const container = containerRef.current

    container.innerHTML = ""

    const camera = new THREE.Camera()
    camera.position.z = 1

    const scene = new THREE.Scene()

    const geometry = new THREE.PlaneBufferGeometry(2, 2)

    const uniforms = {
      time: { type: "f", value: 1.0 },
      resolution: { type: "v2", value: new THREE.Vector2() },
    }

    const vertexShader = `
      void main() {
        gl_Position = vec4( position, 1.0 );
      }
    `

    const fragmentShader = `
      #define TWO_PI 6.2831853072
      #define PI 3.14159265359

      precision highp float;
      uniform vec2 resolution;
      uniform float time;
        
      float random (in float x) {
          return fract(sin(x)*1e4);
      }
      float random (vec2 st) {
          return fract(sin(dot(st.xy,
                               vec2(12.9898,78.233)))*
              43758.5453123);
      }
      
      varying vec2 vUv;

      void main(void) {
        vec2 uv = (gl_FragCoord.xy * 2.0 - resolution.xy) / min(resolution.x, resolution.y);
        
        vec2 fMosaicScal = vec2(4.0, 2.0);
        vec2 vScreenSize = vec2(256,256);
        uv.x = floor(uv.x * vScreenSize.x / fMosaicScal.x) / (vScreenSize.x / fMosaicScal.x);
        uv.y = floor(uv.y * vScreenSize.y / fMosaicScal.y) / (vScreenSize.y / fMosaicScal.y);       
          
        float t = time*0.06+random(uv.x)*0.4;
        float lineWidth = 0.0008;

        vec3 color = vec3(0.0);
        for(int j = 0; j < 3; j++){
          for(int i=0; i < 5; i++){
            color[j] += lineWidth*float(i*i) / abs(fract(t - 0.01*float(j)+float(i)*0.01)*1.0 - length(uv));        
          }
        }

        gl_FragColor = vec4(color[2],color[1],color[0],1.0);
      }
    `

    const material = new THREE.ShaderMaterial({
      uniforms,
      vertexShader,
      fragmentShader,
    })

    const mesh = new THREE.Mesh(geometry, material)
    scene.add(mesh)

    const renderer = new THREE.WebGLRenderer()
    renderer.setPixelRatio(Math.min(window.devicePixelRatio ?? 1, 1.5))
    container.appendChild(renderer.domElement)

    sceneRef.current = {
      camera,
      scene,
      renderer,
      uniforms,
      animationId: null,
    }

    const onWindowResize = () => {
      const rect = container.getBoundingClientRect()
      const width = rect.width || 1
      const height = rect.height || 1
      renderer.setSize(width, height)
      uniforms.resolution.value.x = renderer.domElement.width
      uniforms.resolution.value.y = renderer.domElement.height
    }

    onWindowResize()
    window.addEventListener("resize", onWindowResize, false)

    const animate = () => {
      sceneRef.current.animationId = requestAnimationFrame(animate)
      uniforms.time.value += 0.05
      renderer.render(scene, camera)
    }

    animate()

    return () => {
      if (sceneRef.current.animationId) cancelAnimationFrame(sceneRef.current.animationId)
      window.removeEventListener("resize", onWindowResize)
      renderer.dispose()
    }
  }

  if (!enabled) {
    return (
      <div
        ref={containerRef}
        className="absolute inset-0 h-full w-full bg-[radial-gradient(circle_at_30%_20%,rgba(59,130,246,0.2),transparent_45%),radial-gradient(circle_at_70%_30%,rgba(16,185,129,0.18),transparent_40%),linear-gradient(135deg,rgba(0,0,0,0.35),rgba(0,0,0,0.6))]"
      />
    )
  }

  return <div ref={containerRef} className="absolute inset-0 h-full w-full" />
}

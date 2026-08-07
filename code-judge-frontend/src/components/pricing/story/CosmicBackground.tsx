'use client'

import { useEffect, useRef } from 'react'
import { useMotionValue, useSpring, useMotionValueEvent, MotionValue } from 'framer-motion'

interface Particle {
  x: number
  y: number
  z: number
  size: number
  speed: number
  opacity: number
  hue: number
  twinkleSpeed: number
  twinklePhase: number
}

interface ShootingStar {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  maxLife: number
}

interface Props {
  progress: MotionValue<number>
}

/**
 * Single-canvas cosmic background.
 * Renders stars, nebula glows, shooting stars and mouse-reactive parallax.
 * Scroll progress drives density, speed and camera zoom.
 * GPU-friendly: one canvas, requestAnimationFrame, delta-time.
 */
export default function CosmicBackground({ progress }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const mouseX = useMotionValue(0.5)
  const mouseY = useMotionValue(0.5)
  const smoothMouseX = useSpring(mouseX, { stiffness: 40, damping: 16 })
  const smoothMouseY = useSpring(mouseY, { stiffness: 40, damping: 16 })

  const progressRef = useRef(0)
  const mouseRef = useRef({ x: 0.5, y: 0.5 })
  const particlesRef = useRef<Particle[]>([])
  const shootingStarsRef = useRef<ShootingStar[]>([])
  const rafRef = useRef<number>(0)
  const lastTimeRef = useRef<number>(0)

  useMotionValueEvent(progress, 'change', (v) => {
    progressRef.current = v
  })
  useMotionValueEvent(smoothMouseX, 'change', (v) => {
    mouseRef.current.x = v
  })
  useMotionValueEvent(smoothMouseY, 'change', (v) => {
    mouseRef.current.y = v
  })

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d', { alpha: true })
    if (!ctx) return

    let width = 0
    let height = 0
    let dpr = 1

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2)
      width = window.innerWidth
      height = window.innerHeight
      canvas.width = width * dpr
      canvas.height = height * dpr
      canvas.style.width = `${width}px`
      canvas.style.height = `${height}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()
    window.addEventListener('resize', resize)

    const generateParticles = () => {
      const count = Math.min(Math.floor((width * height) / 9000), 200)
      const particles: Particle[] = []
      for (let i = 0; i < count; i++) {
        particles.push({
          x: Math.random() * width,
          y: Math.random() * height,
          z: 0.2 + Math.random() * 0.8,
          size: 0.5 + Math.random() * 2.2,
          speed: 0.02 + Math.random() * 0.06,
          opacity: 0.2 + Math.random() * 0.6,
          hue: Math.random() < 0.6 ? 260 + Math.random() * 40 : 320 + Math.random() * 30,
          twinkleSpeed: 0.5 + Math.random() * 2,
          twinklePhase: Math.random() * Math.PI * 2,
        })
      }
      particlesRef.current = particles
    }
    generateParticles()

    const spawnShootingStar = () => {
      shootingStarsRef.current.push({
        x: Math.random() * width * 0.8,
        y: Math.random() * height * 0.3,
        vx: 4 + Math.random() * 3,
        vy: 1.5 + Math.random() * 1.5,
        life: 0,
        maxLife: 60 + Math.random() * 40,
      })
    }

    let shootingStarTimer: ReturnType<typeof setTimeout>
    const scheduleShootingStar = () => {
      shootingStarTimer = setTimeout(() => {
        spawnShootingStar()
        scheduleShootingStar()
      }, 5000 + Math.random() * 7000)
    }
    scheduleShootingStar()

    const drawNebula = (
      x: number,
      y: number,
      radius: number,
      color: string,
      alpha: number
    ) => {
      const grad = ctx.createRadialGradient(x, y, 0, x, y, radius)
      grad.addColorStop(0, `${color}${alpha})`)
      grad.addColorStop(1, `${color}0)`)
      ctx.fillStyle = grad
      ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2)
    }

    const animate = (time: number) => {
      const dt = lastTimeRef.current ? Math.min((time - lastTimeRef.current) / 16.67, 3) : 1
      lastTimeRef.current = time

      const p = progressRef.current
      const mx = mouseRef.current.x
      const my = mouseRef.current.y

      ctx.clearRect(0, 0, width, height)

      // Deep space gradient
      const grad = ctx.createLinearGradient(0, 0, width, height)
      grad.addColorStop(0, '#050510')
      grad.addColorStop(0.5, '#0a0a1e')
      grad.addColorStop(1, '#120b24')
      ctx.fillStyle = grad
      ctx.fillRect(0, 0, width, height)

      // Nebula glows — intensity grows with scroll
      const nebulaAlpha = 0.1 + p * 0.1
      drawNebula(width * 0.2, height * 0.3, 320, 'rgba(124, 58, 237, ', nebulaAlpha)
      drawNebula(width * 0.8, height * 0.7, 360, 'rgba(236, 72, 153, ', nebulaAlpha)
      drawNebula(width * 0.5, height * 0.5, 260, 'rgba(99, 102, 241, ', nebulaAlpha * 0.7)

      // Mouse parallax
      const parallaxX = (mx - 0.5) * 24 * (1 + p)
      const parallaxY = (my - 0.5) * 24 * (1 + p)

      // Scroll-driven speed & zoom
      const speedMult = 0.3 + p * 1.4
      const zoom = 1 + p * 0.35

      // Particles
      for (const particle of particlesRef.current) {
        particle.y -= particle.speed * speedMult * dt
        if (particle.y < -10) {
          particle.y = height + 10
          particle.x = Math.random() * width
        }

        const twinkle = 0.6 + 0.4 * Math.sin(time * 0.001 * particle.twinkleSpeed + particle.twinklePhase)
        const depth = particle.z
        const px = (particle.x - width / 2) * (1 + (depth - 0.5) * 0.3) + width / 2 + parallaxX * depth
        const py = (particle.y - height / 2) * (1 + (depth - 0.5) * 0.3) + height / 2 + parallaxY * depth
        const zx = (px - width / 2) * zoom + width / 2
        const zy = (py - height / 2) * zoom + height / 2

        const alpha = particle.opacity * twinkle * (0.5 + depth * 0.5)
        const size = particle.size * (0.5 + depth * 0.8)

        ctx.beginPath()
        ctx.arc(zx, zy, size, 0, Math.PI * 2)
        ctx.fillStyle = `hsla(${particle.hue}, 80%, 75%, ${alpha})`
        ctx.fill()

        if (size > 1.5) {
          ctx.beginPath()
          ctx.arc(zx, zy, size * 2.5, 0, Math.PI * 2)
          ctx.fillStyle = `hsla(${particle.hue}, 80%, 75%, ${alpha * 0.15})`
          ctx.fill()
        }
      }

      // Shooting stars
      for (let i = shootingStarsRef.current.length - 1; i >= 0; i--) {
        const ss = shootingStarsRef.current[i]
        ss.life += dt
        ss.x += ss.vx * dt
        ss.y += ss.vy * dt

        const lifeRatio = ss.life / ss.maxLife
        if (lifeRatio >= 1) {
          shootingStarsRef.current.splice(i, 1)
          continue
        }

        const alpha = Math.sin(lifeRatio * Math.PI) * 0.8
        const tailLength = 90
        const angle = Math.atan2(ss.vy, ss.vx)

        ctx.beginPath()
        ctx.moveTo(ss.x, ss.y)
        ctx.lineTo(ss.x - Math.cos(angle) * tailLength, ss.y - Math.sin(angle) * tailLength)
        ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`
        ctx.lineWidth = 1.5
        ctx.stroke()

        ctx.beginPath()
        ctx.arc(ss.x, ss.y, 2, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`
        ctx.fill()
      }

      rafRef.current = requestAnimationFrame(animate)
    }

    rafRef.current = requestAnimationFrame(animate)

    return () => {
      cancelAnimationFrame(rafRef.current)
      clearTimeout(shootingStarTimer)
      window.removeEventListener('resize', resize)
    }
  }, [])

  const handleMouseMove = (e: React.MouseEvent) => {
    mouseX.set(e.clientX / window.innerWidth)
    mouseY.set(e.clientY / window.innerHeight)
  }

  return (
    <canvas
      ref={canvasRef}
      onMouseMove={handleMouseMove}
      className="pointer-events-none fixed inset-0 -z-10 h-full w-full"
      aria-hidden="true"
    />
  )
}
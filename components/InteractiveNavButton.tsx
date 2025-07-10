'use client'

import { useState, useRef, useMemo } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'

interface InteractiveNavButtonProps {
  href: string
  children: React.ReactNode
  className?: string
}

export function InteractiveNavButton({ href, children, className = '' }: InteractiveNavButtonProps) {
  const [isHovered, setIsHovered] = useState(false)
  const [ripples, setRipples] = useState<Array<{ x: number; y: number; id: number }>>([])
  const buttonRef = useRef<HTMLAnchorElement>(null)
  const pathname = usePathname()
  const isActive = pathname === href

  const getActiveStyles = (pathname: string, href: string) => {
    if (pathname !== href) return ''

    switch (href) {
      case '/':
        return 'bg-orange-500/20 border-orange-400 text-orange-400 shadow-[0_0_25px_rgba(251,146,60,0.6)]'
      case '/events':
        return 'bg-purple-500/20 border-purple-400 text-purple-400 shadow-[0_0_25px_rgba(168,85,247,0.6)]'
      case '/invite':
        return 'bg-emerald-500/20 border-emerald-400 text-emerald-400 shadow-[0_0_25px_rgba(16,185,129,0.6)]'
      default:
        return 'bg-cyan-500/20 border-cyan-400 text-cyan-400 shadow-[0_0_25px_rgba(34,211,238,0.6)]'
    }
  }

  const activeStyles = getActiveStyles(pathname, href)

  const buttonStyles = useMemo(() => `
    relative px-6 py-3 text-sm font-medium uppercase tracking-wider
    bg-white/5 backdrop-blur-sm border border-cyan-400/50
    text-cyan-400 rounded-lg overflow-hidden interactive-nav-button
    transition-all duration-300 ease-out cursor-pointer
    hover:scale-105 hover:bg-white/10 hover:border-cyan-400
    hover:shadow-[0_0_20px_rgba(34,211,238,0.3)]
    focus:outline-none focus:ring-2 focus:ring-cyan-400/50
    ${activeStyles}
    ${className}
  `, [activeStyles, className])

  const handleClick = (e: React.MouseEvent) => {
    const rect = buttonRef.current?.getBoundingClientRect()
    if (rect) {
      const newRipple = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
        id: Date.now()
      }
      setRipples(prev => [...prev, newRipple])

      // Remove ripple after animation
      setTimeout(() => {
        setRipples(prev => prev.filter(r => r.id !== newRipple.id))
      }, 600)
    }
  }

  return (
    <Link
      ref={buttonRef}
      href={href}
      className={buttonStyles}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleClick}
    >
      {/* Enhanced Ripple Effects - Phase 2 Requirement */}
      {ripples.map((ripple) => (
        <motion.span
          key={ripple.id}
          className="absolute rounded-full border-2 border-red-500 pointer-events-none z-50"
          style={{
            left: ripple.x - 20,
            top: ripple.y - 20,
            width: 40,
            height: 40,
          }}
          initial={{ scale: 0, opacity: 0.6 }}
          animate={{
            scale: [0, 2, 3],
            opacity: [0.6, 0.3, 0]
          }}
          transition={{
            duration: 0.6,
            ease: 'easeOut'
          }}
        />
      ))}

      {/* Enhanced Particle Dots Effect - Phase 2 Requirement */}
      {isHovered && (
        <motion.div
          className="absolute inset-0 pointer-events-none z-40"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          {[...Array(16)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-1 h-1 bg-current rounded-full opacity-70"
              style={{
                left: `${10 + (i % 4) * 25}%`,
                top: `${15 + Math.floor(i / 4) * 25}%`,
              }}
              initial={{ opacity: 0, scale: 0 }}
              animate={{ 
                opacity: [0, 0.8, 0],
                scale: [0, 1.2, 0],
                y: [0, -12, 0]
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                delay: i * 0.08,
                ease: 'easeInOut'
              }}
            />
          ))}
        </motion.div>
      )}

      {/* Enhanced Scan Line Effect - Phase 2 Requirement */}
      <motion.span
        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent transform -skew-x-12 pointer-events-none z-30"
        initial={{ x: '-150%' }}
        animate={{
          x: isHovered ? '150%' : '-150%'
        }}
        transition={{ 
          duration: 0.8,
          ease: 'easeInOut',
          delay: isHovered ? 0.1 : 0
        }}
      />

      {/* Active Page Indicator */}
      {isActive && (
        <motion.span 
          className={`absolute bottom-0 left-0 right-0 h-0.5 shadow-[0_0_8px_currentColor]`}
          style={{
            backgroundColor: 'currentColor'
          }}
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 0.3 }}
        />
      )}

      {/* Button Content */}
      <span className="relative z-10">
        {children}
      </span>
    </Link>
  )
}

'use client'

import { useState, useRef, useMemo } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'

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
    relative inline-flex items-center justify-center
    px-8 py-3 text-sm font-bold uppercase tracking-wider
    min-w-[140px] text-center
    bg-gray-800/50 backdrop-blur-sm border-2 border-cyan-400/30
    text-cyan-400 rounded-lg overflow-hidden interactive-nav-button
    transition-all duration-300 ease-out cursor-pointer
    hover:bg-gray-700/50 hover:border-cyan-400/60
    hover:shadow-[0_0_25px_rgba(34,211,238,0.4)]
    hover:transform hover:scale-105
    focus:outline-none focus:ring-2 focus:ring-cyan-400/50 focus:ring-offset-2 focus:ring-offset-gray-900
    active:transform active:scale-95
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
      {/* Ripple Effects */}
      {ripples.map((ripple) => (
        <span
          key={ripple.id}
          className="absolute pointer-events-none"
          style={{
            left: ripple.x,
            top: ripple.y,
            transform: 'translate(-50%, -50%)',
          }}
        >
          <span className="block w-10 h-10 rounded-full border-2 border-current opacity-100 animate-ripple-expand" />
        </span>
      ))}

      {/* Particle Dots Effect */}
      {isHovered && (
        <div className="absolute inset-1 pointer-events-none animate-fade-in overflow-hidden">
          {[...Array(16)].map((_, i) => (
            <div
              key={i}
              className="absolute w-1 h-1 bg-current rounded-full animate-particle-float"
              style={{
                left: `${15 + (i % 4) * 20}%`,
                top: `${20 + Math.floor(i / 4) * 20}%`,
                animationDelay: `${i * 0.08}s`,
              }}
            />
          ))}
        </div>
      )}

      {/* Scan Line Effect */}
      <span
        className={`
          absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent 
          transform -skew-x-12 pointer-events-none transition-transform duration-800
          ${isHovered ? 'animate-scan-line' : 'translate-x-[-150%]'}
        `}
      />

      {/* Active Page Indicator */}
      {isActive && (
        <span 
          className="absolute bottom-0 left-0 right-0 h-0.5 shadow-[0_0_8px_currentColor] animate-fade-in"
          style={{ backgroundColor: 'currentColor' }}
        />
      )}

      {/* Button Content */}
      <span className="relative z-10">
        {children}
      </span>
    </Link>
  )
}

'use client'

import { useState, useRef } from 'react'
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
      className={`
        relative px-6 py-3 text-sm font-medium uppercase tracking-wider
        bg-white/5 backdrop-blur-sm border border-cyan-400/50 
        text-cyan-400 rounded-lg overflow-hidden
        transition-all duration-300 ease-out cursor-pointer
        hover:scale-105 hover:bg-white/10 hover:border-cyan-400
        hover:shadow-[0_0_20px_rgba(34,211,238,0.3)]
        focus:outline-none focus:ring-2 focus:ring-cyan-400/50
        ${isActive ? 'bg-white/15 border-cyan-400 shadow-[0_0_30px_rgba(34,211,238,0.4)]' : ''}
        ${className}
      `}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleClick}
    >
      {/* Ripple Effects */}
      {ripples.map((ripple) => (
        <span
          key={ripple.id}
          className="absolute rounded-full bg-cyan-400 opacity-30 pointer-events-none animate-ping"
          style={{
            left: ripple.x - 6,
            top: ripple.y - 6,
            width: 12,
            height: 12,
            animationDuration: '0.6s'
          }}
        />
      ))}

      {/* Scan Line Effect */}
      <span 
        className={`
          absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent
          transform -skew-x-12 transition-transform duration-500 pointer-events-none
          ${isHovered ? 'translate-x-full' : '-translate-x-full'}
        `}
      />

      {/* Particle Dots */}
      {isHovered && (
        <div className="absolute inset-0 pointer-events-none">
          {[...Array(6)].map((_, i) => (
            <span
              key={i}
              className="absolute w-0.5 h-0.5 bg-cyan-400 rounded-full opacity-30 animate-pulse"
              style={{
                left: `${20 + (i * 12)}%`,
                top: `${30 + (i % 2 * 40)}%`,
                animationDelay: `${i * 100}ms`,
                animationDuration: '1.5s'
              }}
            />
          ))}
        </div>
      )}

      {/* Active Page Indicator */}
      {isActive && (
        <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.8)]" />
      )}

      {/* Button Content */}
      <span className="relative z-10">
        {children}
      </span>
    </Link>
  )
}

import { useRef, useState, type ReactNode } from 'react'
import { cn } from '../../lib/utils'

export function GlowingCard({
  children,
  className,
  glowColor = 'rgba(99,102,241,0.10)',
}: {
  children?: ReactNode
  className?: string
  glowColor?: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [isHovered, setIsHovered] = useState(false)

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    const rect = ref.current?.getBoundingClientRect()
    if (!rect) return
    setPosition({ x: e.clientX - rect.left, y: e.clientY - rect.top })
  }

  return (
    <div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={cn(
        'relative overflow-hidden rounded-xl bg-white dark:bg-zinc-900 transition-all duration-200',
        isHovered
          ? 'border border-zinc-200 dark:border-zinc-700 shadow-[0_4px_16px_rgba(0,0,0,0.06)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.35)]'
          : 'border border-zinc-100 dark:border-zinc-800/80',
        className
      )}
    >
      {isHovered && (
        <div
          className="pointer-events-none absolute inset-0 transition-opacity duration-300 rounded-xl"
          style={{
            background: `radial-gradient(320px circle at ${position.x}px ${position.y}px, ${glowColor}, transparent 60%)`,
          }}
        />
      )}
      {children}
    </div>
  )
}

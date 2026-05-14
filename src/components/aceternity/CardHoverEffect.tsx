import { useState, type ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '../../lib/utils'

interface HoverItem {
  title: string
  description: string
  link?: string
}

export function HoverEffect({ items, className }: { items: HoverItem[]; className?: string }) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)

  return (
    <div className={cn('grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 py-10', className)}>
      {items.map((item, idx) => (
        <div
          key={item.link || idx}
          className="relative group block p-2 h-full w-full"
          onMouseEnter={() => setHoveredIndex(idx)}
          onMouseLeave={() => setHoveredIndex(null)}
        >
          <AnimatePresence>
            {hoveredIndex === idx && (
              <motion.span
                className="absolute inset-0 h-full w-full bg-primary/10 block rounded-2xl"
                layoutId="hoverBackground"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1, transition: { duration: 0.15 } }}
                exit={{ opacity: 0, transition: { duration: 0.15, delay: 0.2 } }}
              />
            )}
          </AnimatePresence>
          <HoverCard>
            <HoverCardTitle>{item.title}</HoverCardTitle>
            <HoverCardDescription>{item.description}</HoverCardDescription>
          </HoverCard>
        </div>
      ))}
    </div>
  )
}

function HoverCard({ className, children }: { className?: string; children?: ReactNode }) {
  return (
    <div className={cn('rounded-2xl h-full w-full p-4 overflow-hidden bg-card border border-border group-hover:border-primary/40 relative z-20 transition-colors', className)}>
      <div className="relative z-50 p-4">
        {children}
      </div>
    </div>
  )
}

function HoverCardTitle({ className, children }: { className?: string; children?: ReactNode }) {
  return (
    <h4 className={cn('text-zinc-900 dark:text-white font-bold tracking-wide mt-4 text-base', className)}>
      {children}
    </h4>
  )
}

function HoverCardDescription({ className, children }: { className?: string; children?: ReactNode }) {
  return (
    <p className={cn('mt-2 text-zinc-500 dark:text-zinc-400 tracking-wide leading-relaxed text-sm', className)}>
      {children}
    </p>
  )
}

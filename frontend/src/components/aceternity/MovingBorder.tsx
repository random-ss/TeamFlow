import { useRef, type ReactNode, type ElementType } from 'react'
import { motion, useAnimationFrame, useMotionTemplate, useMotionValue, useTransform } from 'framer-motion'
import { cn } from '../../lib/utils'

export function MovingBorder({
  children,
  duration = 2000,
  className,
  containerClassName,
  borderClassName,
  as: Tag = 'button' as ElementType,
  ...props
}: {
  children?: ReactNode
  duration?: number
  className?: string
  containerClassName?: string
  borderClassName?: string
  as?: ElementType
  [key: string]: any
}) {
  const pathRef = useRef<SVGRectElement>(null)
  const progress = useMotionValue(0)

  useAnimationFrame((time) => {
    const length = pathRef.current?.getTotalLength()
    if (length) {
      const pxPerMs = length / duration
      progress.set((time * pxPerMs) % length)
    }
  })

  const x = useTransform(progress, (val) => pathRef.current?.getPointAtLength(val).x)
  const y = useTransform(progress, (val) => pathRef.current?.getPointAtLength(val).y)
  const transform = useMotionTemplate`translateX(${x}px) translateY(${y}px) translateX(-50%) translateY(-50%)`

  return (
    <Tag className={cn('relative h-10 w-40 overflow-hidden rounded-full bg-transparent p-[1px] text-xl', containerClassName)} {...props}>
      <div className="absolute inset-0 rounded-[inherit]" style={{ overflow: 'hidden' }}>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          preserveAspectRatio="none"
          className="absolute h-full w-full"
          width="100%"
          height="100%"
        >
          <rect fill="none" width="100%" height="100%" rx="50%" ry="50%" ref={pathRef} />
        </svg>
        <motion.div
          style={{ position: 'absolute', top: 0, left: 0, display: 'inline-block', transform }}
        >
          <div className={cn('h-20 w-20 opacity-[0.8] bg-[radial-gradient(circle_at_center,theme(colors.brand.500)_0%,transparent_60%)]', borderClassName)} />
        </motion.div>
      </div>
      <div className={cn('relative flex h-full w-full items-center justify-center rounded-[inherit] bg-slate-900/[0.8] text-sm font-medium text-white antialiased backdrop-blur-xl', className)}>
        {children}
      </div>
    </Tag>
  )
}

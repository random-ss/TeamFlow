import { useEffect } from 'react'
import { motion, stagger, useAnimate } from 'framer-motion'
import { cn } from '../../lib/utils'

export function TextGenerateEffect({
  words,
  className,
  filter = true,
  duration = 0.5,
}: {
  words: string
  className?: string
  filter?: boolean
  duration?: number
}) {
  const [scope, animate] = useAnimate()
  const wordsArray = words.split(' ')

  useEffect(() => {
    animate(
      'span',
      { opacity: 1, filter: filter ? 'blur(0px)' : 'none' },
      { duration, delay: stagger(0.2) }
    )
  }, [scope])

  return (
    <div className={cn('font-bold', className)}>
      <div className="mt-4">
        <div className="text-zinc-900 dark:text-white text-2xl leading-snug tracking-wide">
          <motion.div ref={scope}>
            {wordsArray.map((word, i) => (
              <motion.span
                key={i}
                className="opacity-0 inline-block mr-1"
                style={{ filter: filter ? 'blur(10px)' : 'none' }}
              >
                {word}
              </motion.span>
            ))}
          </motion.div>
        </div>
      </div>
    </div>
  )
}

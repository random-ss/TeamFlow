import { useState } from 'react'

interface AvatarProps {
  name?: string
  src?: string
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  online?: boolean
  className?: string
}

export function Avatar({ name, src, size = 'md', online, className = '' }: AvatarProps) {
  const [imgError, setImgError] = useState(false)
  const sizes = {
    xs: 'w-6 h-6 text-[10px]',
    sm: 'w-8 h-8 text-sm',
    md: 'w-9 h-9 text-sm',
    lg: 'w-11 h-11 text-base',
    xl: 'w-14 h-14 text-lg',
  }
  const initials = name
    ? name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : '?'

  const colors = ['bg-indigo-500', 'bg-violet-500', 'bg-blue-500', 'bg-emerald-500', 'bg-rose-500', 'bg-amber-500']
  const color = colors[(name?.charCodeAt(0) || 0) % colors.length]

  const showImage = src && !imgError

  return (
    <div className={`relative inline-flex shrink-0 ${className}`}>
      {showImage ? (
        <img
          src={src}
          alt={name || 'User'}
          className={`${sizes[size]} rounded-full object-cover`}
          onError={() => setImgError(true)}
        />
      ) : (
        <div className={`${sizes[size]} ${color} rounded-full flex items-center justify-center text-white font-semibold`}>
          {initials}
        </div>
      )}
      {online !== undefined && (
        <span
          className={`absolute bottom-0 right-0 block rounded-full ring-2 ring-background w-2.5 h-2.5 ${
            online ? 'bg-emerald-400' : 'bg-muted-foreground/40'
          }`}
        />
      )}
    </div>
  )
}

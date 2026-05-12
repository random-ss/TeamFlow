import { type LucideIcon } from 'lucide-react'
import { type ReactNode } from 'react'

interface EmptyStateProps {
  icon?: LucideIcon
  title: string
  description?: string
  action?: ReactNode
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center animate-fade-in">
      {Icon && (
        <div className="w-12 h-12 bg-muted rounded-2xl flex items-center justify-center mb-4 border border-border">
          <Icon className="w-5 h-5 text-muted-foreground" />
        </div>
      )}
      <h3 className="text-sm font-semibold text-foreground mb-1">{title}</h3>
      {description && (
        <p className="text-sm text-muted-foreground mb-5 max-w-xs leading-relaxed">{description}</p>
      )}
      {action}
    </div>
  )
}

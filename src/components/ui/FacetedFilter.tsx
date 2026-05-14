import { useState } from 'react'
import { Check, PlusCircle, X } from 'lucide-react'
import { cn } from '../../lib/utils'
import { Separator } from './separator'

interface FilterOption {
  label: string
  value: string
  icon?: React.ComponentType<{ className?: string }>
  count?: number
}

interface FacetedFilterProps {
  title: string
  values: string[]
  onChange: (values: string[]) => void
  options: FilterOption[]
}

export function FacetedFilter({ title, values, onChange, options }: FacetedFilterProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')

  const filtered = search.trim()
    ? options.filter((o) => o.label.toLowerCase().includes(search.toLowerCase()))
    : options

  function toggle(value: string) {
    if (values.includes(value)) {
      onChange(values.filter((v) => v !== value))
    } else {
      onChange([...values, value])
    }
  }

  const hasSelection = values.length > 0

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'flex h-8 items-center gap-1.5 rounded-md border border-dashed px-2 text-xs font-medium transition-colors',
          'border-border text-foreground hover:bg-muted',
          open && 'bg-muted'
        )}
      >
        <PlusCircle className="size-3.5" />
        {title}
        {hasSelection && (
          <>
            <Separator orientation="vertical" className="mx-1 h-4" />
            {values.length === 1 ? (
              <span className="rounded-sm bg-muted px-1.5 py-0.5 font-normal text-foreground">
                {options.find((o) => o.value === values[0])?.label ?? values[0]}
              </span>
            ) : (
              <span className="rounded-sm bg-muted px-1.5 py-0.5 font-normal text-foreground">
                {values.length} selected
              </span>
            )}
          </>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => { setOpen(false); setSearch('') }} />
          <div className="absolute top-full left-0 z-50 mt-1 w-52 rounded-md border border-border bg-popover shadow-md">
            <div className="px-2 py-1.5 border-b border-border">
              <input
                autoFocus
                type="text"
                placeholder={title}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-transparent text-xs text-foreground placeholder:text-muted-foreground focus-visible:outline-none"
              />
            </div>
            <div className="py-1 max-h-48 overflow-y-auto">
              {filtered.length === 0 ? (
                <p className="py-2 text-center text-xs text-muted-foreground">No results found.</p>
              ) : (
                filtered.map((option) => {
                  const isSelected = values.includes(option.value)
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => toggle(option.value)}
                      className="flex w-full items-center gap-2 px-2 py-1.5 text-xs text-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
                    >
                      <div className={cn(
                        'flex size-4 items-center justify-center rounded-sm border border-primary',
                        isSelected ? 'bg-primary text-primary-foreground' : 'opacity-50 [&_svg]:invisible'
                      )}>
                        <Check className="h-3 w-3" />
                      </div>
                      {option.icon && <option.icon className="size-4 text-muted-foreground" />}
                      <span className="flex-1 text-left">{option.label}</span>
                      {option.count !== undefined && (
                        <span className="ms-auto flex h-4 min-w-4 items-center justify-center font-mono text-[11px] text-muted-foreground">
                          {option.count}
                        </span>
                      )}
                    </button>
                  )
                })
              )}
            </div>
            {hasSelection && (
              <>
                <Separator />
                <div className="py-1">
                  <button
                    type="button"
                    onClick={() => { onChange([]); setOpen(false); setSearch('') }}
                    className="w-full flex items-center justify-center gap-1.5 py-1.5 text-center text-xs text-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
                  >
                    <X className="w-3 h-3" />
                    Clear filter
                  </button>
                </div>
              </>
            )}
          </div>
        </>
      )}
    </div>
  )
}

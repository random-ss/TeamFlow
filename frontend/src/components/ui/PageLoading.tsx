export function PageLoading({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[360px] gap-3 select-none">
      <div className="relative w-9 h-9">
        <div className="absolute inset-0 rounded-full border-2 border-primary/15" />
        <div className="absolute inset-0 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  )
}

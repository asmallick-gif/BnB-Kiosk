const phpFormatter = new Intl.NumberFormat('en-PH', {
  style: 'currency',
  currency: 'PHP',
})

export function formatPhp(amount: number): string {
  return phpFormatter.format(amount)
}

export function formatElapsedDuration(createdAt: string, nowMs: number): string {
  const created = Date.parse(createdAt)
  const diffSeconds = Number.isNaN(created)
    ? 0
    : Math.max(0, Math.floor((nowMs - created) / 1000))
  const hours = Math.floor(diffSeconds / 3600)
  const minutes = Math.floor((diffSeconds % 3600) / 60)
  const seconds = diffSeconds % 60
  return [hours, minutes, seconds].map((unit) => String(unit).padStart(2, '0')).join(':')
}

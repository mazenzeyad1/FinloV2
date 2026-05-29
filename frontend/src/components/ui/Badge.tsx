interface BadgeProps {
  children: React.ReactNode
  variant?: 'primary' | 'success' | 'danger' | 'warning' | 'neutral'
}

export function Badge({ children, variant = 'neutral' }: BadgeProps) {
  return (
    <span className={`badge badge-${variant}`}>{children}</span>
  )
}

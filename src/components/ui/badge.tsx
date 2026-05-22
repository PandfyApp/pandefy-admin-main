import { cn } from '../../lib/utils'

type BadgeProps = React.HTMLAttributes<HTMLSpanElement> & { variant?: 'default' | 'secondary' | 'destructive' }

export default function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  const variants = {
    default: 'bg-secondary text-secondary-foreground',
    secondary: 'bg-muted text-muted-foreground',
    destructive: 'bg-destructive text-destructive-foreground',
  }[variant]
  return <span className={cn('inline-flex items-center rounded-md px-2 py-1 text-xs font-medium', variants, className)} {...props} />
}

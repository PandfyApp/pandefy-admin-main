import { cn } from '../../lib/utils'

export default function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  const base = 'flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50'
  return <input className={cn(base, className)} {...props} />
}

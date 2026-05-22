import * as RadixSelect from '@radix-ui/react-select'
import { cn } from '../../lib/utils'

export type SelectProps = RadixSelect.SelectProps
export const Select = (props: SelectProps) => <RadixSelect.Root {...props} />

export function SelectValue(props: RadixSelect.SelectValueProps) {
  return <RadixSelect.Value {...props} />
}

type TriggerProps = RadixSelect.SelectTriggerProps & { placeholder?: string }
export function SelectTrigger({ className, placeholder = 'Select…', ...props }: TriggerProps) {
  return (
    <RadixSelect.Trigger
      className={cn(
        'inline-flex items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm',
        'focus:outline-none focus:ring-2 focus:ring-ring w-full',
        className,
      )}
      {...props}
    >
      <RadixSelect.Value placeholder={placeholder} />
      <RadixSelect.Icon>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M7 10l5 5 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </RadixSelect.Icon>
    </RadixSelect.Trigger>
  )
}

type ContentProps = RadixSelect.SelectContentProps
export function SelectContent({ className, children, ...props }: ContentProps & { children?: React.ReactNode }) {
  return (
    <RadixSelect.Portal>
      <RadixSelect.Content
        className={cn('z-50 min-w-[8rem] overflow-hidden rounded-md border border-border bg-popover text-popover-foreground shadow-md', className)}
        {...props}
      >
        <RadixSelect.Viewport className="p-1">{children}</RadixSelect.Viewport>
      </RadixSelect.Content>
    </RadixSelect.Portal>
  )
}

type ItemProps = RadixSelect.SelectItemProps
export function SelectItem({ className, children, ...props }: ItemProps) {
  return (
    <RadixSelect.Item
      className={cn('relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-muted hover:text-foreground', className)}
      {...props}
    >
      <RadixSelect.ItemText>{children}</RadixSelect.ItemText>
      <RadixSelect.ItemIndicator className="absolute right-2">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </RadixSelect.ItemIndicator>
    </RadixSelect.Item>
  )
}

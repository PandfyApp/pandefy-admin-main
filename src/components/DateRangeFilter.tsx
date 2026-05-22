import { DateRangePreset, DateRangeValue } from '../lib/dateRanges'
import { Select, SelectContent, SelectItem, SelectTrigger } from './ui/select'
import Input from './ui/input'

const options: { value: DateRangePreset; label: string }[] = [
  { value: 'TODAY', label: 'Today' },
  { value: 'YESTERDAY', label: 'Yesterday' },
  { value: 'THIS_WEEK', label: 'This Week' },
  { value: 'THIS_MONTH', label: 'This Month' },
  { value: 'LAST_MONTH', label: 'Last Month' },
  { value: 'CUSTOM', label: 'Custom Range' },
]

export default function DateRangeFilter({
  value,
  onChange,
}: {
  value: DateRangeValue
  onChange: (value: DateRangeValue) => void
}) {
  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
      <div className="min-w-[180px] space-y-1">
        <label className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Time Range</label>
        <Select value={value.preset} onValueChange={(preset) => onChange({ ...value, preset: preset as DateRangePreset })}>
          <SelectTrigger className="min-w-[180px]" placeholder="Select range" />
          <SelectContent>
            {options.map((option) => (
              <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {value.preset === 'CUSTOM' && (
        <>
          <div className="space-y-1">
            <label className="text-xs uppercase tracking-[0.18em] text-muted-foreground">From</label>
            <Input type="date" value={value.from || ''} onChange={(e) => onChange({ ...value, from: e.target.value })} />
          </div>
          <div className="space-y-1">
            <label className="text-xs uppercase tracking-[0.18em] text-muted-foreground">To</label>
            <Input type="date" value={value.to || ''} onChange={(e) => onChange({ ...value, to: e.target.value })} />
          </div>
        </>
      )}
    </div>
  )
}

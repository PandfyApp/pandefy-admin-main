export type DateRangePreset =
  | 'TODAY'
  | 'YESTERDAY'
  | 'THIS_WEEK'
  | 'THIS_MONTH'
  | 'LAST_MONTH'
  | 'CUSTOM'

export type DateRangeValue = {
  preset: DateRangePreset
  from?: string
  to?: string
}

const startOfDay = (value: Date) => {
  const date = new Date(value)
  date.setHours(0, 0, 0, 0)
  return date
}

const endOfDay = (value: Date) => {
  const date = new Date(value)
  date.setHours(23, 59, 59, 999)
  return date
}

const startOfWeek = (value: Date) => {
  const date = startOfDay(value)
  const day = date.getDay()
  const diff = day === 0 ? -6 : 1 - day
  date.setDate(date.getDate() + diff)
  return date
}

const startOfMonth = (value: Date) => new Date(value.getFullYear(), value.getMonth(), 1, 0, 0, 0, 0)
const endOfMonth = (value: Date) => new Date(value.getFullYear(), value.getMonth() + 1, 0, 23, 59, 59, 999)

export const presetLabel = (preset: DateRangePreset) => {
  switch (preset) {
    case 'TODAY': return 'Today'
    case 'YESTERDAY': return 'Yesterday'
    case 'THIS_WEEK': return 'This Week'
    case 'THIS_MONTH': return 'This Month'
    case 'LAST_MONTH': return 'Last Month'
    case 'CUSTOM': return 'Custom Range'
  }
}

export const resolveDateRange = (range: DateRangeValue) => {
  const now = new Date()
  if (range.preset === 'CUSTOM') {
    return {
      createdFrom: range.from ? new Date(`${range.from}T00:00:00`).toISOString() : undefined,
      createdTo: range.to ? new Date(`${range.to}T23:59:59.999`).toISOString() : undefined,
    }
  }

  if (range.preset === 'TODAY') {
    return {
      createdFrom: startOfDay(now).toISOString(),
      createdTo: endOfDay(now).toISOString(),
    }
  }

  if (range.preset === 'YESTERDAY') {
    const yesterday = new Date(now)
    yesterday.setDate(yesterday.getDate() - 1)
    return {
      createdFrom: startOfDay(yesterday).toISOString(),
      createdTo: endOfDay(yesterday).toISOString(),
    }
  }

  if (range.preset === 'THIS_WEEK') {
    return {
      createdFrom: startOfWeek(now).toISOString(),
      createdTo: endOfDay(now).toISOString(),
    }
  }

  if (range.preset === 'THIS_MONTH') {
    return {
      createdFrom: startOfMonth(now).toISOString(),
      createdTo: endOfDay(now).toISOString(),
    }
  }

  const lastMonthAnchor = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  return {
    createdFrom: startOfMonth(lastMonthAnchor).toISOString(),
    createdTo: endOfMonth(lastMonthAnchor).toISOString(),
  }
}

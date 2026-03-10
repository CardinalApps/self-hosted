import clsx from 'clsx'

import './DatePicker.css'

type DatePickerProps = {
  id?: string,
  name?: string,
  value?: string,
  min?: string,
  max?: string,
  className?: string,
  type?: 'date' | 'datetime-local',
  required?: boolean,
  onFocus?: (e) => void,
  onBlur?: (e) => void,
  onChange?: (e) => void,
}

/**
 * Textarea.
 */
const DatePicker = ({
  id,
  name,
  value,
  min,
  max,
  className,
  type = 'date',
  required = false,
  onFocus = () => {},
  onBlur = () => {},
  onChange = () => {},
}: DatePickerProps) => {

  /**
   * Convert the date to yyyy-mm-dd.
   */
  const formatInputValue = (value) => {
    if (!value) {
      return undefined
    }

    if (type === 'date') {
      const d = new Date(value)
      const yyyymmdd = `${d.getFullYear()}-${(d.getMonth()+1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`
      return yyyymmdd
    } else if (type === 'datetime-local') {
      const d = new Date(value)
      const yyyymmddhhss = `${d.getFullYear()}-${(d.getMonth()+1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}T${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
      return yyyymmddhhss
    }
  }

  /**
   * Convert yyyy-mm-dd to a date.
   */
  const formatOutputValue = (value) => {
    if (type === 'date') {
      const [yyyy, MM, dd] = value.split('-')
      const output = new Date(yyyy, MM-1, dd)
      return output
    } else if (type === 'datetime-local') {
      const [datePart, timePart] = value.split('T')
      const [yyyy, MM, dd] = datePart.split('-')
      const [hh, mm] = timePart.split(':')
      const output = new Date(yyyy, MM-1, dd, hh, mm)
      return output
    }
  }

  const onDateChange = (e) => {
    if (e.target.value) {
      const value = formatOutputValue(e.target.value)
      onChange(value)
    }
  }

  return (
    <div className={clsx('date-picker', className)}>
      <input
        id={id}
        name={name}
        type={type}
        min={formatInputValue(min)}
        max={formatInputValue(max)}
        value={formatInputValue(value)}
        onBlur={onBlur}
        onFocus={onFocus}
        onChange={onDateChange}
        required={required}
      />
    </div>
  )
}

export default DatePicker

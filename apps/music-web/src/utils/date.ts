export const formatDate = (date) => {
  return new Date(date).toLocaleString()
}

// Month, day and year only, e.g. "Aug 1, 2026"
export const formatShortDate = (date, lang?: string) => {
  return new Date(date).toLocaleDateString(lang, { month: 'short', day: 'numeric', year: 'numeric' })
}

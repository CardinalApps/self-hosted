export function copyToClipboard(text) {
  if (navigator.clipboard) {
    navigator.clipboard.writeText(text)
  }
}

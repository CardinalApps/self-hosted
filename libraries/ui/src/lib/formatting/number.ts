/**
 * Formats the given number or number-like string with commas. Only the left
 * sideof the decimal will be formatted.
 */
export function formatWithCommas(input) {
  if (input === 0) {
    return '0'
  }

  if (!input) {
    return ''
  }

  let convert = input
  let rightSideOfTheDecimal

  if (typeof input === 'number') {
    convert = input.toString()
  }

  // Left side of the decimal only
  if (convert.includes('.')) {
    const parts = convert.split('.')
    convert = parts[0]
    rightSideOfTheDecimal = parts[1]
  }

  const converted = convert.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")

  if (rightSideOfTheDecimal) {
    return converted + '.' + rightSideOfTheDecimal
  } else {
    return converted
  }
}

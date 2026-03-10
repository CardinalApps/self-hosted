/**
 * Checks if the given array contains all of the required type.
 */
export function isArrayOf(
  type: 'string' | 'number' | 'object',
  // Using `any` because we are checking against instances of anything
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  thing: any,
): boolean {
  if (!Array.isArray(thing)) {
    return false
  }

  if (!thing.length) {
    return false
  }

  let found = 0
  let allValid = true

  thing.forEach((value) => {
    found++
    if (typeof value !== type || value === null) {
      allValid = false
    }
  })

  if (found !== thing.length) {
    return false
  }

  return allValid
}

/**
 * Return an array split into chunks of the given size.
 */
export function chunk(input: unknown[], size: number) {
  return input.reduce((output, item, index) => {
    const chunkIndex = Math.floor(index / size)

    // Start new chunk
    if (!output[chunkIndex]) {
      output[chunkIndex] = []
    }

    output[chunkIndex].push(item)

    return output
  }, [])
}

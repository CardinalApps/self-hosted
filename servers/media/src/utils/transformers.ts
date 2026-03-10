import { BadRequestException } from '@nestjs/common'

/**
 * Callback for a Transform decorator.
 * 
 * This will ensure that the given value:
 * 
 * 1. Is an array or a string;
 * 2. If it's an array, ensure that all array items are strings;
 * 3. If it's a string
 *    3.1. If it's a comma-separated string, split and create an array
 *    3.2. If it's not comma-separated, transform it into a single item array.
 */
export const toArrayOfStrings = ({ value }) => {
  if (Array.isArray(value)) {
    if (value.some((v) => typeof v !== 'string')) {
      throw new BadRequestException('One or more of the given array values is not a string')
    } else {
      return value
    }
  }

  if (typeof value === 'string') {
    if (!value.length) {
      return []
    }
    if (value.includes(',')) {
      return value.split(',')
    } else {
      return [value]
    }
  }

  if (!Array.isArray(value)) {
    throw new Error("Could not validate input.")
  }

  return value
}

/**
 * Callback for a Transform decorator.
 * 
 * This will ensure that the given value is a boolean.
 */
export const toBoolean = ({ value }) => {
  if (typeof value === 'boolean') {
    return value
  }
  if (value === 0 || value === '0') {
    return false
  }
  if (value === 1 || value === '1') {
    return true
  }
  if (typeof value === 'string') {
    return value?.toLowerCase() === 'true'
  }
  return false
}

/**
 * Callback for a Transform decorator.
 * 
 * This will ensure that the given value is a boolean.
 */
export const toNumber = ({ value }) => {
  if (Array.isArray(value) || value === null) {
    return NaN
  }
  return Number(value)
}

/**
 * Callback for a Transform decorator.
 * 
 * This will ensure that the given value is a string.
 */
export const toString = ({ value }) => {
  if (typeof value === 'string') {
    return value
  }

  if (value === undefined) {
    return 'undefined'
  }

  try {
    return JSON.stringify(value)
  } catch (e) {
    return String(value)
  }
}

/**
 * If the string is actually a stringified non-string primitive, this returns
 * the primitive.
 */
export const unstringifyIfPrimitive = (thing: string) => {
  if (!isNaN(Number(thing))) {
    return Number(thing)
  }

  switch (thing.toLowerCase()) {
    case 'true':
      return true

    case 'false':
      return false

    case 'undefined':
      return undefined

    case 'null':
      return null
  }

  try {
    JSON.parse(thing)
    return thing
  } catch (e) {
    return thing
  }
}

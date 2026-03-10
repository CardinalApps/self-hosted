/* eslint-disable no-sparse-arrays */

import { isArrayOf } from './array'

describe('Utils: array', () => {
  it(`isArrayOf()`, () => {
    expect(isArrayOf('number', [1, 2, 3])).toBe(true)
    expect(isArrayOf('number', [0])).toBe(true)
    expect(isArrayOf('number', [-1, 0])).toBe(true)
    expect(isArrayOf('number', ['1', 2, 3])).toBe(false)
    expect(isArrayOf('number', [1, null, 3])).toBe(false)
    expect(isArrayOf('number', [1,,3])).toBe(false)
    expect(isArrayOf('number', [])).toBe(false)
    expect(isArrayOf('number', undefined)).toBe(false)
    expect(isArrayOf('number', null)).toBe(false)

    expect(isArrayOf('string', ['dog', 'cat', '', ' ', '0', '1'])).toBe(true)
    expect(isArrayOf('string', [0, 'dog'])).toBe(false)

    expect(isArrayOf('object', [{}, { dog: 'woof' }, [], [''], [1], [0]])).toBe(true)
    expect(isArrayOf('object', ['string'])).toBe(false)
    expect(isArrayOf('object', [null])).toBe(false)
  })
})

import {
  toBoolean,
  toNumber,
  toString,
} from './transformers'

describe('Utils: transformers', () => {
  it(`toBoolean()`, () => {
    expect(toBoolean({ value: 1 })).toBe(true)
    expect(toBoolean({ value: '1' })).toBe(true)
    expect(toBoolean({ value: 0 })).toBe(false)
    expect(toBoolean({ value: '0' })).toBe(false)
    expect(toBoolean({ value: {} })).toBe(false)
    expect(toBoolean({ value: [] })).toBe(false)
    expect(toBoolean({ value: null })).toBe(false)
    expect(toBoolean({ value: undefined })).toBe(false)
  })
  it(`toNumber()`, () => {
    expect(toNumber({ value: 1 })).toBe(1)
    expect(toNumber({ value: '1' })).toBe(1)
    expect(toNumber({ value: 0 })).toBe(0)
    expect(toNumber({ value: {} })).toBe(NaN)
    expect(toNumber({ value: [] })).toBe(NaN)
    expect(toNumber({ value: null })).toBe(NaN)
    expect(toNumber({ value: undefined })).toBe(NaN)
  })
  it(`toString()`, () => {
    expect(toString({ value: 1 })).toBe('1')
    expect(toString({ value: '1' })).toBe('1')
    expect(toString({ value: 0 })).toBe('0')
    expect(toString({ value: {} })).toBe('{}')
    expect(toString({ value: [] })).toBe('[]')
    expect(toString({ value: null })).toBe('null')
    expect(toString({ value: undefined })).toBe('undefined')
  })
})

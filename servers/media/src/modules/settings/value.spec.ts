import { parseSettingValue, serializeSettingValue } from './value'

describe('serializeSettingValue', () => {
  it('keeps primitives in the plain string form written before JSON values existed', () => {
    expect(serializeSettingValue('Living Room')).toBe('Living Room')
    expect(serializeSettingValue(true)).toBe('true')
    expect(serializeSettingValue(false)).toBe('false')
    expect(serializeSettingValue(10)).toBe('10')
    expect(serializeSettingValue(null)).toBe('null')
  })

  it('stores objects and arrays as JSON instead of flattening them', () => {
    expect(serializeSettingValue([])).toBe('[]')
    expect(serializeSettingValue({ a: 1 })).toBe('{"a":1}')
    expect(String([{ id: 'x' }])).toBe('[object Object]')
    expect(serializeSettingValue([{ id: 'x' }])).toBe('[{"id":"x"}]')
  })
})

describe('parseSettingValue', () => {
  it('reads back primitives', () => {
    expect(parseSettingValue('Living Room')).toBe('Living Room')
    expect(parseSettingValue('true')).toBe(true)
    expect(parseSettingValue('false')).toBe(false)
    expect(parseSettingValue('10')).toBe(10)
    expect(parseSettingValue('null')).toBeNull()
  })

  it('reads back an empty string rather than coercing it to zero', () => {
    expect(parseSettingValue('')).toBe('')
  })

  it('reads back objects and arrays', () => {
    expect(parseSettingValue('[]')).toEqual([])
    expect(parseSettingValue('{"a":1}')).toEqual({ a: 1 })
  })

  it('leaves a value that only looks like JSON as a string', () => {
    expect(parseSettingValue('{not json')).toBe('{not json')
  })

  it('round-trips a saved custom theme', () => {
    const themes = [{
      id: '0ac492fa',
      name: 'Midnight',
      base: 'dark',
      vars: { '--bg-1': '#1a1a2e', '--accent-color': '#7f5af0' },
    }]

    expect(parseSettingValue(serializeSettingValue(themes))).toEqual(themes)
  })
})

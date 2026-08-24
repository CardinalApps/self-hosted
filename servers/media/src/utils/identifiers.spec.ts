import { isRowId, MAX_ROW_ID } from './identifiers'

describe('Utils: identifiers', () => {
  it('treats numbers within the row ID column as row IDs', () => {
    expect(isRowId(1)).toBe(true)
    expect(isRowId(0)).toBe(true)
    expect(isRowId(MAX_ROW_ID)).toBe(true)
  })

  it('treats all-digits strings within the row ID column as row IDs', () => {
    expect(isRowId('1')).toBe(true)
    expect(isRowId('0')).toBe(true)
    expect(isRowId(String(MAX_ROW_ID))).toBe(true)
  })

  it('rejects values that overflow the row ID column', () => {
    expect(isRowId(MAX_ROW_ID + 1)).toBe(false)
    expect(isRowId(String(MAX_ROW_ID + 1))).toBe(false)
    expect(isRowId('99999999999999999999')).toBe(false)
  })

  it('rejects UUIDs', () => {
    expect(isRowId('b0e9c1a4-1f2d-4c3b-9a8e-7d6c5b4a3f21')).toBe(false)
  })

  it('rejects strings that are not purely digits', () => {
    expect(isRowId('not-an-identifier')).toBe(false)
    expect(isRowId('')).toBe(false)
    expect(isRowId(' 12 ')).toBe(false)
    expect(isRowId('12abc')).toBe(false)
    expect(isRowId('1.5')).toBe(false)
    expect(isRowId('1e5')).toBe(false)
    expect(isRowId('-1')).toBe(false)
  })

  it('rejects numbers that cannot be a row ID', () => {
    expect(isRowId(NaN)).toBe(false)
    expect(isRowId(1.5)).toBe(false)
    expect(isRowId(-1)).toBe(false)
    expect(isRowId(Infinity)).toBe(false)
  })
})

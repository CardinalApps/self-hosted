import { sanitizeDateString } from './date'

describe('Utils: date', () => {
  it(`sanitizeDateString`, () => {
    expect(sanitizeDateString('Wed Aug 02 2023 15:48:51 GMT-0400 (Eastern Daylight Time)')).toBe('Wed Aug 02 2023 15:48:51 GMT-0400 (Eastern Daylight Time)')
    expect(sanitizeDateString('Jun 13, 2018, 1:03:00 AM UTC')).toBe('Jun 13, 2018, 1:03:00 AM UTC')

    // Note the invalid invisible character in the next strings
    expect(sanitizeDateString('Jun 13, 2018, 1:03:00 AM UTC')).toBe('Jun 13, 2018, 1:03:00 AM UTC')
    expect(sanitizeDateString('Jun 21, 2018, 7:03:09 PM UTC')).toBe('Jun 21, 2018, 7:03:09 PM UTC')
  })
})

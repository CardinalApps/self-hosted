import { sanitizeDateString } from './date'

describe('Utils: date', () => {
  it(`sanitizeDateString`, () => {
    expect(sanitizeDateString('Wed Aug 02 2023 15:48:51 GMT-0400 (Eastern Daylight Time)')).toBe('Wed Aug 02 2023 15:48:51 GMT-0400 (Eastern Daylight Time)')
    expect(sanitizeDateString('Jun 13, 2018, 1:03:00 AM UTC')).toBe('Jun 13, 2018, 1:03:00 AM UTC')

    // Note the invalid invisible character in the next strings
    expect(sanitizeDateString('Jun 13, 2018, 1:03:00 AM UTC')).toBe('Jun 13, 2018, 1:03:00 AM UTC')
    expect(sanitizeDateString('Jun 21, 2018, 7:03:09 PM UTC')).toBe('Jun 21, 2018, 7:03:09 PM UTC')
  })

  /*
   * The indexer stringifies the Date that exifr returns for the Exif date tags,
   * so a `Date.toString()` offset is the shape that the Exif takenAt path
   * actually feeds through here. Replacing the `+` does not make the string
   * unparseable - V8 still accepts it, but silently ignores the orphaned
   * offset and reads the wall time as UTC, shifting the instant.
   */
  describe('sanitizeDateString and UTC offsets', () => {
    it('keeps the sign of a UTC-positive offset', () => {
      expect(sanitizeDateString('Sun Mar 10 2024 14:22:35 GMT+0100 (Central European Standard Time)'))
        .toBe('Sun Mar 10 2024 14:22:35 GMT+0100 (Central European Standard Time)')
    })

    it('keeps the sign of a UTC-negative offset', () => {
      expect(sanitizeDateString('Sun Mar 10 2024 14:22:35 GMT-0400 (Eastern Daylight Time)'))
        .toBe('Sun Mar 10 2024 14:22:35 GMT-0400 (Eastern Daylight Time)')
    })

    it('preserves the instant described by a UTC-positive offset', () => {
      const sanitized = sanitizeDateString('Sun Mar 10 2024 14:22:35 GMT+0100 (Central European Standard Time)')

      expect(Date.parse(sanitized)).toBe(Date.parse('2024-03-10T13:22:35Z'))
    })

    it('preserves the instant described by a UTC-negative offset', () => {
      const sanitized = sanitizeDateString('Sun Mar 10 2024 14:22:35 GMT-0400 (Eastern Daylight Time)')

      expect(Date.parse(sanitized)).toBe(Date.parse('2024-03-10T18:22:35Z'))
    })

    it('preserves the instant for offsets that are not a whole number of hours', () => {
      const sanitized = sanitizeDateString('Sun Mar 10 2024 14:22:35 GMT+0530 (India Standard Time)')

      expect(Date.parse(sanitized)).toBe(Date.parse('2024-03-10T08:52:35Z'))
    })

    it('round trips a Date through toString() whatever the offset of the host', () => {
      const original = new Date('2024-03-10T13:22:35Z')

      expect(Date.parse(sanitizeDateString(original.toString()))).toBe(original.getTime())
    })
  })
})

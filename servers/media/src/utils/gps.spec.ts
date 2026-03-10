import { getDateFromGPSFormat } from './gps'

describe('Utils: GPS', () => {
  it(`can convert GPS date strings to a date object`, () => {
    expect(getDateFromGPSFormat('2016:10:06', '23:36:58')?.toUTCString()).toBe('Thu, 06 Oct 2016 23:36:58 GMT')
    expect(getDateFromGPSFormat('2016-10-06', '23-36-58')?.toUTCString()).toBe('Thu, 06 Oct 2016 23:36:58 GMT')
    expect(getDateFromGPSFormat('2016/10/06', '23/36/58')?.toUTCString()).toBe('Thu, 06 Oct 2016 23:36:58 GMT')
  })
})

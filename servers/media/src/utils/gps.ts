/**
 * Attempts to read the date format the GPS uses.
 * 
 * In Exif data, it is split into two parts: 
 * 
 *  - GPSDateStamp: yyyy:mm:dd but the seperator can also be `-` or `/`
 *  - GPSTimeStamp: hh:mm:ss
 */
export function getDateFromGPSFormat(gpsDate: string, gpsTime: string): Date | null {
  if (!gpsDate) {
    return null
  }

  const originalGPSDate = gpsDate
  const originalGPSTime = gpsTime

  // Convert date to yyyy-mm-dd
  if (gpsDate.includes(':')) {
    gpsDate = gpsDate.replaceAll(':', '-')
  }
  if (gpsDate.includes('/')) {
    gpsDate = gpsDate.replaceAll('/', '-')
  }

  // Conver time to hh:mm:ss
  if (gpsTime.includes('-')) {
    gpsTime = gpsTime.replaceAll('-', ':')
  }
  if (gpsTime.includes('/')) {
    gpsTime = gpsTime.replaceAll('/', ':')
  }

  const parsed = new Date(`${gpsDate} ${gpsTime} UTC`)

  // Check for a valid format
  if (isNaN(Date.parse(parsed.toString()))) {
    console.warn('Could not parse GPS date format:', originalGPSDate, originalGPSTime)
    return null
  }

  return new Date(parsed)
}

import { PhotoService } from './photo.service'

/**
 * The path parsing helpers are pure; none of them touch the injected
 * repositories or services. They are instance members (getDateFromFilePath is a
 * class field, so it does not exist on the prototype), which is why this builds
 * a real instance rather than using Object.create.
 */
const service = new PhotoService(
  {} as never,
  {} as never,
  {} as never,
  {} as never,
  {} as never,
  {} as never,
  {} as never,
  {} as never,
)

const TAKEOUT_PHOTO = '/media/photos/takeout-20240115t143022z-001/Google Photos/Photos from 2024/IMG_20240115_143022.jpg'
const GOOGLE_PHOTOS_NO_TAKEOUT = '/media/photos/GooglePhotos/Photos from 2024/IMG_20240115_143022.jpg'

describe('PhotoService.getGoogleTakeoutFromPath', () => {
  it('returns the takeout directory segment when the path has one', () => {
    expect(service.getGoogleTakeoutFromPath(TAKEOUT_PHOTO)).toBe('/takeout-20240115t143022z-001/')
  })

  it('returns null for a Google Photos path with no takeout directory', () => {
    expect(service.getGoogleTakeoutFromPath(GOOGLE_PHOTOS_NO_TAKEOUT)).toBeNull()
  })

  it('returns null for an ordinary photo path', () => {
    expect(service.getGoogleTakeoutFromPath('/media/photos/holiday/IMG_0001.jpg')).toBeNull()
  })
})

describe('PhotoService.getGoogleTakeoutRootFromPath', () => {
  it('returns the absolute path of the takeout directory', () => {
    expect(service.getGoogleTakeoutRootFromPath(TAKEOUT_PHOTO)).toBe('/media/photos/takeout-20240115t143022z-001/')
  })

  it('returns null when there is no takeout directory in the path', () => {
    expect(service.getGoogleTakeoutRootFromPath(GOOGLE_PHOTOS_NO_TAKEOUT)).toBeNull()
  })
})

describe('PhotoService.getGoogleTakeoutBatchFromPath', () => {
  it('returns the batch number of the takeout directory', () => {
    expect(service.getGoogleTakeoutBatchFromPath(TAKEOUT_PHOTO)).toBe('001')
  })

  it('returns null when there is no takeout directory in the path', () => {
    expect(service.getGoogleTakeoutBatchFromPath(GOOGLE_PHOTOS_NO_TAKEOUT)).toBeNull()
  })
})

describe('PhotoService.getGoogleTakeoutDateTimeFromPath', () => {
  it('parses the export datetime out of the takeout directory name', () => {
    const dateTime = service.getGoogleTakeoutDateTimeFromPath(TAKEOUT_PHOTO)

    expect(dateTime).not.toBeNull()
    const parsed = new Date(dateTime)
    expect(isNaN(parsed.getTime())).toBe(false)
    expect(parsed.toISOString()).toBe('2024-01-15T14:30:22.000Z')
  })

  it('returns null when there is no takeout directory in the path', () => {
    expect(service.getGoogleTakeoutDateTimeFromPath(GOOGLE_PHOTOS_NO_TAKEOUT)).toBeNull()
  })
})

describe('PhotoService.getGooglePhotosMetadata', () => {
  it('resolves null instead of throwing for a Google Photos path with no takeout directory', async () => {
    await expect(service.getGooglePhotosMetadata(GOOGLE_PHOTOS_NO_TAKEOUT)).resolves.toBeNull()
  })

  it('resolves null for a path that is not from Google Photos at all', async () => {
    await expect(service.getGooglePhotosMetadata('/media/photos/holiday/IMG_0001.jpg')).resolves.toBeNull()
  })
})

describe('PhotoService.getDateFromFilePath', () => {
  const parse = (absolutePath: string) => {
    const result = service.getDateFromFilePath(absolutePath)
    return result === null ? null : new Date(result)
  }

  it('parses the documented Google Photos {type}_yyyymmdd_hhmmss filename format', () => {
    const date = parse('/media/photos/IMG_20240115_143022.jpg')

    expect(date.getFullYear()).toBe(2024)
    expect(date.getMonth()).toBe(0)
    expect(date.getDate()).toBe(15)
    expect(date.getHours()).toBe(14)
    expect(date.getMinutes()).toBe(30)
    expect(date.getSeconds()).toBe(22)
  })

  it('parses the hyphenated {type}_yyyymmdd-hhmmss variant', () => {
    const date = parse('/media/photos/IMG_20240115-143022.jpg')

    expect(date.getFullYear()).toBe(2024)
    expect(date.getMonth()).toBe(0)
    expect(date.getDate()).toBe(15)
    expect(date.getHours()).toBe(14)
  })

  it('ignores the trailing milliseconds that Pixel exports append', () => {
    const date = parse('/media/photos/PXL_20240115_143022123.MP.jpg')

    expect(date.getDate()).toBe(15)
    expect(date.getSeconds()).toBe(22)
  })

  it('parses a plain yyyy-mm-dd filename', () => {
    const date = parse('/media/photos/2024-01-01.jpg')

    expect(date.getFullYear()).toBe(2024)
    expect(date.getMonth()).toBe(0)
    expect(date.getDate()).toBe(1)
  })

  it('parses a yyyy-mm-dd filename that carries a suffix', () => {
    const date = parse('/media/photos/2024-03-10-gps.jpg')

    expect(date.getFullYear()).toBe(2024)
    expect(date.getMonth()).toBe(2)
    expect(date.getDate()).toBe(10)
  })

  it('prefers the Google Photos timestamp over a date-shaped prefix', () => {
    const date = parse('/media/photos/2024-01-01_20240115_143022.jpg')

    expect(date.getDate()).toBe(15)
    expect(date.getHours()).toBe(14)
  })

  it('returns null rather than undefined when no date is in the filename', () => {
    expect(service.getDateFromFilePath('/media/photos/holiday/IMG_0001.jpg')).toBeNull()
  })

  it('does not read a date out of digits that are not a valid calendar date', () => {
    expect(service.getDateFromFilePath('/media/photos/IMG_1234-56-78.jpg')).toBeNull()
    expect(service.getDateFromFilePath('/media/photos/2024-02-31.jpg')).toBeNull()
  })

  it('returns null for a path with no filename', () => {
    expect(service.getDateFromFilePath('')).toBeNull()
  })
})

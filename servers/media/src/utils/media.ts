/**
 * Supported photo file types.
 * 
 * @see canonicalExtension - When given the choice, prefer canonical
 * extensions when using this enum.
 */
export enum SupportedPhotoFileExtensions {
  JPG = 'jpg',
  JPEG = 'jpeg',
  PNG = 'png',
  HEIC = 'heic',
  HEIF = 'heif',
}

/**
 * Supported music file types.
 */
export enum SupportedMusicFileExtensions {
  MP3 = 'mp3',
  FLAC = 'flac',
  M4A = 'm4a',
  WAV = 'wav',
  AAC = 'aac',
  OPUS = 'opus',
}

/**
 * Supported cinema file types.
 */
export enum SupportedCinemaFileExtensions {
  MKV = 'mkv',
  MP4 = 'mp4',
}

/**
 * Every supported file type.
 */
export const AllSupportedFileExtensions = Object.freeze([
  ...Object.values(SupportedPhotoFileExtensions),
  ...Object.values(SupportedMusicFileExtensions),
  ...Object.values(SupportedCinemaFileExtensions),
])

/**
 * High level media types.
 */
export enum MediaType {
  MUSIC = 'music',
  PHOTOS = 'photos',
  MOVIES = 'movies',
  TV = 'tv',
}

/**
 * The supported media directory types.
 */
export type MediaDirsType = {
  music?: string,
  photos?: string,
  movies?: string,
  tv?: string,
}

/**
 * The apps that are used to play media.
 */
export enum MediaAppType {
  MUSIC = 'music',
  PHOTOS = 'photos',
  CINEMA = 'cinema',
}

/**
 * Returns the app that plays the given media type.
 * 
 * @deprecated - This is flawed. We must use the user directories as the source of truth when determining the media type of a file.
 */
export const fileExtensionToAppType = (extension: string): MediaAppType | null => {
  console.warn('DEPRECATED - Refactor the code that uses this.')

  extension = extension.toLowerCase()

  if (extension.includes('.')) {
    extension = extension.replace('.', '')
  }

  if (Object.values(SupportedPhotoFileExtensions).some((ext) => extension === ext)) {
    return MediaAppType.PHOTOS
  } else if (Object.values(SupportedMusicFileExtensions).some((ext) => extension === ext)) {
    return MediaAppType.MUSIC
  } else if (Object.values(SupportedCinemaFileExtensions).some((ext) => extension === ext)) {
    return MediaAppType.CINEMA
  }

  return null
}

/**
 * Some file formats have multiple file extensions that are the same thing,
 * or at least are similar enough that they should be handled the same way.
 * 
 * Namely:
 * 
 * jpg and jpeg are jpeg;
 * heic and heif are heif;
 */
export const canonicalExtension = (extension: string): string => {
  switch (extension.toLowerCase()) {
    case SupportedPhotoFileExtensions.HEIC:
      return SupportedPhotoFileExtensions.HEIF

    case SupportedPhotoFileExtensions.JPG:
      return SupportedPhotoFileExtensions.JPEG

    default:
      return extension
  }
}

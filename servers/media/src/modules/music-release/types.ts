export const ALBUM_ART_FILE_NAME = ['cover', 'folder'] as const
export const ALBUM_ART_FILE_EXTENSION = ['jpg', 'jpeg', 'png', 'gif']

export type AlbumArtFileName = typeof ALBUM_ART_FILE_NAME[number]
export type AlbumArtFileExtension = typeof ALBUM_ART_FILE_EXTENSION[number]

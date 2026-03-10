export type HeicToJpgWorkerInput = {
  absoluteFilePath: string,
}

export type PhotoThumbnailSizes = 'small_nocrop' | 'medium_nocrop'
export type PhotoThumbnailDimensions = {
  [key in PhotoThumbnailSizes]: [width: number | null]
}

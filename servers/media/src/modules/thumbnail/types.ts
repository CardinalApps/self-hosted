import { OutputInfo, FitEnum } from 'sharp'

export type ThumbnailSize =
    'small_nocrop'
  | 'medium_nocrop'

export type ThumbnailSizes = {
  [key in ThumbnailSize]: [width: number | null, height: number | null]
}

// Null is used when an error occurs during thumbnail creation
export type CreatedThumbnail = (OutputInfo & {
  absoluteFilePath: string,
  relativeSrc: string,
}) | null

export type CreatedThumbnails = {
  status: 'success' | 'error' | null,
  executionDuration: number,
  files: {
    [size: string]: CreatedThumbnail,
  },
}

export interface CreateThumbnailsOptions {
  absoluteFilePath?: string,
  buffer?: Buffer,
  fileName?: string,
  fileExtension?: string,
  sizes: {
    [key in ThumbnailSize]?: [width: number | null, height: number | null]
  },
  fit?: 'cover' | 'contain' | 'fill' | 'inside' | 'outside',
  position?: 'centre' | 'top' | 'right top' | 'right' | 'right bottom' | 'bottom' | 'left bottom' | 'left' | 'left top',
  rotate?: number, // -360 to 360
}

export type HeicToJpgWorkerInput = {
  absoluteFilePath: string,
}

export type CreateThumbnailWorkerInput = {
  sharpInput: string | Buffer,
  width: number,
  height: number,
  cacheDir: string,
  outputPath: string,
  outputFileName: string,
  fit?: keyof FitEnum,
  position?: string | number,
}

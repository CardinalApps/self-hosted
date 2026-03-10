import * as worker_threads from 'worker_threads'
import * as sharp from 'sharp'
import { Logger } from '@nestjs/common'

import { CreateThumbnailWorkerInput, CreatedThumbnail } from '../types'

const {
  sharpInput,
  width,
  height,
  fit,
  position,
  cacheDir,
  outputPath,
  outputFileName,
}: CreateThumbnailWorkerInput = worker_threads.workerData

async function createThumbnail() {
  const result = await new Promise((thumbnailResolve) => {
    sharp(sharpInput)
      .rotate()
      .resize({
        width,
        height,
        fit: fit || 'cover',
        position: position || 'centre',
      })
      .jpeg({
        quality: 100,
        progressive: true,
        chromaSubsampling: '4:4:4',
        force: true,
      })
      .toFile(outputPath)
      .then((data) => thumbnailResolve({
        ...data,
        absoluteFilePath: outputPath,
        relativeSrc: `/${cacheDir}/${outputFileName}`,
      } as CreatedThumbnail))
      .catch((error) => {
        Logger.error(error, 'Thumbnails')
        thumbnailResolve(null)
      })
  })
  worker_threads.parentPort.postMessage(result)
}

createThumbnail()

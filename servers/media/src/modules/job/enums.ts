export enum JobType {
  ALBUM_ART_THUMBNAILS = 'album_art_thumbnails',
  PHOTO_VARIATIONS = 'photo_variations',
  PHOTO_THUMBNAILS = 'photo_thumbnails',
}

export enum JobStatus {
  DRAFT = 'draft',
  PREPARING = 'preparing',
  IN_QUEUE = 'in_queue',
  RUNNING = 'running',
  PAUSED = 'paused',
  CANCELED = 'canceled',
  COMPLETED = 'completed',
  ERRORED = 'errored',
}

export enum JobTaskType {
  CREATE_ALBUM_ARTWORK_THUMBNAIL = 'create_album_artwork_thumbnail',
  CREATE_PHOTO_THUMBNAIL = 'create_photo_thumbnail',
  HEIC_TO_JEPG = 'heic_to_jpeg',
}

export enum JobTaskStatus {
  DRAFT = 'draft',
  IN_QUEUE = 'in_queue',
  RUNNING = 'running',
  PAUSED = 'paused',
  CANCELED = 'canceled',
  COMPLETED = 'completed',
  ERRORED = 'errored',
}

export enum OutputCacheDirectories {
  VARIATIONS = 'photo_variations',
}

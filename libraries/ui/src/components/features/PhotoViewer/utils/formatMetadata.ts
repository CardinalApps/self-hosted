import i18n from '../i18n'

export type PhotoMetadataPair = {
  metaKey: string,
  metaValue: string,
  metadataFormat: string,
}

export type PhotoMetadata = {
  [label: string]: {
    key: string,
    value: string,
  }[],
}

/**
 * Given raw metadata results from the database, this structures it in a way
 * that the PhotoViewer can use.
 */
export default function formatMetadata(photo, arrayOfMetadataEntities: PhotoMetadataPair[] = [], lang): PhotoMetadata {
  const exifName = i18n['metadata.type.exif'][lang]
  const googlePhotosName = i18n['metadata.type.google-photos'][lang]
  const blackList = ['google-photos-json', 'errors']
  const metadata = {}

  // Add general info
  metadata[i18n['metadata.type.general'][lang]] = [
    { key: i18n['metadata.general.path'][lang], value: photo?.file?.absolutePath },
    // { key: i18n['metadata.general.taken-date'][lang], value: photo?.takenOnDay },
    // { key: i18n['metadata.general.taken-time'][lang], value: new Date(photo?.takenAt).toLocaleString('en-US', { hour: 'numeric', minute: 'numeric', hour12: true }) },
  ]

  // Add Exif and Google Photos metadata
  for (const metadataEntity of arrayOfMetadataEntities) {
    if (blackList.includes(metadataEntity.metaKey)) continue

    let category

    switch (metadataEntity.metadataFormat.toLowerCase()) {
      case 'exif':
        if (!(exifName in metadata)) metadata[exifName] = []
        category = exifName
        break

      case 'googlephotos':
        if (!(googlePhotosName in metadata)) metadata[googlePhotosName] = []
        category = googlePhotosName
        break
    }

    metadata[category].push({
      key: metadataEntity.metaKey,
      value: metadataEntity.metaValue,
    })
  }

  return metadata
}

import Card from "@cardinalapps/ui/src/components/layout/Card"
import { MusicReleaseType } from "@cardinalapps/ui/src/store/apis/musicReleases"
import List from "@cardinalapps/ui/src/components/interaction/List"

type ReleaseMetaProps = {
  release: MusicReleaseType,
}

import i18n from './i18n.json'

function ReleaseMeta({
  release,
}: ReleaseMetaProps) {
  const countDiscs = () => {
    const discs = release?.tracks?.map((track) => Number(track.discNumber) || 1) || []
    const uniqueDiscs = Array.from(new Set(discs))
    return uniqueDiscs.length
  }

  return (
    <Card className="release-meta" padding="thin">
      <p className="meta-section-title">{i18n['music-release.meta.meta']['en']}</p>
      <List
        className="release-meta-list"
        layout="compact"
        items={[
          {
            name: <><strong>{i18n['music-release.meta.tracks']['en']}</strong> <span>{release?.tracks?.length.toString() || '0'}</span></>,
            title: i18n['music-release.meta.tracks']['en'],
          },
          {
            name:  <><strong>{i18n['music-release.meta.discs']['en']}</strong> <span>{countDiscs()}</span></>,
            title: i18n['music-release.meta.discs']['en'],
          },
        ]}
      />
    </Card>
  )
}

export default ReleaseMeta

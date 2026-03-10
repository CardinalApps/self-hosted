import { useSelector } from "react-redux"
import { MusicArtistType } from "@cardinalapps/ui/src/store/apis/musicArtists"
import MusicRelease from "@cardinalapps/ui/src/components/interaction/MusicRelease"
import { MusicReleaseType } from "@cardinalapps/ui/src/store/apis/musicReleases"
import { getAppUrl } from "@cardinalapps/ui/src/lib/net/router"
import H3 from "@cardinalapps/ui/src/components/typography/H3"
import { settingsSelectors } from "@cardinalapps/ui/src/store/slices/settings"

import i18n from './i18n.json'

type ReleaseMetaProps = {
  artist: MusicArtistType,
}

function ArtistReleases({
  artist,
}: ReleaseMetaProps) {
  const { lang } = useSelector(settingsSelectors.current)
  return (
    <section className="music-artist-releases">
      <H3>{i18n['music-artist.releases'][lang]}</H3>
      <div className="release-list">
      {artist?.releases.map((release: MusicReleaseType) => {
        return (
          <MusicRelease
            key={release.id}
            releaseId={release.id}
            releaseTitle={release.title}
            releaseLink={getAppUrl('release', {
              params: {
                ':id': release?.musicReleaseId?.toString() || '',
              },
            })}
          />
        )
      })}
      </div>
    </section>
  )
}

export default ArtistReleases

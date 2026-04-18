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

type ReleaseSection = {
  i18nKey: keyof typeof i18n,
  types: string[],
}

const RELEASE_SECTIONS: ReleaseSection[] = [
  { i18nKey: 'music-artist.releases.albums',       types: ['album'] },
  { i18nKey: 'music-artist.releases.eps',          types: ['ep'] },
  { i18nKey: 'music-artist.releases.singles',      types: ['single'] },
  { i18nKey: 'music-artist.releases.compilations', types: ['compilation'] },
  { i18nKey: 'music-artist.releases.soundtracks',  types: ['soundtrack'] },
  { i18nKey: 'music-artist.releases.live',         types: ['live'] },
  { i18nKey: 'music-artist.releases.remixes',      types: ['remix', 'dj-mix'] },
]

function ReleaseList({ releases }: { releases: MusicReleaseType[] }) {
  return (
    <div className="release-list">
      {releases.map((release) => (
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
      ))}
    </div>
  )
}

function ArtistReleases({
  artist,
}: ReleaseMetaProps) {
  const { lang } = useSelector(settingsSelectors.current)
  const releases = (artist?.releases ?? []) as MusicReleaseType[]

  const assignedTypes = new Set(RELEASE_SECTIONS.flatMap((s) => s.types))
  const other = releases.filter((r) => {
    const type = r.releaseType as string | null
    return !type || !assignedTypes.has(type)
  })

  return (
    <section className="music-artist-releases">
      {RELEASE_SECTIONS.map(({ i18nKey, types }) => {
        const group = releases.filter((r) => types.includes(r.releaseType as string))
        if (!group.length) return null
        return (
          <div className="music-release-type" key={i18nKey}>
            <H3>{i18n[i18nKey][lang]}</H3>
            <ReleaseList releases={group} />
          </div>
        )
      })}

      {other.length > 0 && (
        <div className="music-release-type">
          <H3>{i18n['music-artist.releases.other'][lang]}</H3>
          <ReleaseList releases={other} />
        </div>
      )}
    </section>
  )
}

export default ArtistReleases

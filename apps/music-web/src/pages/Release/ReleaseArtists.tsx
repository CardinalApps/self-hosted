import Tags from "@cardinalapps/ui/src/components/interaction/Tags/Tags"
import { MusicReleaseType } from "@cardinalapps/ui/src/store/apis/musicReleases"
import { TagProps } from "@cardinalapps/ui/src/components/interaction/Tags/Tag"

import { getAppUrl } from "@cardinalapps/ui/src/lib/net/router"

type ReleaseMetaProps = {
  release: MusicReleaseType,
}

function ReleaseMeta({
  release,
}: ReleaseMetaProps) {
  return (
    <div className="release-artists">
      {release?.artists?.length
        ? <Tags
            tags={release.artists.map((artist) => ({
              label: artist.name,
              href: getAppUrl('artist', { params: { ':id': artist?.musicArtistId as string } }),
            }) as TagProps)}
          />
        : null
      }
    </div>
  )
}

export default ReleaseMeta

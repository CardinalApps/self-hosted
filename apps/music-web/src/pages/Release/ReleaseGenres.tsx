import Tags from "@cardinalapps/ui/src/components/interaction/Tags/Tags"
import { MusicReleaseType } from "@cardinalapps/ui/src/store/apis/musicReleases"
import { TagProps } from "@cardinalapps/ui/src/components/interaction/Tags/Tag"

type ReleaseMetaProps = {
  release: MusicReleaseType,
}

function ReleaseMeta({
  release,
}: ReleaseMetaProps) {
  return (
    <div className="release-genres">
      {release?.genres?.length
        ? <Tags
            tags={release.genres.map((genre) => ({
              label: genre.name,
            }) as TagProps)}
          />
        : null
      }
    </div>
  )
}

export default ReleaseMeta

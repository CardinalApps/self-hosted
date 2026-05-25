# Test fixtures

Tiny synthetic media files used by integration and end-to-end tests. They are
not real content — just minimum-valid containers for the indexer's probe step
to ingest.

## Layout

```
music/   — existing MP3 fixtures (artist/release/track tree)
movies/  — two single-file movies (Sample Movie (2020), Another Movie (2019))
tv/      — one show, one season, one episode (Sample Show / Season 01 / S01E01)
photos/  — two photos in mixed formats (jpg + png)
empty/   — empty directory (kept by .gitkeep) for "library with no media" tests
```

## Sizes

Every file is well under 100 KB. The MP4s are 1.8 KB (1 second of black at
128x96, libx264-encoded); the photos are ~250 B each (64x48 solid color).
That's small enough to commit, large enough to look like real media to the
indexer probe.

## Consumers

- `servers/media/tests/integration/*` — Jest integration tests that point a
  library at one of these dirs.
- `apps/admin-web/e2e/tests/libraries/*` — Playwright specs that create a
  library via `seedLibrary({ paths: [fixturePath('music')] })` etc.
- `apps/admin-web/e2e/tests/indexing/*` — exercises the indexing pipeline
  against `music/` for the quick-scan path; `empty/` for the no-media path.

## Regenerating

If a fixture is lost or corrupted:

```sh
FFMPEG=node_modules/ffmpeg-static/ffmpeg
$FFMPEG -f lavfi -i color=c=black:s=128x96:d=1:r=10 -pix_fmt yuv420p \
  'servers/media/tests/fixtures/movies/Sample Movie (2020)/Sample Movie (2020).mp4' -y
# (same shape for the other MP4 entries)

$FFMPEG -f lavfi -i color=c=red:s=64x48:d=1 -frames:v 1 \
  servers/media/tests/fixtures/photos/2024-01-01.jpg -y
$FFMPEG -f lavfi -i color=c=blue:s=64x48:d=1 -frames:v 1 \
  servers/media/tests/fixtures/photos/2024-02-15.png -y
```

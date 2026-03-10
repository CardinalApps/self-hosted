import { SettingsFieldFactory, SupportedCardinalApp, SupportedLang } from '../types'
import i18n from '../i18n'

export const START_PAGE_SLUG = 'start_page'

const getStartPages = (app: SupportedCardinalApp, lang: SupportedLang) => {
  switch (app) {
    case 'music':
      return [
        {
          value: 'explore',
          label: i18n['nav.music.explore'][lang],
        },
        {
          value: 'artists',
          label: i18n['nav.music.artists'][lang],
        },
        {
          value: 'releases',
          label: i18n['nav.music.releases'][lang],
        },
        {
          value: 'songs',
          label: i18n['nav.music.tracks'][lang],
        },
        {
          value: 'playlists',
          label: i18n['nav.music.playlists'][lang],
        },
        {
          value: 'genres',
          label: i18n['nav.music.genres'][lang],
        },
      ]

    case 'photos':
      return [
        {
          value: 'all',
          label: i18n['nav.photos.all-photos'][lang],
        },
        {
          value: 'albums',
          label: i18n['nav.photos.albums'][lang],
        },
        {
          value: 'people',
          label: i18n['nav.photos.people'][lang],
        },
        {
          value: 'places',
          label: i18n['nav.photos.places'][lang],
        },
      ]

    case 'cinema':
      return [
        {
          value: 'theater',
          label: i18n['nav.cinema.home-cinema'][lang],
        },
        {
          value: 'tv',
          label: i18n['nav.cinema.tv'][lang],
        },
        {
          value: 'movies',
          label: i18n['nav.cinema.movies'][lang],
        },
      ]

    case 'books':
      return [
        {
          value: 'library',
          label: i18n['nav.books.library'][lang],
        },
        {
          value: 'audiobooks',
          label: i18n['nav.books.audiobooks'][lang],
        },
        {
          value: 'ebooks',
          label: i18n['nav.books.ebooks'][lang],
        },
      ]

    case 'admin':
      return [
        {
          value: '/',
          label: i18n['nav.admin.overview'][lang],
        },
        {
          value: 'media',
          label: i18n['nav.admin.media'][lang],
        },
      ]
  }
}

export const startPageFactory: SettingsFieldFactory = (app: SupportedCardinalApp, lang: SupportedLang) => ({
  slug: START_PAGE_SLUG,
  label: i18n?.['settings.start-page.title']?.[lang],
  type: 'select',
  storage: 'home_server',
  defaultValue: getStartPages(app, lang)[0].value,
  options: getStartPages(app, lang),
})

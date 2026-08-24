import { describe, it, expect } from 'vitest'

import mergeCachedStore from './mergeCachedStore'

describe('mergeCachedStore', () => {
  it('overlays cached values onto the defaults', () => {
    const merged = mergeCachedStore(
      { settings: { current: { theme: 'light', lang: 'en' } } },
      { settings: { current: { theme: 'dark' } } },
    )

    expect(merged).toEqual({ settings: { current: { theme: 'dark', lang: 'en' } } })
  })

  it('keeps defaults the cache has never heard of', () => {
    const merged = mergeCachedStore(
      { layout: { sidebarMode: 'expanded', pageTitle: '' } },
      { layout: { pageTitle: 'Albums' } },
    )

    expect(merged).toEqual({ layout: { sidebarMode: 'expanded', pageTitle: 'Albums' } })
  })

  /*
   * A cached list is the whole list. Merging it into a default one index by index would put back
   * entries the user removed - a keyboard shortcut they deleted would return on the next reload.
   */
  it('takes a cached list whole rather than merging it into the default one', () => {
    const merged = mergeCachedStore(
      { settings: { current: { keyboard_shortcuts: [{ keys: 'mod+comma' }, { keys: 'mod+slash' }] } } },
      { settings: { current: { keyboard_shortcuts: [{ keys: 'mod+k' }] } } },
    )

    expect(merged.settings.current.keyboard_shortcuts).toEqual([{ keys: 'mod+k' }])
  })

  it('leaves the default list in place when nothing was cached', () => {
    const merged = mergeCachedStore(
      { settings: { current: { keyboard_shortcuts: [{ keys: 'mod+comma' }] } } },
      {},
    )

    expect(merged.settings.current.keyboard_shortcuts).toEqual([{ keys: 'mod+comma' }])
  })

  it('merges into the defaults it was given', () => {
    const defaults = { settings: { current: { theme: 'light' } } }

    mergeCachedStore(defaults, { settings: { current: { theme: 'dark' } } })

    expect(defaults.settings.current.theme).toBe('dark')
  })
})

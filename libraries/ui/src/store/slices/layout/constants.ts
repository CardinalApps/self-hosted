export const STORE_KEY = 'layout'

export enum PAGE_LAYOUT {
  'standard' = 'standard',
  'thin' = 'thin',
  'full' = 'full',
  'fixed' = 'fixed',
  'files' = 'files',
  'virtual' = 'virtual',
  'procedural' = 'procedural',
}

export const PAGE_BEHAVIORS = Object.freeze({
  [PAGE_LAYOUT.standard]: Object.freeze({
    forceSidebarCollapse: false,
    showCollapseControl: true,
    showBackground: false,
  }),
  [PAGE_LAYOUT["thin"]]: Object.freeze({
    forceSidebarCollapse: false,
    showCollapseControl: true,
    showBackground: false,
  }),
  [PAGE_LAYOUT["full"]]: Object.freeze({
    forceSidebarCollapse: true,
    showCollapseControl: false,
    showBackground: true,
  }),
  [PAGE_LAYOUT["fixed"]]: Object.freeze({
    forceSidebarCollapse: false,
    showCollapseControl: true,
    showBackground: false,
  }),
  [PAGE_LAYOUT["files"]]: Object.freeze({
    forceSidebarCollapse: true,
    showCollapseControl: false,
    showBackground: true,
  }),
  [PAGE_LAYOUT["virtual"]]: Object.freeze({
    forceSidebarCollapse: false,
    showCollapseControl: true,
    showBackground: false,
  }),
  [PAGE_LAYOUT["procedural"]]: Object.freeze({
    forceSidebarCollapse: false,
    showCollapseControl: true,
    showBackground: false,
  }),
})

export enum SIDEBAR_MODE {
  'collapsed' = 'collapsed',
  'expanded' = 'expanded',
}

export enum SCROLL_RESTORATION_KEYS {
  'page' = 'page',
  'virtual' = 'virtual',
}

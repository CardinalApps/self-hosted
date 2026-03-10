import type { ReactNode } from 'react'

export enum ToolbarItem {
  DATERANGE = 'daterange',
  PAGINATION = 'pagination',
  ORDER = 'order',
  SORT = 'sort',
  DELETE = 'delete',
  DESELECT = 'deselect',
}

export interface ToolbarItemObject {
  slug: string,
  title?: string,
  initialValue?: unknown,
  options?: unknown[],
  render?: ToolbarItem | (({ toolbarName, onChange }) => ReactNode),
}

export type ToolbarItemProps = {
  toolbarName?: string,
  item?: ToolbarItemObject,
  numArchiveItems?: number,
  onChange?: (slug, newVal, toolbarValues) => void,
}

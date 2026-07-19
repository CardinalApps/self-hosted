import type { ReactNode } from 'react'

export type ToolbarOrderByType =
  'createdAt'
  | 'updatedAt'
  | 'title'
  | 'name'
  | 'duration'
  | 'bitrate'
  | 'trackNumber'
  | 'discNumber'
  | 'playCount'
  | 'random'

export type ToolbarOrderByDropdownType = ToolbarOrderByType[]

export enum ToolbarItem {
  BREADCRUMBS = 'breadcrumbs',
  DATERANGE = 'daterange',
  PAGINATION = 'pagination',
  ORDER = 'order',
  ORDERBY = 'orderby',
  DELETE = 'delete',
  DESELECT = 'deselect',
  RESET = 'reset',
  VIRTUALLAYOUT = 'virtuallayout',
  SIMPLECOUNT = 'simplecount',
  SELECTION = 'selection',
  CYCLE = 'cycle',
  ICON = 'icon',
}

export type CycleOption = {
  value: string,
  icon: string,
  title?: string,
}

export type BreadcrumbItem = {
  label: string,
  to: string,
}

export type BreadcrumbsExtra = {
  rootLink?: string,
  crumbs?: BreadcrumbItem[],
}

export interface ToolbarItemObject {
  slug: string,
  title?: string,
  initialValue?: unknown,
  options?: unknown[],
  extra?: BreadcrumbsExtra | unknown,
  /* Marks the item's group as slim: no group padding, full-height buttons. Typical for
     Cycle and Icon items. */
  slim?: boolean,
  render?: ToolbarItem | (({ toolbarName, onChange }) => ReactNode),
}

export type ToolbarItems = ToolbarItemObject[][]

export type ToolbarItemProps = {
  toolbarName?: string,
  item?: ToolbarItemObject,
  numArchiveItems?: number,
  onChange?: (slug, newVal, toolbarValues) => void,
}

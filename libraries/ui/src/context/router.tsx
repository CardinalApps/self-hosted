/**
 * @file All router functionality is provided by each app separately, and then
 * shared with the UI layer. This allows for one shared <Router> context in the
 * app.
 */

import { createContext } from 'react'
import { LinkProps, Params } from 'react-router-dom'

export type RouterContextRouter = (props) => React.ReactElement | null
export type RouterContextRoutes = (props) => React.ReactElement | null
export type RouterContextRoute = (props) => React.ReactElement | null
export type RouterContextNavigate = (props) => React.ReactElement | null
export type RouterContextLink = React.ForwardRefExoticComponent<LinkProps & React.RefAttributes<HTMLAnchorElement>>
export type RouterContextNavigateFunction = (path: string) => void
export type RouterContextParams = Params<string>

// react-router-dom actually has this typed as `any`
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type RouterContextLocation = any

export type RouterContextType = {
  Router: RouterContextRouter,
  Routes: RouterContextRoutes,
  Route: RouterContextRoute,
  Navigate: RouterContextNavigate,
  Link: RouterContextLink,
  useParams: () => RouterContextParams,
  useLocation: () => RouterContextLocation,
  navigate: RouterContextNavigateFunction,
  location: RouterContextLocation,
}

const defaultContext: RouterContextType = {
  Router: () => null,
  Routes: () => null,
  Route: () => null,
  Navigate: () => null,
  Link: null,
  useParams: () => ({}),
  useLocation: () => ({}),
  navigate: () => {},
  location: {},
}

export const RouterContext = createContext<RouterContextType>(defaultContext)

import type { ComponentType, ErrorInfo, PropsWithChildren, ReactNode } from 'react'
import { ErrorBoundary as ErrorBoundaryImpl } from 'react-error-boundary'

type ErrorBoundaryProps = PropsWithChildren<{
  fallback?: ReactNode,
  onError?: (error: Error, info: ErrorInfo) => void,
}>

/*
 * react-error-boundary is hoisted to the workspace root, so its class types resolve against the
 * root @types/react 19 while this package type-checks with @types/react 18. The two Component
 * shapes are structurally incompatible at JSX check time (`refs` was removed in 19), even though
 * the runtime is fine. Casting once here keeps every consumer on a single clean import.
 */
export const ErrorBoundary = ErrorBoundaryImpl as unknown as ComponentType<ErrorBoundaryProps>

import { CSSProperties, PropsWithChildren, useEffect, useRef, useState } from 'react'
import clsx from 'clsx'

import useScrolledToBottom from '../../../../hooks/useScrolledToBottom'
import H2 from '../../../typography/H2'
import useScrollPointRestoration from '../../../../hooks/useScrollPointRestoration'
import Card from '../../../layout/Card'
import Shimmer from '../../../layout/Shimmer'
import Icon from '../../../typography/Icon'

import i18n from '../i18n'
import H5 from '../../../typography/H5'

// How far past the viewport a block can be and still initialize (one viewport of lookahead)
const LAZY_INIT_MARGIN = '0px 0px 100% 0px'

export type ProceduralProps = {
  name: string,
  className?: string | string[],
  isReady?: boolean,
  hasContent?: boolean,
  emptyTitle?: string,
  emptyMessage?: string,
  onLoadMore?: () => void
}

/**
 * Allows for layout blocks to be generated procedurally as the user scrolls.
 * Also allows for static layouts.
 */
function ProceduralLayout({
  className,
  children,
  isReady = false,
  hasContent = false,
  emptyTitle,
  emptyMessage,
  onLoadMore,
}: PropsWithChildren<ProceduralProps>) {
  useScrollPointRestoration('.procedural-layout')
  const layoutRef = useRef(null)
  const [atBottom] = useScrolledToBottom(layoutRef, 500)

  useEffect(() => {
    if (atBottom) {
      onLoadMore?.()
    }
  }, [atBottom])

  if (isReady && !hasContent) {
    return (
      <div className="procedural-empty">
        <Card
          border={0}
          shadow={1}
          bg={1}
          header={<Icon fa="fas fa-info-circle" hoverType={null} />}
        >
          <>
            <H5>{emptyTitle || i18n['procedural.empty.title']['en']}</H5>
            <p dangerouslySetInnerHTML={{ __html: emptyMessage || i18n['procedural.empty.desc']['en'] }} />
          </>
        </Card>
      </div>
    )
  }

  return hasContent && isReady && (
    <div
      ref={layoutRef}
      className={clsx('procedural-layout', className)}
    >
      {children}
    </div>
  )
}

export type ProceduralBlockSize =
    "12x1"
  | "12x2"
  | "12x3"
  | "12x4"
  | "12x5"
  | "12x6"
  | "6x1"
  | "6x2"
  | "6x3"
  | "6x4"
  | "6x5"
  | "6x6"
  | "4x1"
  | "4x2"
  | "4x3"
  | "4x4"
  | "4x5"
  | "4x6"
  | "8x1"
  | "8x2"
  | "8x3"
  | "8x4"
  | "8x5"
  | "8x6"

export type ProceduralBlockProps = {
  size: ProceduralBlockSize,
  style?: CSSProperties,
  flush?: boolean,
}

/*
  Blocks initialize lazily. A block renders a shimmer until it scrolls near the
  viewport, then mounts its real contents and stays mounted, so a page can
  declare any number of blocks without paying their query cost up front.
*/
ProceduralLayout.Block = (props: PropsWithChildren<ProceduralBlockProps>) => {
  const blockRef = useRef<HTMLDivElement>(null)
  const [initialized, setInitialized] = useState(typeof IntersectionObserver === 'undefined')

  useEffect(() => {
    if (initialized || !blockRef.current) {
      return
    }

    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setInitialized(true)
      }
    }, { rootMargin: LAZY_INIT_MARGIN })

    observer.observe(blockRef.current)
    return () => observer.disconnect()
  }, [initialized])

  return (
    <div
      ref={blockRef}
      className={clsx("procedural-layout-block", props.flush && 'flush')}
      data-size={props.size}
    >
      <div className="procedural-layout-block-inner" style={props.style}>
        {initialized ? props.children : <Shimmer />}
      </div>
    </div>
  )
}

export type ProceduralTitleProps = {
  style?: CSSProperties,
}

ProceduralLayout.Title = (props: PropsWithChildren<ProceduralTitleProps>) => {
  return (
    <div
      className="procedural-layout-block"
    >
      <div className="procedural-layout-block-title page-title-bar" style={props.style}>
        <H2 className="page-title">{props.children}</H2>
      </div>
    </div>
  )
}

export default ProceduralLayout

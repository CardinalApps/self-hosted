import type { PropsWithChildren, ReactNode, CSSProperties } from 'react'

import './Columns.css'

type ColumnProps = {
  cols?: number,
  mediumCols?: number,
  smallCols?: number,
  minWidth?: number | string,
  width?: number | string,
  justifyContent?: 'space-between' | 'space-around' | 'flex-start' | 'flex-end' | 'center',
  alignItems?: 'space-between' | 'space-around' | 'flex-start' | 'flex-end' | 'center',
  grow?: boolean,
  shrink?: boolean,
  direction?: 'row' | 'column',
  className?: string,
  style?: CSSProperties,
  children?: ReactNode,
}

const Column = ({
  cols,
  mediumCols,
  smallCols,
  minWidth,
  width,
  justifyContent = 'center',
  alignItems = 'center',
  grow = false,
  shrink = true,
  direction = 'row',
  className = '',
  style,
  children,
  ...props
}: PropsWithChildren<ColumnProps>) => {
  return (
    <div
      className={`column ${className}`}
      data-cols={cols}
      data-medium-cols={mediumCols}
      data-small-cols={smallCols}
      style={{
        ...(justifyContent && { justifyContent }),
        ...(alignItems && { alignItems }),
        ...(minWidth && { minWidth }),
        ...(width && { width }),
        ...(direction && { flexDirection: direction }),
        flexGrow: grow ? 1 : 0,
        flexShrink: shrink ? 1 : 0,
        ...style,
      }}
      {...props}
    >
      {children}
    </div>
  )
}

export default Column

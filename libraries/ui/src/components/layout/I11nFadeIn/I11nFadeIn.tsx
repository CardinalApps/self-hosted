import type { CSSProperties, ReactNode, ElementType } from 'react'
import { motion, useReducedMotion } from 'framer-motion'

type IntrinsicTag = 'div' | 'p' | 'span' | 'section' | 'article' | 'header' | 'footer' | 'aside' | 'nav' | 'main' | 'li' | 'ul' | 'ol'

export type I11nFadeInProps = {
  children: ReactNode,
  // Animation duration in seconds.
  duration?: number,
  // Animation delay in seconds.
  delay?: number,
  className?: string,
  style?: CSSProperties,
  // Underlying HTML tag. Defaults to 'div'.
  as?: IntrinsicTag,
}

/* Inclusive fade-in wrapper. When the user (or Playwright, via emulated
   `prefers-reduced-motion: reduce`) prefers reduced motion, the motion wrapper
   is skipped entirely and the children render at full opacity immediately.
   Bypassing the wrapper — rather than just shortening the transition — keeps
   Playwright trace-viewer DOM snapshots from capturing a mid-fade frame. */
function I11nFadeIn({
  children,
  duration = 0.4,
  delay = 0,
  className,
  style,
  as = 'div',
}: I11nFadeInProps) {
  const shouldReduceMotion = useReducedMotion()

  if (shouldReduceMotion) {
    const Tag = as as ElementType
    return <Tag className={className} style={style}>{children}</Tag>
  }

  const MotionTag = motion[as] as ElementType

  return (
    <MotionTag
      className={className}
      style={style}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration, delay, type: 'tween' }}
    >
      {children}
    </MotionTag>
  )
}

export default I11nFadeIn

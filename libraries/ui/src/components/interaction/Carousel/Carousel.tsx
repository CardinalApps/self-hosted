import { useEffect, useState, type PropsWithChildren } from 'react'
import useEmblaCarousel from 'embla-carousel-react'
import Button from '../Button'
import H3 from '../../typography/H3'
import { WheelGesturesPlugin } from 'embla-carousel-wheel-gestures'

import './Carousel.css'
import clsx from 'clsx'

type CarouselState = {
  pagination: () => React.ReactNode,
  prevBtn: () => React.ReactNode,
  nextBtn: () => React.ReactNode,
}

type CarouselProps = {
  className?: string,
  width?: string | number,
  height?: string | number,
  title?: string,
  prev?: boolean,
  next?: boolean,
  maxPages?: number,
  gap?: string,
  initialSlide?: number,
  axis?: 'x' | 'y',
  dragFree?: boolean,
  itemWidth?: string | number,
  itemsPerSlide?: number,
  // Gives the pagination pill and the prev/next buttons the theme's glass treatment
  glass?: boolean,
  items: React.ReactNode[],
  onChange?: (state: CarouselState) => void,
}

/**
 * Carousel component.
 */
const Carousel = ({
  className,
  width = '100%',
  height,
  title,
  prev,
  next,
  maxPages,
  gap = '0px',
  initialSlide = 1,
  axis = 'x',
  dragFree = true,
  itemWidth = '100%',
  itemsPerSlide = 1,
  glass = false,
  items = [],
  onChange = () => {},
}: PropsWithChildren<CarouselProps>) => {
  const [emblaRef, emblaApi] = useEmblaCarousel({
    loop: false,
    startIndex: initialSlide - 1,
    slidesToScroll: itemsPerSlide,
    dragFree,
    axis,
  }, [WheelGesturesPlugin({
    forceWheelAxis: 'x',
  })])

  // Pagination only means something once there's more than one page to page through
  const [hasMultiplePages, setHasMultiplePages] = useState(false)

  useEffect(() => {
    if (!emblaApi) return

    const updatePageCount = () => setHasMultiplePages(emblaApi.scrollSnapList().length > 1)

    updatePageCount()
    emblaApi.on('reInit', updatePageCount)

    return () => {
      emblaApi.off('reInit', updatePageCount)
    }
  }, [emblaApi])

  const goToPrev = () => {
    emblaApi?.scrollPrev()
  }
  const goToNext = () => {
    emblaApi?.scrollNext()
  }

  const prevBtn = () => hasMultiplePages ? (
    <Button
      className={clsx('embla__prev', glass && 'glass')}
      onClick={goToPrev}
      icon="fas fa-angle-left"
      circleIcon
    />
  ) : null

  const nextBtn = () => hasMultiplePages ? (
    <Button
      className={clsx('embla__next', glass && 'glass')}
      onClick={goToNext}
      icon="fas fa-angle-right"
      circleIcon
    />
  ) : null

  const pagination = () => hasMultiplePages ? (
    <div className={clsx('carousel-pagination', glass && 'glass')}>{emblaApi?.selectedScrollSnap() + 1} / {maxPages}</div>
  ) : null

  useEffect(() => {
    const update: CarouselState = {
      pagination,
      prevBtn,
      nextBtn,
    }
    if (emblaApi) {
      emblaApi.on('select', () => {
        onChange(update)
      })
    }
    onChange?.(update)
  }, [emblaApi, maxPages, glass, hasMultiplePages])

  return (
    <div
      className={clsx("carousel", "embla", className)}
      style={{
        width,
        height,
        // @ts-expect-error this actually works
        '--slide-size': itemWidth,
        '--slide-spacing': gap,
      }}
    >
      {(title || prev || next ) && (
          <header className="carousel-header">
            {title && (
              <H3 className="carousel-title">
                {title}
              </H3>
            )}
            {hasMultiplePages && (prev || next) && (
              <div className="carousel-controls">
                <div className="carousel-pagination">
                  {prev && (
                    prevBtn()
                  )}
                  {next && (
                    nextBtn()
                  )}
                </div>
              </div>
            )}
          </header>
      )}
      <div
        ref={emblaRef}
        className="embla__viewport"
      >
        <div className="embla__container">
          {items.map((item, i) => {
            return (
              <div className="embla__slide" key={i}>
                {item}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default Carousel

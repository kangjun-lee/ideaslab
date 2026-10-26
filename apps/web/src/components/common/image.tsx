'use client'

import { useState } from 'react'
import NextImage, { ImageProps } from 'next/image'
import { cn } from 'cn'

import { Skeleton } from './skeleton'

export interface CustomImageProps extends ImageProps {
  skeletonClassName?: string
  wrapperClassName?: string
}

export function Image({
  className,
  skeletonClassName,
  wrapperClassName,
  onLoad,
  fill,
  width,
  height,
  style,
  alt = '',
  ...props
}: CustomImageProps) {
  const [isLoaded, setIsLoaded] = useState(false)

  if (fill) {
    return (
      <>
        {!isLoaded && (
          <Skeleton className={cn('absolute inset-0 w-full h-full', skeletonClassName)} />
        )}
        <NextImage
          fill
          alt={alt}
          className={cn(
            className,
            'transition-opacity duration-300',
            !isLoaded ? 'opacity-0' : 'opacity-100',
          )}
          style={style}
          onLoad={(e) => {
            setIsLoaded(true)
            onLoad?.(e)
          }}
          {...props}
        />
      </>
    )
  }

  const isRoundedFull = className?.includes('rounded-full')
  const isRoundedLg = className?.includes('rounded-lg')
  const isRoundedMd = className?.includes('rounded-md')
  const isRounded = className?.includes('rounded') && !isRoundedFull && !isRoundedLg && !isRoundedMd

  return (
    <span
      className={cn(
        'relative inline-block overflow-hidden align-middle',
        isRoundedFull && 'rounded-full',
        isRoundedLg && 'rounded-lg',
        isRoundedMd && 'rounded-md',
        isRounded && 'rounded',
        wrapperClassName,
      )}
      style={{
        width: width ? (typeof width === 'number' ? `${width}px` : width) : undefined,
        height: height ? (typeof height === 'number' ? `${height}px` : height) : undefined,
        ...style,
      }}
    >
      {!isLoaded && (
        <Skeleton
          className={cn(
            'absolute inset-0 w-full h-full',
            isRoundedFull && 'rounded-full',
            isRoundedLg && 'rounded-lg',
            isRoundedMd && 'rounded-md',
            isRounded && 'rounded',
            skeletonClassName,
          )}
        />
      )}
      <NextImage
        width={width}
        height={height}
        alt={alt}
        className={cn(
          className,
          'transition-opacity duration-300',
          !isLoaded ? 'opacity-0' : 'opacity-100',
        )}
        onLoad={(e) => {
          setIsLoaded(true)
          onLoad?.(e)
        }}
        {...props}
      />
    </span>
  )
}
export { Image as CustomImage }

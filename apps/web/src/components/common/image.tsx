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

  // max-h 관련 클래스가 있는지 확인
  const maxHClass = className?.split(' ').find((c) => c.startsWith('max-h-'))

  // 고정 작은 크기 (아바타/아이콘 등 width, height <= 64)와 일반 반응형 이미지 구분
  const isSmallFixed =
    typeof width === 'number' && typeof height === 'number' && width <= 64 && height <= 64

  return (
    <span
      className={cn(
        'relative overflow-hidden align-middle',
        isSmallFixed ? 'inline-block' : 'block w-full max-w-full',
        maxHClass,
        isRoundedFull && 'rounded-full',
        isRoundedLg && 'rounded-lg',
        isRoundedMd && 'rounded-md',
        isRounded && 'rounded',
        wrapperClassName,
      )}
      style={{
        ...(isSmallFixed
          ? {
              width: `${width}px`,
              height: `${height}px`,
            }
          : {
              maxWidth: '100%',
              aspectRatio: width && height ? `${width} / ${height}` : undefined,
            }),
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
          isSmallFixed ? '' : 'w-full h-auto',
          maxHClass && 'h-full object-cover',
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

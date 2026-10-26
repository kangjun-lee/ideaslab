import dynamic from 'next/dynamic'

export * from './button'
export * from './calendar'
export * from './dialog'
export * from './icons'
export * from './image'
export * from './page-back'
export * from './pin-input'
export * from './skeleton'
export * from './step'
export * from './tab-select'
export * from './time'
export * from './transition'
export * from './user-menu'

export const TimeDynamic = dynamic(() => import('./time').then(({ Time }) => Time), { ssr: false })

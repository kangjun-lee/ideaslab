import { createContext, Fragment, ReactNode } from 'react'
import { Dialog as HDialog, Transition } from '@headlessui/react'
import { XMarkIcon } from '@heroicons/react/24/outline'
import classNames from 'classnames'

import { Button } from './button'
import { Skeleton } from './skeleton'
import { TransitionChild } from './transition'

interface DialogContext {
  isOpen: boolean
  close: () => void
}

const dialogContext = createContext<Partial<DialogContext>>({})

const DialogTitle = ({ title }: { title: string }) => {
  return (
    <dialogContext.Consumer>
      {({ close: onClose }) => (
        <HDialog.Title
          as="h3"
          className="w-full text-2xl font-medium leading-6 text-title-color flex justify-between items-center pb-4"
        >
          <div>{title}</div>
          <Button forIcon variant="subtle" onClick={onClose}>
            <span className="sr-only">모달 닫기</span>
            <XMarkIcon className="w-5 h-5" />
          </Button>
        </HDialog.Title>
      )}
    </dialogContext.Consumer>
  )
}

const DialogContent = ({
  children,
  size = 'full',
}: {
  children: ReactNode
  size?: 'full' | 'auto'
}) => {
  return (
    <div
      className={classNames(
        'fixed inset-0 flex items-center justify-center overflow-y-hidden',
        size === 'full' ? 'px-4 py-[10dvh] sm:px-6' : 'sm:p-5',
      )}
    >
      <div
        className={classNames(
          'flex items-center justify-center text-center h-full min-h-full w-full',
          size === 'auto' && 'p-5',
        )}
      >
        <TransitionChild type="modal">
          <HDialog.Panel
            className={classNames(
              'bg-base text-base-color max-w-full lg:max-w-4xl transform text-left align-middle shadow-xl transition-transform motion-reduce:transition-none flex flex-col',
              size === 'full' && 'w-full h-full rounded-xl',
              size === 'auto' && 'rounded-xl',
            )}
          >
            <div
              className={classNames(
                'px-8 py-8 overflow-y-hidden',
                size === 'full' && 'flex h-full min-h-0 flex-col',
              )}
            >
              {children}
            </div>
          </HDialog.Panel>
        </TransitionChild>
      </div>
    </div>
  )
}

const DialogLoading = ({ children }: { children?: ReactNode }) => {
  return (
    <dialogContext.Consumer>
      {({ close }) => (
        <div
          className="animate-pulse flex flex-col px-8 mt-8 gap-y-4 lg:max-w-4xl"
          role="presentation"
          aria-label="데이터 불러오는중"
        >
          <div className="flex justify-between items-center">
            <Skeleton className="h-12 w-48" />
            <Button variant="subtle" onClick={close} forIcon>
              <XMarkIcon width={24} height={24} />
            </Button>
          </div>
          {children}
        </div>
      )}
    </dialogContext.Consumer>
  )
}

const DialogActions = ({ children }: { children: ReactNode }) => {
  return <div className="flex gap-x-3">{children}</div>
}

export const Dialog = ({
  isOpen,
  close,
  children,
  blurBackdrop = false,
}: {
  isOpen: boolean
  close: () => void
  children: ReactNode
  blurBackdrop?: boolean
}) => {
  return (
    <dialogContext.Provider value={{ isOpen, close }}>
      <Transition appear show={isOpen} as={Fragment}>
        <HDialog as="div" className="relative z-10" onClose={close}>
          <TransitionChild type="overlay">
            <div
              className={classNames(
                'fixed inset-0',
                blurBackdrop ? 'bg-black/30 backdrop-blur-md' : 'bg-black/50',
              )}
            />
          </TransitionChild>
          {children}
        </HDialog>
      </Transition>
    </dialogContext.Provider>
  )
}

Dialog.Title = DialogTitle
Dialog.Loading = DialogLoading
Dialog.Content = DialogContent
Dialog.Actions = DialogActions

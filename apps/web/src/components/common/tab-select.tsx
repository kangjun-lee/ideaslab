import { ReactNode } from 'react'
import { Tab as HTab } from '@headlessui/react'
import classNames from 'classnames'

interface TabProps {
  list: string[]
  children: ReactNode
}

export const Tab = ({ list, children }: TabProps) => {
  return (
    <HTab.Group as="div">
      <HTab.List
        className="flex space-x-1.5 rounded-xl dark:bg-gray-800 p-1.5 bg-gray-100"
        as="div"
      >
        {list.map((item, index) => (
          <HTab
            as="div"
            key={index}
            className={({ selected }) =>
              classNames(
                'w-full rounded-lg py-2.5 text-center',
                'focus:outline-none',
                selected
                  ? 'bg-white dark:bg-white/[0.12] brightness-150 shadow dark:text-white font-bold'
                  : 'text-description-color hover:text-title-color',
              )
            }
          >
            {item}
          </HTab>
        ))}
      </HTab.List>
      <HTab.Panels as="div" className="mt-4">
        {children}
      </HTab.Panels>
    </HTab.Group>
  )
}

const TabPanel = ({ children, className }: { children: ReactNode; className?: string }) => (
  <HTab.Panel as="div" className={className}>
    {children}
  </HTab.Panel>
)
Tab.Panel = TabPanel

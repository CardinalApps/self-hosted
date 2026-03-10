import { useState } from 'react'
import type { PropsWithChildren } from 'react'

import './Tabs.css'

type TabsProps = {
  labels: string[],
  initialTab?: number,
  onChange?: (label, index, e) => void,
}

/**
 * Allows the user to input search queries.
 */
const Tabs = ({
  labels = [],
  initialTab = 0,
  onChange = () => {},
}: PropsWithChildren<TabsProps>) => {
  const [activeTab, setActiveTab] = useState(initialTab)

  const onTabClick = (label, index, e) => {
    if (activeTab !== index) {
      setActiveTab(index)
      onChange(label, index, e)
    }
  }

  const getTabId = (label, index) => {
    return `${index}-${label.replaceAll(' ', '-')}`
  }

  return (
    <div className="tabs">
      {labels.map((label, index) => (
        <div
          className={`tab ${activeTab === index ? 'active' : ''}`}
          data-tab-id={getTabId(label, index)}
          key={getTabId(label, index)}
        >
          <button
            type="button"
            onClick={(e) => onTabClick(label, index, e)}
          >
            {label}
          </button>
        </div>
      ))}
    </div>
  )
}

export default Tabs

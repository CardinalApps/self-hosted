import { useState } from 'react'
import { useSelector } from 'react-redux'
import shuffle from 'lodash.shuffle'

import AppPage from '../../AppPage'
import VirtualLayout from '../../layouts/Virtual'

import Toolbar from '../../../../interaction/Toolbar'

import { PAGE_LAYOUT, layoutSelectors } from '../../../../../store/slices/layout'
import { ToolbarItem } from '../../../../interaction/Toolbar/types'

const toolbarName = 'test-toolbar'
const virtualViewName = 'sandbox-page'

function VirtualPage() {
  const [shuffled, setShuffled] = useState()
  const { [toolbarName]: toolbarValues } = useSelector(layoutSelectors.toolbarValues)
  const { order, sort } = toolbarValues || {}
  const itemWidth = 220
  const itemHeight = 220
  const numItems = 5000
  let fixedItems = new Array(numItems).fill(true).map((e, i) => {
    return (
      <div
        key={i}
        style={{
          width: itemWidth,
          height: itemHeight,
          outline: '1px solid #aaa',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          background: '#ddd',
        }}>
        {i === 0 ? <p>The virtual layout implements virtual scrolling for large data sets.</p> : i + 1}
      </div>
    )
  })

  if (sort === 'random') {
    if (shuffled) {
      fixedItems = shuffled
    } else {
      setShuffled(shuffle(fixedItems))
    }
  }
  if (order === 'desc') {
    fixedItems.reverse()
  }

  return (
    <AppPage
      layout={PAGE_LAYOUT.virtual}
      pageTitle="Layout: virtual scroll"
      restoreScrollPoint={false}
      toolbar={(
        <Toolbar
          name={toolbarName}
          virtualViewName={virtualViewName}
          items={[
            {
              slug: 'order',
              render: ToolbarItem.ORDER,
            },
            {
              slug: 'sort',
              render: ToolbarItem.SORT,
              initialValue: 'number',
              options: [
                {
                  label: 'Number',
                  value: 'number',
                },
                {
                  label: 'Random',
                  value: 'random',
                },
              ],
            },
          ]}
        />
      )}
    >
      <VirtualLayout
        name="demo-page"
        toolbarName={toolbarName}
        //items={fixedItems}
        itemHeight={itemHeight}
        itemWidth={itemWidth}
        scrollRestorationKey={virtualViewName}
      />
    </AppPage>
  )
}

export default VirtualPage

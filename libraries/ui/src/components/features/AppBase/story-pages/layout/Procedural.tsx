import AppPage from '../../AppPage'

import ProceduralLayout, { ProceduralBlockSize } from '../../layouts/Procedural'
import { PAGE_LAYOUT } from '../../../../../store/slices/layout'

function ProceduralPage() {
  const example = () => [12, 6, 4].map((col) => {
    return [1, 2, 3, 4, 5, 6].map((row) => {
      const size = `${col}x${row}` as ProceduralBlockSize
      return (
        <ProceduralLayout.Block size={size} style={{ backgroundColor: 'var(--bg-4)', padding: 20, borderRadius: 22 }} key={size}>
          {size}
          {size === '12x1' && <p>The procedural layout is used to create a ridgid non-virtualized infinite scroll.</p>}
        </ProceduralLayout.Block>
      )
    })
  })
  return (
    <AppPage layout={PAGE_LAYOUT.procedural}>
      <ProceduralLayout
        name='sandbox'
        className='procedural-layout-demo'
      >
        <ProceduralLayout.Title>
          Layout: Procedural
        </ProceduralLayout.Title>
        {example()}
        <ProceduralLayout.Block size="8x4" style={{ backgroundColor: 'var(--bg-4)', padding: 20, borderRadius: 22 }}>
          8x4
        </ProceduralLayout.Block>
        <ProceduralLayout.Block size="4x4" style={{ backgroundColor: 'var(--bg-4)', padding: 20, borderRadius: 22 }}>
          4x4
        </ProceduralLayout.Block>
      </ProceduralLayout>
    </AppPage>
  )
}

export default ProceduralPage

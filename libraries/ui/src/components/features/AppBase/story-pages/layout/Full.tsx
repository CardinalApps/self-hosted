import AppPage from '../../AppPage'

import H3 from '../../../../typography/H3'
import WrittenText from '../../../../typography/WrittenText'

import { PAGE_LAYOUT } from '../../../../../store/slices/layout'

function FullPage() {
  return (
    <AppPage layout={PAGE_LAYOUT.full} style={{ backgroundColor: '#a4d8b5', paddingLeft: 120, paddingTop: 40, height: '100%' }}>
      <WrittenText>
        <H3>Layout: full</H3>
        <p>The <code>full</code> layout provides the most immersive page experience.</p>
        <ul>
          <li><strong>Inherits:</strong> none</li>
          <li>
            <strong>Features:</strong>
            <ul>
              <li>Includes the app header.</li>
              <li>Includes the navigation sidebar, defaulting to its collapsed mode.</li>
              <li>Includes navigation sidebar cannot be expanded.</li>
              <li>The navigation sidebar floats above the content, as demonstrated by the background color.</li>
              <li>No margins.</li>
              <li>No padding.</li>
              <li>Scrolling must be implemented by the page.</li>
            </ul>
          </li>
        </ul>
      </WrittenText>
    </AppPage>
  )
}

export default FullPage

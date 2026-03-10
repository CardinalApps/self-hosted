import AppPage from '../../AppPage'
import WrittenText from '../../../../typography/WrittenText'

import { PAGE_LAYOUT } from '../../../../../store/slices/layout'

function StandardPage() {
  return (
    <AppPage layout={PAGE_LAYOUT.standard} pageTitle="Layout: standard">
      <WrittenText>
        <p>The <code>standard</code> layout provides the default app layout, and is designed to handle most types of content.</p>
        <ul>
          <li><strong>Inherits:</strong> none</li>
          <li>
            <strong>Features:</strong>
            <ul>
              <li>Includes the app header.</li>
              <li>Includes the page title bar with doc link.</li>
              <li>Includes the navigation sidebar, defaulting to its expanded mode.</li>
              <li>Handles margins and padding around the page content.</li>
              <li>Handles scrolling of the page content.</li>
            </ul>
          </li>
          <li>
            <strong>Demonstration:</strong>
            <ol>
              {Array.from(Array(100)).map((v, i) => <li key={i}>Lorem ipsum dolor sit amet.</li>)}
            </ol>
          </li>
        </ul>
      </WrittenText>
    </AppPage>
  )
}

export default StandardPage

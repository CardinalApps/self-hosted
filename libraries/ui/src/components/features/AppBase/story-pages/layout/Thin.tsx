import AppPage from '../../AppPage'

import WrittenText from '../../../../typography/WrittenText'

import { PAGE_LAYOUT } from '../../../../../store/slices/layout'

function ThinPage() {
  return (
    <AppPage layout={PAGE_LAYOUT.thin} pageTitle="Layout: thin" pageDocLink="/guides/best-practices">
      <WrittenText>
        <p>The <code>thin</code> layout lets the page control the gutters.</p>
        <ul>
          <li><strong>Inherits:</strong> Standard</li>
          <li>
            <strong>Features:</strong>
            <ul>
              <li>All margins and padding are removed.</li>
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

export default ThinPage

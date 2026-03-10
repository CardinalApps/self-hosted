import AppPage from '../../AppPage'

import WrittenText from '../../../../typography/WrittenText'

import { PAGE_LAYOUT } from '../../../../../store/slices/layout'

function FixedPage() {
  return (
    <AppPage layout={PAGE_LAYOUT.fixed} pageTitle="Layout: fixed" pageDocLink="/guides/best-practices">
      <WrittenText>
        <p>The <code>fixed</code> layout allows the page to control the scrolling.</p>
        <ul>
          <li><strong>Inherits:</strong> Thin</li>
          <li>
            <strong>Features:</strong>
            <ul>
              <li>Scrolling must be implemented by the page.</li>
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

export default FixedPage

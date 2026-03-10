import AppPage from '../../AppPage'

import WrittenText from '../../../../typography/WrittenText'
import DirectoryTree from '../../../../interaction/DirectoryTree'

import { PAGE_LAYOUT } from '../../../../../store/slices/layout'

function FilesPage() {
  return (
    <AppPage layout={PAGE_LAYOUT['files']} pageTitle="Layout: files" pageDocLink="/guides/best-practices">
      <WrittenText>
        <p>The <code>files</code> layout is optimized for browsing and working with files.</p>
        <ul>
          <li><strong>Inherits:</strong> Standard</li>
          <li>
            <strong>Features:</strong>
            <ul>
              <li>Includes a file browser column.</li>
              <li>The navigation sidebar automatically collapses.</li>
              <li>
                <strong>Demonstration:</strong>
                <ol>
                  {Array.from(Array(100)).map((v, i) => <li key={i}>Lorem ipsum dolor sit amet.</li>)}
                </ol>
              </li>
            </ul>
          </li>
        </ul>
      </WrittenText>
      <DirectoryTree
        title="Uses real music"
        rootDir="music"
        portal={true}
        selectDirectory={true}
        // onSelect={(child, tree) => {
        //   console.log('Selected', child, tree)
        // }}
      />
    </AppPage>
  )
}

export default FilesPage

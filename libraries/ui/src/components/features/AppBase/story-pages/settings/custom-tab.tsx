import { useState } from 'react'

import Button from '../../../../interaction/Button/Button'
import Confirm from '../../../../interaction/Confirm'

/**
 * Custom settings pages for the Media Server.
 */
function CustomSettingsTab() {
  const [showConfirm, setShowConfirm] = useState(false)

  return (
    <div>
      <Button onClick={() => setShowConfirm(true)}>Open confirmation modal</Button>
      {!!showConfirm &&
        <Confirm
          title="Confirm"
          message="This is a test confirmation."
          mustEnterText="Are you there Candy Cane?"
          onClose={() => {
            setShowConfirm(false)
          }}
        />
      }
    </div>
  )
}

export default CustomSettingsTab

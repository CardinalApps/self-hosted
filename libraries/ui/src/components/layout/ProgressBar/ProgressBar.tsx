import { formatWithCommas } from '../../../lib/formatting/number'

import './ProgressBar.css'

type ProgressBarProps = {
  current: number,
  total: number,
  showCount: boolean,
}

/**
 * A progress bar.
 */
const ProgressBar = ({
  current = 0,
  total = 0,
  showCount = false,
}: ProgressBarProps) => {
  const progressPercent = total ? Math.ceil((current / total) * 100) : 0
  return (
    <div className="progress-bar-box">
      <div className="progress-bar">
        <div className="current-progress" style={{ width: `${progressPercent}%` }}></div>
      </div>
      {!!showCount && <p className="current-progress-count">{formatWithCommas(current)} / {formatWithCommas(total)}</p>}
    </div>
  )
}

export default ProgressBar

import './ProgressCircle.css'

type ProgressCircleProps = {
  // number between 0 and 1
  current: number,
  showPercentage?: boolean,
  size?: number,
  strokeWidth?: number,
  fontSize?: number
}

/**
 * A circular progress indicator.
 */
const ProgressCircle = ({
  current = 0,
  showPercentage = false,
  fontSize = 16,
  size = 80,
  strokeWidth = 6,
}: ProgressCircleProps) => {
  const progressPercent = Math.min(Math.round(current * 100), 100)
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (progressPercent / 100) * circumference

  return (
    <div className="progress-circle-box" style={{ width: size, height: size }}>
      <svg
        className="progress-circle"
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
      >
        <circle
          className="progress-circle-track"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
        />
        <circle
          className="progress-circle-fill"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      {!!showPercentage && <p className="progress-circle-count" style={{ fontSize }}>{progressPercent}%</p>}
    </div>
  )
}

export default ProgressCircle

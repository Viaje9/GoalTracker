import type { Goal } from '../types';

interface ProgressBarProps {
  goals: Goal[];
}

const RADIUS = 22;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export default function ProgressBar({ goals }: ProgressBarProps) {
  const total = goals.length;
  const done = goals.filter(g => g.checked).length;
  const pct = total === 0 ? 0 : (done / total) * 100;
  const offset = CIRCUMFERENCE - (CIRCUMFERENCE * pct) / 100;

  return (
    <div className="progress-section">
      <div className="progress-ring-wrap">
        <svg className="progress-ring" viewBox="0 0 52 52">
          <circle className="progress-ring-bg" cx="26" cy="26" r={RADIUS} />
          <circle
            className="progress-ring-fill"
            cx="26"
            cy="26"
            r={RADIUS}
            style={{
              strokeDasharray: CIRCUMFERENCE,
              strokeDashoffset: offset,
            }}
          />
        </svg>
        <div className="progress-ring-text">
          {total === 0 ? '—' : `${Math.round(pct)}%`}
        </div>
      </div>
      <div className="progress-detail">
        <div className="progress-label">完成進度</div>
        <div className="progress-count">
          <span>{done}</span> / {total} 項目標
        </div>
        <div className="progress-bar-mini">
          <div className="progress-fill-mini" style={{ width: `${pct}%` }} />
        </div>
      </div>
    </div>
  );
}

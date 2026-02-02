import { getWeekRange, getISOWeek, formatDate } from '../hooks/useGoals';

interface WeekNavProps {
  weekOffset: number;
  onPrev: () => void;
  onNext: () => void;
}

export default function WeekNav({ weekOffset, onPrev, onNext }: WeekNavProps) {
  const range = getWeekRange(weekOffset);
  const year = range.start.getFullYear();
  const weekNum = getISOWeek(range.start);
  const label = `${year} 第 ${weekNum} 週${weekOffset === 0 ? '（本週）' : ''}`;
  const dates = `${formatDate(range.start)} — ${formatDate(range.end)}`;

  return (
    <nav className="week-nav">
      <button className="week-nav-btn" onClick={onPrev}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15 18 9 12 15 6"/>
        </svg>
      </button>
      <div className="week-info">
        <div className="week-label">{label}</div>
        <div className="week-dates">{dates}</div>
      </div>
      <button className="week-nav-btn" onClick={onNext}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="9 18 15 12 9 6"/>
        </svg>
      </button>
    </nav>
  );
}

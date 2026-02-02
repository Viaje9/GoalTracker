import { useState, useRef, useEffect } from 'react';
import type { Goal } from '../types';
import GoalCard from './GoalCard';

const PlusSvg = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <line x1="12" y1="5" x2="12" y2="19"/>
    <line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
);

interface GoalListProps {
  goals: Goal[];
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onAddGoal: (text: string) => void;
  onAddSub: (goalId: string, text: string, type: 'checkbox' | 'list', parentSubId?: string) => void;
  onToggleSub: (goalId: string, subId: string) => void;
  onRemoveSub: (goalId: string, subId: string) => void;
  onRenameGoal: (id: string, newText: string) => void;
  onRenameSub: (goalId: string, subId: string, newText: string) => void;
}

export default function GoalList({
  goals, onToggle, onDelete, onAddGoal, onAddSub, onToggleSub, onRemoveSub, onRenameGoal, onRenameSub,
}: GoalListProps) {
  const [adding, setAdding] = useState(false);
  const [text, setText] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (adding) inputRef.current?.focus();
  }, [adding]);

  const handleSave = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    onAddGoal(trimmed);
    setText('');
    setAdding(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.nativeEvent.isComposing) handleSave();
    if (e.key === 'Escape') { setText(''); setAdding(false); }
  };

  const handleBlur = () => {
    setTimeout(() => {
      const trimmed = text.trim();
      if (trimmed) {
        onAddGoal(trimmed);
        setText('');
      }
      setAdding(false);
    }, 150);
  };

  const addButton = adding ? (
    <div className="inline-add-goal">
      <input
        ref={inputRef}
        className="inline-goal-field"
        type="text"
        placeholder="輸入目標名稱..."
        maxLength={100}
        enterKeyHint="done"
        value={text}
        onChange={e => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
      />
    </div>
  ) : (
    <button className="add-goal-btn" onClick={() => setAdding(true)}>
      <PlusSvg />
      新增目標
    </button>
  );

  if (goals.length === 0) {
    return (
      <div className="goals-area">
        <div className="empty-state">
          <div className="empty-visual">
            <svg className="empty-icon" viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="14" y="10" width="36" height="44" rx="5" stroke="var(--ink-faint)"/>
              <line x1="24" y1="22" x2="40" y2="22" stroke="var(--ink-faint)"/>
              <line x1="24" y1="30" x2="36" y2="30" stroke="var(--ink-faint)" opacity="0.6"/>
              <line x1="24" y1="38" x2="32" y2="38" stroke="var(--ink-faint)" opacity="0.3"/>
              <circle cx="20" cy="22" r="2" fill="var(--accent)" opacity="0.4"/>
              <circle cx="20" cy="30" r="2" fill="var(--accent)" opacity="0.25"/>
            </svg>
          </div>
          <div className="empty-title">尚無目標</div>
          <div className="empty-desc">點擊下方按鈕，開始規劃本週目標</div>
        </div>
        {addButton}
      </div>
    );
  }

  return (
    <div className="goals-area">
      {goals.map((goal, i) => (
        <GoalCard
          key={goal.id}
          goal={goal}
          index={i}
          onToggle={onToggle}
          onDelete={onDelete}
          onAddSub={onAddSub}
          onToggleSub={onToggleSub}
          onRemoveSub={onRemoveSub}
          onRenameGoal={onRenameGoal}
          onRenameSub={onRenameSub}
        />
      ))}
      {addButton}
    </div>
  );
}

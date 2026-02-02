import { useState, useRef, useEffect } from 'react';
import type { Goal } from '../types';
import SubItem from './SubItem';

const CheckSvg = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);

const PlusSvg = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <line x1="12" y1="5" x2="12" y2="19"/>
    <line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
);

const TrashSvg = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <polyline points="3 6 5 6 21 6"/>
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
  </svg>
);

interface GoalCardProps {
  goal: Goal;
  index: number;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onAddSub: (goalId: string, text: string, type: 'checkbox' | 'list', parentSubId?: string) => void;
  onToggleSub: (goalId: string, subId: string) => void;
  onRemoveSub: (goalId: string, subId: string) => void;
  onRenameGoal: (id: string, newText: string) => void;
  onRenameSub: (goalId: string, subId: string, newText: string) => void;
}

// 'idle' → 按 "+" → 'choosing' → 選類型 → 'inputting' → Enter 送出 → 回 'idle'
type AddingState =
  | { step: 'idle' }
  | { step: 'choosing' }
  | { step: 'inputting'; type: 'checkbox' | 'list' };

export default function GoalCard({
  goal, index, onToggle, onDelete, onAddSub, onToggleSub, onRemoveSub, onRenameGoal, onRenameSub,
}: GoalCardProps) {
  const [adding, setAdding] = useState<AddingState>({ step: 'idle' });
  const [text, setText] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const [editingGoal, setEditingGoal] = useState(false);
  const [goalEditText, setGoalEditText] = useState(goal.text);
  const goalEditRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (adding.step === 'inputting') {
      inputRef.current?.focus();
    }
  }, [adding.step]);

  useEffect(() => {
    if (editingGoal) goalEditRef.current?.focus();
  }, [editingGoal]);

  const handleStartGoalEdit = () => {
    setGoalEditText(goal.text);
    setEditingGoal(true);
  };

  const handleSaveGoalEdit = () => {
    const trimmed = goalEditText.trim();
    if (trimmed && trimmed !== goal.text) {
      onRenameGoal(goal.id, trimmed);
    }
    setEditingGoal(false);
  };

  const handleGoalEditKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.nativeEvent.isComposing) handleSaveGoalEdit();
    if (e.key === 'Escape') { setGoalEditText(goal.text); setEditingGoal(false); }
  };

  const handlePlusClick = () => {
    if (adding.step !== 'idle') {
      setAdding({ step: 'idle' });
      setText('');
      return;
    }
    if (goal.subs && goal.subs.length > 0) {
      setAdding({ step: 'inputting', type: goal.subs[0].type });
    } else {
      setAdding({ step: 'choosing' });
    }
    setText('');
  };

  const handlePickType = (type: 'checkbox' | 'list') => {
    setAdding({ step: 'inputting', type });
    setText('');
  };

  const handleSave = () => {
    const trimmed = text.trim();
    if (!trimmed || adding.step !== 'inputting') return;
    onAddSub(goal.id, trimmed, adding.type);
    setText('');
    setAdding({ step: 'idle' });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
      handleSave();
    } else if (e.key === 'Escape') {
      setAdding({ step: 'idle' });
    }
  };

  const handleBlur = () => {
    setTimeout(() => {
      if (!inputRef.current?.matches(':focus')) {
        const trimmed = text.trim();
        if (trimmed && adding.step === 'inputting') {
          onAddSub(goal.id, trimmed, adding.type);
          setText('');
        }
        setAdding({ step: 'idle' });
      }
    }, 150);
  };

  const hasSubs = goal.subs && goal.subs.length > 0;
  const showInlineUI = adding.step !== 'idle';

  return (
    <div
      className={`goal-card${goal.checked ? ' completed-card' : ''}`}
      style={{ animationDelay: `${index * 0.06}s` }}
    >
      <div className="goal-card-inner">
        <div className="goal-main">
          <div className="goal-index">{String(index + 1).padStart(2, '0')}</div>
          <label className="checkbox-wrap">
            <input
              type="checkbox"
              checked={goal.checked}
              onChange={() => onToggle(goal.id)}
            />
            <div className="checkbox-visual"><CheckSvg /></div>
          </label>
          <div className="goal-content">
            {editingGoal ? (
              <input
                ref={goalEditRef}
                className="goal-edit-field"
                type="text"
                value={goalEditText}
                maxLength={100}
                onChange={e => setGoalEditText(e.target.value)}
                onKeyDown={handleGoalEditKeyDown}
                onBlur={handleSaveGoalEdit}
              />
            ) : (
              <div className="goal-text" onClick={handleStartGoalEdit}>{goal.text}</div>
            )}
          </div>
          <div className="goal-actions">
            <button
              className={`btn-tiny${showInlineUI ? ' btn-tiny-active' : ''}`}
              onClick={handlePlusClick}
              title="新增子項"
            >
              <PlusSvg />
            </button>
            <button className="btn-tiny" onClick={() => onDelete(goal.id)} title="刪除">
              <TrashSvg />
            </button>
          </div>
        </div>

        {(hasSubs || showInlineUI) && (
          <div className="sub-items">
            {hasSubs && goal.subs.map((sub, si) => (
              <SubItem
                key={sub.id}
                sub={sub}
                index={si}
                depth={1}
                goalId={goal.id}
                onToggle={onToggleSub}
                onRemove={onRemoveSub}
                onAddSub={onAddSub}
                onRename={onRenameSub}
              />
            ))}

            {adding.step === 'choosing' && (
              <div className="inline-type-picker">
                <button className="type-pick-btn" onClick={() => handlePickType('checkbox')}>
                  <span className="type-pick-icon">&#9744;</span>
                  核取方塊
                </button>
                <button className="type-pick-btn" onClick={() => handlePickType('list')}>
                  <span className="type-pick-icon">&#8226;</span>
                  清單項目
                </button>
              </div>
            )}

            {adding.step === 'inputting' && (
              <div className="inline-sub-input">
                <div className="inline-sub-input-type">
                  {adding.type === 'checkbox' ? '☐' : '•'}
                </div>
                <input
                  ref={inputRef}
                  className="inline-sub-field"
                  type="text"
                  placeholder="輸入子項目..."
                  maxLength={100}
                  enterKeyHint="done"
                  value={text}
                  onChange={e => setText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  onBlur={handleBlur}
                />
              </div>
            )}

            {!showInlineUI && hasSubs && (
              <button className="add-sub-btn" onClick={handlePlusClick}>
                <PlusSvg />
                新增子項
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

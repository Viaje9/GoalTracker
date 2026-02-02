import { useState, useRef, useEffect } from 'react';
import type { SubItem as SubItemType } from '../types';

const MAX_DEPTH = 5;

const CheckSvg = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);

const RemoveSvg = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <line x1="18" y1="6" x2="6" y2="18"/>
    <line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);

const PlusSvg = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <line x1="12" y1="5" x2="12" y2="19"/>
    <line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
);

type AddingState =
  | { step: 'idle' }
  | { step: 'choosing' }
  | { step: 'inputting'; type: 'checkbox' | 'list' };

interface SubItemProps {
  sub: SubItemType;
  index: number;
  depth: number;
  goalId: string;
  onToggle: (goalId: string, subId: string) => void;
  onRemove: (goalId: string, subId: string) => void;
  onAddSub: (goalId: string, text: string, type: 'checkbox' | 'list', parentSubId?: string) => void;
  onRename: (goalId: string, subId: string, newText: string) => void;
}

export default function SubItem({ sub, index, depth, goalId, onToggle, onRemove, onAddSub, onRename }: SubItemProps) {
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(sub.text);
  const editRef = useRef<HTMLInputElement>(null);

  const [adding, setAdding] = useState<AddingState>({ step: 'idle' });
  const [addText, setAddText] = useState('');
  const addRef = useRef<HTMLInputElement>(null);

  const delay = `${index * 0.04}s`;
  const canAddChild = depth < MAX_DEPTH;
  const hasSubs = sub.subs && sub.subs.length > 0;
  const showAddUI = adding.step !== 'idle';

  useEffect(() => {
    if (editing) editRef.current?.focus();
  }, [editing]);

  useEffect(() => {
    if (adding.step === 'inputting') addRef.current?.focus();
  }, [adding.step]);

  /* ─── Inline edit handlers ─── */
  const handleStartEdit = () => {
    setEditText(sub.text);
    setEditing(true);
  };

  const handleSaveEdit = () => {
    const trimmed = editText.trim();
    if (trimmed && trimmed !== sub.text) {
      onRename(goalId, sub.id, trimmed);
    }
    setEditing(false);
  };

  const handleEditKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.nativeEvent.isComposing) handleSaveEdit();
    if (e.key === 'Escape') { setEditText(sub.text); setEditing(false); }
  };

  /* ─── Inline add-child handlers ─── */
  const handlePlusClick = () => {
    if (adding.step !== 'idle') {
      setAdding({ step: 'idle' });
      setAddText('');
      return;
    }
    if (sub.subs && sub.subs.length > 0) {
      setAdding({ step: 'inputting', type: sub.subs[0].type });
    } else {
      setAdding({ step: 'choosing' });
    }
    setAddText('');
  };

  const handlePickType = (type: 'checkbox' | 'list') => {
    setAdding({ step: 'inputting', type });
    setAddText('');
  };

  const handleAddSave = () => {
    const trimmed = addText.trim();
    if (!trimmed || adding.step !== 'inputting') return;
    onAddSub(goalId, trimmed, adding.type, sub.id);
    setAddText('');
    setAdding({ step: 'idle' });
  };

  const handleAddKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.nativeEvent.isComposing) handleAddSave();
    if (e.key === 'Escape') setAdding({ step: 'idle' });
  };

  const handleAddBlur = () => {
    setTimeout(() => {
      if (!addRef.current?.matches(':focus')) {
        const trimmed = addText.trim();
        if (trimmed && adding.step === 'inputting') {
          onAddSub(goalId, trimmed, adding.type, sub.id);
          setAddText('');
        }
        setAdding({ step: 'idle' });
      }
    }, 150);
  };

  /* ─── Render text (editable or static) ─── */
  const textEl = editing ? (
    <input
      ref={editRef}
      className="inline-edit-field"
      type="text"
      value={editText}
      maxLength={100}
      onChange={e => setEditText(e.target.value)}
      onKeyDown={handleEditKeyDown}
      onBlur={handleSaveEdit}
    />
  ) : (
    <span
      className={`sub-item-text${sub.checked ? ' checked' : ''}`}
      onClick={handleStartEdit}
    >
      {sub.text}
    </span>
  );

  return (
    <>
      <div className="sub-item" style={{ animationDelay: delay }}>
        {sub.type === 'checkbox' ? (
          <label className="sub-checkbox-wrap">
            <input
              type="checkbox"
              checked={sub.checked}
              onChange={() => onToggle(goalId, sub.id)}
            />
            <div className="sub-checkbox-visual"><CheckSvg /></div>
          </label>
        ) : (
          <div className="sub-list-bullet" />
        )}
        {textEl}
        <div className="sub-item-actions">
          {canAddChild && (
            <button
              className={`btn-sub-tiny${showAddUI ? ' btn-tiny-active' : ''}`}
              onClick={handlePlusClick}
              title="新增子項"
            >
              <PlusSvg />
            </button>
          )}
          <button className="btn-sub-tiny btn-sub-remove" onClick={() => onRemove(goalId, sub.id)} title="刪除">
            <RemoveSvg />
          </button>
        </div>
      </div>

      {(hasSubs || showAddUI) && (
        <div className="sub-items">
          {hasSubs && sub.subs.map((child, ci) => (
            <SubItem
              key={child.id}
              sub={child}
              index={ci}
              depth={depth + 1}
              goalId={goalId}
              onToggle={onToggle}
              onRemove={onRemove}
              onAddSub={onAddSub}
              onRename={onRename}
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
                ref={addRef}
                className="inline-sub-field"
                type="text"
                placeholder="輸入子項目..."
                maxLength={100}
                enterKeyHint="done"
                value={addText}
                onChange={e => setAddText(e.target.value)}
                onKeyDown={handleAddKeyDown}
                onBlur={handleAddBlur}
              />
            </div>
          )}

          {!showAddUI && hasSubs && canAddChild && (
            <button className="add-sub-btn" onClick={handlePlusClick}>
              <PlusSvg />
              新增子項
            </button>
          )}
        </div>
      )}
    </>
  );
}

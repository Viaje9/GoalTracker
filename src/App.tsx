import { useState, useCallback } from 'react';
import { useGoals } from './hooks/useGoals';
import Header from './components/Header';
import WeekNav from './components/WeekNav';
import ProgressBar from './components/ProgressBar';
import GoalList from './components/GoalList';
import ConfirmDialog from './components/ConfirmDialog';
import Toast from './components/Toast';
import './App.css';

export default function App() {
  const {
    weekOffset, goals,
    prevWeek, nextWeek,
    addGoal, deleteGoal, toggleGoal,
    addSubItem, toggleSub, removeSub,
    renameGoal, renameSub,
    copyState, pasteGoals,
  } = useGoals();

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmMsg, setConfirmMsg] = useState('');
  const [toastMsg, setToastMsg] = useState('');
  const [toastVisible, setToastVisible] = useState(false);

  const showToast = useCallback((msg: string) => {
    setToastMsg(msg);
    setToastVisible(true);
  }, []);

  const handleCopy = useCallback(() => {
    copyState().then(ok => {
      showToast(ok ? '已複製到剪貼簿' : '複製失敗，請手動複製');
    });
  }, [copyState, showToast]);

  const handlePaste = useCallback(() => {
    pasteGoals().then(result => {
      if (result === 'ok') showToast('已貼上目標');
      else if (result === 'empty') showToast('剪貼簿中沒有可貼上的目標');
      else showToast('貼上失敗，請確認剪貼簿權限');
    });
  }, [pasteGoals, showToast]);

  const handleConfirmDelete = useCallback((id: string) => {
    const goal = goals.find(g => g.id === id);
    setConfirmMsg(`確定要刪除「${goal ? goal.text : ''}」嗎？`);
    setDeletingId(id);
    setConfirmOpen(true);
  }, [goals]);

  const handleDelete = useCallback(() => {
    if (deletingId) {
      deleteGoal(deletingId);
      setDeletingId(null);
      setConfirmOpen(false);
    }
  }, [deletingId, deleteGoal]);

  const handleCancelDelete = useCallback(() => {
    setDeletingId(null);
    setConfirmOpen(false);
  }, []);

  return (
    <>
      <div className="app">
        <header className="header">
          <Header onCopy={handleCopy} onPaste={handlePaste} />
          <WeekNav weekOffset={weekOffset} onPrev={prevWeek} onNext={nextWeek} />
        </header>
        <ProgressBar goals={goals} />
        <GoalList
          goals={goals}
          onToggle={toggleGoal}
          onDelete={handleConfirmDelete}
          onAddGoal={addGoal}
          onAddSub={addSubItem}
          onToggleSub={toggleSub}
          onRemoveSub={removeSub}
          onRenameGoal={renameGoal}
          onRenameSub={renameSub}
        />
      </div>

      <ConfirmDialog
        open={confirmOpen}
        message={confirmMsg}
        onCancel={handleCancelDelete}
        onConfirm={handleDelete}
      />
      <Toast
        message={toastMsg}
        visible={toastVisible}
        onHide={() => setToastVisible(false)}
      />
    </>
  );
}

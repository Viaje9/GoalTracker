interface ConfirmDialogProps {
  open: boolean;
  message: string;
  onCancel: () => void;
  onConfirm: () => void;
}

export default function ConfirmDialog({ open, message, onCancel, onConfirm }: ConfirmDialogProps) {
  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onCancel();
  };

  return (
    <div className={`confirm-overlay${open ? ' active' : ''}`} onClick={handleOverlayClick}>
      <div className="confirm-dialog">
        <div className="confirm-title">刪除目標</div>
        <div className="confirm-msg">{message}</div>
        <div className="confirm-actions">
          <button className="btn-modal btn-cancel" onClick={onCancel}>取消</button>
          <button className="btn-modal btn-danger" onClick={onConfirm}>刪除</button>
        </div>
      </div>
    </div>
  );
}

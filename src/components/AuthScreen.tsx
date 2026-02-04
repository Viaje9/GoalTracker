import { useState, type FormEvent } from 'react';

interface AuthScreenProps {
  onLogin: (username: string, password: string) => Promise<void>;
  onRegister: (username: string, password: string) => Promise<void>;
}

export default function AuthScreen({ onLogin, onRegister }: AuthScreenProps) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (loading) return;

    setError('');
    setLoading(true);
    try {
      if (mode === 'login') {
        await onLogin(username, password);
      } else {
        await onRegister(username, password);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : '發生錯誤，請稍後再試';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-title">週目標</div>
          <div className="auth-subtitle">登入即可在雲端保存你的目標</div>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label className="auth-field">
            <span>帳號</span>
            <input
              value={username}
              onChange={event => setUsername(event.target.value)}
              placeholder="輸入帳號"
              autoComplete="username"
              required
            />
          </label>
          <label className="auth-field">
            <span>密碼</span>
            <input
              type="password"
              value={password}
              onChange={event => setPassword(event.target.value)}
              placeholder="至少 8 碼"
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              required
            />
          </label>

          {error ? <div className="auth-error">{error}</div> : null}

          <button className="auth-submit" type="submit" disabled={loading}>
            {loading ? '處理中…' : mode === 'login' ? '登入' : '註冊並開始'}
          </button>
        </form>

        <div className="auth-footer">
          {mode === 'login' ? (
            <>
              <span>沒有帳號？</span>
              <button
                type="button"
                className="auth-link"
                onClick={() => setMode('register')}
              >
                立即註冊
              </button>
            </>
          ) : (
            <>
              <span>已經有帳號？</span>
              <button
                type="button"
                className="auth-link"
                onClick={() => setMode('login')}
              >
                返回登入
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

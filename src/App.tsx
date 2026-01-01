import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  createUser,
  listUsers,
  ManagedUser,
  Role,
  signIn,
  updateUser,
} from './services/adminDirectory';
import './App.css';

type LoginCardProps = {
  onSuccess: (user: ManagedUser) => void;
};

function LoginCard({ onSuccess }: LoginCardProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');

    setLoading(true);
    try {
      const authenticated = await signIn(username, password);
      onSuccess(authenticated);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'התחברות נכשלה, נסו שוב.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card">
      <h1 className="title">התחברות</h1>
      <p className="subtitle" style={{ textAlign: 'center' }}>
        התחברות רגילה נדרשת לפני גישה לדף המנהל.
      </p>
      <form className="form" onSubmit={handleSubmit}>
        <label className="field">
          <span>שם משתמש</span>
          <input
            type="text"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            placeholder="הקלד שם משתמש"
            required
          />
        </label>
        <label className="field">
          <span>סיסמה</span>
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="הקלד סיסמה"
            required
          />
        </label>
        {error && <div className="alert alert-error">{error}</div>}
        <button type="submit" className="submit-button" disabled={loading}>
          {loading ? 'מתחבר...' : 'התחבר'}
        </button>
      </form>
    </div>
  );
}

type AdminPageProps = {
  user: ManagedUser;
  onLogout: () => void;
};

function AdminPage({ user, onLogout }: AdminPageProps) {
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [createForm, setCreateForm] = useState({ username: '', password: '', role: 'user' as Role });
  const [updateForm, setUpdateForm] = useState({ password: '', role: 'user' as Role });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const selectedUser = useMemo(
    () => users.find((user) => user.id === selectedUserId) ?? null,
    [selectedUserId, users],
  );

  const loadUsers = async () => {
    setLoading(true);
    setError('');
    try {
      const fromServer = await listUsers();
      setUsers(fromServer);
      if (!selectedUserId && fromServer.length) {
        setSelectedUserId(fromServer[0].id);
        setUpdateForm((previous) => ({ ...previous, role: fromServer[0].role }));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאה בעת טעינת משתמשים מהשרת');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleCreateUser = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setSuccess('');

    if (createForm.password.length < 8) {
      setError('סיסמה חייבת להכיל לפחות 8 תווים.');
      return;
    }

    try {
      const created = await createUser(createForm);
      setUsers((previous) => [...previous, created]);
      setSuccess(`המשתמש ${createForm.username} נוצר ונשמר בשרת.`);
      setCreateForm({ username: '', password: '', role: 'user' });
      setSelectedUserId(created.id);
      setUpdateForm({ password: '', role: created.role });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'לא ניתן ליצור משתמש חדש כרגע.');
    }
  };

  const handleUpdateUser = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedUserId) {
      setError('בחר משתמש לעדכון.');
      return;
    }

    setError('');
    setSuccess('');

    if (updateForm.password && updateForm.password.length < 8) {
      setError('סיסמה חדשה חייבת להכיל לפחות 8 תווים.');
      return;
    }

    try {
      const updated = await updateUser(selectedUserId, {
        role: updateForm.role,
        password: updateForm.password || undefined,
      });
      setUsers((previous) => previous.map((user) => (user.id === updated.id ? updated : user)));
      setSuccess('פרטי המשתמש נשמרו בשרת.');
      setUpdateForm((previous) => ({ ...previous, password: '' }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'עדכון משתמש נכשל.');
    }
  };

  return (
    <div className="admin-card">
      <div className="admin-header">
        <div>
          <p className="eyebrow">ניהול משתמשים ומנהלים</p>
          <h1 className="title">דף ניהול מאובטח</h1>
          <p className="subtitle">הוספת משתמשים, הגדרת תפקידים וניהול סיסמאות - הכל נשמר בשרת.</p>
        </div>
        <div className="admin-actions">
          <p className="muted">
            מחובר כ: {user.username} ({user.role === 'manager' ? 'מנהל' : 'משתמש'})
          </p>
          <div className="admin-buttons">
            <button className="refresh-button" type="button" onClick={loadUsers} disabled={loading}>
              רענן נתונים
            </button>
            <button className="refresh-button logout-button" type="button" onClick={onLogout}>
              התנתק
            </button>
          </div>
        </div>
      </div>

      {(error || success) && (
        <div className={`alert ${error ? 'alert-error' : 'alert-success'}`}>
          {error || success}
        </div>
      )}

      <div className="admin-grid">
        <form className="panel" onSubmit={handleCreateUser}>
          <div className="panel-header">
            <h2>הוספת משתמש חדש</h2>
            <p>החשבון ישמר על השרת ויופיע ברשימת המשתמשים.</p>
          </div>
          <label className="field">
            <span>שם משתמש</span>
            <input
              type="text"
              value={createForm.username}
              onChange={(event) => setCreateForm((prev) => ({ ...prev, username: event.target.value }))}
              placeholder="שם ייחודי במערכת"
              required
            />
          </label>
          <label className="field">
            <span>סיסמה</span>
            <input
              type="password"
              value={createForm.password}
              onChange={(event) => setCreateForm((prev) => ({ ...prev, password: event.target.value }))}
              placeholder="לפחות 8 תווים"
              required
            />
          </label>
          <label className="field">
            <span>תפקיד</span>
            <select
              value={createForm.role}
              onChange={(event) => setCreateForm((prev) => ({ ...prev, role: event.target.value as Role }))}
            >
              <option value="user">משתמש</option>
              <option value="manager">מנהל</option>
            </select>
          </label>
          <button type="submit" className="submit-button" disabled={loading}>שמור בשרת</button>
        </form>

        <div className="panel">
          <div className="panel-header">
            <h2>משתמשים קיימים</h2>
            <p>בחר משתמש כדי לעדכן תפקיד וסיסמה.</p>
          </div>
          {loading ? (
            <p className="muted">טוען נתונים מהשרת...</p>
          ) : users.length === 0 ? (
            <p className="muted">אין משתמשים בשרת.</p>
          ) : (
            <div className="table">
              {users.map((user) => (
                <button
                  key={user.id}
                  type="button"
                  className={`table-row ${selectedUserId === user.id ? 'active' : ''}`}
                  onClick={() => {
                    setSelectedUserId(user.id);
                    setUpdateForm((prev) => ({ ...prev, role: user.role }));
                  }}
                >
                  <div>
                    <p className="row-title">{user.username}</p>
                    <p className="row-subtitle">{new Date(user.updatedAt).toLocaleString()}</p>
                  </div>
                  <span className={`badge ${user.role === 'manager' ? 'badge-strong' : ''}`}>
                    {user.role === 'manager' ? 'מנהל' : 'משתמש'}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        <form className="panel" onSubmit={handleUpdateUser}>
          <div className="panel-header">
            <h2>עדכון חשבון</h2>
            <p>שינוי התפקיד ואיפוס סיסמה של משתמש שנבחר.</p>
          </div>
          <label className="field">
            <span>משתמש שנבחר</span>
            <input type="text" value={selectedUser?.username ?? 'לא נבחר'} disabled />
          </label>
          <label className="field">
            <span>תפקיד</span>
            <select
              value={updateForm.role}
              onChange={(event) => setUpdateForm((prev) => ({ ...prev, role: event.target.value as Role }))}
              disabled={!selectedUser}
            >
              <option value="user">משתמש</option>
              <option value="manager">מנהל</option>
            </select>
          </label>
          <label className="field">
            <span>סיסמה חדשה</span>
            <input
              type="password"
              value={updateForm.password}
              onChange={(event) => setUpdateForm((prev) => ({ ...prev, password: event.target.value }))}
              placeholder="השאר ריק אם לא מעדכנים"
              disabled={!selectedUser}
            />
          </label>
          <button type="submit" className="submit-button" disabled={!selectedUser || loading}>שמור שינויים</button>
        </form>
      </div>
    </div>
  );
}

function App() {
  const [authenticatedUser, setAuthenticatedUser] = useState<ManagedUser | null>(null);

  const handleLogout = () => {
    setAuthenticatedUser(null);
  };

  return (
    <div className="page">
      <div className="layout">
        {!authenticatedUser ? (
          <LoginCard onSuccess={setAuthenticatedUser} />
        ) : authenticatedUser.role !== 'manager' ? (
          <div className="card">
            <h1 className="title">אין הרשאה לדף מנהל</h1>
            <p className="subtitle">
              התחברות למשתמש מנהל נדרשת כדי לגשת לדף הניהול. אנא התנתק ונסה עם חשבון מתאים.
            </p>
            <button type="button" className="submit-button" onClick={handleLogout}>
              התנתק
            </button>
          </div>
        ) : (
          <AdminPage user={authenticatedUser} onLogout={handleLogout} />
        )}
      </div>
    </div>
  );
}

export default App;

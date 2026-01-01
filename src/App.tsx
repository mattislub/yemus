import { FormEvent, useEffect, useMemo, useState } from 'react';
import { fetchUsers, login, type LoginRequest, type PublicUser } from './api/auth.ts';
import './App.css';

type Status = 'idle' | 'loading' | 'success' | 'error';

function App() {
  const [form, setForm] = useState<LoginRequest>({
    role: 'admin',
    name: '',
    email: '',
    password: ''
  });
  const [users, setUsers] = useState<PublicUser[]>([]);
  const [status, setStatus] = useState<Status>('idle');
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchUsers()
      .then(setUsers)
      .catch(() => setUsers([]));
  }, []);

  const adminCount = useMemo(() => users.filter((user) => user.role === 'admin').length, [users]);
  const memberCount = useMemo(() => users.filter((user) => user.role === 'user').length, [users]);

  const handleChange = (key: keyof LoginRequest, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setMessage(null);

    if (!form.email || !form.password) {
      setStatus('error');
      setMessage('יש למלא אימייל וסיסמה כדי להמשיך.');
      return;
    }

    setStatus('loading');

    try {
      const { notice } = await login(form);
      const refreshedUsers = await fetchUsers();
      setUsers(refreshedUsers);
      setStatus('success');
      setMessage(notice);
    } catch (err) {
      setStatus('error');
      setMessage((err as Error).message);
    }
  };

  return (
    <div className="app-shell">
      <header className="page-header">
        <div>
          <p className="eyebrow">ברוכים הבאים למערכת ימות המשיח</p>
          <h1>דף הבית הוא מסך התחברות מאובטח</h1>
          <p className="lede">
            התחברות מהירה עם שני סוגי משתמשים: מנהל ראשי, ומשתמשים רגילים. כל פרטי הגישה נשמרים בשרת ומסונכרנים
            בין כל הנכנסים.
          </p>
        </div>
        <div className="role-cards">
          <div className="role-card">
            <span className="role-label admin">מנהל</span>
            <p>ניהול משתמשים, צפייה בתיעוד התחברויות וגישה מלאה לכל המידע.</p>
          </div>
          <div className="role-card">
            <span className="role-label user">משתמש</span>
            <p>גישה לשירותי המערכת והעדפת חוויית שימוש, ללא הרשאות ניהול.</p>
          </div>
        </div>
      </header>

      <section className="grid">
        <form className="card form-card" onSubmit={handleSubmit}>
          <div className="card-header">
            <h2>התחברות / יצירת משתמש</h2>
            <p className="muted">בחרו תפקיד, מלאו פרטים – והמערכת תשמור אותם בשרת.</p>
          </div>

          <div className="segmented-control">
            {(['admin', 'user'] as const).map((role) => (
              <button
                key={role}
                type="button"
                className={`segment ${form.role === role ? 'active' : ''}`}
                onClick={() => handleChange('role', role)}
              >
                {role === 'admin' ? 'מנהל' : 'משתמש'}
              </button>
            ))}
          </div>

          <label className="input-group">
            <span>שם מלא</span>
            <input
              placeholder="לדוגמה: ישראל ישראלי"
              value={form.name}
              onChange={(e) => handleChange('name', e.target.value)}
            />
          </label>

          <label className="input-group">
            <span>אימייל</span>
            <input
              type="email"
              placeholder="name@company.com"
              value={form.email}
              onChange={(e) => handleChange('email', e.target.value)}
              required
            />
          </label>

          <label className="input-group">
            <span>סיסמה</span>
            <input
              type="password"
              placeholder="••••••••"
              value={form.password}
              onChange={(e) => handleChange('password', e.target.value)}
              required
            />
          </label>

          <div className="helper">
            לחיבור ראשוני אפשר להשתמש בפרטי הדמו:
            <br />
            <strong>מנהל:</strong> admin@yemot.local / Admin@123
            <br />
            <strong>משתמש:</strong> user@yemot.local / User@123
          </div>

          <div className="form-actions">
            <button className="primary" type="submit" disabled={status === 'loading'}>
              {status === 'loading' ? 'שומר לשרת...' : 'התחברו עכשיו'}
            </button>
            <button
              className="ghost"
              type="button"
              onClick={() => setForm({ role: 'admin', name: '', email: '', password: '' })}
              disabled={status === 'loading'}
            >
              איפוס טופס
            </button>
          </div>

          {status === 'success' && message && <div className="status success">✅ {message}</div>}
          {status === 'error' && message && <div className="status error">⚠️ {message}</div>}
        </form>

        <div className="card server-card">
          <div className="card-header">
            <h2>מעקב שרת</h2>
            <p className="muted">סיכום מהיר של המידע ששמור על השרת אחרי כל התחברות.</p>
          </div>
          <div className="stat-grid">
            <div className="stat">
              <span className="stat-label">מנהלים</span>
              <span className="stat-value">{adminCount}</span>
            </div>
            <div className="stat">
              <span className="stat-label">משתמשים</span>
              <span className="stat-value">{memberCount}</span>
            </div>
            <div className="stat">
              <span className="stat-label">סה״כ במערכת</span>
              <span className="stat-value">{users.length}</span>
            </div>
          </div>

          <div className="user-list">
            {users.map((user) => (
              <div key={user.id} className="user-row">
                <div>
                  <div className="user-name">
                    {user.name || 'ללא שם'} <span className={`role-chip ${user.role}`}>{user.role === 'admin' ? 'מנהל' : 'משתמש'}</span>
                  </div>
                  <div className="muted small">{user.email}</div>
                </div>
                <div className="muted small">
                  התחברות אחרונה:
                  <br />
                  {new Date(user.lastLogin).toLocaleString('he-IL')}
                </div>
              </div>
            ))}

            {users.length === 0 && <div className="empty">עדיין לא נשמרו משתמשים בשרת.</div>}
          </div>
        </div>
      </section>
    </div>
  );
}

export default App;

import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  createUser,
  fetchUsers,
  login,
  updateAdminPassword,
  updateUserIvrAccess,
  type LoginRequest,
  type PublicUser
} from './api/auth.ts';
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
  const [adminPasswordForm, setAdminPasswordForm] = useState({
    email: 'admin@yemot.local',
    currentPassword: '',
    newPassword: ''
  });
  const [adminPasswordStatus, setAdminPasswordStatus] = useState<Status>('idle');
  const [adminPasswordMessage, setAdminPasswordMessage] = useState<string | null>(null);
  const [newUserForm, setNewUserForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'user' as const,
    phoneNumber: '',
    ivrSystemNumber: '',
    ivrPassword: ''
  });
  const [newUserStatus, setNewUserStatus] = useState<Status>('idle');
  const [newUserMessage, setNewUserMessage] = useState<string | null>(null);
  const [ivrUpdateForm, setIvrUpdateForm] = useState({
    userId: '',
    phoneNumber: '',
    ivrSystemNumber: '',
    ivrPassword: ''
  });
  const [ivrUpdateStatus, setIvrUpdateStatus] = useState<Status>('idle');
  const [ivrUpdateMessage, setIvrUpdateMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchUsers()
      .then((fetched) => {
        setUsers(fetched);
        if (!ivrUpdateForm.userId && fetched.length > 0) {
          setIvrUpdateForm((prev) => ({ ...prev, userId: fetched[0].id }));
        }
      })
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

  const handleAdminPasswordChange = async (event: FormEvent) => {
    event.preventDefault();
    setAdminPasswordMessage(null);
    setAdminPasswordStatus('loading');

    try {
      const { notice } = await updateAdminPassword(adminPasswordForm);
      setAdminPasswordStatus('success');
      setAdminPasswordMessage(notice);
      setAdminPasswordForm((prev) => ({ ...prev, currentPassword: '', newPassword: '' }));
    } catch (error) {
      setAdminPasswordStatus('error');
      setAdminPasswordMessage((error as Error).message);
    }
  };

  const handleCreateUser = async (event: FormEvent) => {
    event.preventDefault();
    setNewUserMessage(null);
    setNewUserStatus('loading');

    try {
      await createUser({
        ...newUserForm,
        phoneNumber: newUserForm.phoneNumber || undefined,
        ivrSystemNumber: newUserForm.ivrSystemNumber || undefined,
        ivrPassword: newUserForm.ivrPassword || undefined
      });
      const refreshedUsers = await fetchUsers();
      setUsers(refreshedUsers);
      setNewUserStatus('success');
      setNewUserMessage('משתמש חדש נוצר בהצלחה.');
      setNewUserForm({
        name: '',
        email: '',
        password: '',
        role: 'user',
        phoneNumber: '',
        ivrSystemNumber: '',
        ivrPassword: ''
      });
    } catch (error) {
      setNewUserStatus('error');
      setNewUserMessage((error as Error).message);
    }
  };

  const handleIvrUpdate = async (event: FormEvent) => {
    event.preventDefault();
    setIvrUpdateMessage(null);
    setIvrUpdateStatus('loading');

    try {
      const updated = await updateUserIvrAccess({
        ...ivrUpdateForm,
        phoneNumber: ivrUpdateForm.phoneNumber || undefined,
        ivrSystemNumber: ivrUpdateForm.ivrSystemNumber || undefined,
        ivrPassword: ivrUpdateForm.ivrPassword || undefined
      });
      const refreshedUsers = users.map((user) => (user.id === updated.id ? updated : user));
      setUsers(refreshedUsers);
      setIvrUpdateStatus('success');
      setIvrUpdateMessage('פרטי מערכת עודכנו בהצלחה.');
    } catch (error) {
      setIvrUpdateStatus('error');
      setIvrUpdateMessage((error as Error).message);
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

      <section className="admin-grid">
        <div className="card form-card">
          <div className="card-header">
            <h2>דף מנהל – החלפת סיסמה</h2>
            <p className="muted">החלפת סיסמת המנהל לצורך הגנה על הגישה למערכת.</p>
          </div>

          <form className="form-grid" onSubmit={handleAdminPasswordChange}>
            <label className="input-group">
              <span>אימייל מנהל</span>
              <input
                type="email"
                value={adminPasswordForm.email}
                onChange={(e) => setAdminPasswordForm((prev) => ({ ...prev, email: e.target.value }))}
                required
              />
            </label>

            <label className="input-group">
              <span>סיסמה נוכחית</span>
              <input
                type="password"
                value={adminPasswordForm.currentPassword}
                onChange={(e) =>
                  setAdminPasswordForm((prev) => ({ ...prev, currentPassword: e.target.value }))
                }
                required
              />
            </label>

            <label className="input-group">
              <span>סיסמה חדשה</span>
              <input
                type="password"
                value={adminPasswordForm.newPassword}
                onChange={(e) => setAdminPasswordForm((prev) => ({ ...prev, newPassword: e.target.value }))}
                required
              />
            </label>

            <div className="form-actions">
              <button className="primary" type="submit" disabled={adminPasswordStatus === 'loading'}>
                {adminPasswordStatus === 'loading' ? 'מעדכן...' : 'שמור סיסמה חדשה'}
              </button>
              <button
                className="ghost"
                type="button"
                onClick={() =>
                  setAdminPasswordForm({
                    email: 'admin@yemot.local',
                    currentPassword: '',
                    newPassword: ''
                  })
                }
                disabled={adminPasswordStatus === 'loading'}
              >
                איפוס טופס
              </button>
            </div>
          </form>

          {adminPasswordStatus === 'success' && adminPasswordMessage && (
            <div className="status success">✅ {adminPasswordMessage}</div>
          )}
          {adminPasswordStatus === 'error' && adminPasswordMessage && (
            <div className="status error">⚠️ {adminPasswordMessage}</div>
          )}
        </div>

        <div className="card form-card">
          <div className="card-header">
            <h2>יצירת משתמש חדש</h2>
            <p className="muted">הוספת משתמשים עם פרטי מערכת לימות המשיח לצורך קבלת טוקן.</p>
          </div>

          <form className="form-grid" onSubmit={handleCreateUser}>
            <label className="input-group">
              <span>שם מלא</span>
              <input
                value={newUserForm.name}
                onChange={(e) => setNewUserForm((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="לדוגמה: חנה כהן"
              />
            </label>

            <label className="input-group">
              <span>אימייל</span>
              <input
                type="email"
                value={newUserForm.email}
                onChange={(e) => setNewUserForm((prev) => ({ ...prev, email: e.target.value }))}
                required
              />
            </label>

            <label className="input-group">
              <span>סיסמת מערכת</span>
              <input
                type="password"
                value={newUserForm.password}
                onChange={(e) => setNewUserForm((prev) => ({ ...prev, password: e.target.value }))}
                required
              />
            </label>

            <label className="input-group">
              <span>תפקיד</span>
              <select
                value={newUserForm.role}
                onChange={(e) => setNewUserForm((prev) => ({ ...prev, role: e.target.value as 'admin' | 'user' }))}
                className="select-input"
              >
                <option value="admin">מנהל</option>
                <option value="user">משתמש</option>
              </select>
            </label>

            <label className="input-group">
              <span>מספר טלפון</span>
              <input
                type="tel"
                value={newUserForm.phoneNumber}
                onChange={(e) => setNewUserForm((prev) => ({ ...prev, phoneNumber: e.target.value }))}
                placeholder="לדוגמה: +972501234567"
              />
            </label>

            <label className="input-group">
              <span>מספר מערכת ימות המשיח</span>
              <input
                value={newUserForm.ivrSystemNumber}
                onChange={(e) => setNewUserForm((prev) => ({ ...prev, ivrSystemNumber: e.target.value }))}
                placeholder="לדוגמה: 0771234567"
              />
            </label>

            <label className="input-group">
              <span>סיסמת מערכת ימות המשיח</span>
              <input
                type="password"
                value={newUserForm.ivrPassword}
                onChange={(e) => setNewUserForm((prev) => ({ ...prev, ivrPassword: e.target.value }))}
                placeholder="לדוגמה: Pass1234"
              />
            </label>

            <div className="form-actions">
              <button className="primary" type="submit" disabled={newUserStatus === 'loading'}>
                {newUserStatus === 'loading' ? 'שומר...' : 'צור משתמש'}
              </button>
              <button
                className="ghost"
                type="button"
                onClick={() =>
                  setNewUserForm({
                    name: '',
                    email: '',
                    password: '',
                    role: 'user',
                    phoneNumber: '',
                    ivrSystemNumber: '',
                    ivrPassword: ''
                  })
                }
                disabled={newUserStatus === 'loading'}
              >
                איפוס טופס
              </button>
            </div>
          </form>

          {newUserStatus === 'success' && newUserMessage && <div className="status success">✅ {newUserMessage}</div>}
          {newUserStatus === 'error' && newUserMessage && <div className="status error">⚠️ {newUserMessage}</div>}
        </div>

        <div className="card form-card">
          <div className="card-header">
            <h2>הגדרות מערכת למשתמשים</h2>
            <p className="muted">עדכון מספר טלפון וסיסמת מערכת לקבלת טוקן API להורדת קבצים.</p>
          </div>

          <form className="form-grid" onSubmit={handleIvrUpdate}>
            <label className="input-group">
              <span>בחר משתמש</span>
              <select
                value={ivrUpdateForm.userId}
                onChange={(e) => setIvrUpdateForm((prev) => ({ ...prev, userId: e.target.value }))}
                className="select-input"
              >
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name || user.email}
                  </option>
                ))}
              </select>
            </label>

            <label className="input-group">
              <span>מספר טלפון</span>
              <input
                type="tel"
                value={ivrUpdateForm.phoneNumber}
                onChange={(e) => setIvrUpdateForm((prev) => ({ ...prev, phoneNumber: e.target.value }))}
                placeholder="לדוגמה: +972501234567"
              />
            </label>

            <label className="input-group">
              <span>מספר מערכת ימות המשיח</span>
              <input
                value={ivrUpdateForm.ivrSystemNumber}
                onChange={(e) => setIvrUpdateForm((prev) => ({ ...prev, ivrSystemNumber: e.target.value }))}
                placeholder="לדוגמה: 0771234567"
              />
            </label>

            <label className="input-group">
              <span>סיסמת מערכת ימות המשיח</span>
              <input
                type="password"
                value={ivrUpdateForm.ivrPassword}
                onChange={(e) => setIvrUpdateForm((prev) => ({ ...prev, ivrPassword: e.target.value }))}
                placeholder="לדוגמה: Pass1234"
              />
            </label>

            <div className="form-actions">
              <button className="primary" type="submit" disabled={ivrUpdateStatus === 'loading'}>
                {ivrUpdateStatus === 'loading' ? 'מעדכן...' : 'שמור הגדרות'}
              </button>
              <button
                className="ghost"
                type="button"
                onClick={() =>
                  setIvrUpdateForm((prev) => ({
                    ...prev,
                    phoneNumber: '',
                    ivrSystemNumber: '',
                    ivrPassword: ''
                  }))
                }
                disabled={ivrUpdateStatus === 'loading'}
              >
                איפוס פרטים
              </button>
            </div>
          </form>

          {ivrUpdateStatus === 'success' && ivrUpdateMessage && <div className="status success">✅ {ivrUpdateMessage}</div>}
          {ivrUpdateStatus === 'error' && ivrUpdateMessage && <div className="status error">⚠️ {ivrUpdateMessage}</div>}
        </div>
      </section>
    </div>
  );
}

export default App;

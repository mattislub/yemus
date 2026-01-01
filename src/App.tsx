import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  createUser,
  fetchUsers,
  login,
  updateAdminPassword,
  updateUserIvrAccess,
  type AdminPasswordChangeRequest,
  type LoginRequest,
  type PublicUser,
  type Role
} from './api/auth.ts';
import { fetchBranchContents, SAMPLE_ITEMS, type BranchItem } from './api/ivr.ts';
import './App.css';

type Status = 'idle' | 'loading' | 'success' | 'error';
type Page = 'home' | 'user' | 'admin';

type StatusProps = {
  status: Status;
  message: string | null;
};

const StatusMessage = ({ status, message }: StatusProps) => {
  if (!message || status === 'idle') return null;
  const tone = status === 'error' ? 'error' : 'success';
  const icon = status === 'error' ? '⚠️' : '✅';
  return <div className={`status ${tone}`}>{icon} {message}</div>;
};

function App() {
  const [activePage, setActivePage] = useState<Page>('home');
  const [form, setForm] = useState<LoginRequest>({
    role: 'admin',
    name: '',
    email: '',
    password: ''
  });
  const [users, setUsers] = useState<PublicUser[]>([]);
  const [status, setStatus] = useState<Status>('idle');
  const [message, setMessage] = useState<string | null>(null);
  const [adminPasswordForm, setAdminPasswordForm] = useState<AdminPasswordChangeRequest>({
    email: 'admin@yemot.local',
    currentPassword: '',
    newPassword: ''
  });
  const [adminPasswordStatus, setAdminPasswordStatus] = useState<Status>('idle');
  const [adminPasswordMessage, setAdminPasswordMessage] = useState<string | null>(null);
  const [newUserForm, setNewUserForm] = useState<{
    name: string;
    email: string;
    password: string;
    role: Role;
    phoneNumber: string;
    ivrSystemNumber: string;
    ivrPassword: string;
  }>(
    {
      name: '',
      email: '',
      password: '',
      role: 'user',
      phoneNumber: '',
      ivrSystemNumber: '',
      ivrPassword: ''
    }
  );
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
  const [branchConfig, setBranchConfig] = useState({
    systemNumber: '0771234567',
    password: 'AdminIvrPass',
    branchPath: '1/2',
    baseUrl: ''
  });
  const [branchItems, setBranchItems] = useState<BranchItem[]>(SAMPLE_ITEMS);
  const [branchStatus, setBranchStatus] = useState<Status>('idle');
  const [branchMessage, setBranchMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchUsers()
      .then((fetched) => setUsers(fetched))
      .catch(() => setUsers([]));
  }, []);

  useEffect(() => {
    if (!ivrUpdateForm.userId && users.length > 0) {
      setIvrUpdateForm((prev) => ({ ...prev, userId: users[0].id }));
    }
  }, [users, ivrUpdateForm.userId]);

  useEffect(() => {
    loadBranch({ silent: true });
  }, []);

  const adminCount = useMemo(() => users.filter((user) => user.role === 'admin').length, [users]);
  const memberCount = useMemo(() => users.filter((user) => user.role === 'user').length, [users]);

  const handleChange = (key: keyof LoginRequest, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const updateBranchConfig = (key: keyof typeof branchConfig, value: string) => {
    setBranchConfig((prev) => ({ ...prev, [key]: value }));
  };

  const formatSize = (size?: number) => {
    if (!size) return '—';
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(0)} KB`;
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatLength = (seconds?: number) => {
    if (!seconds) return '';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')} דק׳`;
  };

  const loadBranch = async (options?: { silent?: boolean }) => {
    if (!branchConfig.systemNumber || !branchConfig.password) {
      setBranchStatus('error');
      setBranchMessage('מנהל המערכת צריך להגדיר מספר מערכת וסיסמה לפני הצגת הקבצים.');
      return;
    }

    const branchPath = branchConfig.branchPath.trim() || '/';
    const baseUrl = branchConfig.baseUrl.trim() || undefined;

    if (!options?.silent) {
      setBranchStatus('loading');
    }
    setBranchMessage(null);

    try {
      const result = await fetchBranchContents({
        systemNumber: branchConfig.systemNumber,
        password: branchConfig.password,
        branchPath,
        baseUrl
      });

      const items = result.items.length ? result.items : SAMPLE_ITEMS;
      setBranchItems(items);
      setBranchStatus('success');
      setBranchMessage(
        result.items.length
          ? `נמצאו ${result.items.length} פריטים בשלוחה ${branchPath}.`
          : 'לא נמצאו קבצים אמיתיים, מוצגים פריטי דמו.'
      );
    } catch (error) {
      setBranchStatus('error');
      setBranchMessage((error as Error).message);
      if (!branchItems.length) {
        setBranchItems(SAMPLE_ITEMS);
      }
    }
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

  const renderUserFileList = () => (
    <div className="file-list">
      {branchItems.map((item) => (
        <div key={item.id} className="file-row">
          <div className={`file-icon ${item.type}`} aria-hidden>
            {item.type === 'folder' ? '📁' : '🎧'}
          </div>
          <div className="file-main">
            <div className="file-name">{item.name}</div>
            <div className="file-meta">
              {item.path && <span className="pill">{item.path}</span>}
              <span className="pill">{item.type === 'folder' ? 'תיקייה' : 'קובץ'}</span>
              {item.size && <span className="pill">גודל: {formatSize(item.size)}</span>}
              {item.lengthSeconds && <span className="pill">משך: {formatLength(item.lengthSeconds)}</span>}
            </div>
          </div>
          {item.type === 'file' ? (
            <a
              className="primary download-btn"
              href={item.downloadUrl || '#'}
              target="_blank"
              rel="noreferrer"
              onClick={(event) => {
                if (!item.downloadUrl) {
                  event.preventDefault();
                }
              }}
            >
              הורדה
            </a>
          ) : (
            <span className="muted">תיקייה</span>
          )}
        </div>
      ))}

      {branchItems.length === 0 && <div className="empty">לא נמצאו קבצים להצגה.</div>}
    </div>
  );

  const renderHome = () => (
    <>
      <section className="page-grid">
        <div className="card hero-card">
          <div className="card-header">
            <p className="eyebrow">דף הבית - התחברות</p>
            <h2>כניסה מאובטחת לפני בחירת תפקיד</h2>
            <p className="lede">
              זהו השער הראשי למערכת. מכאן נכנסים ומחליטים האם להמשיך לדף ההורדות למשתמש או לדף ההגדרות של מנהלים.
            </p>
          </div>

          <div className="highlight-grid">
            <div className="stat">
              <span className="stat-label">מנהלים פעילים</span>
              <span className="stat-value">{adminCount}</span>
              <p className="muted small">מגדירים שלוחות, סיסמאות ומספרי מערכת.</p>
            </div>
            <div className="stat">
              <span className="stat-label">משתמשים</span>
              <span className="stat-value">{memberCount}</span>
              <p className="muted small">רואים רק את דף ההורדות הבטוח.</p>
            </div>
            <div className="stat">
              <span className="stat-label">שלוחות מוצגות</span>
              <span className="stat-value">{branchItems.length || 0}</span>
              <p className="muted small">קבצים ותיקיות שנשלפים עבור המשתמשים.</p>
            </div>
          </div>

          <div className="pill-row">
            <span className="pill strong">שלב 1: התחברות כאן</span>
            <span className="pill">שלב 2: דף משתמש להורדות</span>
            <span className="pill">שלב 3: דף מנהל להגדרות</span>
          </div>
        </div>

        <form className="card form-card login-card" onSubmit={handleSubmit}>
          <div className="card-header">
            <h2>התחברות או יצירת משתמש</h2>
            <p className="muted">בחרו תפקיד, מלאו פרטים והמערכת תוביל אתכם לדפים הבאים.</p>
          </div>

          <div className="segmented-control">
            {(['admin', 'user'] as const).map((role) => (
              <button
                key={role}
                type="button"
                className={`segment ${form.role === role ? 'active' : ''}`}
                onClick={() => handleChange('role', role)}
                aria-pressed={form.role === role}
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

          <StatusMessage status={status} message={message} />
        </form>
      </section>

      <section className="card spotlight">
        <div className="spotlight-item">
          <div>
            <p className="eyebrow">דף משתמש</p>
            <h3>הורדות מסודרות לפי שלוחה</h3>
            <p className="muted">המשתמשים רואים רק את הקבצים המאושרים להורדה ומורידים בלחיצה אחת.</p>
          </div>
          <button className="ghost" type="button" onClick={() => setActivePage('user')}>
            מעבר לדף משתמש
          </button>
        </div>
        <div className="spotlight-item">
          <div>
            <p className="eyebrow">דף מנהל</p>
            <h3>הגדרות, משתמשים ומספרי מערכת</h3>
            <p className="muted">מנהל המערכת שולט בשלוחה, בסיס ה-API, וסיסמאות המערכת של כל משתמש.</p>
          </div>
          <button className="ghost" type="button" onClick={() => setActivePage('admin')}>
            מעבר לדף מנהל
          </button>
        </div>
      </section>
    </>
  );

  const renderUserPage = () => (
    <section className="card page-shell">
      <div className="card-header split">
        <div>
          <p className="eyebrow">דף משתמש</p>
          <h2>הצגת קבצים והורדה</h2>
          <p className="muted">
            כאן המשתמש רואה את הקבצים המגיעים מהשלוחה שהגדיר המנהל. כל קובץ ניתן לפתיחה או הורדה.
          </p>
        </div>
        <div className="header-actions">
          <button className="ghost" type="button" onClick={() => loadBranch()} disabled={branchStatus === 'loading'}>
            {branchStatus === 'loading' ? 'טוען קבצים...' : 'רענון רשימת קבצים'}
          </button>
        </div>
      </div>

      <div className="branch-grid">
        <div className="meta-card">
          <div className="meta-row">
            <span className="meta-label">מספר מערכת</span>
            <span className="meta-value">{branchConfig.systemNumber || 'לא הוגדר'}</span>
          </div>
          <div className="meta-row">
            <span className="meta-label">סיסמת מערכת</span>
            <span className="meta-value">{branchConfig.password ? `${branchConfig.password.slice(0, 2)}***` : 'לא הוגדר'}</span>
          </div>
          <div className="meta-row">
            <span className="meta-label">מסלול שלוחה</span>
            <span className="meta-value">{branchConfig.branchPath || '/'}</span>
          </div>
          <div className="meta-row">
            <span className="meta-label">כתובת API</span>
            <span className="meta-value">{branchConfig.baseUrl.trim() || 'ברירת מחדל (call2all)'}</span>
          </div>
        </div>
        <div className="info-card">
          <h3>איך זה עובד?</h3>
          <p className="muted">
            המנהל מגדיר את השלוחה ואת סיסמת המערכת. המשתמש רואה כאן את רשימת הקבצים ומוריד אותם בלי אפשרות לערוך הגדרות.
          </p>
          <ul>
            <li>הורדת קובץ בודד בקישור ישיר.</li>
            <li>סימון תיקיות ותת שלוחות לצפייה בלבד.</li>
            <li>הודעות סטטוס ברורות בעברית.</li>
          </ul>
        </div>
      </div>

      <StatusMessage status={branchStatus} message={branchMessage} />
      {renderUserFileList()}
    </section>
  );

  const renderAdminPage = () => (
    <>
      <section className="page-grid">
        <div className="card config-card">
          <div className="card-header">
            <p className="eyebrow">דף מנהל</p>
            <h2>הגדרת שלוחה ומקור הורדות</h2>
            <p className="muted">מנהל המערכת מגדיר מספר מערכת, סיסמה ושלוחה שממנה המשתמשים יראו קבצים.</p>
          </div>

          <form className="form-grid" onSubmit={(event) => { event.preventDefault(); loadBranch(); }}>
            <label className="input-group">
              <span>מספר מערכת</span>
              <input
                value={branchConfig.systemNumber}
                onChange={(e) => updateBranchConfig('systemNumber', e.target.value)}
                placeholder="לדוגמה: 0771234567"
                required
              />
            </label>

            <label className="input-group">
              <span>סיסמת מערכת</span>
              <input
                type="password"
                value={branchConfig.password}
                onChange={(e) => updateBranchConfig('password', e.target.value)}
                placeholder="סיסמת מערכת"
                required
              />
            </label>

            <label className="input-group">
              <span>מסלול שלוחה להצגה</span>
              <input
                value={branchConfig.branchPath}
                onChange={(e) => updateBranchConfig('branchPath', e.target.value)}
                placeholder="לדוגמה: 1/2/3"
              />
            </label>

            <label className="input-group">
              <span>כתובת API (רשות)</span>
              <input
                value={branchConfig.baseUrl}
                onChange={(e) => updateBranchConfig('baseUrl', e.target.value)}
                placeholder="https://www.call2all.co.il/ym/api"
              />
            </label>

            <div className="form-actions">
              <button className="primary" type="submit" disabled={branchStatus === 'loading'}>
                {branchStatus === 'loading' ? 'טוען...' : 'שמור ושלוף קבצים'}
              </button>
              <button
                className="ghost"
                type="button"
                onClick={() => setBranchConfig({ systemNumber: '0771234567', password: 'AdminIvrPass', branchPath: '1/2', baseUrl: '' })}
                disabled={branchStatus === 'loading'}
              >
                איפוס לברירת מחדל
              </button>
            </div>
          </form>

          <StatusMessage status={branchStatus} message={branchMessage} />
        </div>

        <div className="card server-card">
          <div className="card-header">
            <h2>מעקב מערכת</h2>
            <p className="muted">צילום מצב של משתמשים ומספרי מערכת.</p>
          </div>
          <div className="stat-grid">
            <div className="stat">
              <span className="stat-label">מנהלים</span>
              <span className="stat-value">{adminCount}</span>
              <p className="muted small">יכולים לעדכן שלוחות, סיסמאות וטלפונים.</p>
            </div>
            <div className="stat">
              <span className="stat-label">משתמשים</span>
              <span className="stat-value">{memberCount}</span>
              <p className="muted small">רק צופים ומורידים קבצים.</p>
            </div>
            <div className="stat">
              <span className="stat-label">סה"כ משתמשים</span>
              <span className="stat-value">{users.length}</span>
              <p className="muted small">כל התפקידים יחד.</p>
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

      <section className="admin-board">
        <div className="card form-card">
          <div className="card-header">
            <h2>החלפת סיסמת מנהל</h2>
            <p className="muted">הגנו על דף ההגדרות באמצעות סיסמאות מעודכנות.</p>
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

          <StatusMessage status={adminPasswordStatus} message={adminPasswordMessage} />
        </div>

        <div className="card form-card">
          <div className="card-header">
            <h2>יצירת משתמש חדש</h2>
            <p className="muted">הוספת משתמשים עם פרטי מערכת ימות המשיח לקבלת גישה וקבצים.</p>
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

          <StatusMessage status={newUserStatus} message={newUserMessage} />
        </div>

        <div className="card form-card">
          <div className="card-header">
            <h2>הגדרות מערכת למשתמשים</h2>
            <p className="muted">עדכון מספר טלפון ומספר מערכת ימות המשיח לכל משתמש.</p>
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

          <StatusMessage status={ivrUpdateStatus} message={ivrUpdateMessage} />
        </div>
      </section>

      <section className="card system-table">
        <div className="card-header">
          <h2>מספרי מערכת וטלפונים לכל משתמש</h2>
          <p className="muted">תצוגה מהירה של משתמשים, מספרי מערכת והטלפונים המשויכים להם.</p>
        </div>
        <div className="table-head">
          <span>משתמש</span>
          <span>טלפון</span>
          <span>מספר מערכת</span>
          <span>סיסמת מערכת</span>
        </div>
        {users.map((user) => (
          <div key={user.id} className="table-row">
            <div>
              <div className="user-name">{user.name || user.email}</div>
              <div className="muted small">{user.email}</div>
            </div>
            <span className="pill">{user.phoneNumber || 'לא הוגדר'}</span>
            <span className="pill">{user.ivrSystemNumber || 'לא הוגדר'}</span>
            <span className="pill">{user.ivrPassword ? `${user.ivrPassword.slice(0, 2)}***` : 'לא הוגדר'}</span>
          </div>
        ))}

        {users.length === 0 && <div className="empty">אין משתמשים להצגה כרגע.</div>}
      </section>
    </>
  );

  return (
    <div className="app-shell">
      <header className="top-header">
        <div>
          <p className="eyebrow">מערכת ימות המשיח</p>
          <h1>שליטה בשלושה דפים נפרדים</h1>
          <p className="lede">
            דף הבית עבור התחברות, דף משתמש להורדת קבצים ודף מנהל לכל ההגדרות והמספרים. הכל מופרד וברור.
          </p>
        </div>
        <div className="nav-tabs">
          {(
            [
              { key: 'home', label: 'דף הבית' },
              { key: 'user', label: 'דף משתמש' },
              { key: 'admin', label: 'דף מנהל' }
            ] as const
          ).map((item) => (
            <button
              key={item.key}
              type="button"
              className={`nav-tab ${activePage === item.key ? 'active' : ''}`}
              onClick={() => setActivePage(item.key)}
              aria-pressed={activePage === item.key}
            >
              {item.label}
            </button>
          ))}
        </div>
      </header>

      <div className="summary-ribbon">
        <div className="summary-item">
          <span className="muted small">מנהלים</span>
          <strong>{adminCount}</strong>
        </div>
        <div className="summary-item">
          <span className="muted small">משתמשים</span>
          <strong>{memberCount}</strong>
        </div>
        <div className="summary-item">
          <span className="muted small">קבצים מוצגים</span>
          <strong>{branchItems.length}</strong>
        </div>
        <div className="summary-item action">
          <button type="button" className="ghost" onClick={() => loadBranch()} disabled={branchStatus === 'loading'}>
            {branchStatus === 'loading' ? 'טוען...' : 'רענון קבצים'}
          </button>
        </div>
      </div>

      {activePage === 'home' && renderHome()}
      {activePage === 'user' && renderUserPage()}
      {activePage === 'admin' && renderAdminPage()}
    </div>
  );
}

export default App;

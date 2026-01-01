import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  createUser,
  fetchUsers,
  login,
  updateAdminPassword,
  updateUserIvrAccess,
  type Role,
  type LoginRequest,
  type PublicUser
} from './api/auth.ts';
import { fetchBranchContents, SAMPLE_ITEMS, type BranchItem } from './api/ivr.ts';
import './App.css';

type Status = 'idle' | 'loading' | 'success' | 'error';

function App() {
  const [form, setForm] = useState<LoginRequest>({
    role: 'admin',
    name: '',
    email: '',
    password: ''
  });
  const [viewMode, setViewMode] = useState<'user' | 'admin'>('user');
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
  const [newUserForm, setNewUserForm] = useState<{
    name: string;
    email: string;
    password: string;
    role: Role;
    phoneNumber: string;
    ivrSystemNumber: string;
    ivrPassword: string;
  }>({
    name: '',
    email: '',
    password: '',
    role: 'user',
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
      .then((fetched) => {
        setUsers(fetched);
        if (!ivrUpdateForm.userId && fetched.length > 0) {
          setIvrUpdateForm((prev) => ({ ...prev, userId: fetched[0].id }));
        }
      })
      .catch(() => setUsers([]));
  }, []);

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

  return (
    <div className="app-shell">
      <header className="page-header">
        <div>
          <p className="eyebrow">ברוכים הבאים למערכת ימות המשיח</p>
          <h1>דף הורדות ברור למשתמשים, נשלט על ידי מנהלים</h1>
          <p className="lede">
            המשתמשים מגיעים רק לעמוד הורדות שמציג אילו קבצים זמינים בשלוחה שנקבעה מראש. רק מנהל המערכת יכול
            להגדיר או לשנות את השלוחה והפרטים הדרושים לחיבור.
          </p>
        </div>
        <div className="role-cards">
          <div className="role-card">
            <span className="role-label admin">מנהל</span>
            <p>הגדרת שלוחה, מספר מערכת וסיסמה שמאפשרים הורדת קבצים.</p>
          </div>
          <div className="role-card">
            <span className="role-label user">משתמש</span>
            <p>רואה רק את דף ההורדות והקבצים שאושרו, בלי אפשרות לשנות הגדרות.</p>
          </div>
        </div>
      </header>

      <div className="segmented-control view-toggle">
        {(['user', 'admin'] as const).map((role) => (
          <button
            key={role}
            type="button"
            className={`segment ${viewMode === role ? 'active' : ''}`}
            onClick={() => setViewMode(role)}
          >
            {role === 'user' ? 'תצוגת משתמש' : 'תצוגת מנהל'}
          </button>
        ))}
      </div>

      <section className="download-layout">
        <div className="card download-card">
          <div className="card-header">
            <div>
              <h2>דף הורדות למשתמש</h2>
              <p className="muted">המשתמש רואה רק את הקבצים בשלוחה שהוגדרה על ידי המנהל.</p>
            </div>
            <div className="badge-row">
              <span className="badge">שלוחה מוגדרת: {branchConfig.branchPath || '/'}</span>
              <button className="ghost" type="button" onClick={() => loadBranch()} disabled={branchStatus === 'loading'}>
                {branchStatus === 'loading' ? 'טוען קבצים...' : 'רענן דף הורדות'}
              </button>
            </div>
          </div>

          <div className="branch-meta">
            <div className="meta-item">
              <span className="meta-label">מספר מערכת</span>
              <span className="meta-value">{branchConfig.systemNumber || 'לא הוגדר'}</span>
            </div>
            <div className="meta-item">
              <span className="meta-label">סיסמת מערכת</span>
              <span className="meta-value">{branchConfig.password ? `${branchConfig.password.slice(0, 2)}***` : 'לא הוגדר'}</span>
            </div>
            <div className="meta-item">
              <span className="meta-label">כתובת API</span>
              <span className="meta-value">{branchConfig.baseUrl.trim() || 'ברירת מחדל (call2all)'}</span>
            </div>
          </div>

          {branchStatus === 'success' && branchMessage && (
            <div className="status success">✅ {branchMessage}</div>
          )}
          {branchStatus === 'error' && branchMessage && (
            <div className="status error">⚠️ {branchMessage}</div>
          )}

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
        </div>

        {viewMode === 'admin' && (
          <div className="card config-card">
            <div className="card-header">
              <h2>הגדרת שלוחה - מנהל בלבד</h2>
              <p className="muted">המנהל קובע את השלוחה והפרטים שממנו יוצגו הקבצים למשתמש.</p>
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
                <span>סיסמה</span>
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
                  איפוס להגדרות ברירת מחדל
                </button>
              </div>
            </form>
          </div>
        )}
      </section>

      {viewMode === 'admin' && (
        <>
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
        </>
      )}
    </div>
  );
}

export default App;

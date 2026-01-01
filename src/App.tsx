import { FormEvent, ReactNode, useCallback, useEffect, useMemo, useState } from 'react';
import {
  AuthSession,
  createSystemToken,
  createUser,
  listUsers,
  ManagedUser,
  Role,
  signIn,
  SystemTokenResponse,
  updateUser,
} from './services/adminDirectory';
import { DirectoryInfoResponse, fetchDirectoryInfo } from './services/yemotDirectory';
import './App.css';

type LoginCardProps = {
  onSuccess: (session: AuthSession) => void;
};

const normalizeExtensions = (extensions: string[]): string[] =>
  extensions.map((value) => value.trim()).filter(Boolean);

const ensureExtensionFields = (extensions: string[]): string[] => (extensions.length ? extensions : ['']);

type ExtensionsFieldsetProps = {
  values: string[];
  onChange: (next: string[]) => void;
  disabled?: boolean;
  helper?: string;
};

function ExtensionsFieldset({ values, onChange, disabled, helper }: ExtensionsFieldsetProps) {
  const handleChange = (index: number, value: string) => {
    const next = [...values];
    next[index] = value;
    onChange(next);
  };

  const handleRemove = (index: number) => {
    const next = values.filter((_, currentIndex) => currentIndex !== index);
    onChange(ensureExtensionFields(next));
  };

  const handleAdd = () => {
    onChange([...values, '']);
  };

  return (
    <div className="field">
      <span>שלוחות במערכת</span>
      {helper && <p className="muted helper-text">{helper}</p>}
      <div className="extensions-fields">
        {values.map((extension, index) => (
          <div key={index} className="extensions-field-row">
            <input
              type="text"
              value={extension}
              onChange={(event) => handleChange(index, event.target.value)}
              placeholder={`שלוחה ${index + 1}`}
              disabled={disabled}
            />
            <button
              type="button"
              className="ghost-button remove-extension"
              onClick={() => handleRemove(index)}
              disabled={disabled || values.length === 1}
            >
              הסר
            </button>
          </div>
        ))}
        <button type="button" className="refresh-button add-extension-button" onClick={handleAdd} disabled={disabled}>
          הוסף שלוחה
        </button>
      </div>
    </div>
  );
}

type SystemDetailsSectionProps = {
  systemNumber: string;
  systemPassword: string;
  extensions: string[];
  onSystemNumberChange: (value: string) => void;
  onSystemPasswordChange: (value: string) => void;
  onExtensionsChange: (next: string[]) => void;
  disabled?: boolean;
  helper?: string;
  footer?: ReactNode;
};

type ModalProps = {
  title: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
};

function SystemDetailsSection({
  systemNumber,
  systemPassword,
  extensions,
  onSystemNumberChange,
  onSystemPasswordChange,
  onExtensionsChange,
  disabled,
  helper,
  footer,
}: SystemDetailsSectionProps) {
  return (
    <div className="details-block">
      <div className="details-block-header">
        <h3>פרטי מערכת</h3>
        <p className="muted">ריכוז מספר המערכת, הסיסמה והשלוחות במקום אחד.</p>
      </div>
      <label className="field">
        <span>מספר מערכת</span>
        <input
          type="text"
          value={systemNumber}
          onChange={(event) => onSystemNumberChange(event.target.value)}
          placeholder="לדוגמה: 10010"
          disabled={disabled}
          required
        />
      </label>
      <label className="field">
        <span>סיסמת מערכת</span>
        <input
          type="text"
          value={systemPassword}
          onChange={(event) => onSystemPasswordChange(event.target.value)}
          placeholder="הסיסמה להגדרות המערכת"
          disabled={disabled}
          required
        />
      </label>
      <ExtensionsFieldset
        values={extensions}
        onChange={onExtensionsChange}
        disabled={disabled}
        helper={helper ?? 'כל שלוחה מוזנת בשדה נפרד. הוסיפו או הסירו שורות לפי הצורך.'}
      />
      {footer}
    </div>
  );
}

function Modal({ title, description, onClose, children }: ModalProps) {
  const handleBackdropClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) {
      onClose();
    }
  };

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" onClick={handleBackdropClick}>
      <div className="modal-card">
        <div className="modal-header">
          <div>
            <p className="eyebrow">חלון קופץ</p>
            <h2>{title}</h2>
            {description && <p className="muted">{description}</p>}
          </div>
          <button type="button" className="ghost-button close-button" onClick={onClose} aria-label="סגור חלון">
            ×
          </button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}

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
  session: AuthSession;
  onLogout: () => void;
};

type DirectoryInspectorProps = {
  selectedUser: ManagedUser | null;
  generatedToken?: string | null;
};

type DirectoryResultsProps = {
  result: DirectoryInfoResponse;
  emptyDirectoriesMessage?: string;
  emptyFilesMessage?: string;
};

function DirectoryResults({
  result,
  emptyDirectoriesMessage = 'לא נמצאו תתי־שלוחות בנתיב זה.',
  emptyFilesMessage = 'לא נמצאו קבצים בנתיב זה.',
}: DirectoryResultsProps) {
  const hasDirectories = (result?.directories?.length ?? 0) > 0;
  const hasFiles = (result?.files?.length ?? 0) > 0;

  return (
    <div className="directory-results">
      <div className="directory-summary">
        <span className="badge badge-strong">תיקיות: {result.directories.length}</span>
        <span className="badge">קבצים: {result.files.length}</span>
      </div>
      <div className="directory-columns">
        <div className="directory-column">
          <h4>תתי־שלוחות</h4>
          {hasDirectories ? (
            <div className="directory-list">
              {result.directories.map((entry) => (
                <div key={`${entry.path}-${entry.name}`} className="directory-entry">
                  <div className="directory-entry-main">
                    <p className="row-title">{entry.name}</p>
                    <p className="row-subtitle">{entry.path}</p>
                  </div>
                  <span className="badge badge-strong">תיקייה</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="muted">{emptyDirectoriesMessage}</p>
          )}
        </div>
        <div className="directory-column">
          <h4>קבצים</h4>
          {hasFiles ? (
            <div className="directory-list">
              {result.files.map((entry) => (
                <div key={`${entry.path}-${entry.name}`} className="directory-entry">
                  <div className="directory-entry-main">
                    <p className="row-title">{entry.name}</p>
                    <p className="row-subtitle">{entry.path}</p>
                    {entry.size && <span className="muted small-text">גודל: {entry.size} בייט</span>}
                  </div>
                  <span className="badge">קובץ</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="muted">{emptyFilesMessage}</p>
          )}
        </div>
      </div>
      <details className="raw-response">
        <summary>תצוגת JSON מלאה</summary>
        <pre>{JSON.stringify(result.raw, null, 2)}</pre>
      </details>
    </div>
  );
}

function DirectoryInspector({ selectedUser, generatedToken }: DirectoryInspectorProps) {
  const [systemNumber, setSystemNumber] = useState(selectedUser?.systemNumber ?? '');
  const [token, setToken] = useState(generatedToken ?? '');
  const [path, setPath] = useState(selectedUser?.extensions[0] ?? 'ivr2:/1/2');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<DirectoryInfoResponse | null>(null);

  useEffect(() => {
    if (selectedUser) {
      setSystemNumber(selectedUser.systemNumber);
      if (selectedUser.extensions[0]) {
        setPath(selectedUser.extensions[0]);
      }
    }
  }, [selectedUser]);

  useEffect(() => {
    if (generatedToken && !token) {
      setToken(generatedToken);
    }
  }, [generatedToken, token]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setResult(null);

    if (!systemNumber || !token || !path) {
      setError('יש למלא מספר מערכת, טוקן ונתיב שלוחה.');
      return;
    }

    setLoading(true);
    try {
      const response = await fetchDirectoryInfo({ systemNumber, token, path });
      setResult(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאה בעת שליפת פרטי השלוחה.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="panel panel-wide directory-panel">
      <div className="panel-header">
        <h2>הצגת פרטי שלוחה</h2>
        <p>שליפה מהירה של קבצים ותתי־שלוחות בעזרת הטוקן שהופק למערכת.</p>
      </div>
      <form className="form directory-form" onSubmit={handleSubmit}>
        <div className="directory-grid">
          <label className="field">
            <span>מספר מערכת</span>
            <input
              type="text"
              value={systemNumber}
              onChange={(event) => setSystemNumber(event.target.value)}
              placeholder="לדוגמה: 1234567"
            />
          </label>
          <label className="field">
            <span>טוקן פעיל</span>
            <input
              type="text"
              value={token}
              onChange={(event) => setToken(event.target.value)}
              placeholder="הדביקו טוקן קיים או שנוצר כעת"
            />
          </label>
          <label className="field">
            <span>נתיב שלוחה</span>
            <input
              type="text"
              value={path}
              onChange={(event) => setPath(event.target.value)}
              placeholder="לדוגמה: ivr2:/1/2"
            />
          </label>
        </div>
        <div className="form-actions">
          <div className="muted">
            <p className="helper-text">
              אפשר להדביק כאן את הטוקן שנוצר בחלק העליון. הבקשה נשלחת אל https://www.call2all.co.il/ym/api עם הפעולה{' '}
              <code>GetIVR2Dir</code>.
            </p>
            <p className="helper-text">
              curl "https://www.call2all.co.il/ym/api/GetIVR2Dir?token={token || 'TOKEN'}&path={path || 'ivr2:/1/2'}"
            </p>
          </div>
          <button type="submit" className="refresh-button primary-action" disabled={loading}>
            {loading ? 'טוען נתונים...' : 'בדיקת שלוחה'}
          </button>
        </div>
      </form>
      {(error || result) && (
        <div className={`alert ${error ? 'alert-error' : 'alert-success'}`}>
          {error ||
            result?.message ||
            result?.status ||
            'הפרטים נטענו בהצלחה. הרשימה למטה מציגה תיקיות וקבצים אם נמצאו.'}
        </div>
      )}
      {result && (
        <DirectoryResults
          result={result}
          emptyDirectoriesMessage="לא נמצאו תתי־שלוחות בנתיב זה."
          emptyFilesMessage="לא נמצאו קבצים בנתיב זה."
        />
      )}
    </div>
  );
}

type UserDirectoryPageProps = {
  session: AuthSession;
  onLogout: () => void;
};

type ExtensionResult = {
  extension: string;
  result: DirectoryInfoResponse | null;
  error: string | null;
};

function UserDirectoryPage({ session, onLogout }: UserDirectoryPageProps) {
  const [token, setToken] = useState<SystemTokenResponse | null>(null);
  const [tokenError, setTokenError] = useState('');
  const [tokenStatus, setTokenStatus] = useState('');
  const [extensionResults, setExtensionResults] = useState<ExtensionResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  const userExtensions = useMemo(
    () => session.user.extensions.map((value) => value.trim()).filter(Boolean),
    [session.user.extensions],
  );
  const hasExtensions = userExtensions.length > 0;

  const fetchDirectories = useCallback(async () => {
    if (!hasExtensions) {
      setTokenError('אין שלוחות מוגדרות עבור חשבון זה.');
      setExtensionResults([]);
      setToken(null);
      return;
    }

    setLoading(true);
    setTokenError('');
    setTokenStatus('');

    try {
      const generated = await createSystemToken(session.user.id, session.token);
      setToken(generated);
      setTokenStatus('נוצר טוקן חדש עבור המערכת שלך והשלוחות נטענו.');

      const responses = await Promise.all(
        userExtensions.map(async (extension) => {
          try {
            const result = await fetchDirectoryInfo({
              systemNumber: session.user.systemNumber,
              token: generated.token,
              path: extension,
            });
            return { extension, result, error: null };
          } catch (error) {
            return {
              extension,
              result: null,
              error: error instanceof Error ? error.message : 'שגיאה בשליפת הנתונים מהשלוחה.',
            };
          }
        }),
      );

      setExtensionResults(responses);
      setLastUpdated(new Date().toLocaleString());
    } catch (error) {
      setToken(null);
      setExtensionResults([]);
      setTokenError(error instanceof Error ? error.message : 'קבלת טוקן מהמנהל נכשלה.');
    } finally {
      setLoading(false);
    }
  }, [hasExtensions, session.token, session.user.id, session.user.systemNumber, userExtensions]);

  useEffect(() => {
    fetchDirectories();
  }, [fetchDirectories]);

  return (
    <div className="admin-card">
      <div className="admin-header">
        <div>
          <p className="eyebrow">צפייה בקבצים האישיים</p>
          <h1 className="title">קבצים במערכת שלי</h1>
          <p className="subtitle">משתמש עם הרשאות רגילות יכול לראות את הקבצים שהגדיר המנהל לפי שלוחות במערכת.</p>
        </div>
        <div className="admin-actions">
          <p className="muted">
            משתמש מחובר: {session.user.username} ({session.user.systemNumber})
          </p>
          <div className="admin-buttons">
            <button className="refresh-button" type="button" onClick={fetchDirectories} disabled={loading}>
              {loading ? 'טוען נתונים...' : 'רענן נתונים'}
            </button>
            <button className="refresh-button logout-button" type="button" onClick={onLogout}>
              התנתק
            </button>
          </div>
        </div>
      </div>

      <div className="panel">
        <div className="panel-header">
          <h2>שלוחות שהוגדרו עבורך</h2>
          <p>נבצע קריאה ל-Call2All לקבלת טוקן ונציג את הקבצים בכל שלוחה.</p>
        </div>
        <div className="user-meta-grid">
          <div className="muted">מספר מערכת: {session.user.systemNumber || '—'}</div>
          <div className="muted">שלוחות: {hasExtensions ? userExtensions.join(', ') : 'אין שלוחות מוגדרות.'}</div>
          {lastUpdated && <div className="muted">עודכן לאחרונה: {lastUpdated}</div>}
        </div>
        {(tokenError || tokenStatus) && (
          <div className={`alert ${tokenError ? 'alert-error' : 'alert-success'}`}>
            {tokenError || tokenStatus}
          </div>
        )}
        {token && (
          <div className="token-box">
            <span className="token-label">טוקן פעיל</span>
            <code className="token-value">{token.token}</code>
            <span className="token-expiry">תפוגה: {token.expires ?? 'לא הוחזרה על ידי השירות החיצוני'}</span>
          </div>
        )}
        {!hasExtensions && (
          <p className="muted">אין שלוחות מוגדרות עבורך. פנה למנהל כדי להוסיף שלוחות ולצפות בקבצים.</p>
        )}
      </div>

      {hasExtensions && (
        <div className="extension-panels">
          {extensionResults.map((entry) => (
            <div key={entry.extension} className="panel panel-wide">
              <div className="panel-header">
                <h3>שלוחה {entry.extension}</h3>
                <p>הקבצים והשלוחות שזוהו בנתיב זה.</p>
              </div>
              {entry.error && <div className="alert alert-error">{entry.error}</div>}
              {entry.result && (
                <DirectoryResults
                  result={entry.result}
                  emptyDirectoriesMessage="לא נמצאו תתי־שלוחות בנתיב זה."
                  emptyFilesMessage="לא נמצאו קבצים בנתיב זה."
                />
              )}
              {!entry.error && !entry.result && (
                <p className="muted">הנתונים לשלוחה זו עדיין לא נטענו.</p>
              )}
            </div>
          ))}
          {extensionResults.length === 0 && hasExtensions && !loading && (
            <p className="muted">לחץ על רענון כדי לטעון את פרטי השלוחות שלך.</p>
          )}
        </div>
      )}
    </div>
  );
}

function AdminPage({ session, onLogout }: AdminPageProps) {
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [isUpdateFormOpen, setIsUpdateFormOpen] = useState(false);
  const [isCreateFormOpen, setIsCreateFormOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    username: '',
    password: '',
    role: 'user' as Role,
    systemNumber: '',
    systemPassword: '',
    extensions: [''],
  });
  const [updateForm, setUpdateForm] = useState({
    password: '',
    role: 'user' as Role,
    systemNumber: '',
    systemPassword: '',
    extensions: [''],
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [systemToken, setSystemToken] = useState<SystemTokenResponse | null>(null);
  const [tokenError, setTokenError] = useState('');
  const [tokenStatus, setTokenStatus] = useState('');
  const [tokenLoading, setTokenLoading] = useState(false);

  const selectedUser = useMemo(
    () => users.find((user) => user.id === selectedUserId) ?? null,
    [selectedUserId, users],
  );

  const resetTokenState = () => {
    setSystemToken(null);
    setTokenError('');
    setTokenStatus('');
    setTokenLoading(false);
  };

  const applyUserToUpdateForm = (record: ManagedUser) => {
    setUpdateForm({
      password: '',
      role: record.role,
      systemNumber: record.systemNumber,
      systemPassword: record.systemPassword,
      extensions: ensureExtensionFields(record.extensions),
    });
  };

  const loadUsers = async () => {
    setLoading(true);
    setError('');
    try {
      const fromServer = await listUsers(session.token);
      setUsers(fromServer);
      if (!selectedUserId && fromServer.length) {
        handleSelectUser(fromServer[0]);
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

    const sanitizedExtensions = normalizeExtensions(createForm.extensions);
    if (sanitizedExtensions.length === 0) {
      setError('הוסיפו לפחות שלוחה אחת לפני שמירה.');
      return;
    }

    try {
      const created = await createUser({
        username: createForm.username,
        password: createForm.password,
        role: createForm.role,
        systemNumber: createForm.systemNumber,
        systemPassword: createForm.systemPassword,
        extensions: sanitizedExtensions,
      }, session.token);
      setUsers((previous) => [...previous, created]);
      setSuccess(`המשתמש ${createForm.username} נוצר ונשמר בשרת.`);
      setCreateForm({
        username: '',
        password: '',
        role: 'user',
        systemNumber: '',
        systemPassword: '',
        extensions: [''],
      });
      handleSelectUser(created);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'לא ניתן ליצור משתמש חדש כרגע.');
    }
  };

  const handleSelectUser = (record: ManagedUser) => {
    setSelectedUserId(record.id);
    applyUserToUpdateForm(record);
    resetTokenState();
  };

  const handleOpenUpdateForm = () => {
    if (selectedUser) {
      setIsUpdateFormOpen(true);
    }
  };

  const handleEditUser = (record: ManagedUser) => {
    handleSelectUser(record);
    setIsUpdateFormOpen(true);
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

    const sanitizedExtensions = normalizeExtensions(updateForm.extensions);
    if (sanitizedExtensions.length === 0) {
      setError('הוסיפו לפחות שלוחה אחת לפני שמירה.');
      return;
    }

    try {
      const updated = await updateUser(selectedUserId, {
        role: updateForm.role,
        password: updateForm.password || undefined,
        systemNumber: updateForm.systemNumber,
        systemPassword: updateForm.systemPassword,
        extensions: sanitizedExtensions,
      }, session.token);
      setUsers((previous) => previous.map((user) => (user.id === updated.id ? updated : user)));
      setSuccess('פרטי המשתמש נשמרו בשרת.');
      applyUserToUpdateForm(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'עדכון משתמש נכשל.');
    }
  };

  const handleCreateSystemToken = async () => {
    if (!selectedUser) {
      setTokenError('בחר משתמש כדי ליצור טוקן למערכת שלו.');
      return;
    }

    setTokenError('');
    setTokenStatus('');
    setTokenLoading(true);

    try {
      const created = await createSystemToken(selectedUser.id, session.token);
      setSystemToken(created);
      setTokenStatus('נוצר טוקן חדש למערכת שנבחרה.');
    } catch (err) {
      setTokenError(err instanceof Error ? err.message : 'יצירת טוקן נכשלה.');
    } finally {
      setTokenLoading(false);
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
            מחובר כ: {session.user.username} ({session.user.role === 'manager' ? 'מנהל' : 'משתמש'})
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

      <div className="action-bar">
        <div>
          <p className="muted">פתחו את אחד הטפסים בחלון קופץ או בחרו משתמש לריענון.</p>
        </div>
        <div className="admin-buttons">
          <button
            type="button"
            className="refresh-button primary-action"
            onClick={() => setIsCreateFormOpen(true)}
          >
            הוסף משתמש חדש
          </button>
          <button
            type="button"
            className="refresh-button primary-action"
            onClick={handleOpenUpdateForm}
            disabled={!selectedUser}
          >
            פתח חלון עדכון
          </button>
        </div>
      </div>

      {selectedUser && (
        <div className="panel">
          <div className="panel-header">
            <h2>יצירת טוקן התחברות למערכת</h2>
            <p>
              צור טוקן Call2All לפי מספר המערכת והסיסמה ששמורים למשתמש שנבחר. אפשר להעתיק את הטוקן ולהשתמש בו
              מיידית.
            </p>
          </div>
          <p className="muted">
            משתמש נבחר: <strong>{selectedUser.username}</strong> • מערכת {selectedUser.systemNumber}
          </p>
          {(tokenError || tokenStatus) && (
            <div className={`alert ${tokenError ? 'alert-error' : 'alert-success'}`}>
              {tokenError || tokenStatus}
            </div>
          )}
          {systemToken && (
            <div className="token-box">
              <span className="token-label">טוקן שהופק</span>
              <code className="token-value">{systemToken.token}</code>
              <span className="token-expiry">
                תפוגה: {systemToken.expires ?? 'לא הוחזרה על ידי השירות החיצוני'}
              </span>
            </div>
          )}
          <div className="admin-buttons">
            <button
              type="button"
              className="refresh-button primary-action"
              onClick={handleCreateSystemToken}
              disabled={tokenLoading}
            >
              {tokenLoading ? 'יוצר טוקן...' : 'צור טוקן למערכת זו'}
            </button>
          </div>
        </div>
      )}

      <DirectoryInspector selectedUser={selectedUser} generatedToken={systemToken?.token} />

      <div className="panel panel-wide">
        <div className="panel-header">
          <h2>משתמשים קיימים</h2>
          <p>בחר משתמש כדי לעדכן תפקיד וסיסמה. הטבלה נפרשת לרוחב מלא לצפייה נוחה.</p>
        </div>
        {loading ? (
          <p className="muted">טוען נתונים מהשרת...</p>
        ) : users.length === 0 ? (
          <p className="muted">אין משתמשים בשרת.</p>
        ) : (
          <div className="table-grid">
            <div className="table-head">
              <span>משתמש</span>
              <span>תפקיד</span>
              <span>מספר מערכת</span>
              <span>שלוחות</span>
              <span>עודכן</span>
              <span className="cell-actions">פעולות</span>
            </div>
            {users.map((user) => (
              <div
                key={user.id}
                className={`table-grid-row ${selectedUserId === user.id ? 'active' : ''}`}
                onClick={() => handleSelectUser(user)}
                role="button"
                tabIndex={0}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    handleSelectUser(user);
                  }
                }}
              >
                <div className="cell cell-main">
                  <p className="row-title">{user.username}</p>
                  <p className="row-subtitle">
                    מערכת {user.systemNumber} • {user.extensions.length ? `${user.extensions.length} שלוחות` : 'ללא שלוחות'}
                  </p>
                </div>
                <div className="cell" data-label="תפקיד">
                  <span className={`badge ${user.role === 'manager' ? 'badge-strong' : ''}`}>
                    {user.role === 'manager' ? 'מנהל' : 'משתמש'}
                  </span>
                </div>
                <div className="cell table-meta" data-label="מספר מערכת">
                  {user.systemNumber}
                </div>
                <div className="cell table-meta" data-label="שלוחות">
                  {user.extensions.length ? user.extensions.join(', ') : '—'}
                </div>
                <div className="cell table-meta" data-label="עודכן">
                  {new Date(user.updatedAt).toLocaleString()}
                </div>
                <div className="cell cell-actions" data-label="פעולות">
                  <button
                    type="button"
                    className="ghost-button"
                    onClick={(event) => {
                      event.stopPropagation();
                      handleEditUser(user);
                    }}
                  >
                    ערוך
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {isCreateFormOpen && (
        <Modal
          title="הוספת משתמש חדש"
          description="החשבון ישמר על השרת ויופיע ברשימת המשתמשים."
          onClose={() => setIsCreateFormOpen(false)}
        >
          <form className="form" onSubmit={handleCreateUser}>
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
            <SystemDetailsSection
              systemNumber={createForm.systemNumber}
              systemPassword={createForm.systemPassword}
              extensions={createForm.extensions}
              onSystemNumberChange={(value) => setCreateForm((prev) => ({ ...prev, systemNumber: value }))}
              onSystemPasswordChange={(value) => setCreateForm((prev) => ({ ...prev, systemPassword: value }))}
              onExtensionsChange={(extensions) => setCreateForm((prev) => ({ ...prev, extensions }))}
            />
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
            <div className="form-actions">
              <button type="button" className="refresh-button" onClick={() => setIsCreateFormOpen(false)}>
                בטל
              </button>
              <button type="submit" className="submit-button" disabled={loading}>
                שמור בשרת
              </button>
            </div>
          </form>
        </Modal>
      )}

      {isUpdateFormOpen && (
        <Modal
          title="עדכון חשבון"
          description="שינוי התפקיד ואיפוס סיסמה של משתמש שנבחר."
          onClose={() => setIsUpdateFormOpen(false)}
        >
          <form className="form" onSubmit={handleUpdateUser}>
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
            <SystemDetailsSection
              systemNumber={updateForm.systemNumber}
              systemPassword={updateForm.systemPassword}
              extensions={updateForm.extensions}
              onSystemNumberChange={(value) => setUpdateForm((prev) => ({ ...prev, systemNumber: value }))}
              onSystemPasswordChange={(value) => setUpdateForm((prev) => ({ ...prev, systemPassword: value }))}
              onExtensionsChange={(extensions) => setUpdateForm((prev) => ({ ...prev, extensions }))}
              disabled={!selectedUser}
              helper="לכל שלוחה שדה ייעודי. ניתן להסיר או להוסיף שלוחות לפי הצורך."
              footer={
                selectedUser && (
                  <div className="extensions-row">
                    <span className="muted">שלוחות נוכחיות:</span>
                    <div className="chips">
                      {selectedUser.extensions.map((extension) => (
                        <span key={extension} className="chip">
                          {extension}
                        </span>
                      ))}
                      {selectedUser.extensions.length === 0 && <span className="muted">אין שלוחות משויכות.</span>}
                    </div>
                  </div>
                )
              }
            />
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
            <div className="form-actions">
              <button type="button" className="refresh-button" onClick={() => setIsUpdateFormOpen(false)}>
                סגור חלון
              </button>
              <button type="submit" className="submit-button" disabled={!selectedUser || loading}>
                שמור שינויים
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

function App() {
  const [session, setSession] = useState<AuthSession | null>(null);

  const handleLogout = () => {
    setSession(null);
  };

  return (
    <div className="page">
      <div className="layout">
        {!session ? (
          <LoginCard onSuccess={setSession} />
        ) : session.user.role !== 'manager' ? (
          <UserDirectoryPage session={session} onLogout={handleLogout} />
        ) : (
          <AdminPage session={session} onLogout={handleLogout} />
        )}
      </div>
    </div>
  );
}

export default App;

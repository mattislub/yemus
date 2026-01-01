import { useEffect, useMemo, useRef, useState } from 'react';
import { BranchItem, SAMPLE_ITEMS, fetchBranchContents } from './api/ivr.ts';
import './App.css';

type Status = 'idle' | 'loading' | 'ready' | 'error';

const formatBytes = (value?: number) => {
  if (!value || Number.isNaN(value)) return '—';
  if (value < 1024) return `${value} B`;
  const units = ['KB', 'MB', 'GB'];
  const exponent = Math.min(Math.floor(Math.log(value) / Math.log(1024)), units.length - 1);
  const size = value / 1024 ** (exponent + 1);
  return `${size.toFixed(1)} ${units[exponent]}`;
};

const formatDuration = (value?: number) => {
  if (!value && value !== 0) return '';
  const minutes = Math.floor(value / 60);
  const seconds = value % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

const defaultBaseUrl = import.meta.env.VITE_IVR_BASE_URL ?? 'https://www.call2all.co.il/ym/api';

function App() {
  const [form, setForm] = useState({
    systemNumber: '',
    password: '',
    branchPath: '1/2',
    baseUrl: defaultBaseUrl
  });
  const [rememberPassword, setRememberPassword] = useState(false);
  const [items, setItems] = useState<BranchItem[]>([]);
  const [rawResponse, setRawResponse] = useState<unknown>(null);
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState<string | null>(null);
  const [downloadingAll, setDownloadingAll] = useState(false);
  const controllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem('ivr-dashboard');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setForm((prev) => ({
          ...prev,
          systemNumber: parsed.systemNumber ?? prev.systemNumber,
          branchPath: parsed.branchPath ?? prev.branchPath,
          baseUrl: parsed.baseUrl ?? prev.baseUrl,
          password: parsed.rememberPassword ? parsed.password ?? '' : ''
        }));
        setRememberPassword(Boolean(parsed.rememberPassword));
      } catch (err) {
        console.warn('Unable to parse saved settings', err);
      }
    }
  }, []);

  useEffect(() => {
    const payload: Record<string, unknown> = {
      systemNumber: form.systemNumber,
      branchPath: form.branchPath,
      baseUrl: form.baseUrl,
      rememberPassword
    };

    if (rememberPassword && form.password) {
      payload.password = form.password;
    }

    localStorage.setItem('ivr-dashboard', JSON.stringify(payload));
  }, [form.systemNumber, form.branchPath, form.baseUrl, form.password, rememberPassword]);

  const fileCount = useMemo(() => items.filter((item) => item.type === 'file').length, [items]);
  const folderCount = useMemo(() => items.filter((item) => item.type === 'folder').length, [items]);

  const handleChange = (key: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleFetch = async () => {
    setStatus('loading');
    setError(null);

    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;

    try {
      const { items: responseItems, raw } = await fetchBranchContents({
        ...form,
        signal: controller.signal
      });
      setItems(responseItems);
      setRawResponse(raw);
      setStatus('ready');
    } catch (err) {
      if ((err as Error).name === 'AbortError') return;
      setStatus('error');
      setError((err as Error).message);
    }
  };

  const loadSample = () => {
    controllerRef.current?.abort();
    setItems(SAMPLE_ITEMS);
    setRawResponse({ demo: true, items: SAMPLE_ITEMS });
    setStatus('ready');
    setError(null);
  };

  const handleAbort = () => {
    controllerRef.current?.abort();
    setStatus('idle');
  };

  const downloadItem = async (item: BranchItem) => {
    if (!item.downloadUrl) {
      throw new Error('לא נמצאה כתובת להורדה עבור הפריט הזה.');
    }

    const response = await fetch(item.downloadUrl);
    if (!response.ok) {
      throw new Error(`הורדה נכשלה (${response.status}).`);
    }

    const blob = await response.blob();
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    const fallbackName = item.path?.split('/')?.pop() ?? 'ivr-file';
    link.download = item.name || fallbackName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(link.href);
  };

  const downloadAll = async () => {
    setDownloadingAll(true);
    setError(null);
    const files = items.filter((item) => item.type === 'file');

    for (const file of files) {
      try {
        // eslint-disable-next-line no-await-in-loop
        await downloadItem(file);
      } catch (err) {
        setError((err as Error).message);
        break;
      }
    }

    setDownloadingAll(false);
  };

  return (
    <div className="app-shell">
      <header className="header">
        <div>
          <h1>ניהול IVR - ימות המשיח</h1>
          <p>שליפה מהירה של שלוחות (כברירת מחדל 1/2), עם ספירת קבצים ואפשרויות הורדה.</p>
        </div>
        <span className="badge">⚡️ Vite + React</span>
      </header>

      <div className="form-grid">
        <div className="form-field">
          <label htmlFor="system">מספר מערכת (חובה)</label>
          <input
            id="system"
            placeholder="לדוגמה: 12345"
            value={form.systemNumber}
            onChange={(e) => handleChange('systemNumber', e.target.value)}
          />
        </div>
        <div className="form-field">
          <label htmlFor="password">סיסמה (חובה)</label>
          <input
            id="password"
            type="password"
            placeholder="••••••"
            value={form.password}
            onChange={(e) => handleChange('password', e.target.value)}
          />
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14 }}>
            <input
              type="checkbox"
              checked={rememberPassword}
              onChange={(e) => setRememberPassword(e.target.checked)}
            />
            זכור סיסמה מקומית (נשמר רק בדפדפן שלך)
          </label>
        </div>
        <div className="form-field">
          <label htmlFor="branch">שלוחה לבדיקה</label>
          <input
            id="branch"
            value={form.branchPath}
            onChange={(e) => handleChange('branchPath', e.target.value)}
          />
          <small className="helper">ברירת מחדל: 1/2</small>
        </div>
        <div className="form-field">
          <label htmlFor="base">כתובת API</label>
          <input
            id="base"
            value={form.baseUrl}
            onChange={(e) => handleChange('baseUrl', e.target.value)}
          />
          <small className="helper">ניתן להגדיר גם בקובץ ‎.env (VITE_IVR_BASE_URL)</small>
        </div>
      </div>

      <div className="actions">
        <button className="primary" onClick={handleFetch} disabled={status === 'loading'}>
          בדיקת שלוחה
        </button>
        <button className="secondary" onClick={loadSample} disabled={status === 'loading'}>
          טעינת נתוני דמו
        </button>
        <button className="secondary" onClick={handleAbort} disabled={status !== 'loading'}>
          עצירת בקשה
        </button>
      </div>

      {status === 'loading' && <div className="status-bar">מבצע שאילתא... (ייתכן שיקח מספר שניות)</div>}
      {status === 'ready' && !error && (
        <div className="status-bar success">
          🎉 נמצאו {items.length} פריטים ({fileCount} קבצים, {folderCount} תיקיות)
        </div>
      )}
      {status === 'error' && error && <div className="status-bar error">⚠️ {error}</div>}

      <div className="cards">
        <div className="card">
          <h3>כמות קבצים</h3>
          <div className="pill">{fileCount} קבצים בשלוחה</div>
          <small>הכוללים את שלוחה {form.branchPath}</small>
        </div>
        <div className="card">
          <h3>שלוחה פעילה</h3>
          <div className="pill">{form.branchPath || '1/2'}</div>
          <small>ניתן לעדכן לשלוחה אחרת</small>
        </div>
        <div className="card">
          <h3>API</h3>
          <div className="chip">{form.baseUrl}</div>
          <small>מספר מערכת וסיסמה מוזנים בשדות למעלה</small>
        </div>
      </div>

      <div className="actions" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <div className="download-grid">
          <button
            className="primary"
            onClick={downloadAll}
            disabled={downloadingAll || fileCount === 0}
            title={fileCount === 0 ? 'אין קבצים להוריד' : 'הורד את כל הקבצים ברצף'}
          >
            הורדת כל הקבצים
          </button>
          <span className="helper">או הורידו אחד-אחד מטבלת הפריטים</span>
        </div>
      </div>

      <div className="item-list">
        <div className="item-row header">
          <div>שם הפריט</div>
          <div>סוג</div>
          <div>גודל / אורך</div>
          <div>פעולות</div>
        </div>
        {items.map((item) => (
          <div key={item.id} className="item-row">
            <div className="item-name">
              {item.type === 'folder' ? '📁' : '🎵'} {item.name}
            </div>
            <div>
              <span className="chip">{item.type === 'folder' ? 'תיקיה' : 'קובץ'}</span>
            </div>
            <div>
              <div>{formatBytes(item.size)}</div>
              {item.lengthSeconds !== undefined && <small>{formatDuration(item.lengthSeconds)} דק׳</small>}
            </div>
            <div className="download-grid">
              {item.downloadUrl ? (
                <button className="secondary" onClick={() => downloadItem(item)} disabled={item.type === 'folder'}>
                  הורדה
                </button>
              ) : (
                <small className="helper">אין URL להורדה</small>
              )}
              {item.path && <span className="chip">{item.path}</span>}
            </div>
          </div>
        ))}
        {items.length === 0 && <div className="item-row">לא נטענו פריטים עדיין. התחילו בלחיצה על "בדיקת שלוחה".</div>}
      </div>

      {rawResponse && (
        <div>
          <h3>תשובת API (גולמית)</h3>
          <pre className="raw-response">{JSON.stringify(rawResponse, null, 2)}</pre>
        </div>
      )}

      <p className="helper">
        טיפ: אם אתם נתקלים בחסימות CORS, הגדירו פרוקסי ב-vite.config או בצעו את הקריאה דרך שרת ביניים.
        שדות "מספר מערכת" ו"סיסמה" נמצאים בראש הדף כדי שיהיה קל להדביק אותם בכל סשן.
      </p>
    </div>
  );
}

export default App;

export type BranchItem = {
  id: string;
  name: string;
  type: 'file' | 'folder';
  path?: string;
  size?: number;
  downloadUrl?: string;
  lengthSeconds?: number;
};

export type BranchRequest = {
  systemNumber: string;
  password: string;
  branchPath: string;
  baseUrl?: string;
  signal?: AbortSignal;
};

export type BranchResult = {
  items: BranchItem[];
  raw: unknown;
};

const DEFAULT_BASE_URL = (import.meta.env.VITE_IVR_BASE_URL as string | undefined) ??
  'https://www.call2all.co.il/ym/api';

const sanitizeBaseUrl = (value: string) => value.replace(/\/$/, '');

const buildDownloadUrl = (baseUrl: string, path: string, systemNumber: string, password: string) => {
  const normalizedBase = sanitizeBaseUrl(baseUrl);
  const url = new URL(`${normalizedBase}/ivr/file`);
  url.searchParams.set('system', systemNumber);
  url.searchParams.set('password', password);
  url.searchParams.set('path', path);
  return url.toString();
};

const normalizeItem = (raw: any, index: number, request: BranchRequest): BranchItem => {
  const name =
    raw?.name ??
    raw?.title ??
    raw?.fileName ??
    raw?.filename ??
    raw?.displayName ??
    `פריט ${index + 1}`;

  const path = raw?.path ?? raw?.route ?? raw?.fullPath ?? raw?.ivrPath ?? undefined;
  const explicitDownload = raw?.downloadUrl ?? raw?.url ?? raw?.download?.url;
  const downloadUrl = path && !explicitDownload
    ? buildDownloadUrl(request.baseUrl ?? DEFAULT_BASE_URL, path, request.systemNumber, request.password)
    : explicitDownload;

  const type: 'file' | 'folder' =
    raw?.type === 'dir' || raw?.type === 'folder' || raw?.isFolder
      ? 'folder'
      : 'file';

  const size = typeof raw?.size === 'number' ? raw.size : typeof raw?.length === 'number' ? raw.length : undefined;
  const lengthSeconds = typeof raw?.lengthSeconds === 'number' ? raw.lengthSeconds : undefined;

  return {
    id: raw?.id?.toString?.() ?? `${index}-${name}`,
    name,
    type,
    path,
    size,
    lengthSeconds,
    downloadUrl
  };
};

const extractItems = (payload: any, request: BranchRequest): BranchItem[] => {
  if (!payload) return [];

  const candidates = [payload?.items, payload?.files, payload?.data, payload?.children, payload?.result, payload];
  const firstArray = candidates.find(Array.isArray);

  if (Array.isArray(firstArray)) {
    return firstArray.map((item, idx) => normalizeItem(item, idx, request));
  }

  if (payload && typeof payload === 'object' && !Array.isArray(payload)) {
    const values = Object.values(payload);
    if (values.every((value) => value && typeof value === 'object')) {
      return values.map((value: any, idx) => normalizeItem(value, idx, request));
    }
  }

  return [];
};

export const fetchBranchContents = async (request: BranchRequest): Promise<BranchResult> => {
  const { systemNumber, password, branchPath, signal } = request;
  if (!systemNumber || !password) {
    throw new Error('יש למלא מספר מערכת וסיסמה לפני קריאה ל-API.');
  }

  const baseUrl = sanitizeBaseUrl(request.baseUrl ?? DEFAULT_BASE_URL);
  const url = `${baseUrl}/ivr/branch`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      system: systemNumber,
      password,
      path: branchPath
    }),
    signal
  });

  if (!response.ok) {
    const message = await response.text().catch(() => '');
    throw new Error(`הקריאה נכשלה (${response.status}). ${message}`.trim());
  }

  const data = await response.json();
  return { items: extractItems(data, request), raw: data };
};

export const SAMPLE_ITEMS: BranchItem[] = [
  {
    id: 'demo-1',
    name: 'שיעור יומי - הרב כהן',
    type: 'file',
    path: '1/2/shiur-01.mp3',
    size: 3450000,
    lengthSeconds: 610,
    downloadUrl: 'https://files.example.com/ivr/1-2/shiur-01.mp3'
  },
  {
    id: 'demo-2',
    name: 'מודעה - לוח מודעות',
    type: 'file',
    path: '1/2/bulletin-02.mp3',
    size: 850000,
    lengthSeconds: 145,
    downloadUrl: 'https://files.example.com/ivr/1-2/bulletin-02.mp3'
  },
  {
    id: 'demo-3',
    name: 'תת שלוחה 1/2/3',
    type: 'folder',
    path: '1/2/3'
  }
];

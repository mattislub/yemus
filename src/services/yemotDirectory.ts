export type DirectoryEntry = {
  name: string;
  path: string;
  type: 'directory' | 'file';
  size?: number;
};

export type DirectoryInfoResponse = {
  status?: string;
  message?: string;
  directories: DirectoryEntry[];
  files: DirectoryEntry[];
  raw: unknown;
};

type RequestParams = {
  systemNumber: string;
  token: string;
  path: string;
};

const API_BASE = import.meta.env.VITE_YEMOT_API_BASE_URL ?? 'https://www.call2all.co.il/ym/api';

const toObject = (value: unknown): Record<string, unknown> => {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
};

const firstArrayFrom = (source: Record<string, unknown>, keys: string[]): unknown[] => {
  for (const key of keys) {
    const candidate = source[key];
    if (Array.isArray(candidate)) {
      return candidate;
    }
  }
  return [];
};

const parseSize = (value: unknown): number | undefined => {
  if (typeof value === 'number') {
    return value;
  }
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
};

const normalizeEntry = (item: unknown, type: DirectoryEntry['type']): DirectoryEntry => {
  if (!item) {
    return { name: 'לא זוהה', path: '', type };
  }

  if (typeof item === 'string') {
    return { name: item, path: item, type };
  }

  if (typeof item === 'object') {
    const data = item as Record<string, unknown>;
    const name =
      (data.name as string) ??
      (data.title as string) ??
      (data.dirName as string) ??
      (data.dir_name as string) ??
      (data.file as string) ??
      (data.filename as string) ??
      (data.id as string) ??
      'לא זוהה';
    const path =
      (data.path as string) ??
      (data.dir_path as string) ??
      (data.fullPath as string) ??
      (data.id as string) ??
      name;
    const size = parseSize(data.size ?? data.length ?? data.file_size);

    return { name, path, type, ...(size ? { size } : {}) };
  }

  return { name: 'לא זוהה', path: '', type };
};

const normalizeDirectoryResponse = (payload: unknown) => {
  const root = toObject(payload);
  const content = toObject(root.responseData ?? root.data ?? root.result ?? root);

  const directoriesRaw = firstArrayFrom(content, ['dirs', 'directories', 'folders', 'sub_dirs', 'subDirectories']);
  const filesRaw = firstArrayFrom(content, ['files', 'list', 'items']);

  return {
    status:
      (content.status as string) ??
      (content.responseStatus as string) ??
      (root.status as string) ??
      (root.responseStatus as string),
    message: (content.message as string) ?? (root.message as string) ?? (root.error as string),
    directories: directoriesRaw.map((item) => normalizeEntry(item, 'directory')),
    files: filesRaw.map((item) => normalizeEntry(item, 'file')),
  };
};

export async function fetchDirectoryInfo(params: RequestParams): Promise<DirectoryInfoResponse> {
  const body = new URLSearchParams({
    action: 'get_dir_info',
    system: params.systemNumber,
    token: params.token,
    path: params.path,
  });

  const response = await fetch(API_BASE, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  });

  const text = await response.text();
  let parsed: unknown = null;

  try {
    parsed = text ? JSON.parse(text) : null;
  } catch (error) {
    console.warn('Failed to parse directory response as JSON', error);
    parsed = text || null;
  }

  if (!response.ok) {
    const message =
      (parsed && typeof parsed === 'object' && 'message' in (parsed as Record<string, unknown>)
        ? (parsed as Record<string, unknown>).message
        : null) ??
      `בקשת API נכשלה (סטטוס ${response.status})`;
    throw new Error(typeof message === 'string' ? message : 'בקשת API נכשלה.');
  }

  const normalized = normalizeDirectoryResponse(parsed);

  return {
    ...normalized,
    raw: parsed,
  };
}

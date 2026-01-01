export type Role = 'user' | 'manager';

export type ManagedUser = {
  id: string;
  username: string;
  role: Role;
  systemNumber: string;
  systemPassword: string;
  extensions: string[];
  updatedAt: string;
};

export type AuthSession = {
  user: ManagedUser;
  token: string;
};

export type SystemTokenResponse = {
  token: string;
  expires: string | null;
  userId?: string;
  systemNumber?: string;
};

type CreatePayload = {
  username: string;
  password: string;
  role: Role;
  systemNumber: string;
  systemPassword: string;
  extensions: string[];
};

type UpdatePayload = {
  role?: Role;
  password?: string;
  systemNumber?: string;
  systemPassword?: string;
  extensions?: string[];
};

type ApiErrorResponse = {
  message?: string;
};

const API_BASE = '/api';

const parseJson = async (response: Response) => {
  const text = await response.text();
  if (!text) {
    return null;
  }

  const contentType = response.headers.get('Content-Type');
  const isJson = contentType?.includes('application/json');

  if (!isJson) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch (error) {
    console.warn('Failed to parse JSON response', error);
    return null;
  }
};

const request = async <T>(path: string, token?: string, init?: RequestInit): Promise<T> => {
  const response = await fetch(path, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers ?? {}),
    },
  });

  const payload = await parseJson(response);

  if (!response.ok) {
    const message = (payload as ApiErrorResponse | null)?.message ?? 'בקשה לשרת נכשלה.';
    throw new Error(message);
  }

  return payload as T;
};

export async function listUsers(token: string): Promise<ManagedUser[]> {
  return request<ManagedUser[]>(`${API_BASE}/users`, token);
}

export async function createUser(payload: CreatePayload, token: string): Promise<ManagedUser> {
  return request<ManagedUser>(`${API_BASE}/users`, token, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateUser(id: string, updates: UpdatePayload, token: string): Promise<ManagedUser> {
  return request<ManagedUser>(`${API_BASE}/users/${id}`, token, {
    method: 'PATCH',
    body: JSON.stringify(updates),
  });
}

export async function createSystemToken(id: string, token: string): Promise<SystemTokenResponse> {
  return request<SystemTokenResponse>(`${API_BASE}/users/${id}/token`, token, {
    method: 'POST',
  });
}

export async function signIn(username: string, password: string): Promise<AuthSession> {
  return request<AuthSession>(`${API_BASE}/login`, undefined, {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
}

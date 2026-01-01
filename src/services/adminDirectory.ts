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
  return text ? JSON.parse(text) : null;
};

const request = async <T>(path: string, init?: RequestInit): Promise<T> => {
  const response = await fetch(path, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
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

export async function listUsers(): Promise<ManagedUser[]> {
  return request<ManagedUser[]>(`${API_BASE}/users`);
}

export async function createUser(payload: CreatePayload): Promise<ManagedUser> {
  return request<ManagedUser>(`${API_BASE}/users`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateUser(id: string, updates: UpdatePayload): Promise<ManagedUser> {
  return request<ManagedUser>(`${API_BASE}/users/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(updates),
  });
}

export async function signIn(username: string, password: string): Promise<ManagedUser> {
  return request<ManagedUser>(`${API_BASE}/login`, {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
}

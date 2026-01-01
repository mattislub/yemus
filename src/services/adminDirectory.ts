export type Role = 'user' | 'manager';

export type ManagedUser = {
  id: string;
  username: string;
  role: Role;
  updatedAt: string;
};

type ServerUser = ManagedUser & {
  password: string;
};

type CreatePayload = {
  username: string;
  password: string;
  role: Role;
};

type UpdatePayload = {
  role?: Role;
  password?: string;
};

const serverState: { users: ServerUser[] } = {
  users: [
    {
      id: 'manager-1',
      username: 'מנהל ראשי',
      role: 'manager',
      password: 'changeMe123!',
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'ops-1',
      username: 'אופרציה',
      role: 'user',
      password: 'opsStrong!2',
      updatedAt: new Date().toISOString(),
    },
  ],
};

const sleep = (ms = 400) => new Promise((resolve) => setTimeout(resolve, ms));

const withoutPassword = (user: ServerUser): ManagedUser => ({
  id: user.id,
  username: user.username,
  role: user.role,
  updatedAt: user.updatedAt,
});

export async function listUsers(): Promise<ManagedUser[]> {
  await sleep();
  return serverState.users.map(withoutPassword);
}

export async function createUser(payload: CreatePayload): Promise<ManagedUser> {
  await sleep();

  const exists = serverState.users.some(
    (user) => user.username.trim().toLowerCase() === payload.username.trim().toLowerCase(),
  );
  if (exists) {
    throw new Error('משתמש עם שם זה כבר קיים בשרת.');
  }

  const now = new Date().toISOString();
  const record: ServerUser = {
    id: crypto.randomUUID(),
    username: payload.username.trim(),
    role: payload.role,
    password: payload.password,
    updatedAt: now,
  };

  serverState.users.push(record);
  return withoutPassword(record);
}

export async function updateUser(id: string, updates: UpdatePayload): Promise<ManagedUser> {
  await sleep();

  const record = serverState.users.find((user) => user.id === id);
  if (!record) {
    throw new Error('המשתמש לא נמצא בשרת.');
  }

  if (updates.role) {
    record.role = updates.role;
  }

  if (updates.password) {
    record.password = updates.password;
  }

  record.updatedAt = new Date().toISOString();
  return withoutPassword(record);
}

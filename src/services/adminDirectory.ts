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

type ServerUser = ManagedUser & {
  password: string;
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

const serverState: { users: ServerUser[] } = {
  users: [
    {
      id: 'manager-1',
      username: 'פנחס',
      role: 'manager',
      password: '613613',
      systemNumber: '10010',
      systemPassword: 'shalom123',
      extensions: ['1', '2', '10'],
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'ops-1',
      username: 'אופרציה',
      role: 'user',
      password: 'opsStrong!2',
      systemNumber: '20020',
      systemPassword: 'opsPass99',
      extensions: ['1'],
      updatedAt: new Date().toISOString(),
    },
  ],
};

const sleep = (ms = 400) => new Promise((resolve) => setTimeout(resolve, ms));

const withoutPassword = (user: ServerUser): ManagedUser => ({
  id: user.id,
  username: user.username,
  role: user.role,
  systemNumber: user.systemNumber,
  systemPassword: user.systemPassword,
  extensions: user.extensions,
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
    systemNumber: payload.systemNumber.trim(),
    systemPassword: payload.systemPassword.trim(),
    extensions: payload.extensions,
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

  if (typeof updates.systemNumber === 'string') {
    record.systemNumber = updates.systemNumber;
  }

  if (typeof updates.systemPassword === 'string') {
    record.systemPassword = updates.systemPassword;
  }

  if (updates.extensions !== undefined) {
    record.extensions = updates.extensions;
  }

  if (updates.password) {
    record.password = updates.password;
  }

  record.updatedAt = new Date().toISOString();
  return withoutPassword(record);
}

export async function signIn(username: string, password: string): Promise<ManagedUser> {
  await sleep();

  const record = serverState.users.find(
    (user) => user.username.trim().toLowerCase() === username.trim().toLowerCase(),
  );

  if (!record || record.password !== password) {
    throw new Error('שם משתמש או סיסמה שגויים.');
  }

  return withoutPassword(record);
}

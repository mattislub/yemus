export type Role = 'admin' | 'user';

export type LoginRequest = {
  name?: string;
  email: string;
  password: string;
  role: Role;
};

export type PublicUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
  lastLogin: string;
};

type StoredUser = PublicUser & { password: string };

const serverStore: StoredUser[] = [
  {
    id: 'adm-1',
    name: 'מנהל ראשי',
    email: 'admin@yemot.local',
    password: 'Admin@123',
    role: 'admin',
    lastLogin: new Date().toISOString()
  },
  {
    id: 'usr-1',
    name: 'משתמש לדוגמה',
    email: 'user@yemot.local',
    password: 'User@123',
    role: 'user',
    lastLogin: new Date().toISOString()
  }
];

const delay = (ms = 500) => new Promise((resolve) => setTimeout(resolve, ms));

const toPublicUser = (user: StoredUser): PublicUser => ({
  id: user.id,
  name: user.name,
  email: user.email,
  role: user.role,
  lastLogin: user.lastLogin
});

export const fetchUsers = async (): Promise<PublicUser[]> => {
  await delay(220);
  return serverStore.map(toPublicUser);
};

export const login = async (
  payload: LoginRequest
): Promise<{ user: PublicUser; notice: string }> => {
  const { email, password, role } = payload;
  if (!email || !password) {
    throw new Error('יש למלא אימייל וסיסמה כדי להמשיך.');
  }

  await delay();
  const now = new Date().toISOString();
  const existing = serverStore.find(
    (user) => user.email.toLowerCase() === email.toLowerCase() && user.role === role
  );

  if (existing) {
    if (existing.password !== password) {
      throw new Error('סיסמה שגויה עבור המשתמש שבחרת.');
    }

    existing.lastLogin = now;
    existing.name = payload.name?.trim() || existing.name;
    return { user: toPublicUser(existing), notice: 'התחברות בוצעה בהצלחה.' };
  }

  const newUser: StoredUser = {
    id: `user-${serverStore.length + 1}`,
    name: payload.name?.trim() || 'משתמש חדש',
    email,
    password,
    role,
    lastLogin: now
  };

  serverStore.push(newUser);
  return { user: toPublicUser(newUser), notice: 'נוצר משתמש חדש והתחברת בהצלחה.' };
};

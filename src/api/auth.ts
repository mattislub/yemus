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
  phoneNumber?: string;
  ivrSystemNumber?: string;
  ivrPassword?: string;
};

export type AdminPasswordChangeRequest = {
  email: string;
  currentPassword: string;
  newPassword: string;
};

export type CreateUserRequest = {
  name: string;
  email: string;
  password: string;
  role: Role;
  phoneNumber?: string;
  ivrSystemNumber?: string;
  ivrPassword?: string;
};

export type UpdateUserIvrAccessRequest = {
  userId: string;
  phoneNumber?: string;
  ivrSystemNumber?: string;
  ivrPassword?: string;
};

type StoredUser = PublicUser & { password: string };

const serverStore: StoredUser[] = [
  {
    id: 'adm-1',
    name: 'מנהל ראשי',
    email: 'admin@yemot.local',
    password: 'Admin@123',
    role: 'admin',
    lastLogin: new Date().toISOString(),
    phoneNumber: '+972521234567',
    ivrSystemNumber: '0771234567',
    ivrPassword: 'AdminIvrPass'
  },
  {
    id: 'usr-1',
    name: 'משתמש לדוגמה',
    email: 'user@yemot.local',
    password: 'User@123',
    role: 'user',
    lastLogin: new Date().toISOString(),
    phoneNumber: '+972501234567',
    ivrSystemNumber: '0777654321',
    ivrPassword: 'UserIvrPass'
  }
];

const delay = (ms = 500) => new Promise((resolve) => setTimeout(resolve, ms));

const toPublicUser = (user: StoredUser): PublicUser => ({
  id: user.id,
  name: user.name,
  email: user.email,
  role: user.role,
  lastLogin: user.lastLogin,
  phoneNumber: user.phoneNumber,
  ivrSystemNumber: user.ivrSystemNumber,
  ivrPassword: user.ivrPassword
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

export const updateAdminPassword = async (
  request: AdminPasswordChangeRequest
): Promise<{ notice: string }> => {
  const { email, currentPassword, newPassword } = request;
  if (!email || !currentPassword || !newPassword) {
    throw new Error('יש למלא אימייל, סיסמה קיימת וסיסמה חדשה.');
  }

  await delay(300);
  const admin = serverStore.find(
    (user) => user.role === 'admin' && user.email.toLowerCase() === email.toLowerCase()
  );

  if (!admin) {
    throw new Error('לא נמצא מנהל עם האימייל שסופק.');
  }

  if (admin.password !== currentPassword) {
    throw new Error('הסיסמה הנוכחית אינה תואמת.');
  }

  admin.password = newPassword;
  admin.lastLogin = new Date().toISOString();
  return { notice: 'הסיסמה עודכנה בהצלחה.' };
};

export const createUser = async (payload: CreateUserRequest): Promise<PublicUser> => {
  const { name, email, password, role, phoneNumber, ivrPassword, ivrSystemNumber } = payload;
  if (!email || !password || !role) {
    throw new Error('יש למלא אימייל, סיסמה ותפקיד עבור משתמש חדש.');
  }

  await delay(250);
  const exists = serverStore.some((user) => user.email.toLowerCase() === email.toLowerCase());
  if (exists) {
    throw new Error('כבר קיים משתמש עם האימייל שהוזן.');
  }

  const newUser: StoredUser = {
    id: `user-${serverStore.length + 1}`,
    name: name?.trim() || 'משתמש חדש',
    email,
    password,
    role,
    lastLogin: new Date().toISOString(),
    phoneNumber,
    ivrSystemNumber,
    ivrPassword
  };

  serverStore.push(newUser);
  return toPublicUser(newUser);
};

export const updateUserIvrAccess = async (
  payload: UpdateUserIvrAccessRequest
): Promise<PublicUser> => {
  const { userId, phoneNumber, ivrPassword, ivrSystemNumber } = payload;
  if (!userId) {
    throw new Error('נדרש מזהה משתמש לעדכון פרטי מערכת.');
  }

  await delay(260);
  const target = serverStore.find((user) => user.id === userId);
  if (!target) {
    throw new Error('לא נמצא משתמש לעדכון.');
  }

  target.phoneNumber = phoneNumber || target.phoneNumber;
  target.ivrSystemNumber = ivrSystemNumber || target.ivrSystemNumber;
  target.ivrPassword = ivrPassword || target.ivrPassword;
  target.lastLogin = new Date().toISOString();

  return toPublicUser(target);
};

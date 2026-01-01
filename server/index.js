import bcrypt from 'bcrypt';
import express from 'express';
import fs from 'fs/promises';
import jwt from 'jsonwebtoken';
import path from 'path';
import { randomUUID } from 'crypto';

const app = express();
const PORT = process.env.PORT || 4000;
const JWT_SECRET = process.env.JWT_SECRET || 'change-me-in-production';

const DATA_DIR = path.join(process.cwd(), 'data');
const USERS_PATH = path.join(DATA_DIR, 'users.json');

const hashPassword = (password) => bcrypt.hash(password, 10);

const readUsers = async () => {
  try {
    const file = await fs.readFile(USERS_PATH, 'utf-8');
    return JSON.parse(file);
  } catch (error) {
    if (error.code === 'ENOENT') {
      await fs.mkdir(DATA_DIR, { recursive: true });
      await fs.writeFile(USERS_PATH, '[]', 'utf-8');
      return [];
    }

    throw error;
  }
};

const writeUsers = async (users) => {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(USERS_PATH, JSON.stringify(users, null, 2), 'utf-8');
};

const sanitizeUser = (user) => ({
  id: user.id,
  username: user.username,
  role: user.role,
  systemNumber: user.systemNumber,
  systemPassword: user.systemPassword,
  extensions: user.extensions ?? [],
  updatedAt: user.updatedAt,
});

const verifyToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
};

const authenticate = (requireManager = false) => (req, res, next) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    res.status(401).json({ message: 'נדרשת התחברות.' });
    return;
  }

  const token = header.replace('Bearer ', '');
  const payload = verifyToken(token);
  if (!payload) {
    res.status(401).json({ message: 'האסימון לא תקף או שפג תוקפו.' });
    return;
  }

  if (requireManager && payload.role !== 'manager') {
    res.status(403).json({ message: 'אין הרשאה לפעולה זו.' });
    return;
  }

  req.auth = payload;
  next();
};

const optionalAuthenticate = () => (req, _res, next) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    req.auth = null;
    next();
    return;
  }

  const token = header.replace('Bearer ', '');
  const payload = verifyToken(token);
  req.auth = payload || null;
  next();
};

app.use(express.json());

app.post('/api/login', async (req, res) => {
  const { username, password } = req.body ?? {};
  if (!username || !password) {
    res.status(400).json({ message: 'חובה לספק שם משתמש וסיסמה.' });
    return;
  }

  try {
    const users = await readUsers();
    const record = users.find((user) => user.username.trim().toLowerCase() === String(username).trim().toLowerCase());

    if (!record) {
      res.status(401).json({ message: 'שם משתמש או סיסמה שגויים.' });
      return;
    }

    const matches = await bcrypt.compare(password, record.passwordHash);
    if (!matches) {
      res.status(401).json({ message: 'שם משתמש או סיסמה שגויים.' });
      return;
    }

    const token = jwt.sign({ sub: record.id, role: record.role }, JWT_SECRET, { expiresIn: '2h' });
    res.json({ user: sanitizeUser(record), token });
  } catch (error) {
    res.status(500).json({ message: error instanceof Error ? error.message : 'שגיאת שרת.' });
  }
});

app.get('/api/users', authenticate(true), async (_req, res) => {
  try {
    const users = await readUsers();
    res.json(users.map(sanitizeUser));
  } catch (error) {
    res.status(500).json({ message: error instanceof Error ? error.message : 'שגיאת שרת.' });
  }
});

app.post('/api/users', optionalAuthenticate(), async (req, res) => {
  const { username, password, role, systemNumber, systemPassword, extensions } = req.body ?? {};

  if (!username || !password || !role || !systemNumber || !systemPassword || !Array.isArray(extensions)) {
    res.status(400).json({ message: 'כל השדות חובה ליצירת משתמש.' });
    return;
  }

  if (!['user', 'manager'].includes(role)) {
    res.status(400).json({ message: 'תפקיד לא תקין.' });
    return;
  }

  if (password.length < 8) {
    res.status(400).json({ message: 'סיסמה חייבת להכיל לפחות 8 תווים.' });
    return;
  }

  try {
    const users = await readUsers();
    const isFirstUser = users.length === 0;

    if (!isFirstUser) {
      if (!req.auth) {
        res.status(401).json({ message: 'נדרשת התחברות.' });
        return;
      }

      if (req.auth.role !== 'manager') {
        res.status(403).json({ message: 'פעולה מותרת למנהלים בלבד.' });
        return;
      }
    }

    const exists = users.some(
      (user) => user.username.trim().toLowerCase() === String(username).trim().toLowerCase(),
    );
    if (exists) {
      res.status(409).json({ message: 'משתמש עם שם זה כבר קיים בשרת.' });
      return;
    }

    const passwordHash = await hashPassword(password);
    const newUser = {
      id: randomUUID(),
      username: String(username).trim(),
      role,
      passwordHash,
      systemNumber: String(systemNumber).trim(),
      systemPassword: String(systemPassword).trim(),
      extensions: extensions.map((value) => String(value).trim()).filter(Boolean),
      updatedAt: new Date().toISOString(),
    };

    users.push(newUser);
    await writeUsers(users);
    res.status(201).json(sanitizeUser(newUser));
  } catch (error) {
    res.status(500).json({ message: error instanceof Error ? error.message : 'שגיאת שרת.' });
  }
});

app.patch('/api/users/:id', authenticate(true), async (req, res) => {
  const { id } = req.params;
  const { role, password, systemNumber, systemPassword, extensions } = req.body ?? {};

  if (role && !['user', 'manager'].includes(role)) {
    res.status(400).json({ message: 'תפקיד לא תקין.' });
    return;
  }

  if (password && password.length < 8) {
    res.status(400).json({ message: 'סיסמה חייבת להכיל לפחות 8 תווים.' });
    return;
  }

  if (extensions && !Array.isArray(extensions)) {
    res.status(400).json({ message: 'שלוחות חייבות להיות מערך.' });
    return;
  }

  try {
    const users = await readUsers();
    const index = users.findIndex((user) => user.id === id);

    if (index === -1) {
      res.status(404).json({ message: 'המשתמש לא נמצא בשרת.' });
      return;
    }

    const record = users[index];
    const updatedRecord = { ...record };

    if (role) updatedRecord.role = role;
    if (typeof systemNumber === 'string') updatedRecord.systemNumber = systemNumber.trim();
    if (typeof systemPassword === 'string') updatedRecord.systemPassword = systemPassword.trim();
    if (Array.isArray(extensions)) {
      updatedRecord.extensions = extensions.map((value) => String(value).trim()).filter(Boolean);
    }
    if (password) {
      updatedRecord.passwordHash = await hashPassword(password);
    }

    updatedRecord.updatedAt = new Date().toISOString();
    users.splice(index, 1, updatedRecord);

    await writeUsers(users);
    res.json(sanitizeUser(updatedRecord));
  } catch (error) {
    res.status(500).json({ message: error instanceof Error ? error.message : 'שגיאת שרת.' });
  }
});

app.listen(PORT, () => {
  console.log(`User management server is running on http://localhost:${PORT}`);
});

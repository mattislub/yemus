import { randomUUID } from 'crypto';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
const logApi = (...messages) => console.info('[Mock API]', ...messages);
const logApiError = (error, context) => {
    const normalized = error instanceof Error ? error.stack ?? error.message : String(error);
    console.error('[Mock API] Unexpected error', { method: context.method, url: context.url, error: normalized });
};
const serverState = {
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
const parseBody = async (req) => new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
        body += chunk;
    });
    req.on('end', () => {
        try {
            resolve(body ? JSON.parse(body) : {});
        }
        catch (error) {
            reject(error);
        }
    });
    req.on('error', reject);
});
const withoutPassword = (user) => ({
    id: user.id,
    username: user.username,
    role: user.role,
    systemNumber: user.systemNumber,
    systemPassword: user.systemPassword,
    extensions: user.extensions,
    updatedAt: user.updatedAt,
});
const sendJson = (res, status, payload) => {
    res.statusCode = status;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(payload));
};
const apiHandler = async (req, res, next) => {
    const request = req;
    if (!request.url?.startsWith('/api')) {
        next();
        return;
    }
    logApi('Incoming request', { method: request.method, url: request.url });
    try {
        if (request.url === '/api/users' && request.method === 'GET') {
            logApi('Listing users');
            sendJson(res, 200, serverState.users.map(withoutPassword));
            return;
        }
        if (request.url === '/api/users' && request.method === 'POST') {
            const body = await parseBody(req);
            const exists = serverState.users.some((user) => user.username.trim().toLowerCase() === body.username.trim().toLowerCase());
            if (exists) {
                logApi('Attempt to create duplicate user', body.username);
                sendJson(res, 409, { message: 'משתמש עם שם זה כבר קיים בשרת.' });
                return;
            }
            const record = {
                id: randomUUID(),
                username: body.username.trim(),
                role: body.role,
                password: body.password,
                systemNumber: body.systemNumber.trim(),
                systemPassword: body.systemPassword.trim(),
                extensions: body.extensions,
                updatedAt: new Date().toISOString(),
            };
            serverState.users.push(record);
            logApi('Created user', record.id);
            sendJson(res, 201, withoutPassword(record));
            return;
        }
        if (request.url?.startsWith('/api/users/') && request.method === 'PATCH') {
            const id = request.url.replace('/api/users/', '');
            const record = serverState.users.find((user) => user.id === id);
            if (!record) {
                logApi('User not found for update', id);
                sendJson(res, 404, { message: 'המשתמש לא נמצא בשרת.' });
                return;
            }
            const updates = await parseBody(req);
            if (updates.role)
                record.role = updates.role;
            if (typeof updates.systemNumber === 'string')
                record.systemNumber = updates.systemNumber;
            if (typeof updates.systemPassword === 'string')
                record.systemPassword = updates.systemPassword;
            if (updates.extensions !== undefined)
                record.extensions = updates.extensions;
            if (updates.password)
                record.password = updates.password;
            record.updatedAt = new Date().toISOString();
            logApi('Updated user', record.id);
            sendJson(res, 200, withoutPassword(record));
            return;
        }
        if (request.url === '/api/login' && request.method === 'POST') {
            const body = await parseBody(req);
            const record = serverState.users.find((user) => user.username.trim().toLowerCase() === body.username.trim().toLowerCase());
            if (!record || record.password !== body.password) {
                logApi('Failed login attempt', { username: body.username, reason: 'Invalid credentials' });
                sendJson(res, 401, { message: 'שם משתמש או סיסמה שגויים.' });
                return;
            }
            logApi('Successful login', { username: record.username, role: record.role });
            sendJson(res, 200, withoutPassword(record));
            return;
        }
    }
    catch (error) {
        logApiError(error, request);
        sendJson(res, 500, { message: error instanceof Error ? error.message : 'שגיאת שרת.' });
        return;
    }
    next();
};
const serverApiPlugin = () => ({
    name: 'api-mock-server',
    configureServer(server) {
        server.middlewares.use(apiHandler);
    },
    configurePreviewServer(server) {
        server.middlewares.use(apiHandler);
    },
});
export default defineConfig({
    plugins: [react(), serverApiPlugin()],
    server: {
        port: 5173,
        host: '0.0.0.0',
    },
    preview: {
        port: 4173,
        host: '0.0.0.0',
    },
});


import { existsSync } from 'node:fs';
import { Bun } from 'bun';
import jwt from 'jsonwebtoken';
import { createServer, t } from '../shared/utils/server';

const SOCKET_PATH = '/tmp/retroarch.sock';
const TCP_FALLBACK_PORT = 9002;
const PORT = process.env.PORT || 9001;
const DEBUG = process.env.DEBUG === '1';

let currentToken = process.env.LIVEKIT_TOKEN || '';
const secret = process.env.LIVEKIT_API_SECRET;


// --- Validate and send message over socket ---
const sendInput = async (message: string) => {
  try {
    const conn =  Bun.connect({ socket: SOCKET_PATH, socketType: 'unix' })

    const success = await conn.write(`${message}\n`);
    await Bun.sleep(10);
    conn.end();

    if (!success) throw new Error('Write returned false');
    return true;
  } catch (e) {
    console.error('❌ Socket write failed:', e);
    return false;
  }
};

// --- Input schema ---
const inputSchema = t.Object({
  buttons: t.Array(t.String()),
  axes: t.Optional(t.Record(t.String(), t.Number())),
  pressure: t.Optional(t.Record(t.String(), t.Number())),
  touch: t.Optional(t.Array(t.Object({
    x: t.Number(),
    y: t.Number(),
    id: t.Number()
  }))),
  mouse: t.Optional(t.Object({
    x: t.Number(),
    y: t.Number(),
    buttons: t.Array(t.String())
  })),
  keyboard: t.Optional(t.Array(t.String()))
});

const app = createServer({
  // TODO
});

// --- Token endpoint ---
app.post('/token', ({ body }) => {
  const { token } = body; // TODO: type

  const decoded = jwt.verify(token, secret); // TODO: type
  if (!decoded) {
    
  }

  currentToken = token; // TODO: put in state?
  return {ok: true}; // TODO
}, {
  body: t.Object({ token: t.String().minLength(10) })
})

// --- Input forwarding endpoint ---
app.post('/input', async ({ body }) => {
  return await sendInput(body)
    ? { ok: true }
    : { ok: false, message: '' };
}, {
  body: inputSchema
})

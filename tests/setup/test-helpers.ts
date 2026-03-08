import type { Express } from 'express';
import type { Socket } from 'node:net';

type FetchLikeResponse = {
  headers: {
    get: (name: string) => string | null;
    getSetCookie?: () => string[];
  };
};

export function startServer(app: Express): Promise<{ baseUrl: string; close: () => Promise<void> }> {
  return new Promise((resolve) => {
    const server = app.listen(0, '127.0.0.1', () => {
      const address = server.address();
      const port = typeof address === 'object' && address ? address.port : 0;

      const sockets = new Set<Socket>();
      server.on('connection', (socket: Socket) => {
        sockets.add(socket);
        socket.on('close', () => sockets.delete(socket));
      });

      resolve({
        baseUrl: `http://127.0.0.1:${port}`,
        close: () =>
          new Promise<void>((r) => {
            for (const s of sockets) s.destroy();
            server.close(() => r());
          }),
      });
    });
  });
}

export function getSetCookies(res: FetchLikeResponse): string[] {
  const headers = res.headers;
  if (typeof headers.getSetCookie === 'function') return headers.getSetCookie();
  const single = headers.get('set-cookie');
  return single ? [single] : [];
}

export function pickCookie(setCookies: string[], cookieName: string): string | null {
  for (const sc of setCookies) {
    const first = sc.split(';')[0];
    if (first.startsWith(`${cookieName}=`)) return first;
  }
  return null;
}

export async function drain(res: Response): Promise<void> {
  try {
    await res.arrayBuffer();
  } catch {
    try {
      await res.body?.cancel();
    } catch {}
  }
}

import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize, sep } from 'node:path';
import type { App } from './app.js';

const MAX_BODY_BYTES = 1_000_000;

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.json': 'application/json',
};

class PayloadTooLarge extends Error {}

/** Os corpos que aceitamos são JSON, então lemos como texto UTF-8. */
async function readBody(req: IncomingMessage): Promise<string> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req as AsyncIterable<Buffer>) {
    size += chunk.length;
    if (size > MAX_BODY_BYTES) throw new PayloadTooLarge();
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString('utf8');
}

/** Converte a requisição do Node para o `Request` padrão da Web. */
async function toRequest(req: IncomingMessage): Promise<Request> {
  const url = `http://${req.headers.host ?? 'localhost'}${req.url ?? '/'}`;
  const headers = new Headers();
  for (const [name, value] of Object.entries(req.headers)) {
    if (typeof value === 'string') headers.set(name, value);
    else if (Array.isArray(value)) headers.set(name, value.join(', '));
  }

  const hasBody = req.method !== 'GET' && req.method !== 'HEAD';
  return new Request(url, { method: req.method ?? 'GET', headers, ...(hasBody && { body: await readBody(req) }) });
}

async function send(res: ServerResponse, response: Response): Promise<void> {
  res.writeHead(response.status, Object.fromEntries(response.headers));
  res.end(Buffer.from(await response.arrayBuffer()));
}

/** Em produção atrás de proxy (Render, Fly...) o IP real chega no `x-forwarded-for`. */
function clientIpOf(req: IncomingMessage): string {
  const forwarded = req.headers['x-forwarded-for'];
  const first = (Array.isArray(forwarded) ? forwarded[0] : forwarded)?.split(',')[0]?.trim();
  return first || req.socket.remoteAddress || 'unknown';
}

export function serveNode(app: App, port: number): Server {
  const server = createServer(async (req, res) => {
    try {
      await send(res, await app.fetch(await toRequest(req), clientIpOf(req)));
    } catch (error) {
      const status = error instanceof PayloadTooLarge ? 413 : 500;
      if (!res.headersSent) res.writeHead(status, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ error: status === 413 ? 'Corpo grande demais.' : 'Erro interno.' }));
    }
  });
  return server.listen(port);
}

/** Serve uma pasta de arquivos estáticos sem deixar escapar para fora dela. */
export function staticFolder(root: string) {
  return async (pathname: string): Promise<Response | null> => {
    const relative = pathname === '/' ? 'index.html' : decodeURIComponent(pathname).replace(/^\/+/, '');
    const file = normalize(join(root, relative));
    if (!file.startsWith(root + sep)) return null;

    try {
      const content = await readFile(file);
      return new Response(content, {
        headers: {
          'content-type': MIME[extname(file)] ?? 'application/octet-stream',
          'cache-control': 'public, max-age=300',
        },
      });
    } catch {
      return null;
    }
  };
}

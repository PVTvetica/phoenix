import type { Plugin } from 'vite';
import http from 'node:http';
import { URL } from 'node:url';

/**
 * Dev-only: proxy /api/* to Express before Vite can serve the `api/` source folder
 * as transformed JS (which breaks response.json() with "import * a"...).
 */
export function apiProxyFirst(target: string): Plugin {
    return {
        name: 'api-proxy-first',
        enforce: 'pre',
        configureServer(server) {
            server.middlewares.use((req, res, next) => {
                const raw = req.url ?? '';
                const pathname = raw.split('?')[0];
                if (pathname !== '/api' && !pathname.startsWith('/api/')) {
                    return next();
                }

                let targetUrl: URL;
                try {
                    targetUrl = new URL(raw, target);
                } catch {
                    res.statusCode = 502;
                    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
                    res.end(`Ungültiges API-Proxy-Ziel: ${target}`);
                    return;
                }

                const headers = { ...req.headers, host: targetUrl.host };
                const proxyReq = http.request(
                    {
                        protocol: targetUrl.protocol,
                        hostname: targetUrl.hostname,
                        port: targetUrl.port,
                        path: targetUrl.pathname + targetUrl.search,
                        method: req.method,
                        headers,
                    },
                    (proxyRes) => {
                        res.writeHead(proxyRes.statusCode ?? 502, proxyRes.headers);
                        proxyRes.pipe(res);
                    },
                );

                proxyReq.on('error', (err) => {
                    res.statusCode = 502;
                    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
                    res.end(
                        `API nicht erreichbar (${target}). ` +
                        `Starte in einem zweiten Terminal: npm run dev:server\n\n${err.message}`,
                    );
                });

                req.pipe(proxyReq);
            });
        },
    };
}

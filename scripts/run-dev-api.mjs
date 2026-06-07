/**
 * Dev API entry: Express on 3001 while Vite uses 3000 and proxies /api here.
 */
process.env.PORT = process.env.PORT || '3001';
await import('../dist-server/server.js');

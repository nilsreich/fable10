// Minimaler statischer Server für das gebaute Demo (dist/): `bun run demo`
const server = Bun.serve({
  port: 8080,
  async fetch(req) {
    let path = new URL(req.url).pathname;
    if (path === '/') path = '/index.html';
    const file = Bun.file('dist' + path);
    if (!(await file.exists())) return new Response('Not found', { status: 404 });
    return new Response(file);
  },
});

console.log(`Demo läuft auf http://localhost:${server.port}/`);

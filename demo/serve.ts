// Minimaler statischer Server für das Demo-Playground: `bun run demo`
const server = Bun.serve({
  port: 8080,
  async fetch(req) {
    let path = new URL(req.url).pathname;
    if (path === '/') return Response.redirect('/demo/', 302);
    if (path === '/demo' || path === '/demo/') path = '/demo/index.html';
    const file = Bun.file('.' + path);
    if (!(await file.exists())) return new Response('Not found', { status: 404 });
    return new Response(file);
  },
});

console.log(`Demo läuft auf http://localhost:${server.port}/`);

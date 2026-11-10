// A tiny static server for the repo root (tests and screenshots). node tools/serve.js [port]
const http = require("http"), fs = require("fs"), path = require("path");
const ROOT = path.resolve(__dirname, ".."), TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".png": "image/png", ".mp3": "audio/mpeg", ".json": "application/json", ".webp": "image/webp" };
module.exports = function serve(port) {
  return new Promise((resolve) => {
    const srv = http.createServer((req, res) => {
      let p = decodeURIComponent(req.url.split("?")[0]); if (p.endsWith("/")) p += "index.html";
      const file = path.join(ROOT, p);
      if (!file.startsWith(ROOT)) { res.writeHead(403); return res.end(); }
      fs.readFile(file, (err, data) => { if (err) { res.writeHead(404); return res.end("not found"); } res.writeHead(200, { "Content-Type": TYPES[path.extname(file)] || "application/octet-stream", "Cache-Control": "no-store" }); res.end(data); });
    });
    srv.listen(port || 0, "127.0.0.1", () => resolve({ srv, port: srv.address().port, url: "http://127.0.0.1:" + srv.address().port }));
  });
};
if (require.main === module) module.exports(+process.argv[2] || 8080).then((s) => console.log("serving", s.url));

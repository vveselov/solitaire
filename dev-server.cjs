const http = require("http");
const fs = require("fs");
const path = require("path");

const root = __dirname;
const port = Number(process.env.PORT || 8765);
const host = "127.0.0.1";

const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
};

http
  .createServer((request, response) => {
    const url = new URL(request.url, `http://${host}:${port}`);
    const route = decodeURIComponent(url.pathname);
    const requested = path.resolve(root, route === "/" ? "index.html" : `.${route}`);

    if (!requested.startsWith(root)) {
      response.writeHead(403);
      response.end("Forbidden");
      return;
    }

    fs.readFile(requested, (error, content) => {
      if (error) {
        response.writeHead(404);
        response.end("Not found");
        return;
      }

      response.writeHead(200, {
        "Content-Type": types[path.extname(requested)] || "application/octet-stream",
      });
      response.end(content);
    });
  })
  .listen(port, host, () => {
    console.log(`Solitaire is running at http://${host}:${port}`);
  });

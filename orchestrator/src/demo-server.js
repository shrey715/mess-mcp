const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3456;
const DEMO_DIR = path.join(__dirname, '..', 'demo-applets');

const MIME_TYPES = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.svg': 'image/svg+xml'
};

const server = http.createServer((req, res) => {
    let filePath = path.join(DEMO_DIR, req.url === '/' ? 'index.html' : req.url);

    const ext = path.extname(filePath);
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    fs.readFile(filePath, (err, data) => {
        if (err) {
            res.writeHead(404);
            res.end('File not found');
            return;
        }

        res.writeHead(200, { 'Content-Type': contentType });
        res.end(data);
    });
});

server.listen(PORT, () => {
    console.log(`Demo applet server running at http://localhost:${PORT}`);
    console.log(`  - Sender: http://localhost:${PORT}/sender.html`);
    console.log(`  - Receiver: http://localhost:${PORT}/receiver.html`);
});

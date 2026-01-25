const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3456;
const DEMO_DIR = path.join(__dirname, '..', 'applets');

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
    // Handle directory paths by appending index.html
    let requestPath = req.url;
    if (requestPath === '/' || requestPath.endsWith('/')) {
        requestPath = requestPath + 'index.html';
    }

    let filePath = path.join(DEMO_DIR, requestPath);

    const ext = path.extname(filePath);
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    fs.readFile(filePath, (err, data) => {
        if (err) {
            console.log(`[demo-server] 404: ${req.url} -> ${filePath}`);
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
    console.log(`  - Calendar: http://localhost:${PORT}/calendar/index.html`);
});

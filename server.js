const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

// Import the database module
const { initDB } = require('./lib/db');

// Initialize database on startup
initDB().catch(err => console.error('DB init error:', err));

const PORT = process.env.PORT || 3000;

// Helper to parse request body
const parseBody = (req) => {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', chunk => { data += chunk; });
    req.on('end', () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch (e) {
        resolve({});
      }
    });
    req.on('error', reject);
  });
};

// Dynamic API router
const apiRoutes = {
  '/api/init': require('./api/init.js'),
  '/api/auth/login': require('./api/auth/login.js'),
  '/api/auth/register': require('./api/auth/register.js'),
  '/api/dashboard': require('./api/dashboard.js'),
  '/api/farmers': require('./api/farmers/index.js'),
  '/api/farmers/[id]': require('./api/farmers/[id].js'),
  '/api/bills': require('./api/bills/index.js'),
  '/api/bills/[id]': require('./api/bills/[id].js'),
  '/api/bills/verify': require('./api/bills/verify.js'),
  '/api/payments': require('./api/payments/index.js'),
  '/api/requests': require('./api/requests/index.js'),
  '/api/requests/[id]': require('./api/requests/[id].js'),
};

const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;
  const query = parsedUrl.query;

  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // Check if it's an API route
  if (pathname.startsWith('/api/')) {
    // First try exact match
    let apiHandler = apiRoutes[pathname];
    
    if (apiHandler) {
      // Parse request body
      req.body = await parseBody(req);
      req.query = query;
      
      try {
        // Provide response helpers like Vercel
        res.status = function(code) { this.statusCode = code; return this; };
        res.json = function(data) { this.end(JSON.stringify(data)); };
        
        await apiHandler(req, res);
      } catch (err) {
        console.error('API error:', err);
        if (!res.headersSent) {
          res.statusCode = 500;
          res.end(JSON.stringify({ error: err.message }));
        }
      }
    } else {
      // Try to match dynamic routes like /api/farmers/123, /api/bills/456, etc
      let handled = false;
      
      // Try to match against dynamic route patterns
      const pathParts = pathname.split('/').filter(p => p);
      
      // Check for routes with [id] pattern
      for (const [route, handler] of Object.entries(apiRoutes)) {
        if (route.includes('[id]')) {
          const routeParts = route.split('/').filter(p => p);
          
          // Check if path matches pattern
          if (pathParts.length === routeParts.length) {
            let matches = true;
            for (let i = 0; i < routeParts.length; i++) {
              if (routeParts[i] !== '[id]' && routeParts[i] !== pathParts[i]) {
                matches = false;
                break;
              }
            }
            
            if (matches) {
              req.body = await parseBody(req);
              req.query = query;
              // Add id from the path
              const idIndex = routeParts.indexOf('[id]');
              req.query.id = pathParts[idIndex];
              
              res.status = function(code) { this.statusCode = code; return this; };
              res.json = function(data) { this.end(JSON.stringify(data)); };
              
              try {
                await handler(req, res);
                handled = true;
                break;
              } catch (err) {
                console.error('API error:', err);
                if (!res.headersSent) {
                  res.statusCode = 500;
                  res.end(JSON.stringify({ error: err.message }));
                }
                handled = true;
                break;
              }
            }
          }
        }
      }
      
      if (!handled) {
        res.statusCode = 404;
        res.end(JSON.stringify({ error: 'API endpoint not found' }));
      }
    }
    return;
  }

  // Serve static files
  if (pathname === '/' || pathname === '/index.html') {
    fs.readFile(path.join(__dirname, 'public', 'index.html'), (err, data) => {
      if (err) {
        res.writeHead(404);
        res.end('Not found');
        return;
      }
      res.setHeader('Content-Type', 'text/html');
      res.writeHead(200);
      res.end(data);
    });
    return;
  }

  // Serve other static files
  const filePath = path.join(__dirname, 'public', pathname);
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end(JSON.stringify({ error: 'Not found' }));
      return;
    }
    
    let contentType = 'application/octet-stream';
    if (filePath.endsWith('.html')) contentType = 'text/html';
    else if (filePath.endsWith('.css')) contentType = 'text/css';
    else if (filePath.endsWith('.js')) contentType = 'application/javascript';
    else if (filePath.endsWith('.json')) contentType = 'application/json';

    res.setHeader('Content-Type', contentType);
    res.writeHead(200);
    res.end(data);
  });
});

server.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════╗
║   Shri Krishna Dudh Dairy - Bill Management       ║
║   Server running at http://localhost:${PORT}               ║
║   Press Ctrl+C to stop                             ║
╚════════════════════════════════════════════════════╝
  `);
});

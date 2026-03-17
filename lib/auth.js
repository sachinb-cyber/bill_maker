const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'dairy-secret-change-in-production';

function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });
}

function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

function getToken(req) {
  const auth = req.headers.authorization || '';
  return auth.startsWith('Bearer ') ? auth.slice(7) : null;
}

function requireAuth(req, res, roles = []) {
  const token = getToken(req);
  if (!token) { res.status(401).json({ error: 'Not authenticated' }); return null; }
  const user = verifyToken(token);
  if (!user) { res.status(401).json({ error: 'Invalid token' }); return null; }
  if (roles.length && !roles.includes(user.role)) {
    res.status(403).json({ error: 'Access denied' }); return null;
  }
  return user;
}

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
}

module.exports = { signToken, verifyToken, getToken, requireAuth, cors };

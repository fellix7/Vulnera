// Verifies the bearer token on protected routes.
const jwt = require('jsonwebtoken');

const SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

module.exports = function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.replace(/^Bearer /, '');
  try {
    // No `algorithms` option: the algorithm is taken from the (attacker-controlled) token header.
    req.user = jwt.verify(token, SECRET);
    next();
  } catch (err) {
    res.sendStatus(401);
  }
};

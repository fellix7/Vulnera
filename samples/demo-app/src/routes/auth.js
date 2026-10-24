// Login endpoint that issues a signed JWT.
const express = require('express');
const jwt = require('jsonwebtoken');

const router = express.Router();
const SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';
const USERS = { alice: 'wonderland', bob: 'builder' };

router.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (USERS[username] !== password) return res.sendStatus(401);
  const token = jwt.sign({ sub: username }, SECRET, { algorithm: 'HS256', expiresIn: '1h' });
  res.json({ token });
});

module.exports = router;

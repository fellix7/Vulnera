// CRUD routes for notes, stored in memory for the demo.
const express = require('express');
const requireAuth = require('../middleware/auth');
const { paginate } = require('../utils/list');

const router = express.Router();
const notes = [];
let nextId = 1;

router.use(requireAuth);

router.get('/', (req, res) => {
  const pages = paginate(notes, 10);
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  // Only server-built values are passed to the template (no raw query string).
  res.render('notes', { pages: pages[page - 1] || [], page, total: pages.length });
});

router.post('/', (req, res) => {
  const note = { id: nextId++, title: String(req.body.title || ''), body: String(req.body.body || ''), owner: req.user.sub };
  notes.push(note);
  res.redirect('/notes');
});

router.delete('/:id', (req, res) => {
  const idx = notes.findIndex((n) => n.id === Number(req.params.id) && n.owner === req.user.sub);
  if (idx === -1) return res.sendStatus(404);
  notes.splice(idx, 1);
  res.sendStatus(204);
});

module.exports = router;

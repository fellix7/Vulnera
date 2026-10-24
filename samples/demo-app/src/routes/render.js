// "Custom note template" feature: users write a lodash template for how their note is exported.
const express = require('express');
const _ = require('lodash');
const requireAuth = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

router.post('/export', (req, res) => {
  const note = { title: req.body.title, body: req.body.body };
  // The template string is supplied by the user in the request body.
  const compiled = _.template(req.body.template);
  res.type('text/plain').send(compiled({ note }));
});

// Settings page: renders a view and forwards the query string as render options.
router.get('/settings', (req, res) => {
  res.render('settings', { ...req.query, user: req.user });
});

module.exports = router;

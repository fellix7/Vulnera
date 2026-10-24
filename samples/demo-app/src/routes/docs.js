// Serves the project's own help page, written by the QuickNotes team and shipped in the repo.
const fs = require('fs');
const path = require('path');
const express = require('express');
const marked = require('marked');

const router = express.Router();
const helpHtml = marked(fs.readFileSync(path.join(__dirname, '..', 'help.md'), 'utf8'));

router.get('/', (req, res) => {
  res.send(helpHtml);
});

module.exports = router;

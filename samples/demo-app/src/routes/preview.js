// Link preview: fetches the title of a page the user pasted into a note.
const express = require('express');
const axios = require('axios');

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    // `url` is fully user-controlled (could be http://169.254.169.254/ or an internal host).
    const response = await axios.get(req.query.url, { timeout: 5000 });
    const match = /<title>([^<]*)<\/title>/i.exec(response.data);
    res.json({ title: match ? match[1] : null });
  } catch (err) {
    res.status(502).json({ error: 'could not fetch preview' });
  }
});

module.exports = router;

// QuickNotes: entry point.
const path = require('path');
const express = require('express');
const minimist = require('minimist');

const notesRouter = require('./routes/notes');
const renderRouter = require('./routes/render');
const previewRouter = require('./routes/preview');
const authRouter = require('./routes/auth');
const docsRouter = require('./routes/docs');

// Port and data directory come from our own start script (e.g. `node src/server.js --port 8080`).
const argv = minimist(process.argv.slice(2), { default: { port: 3000, data: './data' } });

const app = express();
app.engine('ejs', require('ejs').__express);
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/auth', authRouter);
app.use('/notes', notesRouter);
app.use('/render', renderRouter);
app.use('/preview', previewRouter);
app.use('/docs', docsRouter);

app.get('/', (req, res) => res.redirect('/notes'));

app.listen(argv.port, () => {
  console.log(`QuickNotes listening on :${argv.port} (data dir: ${argv.data})`);
});

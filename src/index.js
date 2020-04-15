const express = require('express');
const uuid = require('uuid');
const session = require('express-session');
const addAllRoutes = require('./routes');
const FileStore = require('session-file-store')(session);

// create the server
const app = express();

// add & configure middleware
app.use(session({
  genid: (req) => {
    console.log('Inside the session middleware')
    console.log(req.sessionID)
    return uuid.v4() // use UUIDs for session IDs
  },
  store: new FileStore(),
  secret: 'keyboard cat',
  resave: false,
  saveUninitialized: true
}))

// create the homepage route at '/'
app.get('/', (req, res) => {
  console.log('Inside the homepage callback function')
  console.log(req.sessionID)
  console.log('req.session: ', req.session);
  // req.session is where you store any info you want
  if (req.session.views) {
    req.session.views++;
  } else {
      req.session.views = 1;
  }
  res.send(`You hit home page!\n`)
})

addAllRoutes(app);

/* start the app */
const port = process.env.PORT || 4321;
const host = '0.0.0.0';
app.listen(port, host, () => {
  console.log(`http://localhost:${port}`);
});

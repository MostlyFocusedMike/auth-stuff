//npm modules
const express = require('express');
const uuid = require('uuid');
const session = require('express-session')
const addAllRoutes = require('./routes');

// create the server
const app = express();

// add & configure middleware
app.use(session({
  genid: (req) => {
    console.log('--------------------------------------: ');
    console.log('Inside the session middleware')
    console.log('middleware sessionID', req.sessionID)
    return uuid.v4() // use UUIDs for session IDs
  },
  secret: 'keyboard cat',
  resave: false,
  saveUninitialized: true
}))

// create the homepage route at '/'
app.get('/', (req, res) => {
  console.log('Inside the homepage callback function')
  console.log('sessionId on home:', req.sessionID)
  console.log('--------------------------------------:\n');
  res.send(`You hit home page!\n`)
})

app.get('/goofin', (req, res) => {
    req.cookie('test', { httpOnly: true });
    console.log(req.cookie.test);
})

addAllRoutes(app);

/* start the app */
const port = process.env.PORT || 4321;
const host = '0.0.0.0';
app.listen(port, host, () => {
  console.log(`http://localhost:${port}`);
});

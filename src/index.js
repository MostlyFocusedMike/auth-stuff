const express = require('express');
const uuid = require('uuid');
const session = require('express-session');
const addAllRoutes = require('./routes');
const FileStore = require('session-file-store')(session);
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const fetch = require('node-fetch');

// configure passport.js to use the local strategy
passport.use(new LocalStrategy(
    // the first arg is pulling in the data from the POST request, and then sends it in as the first argument
    // of the auth callback
    // if it can't find the field, the whole thing never runs and the user is not authenticated
    { usernameField: 'email' },
    async (email, password, done) => {
        console.log('email: ', email);
        const dbUser = await fetch(`http://localhost:5000/users?email=${email}`).then(r => r.json())
        const user = dbUser[0] || {};
        console.log('user: ', user);
        console.log('Inside local strategy callback')
        if (email === user.email && password === user.password) {
            console.log('Local strategy returned true')
            return done(null, user)
        } else {
            console.log('bad boi: ', );
            return done(null, false, {message: "bad creds"});
        }
    }
));

// tell passport how to serialize the user
passport.serializeUser((user, done) => {
    console.log('Inside serializeUser callback. User id is save to the session file store here')
    done(null, user.id);
});

// Inside deserializeUser callback
// this function takes the session id (which is the user id) and decrypts it so the app has the user
passport.deserializeUser((id, done) => {
    console.log('in deserialize: ', );
    fetch(`http://localhost:5000/users/${id}`)
        .then(r => r.json())
        .then(user => done(null, user))
        .catch(error => done(error, false))
});

// create the server
const app = express();
app.use(express.json());

// add & configure middleware
app.use(session({
  genid: (req) => {
    console.log('Inside the session middleware')
    console.log('middle ware session id:', req.sessionID)
    return uuid.v4() // use UUIDs for session IDs
  },
  store: new FileStore(),
  secret: 'keyboard cat', // should be env var
  resave: false,
  saveUninitialized: true
}))

app.use(passport.initialize());
// it's important that express-session comes first
app.use(passport.session());

// create the homepage route at '/'
app.get('/', (req, res) => {
  // req.session is where you store any info you want
  if (req.session.views) {
    req.session.views++;
  } else {
      req.session.views = 1;
  }
  res.send(`You hit home page!\n`)
})

app.get('/login', (req, res) => {
    console.log('Inside GET /login callback function')
    console.log('req.sessionID', req.sessionID)
    res.send(`You got the login page!\n`)
})


app.post('/login', (req, res, next) => {
    console.log('Inside POST /login callback')

    const authFunc = (err, user, info) => {
        console.log('Inside passport.authenticate() callback');
        console.log(`req.session.passport: ${JSON.stringify(req.session.passport)}`)
        console.log(`req.user outside: ${JSON.stringify(user)}`)
        // req.login is added by passport
        console.log('err: ', err);
        if (err) { return next(err); }
        if (!user) {
            return res.redirect('/login');
        }
        req.logIn(user, (err) => {
            console.log(`req.session.passport: ${JSON.stringify(req.session.passport)}`)
            return res.send('You were authenticated & logged in!\n');
        })
    }

    passport.authenticate('local', authFunc)(req, res, next);
})

app.get('/authrequired', (req, res) => {
    console.log(`User authenticated? ${req.isAuthenticated()}`)
    if(req.isAuthenticated()) {
        res.send('you hit the authentication endpoint\n')
    } else {
        res.redirect('/')
    }
})

addAllRoutes(app);

/* start the app */
const port = process.env.PORT || 3000;
const host = '0.0.0.0';
app.listen(port, host, () => {
  console.log(`http://localhost:${port}`);
});

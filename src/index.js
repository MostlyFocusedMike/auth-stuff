const express = require('express');
const uuid = require('uuid');
const session = require('express-session');
const addAllRoutes = require('./routes');
const FileStore = require('session-file-store')(session);
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const fetch = require('node-fetch');
const bcrypt = require('bcrypt');
const flash = require('connect-flash'); // literally just to grab the passport error message, v dumb.
// https://medium.com/@evangow/server-authentication-basics-express-sessions-passport-and-curl-359b7456003d

// configure passport.js to use the local strategy
passport.use(new LocalStrategy(
    // the first arg is pulling in the data from the POST request,
    //  and then sends it in as the first argument of the auth callback
    // if it can't find the field, the whole thing never runs and the user is not authenticated
    { usernameField: 'email' },
    async (email, password, done) => {
        console.log('email: ', email);
        const dbUser = await fetch(`http://localhost:5000/users?email=${email}`).then(r => r.json())
        const user = dbUser[0] || {};
        if (!user.email) return done(null, false, { message: 'Uh oh, invalid credentials.\n' }); // this will show up in req.flash('error')
        if (await bcrypt.compare(password, user.password)) {
            return done(null, user);
        }
        return done(null, false, { message: 'Invalid credentials.\n' });
    }
));

// pass port just takes the user
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
app.use(flash());

// add & configure middleware

const Session = session({
    genid: (req) => {
      console.log('Inside the session middleware')
      console.log('middle ware session id:', req.sessionID)
      return uuid.v4() // use UUIDs for session IDs
    },
    store: new FileStore(),
    secret: 'keyboard cat', // should be env var
    resave: false,
    saveUninitialized: true
  })
app.use(Session)

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
    const error = req.flash('error')[0] // seemd flash can only be called once so store it
    if (error) return res.send(error);
    res.send(`You got the login page!\n`)
})

// if you only need to do redirects, use this format
app.post('/login', (req, res, next) => {
    console.log('in the login ');
    passport.authenticate(
        'local',
        { successRedirect: '/auth-required', failureRedirect: '/login' },
    )(req, res, next);
});


app.post('/sign-up', async (req, res, next) => {
    const {email, password} = req.body
    console.log('req.body: ', req.body);
    if (password && email) {
        const passwordDigest = await bcrypt.hash(password, 8);
        await fetch(`http://localhost:5000/users`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email,
                password: passwordDigest,
            })
        }).then(r => r.json())
        return passport.authenticate(
            'local',
            {
                successRedirect: '/auth-required',
                failureRedirect: '/login',
                failureFlash: true,
            },
        )(req, res, next);
    }
    res.send('Please enter an email and password')
});

// you can also use a custom function
app.post('/custom-login', (req, res, next) => {
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
            return res.json({msg: `user: ${JSON.stringify(user)} was logged in`});
        })
    }

    passport.authenticate('local', authFunc)(req, res, next);
})

app.get('/auth-required', (req, res) => {
    console.log('in /auth required: ');
    console.log('req.session: ', req.session);
    console.log(`User authenticated? ${req.isAuthenticated()}`)
    if(req.isAuthenticated()) {
        res.send('you hit the authentication endpoint\n')
    } else {
        res.redirect('/')
    }
})

app.get('/logout', function(req, res){
    req.logout();
    res.redirect('/');
});

addAllRoutes(app);

/* start the app */
const port = process.env.PORT || 3000;
const host = '0.0.0.0';
app.listen(port, host, () => {
  console.log(`http://localhost:${port}`);
});

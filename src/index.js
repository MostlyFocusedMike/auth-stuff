const express = require('express');
const uuid = require('uuid');
const session = require('express-session');
const FileStore = require('session-file-store')(session);
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const fetch = require('node-fetch');
const bcrypt = require('bcrypt');
const flash = require('connect-flash'); // literally just to grab the passport error message, v dumb.
// https://medium.com/@evangow/server-authentication-basics-express-sessions-passport-and-curl-359b7456003d


/* Part 1: SETTING UP PASSPORT ***************************************************************************/
// configure passport.js to use the local strategy

/*
http://www.passportjs.org/docs/configure/
1:  the verify callback is pulling in the data from the POST request, and passing in the
    'usernameField', and 'password' properties from the data, along with the done() function
    if it can't find the field, the whole thing never runs and the user is not authenticated
    If an object is passed in before the verify callback, that let's you set alias names for
    properties. Here we're telling it that the required "usernameField" is set to email.
    We aren't touching the default "password" property

2:  The "Verify callback" this actually determines whether the user gets authenticated
3:  The logic of this callback is anything, here we're using node-fetch to grab from our
    fake DB powered by json server.
*/
passport.use(new LocalStrategy(
    { usernameField: 'email' }, // 1
    async (email, password, done) => { // 2
        const dbUser = await fetch(`http://localhost:5000/users?email=${email}`).then(r => r.json()); // 3
        const user = dbUser[0] || {};
        const passwordsDoMatch = await bcrypt.compare(password, user.password);
        if (user.email && passwordsDoMatch) return done(null, user); // 5
        return done(null, false, { message: 'Invalid credentials.\n' }); // 4b
    }
));

/*
    Unlike something like express-cookie, express-session does not save anything except the

    It takes that user object and whatever you pass into the done() as the second arg will be
    saved into session.passport.user, but no matter what it will save the whole user object into
    req.user. Typically, to keep sessions small, you just save the user's id into the session
*/
passport.serializeUser((user, done) => {
    console.log('Inside serialize user method');
    done(null, user);
});

// Inside deserializeUser callback
// this function takes the session.user value and allows you to use it to find the full user object
// Remember, in our serialize function, we just passed in the user's id, so that's what we have access
// to in the cookie
passport.deserializeUser((id, done) => {
    console.log('in deserialize: ');
    console.log('id: ', id);
    fetch(`http://localhost:5000/users/${id}`)
        .then(r => r.json())
        .then(user => done(null, user))
        .catch(error => done(error, false));
});





// create the server
const app = express();
// add & configure middleware
app.use(express.json());
app.use(flash());

app.use(session({
    genid: (req) => {
        console.log('Inside the session middleware');
        console.log('middle ware session id:', req.sessionID);
        return uuid.v4(); // use UUIDs for session IDs
    },
    store: new FileStore(),
    secret: 'keyboard cat', // should be env var
    resave: false,
    saveUninitialized: true
}));

app.use(passport.initialize());
// it's important that express-session comes first
app.use(passport.session());

/* ADD THE ACTUAL ROUTES */

// home route, just showing examples of manipulating session value
app.get('/', (req, res) => {
    // req.session is where you store any info you want
    if (req.session.views) {
        req.session.views++;
    } else {
        req.session.views = 1;
    }
    res.send(`You hit home page!\n`);
});


// The GET login route would be a view normally, here it just shows the
// flash value. Which for some reason takes a whole package to use
// this is where the passport failed auth messages show up
app.get('/login', (req, res) => {
    console.log('Inside GET /login callback function');
    console.log('req.sessionID', req.sessionID);
    const error = req.flash('error')[0]; // seemd flash can only be called once so store it
    if (error) return res.send(error);
    res.send(`You got the login page!\n`);
});


/* LOGGING IN THE USER *****************************************************************************/
// if you only need to do redirects, use the built in passport.authenticate
app.post('/login', (req, res, next) => {
    console.log('Inside POST /login callback');
    passport.authenticate(
        'local',
        { successRedirect: '/auth-required', failureRedirect: '/login' },
    )(req, res, next);
});
// You could also just plug in the passport callback itself
// app.post('/login', passport.authenticate(
//     'local',
//     { successRedirect: '/auth-required', failureRedirect: '/login' },
// ));

// if you don't want redirects and want a custom function, you can add your own like this
// notice that you have to use req.logIn to do your custom logic
app.post('/custom-login', (req, res, next) => {
    console.log('Inside POST /custom-login');

    const authFunc = (err, user, info) => {
        console.log('Inside passport.authenticate() callback');
        console.log(`req.session.passport: ${JSON.stringify(req.session.passport)}`);
        console.log(`req.user outside: ${JSON.stringify(user)}`);
        if (err) { return next(err); } // not really the elegant way to handle this
        if (!user) return res.redirect('/login');
        req.logIn(user, (err) => {
            console.log(`req.session.passport: ${JSON.stringify(req.session.passport)}`);
            return res.json({msg: `user: ${JSON.stringify(user)} was logged in`});
        });
    };
    passport.authenticate('local', authFunc)(req, res, next);
});

app.post('/sign-up', async (req, res, next) => {
    console.log('Inside POST /sign-up');
    const {email, password} = req.body;
    if (password && email) {
        const hashedAndSaltedPassword = await bcrypt.hash(password, 8);
        const body = JSON.stringify({ email, password: hashedAndSaltedPassword });
        await fetch(`http://localhost:5000/users`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body
        }).then(r => r.json());
        return passport.authenticate(
            'local',
            {
                successRedirect: '/auth-required',
                failureRedirect: '/login',
                failureFlash: true,
            },
        )(req, res, next);
    }
    res.send('Please enter an email and password');
});

const authenticatedMiddleware = (req, res, next) => {
    if(req.isAuthenticated()) {
        console.log('User is authenticated');
        next();
    } else {
        res.redirect('/login');
    }
};

app.get('/auth-required', authenticatedMiddleware, (req, res) => {
    console.log('in /auth-required: ');
    console.log('req.session: ', req.session);
    console.log('req.user: ', req.user);
    console.log('req.session.passport: ', req.session.passport);
    console.log(`User authenticated? ${req.isAuthenticated()}`);
    res.send('Welcome to the auth-required route');
});

// even if you're authenticated, are you authorized to see the page?
app.get('/auth-required/:userId', authenticatedMiddleware, (req, res) => {
    console.log('In /auth/user');
    console.log(`User authenticated? ${req.user.email}`);
    res.send('Welcome to the auth-required route');
});

// logs out the user by clearing the session and deleting the cookie
app.delete('/logout', (req, res) => {
    req.logout();
    res.redirect('/');
});

/* start the app */
const port = process.env.PORT || 3000;
const host = '0.0.0.0';
app.listen(port, host, () => {
    console.log(`http://localhost:${port}`);
});

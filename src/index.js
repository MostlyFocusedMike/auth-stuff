const express = require('express');
const uuid = require('uuid');
const session = require('express-session');
const FileStore = require('session-file-store')(session);
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const fetch = require('node-fetch');
const bcrypt = require('bcrypt');
const flash = require('connect-flash');

passport.use(new LocalStrategy(
    { usernameField: 'email' }, // 1 // username check
    async (email, password, done) => { // 2
        const dbUser = await fetch(`http://0.0.0.0:5000/users?email=${email}`).then(r => r.json()); // 3
        const user = dbUser[0] || {};
        const passwordsDoMatch = await bcrypt.compare(password, user.password);
        if (user.email && passwordsDoMatch) return done(null, user); // 4
        return done(null, false, { message: 'Invalid credentials.\n' }); // 5
    },
));

passport.serializeUser((user, done) => {
    console.log('Inside serialize user method');
    done(null, user.id);
});

passport.deserializeUser((userId, done) => {
    console.log('in deserialize: ');
    console.log('userId: ', userId);
    fetch(`http://0.0.0.0:5000/users/${userId}`)
        .then(r => r.json())
        .then(user => done(null, user))
        .catch(error => done(error, false));
});


const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.set('etag', false);
app.use((req, res, next) => {
    res.set('Cache-Control', 'no-store');
    next();
});

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
    saveUninitialized: true,
}));

app.use(passport.initialize());
app.use(passport.session());

app.get('/', (req, res) => {
    if (req.session.views) {
        req.session.views++;
    } else {
        req.session.views = 1;
    }
    res.send(`
        <h1>You hit home page!</h1>
        <a href="/sign-up">Sign up!</a>
        <a href="/log-in">Log in!</a>
    `);
});

app.post('/log-in', (req, res, next) => {
    console.log('Inside POST /log-in callback');
    passport.authenticate(
        'local',
        {
            successRedirect: '/auth-required',
            failureRedirect: '/log-in',
            failureFlash: true,
        },
    )(req, res, next);
});

app.get('/log-in', (req, res) => {
    console.log('Inside GET /log-in callback function');
    console.log('req.sessionID', req.sessionID);
    if (req.isAuthenticated()) return res.redirect('/auth-required');
    console.log('req.body: ', req.body);
    const error = req.flash('error')[0]; // seems flash can only be called once so store it
    res.send(`
    <h1>Log in</h1>
    <form method="POST" action="/log-in">
        <p style="color: red;">${error ? `Login error: ${error}`: ''}</p>
        <label for="email">Email:</label>
        <input type="text" id="email" name="email"/>
        <label for="password">Password:</label>
        <input type="password" id="password" name="password" />
        <button>Submit</button>
    </form>
    `);
});

app.post('/custom-login', (req, res, next) => {
    console.log('Inside POST /custom-login');

    const authFunc = (err, user, info) => {
        console.log('Inside passport.authenticate() callback');
        console.log(`req.session.passport: ${JSON.stringify(req.session.passport)}`);
        console.log(`req.user outside: ${JSON.stringify(user)}`);
        if (err) { return next(err); } // not really the elegant way to handle this
        if (!user) return res.redirect('/log-in');
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
    console.log('req.body: ', req.body);
    if (!password || !email) res.send('Please enter an email and password');

    const hashedAndSaltedPassword = await bcrypt.hash(password, 8);
    const body = JSON.stringify({ email, password: hashedAndSaltedPassword });
    const options = { method: 'POST', headers: { 'Content-Type': 'application/json' }, body };
    await fetch(`http://0.0.0.0:5000/users`, options).then(r => r.json());

    return passport.authenticate(
        'local',
        {
            successRedirect: '/auth-required',
            failureRedirect: '/log-in',
            failureFlash: true,
        },
    )(req, res, next);
});

app.get('/sign-up', async (req, res, next) => {
    console.log('Inside GET /sign-up');
    if (req.isAuthenticated()) return res.redirect('/auth-required');
    return res.send(`
    <h1>Sign Up!</h1>
    <form method="POST" action="/sign-up">
        <label for="email">Email:</label>
        <input type="text" id="email" name="email"/>
        <label for="password">Password:</label>
        <input type="password" id="password" name="password" />
        <button>Submit</button>
    </form>
    `);
});

const checkIfAuthenticatedMiddleware = (req, res, next) => {
    if(req.isAuthenticated()) {
        console.log('User is authenticated');
        next();
    } else {
        res.redirect('/log-in');
    }
};

app.get('/auth-required', checkIfAuthenticatedMiddleware, (req, res) => {
    console.log('in /auth-required: ');
    const sessionData = JSON.stringify({
        reqSession: req.session,
        reqUser: req.user,
        passport: req.session.passport,
        isUserAuthenticated: req.isAuthenticated(),
    }, null, 2);

    res.send(`
    <h1>You're in!</h1>
    <pre>${sessionData}</pre>
    <form method="POST" action="/logout">
        <button>Logout</button>
    </form>
    `);
});

app.post('/logout', (req, res) => {
    req.logout();
    res.redirect('/');
});

const port = process.env.PORT || 3000;
const host = '0.0.0.0';
app.listen(port, host, () => {
    console.log(`http://0.0.0.0:${port}`);
});

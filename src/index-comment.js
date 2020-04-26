// original article this is from
// https://medium.com/@evangow/server-authentication-basics-express-sessions-passport-and-curl-359b7456003d

const express = require('express');
const uuid = require('uuid');
const session = require('express-session');
const FileStore = require('session-file-store')(session);
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const fetch = require('node-fetch');
const bcrypt = require('bcrypt');
const flash = require('connect-flash');

/* Part 1: SETTING UP PASSPORT ***************************************************************************/
/*
Passport uses things called "strategies" to authenticate users. Here we are using a very basic strategy
called 'local.' It requires that a request submits certain shaped data so it can pull a username and password.
These values get passed into its callback and it ultimately returns a user object with a done() function.
However, in the real world you should opt to swap in a more robust strategy, like an OAuth one through
google or twitter.

http://www.passportjs.org/docs/configure/
The numbers correspond to the comments in the code
1:  the verify callback is going to  pull in the data from the POST request, the
    'usernameField', and 'password' properties.
    if it can't find the field, the whole thing never runs and the user is not authenticated.
    However, If an object is passed in before the verify callback, that lets you set alias
    names for properties. Here we're telling it that the required "usernameField" is set to email.
    We aren't touching the default "password" property.

2:  The "Verify callback" this actually determines whether the user gets authenticated

3:  The logic of this callback is anything, here we're using node-fetch to grab from our
    fake DB powered by json server. In real life, you would not need to use fetch, since
    your DB would have access to your models. I just wanted to use json-server to get real
    DB interactions (GET and POST) without having to add real schemas and pg

4:  If the user is correct, determine this however you want, then we call the done function
    with the user object as the second argument. This object is then available to our serialize
    function so we can save data to our session store

5:  If the user is not authenticated, we need to pass in false, and then we have the option of
    including a {message } which will get picked up and displayed if we installed the flash
    package. Here we did, and you can see it in action when we have passport use this strategy
*/
passport.use(new LocalStrategy(
    { usernameField: 'email' }, // 1 // userma check
    async (email, password, done) => { // 2
        const dbUser = await fetch(`http://localhost:5000/users?email=${email}`).then(r => r.json()); // 3
        const user = dbUser[0] || {};
        const passwordsDoMatch = await bcrypt.compare(password, user.password);
        if (user.email && passwordsDoMatch) return done(null, user); // 4
        return done(null, false, { message: 'Invalid credentials.\n' }); // 5
    },
));

/*
    What's a session?
    Unlike express-cookie, express-session does not save anything except the session id on the front end
    cookie. It then uses that as a key on the server to find the actual session data. In this little tutorial
    we are just saving the session data in a file with the session-file-store package, but in real life you
    would want to check the docs for a more robust pacakge that uses a pg or redis database to store session data
*/

// SERIALIZING AND DESERIALIZING
/*
    When a user first logs in, the serializeUser function is designed to give you access to the user
    object you just authenticated and store what you want in the session.

    Whatever you pass into done() as the second arg will be saved into session.passport.user,
    but no matter what it will save the whole user object into req.user.
    Typically, to keep sessions small, you just save the user's id into the session
*/
passport.serializeUser((user, done) => {
    console.log('Inside serialize user method');
    done(null, user.id);
});
/*
    The deserializeUser callback is for every time after the initial login.
    This function takes the session.user value and allows you to use it to find the full user object
    Remember, in our serialize function above, we just passed in the user's id,
    so that's what we have access to. Again, we're using the fake DB with fetch, but in real life
    you would just have your models
*/
passport.deserializeUser((userId, done) => {
    console.log('in deserialize: ');
    console.log('userId: ', userId);
    fetch(`http://localhost:5000/users/${userId}`)
        .then(r => r.json())
        .then(user => done(null, user))
        .catch(error => done(error, false));
});



/* CREATE THE SERVER *********************************************************************/
const app = express();
// add & configure middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// disable cache since it's dev https://stackoverflow.com/questions/22632593/how-to-disable-webpage-caching-in-expressjs-nodejs
app.set('etag', false);
app.use((req, res, next) => {
    res.set('Cache-Control', 'no-store');
    next();
});

// for passport user errors
app.use(flash());

// Register the session data for your app. This is primarily responsible for
// generating the id's of the session with genid(), and configuring settings,
// like the cookie secret and what filestore to use. Also, Passport.session
// expects this to come first
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

// register the initialized passport
app.use(passport.initialize());
// it's important that express-session was already redigstered
app.use(passport.session());

/* ADD THE ACTUAL ROUTES ****************************************************************************/

// home route, just showing examples of manipulating session value
app.get('/', (req, res) => {
    // req.session is where you store any info you want
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

/* LOGGING IN THE USER *****************************************************************************/
/*
    Here is our first use of our strategy. We are just plugging in it's string name into
    passport.authenticate. if you only need to do redirects, this syntax below is fine.
    Notice here is where you have to enable the flash message, but you don't have to.

*/
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
// You could also just plug in the passport callback itself if you are doing nothing else
// app.post('/log-in', passport.authenticate(
//     'local',
//     { successRedirect: '/auth-required', failureRedirect: '/log-in', failureFlash: true },
// ));

/*
    The failure messages from the local strategy will show up in
    an array stored in the key of 'error'
*/
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

/*
    If you don't want just redirects and want a custom function, you can add your own like this.
    Notice that you have to use req.logIn to do your custom logic. This might be useful later
    when you aren't using server side routing, and just want a message returned to the frontend
    on successful auth
*/
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

/*
    Here we actually create a user in our db from them signing up. This logic is whatever
    you want it to be. I am authenticating and mirroring the login, but you dnt have to
*/
app.post('/sign-up', async (req, res, next) => {
    console.log('Inside POST /sign-up');
    const {email, password} = req.body;
    console.log('req.body: ', req.body);
    if (!password || !email) res.send('Please enter an email and password');

    const hashedAndSaltedPassword = await bcrypt.hash(password, 8);
    const body = JSON.stringify({ email, password: hashedAndSaltedPassword });
    const options = { method: 'POST', headers: { 'Content-Type': 'application/json' }, body };
    await fetch(`http://localhost:5000/users`, options).then(r => r.json());

    return passport.authenticate(
        'local',
        {
            successRedirect: '/auth-required',
            failureRedirect: '/log-in',
            failureFlash: true,
        },
    )(req, res, next);
});

// just the sign up form
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

// In real life, you'd likely have a lot more routes that you'd want behind auth
// So it's helpful to build a little middleware that you can plug in on
// a route (like below) or a full router
const checkIfAuthenticatedMiddleware = (req, res, next) => {
    if(req.isAuthenticated()) {
        console.log('User is authenticated');
        next();
    } else {
        res.redirect('/log-in');
    }
};

// Using the authenticated middleware, only logged in users can see
// this page. For demosnstration purposes, it'll return some data
// remember we just added the views property for fun as a test
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

// logs out the user by clearing the session and deleting the cookie
app.post('/logout', (req, res) => {
    req.logout();
    res.redirect('/');
});

/* start the app */
const port = process.env.PORT || 3000;
const host = '0.0.0.0';
app.listen(port, host, () => {
    console.log(`http://localhost:${port}`);
});

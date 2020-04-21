# Passport, please
## Let's learn how to use the Node's most popular Auth package

In this repo I've more or less followed along with [this great medium article](https://medium.com/@evangow/server-authentication-basics-express-sessions-passport-and-curl-359b7456003d). The main difference is that I've swapped out some packages and changed some minor logic. But for the most part, if you read the article and check out the code and comments, you should get a pretty good idea how to get started with Passport and sessions.

## Using this repo
There isn't a front end, in the blog the author spends a lot of time explaining how the `curl` command works, but I would honestly recommend using something like [Postman](https://www.postman.com/) becuase it will save your cookies like a browser.

 To get started:
```bash
npm install
npm start
# Then, in another console start your JSON server
npm run fake-db
```
We're starting our node server in one terminal session, and then starting our json server in another. The node server is on port 3000 and the json server is on port 5000.

## Ah jeez, what's a JSON server?
Basically, nothing really. It's just a helpful package that let's you spin up a RESTful server in seconds. This will let you actually save and retrieve info without the hassle of setting up a db yourself. If you want a quick tutorial, I've written a blog post on it: [Using JSON Server to Create a Restful Server in 5 seconds](https://itnext.io/using-json-server-to-create-a-restful-server-in-5-seconds-78b85ccf832b?source=friends_link&sk=47ae52ec50bacc55fd130d9e1f57e429)

# Technology used
Here is where you can find more info on each of the main technologies used
- [Passport JS](http://www.passportjs.org/docs/authenticate/)
  - The docs for Passport
- [passport-local](http://www.passportjs.org/packages/passport-local/)
  - Passport relies on subpackages to define its authentication methods. For this project we'll use the passport-local package, which only needs a username and password.
- [express-session](https://www.npmjs.com/package/express-session)
  - An express session cookie manager
- [session-file-store"](https://www.npmjs.com/package/session-file-store)
  - A simple file store for your sessions, better for non-production projects
- [connect-flash](https://www.npmjs.com/package/connect-flash)
  - A super tiny package that used to be included by default in Node. All it does is let you grab error messages for some stuff in express. Totally optional, but included here so you can see it work.
- [Bcrypt](https://www.npmjs.com/package/bcrypt)
  - The NPM link for Bcrypt, note that the article uses a different package, node-bcypt
- [Bcrypt hasher](https://www.browserling.com/tools/bcrypt)
    - This is useful for saving the hashed data in your fake db from the getgo
- [uuid](https://www.npmjs.com/package/uuid)
  - This handy little package handles creating Universally Unique Identifiers. Basically an auto gnerated string of text that has never existed before in history. Used here for identifying sessions
- [JSON Server](https://www.npmjs.com/package/json-server)
    - build a RESTful DB in seconds by sticking to conventions and sticking data in a .json file
- [node-fetch](https://www.npmjs.com/package/node-fetch)
  -  It's literally just the browser fetch API that's been ported for use in Node.

# Recomended path
Read through the repo code (it's ludicrously commented) and see how much you can kind of piece together on your own. Then, read through the original blog and see how things flow together. Then, just kind of mess around and change things. Be sure to watch the *order* in which functions are run, and feel free to add more logs to investigate objects.

Also, this project uses a lot of well documented packages, so check those out and flex those doc hunting muscles. And lastly, if I made any typos or mistakes, feel free to issue corrections by making a branch and submitting a Pull Request.

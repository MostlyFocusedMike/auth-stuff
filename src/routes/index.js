/* src/routes/index.js */
// add the routers to an app
const addAllRoutes = (app) => {
    app.use(require('./users'));
};

module.exports = addAllRoutes;
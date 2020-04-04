const path = require('path');
const express = require('express');
const app = express();
const addAllRoutes = require('./routes');
const swaggerUi = require('swagger-ui-express');
const swaggerDocument = require('../swagger.json');

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
app.use((req, res, next) => {
    console.log(`hit: ${req.originalUrl}`);
    next();
});

app.use(express.static(path.join(__dirname, '..', 'public')));

addAllRoutes(app);

/* start the app */
const port = process.env.PORT || 4321;
const host = '0.0.0.0';
app.listen(port, host, () => {
  console.log(`http://localhost:${port}`);
});
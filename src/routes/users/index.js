const express = require('express');
const router = express.Router();

require('./get')(router);
module.exports = router;
// backend-api/src/modules/leave/routes.js

const express = require('express');
const router = express.Router();

// Sample route
router.get('/', (req, res) => {
  res.json({ message: "Leave module working" });
});

module.exports = router;
// routes/auth.js
const express = require('express');
const router = express.Router();
const c = require('../controllers/authController');
const { authenticate } = require('../middleware/authMiddleware');
const { authLimiter } = require('../middleware/rateLimit');

router.post('/login', authLimiter, c.login);
router.post('/register', authLimiter, c.register);
router.post('/forgot-password', authLimiter, c.forgotPassword);
router.post('/reset-password', authLimiter, c.resetPassword);

router.get('/me', authenticate, (req, res) => res.json({ user: req.user }));
router.post('/logout', authenticate, c.logout);

module.exports = router;

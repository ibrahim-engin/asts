const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const { isAuthenticated } = require('../middlewares/isAuth');

// Tüm dashboard rotaları için kimlik doğrulama gerekiyor
router.use(isAuthenticated);

// Ana sayfa dashboard
router.get('/', dashboardController.getHomePage);

// Aile üyesi dashboard
router.get('/:familyMemberId', dashboardController.getMemberDashboard);

module.exports = router;
const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const { isAuthenticated } = require('../middlewares/isAuth');

// Kullanıcı bilgilerini req objesine ekleyen middleware
router.use((req, res, next) => {
    // Session'dan gelen kullanıcı bilgilerini req.user'a aktar
    if (!req.user && req.session.user) {
      req.user = req.session.user;
    }
    
    // Admin bilgilerini kontrol et
    req.isAdmin = !!(req.admin);
    
    next();
  });

// Tüm dashboard rotaları için kimlik doğrulama gerekiyor
router.use(isAuthenticated);

// Ana sayfa dashboard
router.get('/', dashboardController.getHomePage);

// Aile üyesi dashboard
router.get('/:familyMemberId', dashboardController.getMemberDashboard);

module.exports = router;
const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const { isAuthenticated } = require('../middlewares/isAuth');

// Tüm rapor rotaları için kimlik doğrulama gerekiyor
router.use(isAuthenticated);

// Rapor listesi
router.get('/:familyMemberId', reportController.getReportList);

// Yeni rapor oluşturma
router.get('/:familyMemberId/add', reportController.getAddReport);
router.post('/:familyMemberId', reportController.addReport);

// Rapor detayı
router.get('/:familyMemberId/:reportId', reportController.getReportDetail);

// Rapor dışa aktarma
router.get('/:familyMemberId/:reportId/export', reportController.exportReport);

// Rapor silme
router.delete('/:familyMemberId/:reportId', reportController.deleteReport);

module.exports = router;
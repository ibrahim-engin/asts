const express = require('express');
const router = express.Router();
const healthDataController = require('../controllers/healthDataController');
const { isAuthenticated } = require('../middlewares/isAuth');
const { simpleUpload } = require('../middlewares/multer');

// Tüm sağlık verisi rotaları için kimlik doğrulama gerekiyor
router.use(isAuthenticated);

// Sağlık verileri listesi
router.get('/data/:familyMemberId', healthDataController.getHealthDataList);

// Yeni sağlık verisi ekleme
router.get('/data/:familyMemberId/add', healthDataController.getAddHealthData);
router.post('/data/:familyMemberId', healthDataController.addHealthData);

// Sağlık verisi detayı
router.get('/data/:familyMemberId/:healthDataId', healthDataController.getHealthDataDetail);

// Sağlık verisi düzenleme
router.get('/data/:familyMemberId/:healthDataId/edit', healthDataController.getEditHealthData);
router.put('/data/:familyMemberId/:healthDataId', healthDataController.updateHealthData);

// Sağlık verisi silme
router.delete('/data/:familyMemberId/:healthDataId', healthDataController.deleteHealthData);

// Sağlık verisi grafiği
router.get('/data/:familyMemberId/graph/:dataType', healthDataController.getHealthDataGraph);

// Sağlık verisi içe/dışa aktarma
router.get('/data/:familyMemberId/import', healthDataController.getImportHealthData);
router.post('/data/:familyMemberId/import', simpleUpload.single('healthDataFile'), healthDataController.importHealthData);
router.get('/data/:familyMemberId/export', healthDataController.exportHealthData);

module.exports = router;
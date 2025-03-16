const express = require('express');
const router = express.Router();
const physicalActivityController = require('../controllers/physicalActivityController');
const { isAuthenticated } = require('../middlewares/isAuth');
const { simpleUpload } = require('../middlewares/multer');

// Tüm fiziksel aktivite rotaları için kimlik doğrulama gerekiyor
router.use(isAuthenticated);

// Fiziksel aktivite listesi
router.get('/:familyMemberId', physicalActivityController.getActivityList);

// Yeni fiziksel aktivite ekleme
router.get('/:familyMemberId/add', physicalActivityController.getAddActivity);
router.post('/:familyMemberId', simpleUpload.single('activityPhoto'), physicalActivityController.addActivity);

// Fiziksel aktivite detayı
router.get('/:familyMemberId/:activityId', physicalActivityController.getActivityDetail);

// Fiziksel aktivite düzenleme
// router.get('/:familyMemberId/:activityId/edit', physicalActivityController.getEditActivity);
router.put('/:familyMemberId/:activityId', simpleUpload.single('activityPhoto'), physicalActivityController.apiUpdateActivity);

// Fiziksel aktivite silme
router.delete('/:familyMemberId/:activityId', physicalActivityController.deleteActivity);

// Fiziksel aktivite istatistikleri
router.get('/:familyMemberId/stats', physicalActivityController.getActivityStats);

module.exports = router;
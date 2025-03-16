const express = require('express');
const router = express.Router();
const medicationController = require('../controllers/medicationController');
const { isAuthenticated } = require('../middlewares/isAuth');
const { upload } = require('../middlewares/multer');

// Tüm ilaç rotaları için kimlik doğrulama gerekiyor
router.use(isAuthenticated);

// İlaç listesi
router.get('/:familyMemberId', medicationController.getMedicationList);

// Yeni ilaç ekleme
router.get('/:familyMemberId/add', medicationController.getAddMedication);
router.post('/:familyMemberId', medicationController.addMedication);

// İlaç detayı
router.get('/:familyMemberId/:medicationId', medicationController.getMedicationDetail);

// İlaç düzenleme
router.get('/:familyMemberId/:medicationId/edit', medicationController.getEditMedication);
router.put('/:familyMemberId/:medicationId', medicationController.updateMedication);

// İlaç silme
router.delete('/:familyMemberId/:medicationId', medicationController.deleteMedication);

// İlaç durumu güncelleme
router.patch('/:familyMemberId/:medicationId/status', medicationController.updateStatus);

// İlaç envanter güncelleme
router.put('/:familyMemberId/:medicationId/inventory', medicationController.updateInventory);

// İlaç alımı kaydetme
router.post('/:familyMemberId/:medicationId/log', medicationController.logMedicationTaken);

// İlaç programı
router.get('/:familyMemberId/schedule', medicationController.getMedicationSchedule);

module.exports = router;
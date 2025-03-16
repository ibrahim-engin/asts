const express = require('express');
const router = express.Router();
const nutritionController = require('../controllers/nutritionController');
const { isAuthenticated } = require('../middlewares/isAuth');
const { upload } = require('../middlewares/multer');

// Tüm beslenme rotaları için kimlik doğrulama gerekiyor
router.use(isAuthenticated);

// Beslenme verileri listesi
router.get('/:familyMemberId', nutritionController.getNutritionList);

// Yeni beslenme verisi ekleme
router.get('/:familyMemberId/add', nutritionController.getAddNutrition);
router.post('/:familyMemberId', upload.single('mealPhoto'), nutritionController.addNutrition);

// Beslenme verisi detayı
router.get('/:familyMemberId/:nutritionDataId', nutritionController.getNutritionDetail);

// Beslenme verisi düzenleme
router.get('/:familyMemberId/:nutritionDataId/edit', nutritionController.getEditNutrition);
router.put('/:familyMemberId/:nutritionDataId', upload.single('mealPhoto'), nutritionController.updateNutrition);

// Beslenme verisi silme
router.delete('/:familyMemberId/:nutritionDataId', nutritionController.deleteNutrition);

// Beslenme istatistikleri
router.get('/:familyMemberId/stats', nutritionController.getNutritionStats);

module.exports = router;
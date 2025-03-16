const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { isAuthenticated } = require('../middlewares/isAuth');
const { simpleUpload } = require('../middlewares/multer');

// Tüm kullanıcı rotaları için kimlik doğrulama gerekiyor
router.use(isAuthenticated);

// Kullanıcı profili
router.get('/profile', userController.getProfile);
router.get('/profile/edit', userController.getEditProfile);
router.put('/profile', simpleUpload.single('avatar'), userController.updateProfile);

// Şifre değiştirme
router.get('/change-password', userController.getChangePassword);
router.post('/change-password', userController.changePassword);

// Kullanıcı ayarları
router.get('/settings', userController.getSettings);
router.put('/settings', userController.updateSettings);

// Aile üyeleri
router.get('/family', userController.getFamilyMembers);
router.get('/family/add', userController.getAddFamilyMember);
router.post('/family', simpleUpload.single('avatar'), userController.addFamilyMember);
router.get('/family/:id', userController.getFamilyMemberDetail);
router.get('/family/:id/edit', userController.getEditFamilyMember);
router.put('/family/:id', simpleUpload.single('avatar'), userController.updateFamilyMember);
router.delete('/family/:id', userController.deleteFamilyMember);

module.exports = router;
const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { isAdmin } = require('../middlewares/isAdmin');
const { simpleUpload } = require('../middlewares/multer');

// Admin middleware - tüm admin rotaları için
router.use(isAdmin);

// Admin dashboard
router.get('/dashboard', adminController.getDashboard);

// Kullanıcı yönetimi
router.get('/users', adminController.getUsers);
router.get('/users/:id', adminController.getUserDetail);
router.get('/users/:id/edit', adminController.getEditUser);
router.post('/users/:id', adminController.updateUser);
router.patch('/users/:id/status', adminController.toggleUserStatus);
router.delete('/users/:id', adminController.deleteUser);

// Aile üyeleri yönetimi
router.get('/family-members', adminController.getFamilyMembers);
router.get('/family-members/:id', adminController.getFamilyMemberDetail);

// Sistem ayarları
router.get('/settings', adminController.getSettings);
router.post('/settings/profile', adminController.updateProfile);
router.post('/settings/password', adminController.changePassword);

// Admin yönetimi (süper admin için)
router.get('/admins/new', adminController.getNewAdmin);
router.post('/admins', adminController.createAdmin);
router.get('/admins', adminController.getAdmins);
router.patch('/admins/:id/status', adminController.toggleAdminStatus);
router.delete('/admins/:id', adminController.deleteAdmin);

// API rotaları
router.get('/api/stats', adminController.getSystemStats);

module.exports = router;
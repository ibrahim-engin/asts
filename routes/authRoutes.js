const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { isAuthenticated } = require('../middlewares/isAuth');

// Kullanıcı oturumları
router.get('/login', authController.getLogin);
router.post('/login', authController.login);
router.get('/register', authController.getRegister);
router.post('/register', authController.register);
router.get('/logout', authController.logout);

// Şifre sıfırlama
router.get('/forgot-password', authController.getForgotPassword);
router.post('/forgot-password', authController.forgotPassword);
router.get('/reset-password/:token', authController.getResetPassword);
router.post('/reset-password/:token', authController.resetPassword);

// Admin oturumları
router.get(`/${process.env.ADMIN_PAGE_URL}/login`, authController.getAdminLogin);
router.post(`/${process.env.ADMIN_PAGE_URL}/login`, authController.adminLogin);
router.get(`/${process.env.ADMIN_PAGE_URL}/forgot-password`, authController.getAdminForgotPassword);
router.post(`/${process.env.ADMIN_PAGE_URL}/forgot-password`, authController.adminForgotPassword);
router.get(`/${process.env.ADMIN_PAGE_URL}/reset-password/:token`, authController.getAdminResetPassword);
router.post(`/${process.env.ADMIN_PAGE_URL}/reset-password/:token`, authController.adminResetPassword);

module.exports = router;
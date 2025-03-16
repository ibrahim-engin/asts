const express = require('express');
const router = express.Router();
const { isAuthenticated } = require('../middlewares/isAuth');
const { isApiAdmin } = require('../middlewares/isAdmin');

const authController = require('../controllers/authController');
const dashboardController = require('../controllers/dashboardController');
const healthDataController = require('../controllers/healthDataController');
const medicationController = require('../controllers/medicationController');
const medicalHistoryController = require('../controllers/medicalHistoryController');
const nutritionController = require('../controllers/nutritionController');
const physicalActivityController = require('../controllers/physicalActivityController');
const reminderController = require('../controllers/reminderController');
const reportController = require('../controllers/reportController');
const userController = require('../controllers/userController');

// Kimlik doğrulama rotaları
router.post('/auth/login', authController.apiLogin);
router.post(`/${process.env.ADMIN_PAGE_URL}/login`, authController.apiAdminLogin);
router.get('/auth/me', isAuthenticated, authController.getMe);

// Kullanıcı rotaları
router.get('/user/profile', isAuthenticated, userController.apiGetProfile);
router.put('/user/profile', isAuthenticated, userController.apiUpdateProfile);
router.put('/user/change-password', isAuthenticated, userController.apiChangePassword);
router.get('/user/family', isAuthenticated, userController.apiGetFamilyMembers);
router.get('/user/family/:id', isAuthenticated, userController.apiGetFamilyMember);
router.post('/user/family', isAuthenticated, userController.apiAddFamilyMember);
router.put('/user/family/:id', isAuthenticated, userController.apiUpdateFamilyMember);
router.delete('/user/family/:id', isAuthenticated, userController.apiDeleteFamilyMember);
router.get('/user/settings', isAuthenticated, userController.apiGetSettings);
router.put('/user/settings', isAuthenticated, userController.apiUpdateSettings);

// Dashboard rotaları
router.get('/dashboard/:familyMemberId', isAuthenticated, dashboardController.getDashboardData);

// Sağlık verileri rotaları
router.get('/health/data/:familyMemberId', isAuthenticated, healthDataController.apiGetHealthDataList);
router.post('/health/data/:familyMemberId', isAuthenticated, healthDataController.apiAddHealthData);

// İlaç takibi rotaları
router.get('/medication/:familyMemberId', isAuthenticated, medicationController.apiGetMedicationList);
router.get('/medication/:familyMemberId/:medicationId', isAuthenticated, medicationController.apiGetMedicationDetail);
router.post('/medication', isAuthenticated, medicationController.apiAddMedication);
router.put('/medication/:medicationId', isAuthenticated, medicationController.apiUpdateMedication);
router.delete('/medication/:medicationId', isAuthenticated, medicationController.apiDeleteMedication);
router.get('/medication/:familyMemberId/schedule', isAuthenticated, medicationController.apiGetMedicationSchedule);
router.post('/medication/:familyMemberId/:medicationId/log', isAuthenticated, medicationController.apiLogMedicationTaken);

// Tıbbi geçmiş rotaları
router.get('/medical-history/:familyMemberId', isAuthenticated, medicalHistoryController.apiGetMedicalHistoryList);
router.get('/medical-history/:familyMemberId/:medicalHistoryId', isAuthenticated, medicalHistoryController.apiGetMedicalHistoryDetail);

// Beslenme rotaları
router.get('/nutrition/:familyMemberId', isAuthenticated, nutritionController.apiGetNutritionList);
router.get('/nutrition/:familyMemberId/:nutritionDataId', isAuthenticated, nutritionController.apiGetNutritionDetail);
router.post('/nutrition', isAuthenticated, nutritionController.apiAddNutrition);
router.put('/nutrition/:nutritionDataId', isAuthenticated, nutritionController.apiUpdateNutrition);
router.delete('/nutrition/:nutritionDataId', isAuthenticated, nutritionController.apiDeleteNutrition);
router.get('/nutrition/:familyMemberId/stats', isAuthenticated, nutritionController.apiGetNutritionStats);

// Fiziksel aktivite rotaları
router.get('/activity/:familyMemberId', isAuthenticated, physicalActivityController.apiGetActivityList);
router.get('/activity/:familyMemberId/:activityId', isAuthenticated, physicalActivityController.apiGetActivityDetail);
router.post('/activity', isAuthenticated, physicalActivityController.apiAddActivity);
router.put('/activity/:activityId', isAuthenticated, physicalActivityController.apiUpdateActivity);
router.delete('/activity/:activityId', isAuthenticated, physicalActivityController.apiDeleteActivity);
router.get('/activity/:familyMemberId/stats', isAuthenticated, physicalActivityController.apiGetActivityStats);

// Hatırlatıcı rotaları
router.get('/reminder/:familyMemberId', isAuthenticated, reminderController.apiGetReminderList);
router.get('/reminder/:familyMemberId/:reminderId', isAuthenticated, reminderController.apiGetReminderDetail);
router.post('/reminder', isAuthenticated, reminderController.apiAddReminder);
router.put('/reminder/:reminderId', isAuthenticated, reminderController.apiUpdateReminder);
router.delete('/reminder/:reminderId', isAuthenticated, reminderController.apiDeleteReminder);
router.post('/reminder/:reminderId/complete', isAuthenticated, reminderController.apiCompleteReminder);
router.get('/reminder/:familyMemberId/today', isAuthenticated, reminderController.apiGetTodayReminders);
router.get('/reminder/:familyMemberId/upcoming', isAuthenticated, reminderController.apiGetUpcomingReminders);

// Rapor rotaları
router.get('/report/:familyMemberId', isAuthenticated, reportController.apiGetReportList);
router.get('/report/:familyMemberId/:reportId', isAuthenticated, reportController.apiGetReportDetail);
router.post('/report', isAuthenticated, reportController.apiCreateReport);
router.delete('/report/:reportId', isAuthenticated, reportController.apiDeleteReport);

module.exports = router;
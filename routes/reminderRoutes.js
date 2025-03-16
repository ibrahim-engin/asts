const express = require('express');
const router = express.Router();
const reminderController = require('../controllers/reminderController');
const { isAuthenticated } = require('../middlewares/isAuth');

// Tüm hatırlatıcı rotaları için kimlik doğrulama gerekiyor
router.use(isAuthenticated);

// Hatırlatıcı listesi
router.get('/:familyMemberId', reminderController.getReminderList);

// Yeni hatırlatıcı ekleme
router.get('/:familyMemberId/add', reminderController.getAddReminder);
router.post('/:familyMemberId', reminderController.addReminder);

// Hatırlatıcı detayı
router.get('/:familyMemberId/:reminderId', reminderController.getReminderDetail);

// Hatırlatıcı düzenleme
router.get('/:familyMemberId/:reminderId/edit', reminderController.getEditReminder);
router.put('/:familyMemberId/:reminderId', reminderController.updateReminder);

// Hatırlatıcı silme
router.delete('/:familyMemberId/:reminderId', reminderController.deleteReminder);

// Hatırlatıcı tamamlama
router.post('/:familyMemberId/:reminderId/complete', reminderController.completeReminder);

// Bugünkü hatırlatıcılar
router.get('/:familyMemberId/today', reminderController.getTodayReminders);

module.exports = router;
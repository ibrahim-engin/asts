/**
 * ASTS - Aile Sağlık Takip Sistemi
 * Notification Service - Bildirim Servisi
 * 
 * Bu servis, kullanıcılara bildirim gönderimi ve yönetimini sağlar.
 * İlaç hatırlatıcıları, ölçüm zamanları, kritik değer uyarıları gibi bildirimleri yönetir.
 */

const moment = require('moment');
const mongoose = require('mongoose');
const socket = require('socket.io');
const { logInfo, logError } = require('../middlewares/logger');
const emailService = require('./emailService');
const cacheService = require('./cacheService');

// Bildirim türleri
const NOTIFICATION_TYPES = {
  MEDICATION_REMINDER: 'medication_reminder',
  MEASUREMENT_REMINDER: 'measurement_reminder',
  APPOINTMENT_REMINDER: 'appointment_reminder',
  CRITICAL_VALUE: 'critical_value',
  REPORT_READY: 'report_ready',
  SYSTEM_ALERT: 'system_alert',
  ADMIN_ALERT: 'admin_alert'
};

// Bildirim öncelik seviyeleri
const PRIORITY_LEVELS = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical'
};

// Bildirim durumları
const NOTIFICATION_STATUS = {
  PENDING: 'pending',
  SENT: 'sent',
  DELIVERED: 'delivered',
  READ: 'read',
  FAILED: 'failed'
};

// Socket.io instance
let io;

/**
 * Socket.io instance'ını ayarlar
 * @param {object} server - HTTP sunucu nesnesi
 * @returns {object} - Socket.io instance
 */
const initNotificationServer = (server) => {
  io = socket(server, {
    cors: {
      origin: process.env.NODE_ENV === 'production' 
        ? process.env.BASE_URL 
        : '*',
      methods: ['GET', 'POST']
    }
  });
  
  io.on('connection', (socket) => {
    logInfo(`Bildirim soketi bağlandı: ${socket.id}`);
    
    // Kullanıcıya özel oda
    socket.on('join', (data) => {
      if (data.userId) {
        socket.join(`user_${data.userId}`);
        logInfo(`Kullanıcı bildirim odasına katıldı: ${data.userId}`);
        
        // Kullanıcının okunmamış bildirimlerini gönder
        sendUnreadNotifications(data.userId);
      }
      
      if (data.isAdmin) {
        socket.join('admin');
        logInfo('Admin bildirim odasına katıldı');
      }
    });
    
    // Bildirim okundu olarak işaretleme
    socket.on('markAsRead', async (data) => {
      if (data.notificationId && data.userId) {
        try {
          await markNotificationAsRead(data.notificationId, data.userId);
        } catch (error) {
          logError('Bildirim okundu işaretlenemedi', error);
        }
      }
    });
    
    // Bağlantı kesildiğinde
    socket.on('disconnect', () => {
      logInfo(`Bildirim soketi bağlantısı kesildi: ${socket.id}`);
    });
  });
  
  return io;
};

/**
 * Kullanıcının okunmamış bildirimlerini gönderir
 * @param {string} userId - Kullanıcı ID'si
 */
const sendUnreadNotifications = async (userId) => {
  try {
    // MongoDB'den okunmamış bildirimleri al
    const Notification = mongoose.model('Notification');
    const unreadNotifications = await Notification.find({
      userId,
      status: { $ne: NOTIFICATION_STATUS.READ }
    }).sort({ createdAt: -1 }).limit(20);
    
    if (unreadNotifications.length > 0) {
      io.to(`user_${userId}`).emit('unreadNotifications', {
        notifications: unreadNotifications
      });
    }
  } catch (error) {
    logError(`Okunmamış bildirimler gönderilemedi: ${userId}`, error);
  }
};

/**
 * Yeni bildirim oluşturur ve gönderir
 * @param {Object} options - Bildirim seçenekleri
 * @param {string} options.userId - Kullanıcı ID'si
 * @param {string} options.title - Bildirim başlığı
 * @param {string} options.message - Bildirim mesajı
 * @param {string} options.type - Bildirim türü (NOTIFICATION_TYPES'tan)
 * @param {string} options.priority - Öncelik seviyesi (PRIORITY_LEVELS'tan)
 * @param {Object} options.data - Bildirim ile ilgili ek veriler
 * @param {boolean} options.sendEmail - E-posta bildirimi gönderme durumu
 * @param {boolean} options.sendPush - Push bildirimi gönderme durumu
 * @returns {Promise<Object>} - Oluşturulan bildirim
 */
const createNotification = async (options) => {
  try {
    const {
      userId,
      title,
      message,
      type = NOTIFICATION_TYPES.SYSTEM_ALERT,
      priority = PRIORITY_LEVELS.MEDIUM,
      data = {},
      sendEmail = false,
      sendPush = true
    } = options;
    
    // Kullanıcı ID'si kontrolü
    if (!userId) {
      throw new Error('Kullanıcı ID\'si gereklidir');
    }
    
    // MongoDB'ye bildirim kaydet
    const Notification = mongoose.model('Notification');
    const notification = await Notification.create({
      userId,
      title,
      message,
      type,
      priority,
      data,
      status: NOTIFICATION_STATUS.PENDING,
      isRead: false
    });
    
    // Bildirim nesnesini döndür
    const notificationData = notification.toObject();
    
    // Bildirim gönder
    if (sendPush && io) {
      try {
        io.to(`user_${userId}`).emit('notification', {
          notification: notificationData
        });
        
        // Durumu güncelle
        notification.status = NOTIFICATION_STATUS.SENT;
        await notification.save();
      } catch (error) {
        logError(`Bildirim gönderilemedi: ${notification._id}`, error);
      }
    }
    
    // E-posta bildirimi
    if (sendEmail) {
      try {
        // Kullanıcı bilgilerini al
        const User = mongoose.model('User');
        const user = await User.findById(userId);
        
        if (user && user.email) {
          // Kullanıcı ayarlarını kontrol et
          const sendNotificationEmail = user.settings?.notifications?.email || false;
          
          if (sendNotificationEmail) {
            // E-posta gönder
            await emailService.sendTemplateEmail(
              user.email,
              `ASTS - ${title}`,
              'notification',
              {
                name: user.name,
                title,
                message,
                priority,
                date: moment().format('DD.MM.YYYY HH:mm'),
                actionUrl: `${process.env.BASE_URL}`
              }
            );
          }
        }
      } catch (error) {
        logError(`Bildirim e-postası gönderilemedi: ${notification._id}`, error);
      }
    }
    
    return notificationData;
  } catch (error) {
    logError('Bildirim oluşturulamadı', error);
    throw error;
  }
};

/**
 * Bildirimi okundu olarak işaretler
 * @param {string} notificationId - Bildirim ID'si
 * @param {string} userId - Kullanıcı ID'si
 * @returns {Promise<Object>} - Güncellenen bildirim
 */
const markNotificationAsRead = async (notificationId, userId) => {
  try {
    const Notification = mongoose.model('Notification');
    const notification = await Notification.findOne({
      _id: notificationId,
      userId
    });
    
    if (!notification) {
      throw new Error('Bildirim bulunamadı');
    }
    
    notification.isRead = true;
    notification.status = NOTIFICATION_STATUS.READ;
    notification.readAt = new Date();
    
    await notification.save();
    
    // Diğer cihazlarda da senkronize et
    if (io) {
      io.to(`user_${userId}`).emit('notificationRead', {
        notificationId
      });
    }
    
    return notification;
  } catch (error) {
    logError(`Bildirim okundu işaretlenemedi: ${notificationId}`, error);
    throw error;
  }
};

/**
 * Toplu bildirim gönderir
 * @param {Array<string>} userIds - Kullanıcı ID'leri
 * @param {string} title - Bildirim başlığı
 * @param {string} message - Bildirim mesajı
 * @param {string} type - Bildirim türü
 * @param {Object} data - Bildirim ile ilgili ek veriler
 * @param {string} priority - Öncelik seviyesi
 * @param {boolean} sendEmail - E-posta bildirimi gönderme durumu
 * @returns {Promise<Array>} - Oluşturulan bildirimler
 */
const sendBulkNotifications = async (userIds, title, message, type, data = {}, priority = PRIORITY_LEVELS.MEDIUM, sendEmail = false) => {
  try {
    const promises = userIds.map(userId => 
      createNotification({
        userId,
        title,
        message,
        type,
        priority,
        data,
        sendEmail
      })
    );
    
    return await Promise.all(promises);
  } catch (error) {
    logError('Toplu bildirim gönderilemedi', error);
    throw error;
  }
};

/**
 * Admin bildirimi gönderir
 * @param {string} title - Bildirim başlığı
 * @param {string} message - Bildirim mesajı
 * @param {Object} data - Bildirim ile ilgili ek veriler
 * @returns {Promise<void>}
 */
const sendAdminNotification = async (title, message, data = {}) => {
  try {
    // Tüm admin kullanıcılarını bul
    const Admin = mongoose.model('Admin');
    const admins = await Admin.find({ isActive: true });
    
    if (admins.length === 0) {
      return;
    }
    
    // Her admin için bildirim oluştur
    const promises = admins.map(admin => 
      createNotification({
        userId: admin._id,
        title,
        message,
        type: NOTIFICATION_TYPES.ADMIN_ALERT,
        priority: PRIORITY_LEVELS.HIGH,
        data,
        sendEmail: true
      })
    );
    
    await Promise.all(promises);
    
    // Socket üzerinden admin odasına da gönder
    if (io) {
      io.to('admin').emit('adminNotification', {
        title,
        message,
        data,
        time: new Date()
      });
    }
  } catch (error) {
    logError('Admin bildirimi gönderilemedi', error);
    throw error;
  }
};

/**
 * İlaç hatırlatıcısı gönderir
 * @param {Object} reminder - Hatırlatıcı nesnesi
 * @param {Object} medication - İlaç nesnesi
 * @param {Object} familyMember - Aile üyesi nesnesi
 * @returns {Promise<Object>} - Oluşturulan bildirim
 */
const sendMedicationReminder = async (reminder, medication, familyMember) => {
  try {
    const User = mongoose.model('User');
    const user = await User.findById(familyMember.userId);
    
    if (!user) {
      throw new Error('Kullanıcı bulunamadı');
    }
    
    // Kullanıcı ayarlarını kontrol et
    const sendNotification = user.settings?.notifications?.reminders !== false;
    const sendEmail = user.settings?.notifications?.email === true;
    
    if (!sendNotification) {
      return null;
    }
    
    // Bildirim başlığı ve mesajı
    const title = `İlaç Hatırlatıcısı: ${medication.name}`;
    let message = `${familyMember.name} için ${medication.name} alma zamanı geldi.`;
    
    if (reminder.schedule && reminder.schedule.times && reminder.schedule.times.length > 0) {
      const time = reminder.schedule.time;
      message = `${familyMember.name} için ${medication.name} alma zamanı (${time})`;
    }
    
    // İlaç dozaj bilgisi
    let dosageInfo = '';
    if (medication.dosage) {
      dosageInfo = `${medication.dosage.value} ${medication.dosage.unit}`;
    }
    
    // Bildirim oluştur
    const notification = await createNotification({
      userId: user._id,
      title,
      message,
      type: NOTIFICATION_TYPES.MEDICATION_REMINDER,
      priority: medication.isCritical ? PRIORITY_LEVELS.CRITICAL : PRIORITY_LEVELS.HIGH,
      data: {
        reminderId: reminder._id,
        medicationId: medication._id,
        familyMemberId: familyMember._id,
        familyMemberName: familyMember.fullName || `${familyMember.name} ${familyMember.surname}`,
        medicationName: medication.name,
        dosage: dosageInfo,
        scheduledTime: reminder.schedule.time,
        isCritical: medication.isCritical
      },
      sendEmail
    });
    
    return notification;
  } catch (error) {
    logError('İlaç hatırlatıcısı gönderilemedi', error);
    throw error;
  }
};

/**
 * Ölçüm hatırlatıcısı gönderir
 * @param {Object} reminder - Hatırlatıcı nesnesi
 * @param {Object} familyMember - Aile üyesi nesnesi
 * @returns {Promise<Object>} - Oluşturulan bildirim
 */
const sendMeasurementReminder = async (reminder, familyMember) => {
  try {
    const User = mongoose.model('User');
    const user = await User.findById(familyMember.userId);
    
    if (!user) {
      throw new Error('Kullanıcı bulunamadı');
    }
    
    // Kullanıcı ayarlarını kontrol et
    const sendNotification = user.settings?.notifications?.reminders !== false;
    const sendEmail = user.settings?.notifications?.email === true;
    
    if (!sendNotification) {
      return null;
    }
    
    // Ölçüm türü
    let measurementType = 'ölçüm';
    if (reminder.measurement && reminder.measurement.type) {
      switch (reminder.measurement.type) {
        case 'bloodSugar':
          measurementType = 'kan şekeri';
          break;
        case 'bloodPressure':
          measurementType = 'tansiyon';
          break;
        case 'weight':
          measurementType = 'kilo';
          break;
        case 'temperature':
          measurementType = 'ateş';
          break;
        default:
          measurementType = reminder.measurement.type;
      }
    }
    
    // Bildirim başlığı ve mesajı
    const title = `Ölçüm Hatırlatıcısı: ${measurementType}`;
    let message = `${familyMember.name} için ${measurementType} ölçüm zamanı geldi.`;
    
    if (reminder.schedule && reminder.schedule.time) {
      const time = reminder.schedule.time;
      message = `${familyMember.name} için ${measurementType} ölçüm zamanı (${time})`;
    }
    
    // Bildirim oluştur
    const notification = await createNotification({
      userId: user._id,
      title,
      message,
      type: NOTIFICATION_TYPES.MEASUREMENT_REMINDER,
      priority: reminder.priority || PRIORITY_LEVELS.MEDIUM,
      data: {
        reminderId: reminder._id,
        familyMemberId: familyMember._id,
        familyMemberName: familyMember.fullName || `${familyMember.name} ${familyMember.surname}`,
        measurementType: reminder.measurement.type,
        scheduledTime: reminder.schedule.time,
        instructions: reminder.measurement.instructions
      },
      sendEmail
    });
    
    return notification;
  } catch (error) {
    logError('Ölçüm hatırlatıcısı gönderilemedi', error);
    throw error;
  }
};

/**
 * Kritik sağlık değeri bildirimi gönderir
 * @param {Object} healthData - Sağlık verisi
 * @param {Object} familyMember - Aile üyesi nesnesi
 * @returns {Promise<Object>} - Oluşturulan bildirim
 */
const sendCriticalValueAlert = async (healthData, familyMember) => {
  try {
    const User = mongoose.model('User');
    const user = await User.findById(familyMember.userId);
    
    if (!user) {
      throw new Error('Kullanıcı bulunamadı');
    }
    
    // Kullanıcı ayarlarını kontrol et
    const sendNotification = user.settings?.notifications?.critical_values !== false;
    const sendEmail = user.settings?.notifications?.email === true;
    
    if (!sendNotification) {
      return null;
    }
    
    // Veri tipi ve değeri
    let typeText, valueText;
    
    switch (healthData.dataType) {
      case 'bloodSugar':
        typeText = 'Kan Şekeri';
        valueText = `${healthData.bloodSugar.value} ${healthData.bloodSugar.unit}`;
        break;
      case 'bloodPressure':
        typeText = 'Tansiyon';
        valueText = `${healthData.bloodPressure.systolic}/${healthData.bloodPressure.diastolic} ${healthData.bloodPressure.unit || 'mmHg'}`;
        break;
      case 'heartRate':
        typeText = 'Nabız';
        valueText = `${healthData.heartRate.value} ${healthData.heartRate.unit || 'bpm'}`;
        break;
      default:
        typeText = healthData.dataType;
        valueText = 'Kritik Değer';
    }
    
    // Bildirim başlığı ve mesajı
    const title = `Kritik ${typeText} Değeri`;
    const message = `${familyMember.name} için ${typeText} değeri kritik seviyede: ${valueText}`;
    
    // Bildirim oluştur
    const notification = await createNotification({
      userId: user._id,
      title,
      message,
      type: NOTIFICATION_TYPES.CRITICAL_VALUE,
      priority: PRIORITY_LEVELS.CRITICAL,
      data: {
        healthDataId: healthData._id,
        familyMemberId: familyMember._id,
        familyMemberName: familyMember.fullName || `${familyMember.name} ${familyMember.surname}`,
        dataType: healthData.dataType,
        value: valueText,
        measuredAt: healthData.measuredAt
      },
      sendEmail: true // Kritik değerler için her zaman e-posta gönder
    });
    
    // E-posta gönderimi (özel şablon ile)
    if (sendEmail && user.email) {
      try {
        await emailService.sendCriticalHealthDataEmail(
          user.email,
          healthData,
          familyMember
        );
      } catch (error) {
        logError(`Kritik değer e-postası gönderilemedi: ${healthData._id}`, error);
      }
    }
    
    return notification;
  } catch (error) {
    logError('Kritik değer bildirimi gönderilemedi', error);
    throw error;
  }
};

/**
 * Rapor hazır bildirimi gönderir
 * @param {Object} report - Rapor nesnesi
 * @param {Object} familyMember - Aile üyesi nesnesi
 * @returns {Promise<Object>} - Oluşturulan bildirim
 */
const sendReportReadyNotification = async (report, familyMember) => {
  try {
    const User = mongoose.model('User');
    const user = await User.findById(familyMember.userId);
    
    if (!user) {
      throw new Error('Kullanıcı bulunamadı');
    }
    
    // Kullanıcı ayarlarını kontrol et
    const sendNotification = user.settings?.notifications?.reports !== false;
    const sendEmail = user.settings?.notifications?.email === true;
    
    if (!sendNotification) {
      return null;
    }
    
    // Rapor türü
    let reportType;
    switch (report.type) {
      case 'health_summary':
        reportType = 'Sağlık Özeti';
        break;
      case 'medication_adherence':
        reportType = 'İlaç Kullanım Raporu';
        break;
      case 'blood_sugar_analysis':
        reportType = 'Kan Şekeri Analizi';
        break;
      case 'blood_pressure_analysis':
        reportType = 'Tansiyon Analizi';
        break;
      case 'activity_summary':
        reportType = 'Aktivite Özeti';
        break;
      case 'nutrition_analysis':
        reportType = 'Beslenme Analizi';
        break;
      default:
        reportType = report.type;
    }
    
    // Bildirim başlığı ve mesajı
    const title = `Rapor Hazır: ${reportType}`;
    const message = `${familyMember.name} için ${reportType} raporu hazırlandı.`;
    
    // Bildirim oluştur
    const notification = await createNotification({
      userId: user._id,
      title,
      message,
      type: NOTIFICATION_TYPES.REPORT_READY,
      priority: PRIORITY_LEVELS.MEDIUM,
      data: {
        reportId: report._id,
        familyMemberId: familyMember._id,
        familyMemberName: familyMember.fullName || `${familyMember.name} ${familyMember.surname}`,
        reportType: report.type,
        reportUrl: `/report/${familyMember._id}/${report._id}`
      },
      sendEmail
    });
    
    return notification;
  } catch (error) {
    logError('Rapor hazır bildirimi gönderilemedi', error);
    throw error;
  }
};

/**
 * Randevu hatırlatıcısı gönderir
 * @param {Object} reminder - Hatırlatıcı nesnesi
 * @param {Object} familyMember - Aile üyesi nesnesi
 * @returns {Promise<Object>} - Oluşturulan bildirim
 */
const sendAppointmentReminder = async (reminder, familyMember) => {
  try {
    const User = mongoose.model('User');
    const user = await User.findById(familyMember.userId);
    
    if (!user) {
      throw new Error('Kullanıcı bulunamadı');
    }
    
    // Kullanıcı ayarlarını kontrol et
    const sendNotification = user.settings?.notifications?.reminders !== false;
    const sendEmail = user.settings?.notifications?.email === true;
    
    if (!sendNotification) {
      return null;
    }
    
    // Randevu bilgileri
    const doctorName = reminder.appointment?.doctorName || 'Doktor';
    const hospital = reminder.appointment?.hospital || 'Hastane';
    
    // Bildirim başlığı ve mesajı
    const title = `Randevu Hatırlatıcısı`;
    let message = `${familyMember.name} için randevu zamanı geldi.`;
    
    if (reminder.schedule && reminder.schedule.time) {
      const time = reminder.schedule.time;
      const date = moment(reminder.schedule.startDate).format('DD.MM.YYYY');
      message = `${familyMember.name} için ${doctorName} (${hospital}) randevusu, ${date} ${time}`;
    }
    
    // Bildirim oluştur
    const notification = await createNotification({
      userId: user._id,
      title,
      message,
      type: NOTIFICATION_TYPES.APPOINTMENT_REMINDER,
      priority: reminder.priority || PRIORITY_LEVELS.HIGH,
      data: {
        reminderId: reminder._id,
        familyMemberId: familyMember._id,
        familyMemberName: familyMember.fullName || `${familyMember.name} ${familyMember.surname}`,
        doctorName: doctorName,
        hospital: hospital,
        date: reminder.schedule.startDate,
        time: reminder.schedule.time,
        address: reminder.appointment?.address,
        reason: reminder.appointment?.reason
      },
      sendEmail
    });
    
    // E-posta gönderimi (özel şablon ile)
    if (sendEmail && user.email) {
      try {
        await emailService.sendAppointmentReminderEmail(
          user.email,
          reminder,
          familyMember
        );
      } catch (error) {
        logError(`Randevu hatırlatıcı e-postası gönderilemedi: ${reminder._id}`, error);
      }
    }
    
    return notification;
  } catch (error) {
    logError('Randevu hatırlatıcısı gönderilemedi', error);
    throw error;
  }
};

/**
 * Kullanıcının bildirimlerini temizler
 * @param {string} userId - Kullanıcı ID'si
 * @returns {Promise<number>} - Silinen bildirim sayısı
 */
const clearUserNotifications = async (userId) => {
  try {
    const Notification = mongoose.model('Notification');
    const result = await Notification.deleteMany({ userId });
    
    return result.deletedCount;
  } catch (error) {
    logError(`Kullanıcı bildirimleri temizlenemedi: ${userId}`, error);
    throw error;
  }
};

/**
 * Okunmuş bildirimleri temizler
 * @param {string} userId - Kullanıcı ID'si
 * @param {number} olderThan - Bu günden kaç gün önceki bildirimleri temizleyeceği (varsayılan 30)
 * @returns {Promise<number>} - Silinen bildirim sayısı
 */
const clearReadNotifications = async (userId, olderThan = 30) => {
  try {
    const Notification = mongoose.model('Notification');
    const cutoffDate = moment().subtract(olderThan, 'days').toDate();
    
    const result = await Notification.deleteMany({
      userId,
      isRead: true,
      createdAt: { $lt: cutoffDate }
    });
    
    return result.deletedCount;
  } catch (error) {
    logError(`Okunmuş bildirimler temizlenemedi: ${userId}`, error);
    throw error;
  }
};

module.exports = {
  initNotificationServer,
  createNotification,
  markNotificationAsRead,
  sendBulkNotifications,
  sendAdminNotification,
  sendMedicationReminder,
  sendMeasurementReminder,
  sendCriticalValueAlert,
  sendReportReadyNotification,
  sendAppointmentReminder,
  clearUserNotifications,
  clearReadNotifications,
  NOTIFICATION_TYPES,
  PRIORITY_LEVELS,
  NOTIFICATION_STATUS
};
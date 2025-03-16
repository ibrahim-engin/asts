const Reminder = require('../models/Reminder');
const FamilyMember = require('../models/FamilyMember');
const Medication = require('../models/Medication');
const { logError, logInfo } = require('../middlewares/logger');
const mongoose = require('mongoose');

/**
 * Hatırlatıcıları listele
 * @route   GET /reminder/:familyMemberId
 * @access  Private
 */
exports.getReminderList = async (req, res) => {
  try {
    const { familyMemberId } = req.params;
    
    // Aile üyesini bul
    const familyMember = await FamilyMember.findOne({
      _id: familyMemberId,
      userId: req.user._id
    });
    
    if (!familyMember) {
      req.flash('error_msg', 'Aile üyesi bulunamadı');
      return res.redirect('/home');
    }
    
    // Sayfalama parametreleri
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    
    // Filtreleme parametreleri
    const filter = { familyMemberId };
    
    if (req.query.type) {
      filter.type = req.query.type;
    }
    
    if (req.query.priority) {
      filter.priority = req.query.priority;
    }
    
    if (req.query.isActive !== undefined) {
      filter.isActive = req.query.isActive === 'true';
    }
    
    // Toplam kayıt sayısı
    const total = await Reminder.countDocuments(filter);
    
    // Hatırlatıcıları getir
    const reminders = await Reminder.find(filter)
      .sort({ 'schedule.nextScheduled': 1 })
      .skip(skip)
      .limit(limit);
    
    // Sayfalama bilgilerini hazırla
    const totalPages = Math.ceil(total / limit);
    const pagination = {
      currentPage: page,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
      nextPage: page < totalPages ? page + 1 : null,
      prevPage: page > 1 ? page - 1 : null,
      total
    };
    
    // Bugünkü hatırlatıcıları bul
    const todayReminders = await Reminder.findTodayReminders(familyMemberId);
    
    // Hatırlatıcı türlerini gruplandır
    const reminderTypes = await Reminder.aggregate([
      { $match: { familyMemberId: mongoose.Types.ObjectId(familyMemberId) } },
      { $group: { _id: '$type', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    
    // Hatırlatıcı türü seçenekleri
    const reminderTypeOptions = [
      { value: 'medication', label: 'İlaç', icon: 'pill' },
      { value: 'measurement', label: 'Ölçüm', icon: 'heart-pulse' },
      { value: 'appointment', label: 'Randevu', icon: 'calendar' },
      { value: 'activity', label: 'Aktivite', icon: 'activity' },
      { value: 'nutrition', label: 'Beslenme', icon: 'utensils' },
      { value: 'water', label: 'Su', icon: 'droplet' },
      { value: 'custom', label: 'Özel', icon: 'bell' }
    ];
    
    // Öncelik seçenekleri
    const priorityOptions = [
      { value: 'low', label: 'Düşük', color: 'text-info' },
      { value: 'medium', label: 'Orta', color: 'text-success' },
      { value: 'high', label: 'Yüksek', color: 'text-warning' },
      { value: 'critical', label: 'Kritik', color: 'text-danger' }
    ];
    
    // Sayfayı render et
    res.render('front/reminder-list', {
      title: `${familyMember.name} ${familyMember.surname} - Hatırlatıcılar`,
      familyMember,
      reminders,
      pagination,
      todayReminders,
      filter: req.query,
      reminderTypes,
      reminderTypeOptions,
      priorityOptions
    });
  } catch (error) {
    logError(error, req);
    
    if (error.name === 'CastError') {
      req.flash('error_msg', 'Geçersiz aile üyesi ID formatı');
      return res.redirect('/home');
    }
    
    res.status(500).render('500', {
      title: 'Sunucu Hatası',
      message: 'Hatırlatıcılar alınırken bir hata oluştu',
      error: process.env.NODE_ENV === 'development' ? error : {}
    });
  }
};

/**
 * Yeni hatırlatıcı ekleme sayfası
 * @route   GET /reminder/:familyMemberId/add
 * @access  Private
 */
exports.getAddReminder = async (req, res) => {
  try {
    const { familyMemberId } = req.params;
    
    // Aile üyesini bul
    const familyMember = await FamilyMember.findOne({
      _id: familyMemberId,
      userId: req.user._id
    });
    
    if (!familyMember) {
      req.flash('error_msg', 'Aile üyesi bulunamadı');
      return res.redirect('/home');
    }
    
    // Hatırlatıcı türünü al (opsiyonel)
    const type = req.query.type || 'custom';
    
    // İlaç hatırlatıcısı için ilaçları getir
    let medications = [];
    if (type === 'medication') {
      medications = await Medication.find({
        familyMemberId,
        isActive: true
      }).sort('name');
    }
    
    // Hatırlatıcı ekleme sayfasını render et
    res.render('front/reminder-form', {
      title: `${familyMember.name} ${familyMember.surname} - Hatırlatıcı Ekle`,
      familyMember,
      type,
      formAction: `/reminder/${familyMemberId}`,
      formMethod: 'POST',
      reminder: null,
      medications,
      reminderTypeOptions: [
        { value: 'medication', label: 'İlaç', icon: 'pill' },
        { value: 'measurement', label: 'Ölçüm', icon: 'heart-pulse' },
        { value: 'appointment', label: 'Randevu', icon: 'calendar' },
        { value: 'activity', label: 'Aktivite', icon: 'activity' },
        { value: 'nutrition', label: 'Beslenme', icon: 'utensils' },
        { value: 'water', label: 'Su', icon: 'droplet' },
        { value: 'custom', label: 'Özel', icon: 'bell' }
      ],
      measurementTypeOptions: [
        { value: 'bloodSugar', label: 'Kan Şekeri' },
        { value: 'bloodPressure', label: 'Tansiyon' },
        { value: 'weight', label: 'Kilo' },
        { value: 'temperature', label: 'Vücut Sıcaklığı' },
        { value: 'other', label: 'Diğer' }
      ],
      frequencyOptions: [
        { value: 'once', label: 'Bir kere' },
        { value: 'daily', label: 'Her gün' },
        { value: 'weekly', label: 'Haftalık' },
        { value: 'monthly', label: 'Aylık' },
        { value: 'custom', label: 'Özel' }
      ],
      daysOfWeekOptions: [
        { value: 'pazartesi', label: 'Pazartesi' },
        { value: 'salı', label: 'Salı' },
        { value: 'çarşamba', label: 'Çarşamba' },
        { value: 'perşembe', label: 'Perşembe' },
        { value: 'cuma', label: 'Cuma' },
        { value: 'cumartesi', label: 'Cumartesi' },
        { value: 'pazar', label: 'Pazar' }
      ],
      priorityOptions: [
        { value: 'low', label: 'Düşük' },
        { value: 'medium', label: 'Orta' },
        { value: 'high', label: 'Yüksek' },
        { value: 'critical', label: 'Kritik' }
      ],
      customIntervalUnitOptions: [
        { value: 'gün', label: 'Gün' },
        { value: 'hafta', label: 'Hafta' },
        { value: 'ay', label: 'Ay' }
      ]
    });
  } catch (error) {
    logError(error, req);
    
    if (error.name === 'CastError') {
      req.flash('error_msg', 'Geçersiz aile üyesi ID formatı');
      return res.redirect('/home');
    }
    
    res.status(500).render('500', {
      title: 'Sunucu Hatası',
      message: 'Hatırlatıcı ekleme sayfası yüklenirken bir hata oluştu',
      error: process.env.NODE_ENV === 'development' ? error : {}
    });
  }
};

/**
 * Hatırlatıcı ekleme
 * @route   POST /reminder/:familyMemberId
 * @access  Private
 */
exports.addReminder = async (req, res) => {
  try {
    const { familyMemberId } = req.params;
    
    // Aile üyesini kontrol et
    const familyMember = await FamilyMember.findOne({
      _id: familyMemberId,
      userId: req.user._id
    });
    
    if (!familyMember) {
      req.flash('error_msg', 'Aile üyesi bulunamadı');
      return res.redirect('/home');
    }
    
    // Form verilerini al
    const { 
      type,
      title,
      description,
      'schedule.startDate': startDate,
      'schedule.endDate': endDate,
      'schedule.time': time,
      'schedule.frequency': frequency,
      priority,
      isActive
    } = req.body;
    
    // Yeni hatırlatıcı oluştur
    const reminder = new Reminder({
      familyMemberId,
      type,
      title,
      description,
      schedule: {
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : undefined,
        time,
        frequency
      },
      priority: priority || 'medium',
      isActive: isActive === 'on',
      createdBy: req.user._id
    });
    
    // Türe özgü alanları doldur
    if (type === 'medication' && req.body['medication.medicationId']) {
      reminder.medication = {
        medicationId: req.body['medication.medicationId'],
        dosage: req.body['medication.dosage'],
        withFood: req.body['medication.withFood'] === 'on',
        instructions: req.body['medication.instructions']
      };
    }
    
    if (type === 'measurement' && req.body['measurement.type']) {
      reminder.measurement = {
        type: req.body['measurement.type'],
        fasting: req.body['measurement.fasting'] === 'on',
        instructions: req.body['measurement.instructions']
      };
    }
    
    if (type === 'appointment') {
      reminder.appointment = {
        doctorName: req.body['appointment.doctorName'],
        specialty: req.body['appointment.specialty'],
        hospital: req.body['appointment.hospital'],
        address: req.body['appointment.address'],
        phone: req.body['appointment.phone'],
        reason: req.body['appointment.reason'],
        instructions: req.body['appointment.instructions']
      };
    }
    
    // Frekans ayarları
    if (frequency === 'weekly' && req.body['schedule.daysOfWeek']) {
      // Gelen veri tek bir değer ise, dizi haline getir
      const daysOfWeek = Array.isArray(req.body['schedule.daysOfWeek']) 
        ? req.body['schedule.daysOfWeek'] 
        : [req.body['schedule.daysOfWeek']];
      
      reminder.schedule.daysOfWeek = daysOfWeek;
    }
    
    if (frequency === 'monthly' && req.body['schedule.daysOfMonth']) {
      // Gelen veri tek bir değer ise, dizi haline getir
      const daysOfMonth = Array.isArray(req.body['schedule.daysOfMonth'])
        ? req.body['schedule.daysOfMonth'].map(Number)
        : [parseInt(req.body['schedule.daysOfMonth'])];
      
      reminder.schedule.daysOfMonth = daysOfMonth;
    }
    
    if (frequency === 'custom' && req.body['schedule.customInterval.value']) {
      reminder.schedule.customInterval = {
        value: parseInt(req.body['schedule.customInterval.value']),
        unit: req.body['schedule.customInterval.unit'] || 'gün'
      };
    }
    
    // Bildirim ayarları
    reminder.notification = {
      channels: {
        app: req.body['notification.channels.app'] === 'on',
        email: req.body['notification.channels.email'] === 'on',
        sms: req.body['notification.channels.sms'] === 'on'
      },
      sound: req.body['notification.sound'],
      vibration: req.body['notification.vibration'] === 'on',
      repeat: {
        enabled: req.body['notification.repeat.enabled'] === 'on',
        interval: req.body['notification.repeat.interval'] ? parseInt(req.body['notification.repeat.interval']) : 5,
        maxCount: req.body['notification.repeat.maxCount'] ? parseInt(req.body['notification.repeat.maxCount']) : 3
      }
    };
    
    // İlk zamanlama
    reminder.scheduleNext();
    
    // Veriyi kaydet
    await reminder.save();
    
    // Log kaydı
    logInfo('Yeni hatırlatıcı eklendi', {
      userId: req.user._id,
      familyMemberId,
      reminderId: reminder._id,
      type
    });
    
    req.flash('success_msg', 'Hatırlatıcı başarıyla eklendi');
    
    // Hatırlatıcılar listesine yönlendir
    res.redirect(`/reminder/${familyMemberId}`);
  } catch (error) {
    logError(error, req);
    
    if (error.name === 'ValidationError') {
      req.flash('error_msg', 'Geçersiz veya eksik veri');
      return res.redirect(`/reminder/${req.params.familyMemberId}/add?type=${req.body.type || 'custom'}`);
    }
    
    req.flash('error_msg', 'Hatırlatıcı eklenirken bir hata oluştu');
    res.redirect(`/reminder/${req.params.familyMemberId}/add`);
  }
};

/**
 * Hatırlatıcı detayını göster
 * @route   GET /reminder/:familyMemberId/:reminderId
 * @access  Private
 */
exports.getReminderDetail = async (req, res) => {
  try {
    const { familyMemberId, reminderId } = req.params;
    
    // Aile üyesini kontrol et
    const familyMember = await FamilyMember.findOne({
      _id: familyMemberId,
      userId: req.user._id
    });
    
    if (!familyMember) {
      req.flash('error_msg', 'Aile üyesi bulunamadı');
      return res.redirect('/home');
    }
    
    // Hatırlatıcıyı bul
    const reminder = await Reminder.findOne({
      _id: reminderId,
      familyMemberId
    });
    
    if (!reminder) {
      req.flash('error_msg', 'Hatırlatıcı bulunamadı');
      return res.redirect(`/reminder/${familyMemberId}`);
    }
    
    // İlaç bilgilerini getir
    let medication = null;
    if (reminder.type === 'medication' && reminder.medication && reminder.medication.medicationId) {
      medication = await Medication.findById(reminder.medication.medicationId);
    }
    
    // Detay sayfasını render et
    res.render('front/reminder-detail', {
      title: `${familyMember.name} ${familyMember.surname} - Hatırlatıcı Detayı`,
      familyMember,
      reminder,
      medication,
      reminderTypeMap: {
        'medication': 'İlaç',
        'measurement': 'Ölçüm',
        'appointment': 'Randevu',
        'activity': 'Aktivite',
        'nutrition': 'Beslenme',
        'water': 'Su',
        'custom': 'Özel'
      },
      priorityMap: {
        'low': { label: 'Düşük', color: 'text-info' },
        'medium': { label: 'Orta', color: 'text-success' },
        'high': { label: 'Yüksek', color: 'text-warning' },
        'critical': { label: 'Kritik', color: 'text-danger' }
      },
      measurementTypeMap: {
        'bloodSugar': 'Kan Şekeri',
        'bloodPressure': 'Tansiyon',
        'weight': 'Kilo',
        'temperature': 'Vücut Sıcaklığı',
        'other': 'Diğer'
      }
    });
  } catch (error) {
    logError(error, req);
    
    if (error.name === 'CastError') {
      req.flash('error_msg', 'Geçersiz ID formatı');
      return res.redirect('/home');
    }
    
    res.status(500).render('500', {
      title: 'Sunucu Hatası',
      message: 'Hatırlatıcı detayı alınırken bir hata oluştu',
      error: process.env.NODE_ENV === 'development' ? error : {}
    });
  }
};

/**
 * Hatırlatıcı düzenleme sayfası
 * @route   GET /reminder/:familyMemberId/:reminderId/edit
 * @access  Private
 */
exports.getEditReminder = async (req, res) => {
  try {
    const { familyMemberId, reminderId } = req.params;
    
    // Aile üyesini kontrol et
    const familyMember = await FamilyMember.findOne({
      _id: familyMemberId,
      userId: req.user._id
    });
    
    if (!familyMember) {
      req.flash('error_msg', 'Aile üyesi bulunamadı');
      return res.redirect('/home');
    }
    
    // Hatırlatıcıyı bul
    const reminder = await Reminder.findOne({
      _id: reminderId,
      familyMemberId
    });
    
    if (!reminder) {
      req.flash('error_msg', 'Hatırlatıcı bulunamadı');
      return res.redirect(`/reminder/${familyMemberId}`);
    }
    
    // İlaç hatırlatıcısı için ilaçları getir
    let medications = [];
    if (reminder.type === 'medication') {
      medications = await Medication.find({
        familyMemberId,
        isActive: true
      }).sort('name');
    }
    
    // Düzenleme sayfasını render et
    res.render('front/reminder-form', {
      title: `${familyMember.name} ${familyMember.surname} - Hatırlatıcı Düzenle`,
      familyMember, reminder,
      type: reminder.type,
      formAction: `/reminder/${familyMemberId}/${reminderId}?_method=PUT`,
      formMethod: 'POST',
      medications,
      reminderTypeOptions: [
        { value: 'medication', label: 'İlaç', icon: 'pill' },
        { value: 'measurement', label: 'Ölçüm', icon: 'heart-pulse' },
        { value: 'appointment', label: 'Randevu', icon: 'calendar' },
        { value: 'activity', label: 'Aktivite', icon: 'activity' },
        { value: 'nutrition', label: 'Beslenme', icon: 'utensils' },
        { value: 'water', label: 'Su', icon: 'droplet' },
        { value: 'custom', label: 'Özel', icon: 'bell' }
      ],
      measurementTypeOptions: [
        { value: 'bloodSugar', label: 'Kan Şekeri' },
        { value: 'bloodPressure', label: 'Tansiyon' },
        { value: 'weight', label: 'Kilo' },
        { value: 'temperature', label: 'Vücut Sıcaklığı' },
        { value: 'other', label: 'Diğer' }
      ],
      frequencyOptions: [
        { value: 'once', label: 'Bir kere' },
        { value: 'daily', label: 'Her gün' },
        { value: 'weekly', label: 'Haftalık' },
        { value: 'monthly', label: 'Aylık' },
        { value: 'custom', label: 'Özel' }
      ],
      daysOfWeekOptions: [
        { value: 'pazartesi', label: 'Pazartesi' },
        { value: 'salı', label: 'Salı' },
        { value: 'çarşamba', label: 'Çarşamba' },
        { value: 'perşembe', label: 'Perşembe' },
        { value: 'cuma', label: 'Cuma' },
        { value: 'cumartesi', label: 'Cumartesi' },
        { value: 'pazar', label: 'Pazar' }
      ],
      priorityOptions: [
        { value: 'low', label: 'Düşük' },
        { value: 'medium', label: 'Orta' },
        { value: 'high', label: 'Yüksek' },
        { value: 'critical', label: 'Kritik' }
      ],
      customIntervalUnitOptions: [
        { value: 'gün', label: 'Gün' },
        { value: 'hafta', label: 'Hafta' },
        { value: 'ay', label: 'Ay' }
      ]
    });
  } catch (error) {
    logError(error, req);
    
    if (error.name === 'CastError') {
      req.flash('error_msg', 'Geçersiz ID formatı');
      return res.redirect('/home');
    }
    
    res.status(500).render('500', {
      title: 'Sunucu Hatası',
      message: 'Hatırlatıcı düzenleme sayfası yüklenirken bir hata oluştu',
      error: process.env.NODE_ENV === 'development' ? error : {}
    });
  }
};

/**
 * Hatırlatıcı güncelleme
 * @route   PUT /reminder/:familyMemberId/:reminderId
 * @access  Private
 */
exports.updateReminder = async (req, res) => {
  try {
    const { familyMemberId, reminderId } = req.params;
    
    // Aile üyesini kontrol et
    const familyMember = await FamilyMember.findOne({
      _id: familyMemberId,
      userId: req.user._id
    });
    
    if (!familyMember) {
      req.flash('error_msg', 'Aile üyesi bulunamadı');
      return res.redirect('/home');
    }
    
    // Hatırlatıcıyı bul
    const reminder = await Reminder.findOne({
      _id: reminderId,
      familyMemberId
    });
    
    if (!reminder) {
      req.flash('error_msg', 'Hatırlatıcı bulunamadı');
      return res.redirect(`/reminder/${familyMemberId}`);
    }
    
    // Form verilerini al
    const { 
      title,
      description,
      'schedule.startDate': startDate,
      'schedule.endDate': endDate,
      'schedule.time': time,
      'schedule.frequency': frequency,
      priority,
      isActive
    } = req.body;
    
    // Temel bilgileri güncelle
    reminder.title = title;
    reminder.description = description;
    reminder.schedule.startDate = new Date(startDate);
    reminder.schedule.endDate = endDate ? new Date(endDate) : undefined;
    reminder.schedule.time = time;
    reminder.schedule.frequency = frequency;
    reminder.priority = priority || 'medium';
    reminder.isActive = isActive === 'on';
    reminder.updatedBy = req.user._id;
    
    // Türe özgü alanları güncelle
    if (reminder.type === 'medication') {
      reminder.medication = {
        medicationId: req.body['medication.medicationId'],
        dosage: req.body['medication.dosage'],
        withFood: req.body['medication.withFood'] === 'on',
        instructions: req.body['medication.instructions']
      };
    }
    
    if (reminder.type === 'measurement') {
      reminder.measurement = {
        type: req.body['measurement.type'],
        fasting: req.body['measurement.fasting'] === 'on',
        instructions: req.body['measurement.instructions']
      };
    }
    
    if (reminder.type === 'appointment') {
      reminder.appointment = {
        doctorName: req.body['appointment.doctorName'],
        specialty: req.body['appointment.specialty'],
        hospital: req.body['appointment.hospital'],
        address: req.body['appointment.address'],
        phone: req.body['appointment.phone'],
        reason: req.body['appointment.reason'],
        instructions: req.body['appointment.instructions']
      };
    }
    
    // Frekans ayarları
    reminder.schedule.daysOfWeek = [];
    reminder.schedule.daysOfMonth = [];
    reminder.schedule.customInterval = undefined;
    
    if (frequency === 'weekly' && req.body['schedule.daysOfWeek']) {
      // Gelen veri tek bir değer ise, dizi haline getir
      const daysOfWeek = Array.isArray(req.body['schedule.daysOfWeek']) 
        ? req.body['schedule.daysOfWeek'] 
        : [req.body['schedule.daysOfWeek']];
      
      reminder.schedule.daysOfWeek = daysOfWeek;
    }
    
    if (frequency === 'monthly' && req.body['schedule.daysOfMonth']) {
      // Gelen veri tek bir değer ise, dizi haline getir
      const daysOfMonth = Array.isArray(req.body['schedule.daysOfMonth'])
        ? req.body['schedule.daysOfMonth'].map(Number)
        : [parseInt(req.body['schedule.daysOfMonth'])];
      
      reminder.schedule.daysOfMonth = daysOfMonth;
    }
    
    if (frequency === 'custom' && req.body['schedule.customInterval.value']) {
      reminder.schedule.customInterval = {
        value: parseInt(req.body['schedule.customInterval.value']),
        unit: req.body['schedule.customInterval.unit'] || 'gün'
      };
    }
    
    // Bildirim ayarları
    reminder.notification = {
      channels: {
        app: req.body['notification.channels.app'] === 'on',
        email: req.body['notification.channels.email'] === 'on',
        sms: req.body['notification.channels.sms'] === 'on'
      },
      sound: req.body['notification.sound'],
      vibration: req.body['notification.vibration'] === 'on',
      repeat: {
        enabled: req.body['notification.repeat.enabled'] === 'on',
        interval: req.body['notification.repeat.interval'] ? parseInt(req.body['notification.repeat.interval']) : 5,
        maxCount: req.body['notification.repeat.maxCount'] ? parseInt(req.body['notification.repeat.maxCount']) : 3
      }
    };
    
    // Bir sonraki zamanı hesapla
    reminder.scheduleNext();
    
    // Veriyi kaydet
    await reminder.save();
    
    // Log kaydı
    logInfo('Hatırlatıcı güncellendi', {
      userId: req.user._id,
      familyMemberId,
      reminderId,
      type: reminder.type
    });
    
    req.flash('success_msg', 'Hatırlatıcı başarıyla güncellendi');
    
    // Hatırlatıcı detay sayfasına yönlendir
    res.redirect(`/reminder/${familyMemberId}/${reminderId}`);
  } catch (error) {
    logError(error, req);
    
    if (error.name === 'ValidationError') {
      req.flash('error_msg', 'Geçersiz veya eksik veri');
      return res.redirect(`/reminder/${req.params.familyMemberId}/${req.params.reminderId}/edit`);
    }
    
    req.flash('error_msg', 'Hatırlatıcı güncellenirken bir hata oluştu');
    res.redirect(`/reminder/${req.params.familyMemberId}/${req.params.reminderId}/edit`);
  }
};

/**
 * Hatırlatıcı silme
 * @route   DELETE /reminder/:familyMemberId/:reminderId
 * @access  Private
 */
exports.deleteReminder = async (req, res) => {
  try {
    const { familyMemberId, reminderId } = req.params;
    
    // Aile üyesini kontrol et
    const familyMember = await FamilyMember.findOne({
      _id: familyMemberId,
      userId: req.user._id
    });
    
    if (!familyMember) {
      req.flash('error_msg', 'Aile üyesi bulunamadı');
      return res.redirect('/home');
    }
    
    // Hatırlatıcıyı bul ve sil
    const reminder = await Reminder.findOneAndDelete({
      _id: reminderId,
      familyMemberId
    });
    
    if (!reminder) {
      req.flash('error_msg', 'Hatırlatıcı bulunamadı');
      return res.redirect(`/reminder/${familyMemberId}`);
    }
    
    // Log kaydı
    logInfo('Hatırlatıcı silindi', {
      userId: req.user._id,
      familyMemberId,
      reminderId,
      type: reminder.type
    });
    
    req.flash('success_msg', 'Hatırlatıcı başarıyla silindi');
    
    // Hatırlatıcılar listesine yönlendir
    res.redirect(`/reminder/${familyMemberId}`);
  } catch (error) {
    logError(error, req);
    
    if (error.name === 'CastError') {
      req.flash('error_msg', 'Geçersiz ID formatı');
      return res.redirect(`/reminder/${req.params.familyMemberId}`);
    }
    
    req.flash('error_msg', 'Hatırlatıcı silinirken bir hata oluştu');
    res.redirect(`/reminder/${req.params.familyMemberId}`);
  }
};

/**
 * Hatırlatıcı tamamlama
 * @route   POST /reminder/:familyMemberId/:reminderId/complete
 * @access  Private
 */
exports.completeReminder = async (req, res) => {
  try {
    const { familyMemberId, reminderId } = req.params;
    
    // Aile üyesini kontrol et
    const familyMember = await FamilyMember.findOne({
      _id: familyMemberId,
      userId: req.user._id
    });
    
    if (!familyMember) {
      req.flash('error_msg', 'Aile üyesi bulunamadı');
      return res.redirect('/home');
    }
    
    // Hatırlatıcıyı bul
    const reminder = await Reminder.findOne({
      _id: reminderId,
      familyMemberId
    });
    
    if (!reminder) {
      req.flash('error_msg', 'Hatırlatıcı bulunamadı');
      return res.redirect(`/reminder/${familyMemberId}`);
    }
    
    // Tamamlama durumu
    const status = req.body.status || 'completed';
    const notes = req.body.notes;
    
    // Hatırlatıcıyı tamamla
    reminder.markCompletion(status, notes);
    
    // Veriyi kaydet
    await reminder.save();
    
    // Log kaydı
    logInfo('Hatırlatıcı tamamlandı', {
      userId: req.user._id,
      familyMemberId,
      reminderId,
      type: reminder.type,
      status
    });
    
    // API isteği ise JSON döndür
    if (req.xhr || req.headers.accept.indexOf('application/json') !== -1) {
      return res.json({
        success: true,
        message: 'Hatırlatıcı işaretlendi',
        status,
        nextScheduled: reminder.schedule.nextScheduled
      });
    }
    
    req.flash('success_msg', 'Hatırlatıcı işaretlendi');
    
    // Hatırlatıcılar listesine yönlendir
    res.redirect(`/reminder/${familyMemberId}`);
  } catch (error) {
    logError(error, req);
    
    // API isteği ise JSON döndür
    if (req.xhr || req.headers.accept.indexOf('application/json') !== -1) {
      return res.status(500).json({
        success: false,
        error: 'Hatırlatıcı işaretlenirken bir hata oluştu'
      });
    }
    
    req.flash('error_msg', 'Hatırlatıcı işaretlenirken bir hata oluştu');
    res.redirect(`/reminder/${req.params.familyMemberId}`);
  }
};

/**
 * Bugünkü hatırlatıcıları getir
 * @route   GET /reminder/:familyMemberId/today
 * @access  Private
 */
exports.getTodayReminders = async (req, res) => {
  try {
    const { familyMemberId } = req.params;
    
    // Aile üyesini kontrol et
    const familyMember = await FamilyMember.findOne({
      _id: familyMemberId,
      userId: req.user._id
    });
    
    if (!familyMember) {
      req.flash('error_msg', 'Aile üyesi bulunamadı');
      return res.redirect('/home');
    }
    
    // Bugünkü hatırlatıcıları bul
    const todayReminders = await Reminder.findTodayReminders(familyMemberId);
    
    // İlaç bilgilerini getir
    for (const reminder of todayReminders) {
      if (reminder.type === 'medication' && reminder.medication && reminder.medication.medicationId) {
        reminder.medication.details = await Medication.findById(reminder.medication.medicationId)
          .select('name dosage.value dosage.unit dosage.form');
      }
    }
    
    // Şimdi ve sonraki hatırlatıcıları ayır
    const now = new Date();
    
    const currentReminders = todayReminders.filter(reminder => {
      if (!reminder.schedule.nextScheduled) return false;
      
      const reminderTime = new Date(reminder.schedule.nextScheduled);
      const timeDiff = (reminderTime - now) / (1000 * 60); // Dakika cinsinden fark
      
      return timeDiff >= -30 && timeDiff <= 30; // Şu andan 30 dk önce ve sonrası
    });
    
    const upcomingReminders = todayReminders.filter(reminder => {
      if (!reminder.schedule.nextScheduled) return false;
      
      const reminderTime = new Date(reminder.schedule.nextScheduled);
      const timeDiff = (reminderTime - now) / (1000 * 60); // Dakika cinsinden fark
      
      return timeDiff > 30; // Şu andan 30 dk sonrası
    });
    
    const pastReminders = todayReminders.filter(reminder => {
      if (!reminder.schedule.nextScheduled) return false;
      
      const reminderTime = new Date(reminder.schedule.nextScheduled);
      const timeDiff = (reminderTime - now) / (1000 * 60); // Dakika cinsinden fark
      
      return timeDiff < -30; // Şu andan 30 dk öncesi
    });
    
    // Bugünkü hatırlatıcılar sayfasını render et
    res.render('front/reminder-today', {
      title: `${familyMember.name} ${familyMember.surname} - Bugünkü Hatırlatıcılar`,
      familyMember,
      currentReminders,
      upcomingReminders,
      pastReminders,
      reminderTypeMap: {
        'medication': 'İlaç',
        'measurement': 'Ölçüm',
        'appointment': 'Randevu',
        'activity': 'Aktivite',
        'nutrition': 'Beslenme',
        'water': 'Su',
        'custom': 'Özel'
      },
      priorityMap: {
        'low': { label: 'Düşük', color: 'text-info' },
        'medium': { label: 'Orta', color: 'text-success' },
        'high': { label: 'Yüksek', color: 'text-warning' },
        'critical': { label: 'Kritik', color: 'text-danger' }
      }
    });
  } catch (error) {
    logError(error, req);
    
    if (error.name === 'CastError') {
      req.flash('error_msg', 'Geçersiz aile üyesi ID formatı');
      return res.redirect('/home');
    }
    
    res.status(500).render('500', {
      title: 'Sunucu Hatası',
      message: 'Bugünkü hatırlatıcılar alınırken bir hata oluştu',
      error: process.env.NODE_ENV === 'development' ? error : {}
    });
  }
};

/**
 * API: Hatırlatıcıları listele
 * @route   GET /api/reminder/:familyMemberId
 * @access  Private
 */
exports.apiGetReminderList = async (req, res) => {
  try {
    const { familyMemberId } = req.params;
    
    // Aile üyesini kontrol et (admin her aile üyesine erişebilir)
    let familyMember;
    
    if (req.isAdmin) {
      familyMember = await FamilyMember.findById(familyMemberId);
    } else {
      familyMember = await FamilyMember.findOne({
        _id: familyMemberId,
        userId: req.user._id
      });
    }
    
    if (!familyMember) {
      return res.status(404).json({
        success: false,
        error: 'Aile üyesi bulunamadı'
      });
    }
    
    // Filtreleme parametreleri
    const filter = { familyMemberId };
    
    if (req.query.type) {
      filter.type = req.query.type;
    }
    
    if (req.query.priority) {
      filter.priority = req.query.priority;
    }
    
    if (req.query.isActive !== undefined) {
      filter.isActive = req.query.isActive === 'true';
    }
    
    // Sayfalama
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    
    // Toplam kayıt sayısı
    const total = await Reminder.countDocuments(filter);
    
    // Hatırlatıcıları getir
    const reminders = await Reminder.find(filter)
      .sort({ 'schedule.nextScheduled': 1 })
      .skip(skip)
      .limit(limit);
    
    // Formatlı verileri hazırla
    const formattedData = reminders.map(reminder => ({
      id: reminder._id,
      familyMemberId: reminder.familyMemberId,
      type: reminder.type,
      title: reminder.title,
      priority: reminder.priority,
      isActive: reminder.isActive,
      nextScheduled: reminder.schedule.nextScheduled,
      frequency: reminder.schedule.frequency,
      adherenceRate: reminder.stats.adherenceRate,
      createdAt: reminder.createdAt
    }));
    
    // API yanıtı
    res.json({
      success: true,
      count: formattedData.length,
      total,
      pagination: {
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      },
      data: formattedData
    });
  } catch (error) {
    logError(error, req);
    
    res.status(500).json({
      success: false,
      error: 'Hatırlatıcılar alınırken bir hata oluştu'
    });
  }
};

/**
 * API: Hatırlatıcı detayı
 * @route   GET /api/reminder/:familyMemberId/:reminderId
 * @access  Private
 */
exports.apiGetReminderDetail = async (req, res) => {
  try {
    const { familyMemberId, reminderId } = req.params;
    
    // Aile üyesini kontrol et (admin her aile üyesine erişebilir)
    let familyMember;
    
    if (req.isAdmin) {
      familyMember = await FamilyMember.findById(familyMemberId);
    } else {
      familyMember = await FamilyMember.findOne({
        _id: familyMemberId,
        userId: req.user._id
      });
    }
    
    if (!familyMember) {
      return res.status(404).json({
        success: false,
        error: 'Aile üyesi bulunamadı'
      });
    }
    
    // Hatırlatıcıyı bul
    const reminder = await Reminder.findOne({
      _id: reminderId,
      familyMemberId
    });
    
    if (!reminder) {
      return res.status(404).json({
        success: false,
        error: 'Hatırlatıcı bulunamadı'
      });
    }
    
    // İlaç bilgilerini getir
    let medication = null;
    if (reminder.type === 'medication' && reminder.medication && reminder.medication.medicationId) {
      medication = await Medication.findById(reminder.medication.medicationId)
        .select('name dosage.value dosage.unit dosage.form');
    }
    
    // API yanıtı
    res.json({
      success: true,
      data: {
        ...reminder.toObject(),
        medicationDetails: medication
      }
    });
  } catch (error) {
    logError(error, req);
    
    res.status(500).json({
      success: false,
      error: 'Hatırlatıcı detayı alınırken bir hata oluştu'
    });
  }
};

/**
 * API: Hatırlatıcı ekleme
 * @route   POST /api/reminder
 * @access  Private
 */
exports.apiAddReminder = async (req, res) => {
  try {
    const { familyMemberId } = req.body;
    
    if (!familyMemberId) {
      return res.status(400).json({
        success: false,
        error: 'Aile üyesi ID\'si belirtilmedi'
      });
    }
    
    // Aile üyesini kontrol et (admin her aile üyesine erişebilir)
    let familyMember;
    
    if (req.isAdmin) {
      familyMember = await FamilyMember.findById(familyMemberId);
    } else {
      familyMember = await FamilyMember.findOne({
        _id: familyMemberId,
        userId: req.user._id
      });
    }
    
    if (!familyMember) {
      return res.status(404).json({
        success: false,
        error: 'Aile üyesi bulunamadı'
      });
    }
    
    // Hatırlatıcı oluştur
    const reminder = new Reminder({
      ...req.body,
      createdBy: req.user._id
    });
    
    // Bir sonraki zamanı hesapla
    reminder.scheduleNext();
    
    // Hatırlatıcıyı kaydet
    await reminder.save();
    
    // Log kaydı
    logInfo('API: Hatırlatıcı eklendi', {
      userId: req.user._id,
      familyMemberId,
      reminderId: reminder._id,
      type: reminder.type
    });
    
    // API yanıtı
    res.status(201).json({
      success: true,
      data: reminder
    });
  } catch (error) {
    logError(error, req);
    
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        error: 'Geçersiz veri formatı',
        details: Object.values(error.errors).map(err => err.message)
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Hatırlatıcı eklenirken bir hata oluştu'
    });
  }
};

/**
 * API: Hatırlatıcı güncelleme
 * @route   PUT /api/reminder/:reminderId
 * @access  Private
 */
exports.apiUpdateReminder = async (req, res) => {
  try {
    const { reminderId } = req.params;
    const { familyMemberId } = req.body;
    
    if (!familyMemberId) {
      return res.status(400).json({
        success: false,
        error: 'Aile üyesi ID\'si belirtilmedi'
      });
    }
    
    // Aile üyesini kontrol et (admin her aile üyesine erişebilir)
    let familyMember;
    
    if (req.isAdmin) {
      familyMember = await FamilyMember.findById(familyMemberId);
    } else {
      familyMember = await FamilyMember.findOne({
        _id: familyMemberId,
        userId: req.user._id
      });
    }
    
    if (!familyMember) {
      return res.status(404).json({
        success: false,
        error: 'Aile üyesi bulunamadı'
      });
    }
    
    // Hatırlatıcıyı bul
    let reminder = await Reminder.findOne({
      _id: reminderId,
      familyMemberId
    });
    
    if (!reminder) {
      return res.status(404).json({
        success: false,
        error: 'Hatırlatıcı bulunamadı'
      });
    }
    
    // Güncellenecek alanlar
    const updateFields = [
      'title', 'description', 'schedule', 'priority', 'isActive', 
      'medication', 'measurement', 'appointment', 'notification'
    ];
    
    // Alanları güncelle
    updateFields.forEach(field => {
      if (req.body[field] !== undefined) {
        reminder[field] = req.body[field];
      }
    });
    
    // Son güncelleyen kullanıcıyı kaydet
    reminder.updatedBy = req.user._id;
    
    // Bir sonraki zamanı hesapla
    reminder.scheduleNext();
    
    // Hatırlatıcıyı kaydet
    await reminder.save();
    
    // Log kaydı
    logInfo('API: Hatırlatıcı güncellendi', {
      userId: req.user._id,
      familyMemberId,
      reminderId,
      type: reminder.type
    });
    
    // API yanıtı
    res.json({
      success: true,
      data: reminder
    });
  } catch (error) {
    logError(error, req);
    
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        error: 'Geçersiz veri formatı',
        details: Object.values(error.errors).map(err => err.message)
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Hatırlatıcı güncellenirken bir hata oluştu'
    });
  }
};

/**
 * API: Hatırlatıcı silme
 * @route   DELETE /api/reminder/:reminderId
 * @access  Private
 */
exports.apiDeleteReminder = async (req, res) => {
    try {
      const { reminderId } = req.params;
      
      // Hatırlatıcıyı bul
      const reminder = await Reminder.findById(reminderId);
      
      if (!reminder) {
        return res.status(404).json({
          success: false,
          error: 'Hatırlatıcı bulunamadı'
        });
      }
      
      // Aile üyesini kontrol et
      let familyMember;
      
      if (req.isAdmin) {
        familyMember = await FamilyMember.findById(reminder.familyMemberId);
      } else {
        familyMember = await FamilyMember.findOne({
          _id: reminder.familyMemberId,
          userId: req.user._id
        });
      }
      
      if (!familyMember) {
        return res.status(403).json({
          success: false,
          error: 'Bu hatırlatıcıyı silme yetkiniz yok'
        });
      }
      
      // Hatırlatıcıyı sil
      await reminder.remove();
      
      // Log kaydı
      logInfo('API: Hatırlatıcı silindi', {
        userId: req.user._id,
        familyMemberId: reminder.familyMemberId,
        reminderId,
        type: reminder.type
      });
      
      // API yanıtı
      res.json({
        success: true,
        data: {}
      });
    } catch (error) {
      logError(error, req);
      
      res.status(500).json({
        success: false,
        error: 'Hatırlatıcı silinirken bir hata oluştu'
      });
    }
  };
  
  /**
   * API: Hatırlatıcı tamamlama
   * @route   POST /api/reminder/:reminderId/complete
   * @access  Private
   */
  exports.apiCompleteReminder = async (req, res) => {
    try {
      const { reminderId } = req.params;
      
      // Hatırlatıcıyı bul
      const reminder = await Reminder.findById(reminderId);
      
      if (!reminder) {
        return res.status(404).json({
          success: false,
          error: 'Hatırlatıcı bulunamadı'
        });
      }
      
      // Aile üyesini kontrol et
      let familyMember;
      
      if (req.isAdmin) {
        familyMember = await FamilyMember.findById(reminder.familyMemberId);
      } else {
        familyMember = await FamilyMember.findOne({
          _id: reminder.familyMemberId,
          userId: req.user._id
        });
      }
      
      if (!familyMember) {
        return res.status(403).json({
          success: false,
          error: 'Bu hatırlatıcıyı tamamlama yetkiniz yok'
        });
      }
      
      // Tamamlama durumu
      const status = req.body.status || 'completed';
      const notes = req.body.notes;
      
      // Hatırlatıcıyı tamamla
      reminder.markCompletion(status, notes);
      
      // Veriyi kaydet
      await reminder.save();
      
      // Log kaydı
      logInfo('API: Hatırlatıcı tamamlandı', {
        userId: req.user._id,
        familyMemberId: reminder.familyMemberId,
        reminderId,
        type: reminder.type,
        status
      });
      
      // API yanıtı
      res.json({
        success: true,
        message: 'Hatırlatıcı işaretlendi',
        status,
        nextScheduled: reminder.schedule.nextScheduled,
        stats: reminder.stats
      });
    } catch (error) {
      logError(error, req);
      
      res.status(500).json({
        success: false,
        error: 'Hatırlatıcı tamamlanırken bir hata oluştu'
      });
    }
  };
  
  /**
   * API: Bugünkü hatırlatıcıları getir
   * @route   GET /api/reminder/:familyMemberId/today
   * @access  Private
   */
  exports.apiGetTodayReminders = async (req, res) => {
    try {
      const { familyMemberId } = req.params;
      
      // Aile üyesini kontrol et
      let familyMember;
      
      if (req.isAdmin) {
        familyMember = await FamilyMember.findById(familyMemberId);
      } else {
        familyMember = await FamilyMember.findOne({
          _id: familyMemberId,
          userId: req.user._id
        });
      }
      
      if (!familyMember) {
        return res.status(404).json({
          success: false,
          error: 'Aile üyesi bulunamadı'
        });
      }
      
      // Bugünkü hatırlatıcıları bul
      const todayReminders = await Reminder.findTodayReminders(familyMemberId);
      
      // İlaç bilgilerini getir
      for (const reminder of todayReminders) {
        if (reminder.type === 'medication' && reminder.medication && reminder.medication.medicationId) {
          reminder.medication.details = await Medication.findById(reminder.medication.medicationId)
            .select('name dosage.value dosage.unit dosage.form');
        }
      }
      
      // API yanıtı
      res.json({
        success: true,
        count: todayReminders.length,
        data: todayReminders
      });
    } catch (error) {
      logError(error, req);
      
      res.status(500).json({
        success: false,
        error: 'Bugünkü hatırlatıcılar alınırken bir hata oluştu'
      });
    }
  };
  
  /**
   * API: Yaklaşan hatırlatıcıları getir
   * @route   GET /api/reminder/:familyMemberId/upcoming
   * @access  Private
   */
  exports.apiGetUpcomingReminders = async (req, res) => {
    try {
      const { familyMemberId } = req.params;
      const days = parseInt(req.query.days) || 7;
      
      // Aile üyesini kontrol et
      let familyMember;
      
      if (req.isAdmin) {
        familyMember = await FamilyMember.findById(familyMemberId);
      } else {
        familyMember = await FamilyMember.findOne({
          _id: familyMemberId,
          userId: req.user._id
        });
      }
      
      if (!familyMember) {
        return res.status(404).json({
          success: false,
          error: 'Aile üyesi bulunamadı'
        });
      }
      
      // Yaklaşan hatırlatıcıları bul
      const upcomingReminders = await Reminder.findUpcomingReminders(familyMemberId, days);
      
      // İlaç bilgilerini getir
      for (const reminder of upcomingReminders) {
        if (reminder.type === 'medication' && reminder.medication && reminder.medication.medicationId) {
          reminder.medication.details = await Medication.findById(reminder.medication.medicationId)
            .select('name dosage.value dosage.unit dosage.form');
        }
      }
      
      // API yanıtı
      res.json({
        success: true,
        count: upcomingReminders.length,
        data: upcomingReminders
      });
    } catch (error) {
      logError(error, req);
      
      res.status(500).json({
        success: false,
        error: 'Yaklaşan hatırlatıcılar alınırken bir hata oluştu'
      });
    }
  };
  
  module.exports = exports;
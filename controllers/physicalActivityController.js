const PhysicalActivity = require('../models/PhysicalActivity');
const FamilyMember = require('../models/FamilyMember');
const HealthData = require('../models/HealthData');
const { logError, logInfo } = require('../middlewares/logger');
const mongoose = require('mongoose');

/**
 * Fiziksel aktiviteleri listele
 * @route   GET /activity/:familyMemberId
 * @access  Private
 */
exports.getActivityList = async (req, res) => {
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
    
    if (req.query.activityType) {
      filter.activityType = req.query.activityType;
    }
    
    if (req.query.startDate && req.query.endDate) {
      filter.startTime = {
        $gte: new Date(req.query.startDate),
        $lte: new Date(req.query.endDate)
      };
    } else if (req.query.startDate) {
      filter.startTime = { $gte: new Date(req.query.startDate) };
    } else if (req.query.endDate) {
      filter.startTime = { $lte: new Date(req.query.endDate) };
    }
    
    // Toplam kayıt sayısı
    const total = await PhysicalActivity.countDocuments(filter);
    
    // Aktiviteleri getir
    const activities = await PhysicalActivity.find(filter)
      .sort({ startTime: -1 })
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
    
    // Aktivite türlerini gruplandır
    const activityTypes = await PhysicalActivity.aggregate([
      { $match: { familyMemberId: mongoose.Types.ObjectId(familyMemberId) } },
      { $group: { _id: '$activityType', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    
    // Son 30 günlük aktivite istatistikleri
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const activityStats = await PhysicalActivity.aggregate([
      { 
        $match: { 
          familyMemberId: mongoose.Types.ObjectId(familyMemberId),
          startTime: { $gte: thirtyDaysAgo }
        } 
      },
      {
        $group: {
          _id: null,
          totalActivities: { $sum: 1 },
          totalDuration: { $sum: '$duration' },
          totalCalories: { $sum: '$calories' },
          totalDistance: { 
            $sum: { 
              $cond: [
                { $eq: ['$distance.unit', 'km'] }, 
                '$distance.value', 
                { $cond: [
                  { $eq: ['$distance.unit', 'm'] },
                  { $divide: ['$distance.value', 1000] },
                  { $multiply: ['$distance.value', 1.60934] } // mil -> km
                ]}
              ]
            } 
          },
          avgHeartRate: { $avg: '$heartRate.average' }
        }
      }
    ]);
    
    // Aktivite türü seçenekleri
    const activityTypeOptions = [
      { value: 'yürüyüş', label: 'Yürüyüş', icon: 'walking' },
      { value: 'koşu', label: 'Koşu', icon: 'running' },
      { value: 'bisiklet', label: 'Bisiklet', icon: 'bike' },
      { value: 'yüzme', label: 'Yüzme', icon: 'swimming' },
      { value: 'fitness', label: 'Fitness', icon: 'dumbbell' },
      { value: 'yoga', label: 'Yoga', icon: 'yoga' },
      { value: 'pilates', label: 'Pilates', icon: 'pilates' },
      { value: 'dans', label: 'Dans', icon: 'dancing' },
      { value: 'futbol', label: 'Futbol', icon: 'soccer' },
      { value: 'basketbol', label: 'Basketbol', icon: 'basketball' },
      { value: 'tenis', label: 'Tenis', icon: 'tennis' },
      { value: 'voleybol', label: 'Voleybol', icon: 'volleyball' },
      { value: 'golf', label: 'Golf', icon: 'golf' },
      { value: 'dağcılık', label: 'Dağcılık', icon: 'hiking' },
      { value: 'ev_egzersizi', label: 'Ev Egzersizi', icon: 'home' },
      { value: 'bahçe_işleri', label: 'Bahçe İşleri', icon: 'gardening' },
      { value: 'merdiven_çıkma', label: 'Merdiven Çıkma', icon: 'stairs' },
      { value: 'diğer', label: 'Diğer', icon: 'other' }
    ];
    
    // Sayfayı render et
    res.render('front/activity-list', {
      title: `${familyMember.name} ${familyMember.surname} - Fiziksel Aktiviteler`,
      familyMember,
      activities,
      pagination,
      filter: req.query,
      activityTypes,
      activityStats: activityStats.length > 0 ? activityStats[0] : null,
      activityTypeOptions
    });
  } catch (error) {
    logError(error, req);
    
    if (error.name === 'CastError') {
      req.flash('error_msg', 'Geçersiz aile üyesi ID formatı');
      return res.redirect('/home');
    }
    
    res.status(500).render('500', {
      title: 'Sunucu Hatası',
      message: 'Aktivite verileri alınırken bir hata oluştu',
      error: process.env.NODE_ENV === 'development' ? error : {}
    });
  }
};

/**
 * Yeni aktivite ekleme sayfası
 * @route   GET /activity/:familyMemberId/add
 * @access  Private
 */
exports.getAddActivity = async (req, res) => {
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
    
    // Aktivite türünü al (opsiyonel)
    const activityType = req.query.activityType || 'yürüyüş';
    
    // Aktivite ekleme sayfasını render et
    res.render('front/activity-form', {
      title: `${familyMember.name} ${familyMember.surname} - Aktivite Ekle`,
      familyMember,
      activityType,
      formAction: `/activity/${familyMemberId}`,
      formMethod: 'POST',
      activity: null,
      activityTypeOptions: [
        { value: 'yürüyüş', label: 'Yürüyüş', icon: 'walking' },
        { value: 'koşu', label: 'Koşu', icon: 'running' },
        { value: 'bisiklet', label: 'Bisiklet', icon: 'bike' },
        { value: 'yüzme', label: 'Yüzme', icon: 'swimming' },
        { value: 'fitness', label: 'Fitness', icon: 'dumbbell' },
        { value: 'yoga', label: 'Yoga', icon: 'yoga' },
        { value: 'pilates', label: 'Pilates', icon: 'pilates' },
        { value: 'dans', label: 'Dans', icon: 'dancing' },
        { value: 'futbol', label: 'Futbol', icon: 'soccer' },
        { value: 'basketbol', label: 'Basketbol', icon: 'basketball' },
        { value: 'tenis', label: 'Tenis', icon: 'tennis' },
        { value: 'voleybol', label: 'Voleybol', icon: 'volleyball' },
        { value: 'golf', label: 'Golf', icon: 'golf' },
        { value: 'dağcılık', label: 'Dağcılık', icon: 'hiking' },
        { value: 'ev_egzersizi', label: 'Ev Egzersizi', icon: 'home' },
        { value: 'bahçe_işleri', label: 'Bahçe İşleri', icon: 'gardening' },
        { value: 'merdiven_çıkma', label: 'Merdiven Çıkma', icon: 'stairs' },
        { value: 'diğer', label: 'Diğer', icon: 'other' }
      ],
      intensityOptions: [
        { value: 'hafif', label: 'Hafif' },
        { value: 'orta', label: 'Orta' },
        { value: 'yüksek', label: 'Yüksek' },
        { value: 'maksimum', label: 'Maksimum' }
      ],
      distanceUnits: [
        { value: 'km', label: 'Kilometre (km)' },
        { value: 'm', label: 'Metre (m)' },
        { value: 'mil', label: 'Mil' }
      ],
      moodOptions: [
        { value: 'çok_kötü', label: 'Çok Kötü' },
        { value: 'kötü', label: 'Kötü' },
        { value: 'normal', label: 'Normal' },
        { value: 'iyi', label: 'İyi' },
        { value: 'çok_iyi', label: 'Çok İyi' }
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
      message: 'Aktivite ekleme sayfası yüklenirken bir hata oluştu',
      error: process.env.NODE_ENV === 'development' ? error : {}
    });
  }
};

/**
 * Aktivite ekleme
 * @route   POST /activity/:familyMemberId
 * @access  Private
 */
exports.addActivity = async (req, res) => {
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
      activityType,
      startTime,
      endTime,
      duration,
      distance,
      steps,
      calories,
      intensity,
      notes
    } = req.body;
    
    // Yeni aktivite oluştur
    const activity = new PhysicalActivity({
      familyMemberId,
      activityType,
      startTime: new Date(startTime),
      endTime: endTime ? new Date(endTime) : undefined,
      duration: duration ? parseInt(duration) : undefined,
      intensity: intensity || 'orta',
      createdBy: req.user._id
    });
    
    // Mesafe bilgilerini doldur
    if (req.body['distance.value']) {
      activity.distance = {
        value: parseFloat(req.body['distance.value']),
        unit: req.body['distance.unit'] || 'km'
      };
    }
    
    // Adım sayısını doldur
    if (steps) {
      activity.steps = parseInt(steps);
    }
    
    // Kalori bilgisini doldur
    if (calories) {
      activity.calories = parseInt(calories);
    } else if (familyMember.weight) {
      // Eğer kalori bilgisi verilmemişse ve üye ağırlığı biliniyorsa hesapla
      activity.calculateCalories(familyMember.weight);
    }
    
    // Kalp hızı bilgilerini doldur
    if (req.body['heartRate.average'] || req.body['heartRate.max'] || req.body['heartRate.min']) {
      activity.heartRate = {
        average: req.body['heartRate.average'] ? parseFloat(req.body['heartRate.average']) : undefined,
        max: req.body['heartRate.max'] ? parseFloat(req.body['heartRate.max']) : undefined,
        min: req.body['heartRate.min'] ? parseFloat(req.body['heartRate.min']) : undefined
      };
    }
    
    // Performans metrikleri
    if (req.body['performanceMetrics.pace.value']) {
      if (!activity.performanceMetrics) {
        activity.performanceMetrics = {};
      }
      
      activity.performanceMetrics.pace = {
        value: parseFloat(req.body['performanceMetrics.pace.value']),
        unit: req.body['performanceMetrics.pace.unit'] || 'min/km'
      };
    }
    
    if (req.body['performanceMetrics.speed.value']) {
      if (!activity.performanceMetrics) {
        activity.performanceMetrics = {};
      }
      
      activity.performanceMetrics.speed = {
        value: parseFloat(req.body['performanceMetrics.speed.value']),
        unit: req.body['performanceMetrics.speed.unit'] || 'km/sa'
      };
    }
    
    // Kan şekeri ölçümleri
    if (req.body['bloodSugar.before.value']) {
      if (!activity.bloodSugar) {
        activity.bloodSugar = {};
      }
      
      activity.bloodSugar.before = {
        value: parseFloat(req.body['bloodSugar.before.value']),
        unit: req.body['bloodSugar.before.unit'] || 'mg/dL'
      };
    }
    
    if (req.body['bloodSugar.after.value']) {
      if (!activity.bloodSugar) {
        activity.bloodSugar = {};
      }
      
      activity.bloodSugar.after = {
        value: parseFloat(req.body['bloodSugar.after.value']),
        unit: req.body['bloodSugar.after.unit'] || 'mg/dL'
      };
    }
    
    // Tansiyon ölçümleri
    if (req.body['bloodPressure.before.systolic'] && req.body['bloodPressure.before.diastolic']) {
      if (!activity.bloodPressure) {
        activity.bloodPressure = {};
      }
      
      activity.bloodPressure.before = {
        systolic: parseFloat(req.body['bloodPressure.before.systolic']),
        diastolic: parseFloat(req.body['bloodPressure.before.diastolic']),
        unit: 'mmHg'
      };
    }
    
    if (req.body['bloodPressure.after.systolic'] && req.body['bloodPressure.after.diastolic']) {
      if (!activity.bloodPressure) {
        activity.bloodPressure = {};
      }
      
      activity.bloodPressure.after = {
        systolic: parseFloat(req.body['bloodPressure.after.systolic']),
        diastolic: parseFloat(req.body['bloodPressure.after.diastolic']),
        unit: 'mmHg'
      };
    }
    
    // Algılanan zorluk düzeyi
    if (req.body.perceivedExertion) {
      activity.perceivedExertion = parseInt(req.body.perceivedExertion);
    }
    
    // Ruh hali
    if (req.body['mood.before'] || req.body['mood.after']) {
      activity.mood = {
        before: req.body['mood.before'],
        after: req.body['mood.after']
      };
    }
    
    // Enerji seviyesi
    if (req.body['energyLevel.before'] || req.body['energyLevel.after']) {
      activity.energyLevel = {
        before: req.body['energyLevel.before'] ? parseInt(req.body['energyLevel.before']) : undefined,
        after: req.body['energyLevel.after'] ? parseInt(req.body['energyLevel.after']) : undefined
      };
    }
    
    // Belirtiler
    if (req.body['symptoms'] && Array.isArray(req.body['symptoms'])) {
      activity.symptoms = [];
      
      for (let i = 0; i < req.body['symptoms'].length; i++) {
        if (!req.body[`symptoms[${i}].type`]) continue;
        
        const symptom = {
          type: req.body[`symptoms[${i}].type`],
          severity: req.body[`symptoms[${i}].severity`] ? parseInt(req.body[`symptoms[${i}].severity`]) : undefined,
          time: req.body[`symptoms[${i}].time`] || 'during',
          notes: req.body[`symptoms[${i}].notes`]
        };
        
        activity.symptoms.push(symptom);
      }
    } else if (req.body['symptoms.type']) {
      const symptom = {
        type: req.body['symptoms.type'],
        severity: req.body['symptoms.severity'] ? parseInt(req.body['symptoms.severity']) : undefined,
        time: req.body['symptoms.time'] || 'during',
        notes: req.body['symptoms.notes']
      };
      
      activity.symptoms = [symptom];
    }
    
    // Hedefler
    if (req.body['goals.targetDistance'] || req.body['goals.targetDuration'] || 
        req.body['goals.targetCalories'] || req.body['goals.targetSteps']) {
      activity.goals = {
        targetDistance: req.body['goals.targetDistance'] ? parseFloat(req.body['goals.targetDistance']) : undefined,
        targetDuration: req.body['goals.targetDuration'] ? parseInt(req.body['goals.targetDuration']) : undefined,
        targetCalories: req.body['goals.targetCalories'] ? parseInt(req.body['goals.targetCalories']) : undefined,
        targetSteps: req.body['goals.targetSteps'] ? parseInt(req.body['goals.targetSteps']) : undefined
      };
      
      // Hedeflere ulaşılıp ulaşılmadığını kontrol et
      activity.checkGoals();
    }
    
    // Notlar
    if (notes) {
      activity.notes = notes;
    }
    
    // Aktivite fotoğrafı
    if (req.file) {
      activity.activityPhoto = {
        filename: req.file.filename,
        originalName: req.file.originalname,
        mimeType: req.file.mimetype,
        size: req.file.size,
        path: req.file.path,
        uploadDate: new Date()
      };
    }
    
    // Veriyi kaydet
    await activity.save();
    
    // Log kaydı
    logInfo('Yeni aktivite eklendi', {
      userId: req.user._id,
      familyMemberId,
      activityId: activity._id,
      activityType
    });
    
    // Kan şekeri veya tansiyon ölçümleri varsa sağlık verisi olarak da kaydet
    if (activity.bloodSugar && (activity.bloodSugar.before || activity.bloodSugar.after)) {
      // Aktivite öncesi kan şekeri
      if (activity.bloodSugar.before && activity.bloodSugar.before.value) {
        const healthData = new HealthData({
          familyMemberId,
          measuredBy: req.user._id,
          dataType: 'bloodSugar',
          measuredAt: new Date(activity.startTime),
          bloodSugar: {
            value: activity.bloodSugar.before.value,
            unit: activity.bloodSugar.before.unit,
            measurementType: 'random'
          },
          notes: `${activity.activityType} aktivitesi öncesi ölçülen kan şekeri.`
        });
        
        await healthData.save();
        
        logInfo('Aktivite kaydından kan şekeri verisi oluşturuldu', {
          userId: req.user._id,
          familyMemberId,
          activityId: activity._id,
          healthDataId: healthData._id,
          type: 'before'
        });
      }
      
      // Aktivite sonrası kan şekeri
      if (activity.bloodSugar.after && activity.bloodSugar.after.value) {
        const healthData = new HealthData({
          familyMemberId,
          measuredBy: req.user._id,
          dataType: 'bloodSugar',
          measuredAt: activity.endTime || new Date(),
          bloodSugar: {
            value: activity.bloodSugar.after.value,
            unit: activity.bloodSugar.after.unit,
            measurementType: 'random'
          },
          notes: `${activity.activityType} aktivitesi sonrası ölçülen kan şekeri.`
        });
        
        await healthData.save();
        
        logInfo('Aktivite kaydından kan şekeri verisi oluşturuldu', {
          userId: req.user._id,
          familyMemberId,
          activityId: activity._id,
          healthDataId: healthData._id,
          type: 'after'
        });
      }
    }
    
    // Tansiyon ölçümleri
    if (activity.bloodPressure && (activity.bloodPressure.before || activity.bloodPressure.after)) {
      // Aktivite öncesi tansiyon
      if (activity.bloodPressure.before && activity.bloodPressure.before.systolic && activity.bloodPressure.before.diastolic) {
        const healthData = new HealthData({
          familyMemberId,
          measuredBy: req.user._id,
          dataType: 'bloodPressure',
          measuredAt: new Date(activity.startTime),
          bloodPressure: {
            systolic: activity.bloodPressure.before.systolic,
            diastolic: activity.bloodPressure.before.diastolic,
            unit: 'mmHg',
            position: 'sitting'
          },
          notes: `${activity.activityType} aktivitesi öncesi ölçülen tansiyon.`
        });
        
        await healthData.save();
        
        logInfo('Aktivite kaydından tansiyon verisi oluşturuldu', {
          userId: req.user._id,
          familyMemberId,
          activityId: activity._id,
          healthDataId: healthData._id,
          type: 'before'
        });
      }
      
      // Aktivite sonrası tansiyon
      if (activity.bloodPressure.after && activity.bloodPressure.after.systolic && activity.bloodPressure.after.diastolic) {
        const healthData = new HealthData({
          familyMemberId,
          measuredBy: req.user._id,
          dataType: 'bloodPressure',
          measuredAt: activity.endTime || new Date(),
          bloodPressure: {
            systolic: activity.bloodPressure.after.systolic,
            diastolic: activity.bloodPressure.after.diastolic,
            unit: 'mmHg',
            position: 'sitting'
          },
          notes: `${activity.activityType} aktivitesi sonrası ölçülen tansiyon.`
        });
        
        await healthData.save();
        
        logInfo('Aktivite kaydından tansiyon verisi oluşturuldu', {
          userId: req.user._id,
          familyMemberId,
          activityId: activity._id,
          healthDataId: healthData._id,
          type: 'after'
        });
      }
    }
    
    // Kalp hızı verisi
    if (activity.heartRate && activity.heartRate.average) {
      const healthData = new HealthData({
        familyMemberId,
        measuredBy: req.user._id,
        dataType: 'heartRate',
        measuredAt: new Date(activity.startTime),
        heartRate: {
          value: activity.heartRate.average,
          unit: 'bpm',
          activityLevel: activity.intensity
        },
        notes: `${activity.activityType} aktivitesi sırasında ölçülen ortalama kalp hızı.`
      });
      
      await healthData.save();
      
      logInfo('Aktivite kaydından kalp hızı verisi oluşturuldu', {
        userId: req.user._id,
        familyMemberId,
        activityId: activity._id,
        healthDataId: healthData._id
      });
    }
    
    req.flash('success_msg', 'Aktivite başarıyla eklendi');
    
    // Aktiviteler listesine yönlendir
    res.redirect(`/activity/${familyMemberId}`);
  } catch (error) {
    logError(error, req);
    
    if (error.name === 'ValidationError') {
      req.flash('error_msg', 'Geçersiz veya eksik veri');
      return res.redirect(`/activity/${req.params.familyMemberId}/add?activityType=${req.body.activityType || 'yürüyüş'}`);
    }
    
    req.flash('error_msg', 'Aktivite eklenirken bir hata oluştu');
    res.redirect(`/activity/${req.params.familyMemberId}/add`);
  }
};

/**
 * Aktivite detayını göster
 * @route   GET /activity/:familyMemberId/:activityId
 * @access  Private
 */
exports.getActivityDetail = async (req, res) => {
  try {
    const { familyMemberId, activityId } = req.params;
    
    // Aile üyesini kontrol et
    const familyMember = await FamilyMember.findOne({
      _id: familyMemberId,
      userId: req.user._id
    });
    
    if (!familyMember) {
      req.flash('error_msg', 'Aile üyesi bulunamadı');
      return res.redirect('/home');
    }
    
    // Aktiviteyi bul
    const activity = await PhysicalActivity.findOne({
        _id: activityId,
        familyMemberId
      });
      
      if (!activity) {
        req.flash('error_msg', 'Aktivite bulunamadı');
        return res.redirect(`/activity/${familyMemberId}`);
      }
      
      // Form verilerini al
      const { 
        activityType,
        startTime,
        endTime,
        duration,
        intensity,
        notes
      } = req.body;
      
      // Temel bilgileri güncelle
      activity.activityType = activityType;
      activity.startTime = new Date(startTime);
      activity.endTime = endTime ? new Date(endTime) : undefined;
      activity.duration = duration ? parseInt(duration) : undefined;
      activity.intensity = intensity || 'orta';
      activity.notes = notes;
      activity.updatedBy = req.user._id;
      
      // Mesafe bilgilerini güncelle
      if (req.body['distance.value']) {
        activity.distance = {
          value: parseFloat(req.body['distance.value']),
          unit: req.body['distance.unit'] || 'km'
        };
      } else {
        activity.distance = undefined;
      }
      
      // Adım sayısını güncelle
      if (req.body.steps) {
        activity.steps = parseInt(req.body.steps);
      } else {
        activity.steps = undefined;
      }
      
      // Kalori bilgisini güncelle
      if (req.body.calories) {
        activity.calories = parseInt(req.body.calories);
      } else if (familyMember.weight) {
        // Eğer kalori bilgisi verilmemişse ve üye ağırlığı biliniyorsa hesapla
        activity.calculateCalories(familyMember.weight);
      }
      
      // Kalp hızı bilgilerini güncelle
      if (req.body['heartRate.average'] || req.body['heartRate.max'] || req.body['heartRate.min']) {
        activity.heartRate = {
          average: req.body['heartRate.average'] ? parseFloat(req.body['heartRate.average']) : undefined,
          max: req.body['heartRate.max'] ? parseFloat(req.body['heartRate.max']) : undefined,
          min: req.body['heartRate.min'] ? parseFloat(req.body['heartRate.min']) : undefined
        };
      } else {
        activity.heartRate = undefined;
      }
      
      // Performans metrikleri güncelle
      activity.performanceMetrics = {};
      
      if (req.body['performanceMetrics.pace.value']) {
        activity.performanceMetrics.pace = {
          value: parseFloat(req.body['performanceMetrics.pace.value']),
          unit: req.body['performanceMetrics.pace.unit'] || 'min/km'
        };
      }
      
      if (req.body['performanceMetrics.speed.value']) {
        activity.performanceMetrics.speed = {
          value: parseFloat(req.body['performanceMetrics.speed.value']),
          unit: req.body['performanceMetrics.speed.unit'] || 'km/sa'
        };
      }
      
      // Kan şekeri ölçümlerini güncelle
      activity.bloodSugar = {};
      
      if (req.body['bloodSugar.before.value']) {
        activity.bloodSugar.before = {
          value: parseFloat(req.body['bloodSugar.before.value']),
          unit: req.body['bloodSugar.before.unit'] || 'mg/dL'
        };
      }
      
      if (req.body['bloodSugar.after.value']) {
        activity.bloodSugar.after = {
          value: parseFloat(req.body['bloodSugar.after.value']),
          unit: req.body['bloodSugar.after.unit'] || 'mg/dL'
        };
      }
      
      // Eğer kan şekeri bilgisi yoksa, nesneyi kaldır
      if (Object.keys(activity.bloodSugar).length === 0) {
        activity.bloodSugar = undefined;
      }
      
      // Tansiyon ölçümlerini güncelle
      activity.bloodPressure = {};
      
      if (req.body['bloodPressure.before.systolic'] && req.body['bloodPressure.before.diastolic']) {
        activity.bloodPressure.before = {
          systolic: parseFloat(req.body['bloodPressure.before.systolic']),
          diastolic: parseFloat(req.body['bloodPressure.before.diastolic']),
          unit: 'mmHg'
        };
      }
      
      if (req.body['bloodPressure.after.systolic'] && req.body['bloodPressure.after.diastolic']) {
        activity.bloodPressure.after = {
          systolic: parseFloat(req.body['bloodPressure.after.systolic']),
          diastolic: parseFloat(req.body['bloodPressure.after.diastolic']),
          unit: 'mmHg'
        };
      }
      
      // Eğer tansiyon bilgisi yoksa, nesneyi kaldır
      if (Object.keys(activity.bloodPressure).length === 0) {
        activity.bloodPressure = undefined;
      }
      
      // Algılanan zorluk düzeyini güncelle
      if (req.body.perceivedExertion) {
        activity.perceivedExertion = parseInt(req.body.perceivedExertion);
      } else {
        activity.perceivedExertion = undefined;
      }
      
      // Ruh halini güncelle
      if (req.body['mood.before'] || req.body['mood.after']) {
        activity.mood = {
          before: req.body['mood.before'],
          after: req.body['mood.after']
        };
      } else {
        activity.mood = undefined;
      }
      
      // Enerji seviyesini güncelle
      if (req.body['energyLevel.before'] || req.body['energyLevel.after']) {
        activity.energyLevel = {
          before: req.body['energyLevel.before'] ? parseInt(req.body['energyLevel.before']) : undefined,
          after: req.body['energyLevel.after'] ? parseInt(req.body['energyLevel.after']) : undefined
        };
      } else {
        activity.energyLevel = undefined;
      }
      
      // Belirtileri güncelle
      activity.symptoms = [];
      
      if (req.body['symptoms'] && Array.isArray(req.body['symptoms'])) {
        for (let i = 0; i < req.body['symptoms'].length; i++) {
          if (!req.body[`symptoms[${i}].type`]) continue;
          
          const symptom = {
            type: req.body[`symptoms[${i}].type`],
            severity: req.body[`symptoms[${i}].severity`] ? parseInt(req.body[`symptoms[${i}].severity`]) : undefined,
            time: req.body[`symptoms[${i}].time`] || 'during',
            notes: req.body[`symptoms[${i}].notes`]
          };
          
          activity.symptoms.push(symptom);
        }
      } else if (req.body['symptoms.type']) {
        const symptom = {
          type: req.body['symptoms.type'],
          severity: req.body['symptoms.severity'] ? parseInt(req.body['symptoms.severity']) : undefined,
          time: req.body['symptoms.time'] || 'during',
          notes: req.body['symptoms.notes']
        };
        
        activity.symptoms.push(symptom);
      }
      
      // Hedefleri güncelle
      if (req.body['goals.targetDistance'] || req.body['goals.targetDuration'] || 
          req.body['goals.targetCalories'] || req.body['goals.targetSteps']) {
        activity.goals = {
          targetDistance: req.body['goals.targetDistance'] ? parseFloat(req.body['goals.targetDistance']) : undefined,
          targetDuration: req.body['goals.targetDuration'] ? parseInt(req.body['goals.targetDuration']) : undefined,
          targetCalories: req.body['goals.targetCalories'] ? parseInt(req.body['goals.targetCalories']) : undefined,
          targetSteps: req.body['goals.targetSteps'] ? parseInt(req.body['goals.targetSteps']) : undefined
        };
        
        // Hedeflere ulaşılıp ulaşılmadığını kontrol et
        activity.checkGoals();
      } else {
        activity.goals = undefined;
      }
      
      // Aktivite fotoğrafı
      if (req.file) {
        activity.activityPhoto = {
          filename: req.file.filename,
          originalName: req.file.originalname,
          mimeType: req.file.mimetype,
          size: req.file.size,
          path: req.file.path,
          uploadDate: new Date()
        };
      }
      
      // Veriyi kaydet
      await activity.save();
      
      // Log kaydı
      logInfo('Aktivite güncellendi', {
        userId: req.user._id,
        familyMemberId,
        activityId: activity._id,
        activityType
      });
      
      req.flash('success_msg', 'Aktivite başarıyla güncellendi');
      
      // Aktivite detay sayfasına yönlendir
      res.redirect(`/activity/${familyMemberId}/${activityId}`);
    } catch (error) {
      logError(error, req);
      
      if (error.name === 'ValidationError') {
        req.flash('error_msg', 'Geçersiz veya eksik veri');
        return res.redirect(`/activity/${req.params.familyMemberId}/${req.params.activityId}/edit`);
      }
      
      req.flash('error_msg', 'Aktivite güncellenirken bir hata oluştu');
      res.redirect(`/activity/${req.params.familyMemberId}/${req.params.activityId}/edit`);
    }
  };
  
  /**
   * Aktivite silme
   * @route   DELETE /activity/:familyMemberId/:activityId
   * @access  Private
   */
  exports.deleteActivity = async (req, res) => {
    try {
      const { familyMemberId, activityId } = req.params;
      
      // Aile üyesini kontrol et
      const familyMember = await FamilyMember.findOne({
        _id: familyMemberId,
        userId: req.user._id
      });
      
      if (!familyMember) {
        req.flash('error_msg', 'Aile üyesi bulunamadı');
        return res.redirect('/home');
      }
      
      // Aktiviteyi bul ve sil
      const activity = await PhysicalActivity.findOneAndDelete({
        _id: activityId,
        familyMemberId
      });
      
      if (!activity) {
        req.flash('error_msg', 'Aktivite bulunamadı');
        return res.redirect(`/activity/${familyMemberId}`);
      }
      
      // Log kaydı
      logInfo('Aktivite silindi', {
        userId: req.user._id,
        familyMemberId,
        activityId,
        activityType: activity.activityType
      });
      
      req.flash('success_msg', 'Aktivite başarıyla silindi');
      
      // Aktiviteler listesine yönlendir
      res.redirect(`/activity/${familyMemberId}`);
    } catch (error) {
      logError(error, req);
      
      if (error.name === 'CastError') {
        req.flash('error_msg', 'Geçersiz ID formatı');
        return res.redirect(`/activity/${req.params.familyMemberId}`);
      }
      
      req.flash('error_msg', 'Aktivite silinirken bir hata oluştu');
      res.redirect(`/activity/${req.params.familyMemberId}`);
    }
  };
  
  /**
   * Aktivite istatistikleri görünümü
   * @route   GET /activity/:familyMemberId/stats
   * @access  Private
   */
  exports.getActivityStats = async (req, res) => {
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
      
      // Tarih aralığı parametreleri
      const { period = 'month', startDate, endDate } = req.query;
      
      // Tarih aralığını hesapla
      let dateRange = {};
      
      if (startDate && endDate) {
        dateRange = {
          startDate: new Date(startDate),
          endDate: new Date(endDate)
        };
      } else {
        const now = new Date();
        
        if (period === 'week') {
          dateRange.startDate = new Date(now.setDate(now.getDate() - 7));
        } else if (period === 'month') {
          dateRange.startDate = new Date(now.setMonth(now.getMonth() - 1));
        } else if (period === 'quarter') {
          dateRange.startDate = new Date(now.setMonth(now.getMonth() - 3));
        } else if (period === 'year') {
          dateRange.startDate = new Date(now.setFullYear(now.getFullYear() - 1));
        } else {
          // Varsayılan olarak 1 ay
          dateRange.startDate = new Date(now.setMonth(now.getMonth() - 1));
        }
        dateRange.endDate = new Date();
      }
      
      // Aktiviteleri getir
      const activities = await PhysicalActivity.find({
        familyMemberId,
        startTime: {
          $gte: dateRange.startDate,
          $lte: dateRange.endDate
        }
      }).sort({ startTime: 1 });
      
      // İstatistikleri hesapla
      const stats = await PhysicalActivity.getWeeklyStats(familyMemberId, new Date());
      
      // Aktivite türü dağılımı
      const activityTypeCounts = {};
      activities.forEach(activity => {
        if (!activityTypeCounts[activity.activityType]) {
          activityTypeCounts[activity.activityType] = 0;
        }
        activityTypeCounts[activity.activityType]++;
      });
      
      // Haftalık aktivite grafiği için verileri hazırla
      const weeklyActivities = [];
      const dayNames = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
      
      for (let i = 0; i < 7; i++) {
        const day = dayNames[i];
        const duration = stats.dailyActivity[i];
        
        weeklyActivities.push({
          day,
          duration
        });
      }
      
      // Toplam değerler
      const totalDuration = activities.reduce((sum, activity) => sum + (activity.duration || 0), 0);
      const totalDistance = activities.reduce((sum, activity) => {
        if (!activity.distance || !activity.distance.value) return sum;
        
        // Mesafeyi km'ye çevir
        let distanceInKm = activity.distance.value;
        if (activity.distance.unit === 'm') {
          distanceInKm = activity.distance.value / 1000;
        } else if (activity.distance.unit === 'mil') {
          distanceInKm = activity.distance.value * 1.60934;
        }
        
        return sum + distanceInKm;
      }, 0);
      const totalCalories = activities.reduce((sum, activity) => sum + (activity.calories || 0), 0);
      const totalSteps = activities.reduce((sum, activity) => sum + (activity.steps || 0), 0);
      
      // Tarih aralığındaki gün sayısı
      const dayCount = Math.ceil((dateRange.endDate - dateRange.startDate) / (1000 * 60 * 60 * 24));
      
      // Günlük ortalama değerler
      const avgDuration = dayCount > 0 ? totalDuration / dayCount : 0;
      const avgDistance = dayCount > 0 ? totalDistance / dayCount : 0;
      const avgCalories = dayCount > 0 ? totalCalories / dayCount : 0;
      const avgSteps = dayCount > 0 ? totalSteps / dayCount : 0;
      
      // Aktivite türlerine göre istatistikler
      const activityTypeStats = {};
      
      for (const type in stats.activityBreakdown) {
        activityTypeStats[type] = {
          count: stats.activityBreakdown[type].count,
          duration: stats.activityBreakdown[type].duration,
          calories: stats.activityBreakdown[type].calories,
          avgDuration: stats.activityBreakdown[type].count > 0 ? 
            Math.round(stats.activityBreakdown[type].duration / stats.activityBreakdown[type].count) : 0
        };
      }
      
      // İstatistik sayfasını render et
      res.render('front/activity-stats', {
        title: `${familyMember.name} ${familyMember.surname} - Aktivite İstatistikleri`,
        familyMember,
        period,
        dateRange,
        stats: {
          totalActivities: activities.length,
          totalDuration,
          totalDistance: parseFloat(totalDistance.toFixed(2)),
          totalCalories,
          totalSteps,
          avgDuration: Math.round(avgDuration),
          avgDistance: parseFloat(avgDistance.toFixed(2)),
          avgCalories: Math.round(avgCalories),
          avgSteps: Math.round(avgSteps),
          activityTypes: activityTypeCounts,
          weeklyActivities,
          activityTypeStats,
          mostCommonActivity: stats.mostCommonActivity
        },
        activities
      });
    } catch (error) {
      logError(error, req);
      
      if (error.name === 'CastError') {
        req.flash('error_msg', 'Geçersiz ID formatı');
        return res.redirect('/home');
      }
      
      res.status(500).render('500', {
        title: 'Sunucu Hatası',
        message: 'Aktivite istatistikleri yüklenirken bir hata oluştu',
        error: process.env.NODE_ENV === 'development' ? error : {}
      });
    }
  };
  
  /**
   * API: Aktiviteleri listele
   * @route   GET /api/activity/:familyMemberId
   * @access  Private
   */
  exports.apiGetActivityList = async (req, res) => {
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
      
      if (req.query.activityType) {
        filter.activityType = req.query.activityType;
      }
      
      if (req.query.startDate && req.query.endDate) {
        filter.startTime = {
          $gte: new Date(req.query.startDate),
          $lte: new Date(req.query.endDate)
        };
      } else if (req.query.startDate) {
        filter.startTime = { $gte: new Date(req.query.startDate) };
      } else if (req.query.endDate) {
        filter.startTime = { $lte: new Date(req.query.endDate) };
      }
      
      // Sayfalama
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;
      const skip = (page - 1) * limit;
      
      // Toplam kayıt sayısı
      const total = await PhysicalActivity.countDocuments(filter);
      
      // Aktiviteleri getir
      const activities = await PhysicalActivity.find(filter)
        .sort({ startTime: -1 })
        .skip(skip)
        .limit(limit);
      
      // Formatlı verileri hazırla
      const formattedData = activities.map(activity => ({
        id: activity._id,
        familyMemberId: activity.familyMemberId,
        activityType: activity.activityType,
        startTime: activity.startTime,
        endTime: activity.endTime,
        duration: activity.duration,
        distance: activity.distance,
        calories: activity.calories,
        intensity: activity.intensity,
        heartRate: activity.heartRate ? {
          average: activity.heartRate.average,
          max: activity.heartRate.max,
          min: activity.heartRate.min
        } : null,
        hasPhoto: !!activity.activityPhoto,
        createdAt: activity.createdAt
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
        error: 'Aktivite verileri alınırken bir hata oluştu'
      });
    }
  };
  
  /**
   * API: Aktivite detayı
   * @route   GET /api/activity/:familyMemberId/:activityId
   * @access  Private
   */
  exports.apiGetActivityDetail = async (req, res) => {
    try {
      const { familyMemberId, activityId } = req.params;
      
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
      
      // Aktiviteyi bul
      const activity = await PhysicalActivity.findOne({
        _id: activityId,
        familyMemberId
      });
      
      if (!activity) {
        return res.status(404).json({
          success: false,
          error: 'Aktivite bulunamadı'
        });
      }
      
      // API yanıtı
      res.json({
        success: true,
        data: activity
      });
    } catch (error) {
      logError(error, req);
      
      res.status(500).json({
        success: false,
        error: 'Aktivite detayı alınırken bir hata oluştu'
      });
    }
  };
  
  /**
   * API: Aktivite ekleme
   * @route   POST /api/activity
   * @access  Private
   */
  exports.apiAddActivity = async (req, res) => {
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
      
      // Aktivite oluştur
      const activity = new PhysicalActivity({
        ...req.body,
        createdBy: req.user._id
      });
      
      // Eğer kalori bilgisi verilmemişse ve üye ağırlığı biliniyorsa hesapla
      if (!activity.calories && familyMember.weight) {
        activity.calculateCalories(familyMember.weight);
      }
      
      // Aktiviteyi kaydet
      await activity.save();
      
      // Log kaydı
      logInfo('API: Aktivite eklendi', {
        userId: req.user._id,
        familyMemberId,
        activityId: activity._id,
        activityType: activity.activityType
      });
      
      // API yanıtı
      res.status(201).json({
        success: true,
        data: activity
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
        error: 'Aktivite eklenirken bir hata oluştu'
      });
    }
  };
  
  /**
   * API: Aktivite güncelleme
   * @route   PUT /api/activity/:activityId
   * @access  Private
   */
  exports.apiUpdateActivity = async (req, res) => {
    try {
      const { activityId } = req.params;
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
      
      // Aktiviteyi bul
      let activity = await PhysicalActivity.findOne({
        _id: activityId,
        familyMemberId
      });
      
      if (!activity) {
        return res.status(404).json({
          success: false,
          error: 'Aktivite bulunamadı'
        });
      }
      
      // Güncellenebilir alanlar
      const updateFields = [
        'activityType', 'startTime', 'endTime', 'duration', 'distance', 'steps',
        'calories', 'intensity', 'heartRate', 'performanceMetrics', 'bloodSugar',
        'bloodPressure', 'perceivedExertion', 'mood', 'energyLevel', 'symptoms',
        'goals', 'notes'
      ];
      
      // Alanları güncelle
      updateFields.forEach(field => {
        if (req.body[field] !== undefined) {
          activity[field] = req.body[field];
        }
      });
      
      // Son güncelleyen kullanıcıyı kaydet
      activity.updatedBy = req.user._id;
      
      // Aktiviteyi kaydet
      await activity.save();
      
      // API yanıtı
      res.json({
        success: true,
        data: activity
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
        error: 'Aktivite güncellenirken bir hata oluştu'
      });
    }
  };
  
  /**
   * API: Aktivite silme
   * @route   DELETE /api/activity/:activityId
   * @access  Private
   */
  exports.apiDeleteActivity = async (req, res) => {
    try {
      const { activityId } = req.params;
      
      // Aktiviteyi bul
      const activity = await PhysicalActivity.findById(activityId);
      
      if (!activity) {
        return res.status(404).json
        ({
            success: false,
            error: 'Aktivite bulunamadı'
          });
        }
        
        // Aile üyesini kontrol et
        let familyMember;
        
        if (req.isAdmin) {
          familyMember = await FamilyMember.findById(activity.familyMemberId);
        } else {
          familyMember = await FamilyMember.findOne({
            _id: activity.familyMemberId,
            userId: req.user._id
          });
        }
        
        if (!familyMember) {
          return res.status(403).json({
            success: false,
            error: 'Bu aktiviteyi silme yetkiniz yok'
          });
        }
        
        // Aktiviteyi sil
        await activity.remove();
        
        // Log kaydı
        logInfo('API: Aktivite silindi', {
          userId: req.user._id,
          familyMemberId: activity.familyMemberId,
          activityId,
          activityType: activity.activityType
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
          error: 'Aktivite silinirken bir hata oluştu'
        });
      }
    };
    
    /**
     * API: Aktivite istatistikleri
     * @route   GET /api/activity/:familyMemberId/stats
     * @access  Private
     */
    exports.apiGetActivityStats = async (req, res) => {
      try {
        const { familyMemberId } = req.params;
        const { startDate, endDate, period = 'month' } = req.query;
        
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
        
        // Tarih aralığını hesapla
        let dateRange = {};
        
        if (startDate && endDate) {
          dateRange = {
            startDate: new Date(startDate),
            endDate: new Date(endDate)
          };
        } else {
          const now = new Date();
          
          if (period === 'week') {
            dateRange.startDate = new Date(now.setDate(now.getDate() - 7));
          } else if (period === 'month') {
            dateRange.startDate = new Date(now.setMonth(now.getMonth() - 1));
          } else if (period === 'quarter') {
            dateRange.startDate = new Date(now.setMonth(now.getMonth() - 3));
          } else if (period === 'year') {
            dateRange.startDate = new Date(now.setFullYear(now.getFullYear() - 1));
          } else {
            // Varsayılan olarak 1 ay
            dateRange.startDate = new Date(now.setMonth(now.getMonth() - 1));
          }
          dateRange.endDate = new Date();
        }
        
        // Aktiviteleri getir
        const activities = await PhysicalActivity.find({
          familyMemberId,
          startTime: {
            $gte: dateRange.startDate,
            $lte: dateRange.endDate
          }
        }).sort({ startTime: 1 });
        
        // Toplam değerler
        const totalDuration = activities.reduce((sum, activity) => sum + (activity.duration || 0), 0);
        const totalDistance = activities.reduce((sum, activity) => {
          if (!activity.distance || !activity.distance.value) return sum;
          
          // Mesafeyi km'ye çevir
          let distanceInKm = activity.distance.value;
          if (activity.distance.unit === 'm') {
            distanceInKm = activity.distance.value / 1000;
          } else if (activity.distance.unit === 'mil') {
            distanceInKm = activity.distance.value * 1.60934;
          }
          
          return sum + distanceInKm;
        }, 0);
        const totalCalories = activities.reduce((sum, activity) => sum + (activity.calories || 0), 0);
        const totalSteps = activities.reduce((sum, activity) => sum + (activity.steps || 0), 0);
        
        // Aktivite türü dağılımı
        const activityTypes = {};
        activities.forEach(activity => {
          if (!activityTypes[activity.activityType]) {
            activityTypes[activity.activityType] = {
              count: 0,
              duration: 0,
              distance: 0,
              calories: 0
            };
          }
          
          activityTypes[activity.activityType].count++;
          activityTypes[activity.activityType].duration += activity.duration || 0;
          activityTypes[activity.activityType].calories += activity.calories || 0;
          
          if (activity.distance && activity.distance.value) {
            // Mesafeyi km'ye çevir
            let distanceInKm = activity.distance.value;
            if (activity.distance.unit === 'm') {
              distanceInKm = activity.distance.value / 1000;
            } else if (activity.distance.unit === 'mil') {
              distanceInKm = activity.distance.value * 1.60934;
            }
            
            activityTypes[activity.activityType].distance += distanceInKm;
          }
        });
        
        // Günlük aktivite dağılımı
        const dailyActivity = {};
        activities.forEach(activity => {
          const dateKey = activity.startTime.toISOString().split('T')[0]; // YYYY-MM-DD formatı
          
          if (!dailyActivity[dateKey]) {
            dailyActivity[dateKey] = {
              date: dateKey,
              count: 0,
              duration: 0,
              distance: 0,
              calories: 0
            };
          }
          
          dailyActivity[dateKey].count++;
          dailyActivity[dateKey].duration += activity.duration || 0;
          dailyActivity[dateKey].calories += activity.calories || 0;
          
          if (activity.distance && activity.distance.value) {
            // Mesafeyi km'ye çevir
            let distanceInKm = activity.distance.value;
            if (activity.distance.unit === 'm') {
              distanceInKm = activity.distance.value / 1000;
            } else if (activity.distance.unit === 'mil') {
              distanceInKm = activity.distance.value * 1.60934;
            }
            
            dailyActivity[dateKey].distance += distanceInKm;
          }
        });
        
        // Günlük dağılımı dizi formuna çevir
        const dailyActivityArray = Object.values(dailyActivity);
        
        // Tarih aralığındaki gün sayısı
        const dayCount = Math.ceil((dateRange.endDate - dateRange.startDate) / (1000 * 60 * 60 * 24));
        
        // İstatistik sonuçlarını hazırla
        const stats = {
          period: {
            start: dateRange.startDate,
            end: dateRange.endDate,
            days: dayCount
          },
          overview: {
            totalActivities: activities.length,
            totalDuration,
            totalDistance: parseFloat(totalDistance.toFixed(2)),
            totalCalories,
            totalSteps,
            activitiesPerDay: dayCount > 0 ? parseFloat((activities.length / dayCount).toFixed(1)) : 0,
            durationPerDay: dayCount > 0 ? Math.round(totalDuration / dayCount) : 0,
            distancePerDay: dayCount > 0 ? parseFloat((totalDistance / dayCount).toFixed(2)) : 0,
            caloriesPerDay: dayCount > 0 ? Math.round(totalCalories / dayCount) : 0
          },
          activityTypes,
          dailyActivity: dailyActivityArray
        };
        
        // API yanıtı
        res.json({
          success: true,
          data: stats
        });
      } catch (error) {
        logError(error, req);
        
        res.status(500).json({
          success: false,
          error: 'Aktivite istatistikleri hesaplanırken bir hata oluştu'
        });
      }
    };

    // controllers/physicalActivityController.js içinde
    exports.getEditActivity = (req, res) => {
      res.send('Bu fonksiyon hazırlanacak.');
    };

    module.exports = exports;
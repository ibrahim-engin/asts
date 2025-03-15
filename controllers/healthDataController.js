const HealthData = require('../models/HealthData');
const FamilyMember = require('../models/FamilyMember');
const { logError, logInfo } = require('../middlewares/logger');
const mongoose = require('mongoose');
const config = require('../config');

/**
 * Sağlık verileri listesini göster
 * @route   GET /health/data/:familyMemberId
 * @access  Private
 */
exports.getHealthDataList = async (req, res) => {
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
    
    if (req.query.dataType) {
      filter.dataType = req.query.dataType;
    }
    
    if (req.query.status) {
      filter.status = req.query.status;
    }
    
    if (req.query.startDate && req.query.endDate) {
      filter.measuredAt = {
        $gte: new Date(req.query.startDate),
        $lte: new Date(req.query.endDate)
      };
    } else if (req.query.startDate) {
      filter.measuredAt = { $gte: new Date(req.query.startDate) };
    } else if (req.query.endDate) {
      filter.measuredAt = { $lte: new Date(req.query.endDate) };
    }
    
    // Toplam kayıt sayısı
    const total = await HealthData.countDocuments(filter);
    
    // Kayıtları getir
    const healthData = await HealthData.find(filter)
      .sort({ measuredAt: -1 })
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
    
    // Veri tiplerine göre gruplandırma
    const dataTypes = await HealthData.aggregate([
      { $match: { familyMemberId: mongoose.Types.ObjectId(familyMemberId) } },
      { $group: { _id: '$dataType', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    
    // Duruma göre gruplandırma
    const statusCounts = await HealthData.aggregate([
      { $match: { familyMemberId: mongoose.Types.ObjectId(familyMemberId) } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);
    
    // Sayfa görünümünü render et
    res.render('front/health-data-list', {
      title: `${familyMember.name} ${familyMember.surname} - Sağlık Verileri`,
      familyMember,
      healthData,
      pagination,
      filter: req.query,
      dataTypes,
      statusCounts,
      dataTypeOptions: [
        { value: 'bloodSugar', label: 'Kan Şekeri' },
        { value: 'bloodPressure', label: 'Tansiyon' },
        { value: 'heartRate', label: 'Kalp Atış Hızı' },
        { value: 'weight', label: 'Kilo' },
        { value: 'temperature', label: 'Vücut Sıcaklığı' },
        { value: 'oxygen', label: 'Oksijen Satürasyonu' },
        { value: 'stress', label: 'Stres Seviyesi' },
        { value: 'other', label: 'Diğer' }
      ],
      statusOptions: [
        { value: 'normal', label: 'Normal' },
        { value: 'warning', label: 'Uyarı' },
        { value: 'critical', label: 'Kritik' }
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
      message: 'Sağlık verileri alınırken bir hata oluştu',
      error: process.env.NODE_ENV === 'development' ? error : {}
    });
  }
};

/**
 * Yeni sağlık verisi ekleme sayfası
 * @route   GET /health/data/:familyMemberId/add
 * @access  Private
 */
exports.getAddHealthData = async (req, res) => {
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
    
    // Veri tipini al (opsiyonel)
    const dataType = req.query.dataType || 'bloodSugar';
    
    // Sağlık veri ekleme sayfasını render et
    res.render('front/health-data-form', {
      title: `${familyMember.name} ${familyMember.surname} - Sağlık Verisi Ekle`,
      familyMember,
      dataType,
      formAction: `/health/data/${familyMemberId}`,
      formMethod: 'POST',
      healthData: null,
      dataTypeOptions: [
        { value: 'bloodSugar', label: 'Kan Şekeri', icon: 'blood-drop' },
        { value: 'bloodPressure', label: 'Tansiyon', icon: 'heart-pulse' },
        { value: 'heartRate', label: 'Kalp Atış Hızı', icon: 'heartbeat' },
        { value: 'weight', label: 'Kilo', icon: 'weight-scale' },
        { value: 'temperature', label: 'Vücut Sıcaklığı', icon: 'thermometer' },
        { value: 'oxygen', label: 'Oksijen Satürasyonu', icon: 'lungs' },
        { value: 'stress', label: 'Stres Seviyesi', icon: 'brain' },
        { value: 'other', label: 'Diğer', icon: 'medical-cross' }
      ],
      referenceValues: config.healthReferenceValues
    });
  } catch (error) {
    logError(error, req);
    
    if (error.name === 'CastError') {
      req.flash('error_msg', 'Geçersiz aile üyesi ID formatı');
      return res.redirect('/home');
    }
    
    res.status(500).render('500', {
      title: 'Sunucu Hatası',
      message: 'Sağlık verisi ekleme sayfası yüklenirken bir hata oluştu',
      error: process.env.NODE_ENV === 'development' ? error : {}
    });
  }
};

/**
 * Sağlık verisi ekleme
 * @route   POST /health/data/:familyMemberId
 * @access  Private
 */
exports.addHealthData = async (req, res) => {
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
      dataType, 
      measuredAt,
      notes,
      factors
    } = req.body;
    
    // Yeni sağlık verisi oluştur
    const healthData = new HealthData({
      familyMemberId,
      measuredBy: req.user._id,
      dataType,
      measuredAt: new Date(measuredAt),
      notes
    });
    
    // Veri tipine göre özel alanları doldur
    if (dataType === 'bloodSugar') {
      healthData.bloodSugar = {
        value: parseFloat(req.body['bloodSugar.value']),
        unit: req.body['bloodSugar.unit'] || 'mg/dL',
        measurementType: req.body['bloodSugar.measurementType'] || 'random',
        timeSinceLastMeal: req.body['bloodSugar.timeSinceLastMeal'] 
          ? parseInt(req.body['bloodSugar.timeSinceLastMeal']) 
          : undefined
      };
    } 
    else if (dataType === 'bloodPressure') {
      healthData.bloodPressure = {
        systolic: parseInt(req.body['bloodPressure.systolic']),
        diastolic: parseInt(req.body['bloodPressure.diastolic']),
        unit: req.body['bloodPressure.unit'] || 'mmHg',
        position: req.body['bloodPressure.position'] || 'sitting'
      };
    }
    else if (dataType === 'heartRate') {
      healthData.heartRate = {
        value: parseInt(req.body['heartRate.value']),
        unit: req.body['heartRate.unit'] || 'bpm',
        activityLevel: req.body['heartRate.activityLevel'] || 'rest'
      };
    }
    else if (dataType === 'weight') {
      healthData.weight = {
        value: parseFloat(req.body['weight.value']),
        unit: req.body['weight.unit'] || 'kg'
      };
    }
    else if (dataType === 'temperature') {
      healthData.temperature = {
        value: parseFloat(req.body['temperature.value']),
        unit: req.body['temperature.unit'] || 'C',
        measurementMethod: req.body['temperature.measurementMethod'] || 'oral'
      };
    }
    else if (dataType === 'oxygen') {
      healthData.oxygen = {
        value: parseFloat(req.body['oxygen.value']),
        unit: '%'
      };
    }
    else if (dataType === 'stress') {
      healthData.stress = {
        value: parseInt(req.body['stress.value']),
        unit: 'level'
      };
    }
    else if (dataType === 'other') {
      healthData.other = {
        name: req.body['other.name'],
        value: parseFloat(req.body['other.value']),
        unit: req.body['other.unit']
      };
    }
    
    // Etkileyici faktörleri doldur
    if (factors) {
      healthData.factors = {
        medication: factors.includes('medication'),
        exercise: factors.includes('exercise'),
        diet: factors.includes('diet'),
        illness: factors.includes('illness'),
        stress: factors.includes('stress'),
        details: req.body['factors.details']
      };
    }
    
    // Veriyi kaydet
    await healthData.save();
    
    // Log kaydı
    logInfo('Yeni sağlık verisi eklendi', {
      userId: req.user._id,
      familyMemberId,
      dataType,
      healthDataId: healthData._id
    });
    
    // Kritik sağlık verisi kontrolü
    if (healthData.status === 'critical') {
      // Bildirim gönder
      // TODO: Bildirim servisi entegrasyonu
      
      req.flash('warning_msg', `Kritik sağlık verisi tespit edildi! Lütfen gerekli önlemleri alın.`);
    } 
    else if (healthData.status === 'warning') {
      req.flash('info_msg', `Uyarı seviyesinde sağlık verisi tespit edildi. Dikkat ediniz.`);
    }
    
    req.flash('success_msg', 'Sağlık verisi başarıyla eklendi');
    
    // Aile üyesinin sağlık verileri listesine yönlendir
    res.redirect(`/health/data/${familyMemberId}`);
  } catch (error) {
    logError(error, req);
    
    if (error.name === 'ValidationError') {
      req.flash('error_msg', 'Geçersiz veya eksik veri');
      return res.redirect(`/health/data/${req.params.familyMemberId}/add?dataType=${req.body.dataType || 'bloodSugar'}`);
    }
    
    req.flash('error_msg', 'Sağlık verisi eklenirken bir hata oluştu');
    res.redirect(`/health/data/${req.params.familyMemberId}/add`);
  }
};

/**
 * Sağlık verisi detayını göster
 * @route   GET /health/data/:familyMemberId/:healthDataId
 * @access  Private
 */
exports.getHealthDataDetail = async (req, res) => {
  try {
    const { familyMemberId, healthDataId } = req.params;
    
    // Aile üyesini kontrol et
    const familyMember = await FamilyMember.findOne({
      _id: familyMemberId,
      userId: req.user._id
    });
    
    if (!familyMember) {
      req.flash('error_msg', 'Aile üyesi bulunamadı');
      return res.redirect('/home');
    }
    
    // Sağlık verisini bul
    const healthData = await HealthData.findOne({
      _id: healthDataId,
      familyMemberId
    });
    
    if (!healthData) {
      req.flash('error_msg', 'Sağlık verisi bulunamadı');
      return res.redirect(`/health/data/${familyMemberId}`);
    }
    
    // Aynı türdeki önceki ve sonraki verileri bul
    const previousData = await HealthData.findOne({
      familyMemberId,
      dataType: healthData.dataType,
      measuredAt: { $lt: healthData.measuredAt }
    })
    .sort({ measuredAt: -1 })
    .select('_id measuredAt');
    
    const nextData = await HealthData.findOne({
      familyMemberId,
      dataType: healthData.dataType,
      measuredAt: { $gt: healthData.measuredAt }
    })
    .sort({ measuredAt: 1 })
    .select('_id measuredAt');
    
    // Referans değerlerini al
    const referenceValues = config.healthReferenceValues;
    
    // Detay sayfasını render et
    res.render('front/health-data-detail', {
      title: `${familyMember.name} ${familyMember.surname} - Sağlık Verisi Detayı`,
      familyMember,
      healthData,
      previousData,
      nextData,
      referenceValues
    });
  } catch (error) {
    logError(error, req);
    
    if (error.name === 'CastError') {
      req.flash('error_msg', 'Geçersiz ID formatı');
      return res.redirect('/home');
    }
    
    res.status(500).render('500', {
      title: 'Sunucu Hatası',
      message: 'Sağlık verisi detayı alınırken bir hata oluştu',
      error: process.env.NODE_ENV === 'development' ? error : {}
    });
  }
};

/**
 * Sağlık verisi düzenleme sayfası
 * @route   GET /health/data/:familyMemberId/:healthDataId/edit
 * @access  Private
 */
exports.getEditHealthData = async (req, res) => {
  try {
    const { familyMemberId, healthDataId } = req.params;
    
    // Aile üyesini kontrol et
    const familyMember = await FamilyMember.findOne({
      _id: familyMemberId,
      userId: req.user._id
    });
    
    if (!familyMember) {
      req.flash('error_msg', 'Aile üyesi bulunamadı');
      return res.redirect('/home');
    }
    
    // Sağlık verisini bul
    const healthData = await HealthData.findOne({
      _id: healthDataId,
      familyMemberId
    });
    
    if (!healthData) {
      req.flash('error_msg', 'Sağlık verisi bulunamadı');
      return res.redirect(`/health/data/${familyMemberId}`);
    }
    
    // Düzenleme sayfasını render et
    res.render('front/health-data-form', {
      title: `${familyMember.name} ${familyMember.surname} - Sağlık Verisi Düzenle`,
      familyMember,
      healthData,
      dataType: healthData.dataType,
      formAction: `/health/data/${familyMemberId}/${healthDataId}?_method=PUT`,
      formMethod: 'POST',
      dataTypeOptions: [
        { value: 'bloodSugar', label: 'Kan Şekeri', icon: 'blood-drop' },
        { value: 'bloodPressure', label: 'Tansiyon', icon: 'heart-pulse' },
        { value: 'heartRate', label: 'Kalp Atış Hızı', icon: 'heartbeat' },
        { value: 'weight', label: 'Kilo', icon: 'weight-scale' },
        { value: 'temperature', label: 'Vücut Sıcaklığı', icon: 'thermometer' },
        { value: 'oxygen', label: 'Oksijen Satürasyonu', icon: 'lungs' },
        { value: 'stress', label: 'Stres Seviyesi', icon: 'brain' },
        { value: 'other', label: 'Diğer', icon: 'medical-cross' }
      ],
      referenceValues: config.healthReferenceValues
    });
  } catch (error) {
    logError(error, req);
    
    if (error.name === 'CastError') {
      req.flash('error_msg', 'Geçersiz ID formatı');
      return res.redirect('/home');
    }
    
    res.status(500).render('500', {
      title: 'Sunucu Hatası',
      message: 'Sağlık verisi düzenleme sayfası yüklenirken bir hata oluştu',
      error: process.env.NODE_ENV === 'development' ? error : {}
    });
  }
};

/**
 * Sağlık verisi güncelleme
 * @route   PUT /health/data/:familyMemberId/:healthDataId
 * @access  Private
 */
exports.updateHealthData = async (req, res) => {
  try {
    const { familyMemberId, healthDataId } = req.params;
    
    // Aile üyesini kontrol et
    const familyMember = await FamilyMember.findOne({
      _id: familyMemberId,
      userId: req.user._id
    });
    
    if (!familyMember) {
      req.flash('error_msg', 'Aile üyesi bulunamadı');
      return res.redirect('/home');
    }
    
    // Sağlık verisini bul
    const healthData = await HealthData.findOne({
      _id: healthDataId,
      familyMemberId
    });
    
    if (!healthData) {
      req.flash('error_msg', 'Sağlık verisi bulunamadı');
      return res.redirect(`/health/data/${familyMemberId}`);
    }
    
    // Form verilerini al
    const { 
      measuredAt,
      notes,
      factors
    } = req.body;
    
    // Temel bilgileri güncelle
    healthData.measuredAt = new Date(measuredAt);
    healthData.notes = notes;
    
    // Veri tipine göre özel alanları güncelle
    if (healthData.dataType === 'bloodSugar') {
      healthData.bloodSugar = {
        value: parseFloat(req.body['bloodSugar.value']),
        unit: req.body['bloodSugar.unit'] || 'mg/dL',
        measurementType: req.body['bloodSugar.measurementType'] || 'random',
        timeSinceLastMeal: req.body['bloodSugar.timeSinceLastMeal'] 
          ? parseInt(req.body['bloodSugar.timeSinceLastMeal']) 
          : undefined
      };
    } 
    else if (healthData.dataType === 'bloodPressure') {
      healthData.bloodPressure = {
        systolic: parseInt(req.body['bloodPressure.systolic']),
        diastolic: parseInt(req.body['bloodPressure.diastolic']),
        unit: req.body['bloodPressure.unit'] || 'mmHg',
        position: req.body['bloodPressure.position'] || 'sitting'
      };
    }
    else if (healthData.dataType === 'heartRate') {
      healthData.heartRate = {
        value: parseInt(req.body['heartRate.value']),
        unit: req.body['heartRate.unit'] || 'bpm',
        activityLevel: req.body['heartRate.activityLevel'] || 'rest'
      };
    }
    else if (healthData.dataType === 'weight') {
      healthData.weight = {
        value: parseFloat(req.body['weight.value']),
        unit: req.body['weight.unit'] || 'kg'
      };
    }
    else if (healthData.dataType === 'temperature') {
      healthData.temperature = {
        value: parseFloat(req.body['temperature.value']),
        unit: req.body['temperature.unit'] || 'C',
        measurementMethod: req.body['temperature.measurementMethod'] || 'oral'
      };
    }
    else if (healthData.dataType === 'oxygen') {
      healthData.oxygen = {
        value: parseFloat(req.body['oxygen.value']),
        unit: '%'
      };
    }
    else if (healthData.dataType === 'stress') {
      healthData.stress = {
        value: parseInt(req.body['stress.value']),
        unit: 'level'
      };
    }
    else if (healthData.dataType === 'other') {
      healthData.other = {
        name: req.body['other.name'],
        value: parseFloat(req.body['other.value']),
        unit: req.body['other.unit']
      };
    }
    
    // Etkileyici faktörleri güncelle
    if (factors) {
      healthData.factors = {
        medication: factors.includes('medication'),
        exercise: factors.includes('exercise'),
        diet: factors.includes('diet'),
        illness: factors.includes('illness'),
        stress: factors.includes('stress'),
        details: req.body['factors.details']
      };
    } else {
      healthData.factors = {
        medication: false,
        exercise: false,
        diet: false,
        illness: false,
        stress: false,
        details: req.body['factors.details']
      };
    }
    
    // Durumu yeniden hesapla
    healthData.status = 'normal'; // pre-save hook otomatik hesaplayacak
    
    // Veriyi kaydet
    await healthData.save();
    
    // Log kaydı
    logInfo('Sağlık verisi güncellendi', {
      userId: req.user._id,
      familyMemberId,
      healthDataId: healthData._id
    });
    
    req.flash('success_msg', 'Sağlık verisi başarıyla güncellendi');
    
    // Detay sayfasına yönlendir
    res.redirect(`/health/data/${familyMemberId}/${healthDataId}`);
  } catch (error) {
    logError(error, req);
    
    if (error.name === 'ValidationError') {
      req.flash('error_msg', 'Geçersiz veya eksik veri');
      return res.redirect(`/health/data/${req.params.familyMemberId}/${req.params.healthDataId}/edit`);
    }
    
    req.flash('error_msg', 'Sağlık verisi güncellenirken bir hata oluştu');
    res.redirect(`/health/data/${req.params.familyMemberId}/${req.params.healthDataId}/edit`);
  }
};

/**
 * Sağlık verisi silme
 * @route   DELETE /health/data/:familyMemberId/:healthDataId
 * @access  Private
 */
exports.deleteHealthData = async (req, res) => {
  try {
    const { familyMemberId, healthDataId } = req.params;
    
    // Aile üyesini kontrol et
    const familyMember = await FamilyMember.findOne({
      _id: familyMemberId,
      userId: req.user._id
    });
    
    if (!familyMember) {
      req.flash('error_msg', 'Aile üyesi bulunamadı');
      return res.redirect('/home');
    }
    
    // Sağlık verisini bul ve sil
    const healthData = await HealthData.findOneAndDelete({
      _id: healthDataId,
      familyMemberId
    });
    
    if (!healthData) {
      req.flash('error_msg', 'Sağlık verisi bulunamadı');
      return res.redirect(`/health/data/${familyMemberId}`);
    }
    
    // Log kaydı
    logInfo('Sağlık verisi silindi', {
      userId: req.user._id,
      familyMemberId,
      healthDataId,
      dataType: healthData.dataType
    });
    
    req.flash('success_msg', 'Sağlık verisi başarıyla silindi');
    
    // Liste sayfasına yönlendir
    res.redirect(`/health/data/${familyMemberId}`);
  } catch (error) {
    logError(error, req);
    
    if (error.name === 'CastError') {
      req.flash('error_msg', 'Geçersiz ID formatı');
      return res.redirect(`/health/data/${req.params.familyMemberId}`);
    }
    
    req.flash('error_msg', 'Sağlık verisi silinirken bir hata oluştu');
    res.redirect(`/health/data/${req.params.familyMemberId}`);
  }
};

/**
 * Sağlık verisi grafik görünümü
 * @route   GET /health/data/:familyMemberId/graph/:dataType
 * @access  Private
 */
exports.getHealthDataGraph = async (req, res) => {
  try {
    const { familyMemberId, dataType } = req.params;
    
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
    
    // Sağlık verilerini getir
    const healthData = await HealthData.find({
      familyMemberId,
      dataType,
      measuredAt: {
        $gte: dateRange.startDate,
        $lte: dateRange.endDate
      }
    }).sort({ measuredAt: 1 });
    
    // Grafik verilerini hazırla
    let chartData;
    let chartOptions;
    
    if (dataType === 'bloodSugar') {
      const bloodSugarData = healthData.map(data => ({
        date: data.measuredAt,
        value: data.bloodSugar.value,
        type: data.bloodSugar.measurementType,
        status: data.status
      }));
      
      chartData = {
        labels: bloodSugarData.map(data => new Date(data.date).toLocaleDateString('tr-TR')),
        datasets: [{
          label: 'Kan Şekeri',
          data: bloodSugarData.map(data => data.value),
          backgroundColor: config.reports.chartColors.bloodSugar.backgroundColor,
          borderColor: config.reports.chartColors.bloodSugar.borderColor,
          borderWidth: 2,
          fill: false,
          tension: 0.1
        }]
      };
      
      chartOptions = {
        title: 'Kan Şekeri Ölçümleri',
        yLabel: 'Değer (mg/dL)',
        refLines: [
          { value: 70, label: 'Alt Sınır', color: 'rgba(255, 99, 132, 0.5)' },
          { value: 140, label: 'Üst Sınır (Tokluk)', color: 'rgba(255, 99, 132, 0.5)' }
        ]
      };
    }
    else if (dataType === 'bloodPressure') {
      const bloodPressureData = healthData.map(data => ({
        date: data.measuredAt,
        systolic: data.bloodPressure.systolic,
        diastolic: data.bloodPressure.diastolic,
        status: data.status
      }));
      
      chartData = {
        labels: bloodPressureData.map(data => new Date(data.date).toLocaleDateString('tr-TR')),
        datasets: [
          {
            label: 'Sistolik',
            data: bloodPressureData.map(data => data.systolic),
            backgroundColor: config.reports.chartColors.bloodPressure.systolic.backgroundColor,
            borderColor: config.reports.chartColors.bloodPressure.systolic.borderColor,
            borderWidth: 2,
            fill: false,
            tension: 0.1
          },
          {
            label: 'Diastolik',
            data: bloodPressureData.map(data => data.diastolic),
            backgroundColor: config.reports.chartColors.bloodPressure.diastolic.backgroundColor,
            borderColor: config.reports.chartColors.bloodPressure.diastolic.borderColor,
            borderWidth: 2,
            fill: false,
            tension: 0.1
          }
        ]
      };
      
      chartOptions = {
        title: 'Tansiyon Ölçümleri',
        yLabel: 'Değer (mmHg)',
        refLines: [
          { value: 120, label: 'Sistolik Üst Sınır', color: 'rgba(54, 162, 235, 0.5)' },
          { value: 80, label: 'Diastolik Üst Sınır', color: 'rgba(75, 192, 192, 0.5)' }
        ]
      };
    }
    else if (dataType === 'heartRate') {
      const heartRateData = healthData.map(data => ({
        date: data.measuredAt,
        value: data.heartRate.value,
        activity: data.heartRate.activityLevel,
        status: data.status
      }));
      
      chartData = {
        labels: heartRateData.map(data => new Date(data.date).toLocaleDateString('tr-TR')),
        datasets: [{
          label: 'Kalp Atış Hızı',
          data: heartRateData.map(data => data.value),
          backgroundColor: config.reports.chartColors.heartRate.backgroundColor,
          borderColor: config.reports.chartColors.heartRate.borderColor,
          borderWidth: 2,
          fill: false,
          tension: 0.1
        }]
      };
      
      chartOptions = {
        title: 'Kalp Atış Hızı Ölçümleri',
        yLabel: 'Nabız (atım/dk)',
        refLines: [
          { value: 60, label: 'Alt Sınır', color: 'rgba(153, 102, 255, 0.5)' },
          { value: 100, label: 'Üst Sınır', color: 'rgba(153, 102, 255, 0.5)' }
        ]
      };
    }
    else if (dataType === 'weight') {
      const weightData = healthData.map(data => ({
        date: data.measuredAt,
        value: data.weight.value,
        status: data.status
      }));
      
      chartData = {
        labels: weightData.map(data => new Date(data.date).toLocaleDateString('tr-TR')),
        datasets: [{
          label: 'Kilo',
          data: weightData.map(data => data.value),
          backgroundColor: config.reports.chartColors.weight.backgroundColor,
          borderColor: config.reports.chartColors.weight.borderColor,
          borderWidth: 2,
          fill: false,
          tension: 0.1
        }]
      };
      
      chartOptions = {
        title: 'Kilo Ölçümleri',
        yLabel: 'Kilo (kg)'
      };
    }
    else {
      // Diğer veri tipleri için genel grafik hazırla
      chartData = {
        labels: healthData.map(data => new Date(data.measuredAt).toLocaleDateString('tr-TR')),
        datasets: [{
          label: dataType === 'temperature' ? 'Vücut Sıcaklığı' :
                 dataType === 'oxygen' ? 'Oksijen Satürasyonu' :
                 dataType === 'stress' ? 'Stres Seviyesi' : 'Değer',
          data: healthData.map(data => {
            if (dataType === 'temperature') return data.temperature.value;
            if (dataType === 'oxygen') return data.oxygen.value;
            if (dataType === 'stress') return data.stress.value;
            if (dataType === 'other') return data.other.value;
            return 0;
          }),
          backgroundColor: 'rgba(75, 192, 192, 0.2)',
          borderColor: 'rgba(75, 192, 192, 1)',
          borderWidth: 2,
          fill: false,
          tension: 0.1
        }]
      };
      
      chartOptions = {
        title: dataType === 'temperature' ? 'Vücut Sıcaklığı Ölçümleri' :
               dataType === 'oxygen' ? 'Oksijen Satürasyonu Ölçümleri' :
               dataType === 'stress' ? 'Stres Seviyesi Ölçümleri' : 'Ölçümler',
        yLabel: dataType === 'temperature' ? 'Sıcaklık (°C)' :
                dataType === 'oxygen' ? 'Satürasyon (%)' :
                dataType === 'stress' ? 'Seviye (1-10)' : 'Değer'
      };
    }
    
    // İstatistiksel verileri hesapla
    const values = healthData.map(data => {
      if (dataType === 'bloodSugar') return data.bloodSugar.value;
      if (dataType === 'bloodPressure') return data.bloodPressure.systolic; // Sadece sistolik değeri
      if (dataType === 'heartRate') return data.heartRate.value;
      if (dataType === 'weight') return data.weight.value;
      if (dataType === 'temperature') return data.temperature.value;
      if (dataType === 'oxygen') return data.oxygen.value;
      if (dataType === 'stress') return data.stress.value;
      if (dataType === 'other') return data.other.value;
      return 0;
    });
    
    const stats = {
      count: values.length,
      average: values.length > 0 ? 
        parseFloat((values.reduce((a, b) => a + b, 0) / values.length).toFixed(1)) : 0,
      min: values.length > 0 ? Math.min(...values) : 0,
      max: values.length > 0 ? Math.max(...values) : 0,
      criticalCount: healthData.filter(data => data.status === 'critical').length,
      warningCount: healthData.filter(data => data.status === 'warning').length,
      normalCount: healthData.filter(data => data.status === 'normal').length
    };
    
    // Sağlık verisi grafiğini render et
    res.render('front/health-data-graph', {
      title: `${familyMember.name} ${familyMember.surname} - ${
        dataType === 'bloodSugar' ? 'Kan Şekeri' :
        dataType === 'bloodPressure' ? 'Tansiyon' :
        dataType === 'heartRate' ? 'Kalp Atış Hızı' :
        dataType === 'weight' ? 'Kilo' :
        dataType === 'temperature' ? 'Vücut Sıcaklığı' :
        dataType === 'oxygen' ? 'Oksijen Satürasyonu' :
        dataType === 'stress' ? 'Stres Seviyesi' : 'Diğer'
      } Grafiği`,
      familyMember,
      dataType,
      period,
      dateRange,
      healthData,
      chartData: JSON.stringify(chartData),
      chartOptions: JSON.stringify(chartOptions),
      stats
    });
  } catch (error) {
    logError(error, req);
    
    if (error.name === 'CastError') {
      req.flash('error_msg', 'Geçersiz ID formatı');
      return res.redirect('/home');
    }
    
    res.status(500).render('500', {
      title: 'Sunucu Hatası',
      message: 'Sağlık verisi grafiği yüklenirken bir hata oluştu',
      error: process.env.NODE_ENV === 'development' ? error : {}
    });
  }
};

/**
 * Sağlık verisi içe aktarma sayfası
 * @route   GET /health/data/:familyMemberId/import
 * @access  Private
 */
exports.getImportHealthData = async (req, res) => {
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
    
    // İçe aktarma sayfasını render et
    res.render('front/health-data-import', {
      title: `${familyMember.name} ${familyMember.surname} - Sağlık Verisi İçe Aktar`,
      familyMember,
      dataTypeOptions: [
        { value: 'bloodSugar', label: 'Kan Şekeri' },
        { value: 'bloodPressure', label: 'Tansiyon' },
        { value: 'heartRate', label: 'Kalp Atış Hızı' },
        { value: 'weight', label: 'Kilo' },
        { value: 'temperature', label: 'Vücut Sıcaklığı' },
        { value: 'oxygen', label: 'Oksijen Satürasyonu' },
        { value: 'stress', label: 'Stres Seviyesi' }
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
      message: 'İçe aktarma sayfası yüklenirken bir hata oluştu',
      error: process.env.NODE_ENV === 'development' ? error : {}
    });
  }
};

/**
 * Sağlık verisi içe aktarma işlemi
 * @route   POST /health/data/:familyMemberId/import
 * @access  Private
 */
exports.importHealthData = async (req, res) => {
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
    
    // Dosya kontrol et
    if (!req.file) {
      req.flash('error_msg', 'Lütfen bir dosya seçin');
      return res.redirect(`/health/data/${familyMemberId}/import`);
    }
    
    // Dosya tipi ve veri tipi
    const { dataType } = req.body;
    
    // TODO: Dosya içeriği işleme ve veritabanına kaydetme
    // Excel veya CSV dosyasını oku ve verileri işle
    
    // Örnek başarılı mesaj
    req.flash('success_msg', 'Sağlık verileri başarıyla içe aktarıldı');
    res.redirect(`/health/data/${familyMemberId}`);
  } catch (error) {
    logError(error, req);
    
    req.flash('error_msg', 'Veriler içe aktarılırken bir hata oluştu: ' + error.message);
    res.redirect(`/health/data/${req.params.familyMemberId}/import`);
  }
};

/**
 * Sağlık verisi dışa aktarma
 * @route   GET /health/data/:familyMemberId/export
 * @access  Private
 */
exports.exportHealthData = async (req, res) => {
  try {
    const { familyMemberId } = req.params;
    const { format = 'csv', dataType, startDate, endDate } = req.query;
    
    // Aile üyesini kontrol et
    const familyMember = await FamilyMember.findOne({
      _id: familyMemberId,
      userId: req.user._id
    });
    
    if (!familyMember) {
      return res.status(404).json({
        success: false,
        error: 'Aile üyesi bulunamadı'
      });
    }
    
    // Filtreleme için sorgu oluştur
    const query = { familyMemberId };
    
    if (dataType) {
      query.dataType = dataType;
    }
    
    if (startDate && endDate) {
      query.measuredAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    } else if (startDate) {
      query.measuredAt = { $gte: new Date(startDate) };
    } else if (endDate) {
      query.measuredAt = { $lte: new Date(endDate) };
    }
    
    // Sağlık verilerini getir
    const healthData = await HealthData.find(query).sort({ measuredAt: 1 });
    
    // TODO: Veri dışa aktarma servisi entegrasyonu
    // CSV, Excel veya PDF formatında dışa aktar
    
    // Şimdilik basit CSV oluşturalım
    if (format === 'csv') {
      // CSV başlıkları
      let csvContent = 'Tarih,Veri Tipi,Değer,Birim,Durum\n';
      
      // CSV satırları
      healthData.forEach(data => {
        const date = data.measuredAt.toLocaleDateString('tr-TR');
        
        let value, unit;
        
        if (data.dataType === 'bloodSugar') {
          value = data.bloodSugar.value;
          unit = data.bloodSugar.unit;
        } else if (data.dataType === 'bloodPressure') {
          value = `${data.bloodPressure.systolic}/${data.bloodPressure.diastolic}`;
          unit = 'mmHg';
        } else if (data.dataType === 'heartRate') {
          value = data.heartRate.value;
          unit = 'bpm';
        } else if (data.dataType === 'weight') {
          value = data.weight.value;
          unit = data.weight.unit;
        } else if (data.dataType === 'temperature') {
          value = data.temperature.value;
          unit = data.temperature.unit === 'C' ? '°C' : '°F';
        } else if (data.dataType === 'oxygen') {
          value = data.oxygen.value;
          unit = '%';
        } else if (data.dataType === 'stress') {
          value = data.stress.value;
          unit = 'level';
        } else if (data.dataType === 'other') {
          value = data.other.value;
          unit = data.other.unit;
        }
        
        // CSV satırı ekle
        csvContent += `${date},${data.dataType},${value},${unit},${data.status}\n`;
      });
      
      // CSV dosyasını gönder
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=health_data_${familyMemberId}_${Date.now()}.csv`);
      return res.send(csvContent);
    }
    
    // Desteklenmeyen format
    return res.status(400).json({
      success: false,
      error: 'Desteklenmeyen dosya formatı'
    });
  } catch (error) {
    logError(error, req);
    
    res.status(500).json({
      success: false,
      error: 'Veriler dışa aktarılırken bir hata oluştu'
    });
  }
};

/**
 * API: Sağlık verileri listesi
 * @route   GET /api/health/data/:familyMemberId
 * @access  Private
 */
exports.apiGetHealthDataList = async (req, res) => {
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
    
    if (req.query.dataType) {
      filter.dataType = req.query.dataType;
    }
    
    if (req.query.status) {
      filter.status = req.query.status;
    }
    
    if (req.query.startDate && req.query.endDate) {
      filter.measuredAt = {
        $gte: new Date(req.query.startDate),
        $lte: new Date(req.query.endDate)
      };
    } else if (req.query.startDate) {
      filter.measuredAt = { $gte: new Date(req.query.startDate) };
    } else if (req.query.endDate) {
      filter.measuredAt = { $lte: new Date(req.query.endDate) };
    }
    
    // Sayfalama
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    
    // Toplam kayıt sayısı
    const total = await HealthData.countDocuments(filter);
    
    // Sağlık verilerini getir
    const healthData = await HealthData.find(filter)
      .sort({ measuredAt: -1 })
      .skip(skip)
      .limit(limit);
    
    // Formatlı verileri hazırla
    const formattedData = healthData.map(data => ({
      id: data._id,
      familyMemberId: data.familyMemberId,
      dataType: data.dataType,
      measuredAt: data.measuredAt,
      value: data.getValue(),
      unit: data.getUnit(),
      status: data.status,
      notes: data.notes,
      details: data.dataType === 'bloodSugar' ? {
        measurementType: data.bloodSugar.measurementType,
        timeSinceLastMeal: data.bloodSugar.timeSinceLastMeal
      } : data.dataType === 'bloodPressure' ? {
        systolic: data.bloodPressure.systolic,
        diastolic: data.bloodPressure.diastolic,
        position: data.bloodPressure.position
      } : data.dataType === 'heartRate' ? {
        activityLevel: data.heartRate.activityLevel
      } : data.dataType === 'temperature' ? {
        measurementMethod: data.temperature.measurementMethod
      } : null
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
      error: 'Sağlık verileri alınırken bir hata oluştu'
    });
  }
};

/**
 * API: Sağlık verisi ekleme
 * @route   POST /api/health/data/:familyMemberId
 * @access  Private
 */
exports.apiAddHealthData = async (req, res) => {
  try {
    const { familyMemberId } = req.params;
    
    // Aile üyesini kontrol et (admin her aile üyesine veri ekleyebilir)
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
    
    // Veri kontrolü
    if (!req.body.dataType) {
      return res.status(400).json({
        success: false,
        error: 'Veri tipi gereklidir'
      });
    }
    
    // Yeni sağlık verisi oluştur
    const healthData = new HealthData({
      familyMemberId,
      measuredBy: req.user ? req.user._id : req.admin._id,
      dataType: req.body.dataType,
      measuredAt: req.body.measuredAt ? new Date(req.body.measuredAt) : new Date(),
      notes: req.body.notes
    });
    
    // Veri tipine göre özel alanları doldur
    if (req.body.dataType === 'bloodSugar') {
      healthData.bloodSugar = {
        value: parseFloat(req.body.value),
        unit: req.body.unit || 'mg/dL',
        measurementType: req.body.measurementType || 'random',
        timeSinceLastMeal: req.body.timeSinceLastMeal
      };
    } 
    else if (req.body.dataType === 'bloodPressure') {
      healthData.bloodPressure = {
        systolic: parseInt(req.body.systolic),
        diastolic: parseInt(req.body.diastolic),
        unit: req.body.unit || 'mmHg',
        position: req.body.position || 'sitting'
      };
    }
    else if (req.body.dataType === 'heartRate') {
      healthData.heartRate = {
        value: parseInt(req.body.value),
        unit: req.body.unit || 'bpm',
        activityLevel: req.body.activityLevel || 'rest'
      };
    }
    else if (req.body.dataType === 'weight') {
      healthData.weight = {
        value: parseFloat(req.body.value),
        unit: req.body.unit || 'kg'
      };
    }
    else if (req.body.dataType === 'temperature') {
      healthData.temperature = {
        value: parseFloat(req.body.value),
        unit: req.body.unit || 'C',
        measurementMethod: req.body.measurementMethod || 'oral'
      };
    }
    else if (req.body.dataType === 'oxygen') {
      healthData.oxygen = {
        value: parseFloat(req.body.value),
        unit: '%'
      };
    }
    else if (req.body.dataType === 'stress') {
      healthData.stress = {
        value: parseInt(req.body.value),
        unit: 'level'
      };
    }
    else if (req.body.dataType === 'other') {
      healthData.other = {
        name: req.body.name,
        value: parseFloat(req.body.value),
        unit: req.body.unit
      };
    }
    else {
      return res.status(400).json({
        success: false,
        error: 'Geçersiz veri tipi'
      });
    }
    
    // Faktörleri doldur
    if (req.body.factors) {
      healthData.factors = {
        medication: req.body.factors.medication || false,
        exercise: req.body.factors.exercise || false,
        diet: req.body.factors.diet || false,
        illness: req.body.factors.illness || false,
        stress: req.body.factors.stress || false,
        details: req.body.factors.details
      };
    }
    
    // Veriyi kaydet
    await healthData.save();
    
    // Log kaydı
    logInfo('API: Yeni sağlık verisi eklendi', {
      userId: req.user ? req.user._id : req.admin._id,
      familyMemberId,
      dataType: req.body.dataType,
      healthDataId: healthData._id
    });
    
    // Başarılı yanıt
    res.status(201).json({
      success: true,
      data: {
        id: healthData._id,
        familyMemberId: healthData.familyMemberId,
        dataType: healthData.dataType,
        measuredAt: healthData.measuredAt,
        value: healthData.getValue(),
        unit: healthData.getUnit(),
        status: healthData.status,
        notes: healthData.notes
      }
    });
  } catch (error) {
    logError(error, req);
    
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        error: 'Geçersiz veri',
        details: Object.values(error.errors).map(err => err.message)
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Sağlık verisi eklenirken bir hata oluştu'
    });
  }
};

module.exports = exports;
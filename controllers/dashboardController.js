const FamilyMember = require('../models/FamilyMember');
const HealthData = require('../models/HealthData');
const Medication = require('../models/Medication');
const Reminder = require('../models/Reminder');
const MedicalHistory = require('../models/MedicalHistory');
const PhysicalActivity = require('../models/PhysicalActivity');
const NutritionData = require('../models/NutritionData');
const { logError } = require('../middlewares/logger');

/**
 * Kullanıcı ana sayfa
 * @route   GET /home
 * @access  Private
 */
exports.getHomePage = async (req, res) => {
  try {
    // Kullanıcının aile üyelerini getir
    const familyMembers = await FamilyMember.find({ userId: req.user._id }).sort({ createdAt: -1 });
    
    // Aile üyesi yoksa yeni aile üyesi ekle sayfasına yönlendir
    if (familyMembers.length === 0) {
      req.flash('info_msg', 'Sistem kullanımı için önce bir aile üyesi eklemelisiniz');
      return res.render('front/first-family-member', {
        title: 'İlk Aile Üyesini Ekle'
      });
    }
    
    // En son sağlık verilerini getir (her aile üyesi için en son 3 veri)
    const recentHealthData = [];
    
    for (const member of familyMembers) {
      const data = await HealthData.find({ familyMemberId: member._id })
        .sort({ measuredAt: -1 })
        .limit(3);
      
      if (data.length > 0) {
        recentHealthData.push({
          member,
          data
        });
      }
    }
    
    // Yaklaşan randevu ve hatırlatıcıları getir
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(23, 59, 59, 999);
    
    const upcomingReminders = [];
    
    for (const member of familyMembers) {
      const reminders = await Reminder.find({
        familyMemberId: member._id,
        isActive: true,
        'schedule.nextScheduled': { $lte: tomorrow }
      }).sort({ 'schedule.nextScheduled': 1 });
      
      if (reminders.length > 0) {
        upcomingReminders.push({
          member,
          reminders
        });
      }
    }
    
    // Kritik durumdaki sağlık verileri
    const criticalHealthData = [];
    
    for (const member of familyMembers) {
      const data = await HealthData.find({
        familyMemberId: member._id,
        status: 'critical'
      })
        .sort({ measuredAt: -1 })
        .limit(5);
      
      if (data.length > 0) {
        criticalHealthData.push({
          member,
          data
        });
      }
    }
    
    // İlaç hatırlatıcıları
    const medicationReminders = [];
    
    for (const member of familyMembers) {
      const reminders = await Reminder.find({
        familyMemberId: member._id,
        type: 'medication',
        isActive: true
      }).sort({ 'schedule.nextScheduled': 1 });
      
      if (reminders.length > 0) {
        medicationReminders.push({
          member,
          reminders
        });
      }
    }
    
    // Ana sayfa için gerekli verileri hazırla
    const dashboardData = {
      totalFamilyMembers: familyMembers.length,
      activeReminders: upcomingReminders.reduce((total, item) => total + item.reminders.length, 0),
      criticalAlerts: criticalHealthData.reduce((total, item) => total + item.data.length, 0)
    };
    
    // Ana sayfayı render et
    res.render('home', {
      title: 'Ana Sayfa',
      familyMembers,
      recentHealthData,
      upcomingReminders,
      criticalHealthData,
      medicationReminders,
      dashboardData
    });
  } catch (error) {
    logError(error, req);
    
    res.status(500).render('500', {
      title: 'Sunucu Hatası',
      message: 'Ana sayfa verileri alınırken bir hata oluştu',
      error: process.env.NODE_ENV === 'development' ? error : {}
    });
  }
};

/**
 * Aile üyesinin dashboard'unu göster
 * @route   GET /dashboard/:familyMemberId
 * @access  Private
 */
exports.getMemberDashboard = async (req, res) => {
  try {
    const { familyMemberId } = req.params;
    
    // Aile üyesini getir
    const familyMember = await FamilyMember.findOne({
      _id: familyMemberId,
      userId: req.user._id
    });
    
    if (!familyMember) {
      req.flash('error_msg', 'Aile üyesi bulunamadı');
      return res.redirect('/home');
    }
    
    // Aile üyesinin temel sağlık verilerini getir
    const healthData = await HealthData.find({ familyMemberId })
      .sort({ measuredAt: -1 })
      .limit(10);
    
    // İlaçları getir
    const medications = await Medication.find({
      familyMemberId,
      isActive: true
    }).sort({ startDate: -1 });
    
    // Hatırlatıcıları getir
    const reminders = await Reminder.find({
      familyMemberId,
      isActive: true
    }).sort({ 'schedule.nextScheduled': 1 });
    
    // Tıbbi geçmişi getir
    const medicalHistory = await MedicalHistory.find({ familyMemberId })
      .sort({ date: -1 })
      .limit(5);
    
    // Son aktiviteleri getir
    const activities = await PhysicalActivity.find({ familyMemberId })
      .sort({ startTime: -1 })
      .limit(3);
    
    // Son beslenme kayıtlarını getir
    const nutritionData = await NutritionData.find({ familyMemberId })
      .sort({ date: -1 })
      .limit(3);
    
    // Kan şekeri verileri
    const bloodSugarData = await HealthData.find({
      familyMemberId,
      dataType: 'bloodSugar'
    })
      .sort({ measuredAt: -1 })
      .limit(10);
    
    // Tansiyon verileri
    const bloodPressureData = await HealthData.find({
      familyMemberId,
      dataType: 'bloodPressure'
    })
      .sort({ measuredAt: -1 })
      .limit(10);
    
    // Grafik verilerini hazırla
    const bloodSugarChartData = bloodSugarData.map(data => ({
      date: data.measuredAt,
      value: data.bloodSugar.value,
      status: data.status
    })).reverse();
    
    const bloodPressureChartData = bloodPressureData.map(data => ({
      date: data.measuredAt,
      systolic: data.bloodPressure.systolic,
      diastolic: data.bloodPressure.diastolic,
      status: data.status
    })).reverse();
    
    // İlaç uyum oranlarını hesapla
    const medicationAdherence = await Promise.all(
      medications.map(async (medication) => {
        const adherence = await medication.checkMedicationStatus();
        return {
          id: medication._id,
          name: medication.name,
          adherenceRate: adherence.adherenceRate
        };
      })
    );
    
    // Aile üyesinin dashboard'unu render et
    res.render('front/member-dashboard', {
      title: `${familyMember.name} ${familyMember.surname} - Dashboard`,
      familyMember,
      healthData,
      medications,
      reminders,
      medicalHistory,
      activities,
      nutritionData,
      bloodSugarChartData,
      bloodPressureChartData,
      medicationAdherence
    });
  } catch (error) {
    logError(error, req);
    
    if (error.name === 'CastError') {
      req.flash('error_msg', 'Geçersiz aile üyesi ID formatı');
      return res.redirect('/home');
    }
    
    res.status(500).render('500', {
      title: 'Sunucu Hatası',
      message: 'Dashboard verileri alınırken bir hata oluştu',
      error: process.env.NODE_ENV === 'development' ? error : {}
    });
  }
};

/**
 * Dashboard verileri API
 * @route   GET /api/dashboard/:familyMemberId
 * @access  Private
 */
exports.getDashboardData = async (req, res) => {
  try {
    const { familyMemberId } = req.params;
    
    // Aile üyesini getir
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
    
    // Tarih filtreleme parametreleri
    const startDate = req.query.startDate 
      ? new Date(req.query.startDate) 
      : new Date(new Date().setDate(new Date().getDate() - 30)); // Son 30 gün
    
    const endDate = req.query.endDate 
      ? new Date(req.query.endDate) 
      : new Date();
    
    // Son sağlık verileri
    const recentHealthData = await HealthData.find({ familyMemberId })
      .sort({ measuredAt: -1 })
      .limit(5);
    
    // Kan şekeri verileri
    const bloodSugarData = await HealthData.find({
      familyMemberId,
      dataType: 'bloodSugar',
      measuredAt: { $gte: startDate, $lte: endDate }
    }).sort({ measuredAt: 1 });
    
    // Tansiyon verileri
    const bloodPressureData = await HealthData.find({
      familyMemberId,
      dataType: 'bloodPressure',
      measuredAt: { $gte: startDate, $lte: endDate }
    }).sort({ measuredAt: 1 });
    
    // Nabız verileri
    const heartRateData = await HealthData.find({
      familyMemberId,
      dataType: 'heartRate',
      measuredAt: { $gte: startDate, $lte: endDate }
    }).sort({ measuredAt: 1 });
    
    // Kilo verileri
    const weightData = await HealthData.find({
      familyMemberId,
      dataType: 'weight',
      measuredAt: { $gte: startDate, $lte: endDate }
    }).sort({ measuredAt: 1 });
    
    // İlaç verileri
    const medications = await Medication.find({
      familyMemberId,
      isActive: true
    }).sort({ startDate: -1 });
    
    // Aktivite verileri
    const activities = await PhysicalActivity.find({
      familyMemberId,
      startTime: { $gte: startDate, $lte: endDate }
    }).sort({ startTime: 1 });
    
    // Beslenme verileri
    const nutritionData = await NutritionData.find({
      familyMemberId,
      date: { $gte: startDate, $lte: endDate }
    }).sort({ date: 1 });
    
    // Grafik verileri için formatla
    const formatData = (data, type) => {
      if (type === 'bloodSugar') {
        return data.map(item => ({
          date: item.measuredAt,
          value: item.bloodSugar.value,
          type: item.bloodSugar.measurementType,
          status: item.status
        }));
      }
      
      if (type === 'bloodPressure') {
        return data.map(item => ({
          date: item.measuredAt,
          systolic: item.bloodPressure.systolic,
          diastolic: item.bloodPressure.diastolic,
          status: item.status
        }));
      }
      
      if (type === 'heartRate') {
        return data.map(item => ({
          date: item.measuredAt,
          value: item.heartRate.value,
          activity: item.heartRate.activityLevel,
          status: item.status
        }));
      }
      
      if (type === 'weight') {
        return data.map(item => ({
          date: item.measuredAt,
          value: item.weight.value,
          status: item.status
        }));
      }
      
      return data;
    };
    
    // Özet istatistikleri hazırla
    const calculateStats = (data, type) => {
      if (data.length === 0) return null;
      
      if (type === 'bloodSugar') {
        const values = data.map(item => item.bloodSugar.value);
        const fastingValues = data
          .filter(item => item.bloodSugar.measurementType === 'fasting')
          .map(item => item.bloodSugar.value);
        
        const postprandialValues = data
          .filter(item => item.bloodSugar.measurementType === 'postprandial')
          .map(item => item.bloodSugar.value);
        
        return {
          average: values.length > 0 
            ? parseFloat((values.reduce((a, b) => a + b, 0) / values.length).toFixed(1)) 
            : null,
          fastingAverage: fastingValues.length > 0 
            ? parseFloat((fastingValues.reduce((a, b) => a + b,
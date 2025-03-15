const MedicalHistory = require('../models/MedicalHistory');
const FamilyMember = require('../models/FamilyMember');
const { logError, logInfo } = require('../middlewares/logger');
const mongoose = require('mongoose');
const { upload } = require('../middlewares/multer');

/**
 * Tıbbi geçmiş listesini göster
 * @route   GET /medical-history/:familyMemberId
 * @access  Private
 */
exports.getMedicalHistoryList = async (req, res) => {
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
    
    if (req.query.importance) {
      filter.importance = req.query.importance;
    }
    
    if (req.query.startDate && req.query.endDate) {
      filter.date = {
        $gte: new Date(req.query.startDate),
        $lte: new Date(req.query.endDate)
      };
    } else if (req.query.startDate) {
      filter.date = { $gte: new Date(req.query.startDate) };
    } else if (req.query.endDate) {
      filter.date = { $lte: new Date(req.query.endDate) };
    }
    
    // Toplam kayıt sayısı
    const total = await MedicalHistory.countDocuments(filter);
    
    // Kayıtları getir
    const medicalHistory = await MedicalHistory.find(filter)
      .sort({ date: -1 })
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
    const types = await MedicalHistory.aggregate([
      { $match: { familyMemberId: mongoose.Types.ObjectId(familyMemberId) } },
      { $group: { _id: '$type', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    
    // Önem derecesine göre gruplandırma
    const importanceCounts = await MedicalHistory.aggregate([
      { $match: { familyMemberId: mongoose.Types.ObjectId(familyMemberId) } },
      { $group: { _id: '$importance', count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);
    
    // Sayfa görünümünü render et
    res.render('front/medical-history-list', {
      title: `${familyMember.name} ${familyMember.surname} - Tıbbi Geçmiş`,
      familyMember,
      medicalHistory,
      pagination,
      filter: req.query,
      types,
      importanceCounts,
      typeOptions: [
        { value: 'diagnosis', label: 'Teşhis' },
        { value: 'surgery', label: 'Ameliyat' },
        { value: 'hospitalization', label: 'Hastane Yatışı' },
        { value: 'vaccination', label: 'Aşı' },
        { value: 'test', label: 'Test/Tahlil' },
        { value: 'consultation', label: 'Muayene' },
        { value: 'emergency', label: 'Acil Durum' },
        { value: 'other', label: 'Diğer' }
      ],
      importanceOptions: [
        { value: 'low', label: 'Düşük' },
        { value: 'medium', label: 'Orta' },
        { value: 'high', label: 'Yüksek' },
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
      message: 'Tıbbi geçmiş verileri alınırken bir hata oluştu',
      error: process.env.NODE_ENV === 'development' ? error : {}
    });
  }
};

/**
 * Yeni tıbbi geçmiş ekleme sayfası
 * @route   GET /medical-history/:familyMemberId/add
 * @access  Private
 */
exports.getAddMedicalHistory = async (req, res) => {
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
    const type = req.query.type || 'diagnosis';
    
    // Tıbbi geçmiş ekleme sayfasını render et
    res.render('front/medical-history-form', {
      title: `${familyMember.name} ${familyMember.surname} - Tıbbi Geçmiş Ekle`,
      familyMember,
      type,
      formAction: `/medical-history/${familyMemberId}`,
      formMethod: 'POST',
      medicalHistory: null,
      typeOptions: [
        { value: 'diagnosis', label: 'Teşhis', icon: 'stethoscope' },
        { value: 'surgery', label: 'Ameliyat', icon: 'scalpel' },
        { value: 'hospitalization', label: 'Hastane Yatışı', icon: 'hospital-bed' },
        { value: 'vaccination', label: 'Aşı', icon: 'syringe' },
        { value: 'test', label: 'Test/Tahlil', icon: 'test-tube' },
        { value: 'consultation', label: 'Muayene', icon: 'doctor' },
        { value: 'emergency', label: 'Acil Durum', icon: 'ambulance' },
        { value: 'other', label: 'Diğer', icon: 'notes' }
      ],
      importanceOptions: [
        { value: 'low', label: 'Düşük' },
        { value: 'medium', label: 'Orta' },
        { value: 'high', label: 'Yüksek' },
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
      message: 'Tıbbi geçmiş ekleme sayfası yüklenirken bir hata oluştu',
      error: process.env.NODE_ENV === 'development' ? error : {}
    });
  }
};

/**
 * Tıbbi geçmiş ekleme
 * @route   POST /medical-history/:familyMemberId
 * @access  Private
 */
exports.addMedicalHistory = async (req, res) => {
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
      date,
      endDate,
      ongoing,
      importance,
      notes
    } = req.body;
    
    // Yeni tıbbi geçmiş oluştur
    const medicalHistory = new MedicalHistory({
      familyMemberId,
      type,
      title,
      date: new Date(date),
      ongoing: ongoing === 'on',
      importance: importance || 'medium',
      notes,
      createdBy: req.user._id
    });
    
    // Eğer devam etmiyorsa ve bitiş tarihi varsa
    if (!medicalHistory.ongoing && endDate) {
      medicalHistory.endDate = new Date(endDate);
    }
    
    // Veri tipine göre özel alanları doldur
    if (type === 'diagnosis') {
      medicalHistory.diagnosis = {
        name: req.body['diagnosis.name'],
        icd10Code: req.body['diagnosis.icd10Code'],
        severity: req.body['diagnosis.severity'],
        chronic: req.body['diagnosis.chronic'] === 'on'
      };
    }
    else if (type === 'surgery') {
      medicalHistory.surgery = {
        procedure: req.body['surgery.procedure'],
        method: req.body['surgery.method'],
        anesthesia: req.body['surgery.anesthesia'],
        duration: req.body['surgery.duration'] ? parseInt(req.body['surgery.duration']) : null,
        complications: req.body['surgery.complications'] ? req.body['surgery.complications'].split(',').map(c => c.trim()) : []
      };
    }
    else if (type === 'hospitalization') {
      medicalHistory.hospitalization = {
        reason: req.body['hospitalization.reason'],
        ward: req.body['hospitalization.ward'],
        roomNumber: req.body['hospitalization.roomNumber'],
        durationDays: req.body['hospitalization.durationDays'] ? parseInt(req.body['hospitalization.durationDays']) : null,
        dischargeReason: req.body['hospitalization.dischargeReason']
      };
    }
    else if (type === 'vaccination') {
      medicalHistory.vaccination = {
        name: req.body['vaccination.name'],
        dose: req.body['vaccination.dose'],
        manufacturer: req.body['vaccination.manufacturer'],
        lotNumber: req.body['vaccination.lotNumber'],
        nextDoseDate: req.body['vaccination.nextDoseDate'] ? new Date(req.body['vaccination.nextDoseDate']) : null
      };
    }
    else if (type === 'test') {
      medicalHistory.test = {
        name: req.body['test.name'],
        results: req.body['test.results'],
        referenceRange: req.body['test.referenceRange'],
        interpretation: req.body['test.interpretation']
      };
    }
    
    // Doktor bilgilerini doldur
    if (req.body['doctor.name']) {
      medicalHistory.doctor = {
        name: req.body['doctor.name'],
        specialty: req.body['doctor.specialty'],
        hospital: req.body['doctor.hospital'],
        phone: req.body['doctor.phone'],
        email: req.body['doctor.email']
      };
    }
    
    // Lokasyon bilgilerini doldur
    if (req.body['location.name']) {
      medicalHistory.location = {
        name: req.body['location.name'],
        address: req.body['location.address'],
        city: req.body['location.city'],
        country: req.body['location.country'],
        phone: req.body['location.phone']
      };
    }
    
    // İlaç tedavileri bilgilerini doldur
    if (req.body['medications'] && Array.isArray(req.body['medications'])) {
      const medications = [];
      
      for (let i = 0; i < req.body['medications'].length; i++) {
        const medication = {
          name: req.body[`medications[${i}].name`],
          dosage: req.body[`medications[${i}].dosage`],
          frequency: req.body[`medications[${i}].frequency`],
          startDate: req.body[`medications[${i}].startDate`] ? new Date(req.body[`medications[${i}].startDate`]) : null,
          endDate: req.body[`medications[${i}].endDate`] ? new Date(req.body[`medications[${i}].endDate`]) : null,
          ongoing: req.body[`medications[${i}].ongoing`] === 'on',
          reason: req.body[`medications[${i}].reason`]
        };
        
        medications.push(medication);
      }
      
      medicalHistory.medications = medications;
    }
    
    // Öneriler bilgilerini doldur
    if (req.body['recommendations.dietChanges'] || req.body['recommendations.activityRestrictions']) {
      medicalHistory.recommendations = {
        dietChanges: req.body['recommendations.dietChanges'],
        activityRestrictions: req.body['recommendations.activityRestrictions'],
        followUpDate: req.body['recommendations.followUpDate'] ? new Date(req.body['recommendations.followUpDate']) : null,
        referrals: req.body['recommendations.referrals'] ? req.body['recommendations.referrals'].split(',').map(r => r.trim()) : [],
        otherRecommendations: req.body['recommendations.otherRecommendations']
      };
    }
    
    // Semptomları doldur
    if (req.body.symptoms) {
      medicalHistory.symptoms = req.body.symptoms.split(',').map(s => s.trim());
    }
    
    // Veriyi kaydet
    await medicalHistory.save();
    
    // Log kaydı
    logInfo('Yeni tıbbi geçmiş kaydı eklendi', {
      userId: req.user._id,
      familyMemberId,
      medicalHistoryId: medicalHistory._id,
      type
    });
    
    req.flash('success_msg', 'Tıbbi geçmiş kaydı başarıyla eklendi');
    
    // Tıbbi geçmiş listesine yönlendir
    res.redirect(`/medical-history/${familyMemberId}`);
  } catch (error) {
    logError(error, req);
    
    if (error.name === 'ValidationError') {
      req.flash('error_msg', 'Geçersiz veya eksik veri');
      return res.redirect(`/medical-history/${req.params.familyMemberId}/add?type=${req.body.type || 'diagnosis'}`);
    }
    
    req.flash('error_msg', 'Tıbbi geçmiş kaydı eklenirken bir hata oluştu');
    res.redirect(`/medical-history/${req.params.familyMemberId}/add`);
  }
};

/**
 * Tıbbi geçmiş detayını göster
 * @route   GET /medical-history/:familyMemberId/:medicalHistoryId
 * @access  Private
 */
exports.getMedicalHistoryDetail = async (req, res) => {
  try {
    const { familyMemberId, medicalHistoryId } = req.params;
    
    // Aile üyesini kontrol et
    const familyMember = await FamilyMember.findOne({
      _id: familyMemberId,
      userId: req.user._id
    });
    
    if (!familyMember) {
      req.flash('error_msg', 'Aile üyesi bulunamadı');
      return res.redirect('/home');
    }
    
    // Tıbbi geçmiş kaydını bul
    const medicalHistory = await MedicalHistory.findOne({
      _id: medicalHistoryId,
      familyMemberId
    });
    
    if (!medicalHistory) {
      req.flash('error_msg', 'Tıbbi geçmiş kaydı bulunamadı');
      return res.redirect(`/medical-history/${familyMemberId}`);
    }
    
    // Aynı türdeki önceki ve sonraki kayıtları bul
    const previousRecord = await MedicalHistory.findOne({
      familyMemberId,
      type: medicalHistory.type,
      date: { $lt: medicalHistory.date }
    })
    .sort({ date: -1 })
    .select('_id date title');
    
    const nextRecord = await MedicalHistory.findOne({
      familyMemberId,
      type: medicalHistory.type,
      date: { $gt: medicalHistory.date }
    })
    .sort({ date: 1 })
    .select('_id date title');
    
    // Detay sayfasını render et
    res.render('front/medical-history-detail', {
      title: `${familyMember.name} ${familyMember.surname} - Tıbbi Geçmiş Detayı`,
      familyMember,
      medicalHistory,
      previousRecord,
      nextRecord,
      typeNames: {
        diagnosis: 'Teşhis',
        surgery: 'Ameliyat',
        hospitalization: 'Hastane Yatışı',
        vaccination: 'Aşı',
        test: 'Test/Tahlil',
        consultation: 'Muayene',
        emergency: 'Acil Durum',
        other: 'Diğer'
      },
      importanceNames: {
        low: 'Düşük',
        medium: 'Orta',
        high: 'Yüksek',
        critical: 'Kritik'
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
      message: 'Tıbbi geçmiş detayı alınırken bir hata oluştu',
      error: process.env.NODE_ENV === 'development' ? error : {}
    });
  }
};

/**
 * Tıbbi geçmiş düzenleme sayfası
 * @route   GET /medical-history/:familyMemberId/:medicalHistoryId/edit
 * @access  Private
 */
exports.getEditMedicalHistory = async (req, res) => {
  try {
    const { familyMemberId, medicalHistoryId } = req.params;
    
    // Aile üyesini kontrol et
    const familyMember = await FamilyMember.findOne({
      _id: familyMemberId,
      userId: req.user._id
    });
    
    if (!familyMember) {
      req.flash('error_msg', 'Aile üyesi bulunamadı');
      return res.redirect('/home');
    }
    
    // Tıbbi geçmiş kaydını bul
    const medicalHistory = await MedicalHistory.findOne({
      _id: medicalHistoryId,
      familyMemberId
    });
    
    if (!medicalHistory) {
      req.flash('error_msg', 'Tıbbi geçmiş kaydı bulunamadı');
      return res.redirect(`/medical-history/${familyMemberId}`);
    }
    
    // Düzenleme sayfasını render et
    res.render('front/medical-history-form', {
      title: `${familyMember.name} ${familyMember.surname} - Tıbbi Geçmiş Düzenle`,
      familyMember,
      medicalHistory,
      type: medicalHistory.type,
      formAction: `/medical-history/${familyMemberId}/${medicalHistoryId}?_method=PUT`,
      formMethod: 'POST',
      typeOptions: [
        { value: 'diagnosis', label: 'Teşhis', icon: 'stethoscope' },
        { value: 'surgery', label: 'Ameliyat', icon: 'scalpel' },
        { value: 'hospitalization', label: 'Hastane Yatışı', icon: 'hospital-bed' },
        { value: 'vaccination', label: 'Aşı', icon: 'syringe' },
        { value: 'test', label: 'Test/Tahlil', icon: 'test-tube' },
        { value: 'consultation', label: 'Muayene', icon: 'doctor' },
        { value: 'emergency', label: 'Acil Durum', icon: 'ambulance' },
        { value: 'other', label: 'Diğer', icon: 'notes' }
      ],
      importanceOptions: [
        { value: 'low', label: 'Düşük' },
        { value: 'medium', label: 'Orta' },
        { value: 'high', label: 'Yüksek' },
        { value: 'critical', label: 'Kritik' }
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
      message: 'Tıbbi geçmiş düzenleme sayfası yüklenirken bir hata oluştu',
      error: process.env.NODE_ENV === 'development' ? error : {}
    });
  }
};

/**
 * Tıbbi geçmiş güncelleme
 * @route   PUT /medical-history/:familyMemberId/:medicalHistoryId
 * @access  Private
 */
exports.updateMedicalHistory = async (req, res) => {
  try {
    const { familyMemberId, medicalHistoryId } = req.params;
    
    // Aile üyesini kontrol et
    const familyMember = await FamilyMember.findOne({
      _id: familyMemberId,
      userId: req.user._id
    });
    
    if (!familyMember) {
      req.flash('error_msg', 'Aile üyesi bulunamadı');
      return res.redirect('/home');
    }
    
    // Tıbbi geçmiş kaydını bul
    const medicalHistory = await MedicalHistory.findOne({
      _id: medicalHistoryId,
      familyMemberId
    });
    
    if (!medicalHistory) {
      req.flash('error_msg', 'Tıbbi geçmiş kaydı bulunamadı');
      return res.redirect(`/medical-history/${familyMemberId}`);
    }
    
    // Form verilerini al
    const { 
      title,
      date,
      endDate,
      ongoing,
      importance,
      notes
    } = req.body;
    
    // Temel bilgileri güncelle
    medicalHistory.title = title;
    medicalHistory.date = new Date(date);
    medicalHistory.ongoing = ongoing === 'on';
    medicalHistory.importance = importance || 'medium';
    medicalHistory.notes = notes;
    medicalHistory.updatedBy = req.user._id;
    
    // Eğer devam etmiyorsa ve bitiş tarihi varsa
    if (!medicalHistory.ongoing && endDate) {
      medicalHistory.endDate = new Date(endDate);
    } else if (medicalHistory.ongoing) {
      medicalHistory.endDate = undefined;
    }
    
    // Veri tipine göre özel alanları güncelle
    if (medicalHistory.type === 'diagnosis') {
      medicalHistory.diagnosis = {
        name: req.body['diagnosis.name'],
        icd10Code: req.body['diagnosis.icd10Code'],
        severity: req.body['diagnosis.severity'],
        chronic: req.body['diagnosis.chronic'] === 'on'
      };
    }
    else if (medicalHistory.type === 'surgery') {
      medicalHistory.surgery = {
        procedure: req.body['surgery.procedure'],
        method: req.body['surgery.method'],
        anesthesia: req.body['surgery.anesthesia'],
        duration: req.body['surgery.duration'] ? parseInt(req.body['surgery.duration']) : null,
        complications: req.body['surgery.complications'] ? req.body['surgery.complications'].split(',').map(c => c.trim()) : []
      };
    }
    else if (medicalHistory.type === 'hospitalization') {
      medicalHistory.hospitalization = {
        reason: req.body['hospitalization.reason'],
        ward: req.body['hospitalization.ward'],
        roomNumber: req.body['hospitalization.roomNumber'],
        durationDays: req.body['hospitalization.durationDays'] ? parseInt(req.body['hospitalization.durationDays']) : null,
        dischargeReason: req.body['hospitalization.dischargeReason']
      };
    }
    else if (medicalHistory.type === 'vaccination') {
      medicalHistory.vaccination = {
        name: req.body['vaccination.name'],
        dose: req.body['vaccination.dose'],
        manufacturer: req.body['vaccination.manufacturer'],
        lotNumber: req.body['vaccination.lotNumber'],
        nextDoseDate: req.body['vaccination.nextDoseDate'] ? new Date(req.body['vaccination.nextDoseDate']) : null
      };
    }
    else if (medicalHistory.type === 'test') {
      medicalHistory.test = {
        name: req.body['test.name'],
        results: req.body['test.results'],
        referenceRange: req.body['test.referenceRange'],
        interpretation: req.body['test.interpretation']
      };
    }
    
    // Doktor bilgilerini güncelle
    if (req.body['doctor.name']) {
      medicalHistory.doctor = {
        name: req.body['doctor.name'],
        specialty: req.body['doctor.specialty'],
        hospital: req.body['doctor.hospital'],
        phone: req.body['doctor.phone'],
        email: req.body['doctor.email']
      };
    } else {
      medicalHistory.doctor = undefined;
    }
    
    // Lokasyon bilgilerini güncelle
    if (req.body['location.name']) {
      medicalHistory.location = {
        name: req.body['location.name'],
        address: req.body['location.address'],
        city: req.body['location.city'],
        country: req.body['location.country'],
        phone: req.body['location.phone']
      };
    } else {
      medicalHistory.location = undefined;
    }
    
    // İlaç tedavileri bilgilerini güncelle
    if (req.body['medications'] && Array.isArray(req.body['medications'])) {
      const medications = [];
      
      for (let i = 0; i < req.body['medications'].length; i++) {
        const medication = {
          name: req.body[`medications[${i}].name`],
          dosage: req.body[`medications[${i}].dosage`],
          frequency: req.body[`medications[${i}].frequency`],
          startDate: req.body[`medications[${i}].startDate`] ? new Date(req.body[`medications[${i}].startDate`]) : null,
          endDate: req.body[`medications[${i}].endDate`] ? new Date(req.body[`medications[${i}].endDate`]) : null,
          ongoing: req.body[`medications[${i}].ongoing`] === 'on',
          reason: req.body[`medications[${i}].reason`]
        };
        
        medications.push(medication);
      }
      
      medicalHistory.medications = medications;
    } else {
      medicalHistory.medications = [];
    }
    
    // Öneriler bilgilerini güncelle
    if (req.body['recommendations.dietChanges'] || req.body['recommendations.activityRestrictions']) {
      medicalHistory.recommendations = {
        dietChanges: req.body['recommendations.dietChanges'],
        activityRestrictions: req.body['recommendations.activityRestrictions'],
        followUpDate: req.body['recommendations.followUpDate'] ? new Date(req.body['recommendations.followUpDate']) : null,
        referrals: req.body['recommendations.referrals'] ? req.body['recommendations.referrals'].split(',').map(r => r.trim()) : [],
        otherRecommendations: req.body['recommendations.otherRecommendations']
      };
    } else {
      medicalHistory.recommendations = undefined;
    }
    
    // Semptomları güncelle
    if (req.body.symptoms) {
      medicalHistory.symptoms = req.body.symptoms.split(',').map(s => s.trim());
    } else {
      medicalHistory.symptoms = [];
    }
    
    // Veriyi kaydet
    await medicalHistory.save();
    
// Log kaydı
logInfo('Tıbbi geçmiş kaydı güncellendi', {
    userId: req.user._id,
    familyMemberId,
    medicalHistoryId: medicalHistory._id
  });
  
  req.flash('success_msg', 'Tıbbi geçmiş kaydı başarıyla güncellendi');
  
  // Detay sayfasına yönlendir
  res.redirect(`/medical-history/${familyMemberId}/${medicalHistoryId}`);
} catch (error) {
  logError(error, req);
  
  if (error.name === 'ValidationError') {
    req.flash('error_msg', 'Geçersiz veya eksik veri');
    return res.redirect(`/medical-history/${req.params.familyMemberId}/${req.params.medicalHistoryId}/edit`);
  }
  
  req.flash('error_msg', 'Tıbbi geçmiş kaydı güncellenirken bir hata oluştu');
  res.redirect(`/medical-history/${req.params.familyMemberId}/${req.params.medicalHistoryId}/edit`);
}
};

/**
* Tıbbi geçmiş silme
* @route   DELETE /medical-history/:familyMemberId/:medicalHistoryId
* @access  Private
*/
exports.deleteMedicalHistory = async (req, res) => {
try {
  const { familyMemberId, medicalHistoryId } = req.params;
  
  // Aile üyesini kontrol et
  const familyMember = await FamilyMember.findOne({
    _id: familyMemberId,
    userId: req.user._id
  });
  
  if (!familyMember) {
    req.flash('error_msg', 'Aile üyesi bulunamadı');
    return res.redirect('/home');
  }
  
  // Tıbbi geçmiş kaydını bul ve sil
  const medicalHistory = await MedicalHistory.findOneAndDelete({
    _id: medicalHistoryId,
    familyMemberId
  });
  
  if (!medicalHistory) {
    req.flash('error_msg', 'Tıbbi geçmiş kaydı bulunamadı');
    return res.redirect(`/medical-history/${familyMemberId}`);
  }
  
  // Log kaydı
  logInfo('Tıbbi geçmiş kaydı silindi', {
    userId: req.user._id,
    familyMemberId,
    medicalHistoryId,
    type: medicalHistory.type
  });
  
  req.flash('success_msg', 'Tıbbi geçmiş kaydı başarıyla silindi');
  
  // Liste sayfasına yönlendir
  res.redirect(`/medical-history/${familyMemberId}`);
} catch (error) {
  logError(error, req);
  
  if (error.name === 'CastError') {
    req.flash('error_msg', 'Geçersiz ID formatı');
    return res.redirect(`/medical-history/${req.params.familyMemberId}`);
  }
  
  req.flash('error_msg', 'Tıbbi geçmiş kaydı silinirken bir hata oluştu');
  res.redirect(`/medical-history/${req.params.familyMemberId}`);
}
};

/**
* Dosya ekleme
* @route   POST /medical-history/:familyMemberId/:medicalHistoryId/attachment
* @access  Private
*/
exports.addAttachment = async (req, res) => {
try {
  const { familyMemberId, medicalHistoryId } = req.params;
  
  // Aile üyesini kontrol et
  const familyMember = await FamilyMember.findOne({
    _id: familyMemberId,
    userId: req.user._id
  });
  
  if (!familyMember) {
    req.flash('error_msg', 'Aile üyesi bulunamadı');
    return res.redirect('/home');
  }
  
  // Tıbbi geçmiş kaydını bul
  const medicalHistory = await MedicalHistory.findOne({
    _id: medicalHistoryId,
    familyMemberId
  });
  
  if (!medicalHistory) {
    req.flash('error_msg', 'Tıbbi geçmiş kaydı bulunamadı');
    return res.redirect(`/medical-history/${familyMemberId}`);
  }
  
  // Dosya kontrolü
  if (!req.file) {
    req.flash('error_msg', 'Lütfen bir dosya seçin');
    return res.redirect(`/medical-history/${familyMemberId}/${medicalHistoryId}`);
  }
  
  // Dosya bilgilerini al
  const { filename, originalname, mimetype, size, path: filePath } = req.file;
  const description = req.body.description || '';
  
  // Dosya ekle
  if (!medicalHistory.attachments) {
    medicalHistory.attachments = [];
  }
  
  medicalHistory.attachments.push({
    filename,
    originalName: originalname,
    mimeType: mimetype,
    size,
    path: filePath,
    uploadDate: new Date(),
    description
  });
  
  // Kaydet
  await medicalHistory.save();
  
  // Log kaydı
  logInfo('Tıbbi geçmiş kaydına dosya eklendi', {
    userId: req.user._id,
    familyMemberId,
    medicalHistoryId,
    filename
  });
  
  req.flash('success_msg', 'Dosya başarıyla eklendi');
  res.redirect(`/medical-history/${familyMemberId}/${medicalHistoryId}`);
} catch (error) {
  logError(error, req);
  
  req.flash('error_msg', 'Dosya eklenirken bir hata oluştu');
  res.redirect(`/medical-history/${req.params.familyMemberId}/${req.params.medicalHistoryId}`);
}
};

/**
* Dosya silme
* @route   DELETE /medical-history/:familyMemberId/:medicalHistoryId/attachment/:attachmentId
* @access  Private
*/
exports.deleteAttachment = async (req, res) => {
try {
  const { familyMemberId, medicalHistoryId, attachmentId } = req.params;
  
  // Aile üyesini kontrol et
  const familyMember = await FamilyMember.findOne({
    _id: familyMemberId,
    userId: req.user._id
  });
  
  if (!familyMember) {
    req.flash('error_msg', 'Aile üyesi bulunamadı');
    return res.redirect('/home');
  }
  
  // Tıbbi geçmiş kaydını bul
  const medicalHistory = await MedicalHistory.findOne({
    _id: medicalHistoryId,
    familyMemberId
  });
  
  if (!medicalHistory) {
    req.flash('error_msg', 'Tıbbi geçmiş kaydı bulunamadı');
    return res.redirect(`/medical-history/${familyMemberId}`);
  }
  
  // Dosyayı bul
  const attachmentIndex = medicalHistory.attachments.findIndex(
    attachment => attachment._id.toString() === attachmentId
  );
  
  if (attachmentIndex === -1) {
    req.flash('error_msg', 'Dosya bulunamadı');
    return res.redirect(`/medical-history/${familyMemberId}/${medicalHistoryId}`);
  }
  
  // Dosya bilgilerini al
  const attachment = medicalHistory.attachments[attachmentIndex];
  
  // Dosyayı sil
  medicalHistory.attachments.splice(attachmentIndex, 1);
  
  // Kaydet
  await medicalHistory.save();
  
  // Log kaydı
  logInfo('Tıbbi geçmiş kaydından dosya silindi', {
    userId: req.user._id,
    familyMemberId,
    medicalHistoryId,
    filename: attachment.filename
  });
  
  req.flash('success_msg', 'Dosya başarıyla silindi');
  res.redirect(`/medical-history/${familyMemberId}/${medicalHistoryId}`);
} catch (error) {
  logError(error, req);
  
  req.flash('error_msg', 'Dosya silinirken bir hata oluştu');
  res.redirect(`/medical-history/${req.params.familyMemberId}/${req.params.medicalHistoryId}`);
}
};

/**
* Kronik hastalıklar listesi
* @route   GET /medical-history/:familyMemberId/chronic
* @access  Private
*/
exports.getChronicConditions = async (req, res) => {
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
  
  // Kronik hastalıkları bul
  const chronicConditions = await MedicalHistory.findChronicConditions(familyMemberId);
  
  // Sayfayı render et
  res.render('front/chronic-conditions', {
    title: `${familyMember.name} ${familyMember.surname} - Kronik Hastalıklar`,
    familyMember,
    chronicConditions
  });
} catch (error) {
  logError(error, req);
  
  if (error.name === 'CastError') {
    req.flash('error_msg', 'Geçersiz aile üyesi ID formatı');
    return res.redirect('/home');
  }
  
  res.status(500).render('500', {
    title: 'Sunucu Hatası',
    message: 'Kronik hastalıklar alınırken bir hata oluştu',
    error: process.env.NODE_ENV === 'development' ? error : {}
  });
}
};

/**
* API: Tıbbi geçmiş listesi
* @route   GET /api/medical-history/:familyMemberId
* @access  Private
*/
exports.apiGetMedicalHistoryList = async (req, res) => {
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
  
  if (req.query.importance) {
    filter.importance = req.query.importance;
  }
  
  if (req.query.startDate && req.query.endDate) {
    filter.date = {
      $gte: new Date(req.query.startDate),
      $lte: new Date(req.query.endDate)
    };
  } else if (req.query.startDate) {
    filter.date = { $gte: new Date(req.query.startDate) };
  } else if (req.query.endDate) {
    filter.date = { $lte: new Date(req.query.endDate) };
  }
  
  // Sayfalama
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const skip = (page - 1) * limit;
  
  // Toplam kayıt sayısı
  const total = await MedicalHistory.countDocuments(filter);
  
  // Tıbbi geçmiş kayıtlarını getir
  const medicalHistory = await MedicalHistory.find(filter)
    .sort({ date: -1 })
    .skip(skip)
    .limit(limit);
  
  // Formatlı verileri hazırla
  const formattedData = medicalHistory.map(record => ({
    id: record._id,
    familyMemberId: record.familyMemberId,
    type: record.type,
    title: record.title,
    date: record.date,
    endDate: record.endDate,
    ongoing: record.ongoing,
    importance: record.importance,
    duration: record.duration,
    dateRange: record.dateRange,
    doctor: record.doctor ? {
      name: record.doctor.name,
      specialty: record.doctor.specialty,
      hospital: record.doctor.hospital
    } : null,
    location: record.location ? {
      name: record.location.name,
      city: record.location.city
    } : null,
    details: record.type === 'diagnosis' ? {
      name: record.diagnosis.name,
      chronic: record.diagnosis.chronic,
      severity: record.diagnosis.severity
    } : record.type === 'surgery' ? {
      procedure: record.surgery.procedure,
      method: record.surgery.method
    } : record.type === 'hospitalization' ? {
      reason: record.hospitalization.reason,
      durationDays: record.hospitalization.durationDays
    } : record.type === 'vaccination' ? {
      name: record.vaccination.name,
      dose: record.vaccination.dose
    } : record.type === 'test' ? {
      name: record.test.name,
      results: record.test.results
    } : null,
    hasAttachments: record.attachments && record.attachments.length > 0,
    attachmentsCount: record.attachments ? record.attachments.length : 0,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt
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
    error: 'Tıbbi geçmiş kayıtları alınırken bir hata oluştu'
  });
}
};

/**
* API: Tıbbi geçmiş detayı
* @route   GET /api/medical-history/:familyMemberId/:medicalHistoryId
* @access  Private
*/
exports.apiGetMedicalHistoryDetail = async (req, res) => {
try {
  const { familyMemberId, medicalHistoryId } = req.params;
  
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
  
  // Tıbbi geçmiş kaydını bul
  const medicalHistory = await MedicalHistory.findOne({
    _id: medicalHistoryId,
    familyMemberId
  });
  
  if (!medicalHistory) {
    return res.status(404).json({
      success: false,
      error: 'Tıbbi geçmiş kaydı bulunamadı'
    });
  }
  
  // API yanıtı
  res.json({
    success: true,
    data: {
      id: medicalHistory._id,
      familyMemberId: medicalHistory.familyMemberId,
      type: medicalHistory.type,
      title: medicalHistory.title,
      date: medicalHistory.date,
      endDate: medicalHistory.endDate,
      ongoing: medicalHistory.ongoing,
      importance: medicalHistory.importance,
      notes: medicalHistory.notes,
      doctor: medicalHistory.doctor,
      location: medicalHistory.location,
      diagnosis: medicalHistory.diagnosis,
      surgery: medicalHistory.surgery,
      hospitalization: medicalHistory.hospitalization,
      vaccination: medicalHistory.vaccination,
      test: medicalHistory.test,
      medications: medicalHistory.medications,
      recommendations: medicalHistory.recommendations,
      symptoms: medicalHistory.symptoms,
      attachments: medicalHistory.attachments ? medicalHistory.attachments.map(attachment => ({
        id: attachment._id,
        filename: attachment.filename,
        originalName: attachment.originalName,
        mimeType: attachment.mimeType,
        size: attachment.size,
        uploadDate: attachment.uploadDate,
        description: attachment.description
      })) : [],
      createdAt: medicalHistory.createdAt,
      updatedAt: medicalHistory.updatedAt
    }
  });
} catch (error) {
  logError(error, req);
  
  res.status(500).json({
    success: false,
    error: 'Tıbbi geçmiş detayı alınırken bir hata oluştu'
  });
}
};

module.exports = exports;
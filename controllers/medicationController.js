const Medication = require('../models/Medication');
const FamilyMember = require('../models/FamilyMember');
const Reminder = require('../models/Reminder');
const { logError, logInfo } = require('../middlewares/logger');
const mongoose = require('mongoose');

/**
 * İlaç listesini göster
 * @route   GET /medication/:familyMemberId
 * @access  Private
 */
exports.getMedicationList = async (req, res) => {
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
    
    // Filtreleme parametreleri
    const filter = { familyMemberId };
    
    if (req.query.isActive === 'true') {
      filter.isActive = true;
    } else if (req.query.isActive === 'false') {
      filter.isActive = false;
    }
    
    if (req.query.isCritical === 'true') {
      filter.isCritical = true;
    }
    
    // İlaçları getir
    const medications = await Medication.find(filter).sort({ isActive: -1, startDate: -1 });
    
    // İlaç uyum oranlarını hesapla
    const medicationsWithAdherence = await Promise.all(
      medications.map(async (medication) => {
        const adherence = await medication.checkMedicationStatus();
        return {
          ...medication.toObject(),
          adherence
        };
      })
    );
    
    // İlaç sayılarını hesapla
    const totalCount = medications.length;
    const activeCount = medications.filter(med => med.isActive).length;
    const criticalCount = medications.filter(med => med.isCritical).length;
    const lowInventoryCount = medications.filter(med => 
      med.isActive && 
      med.inventory && 
      med.inventory.unitsRemaining && 
      med.inventory.unitsRemaining <= 5
    ).length;
    
    // İlaç listesi sayfasını render et
    res.render('front/medication-list', {
      title: `${familyMember.name} ${familyMember.surname} - İlaçlar`,
      familyMember,
      medications: medicationsWithAdherence,
      filter: req.query,
      counts: {
        total: totalCount,
        active: activeCount,
        critical: criticalCount,
        lowInventory: lowInventoryCount
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
      message: 'İlaç verileri alınırken bir hata oluştu',
      error: process.env.NODE_ENV === 'development' ? error : {}
    });
  }
};

/**
 * Yeni ilaç ekleme sayfası
 * @route   GET /medication/:familyMemberId/add
 * @access  Private
 */
exports.getAddMedication = async (req, res) => {
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
    
    // İlaç ekleme sayfasını render et
    res.render('front/medication-form', {
      title: `${familyMember.name} ${familyMember.surname} - İlaç Ekle`,
      familyMember,
      formAction: `/medication/${familyMemberId}`,
      formMethod: 'POST',
      medication: null,
      dosageUnits: [
        { value: 'mg', label: 'Miligram (mg)' },
        { value: 'g', label: 'Gram (g)' },
        { value: 'mcg', label: 'Mikrogram (mcg)' },
        { value: 'mL', label: 'Mililitre (mL)' },
        { value: 'IU', label: 'Uluslararası Ünite (IU)' },
        { value: 'tsp', label: 'Tatlı Kaşığı' },
        { value: 'tbsp', label: 'Yemek Kaşığı' },
        { value: 'tablet', label: 'Tablet' },
        { value: 'kapsül', label: 'Kapsül' },
        { value: 'damla', label: 'Damla' },
        { value: 'ampul', label: 'Ampul' },
        { value: 'ünite', label: 'Ünite' },
        { value: 'diğer', label: 'Diğer' }
      ],
      dosageForms: [
        { value: 'tablet', label: 'Tablet' },
        { value: 'kapsül', label: 'Kapsül' },
        { value: 'şurup', label: 'Şurup' },
        { value: 'damla', label: 'Damla' },
        { value: 'merhem', label: 'Merhem' },
        { value: 'sprey', label: 'Sprey' },
        { value: 'iğne', label: 'İğne' },
        { value: 'patch', label: 'Bant' },
        { value: 'inhaler', label: 'İnhaler' },
        { value: 'diğer', label: 'Diğer' }
      ],
      frequencies: [
        { value: 'günde', label: 'Günde' },
        { value: 'haftada', label: 'Haftada' },
        { value: 'ayda', label: 'Ayda' }
      ],
      daysOfWeek: [
        { value: 'pazartesi', label: 'Pazartesi' },
        { value: 'salı', label: 'Salı' },
        { value: 'çarşamba', label: 'Çarşamba' },
        { value: 'perşembe', label: 'Perşembe' },
        { value: 'cuma', label: 'Cuma' },
        { value: 'cumartesi', label: 'Cumartesi' },
        { value: 'pazar', label: 'Pazar' }
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
      message: 'İlaç ekleme sayfası yüklenirken bir hata oluştu',
      error: process.env.NODE_ENV === 'development' ? error : {}
    });
  }
};

/**
 * İlaç ekleme
 * @route   POST /medication/:familyMemberId
 * @access  Private
 */
exports.addMedication = async (req, res) => {
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
      name,
      genericName,
      'dosage.value': dosageValue,
      'dosage.unit': dosageUnit,
      'dosage.form': dosageForm,
      startDate,
      endDate,
      duration,
      isActive,
      isRegular,
      isCritical,
      purpose,
      'prescribedBy.name': doctorName,
      'prescribedBy.specialty': doctorSpecialty,
      'prescribedBy.hospital': hospital,
      'prescribedBy.date': prescriptionDate,
      'pharmacy.name': pharmacyName,
      'pharmacy.address': pharmacyAddress,
      'pharmacy.phone': pharmacyPhone,
      'schedule.frequency': frequency,
      'schedule.frequencyCount': frequencyCount,
      daysOfWeek,
      'schedule.asNeeded': asNeeded,
      'schedule.instructions': instructions,
      sideEffects,
      'inventory.unitsRemaining': unitsRemaining,
      'inventory.unitsTotal': unitsTotal,
      'inventory.refillDate': refillDate,
      'inventory.refillReminder': refillReminder,
      'inventory.reminderDays': reminderDays,
      notes
    } = req.body;
    
    // Zamanları al
    const times = [];
    
    if (req.body['schedule.times'] && Array.isArray(req.body['schedule.times'])) {
      for (let i = 0; i < req.body['schedule.times'].length; i++) {
        const timeObj = {
          time: req.body[`schedule.times[${i}].time`],
          dosage: req.body[`schedule.times[${i}].dosage`] ? parseFloat(req.body[`schedule.times[${i}].dosage`]) : 1,
          withFood: req.body[`schedule.times[${i}].withFood`] === 'on'
        };
        
        times.push(timeObj);
      }
    } else if (req.body['schedule.times.time']) {
      // Tek zaman gönderilmişse
      times.push({
        time: req.body['schedule.times.time'],
        dosage: req.body['schedule.times.dosage'] ? parseFloat(req.body['schedule.times.dosage']) : 1,
        withFood: req.body['schedule.times.withFood'] === 'on'
      });
    }
    
    // Yan etkileri dizi haline getir
    const sideEffectsArray = sideEffects ? sideEffects.split(',').map(effect => effect.trim()) : [];
    
    // Etkileşimleri al
    const interactions = [];
    
    if (req.body['interactions'] && Array.isArray(req.body['interactions'])) {
      for (let i = 0; i < req.body['interactions'].length; i++) {
        const interaction = {
          medicationName: req.body[`interactions[${i}].medicationName`],
          description: req.body[`interactions[${i}].description`],
          severity: req.body[`interactions[${i}].severity`]
        };
        
        interactions.push(interaction);
      }
    } else if (req.body['interactions.medicationName']) {
      // Tek etkileşim gönderilmişse
      interactions.push({
        medicationName: req.body['interactions.medicationName'],
        description: req.body['interactions.description'],
        severity: req.body['interactions.severity']
      });
    }
    
    // Haftalık dozaj için günleri dizi olarak al
    const daysOfWeekArray = daysOfWeek ? (Array.isArray(daysOfWeek) ? daysOfWeek : [daysOfWeek]) : [];
    
    // Yeni ilaç oluştur
    const medication = new Medication({
      familyMemberId,
      name,
      genericName,
      dosage: {
        value: parseFloat(dosageValue),
        unit: dosageUnit,
        form: dosageForm
      },
      schedule: {
        times,
        frequency,
        frequencyCount: parseInt(frequencyCount),
        daysOfWeek: daysOfWeekArray,
        asNeeded: asNeeded === 'on',
        instructions
      },
      purpose,
      startDate: new Date(startDate),
      endDate: endDate ? new Date(endDate) : undefined,
      duration: duration ? parseInt(duration) : undefined,
      isActive: isActive === 'on',
      isRegular: isRegular === 'on',
      isCritical: isCritical === 'on',
      sideEffects: sideEffectsArray,
      interactions,
      createdBy: req.user._id
    });
    
    // Doktor bilgilerini ekle
    if (doctorName) {
      medication.prescribedBy = {
        name: doctorName,
        specialty: doctorSpecialty,
        hospital,
        date: prescriptionDate ? new Date(prescriptionDate) : undefined
      };
    }
    
    // Eczane bilgilerini ekle
    if (pharmacyName) {
      medication.pharmacy = {
        name: pharmacyName,
        address: pharmacyAddress,
        phone: pharmacyPhone
      };
    }
    
    // Envanter bilgilerini ekle
    if (unitsRemaining || unitsTotal) {
      medication.inventory = {
        unitsRemaining: unitsRemaining ? parseInt(unitsRemaining) : undefined,
        unitsTotal: unitsTotal ? parseInt(unitsTotal) : undefined,
        refillDate: refillDate ? new Date(refillDate) : undefined,
        refillReminder: refillReminder === 'on',
        reminderDays: reminderDays ? parseInt(reminderDays) : 3
      };
    }
    
    // Notları ekle
    if (notes) {
      medication.notes = notes;
    }
    
    // İlacı kaydet
    await medication.save();
    
    // İlaç hatırlatıcısı oluştur
    if (isActive === 'on' && isRegular === 'on' && times.length > 0) {
      // Her bir zaman için bir hatırlatıcı oluştur
      for (const time of times) {
        const reminderTitle = `İlaç Zamanı: ${name} ${time.dosage} ${dosageUnit}`;
        const reminderDescription = time.withFood ? 'Yemekle birlikte alınması gerekiyor.' : '';
        
        const reminder = new Reminder({
          familyMemberId,
          type: 'medication',
          title: reminderTitle,
          description: reminderDescription,
          medication: {
            medicationId: medication._id,
            dosage: `${time.dosage} ${dosageUnit}`,
            withFood: time.withFood,
            instructions: medication.schedule.instructions
          },
          schedule: {
            startDate: medication.startDate,
            endDate: medication.endDate,
            time: time.time,
            frequency: medication.schedule.frequency === 'günde' ? 'daily' : 
                       medication.schedule.frequency === 'haftada' ? 'weekly' : 
                       medication.schedule.frequency === 'ayda' ? 'monthly' : 'daily',
            daysOfWeek: medication.schedule.daysOfWeek
          },
          notification: {
            channels: {
              app: true,
              email: false,
              sms: false
            },
            sound: 'default',
            vibration: true
          },
          priority: medication.isCritical ? 'critical' : 'high',
          isActive: true,
          createdBy: req.user._id
        });
        
        await reminder.save();
        
        logInfo('İlaç hatırlatıcısı oluşturuldu', {
          userId: req.user._id,
          familyMemberId,
          medicationId: medication._id,
          reminderId: reminder._id
        });
      }
    }
    
    // Log kaydı
    logInfo('Yeni ilaç eklendi', {
      userId: req.user._id,
      familyMemberId,
      medicationId: medication._id
    });
    
    req.flash('success_msg', 'İlaç başarıyla eklendi');
    
    // İlaç listesine yönlendir
    res.redirect(`/medication/${familyMemberId}`);
  } catch (error) {
    logError(error, req);
    
    if (error.name === 'ValidationError') {
      req.flash('error_msg', 'Geçersiz veya eksik veri');
      return res.redirect(`/medication/${req.params.familyMemberId}/add`);
    }
    
    req.flash('error_msg', 'İlaç eklenirken bir hata oluştu');
    res.redirect(`/medication/${req.params.familyMemberId}/add`);
  }
};

/**
 * İlaç detayını göster
 * @route   GET /medication/:familyMemberId/:medicationId
 * @access  Private
 */
exports.getMedicationDetail = async (req, res) => {
  try {
    const { familyMemberId, medicationId } = req.params;
    
    // Aile üyesini kontrol et
    const familyMember = await FamilyMember.findOne({
      _id: familyMemberId,
      userId: req.user._id
    });
    
    if (!familyMember) {
      req.flash('error_msg', 'Aile üyesi bulunamadı');
      return res.redirect('/home');
    }
    
    // İlacı bul
    const medication = await Medication.findOne({
      _id: medicationId,
      familyMemberId
    });
    
    if (!medication) {
      req.flash('error_msg', 'İlaç bulunamadı');
      return res.redirect(`/medication/${familyMemberId}`);
    }
    
    // İlaç hatırlatıcılarını bul
    const reminders = await Reminder.find({
      familyMemberId,
      type: 'medication',
      'medication.medicationId': medicationId,
      isActive: true
    }).sort({ 'schedule.nextScheduled': 1 });
    
    // İlaç uyum oranını hesapla
    const adherence = await medication.checkMedicationStatus();
    
    // İlaç günlük programını al
    const schedule = await Medication.getDailySchedule(familyMemberId);
    
    // Günün ilaç dozlarını filtrele
    const todaySchedule = schedule.filter(item => 
      item.medicationId.toString() === medicationId
    );
    
    // Detay sayfasını render et
    res.render('front/medication-detail', {
      title: `${familyMember.name} ${familyMember.surname} - İlaç Detayı`,
      familyMember,
      medication,
      reminders,
      adherence,
      todaySchedule
    });
  } catch (error) {
    logError(error, req);
    
    if (error.name === 'CastError') {
      req.flash('error_msg', 'Geçersiz ID formatı');
      return res.redirect('/home');
    }
    
    res.status(500).render('500', {
      title: 'Sunucu Hatası',
      message: 'İlaç detayı alınırken bir hata oluştu',
      error: process.env.NODE_ENV === 'development' ? error : {}
    });
  }
};

/**
 * İlaç düzenleme sayfası
 * @route   GET /medication/:familyMemberId/:medicationId/edit
 * @access  Private
 */
exports.getEditMedication = async (req, res) => {
  try {
    const { familyMemberId, medicationId } = req.params;
    
    // Aile üyesini kontrol et
    const familyMember = await FamilyMember.findOne({
      _id: familyMemberId,
      userId: req.user._id
    });
    
    if (!familyMember) {
      req.flash('error_msg', 'Aile üyesi bulunamadı');
      return res.redirect('/home');
    }
    
    // İlacı bul
    const medication = await Medication.findOne({
      _id: medicationId,
      familyMemberId
    });
    
    if (!medication) {
      req.flash('error_msg', 'İlaç bulunamadı');
      return res.redirect(`/medication/${familyMemberId}`);
    }
    
    // Düzenleme sayfasını render et
    res.render('front/medication-form', {
      title: `${familyMember.name} ${familyMember.surname} - İlaç Düzenle`,
      familyMember,
      medication,
      formAction: `/medication/${familyMemberId}/${medicationId}?_method=PUT`,
      formMethod: 'POST',
      dosageUnits: [
        { value: 'mg', label: 'Miligram (mg)' },
        { value: 'g', label: 'Gram (g)' },
        { value: 'mcg', label: 'Mikrogram (mcg)' },
        { value: 'mL', label: 'Mililitre (mL)' },
        { value: 'IU', label: 'Uluslararası Ünite (IU)' },
        { value: 'tsp', label: 'Tatlı Kaşığı' },
        { value: 'tbsp', label: 'Yemek Kaşığı' },
        { value: 'tablet', label: 'Tablet' },
        { value: 'kapsül', label: 'Kapsül' },
        { value: 'damla', label: 'Damla' },
        { value: 'ampul', label: 'Ampul' },
        { value: 'ünite', label: 'Ünite' },
        { value: 'diğer', label: 'Diğer' }
      ],
      dosageForms: [
        { value: 'tablet', label: 'Tablet' },
        { value: 'kapsül', label: 'Kapsül' },
        { value: 'şurup', label: 'Şurup' },
        { value: 'damla', label: 'Damla' },
        { value: 'merhem', label: 'Merhem' },
        { value: 'sprey', label: 'Sprey' },
        { value: 'iğne', label: 'İğne' },
        { value: 'patch', label: 'Bant' },
        { value: 'inhaler', label: 'İnhaler' },
        { value: 'diğer', label: 'Diğer' }
      ],
      frequencies: [
        { value: 'günde', label: 'Günde' },
        { value: 'haftada', label: 'Haftada' },
        { value: 'ayda', label: 'Ayda' }
      ],
      daysOfWeek: [
        { value: 'pazartesi', label: 'Pazartesi' },
        { value: 'salı', label: 'Salı' },
        { value: 'çarşamba', label: 'Çarşamba' },
        { value: 'perşembe', label: 'Perşembe' },
        { value: 'cuma', label: 'Cuma' },
        { value: 'cumartesi', label: 'Cumartesi' },
        { value: 'pazar', label: 'Pazar' }
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
      message: 'İlaç düzenleme sayfası yüklenirken bir hata oluştu',
      error: process.env.NODE_ENV === 'development' ? error : {}
    });
  }
};

/**
 * İlaç güncelleme
 * @route   PUT /medication/:familyMemberId/:medicationId
 * @access  Private
 */
exports.updateMedication = async (req, res) => {
  try {
    const { familyMemberId, medicationId } = req.params;
    
    // Aile üyesini kontrol et
    const familyMember = await FamilyMember.findOne({
      _id: familyMemberId,
      userId: req.user._id
    });
    
    if (!familyMember) {
      req.flash('error_msg', 'Aile üyesi bulunamadı');
      return res.redirect('/home');
    }
    
    // İlacı bul
    const medication = await Medication.findOne({
      _id: medicationId,
      familyMemberId
    });
    
    if (!medication) {
      req.flash('error_msg', 'İlaç bulunamadı');
      return res.redirect(`/medication/${familyMemberId}`);
    }
    
    // Önceki aktiflik durumunu kaydet
    const wasActive = medication.isActive;
    
    // Form verilerini al
    const { 
      name,
      genericName,
      'dosage.value': dosageValue,
      'dosage.unit': dosageUnit,
      'dosage.form': dosageForm,
      startDate,
      endDate,
      duration,
      isActive,
      isRegular,
      isCritical,
      purpose,
      'prescribedBy.name': doctorName,
      'prescribedBy.specialty': doctorSpecialty,
      'prescribedBy.hospital': hospital,
      'prescribedBy.date': prescriptionDate,
      'pharmacy.name': pharmacyName,
      'pharmacy.address': pharmacyAddress,
      'pharmacy.phone': pharmacyPhone,
      'schedule.frequency': frequency,
      'schedule.frequencyCount': frequencyCount,
      daysOfWeek,
      'schedule.asNeeded': asNeeded,
      'schedule.instructions': instructions,
      sideEffects,
      'inventory.unitsRemaining': unitsRemaining,
      'inventory.unitsTotal': unitsTotal,
      'inventory.refillDate': refillDate,
      'inventory.refillReminder': refillReminder,
      'inventory.reminderDays': reminderDays,
      notes
    } = req.body;
    
    // Zamanları al
    const times = [];
    
    if (req.body['schedule.times'] && Array.isArray(req.body['schedule.times'])) {
      for (let i = 0; i < req.body['schedule.times'].length; i++) {
        const timeObj = {
          time: req.body[`schedule.times[${i}].time`],
          dosage: req.body[`schedule.times[${i}].dosage`] ? parseFloat(req.body[`schedule.times[${i}].dosage`]) : 1,
          withFood: req.body[`schedule.times[${i}].withFood`] === 'on'
        };
        
        times.push(timeObj);
      }
    } else if (req.body['schedule.times.time']) {
      // Tek zaman gönderilmişse
      times.push({
        time: req.body['schedule.times.time'],
        dosage: req.body['schedule.times.dosage'] ? parseFloat(req.body['schedule.times.dosage']) : 1,
        withFood: req.body['schedule.times.withFood'] === 'on'
      });
    }
    
    // Yan etkileri dizi haline getir
    const sideEffectsArray = sideEffects ? sideEffects.split(',').map(effect => effect.trim()) : [];
    
    // Etkileşimleri al
    const interactions = [];
    
    if (req.body['interactions'] && Array.isArray(req.body['interactions'])) {
      for (let i = 0; i < req.body['interactions'].length; i++) {
        const interaction = {
          medicationName: req.body[`interactions[${i}].medicationName`],
          description: req.body[`interactions[${i}].description`],
          severity: req.body[`interactions[${i}].severity`]
        };
        
        interactions.push(interaction);
      }
    } else if (req.body['interactions.medicationName']) {
      // Tek etkileşim gönderilmişse
      interactions.push({
        medicationName: req.body['interactions.medicationName'],
        description: req.body['interactions.description'],
        severity: req.body['interactions.severity']
      });
    }
    
    // Haftalık dozaj için günleri dizi olarak al
    const daysOfWeekArray = daysOfWeek ? (Array.isArray(daysOfWeek) ? daysOfWeek : [daysOfWeek]) : [];
    
    // İlacı güncelle
    medication.name = name;
    medication.genericName = genericName;
    medication.dosage = {
      value: parseFloat(dosageValue),
      unit: dosageUnit,
      form: dosageForm
    };
    medication.schedule = {
      times,
      frequency,
      frequencyCount: parseInt(frequencyCount),
      daysOfWeek: daysOfWeekArray,
      asNeeded: asNeeded === 'on',
      instructions
    };
    medication.purpose = purpose;
    medication.startDate = new Date(startDate);
    medication.endDate = endDate ? new Date(endDate) : undefined;
    medication.duration = duration ? parseInt(duration) : undefined;
    medication.isActive = isActive === 'on';
    medication.isRegular = isRegular === 'on';
    medication.isCritical = isCritical === 'on';
    medication.sideEffects = sideEffectsArray;
    medication.interactions = interactions;
    medication.updatedBy = req.user._id;
    
    // Doktor bilgilerini güncelle
    if (doctorName) {
      medication.prescribedBy = {
        name: doctorName,
        specialty: doctorSpecialty,
        hospital,
        date: prescriptionDate ? new Date(prescriptionDate) : undefined
      };
    } else {
      medication.prescribedBy = undefined;
    }
    
    // Eczane bilgilerini güncelle
    if (pharmacyName) {
      medication.pharmacy = {
        name: pharmacyName,
        address: pharmacyAddress,
        phone: pharmacyPhone
      };
    } else {
      medication.pharmacy = undefined;
    }
    
    // Envanter bilgilerini güncelle
    if (unitsRemaining || unitsTotal) {
      medication.inventory = {
        unitsRemaining: unitsRemaining ? parseInt(unitsRemaining) : undefined,
        unitsTotal: unitsTotal ? parseInt(unitsTotal) : undefined,
        refillDate: refillDate ? new Date(refillDate) : undefined,
        refillReminder: refillReminder === 'on',
        reminderDays: reminderDays ? parseInt(reminderDays) : 3
      };
    } else {
      medication.inventory = undefined;
    }
    
    // Notları güncelle
    medication.notes = notes;
    
    // İlacı kaydet
    await medication.save();
    
    // İlaç hatırlatıcılarını güncelle
    // Eğer aktiflik durumu değiştiyse veya aktif ve düzenli ise
    if (isActive === 'on' && isRegular === 'on') {
      // Önce mevcut hatırlatıcıları bul
      const existingReminders = await Reminder.find({
        familyMemberId,
        type: 'medication',
        'medication.medicationId': medicationId
      });
      
      // Mevcut hatırlatıcıları devre dışı bırak
      if (existingReminders.length > 0) {
        for (const reminder of existingReminders) {
          reminder.isActive = false;
          await reminder.save();
        }
      }
      
      // Yeni hatırlatıcılar oluştur
      if (times.length > 0) {
        for (const time of times) {
          const reminderTitle = `İlaç Zamanı: ${name} ${time.dosage} ${dosageUnit}`;
          const reminderDescription = time.withFood ? 'Yemekle birlikte alınması gerekiyor.' : '';
          
          const reminder = new Reminder({
            familyMemberId,
            type: 'medication',
            title: reminderTitle,
            description: reminderDescription,
            medication: {
              medicationId: medication._id,
              dosage: `${time.dosage} ${dosageUnit}`,
              withFood: time.withFood,
              instructions: medication.schedule.instructions
            },
            schedule: {
              startDate: medication.startDate,
              endDate: medication.endDate,
              time: time.time,
              frequency: medication.schedule.frequency === 'günde' ? 'daily' : 
                         medication.schedule.frequency === 'haftada' ? 'weekly' : 
                         medication.schedule.frequency === 'ayda' ? 'monthly' : 'daily',
              daysOfWeek: medication.schedule.daysOfWeek
            },
            notification: {
              channels: {
                app: true,
                email: false,
                sms: false
              },
              sound: 'default',
              vibration: true
            },
            priority: medication.isCritical ? 'critical' : 'high',
            isActive: true,
            createdBy: req.user._id
          });
          
          await reminder.save();
          
          logInfo('İlaç hatırlatıcısı güncellendi', {
            userId: req.user._id,
            familyMemberId,
            medicationId: medication._id,
            reminderId: reminder._id
          });
        }
      }
    } 
    // Eğer aktif değilse, tüm hatırlatıcıları devre dışı bırak
    else if (isActive !== 'on' && wasActive) {
      const existingReminders = await Reminder.find({
        familyMemberId,
        type: 'medication',
        'medication.medicationId': medicationId,
        isActive: true
      });
      
      if (existingReminders.length > 0) {
        for (const reminder of existingReminders) {
          reminder.isActive = false;
          await reminder.save();
          
          logInfo('İlaç hatırlatıcısı devre dışı bırakıldı', {
            userId: req.user._id,
            familyMemberId,
            medicationId: medication._id,
            reminderId: reminder._id
          });
        }
      }
    }
    
    // Log kaydı
    logInfo('İlaç güncellendi', {
      userId: req.user._id,
      familyMemberId,
      medicationId: medication._id
    });
    
    req.flash('success_msg', 'İlaç başarıyla güncellendi');
    
    // Detay sayfasına yönlendir
    res.redirect(`/medication/${familyMemberId}/${medicationId}`);
  } catch (error) {
    logError(error, req);
    
    if (error.name === 'ValidationError') {
      req.flash('error_msg', 'Geçersiz veya eksik veri');
      return res.redirect(`/medication/${req.params.familyMemberId}/${req.params.medicationId}/edit`);
    }
    
    req.flash('error_msg', 'İlaç güncellenirken bir hata oluştu');
    res.redirect(`/medication/${req.params.familyMemberId}/${req.params.medicationId}/edit`);
  }
};

/**
 * İlaç silme
 * @route   DELETE /medication/:familyMemberId/:medicationId
 * @access  Private
 */
exports.deleteMedication = async (req, res) => {
  try {
    const { familyMemberId, medicationId } = req.params;
    
    // Aile üyesini kontrol et
    const familyMember = await FamilyMember.findOne({
      _id: familyMemberId,
      userId: req.user._id
    });
    
    if (!familyMember) {
      req.flash('error_msg', 'Aile üyesi bulunamadı');
      return res.redirect('/home');
    }
    
    // İlacı bul ve sil
    const medication = await Medication.findOneAndDelete({
      _id: medicationId,
      familyMemberId
    });
    
    if (!medication) {
      req.flash('error_msg', 'İlaç bulunamadı');
      return res.redirect(`/medication/${familyMemberId}`);
    }
    
    // İlaca ait hatırlatıcıları sil
    await Reminder.deleteMany({
      familyMemberId,
      type: 'medication',
      'medication.medicationId': medicationId
    });
    
    // Log kaydı
    logInfo('İlaç silindi', {
      userId: req.user._id,
      familyMemberId,
      medicationId,
      medicationName: medication.name
    });
    
    req.flash('success_msg', 'İlaç başarıyla silindi');
    
    // Liste sayfasına yönlendir
    res.redirect(`/medication/${familyMemberId}`);
  } catch (error) {
    logError(error, req);
    
    if (error.name === 'CastError') {
      req.flash('error_msg', 'Geçersiz ID formatı');
      return res.redirect(`/medication/${req.params.familyMemberId}`);
    }
    
    req.flash('error_msg', 'İlaç silinirken bir hata oluştu');
    res.redirect(`/medication/${req.params.familyMemberId}`);
  }
};

/**
 * İlaç envanter güncelleme
 * @route   PUT /medication/:familyMemberId/:medicationId/inventory
 * @access  Private
 */
exports.updateInventory = async (req, res) => {
  try {
    const { familyMemberId, medicationId } = req.params;
    
    // Aile üyesini kontrol et
    const familyMember = await FamilyMember.findOne({
      _id: familyMemberId,
      userId: req.user._id
    });
    
    if (!familyMember) {
      req.flash('error_msg', 'Aile üyesi bulunamadı');
      return res.redirect('/home');
    }
    
    // İlacı bul
    const medication = await Medication.findOne({
      _id: medicationId,
      familyMemberId
    });
    
    if (!medication) {
      req.flash('error_msg', 'İlaç bulunamadı');
      return res.redirect(`/medication/${familyMemberId}`);
    }
    
    // Form verilerini al
    const { 
      unitsRemaining,
      unitsTotal,
      refillDate,
      refillReminder,
      reminderDays
    } = req.body;
    
    // Envanter bilgilerini güncelle
    if (!medication.inventory) {
      medication.inventory = {};
    }
    
    medication.inventory.unitsRemaining = unitsRemaining ? parseInt(unitsRemaining) : undefined;
    medication.inventory.unitsTotal = unitsTotal ? parseInt(unitsTotal) : undefined;
    medication.inventory.refillDate = refillDate ? new Date(refillDate) : undefined;
    medication.inventory.refillReminder = refillReminder === 'on';
    medication.inventory.reminderDays = reminderDays ? parseInt(reminderDays) : 3;
    
    // İlacı kaydet
    await medication.save();
    
    // Log kaydı
    logInfo('İlaç envanteri güncellendi', {
      userId: req.user._id,
      familyMemberId,
      medicationId: medication._id
    });
    
    req.flash('success_msg', 'İlaç envanteri başarıyla güncellendi');
    
    // Detay sayfasına yönlendir
    res.redirect(`/medication/${familyMemberId}/${medicationId}`);
  } catch (error) {
    logError(error, req);
    
    req.flash('error_msg', 'İlaç envanteri güncellenirken bir hata oluştu');
    res.redirect(`/medication/${req.params.familyMemberId}/${req.params.medicationId}`);
  }
};

/**
 * İlaç durumunu güncelleme (aktif/pasif)
 * @route   PATCH /medication/:familyMemberId/:medicationId/status
 * @access  Private
 */
exports.updateStatus = async (req, res) => {
  try {
    const { familyMemberId, medicationId } = req.params;
    
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
      
      // İlacı bul
      const medication = await Medication.findOne({
        _id: medicationId,
        familyMemberId
      });
      
      if (!medication) {
        return res.status(404).json({
          success: false,
          error: 'İlaç bulunamadı'
        });
      }
      
      // Durumu değiştir
      medication.isActive = !medication.isActive;
      
      // İlacı kaydet
      await medication.save();
      
      // Eğer aktif değilse, hatırlatıcıları devre dışı bırak
      if (!medication.isActive) {
        const reminders = await Reminder.find({
          familyMemberId,
          type: 'medication',
          'medication.medicationId': medicationId,
          isActive: true
        });
        
        for (const reminder of reminders) {
          reminder.isActive = false;
          await reminder.save();
          
          logInfo('İlaç hatırlatıcısı devre dışı bırakıldı', {
            userId: req.user._id,
            familyMemberId,
            medicationId,
            reminderId: reminder._id
          });
        }
      }
      // Eğer aktif hale getirildiyse ve düzenli ilaçsa, hatırlatıcı oluştur
      else if (medication.isRegular && medication.schedule.times.length > 0) {
        // Hatırlatıcıları oluştur
        for (const time of medication.schedule.times) {
          const reminderTitle = `İlaç Zamanı: ${medication.name} ${time.dosage} ${medication.dosage.unit}`;
          const reminderDescription = time.withFood ? 'Yemekle birlikte alınması gerekiyor.' : '';
          
          const reminder = new Reminder({
            familyMemberId,
            type: 'medication',
            title: reminderTitle,
            description: reminderDescription,
            medication: {
              medicationId: medication._id,
              dosage: `${time.dosage} ${medication.dosage.unit}`,
              withFood: time.withFood,
              instructions: medication.schedule.instructions
            },
            schedule: {
              startDate: medication.startDate,
              endDate: medication.endDate,
              time: time.time,
              frequency: medication.schedule.frequency === 'günde' ? 'daily' : 
                         medication.schedule.frequency === 'haftada' ? 'weekly' : 
                         medication.schedule.frequency === 'ayda' ? 'monthly' : 'daily',
              daysOfWeek: medication.schedule.daysOfWeek
            },
            notification: {
              channels: {
                app: true,
                email: false,
                sms: false
              },
              sound: 'default',
              vibration: true
            },
            priority: medication.isCritical ? 'critical' : 'high',
            isActive: true,
            createdBy: req.user._id
          });
          
          await reminder.save();
          
          logInfo('İlaç hatırlatıcısı oluşturuldu', {
            userId: req.user._id,
            familyMemberId,
            medicationId,
            reminderId: reminder._id
          });
        }
      }
      
      // Log kaydı
      logInfo(`İlaç durumu ${medication.isActive ? 'aktif' : 'pasif'} olarak güncellendi`, {
        userId: req.user._id,
        familyMemberId,
        medicationId
      });
      
      // Başarılı yanıt
      return res.json({
        success: true,
        data: {
          id: medication._id,
          isActive: medication.isActive
        }
      });
    } catch (error) {
      logError(error, req);
      
      res.status(500).json({
        success: false,
        error: 'İlaç durumu güncellenirken bir hata oluştu'
      });
    }
  };
  
  /**
   * İlaç alımı kaydet
   * @route   POST /medication/:familyMemberId/:medicationId/log
   * @access  Private
   */
  exports.logMedicationTaken = async (req, res) => {
    try {
      const { familyMemberId, medicationId } = req.params;
      
      // Aile üyesini kontrol et
      const familyMember = await FamilyMember.findOne({
        _id: familyMemberId,
        userId: req.user._id
      });
      
      if (!familyMember) {
        req.flash('error_msg', 'Aile üyesi bulunamadı');
        return res.redirect('/home');
      }
      
      // İlacı bul
      const medication = await Medication.findOne({
        _id: medicationId,
        familyMemberId
      });
      
      if (!medication) {
        req.flash('error_msg', 'İlaç bulunamadı');
        return res.redirect(`/medication/${familyMemberId}`);
      }
      
      // Form verilerini al
      const { 
        scheduledTime,
        takenTime,
        status,
        dosageTaken,
        notes,
        symptoms
      } = req.body;
      
      // Semptomları dizi haline getir
      const symptomsArray = symptoms ? symptoms.split(',').map(s => s.trim()) : [];
      
      // İlaç alım kaydı oluştur
      if (!medication.medicationLogs) {
        medication.medicationLogs = [];
      }
      
      medication.medicationLogs.push({
        scheduledTime: new Date(scheduledTime),
        takenTime: takenTime ? new Date(takenTime) : status === 'taken' ? new Date() : undefined,
        status,
        dosageTaken: dosageTaken ? parseFloat(dosageTaken) : undefined,
        notes,
        symptomsAfter: symptomsArray,
        createdBy: req.user._id
      });
      
      // İlacı kaydet
      await medication.save();
      
      // Hatırlatıcıyı güncelle (eğer varsa)
      const reminder = await Reminder.findOne({
        familyMemberId,
        type: 'medication',
        'medication.medicationId': medicationId,
        'schedule.time': new Date(scheduledTime).toISOString().substr(11, 5), // Saat kısmını al (HH:MM)
        isActive: true
      });
      
      if (reminder) {
        // Hatırlatıcı tamamlandı olarak işaretle
        await reminder.markCompletion(
          status === 'taken' ? 'completed' : status === 'skipped' ? 'skipped' : 'missed',
          notes
        );
      }
      
      // Log kaydı
      logInfo('İlaç alım kaydı eklendi', {
        userId: req.user._id,
        familyMemberId,
        medicationId,
        status
      });
      
      req.flash('success_msg', 'İlaç alım kaydı başarıyla eklendi');
      
      // Detay sayfasına yönlendir
      res.redirect(`/medication/${familyMemberId}/${medicationId}`);
    } catch (error) {
      logError(error, req);
      
      req.flash('error_msg', 'İlaç alım kaydı eklenirken bir hata oluştu');
      res.redirect(`/medication/${req.params.familyMemberId}/${req.params.medicationId}`);
    }
  };
  
  /**
   * İlaç günlük programı
   * @route   GET /medication/:familyMemberId/schedule
   * @access  Private
   */
  exports.getMedicationSchedule = async (req, res) => {
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
      
      // Tarih parametresi
      const date = req.query.date ? new Date(req.query.date) : new Date();
      
      // Günlük ilaç programını al
      const schedule = await Medication.getDailySchedule(familyMemberId, date);
      
      // Saatlere göre grupla
      const scheduleByHour = {};
      
      for (const item of schedule) {
        const hour = item.time.split(':')[0];
        
        if (!scheduleByHour[hour]) {
          scheduleByHour[hour] = [];
        }
        
        scheduleByHour[hour].push(item);
      }
      
      // Programdaki ilaçları getir
      const medicationIds = [...new Set(schedule.map(item => item.medicationId))];
      const medications = await Medication.find({
        _id: { $in: medicationIds },
        familyMemberId
      });
      
      // Program sayfasını render et
      res.render('front/medication-schedule', {
        title: `${familyMember.name} ${familyMember.surname} - İlaç Programı`,
        familyMember,
        date,
        schedule,
        scheduleByHour,
        medications,
        dateString: date.toLocaleDateString('tr-TR', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        })
      });
    } catch (error) {
      logError(error, req);
      
      if (error.name === 'CastError') {
        req.flash('error_msg', 'Geçersiz aile üyesi ID formatı');
        return res.redirect('/home');
      }
      
      res.status(500).render('500', {
        title: 'Sunucu Hatası',
        message: 'İlaç programı alınırken bir hata oluştu',
        error: process.env.NODE_ENV === 'development' ? error : {}
      });
    }
  };
  
  /**
   * API: İlaç listesi
   * @route   GET /api/medication/:familyMemberId
   * @access  Private
   */
  exports.apiGetMedicationList = async (req, res) => {
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
      
      if (req.query.isActive === 'true') {
        filter.isActive = true;
      } else if (req.query.isActive === 'false') {
        filter.isActive = false;
      }
      
      if (req.query.isCritical === 'true') {
        filter.isCritical = true;
      }
      
      // İlaçları getir
      const medications = await Medication.find(filter).sort({ isActive: -1, startDate: -1 });
      
      // İlaç uyum oranlarını hesapla
      const medicationsWithAdherence = await Promise.all(
        medications.map(async (medication) => {
          const adherence = await medication.checkMedicationStatus();
          return {
            id: medication._id,
            name: medication.name,
            genericName: medication.genericName,
            dosage: {
              value: medication.dosage.value,
              unit: medication.dosage.unit,
              form: medication.dosage.form
            },
            startDate: medication.startDate,
            endDate: medication.endDate,
            isActive: medication.isActive,
            isRegular: medication.isRegular,
            isCritical: medication.isCritical,
            schedule: {
              times: medication.schedule.times,
              frequency: medication.schedule.frequency,
              frequencyCount: medication.schedule.frequencyCount,
              daysOfWeek: medication.schedule.daysOfWeek,
              asNeeded: medication.schedule.asNeeded
            },
            inventory: medication.inventory || null,
            adherence,
            daysRemaining: medication.daysRemaining || null,
            dailyDosage: medication.dailyDosage || null
          };
        })
      );
      
      // API yanıtı
      res.json({
        success: true,
        count: medicationsWithAdherence.length,
        data: medicationsWithAdherence
      });
    } catch (error) {
      logError(error, req);
      
      res.status(500).json({
        success: false,
        error: 'İlaç verileri alınırken bir hata oluştu'
      });
    }
  };
  
  /**
   * API: İlaç detayı
   * @route   GET /api/medication/:familyMemberId/:medicationId
   * @access  Private
   */
  exports.apiGetMedicationDetail = async (req, res) => {
    try {
      const { familyMemberId, medicationId } = req.params;
      
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
      
      // İlacı bul
      const medication = await Medication.findOne({
        _id: medicationId,
        familyMemberId
      });
      
      if (!medication) {
        return res.status(404).json({
          success: false,
          error: 'İlaç bulunamadı'
        });
      }
      
      // İlaç uyum oranını hesapla
      const adherence = await medication.checkMedicationStatus();
      
      // Hatırlatıcıları bul
      const reminders = await Reminder.find({
        familyMemberId,
        type: 'medication',
        'medication.medicationId': medicationId,
        isActive: true
      }).sort({ 'schedule.nextScheduled': 1 });
      
      const reminderData = reminders.map(reminder => ({
        id: reminder._id,
        title: reminder.title,
        nextScheduled: reminder.schedule.nextScheduled,
        priority: reminder.priority
      }));
      
      // API yanıtı
      res.json({
        success: true,
        data: {
          id: medication._id,
          name: medication.name,
          genericName: medication.genericName,
          dosage: medication.dosage,
          schedule: medication.schedule,
          purpose: medication.purpose,
          startDate: medication.startDate,
          endDate: medication.endDate,
          duration: medication.duration,
          isActive: medication.isActive,
          isRegular: medication.isRegular,
          isCritical: medication.isCritical,
          prescribedBy: medication.prescribedBy,
          pharmacy: medication.pharmacy,
          sideEffects: medication.sideEffects,
          interactions: medication.interactions,
          inventory: medication.inventory,
          notes: medication.notes,
          medicationLogs: medication.medicationLogs,
          adherence,
          reminders: reminderData,
          daysRemaining: medication.daysRemaining,
          dailyDosage: medication.dailyDosage,
          statusText: medication.statusText,
          fullName: medication.fullName,
          createdAt: medication.createdAt,
          updatedAt: medication.updatedAt
        }
      });
    } catch (error) {
      logError(error, req);
      
      res.status(500).json({
        success: false,
        error: 'İlaç detayı alınırken bir hata oluştu'
      });
    }
  };
  
  /**
   * API: Günlük ilaç programı
   * @route   GET /api/medication/:familyMemberId/schedule
   * @access  Private
   */
  exports.apiGetMedicationSchedule = async (req, res) => {
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
      
      // Tarih parametresi
      const date = req.query.date ? new Date(req.query.date) : new Date();
      
      // Günlük ilaç programını al
      const schedule = await Medication.getDailySchedule(familyMemberId, date);
      
      // API yanıtı
      res.json({
        success: true,
        date: date,
        count: schedule.length,
        data: schedule
      });
    } catch (error) {
      logError(error, req);
      
      res.status(500).json({
        success: false,
        error: 'İlaç programı alınırken bir hata oluştu'
      });
    }
  };
  
  /**
   * API: İlaç alım kaydı
   * @route   POST /api/medication/:familyMemberId/:medicationId/log
   * @access  Private
   */
  exports.apiLogMedicationTaken = async (req, res) => {
    try {
      const { familyMemberId, medicationId } = req.params;
      
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
      
      // İlacı bul
      const medication = await Medication.findOne({
        _id: medicationId,
        familyMemberId
      });
      
      if (!medication) {
        return res.status(404).json({
          success: false,
          error: 'İlaç bulunamadı'
        });
      }
      
      // Gerekli alanları kontrol et
      if (!req.body.scheduledTime || !req.body.status) {
        return res.status(400).json({
          success: false,
          error: 'Gerekli alanları doldurmanız gerekiyor'
        });
      }
      
      // Form verilerini al
      const { 
        scheduledTime,
        takenTime,
        status,
        dosageTaken,
        notes,
        symptoms
      } = req.body;
      
      // Semptomları dizi haline getir
      const symptomsArray = symptoms ? (Array.isArray(symptoms) ? symptoms : symptoms.split(',').map(s => s.trim())) : [];
      
      // İlaç alım kaydı oluştur
      if (!medication.medicationLogs) {
        medication.medicationLogs = [];
      }
      
      medication.medicationLogs.push({
        scheduledTime: new Date(scheduledTime),
        takenTime: takenTime ? new Date(takenTime) : status === 'taken' ? new Date() : undefined,
        status,
        dosageTaken: dosageTaken ? parseFloat(dosageTaken) : undefined,
        notes,
        symptomsAfter: symptomsArray,
        createdBy: req.user ? req.user._id : req.admin._id
      });
      
      // İlacı kaydet
      await medication.save();
      
      // Hatırlatıcıyı güncelle (eğer varsa)
      const reminder = await Reminder.findOne({
        familyMemberId,
        type: 'medication',
        'medication.medicationId': medicationId,
        'schedule.time': new Date(scheduledTime).toISOString().substr(11, 5), // Saat kısmını al (HH:MM)
        isActive: true
      });
      
      if (reminder) {
        // Hatırlatıcı tamamlandı olarak işaretle
        await reminder.markCompletion(
          status === 'taken' ? 'completed' : status === 'skipped' ? 'skipped' : 'missed',
          notes
        );
      }
      
      // Log kaydı
      logInfo('API: İlaç alım kaydı eklendi', {
        userId: req.user ? req.user._id : req.admin._id,
        familyMemberId,
        medicationId,
        status
      });
      
      // API yanıtı
      res.status(201).json({
        success: true,
        data: {
          id: medication._id,
          medicationLog: medication.medicationLogs[medication.medicationLogs.length - 1]
        }
      });
    } catch (error) {
      logError(error, req);
      
      res.status(500).json({
        success: false,
        error: 'İlaç alım kaydı eklenirken bir hata oluştu'
      });
    }
  };
  
  module.exports = exports;
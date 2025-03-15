const { body, param, query, validationResult } = require('express-validator');
const mongoose = require('mongoose');

/**
 * Validation sonuçlarını kontrol eden middleware
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    // API isteklerinde JSON yanıtı dön
    if (req.originalUrl.startsWith('/api')) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }
    
    // Web formlarında flash mesajı ile hata sayfasına yönlendir
    req.flash('error_msg', errors.array()[0].msg);
    return res.redirect('back');
  }
  
  next();
};

/**
 * ObjectId formatı doğrulama
 * @param {string} paramName - Parametre adı
 */
const validateObjectId = (paramName) => {
  return param(paramName)
    .custom(value => {
      if (!mongoose.Types.ObjectId.isValid(value)) {
        throw new Error(`Geçersiz ${paramName} ID formatı`);
      }
      return true;
    });
};

/**
 * E-posta adresi doğrulama
 */
const validateEmail = () => {
  return body('email')
    .trim()
    .isEmail().withMessage('Geçerli bir e-posta adresi giriniz')
    .normalizeEmail();
};

/**
 * Şifre doğrulama
 */
const validatePassword = () => {
  return body('password')
    .isLength({ min: 6 }).withMessage('Şifre en az 6 karakter olmalıdır')
    .matches(/\d/).withMessage('Şifre en az bir sayı içermelidir');
};

/**
 * Şifre onayı doğrulama
 */
const validatePasswordConfirmation = () => {
  return body('passwordConfirm')
    .custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error('Şifreler eşleşmiyor');
      }
      return true;
    });
};

/**
 * Ad doğrulama
 */
const validateName = (fieldName = 'name') => {
  return body(fieldName)
    .trim()
    .isLength({ min: 2 }).withMessage(`${fieldName} alanı en az 2 karakter olmalıdır`)
    .isLength({ max: 50 }).withMessage(`${fieldName} alanı 50 karakterden uzun olamaz`)
    .matches(/^[a-zA-ZığüşöçİĞÜŞÖÇ\s]+$/).withMessage(`${fieldName} alanı sadece harf içerebilir`);
};

/**
 * Telefon numarası doğrulama
 */
const validatePhone = () => {
  return body('phone')
    .trim()
    .optional({ nullable: true, checkFalsy: true })
    .matches(/^[0-9]{10}$/).withMessage('Geçerli bir telefon numarası giriniz (10 haneli, başında 0 olmadan)');
};

/**
 * Tarih doğrulama
 * @param {string} fieldName - Tarih alanı adı
 */
const validateDate = (fieldName = 'date') => {
  return body(fieldName)
    .optional({ nullable: true, checkFalsy: true })
    .isISO8601().withMessage(`Geçerli bir tarih giriniz: ${fieldName}`)
    .toDate();
};

/**
 * Şimdiki tarihten küçük tarih doğrulama
 * @param {string} fieldName - Tarih alanı adı
 */
const validatePastDate = (fieldName = 'date') => {
  return body(fieldName)
    .optional({ nullable: true, checkFalsy: true })
    .isISO8601().withMessage(`Geçerli bir tarih giriniz: ${fieldName}`)
    .toDate()
    .custom(value => {
      if (value > new Date()) {
        throw new Error(`${fieldName} şimdiki tarihten ileri bir tarih olamaz`);
      }
      return true;
    });
};

/**
 * Şimdiki tarihten büyük tarih doğrulama
 * @param {string} fieldName - Tarih alanı adı
 */
const validateFutureDate = (fieldName = 'date') => {
  return body(fieldName)
    .optional({ nullable: true, checkFalsy: true })
    .isISO8601().withMessage(`Geçerli bir tarih giriniz: ${fieldName}`)
    .toDate()
    .custom(value => {
      if (value < new Date()) {
        throw new Error(`${fieldName} şimdiki tarihten geçmiş bir tarih olamaz`);
      }
      return true;
    });
};

/**
 * Sayısal değer doğrulama
 * @param {string} fieldName - Sayı alanı adı
 * @param {Object} options - Seçenekler ({ min, max })
 */
const validateNumber = (fieldName, options = {}) => {
  let validator = body(fieldName)
    .optional({ nullable: true, checkFalsy: true })
    .isNumeric().withMessage(`${fieldName} sayısal bir değer olmalıdır`)
    .toFloat();
  
  if (options.min !== undefined) {
    validator = validator.isFloat({ min: options.min }).withMessage(`${fieldName} değeri ${options.min}'den küçük olamaz`);
  }
  
  if (options.max !== undefined) {
    validator = validator.isFloat({ max: options.max }).withMessage(`${fieldName} değeri ${options.max}'den büyük olamaz`);
  }
  
  return validator;
};

/**
 * Tam sayı doğrulama
 * @param {string} fieldName - Sayı alanı adı
 * @param {Object} options - Seçenekler ({ min, max })
 */
const validateInteger = (fieldName, options = {}) => {
  let validator = body(fieldName)
    .optional({ nullable: true, checkFalsy: true })
    .isInt().withMessage(`${fieldName} tam sayı olmalıdır`)
    .toInt();
  
  if (options.min !== undefined) {
    validator = validator.isInt({ min: options.min }).withMessage(`${fieldName} değeri ${options.min}'den küçük olamaz`);
  }
  
  if (options.max !== undefined) {
    validator = validator.isInt({ max: options.max }).withMessage(`${fieldName} değeri ${options.max}'den büyük olamaz`);
  }
  
  return validator;
};

/**
 * Enumerated değer doğrulama
 * @param {string} fieldName - Alan adı
 * @param {Array} allowedValues - İzin verilen değerler
 */
const validateEnum = (fieldName, allowedValues) => {
  return body(fieldName)
    .optional({ nullable: true, checkFalsy: true })
    .isIn(allowedValues).withMessage(`${fieldName} şu değerlerden biri olmalıdır: ${allowedValues.join(', ')}`);
};

/**
 * URL doğrulama
 */
const validateURL = (fieldName = 'url') => {
  return body(fieldName)
    .optional({ nullable: true, checkFalsy: true })
    .isURL().withMessage('Geçerli bir URL giriniz');
};

/**
 * Boolean değer doğrulama
 */
const validateBoolean = (fieldName = 'active') => {
  return body(fieldName)
    .optional({ nullable: true, checkFalsy: true })
    .isBoolean().withMessage(`${fieldName} bir boolean değer olmalıdır`)
    .toBoolean();
};

/**
 * Saat formatı doğrulama (HH:MM)
 */
const validateTime = (fieldName = 'time') => {
  return body(fieldName)
    .optional({ nullable: true, checkFalsy: true })
    .matches(/^([01]\d|2[0-3]):([0-5]\d)$/).withMessage('Geçerli bir saat formatı giriniz (HH:MM)');
};

/**
 * Kullanıcı bilgileri doğrulama
 */
const userValidationRules = () => {
  return [
    validateName('name').notEmpty().withMessage('İsim alanı zorunludur'),
    validateName('surname').notEmpty().withMessage('Soyisim alanı zorunludur'),
    validateEmail().notEmpty().withMessage('E-posta alanı zorunludur'),
    validatePassword().notEmpty().withMessage('Şifre alanı zorunludur'),
    validatePasswordConfirmation(),
    validatePhone()
  ];
};

/**
 * Giriş bilgileri doğrulama
 */
const loginValidationRules = () => {
  return [
    validateEmail().notEmpty().withMessage('E-posta alanı zorunludur'),
    body('password').notEmpty().withMessage('Şifre alanı zorunludur')
  ];
};

/**
 * Aile üyesi bilgileri doğrulama
 */
const familyMemberValidationRules = () => {
  return [
    validateName('name').notEmpty().withMessage('İsim alanı zorunludur'),
    validateName('surname').notEmpty().withMessage('Soyisim alanı zorunludur'),
    validateEnum('relationship', [
      'anne', 'baba', 'eş', 'çocuk', 'kardeş', 'anneanne', 'babaanne', 'dede', 'torun', 'diğer'
    ]).notEmpty().withMessage('İlişki türü zorunludur'),
    validatePastDate('dateOfBirth').notEmpty().withMessage('Doğum tarihi zorunludur'),
    validateEnum('gender', ['kadın', 'erkek', 'diğer']).notEmpty().withMessage('Cinsiyet zorunludur'),
    validateEnum('bloodType', ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', '0+', '0-', 'bilinmiyor']),
    validateNumber('height', { min: 0, max: 250 }),
    validateNumber('weight', { min: 0, max: 500 }),
    body('allergies.*.type').optional().isIn(['ilaç', 'gıda', 'böcek', 'çevresel', 'diğer']),
    body('allergies.*.name').optional().trim().isLength({ min: 2, max: 100 }),
    body('allergies.*.severity').optional().isIn(['hafif', 'orta', 'şiddetli', 'ölümcül']),
    body('chronicDiseases.*.name').optional().trim().isLength({ min: 2, max: 100 }),
    validatePastDate('chronicDiseases.*.diagnosisDate'),
    body('emergencyContact.name').optional().trim().isLength({ min: 2, max: 100 }),
    body('emergencyContact.phone').optional().matches(/^[0-9]{10}$/),
    body('notes').optional().trim().isLength({ max: 1000 })
  ];
};

/**
 * Sağlık verisi doğrulama
 */
const healthDataValidationRules = () => {
  return [
    body('familyMemberId').notEmpty().withMessage('Aile üyesi ID\'si zorunludur'),
    validateObjectId('familyMemberId'),
    validateEnum('dataType', [
      'bloodSugar', 'bloodPressure', 'heartRate', 'weight', 'temperature', 'oxygen', 'stress', 'other'
    ]).notEmpty().withMessage('Veri türü zorunludur'),
    validatePastDate('measuredAt').notEmpty().withMessage('Ölçüm tarihi zorunludur'),
    
    // Kan şekeri alanları
    body('bloodSugar.value').if(body('dataType').equals('bloodSugar')).notEmpty().withMessage('Kan şekeri değeri zorunludur').isFloat({ min: 0, max: 1000 }).withMessage('Geçerli bir kan şekeri değeri giriniz'),
    validateEnum('bloodSugar.unit', ['mg/dL', 'mmol/L']).if(body('dataType').equals('bloodSugar')),
    validateEnum('bloodSugar.measurementType', ['fasting', 'postprandial', 'random']).if(body('dataType').equals('bloodSugar')),
    validateNumber('bloodSugar.timeSinceLastMeal', { min: 0 }).if(body('dataType').equals('bloodSugar')),
    
    // Tansiyon alanları
    body('bloodPressure.systolic').if(body('dataType').equals('bloodPressure')).notEmpty().withMessage('Sistolik değer zorunludur').isFloat({ min: 0, max: 300 }).withMessage('Geçerli bir sistolik değer giriniz'),
    body('bloodPressure.diastolic').if(body('dataType').equals('bloodPressure')).notEmpty().withMessage('Diastolik değer zorunludur').isFloat({ min: 0, max: 200 }).withMessage('Geçerli bir diastolik değer giriniz'),
    validateEnum('bloodPressure.position', ['sitting', 'standing', 'lying']).if(body('dataType').equals('bloodPressure')),
    
    // Nabız alanları
    body('heartRate.value').if(body('dataType').equals('heartRate')).notEmpty().withMessage('Nabız değeri zorunludur').isFloat({ min: 0, max: 300 }).withMessage('Geçerli bir nabız değeri giriniz'),
    validateEnum('heartRate.activityLevel', ['rest', 'light', 'moderate', 'intense']).if(body('dataType').equals('heartRate')),
    
    // Kilo alanları
    body('weight.value').if(body('dataType').equals('weight')).notEmpty().withMessage('Kilo değeri zorunludur').isFloat({ min: 0, max: 500 }).withMessage('Geçerli bir kilo değeri giriniz'),
    validateEnum('weight.unit', ['kg', 'lb']).if(body('dataType').equals('weight')),
    
    // Vücut sıcaklığı alanları
    body('temperature.value').if(body('dataType').equals('temperature')).notEmpty().withMessage('Sıcaklık değeri zorunludur').isFloat({ min: 30, max: 45 }).withMessage('Geçerli bir vücut sıcaklığı değeri giriniz'),
    validateEnum('temperature.unit', ['C', 'F']).if(body('dataType').equals('temperature')),
    validateEnum('temperature.measurementMethod', ['oral', 'tympanic', 'axillary', 'rectal', 'forehead']).if(body('dataType').equals('temperature')),
    
    // Oksijen satürasyonu alanları
    body('oxygen.value').if(body('dataType').equals('oxygen')).notEmpty().withMessage('Oksijen değeri zorunludur').isFloat({ min: 0, max: 100 }).withMessage('Geçerli bir oksijen satürasyonu değeri giriniz'),
    
    // Stres seviyesi alanları
    body('stress.value').if(body('dataType').equals('stress')).notEmpty().withMessage('Stres değeri zorunludur').isFloat({ min: 0, max: 10 }).withMessage('Geçerli bir stres seviyesi değeri giriniz'),
    
    // Diğer alanlar
    body('notes').optional().trim().isLength({ max: 500 })
  ];
};

/**
 * İlaç bilgileri doğrulama
 */
const medicationValidationRules = () => {
  return [
    body('familyMemberId').notEmpty().withMessage('Aile üyesi ID\'si zorunludur'),
    validateObjectId('familyMemberId'),
    body('name').notEmpty().withMessage('İlaç adı zorunludur').trim().isLength({ max: 100 }),
    body('genericName').optional().trim().isLength({ max: 100 }),
    
    // Dozaj bilgileri
    body('dosage.value').notEmpty().withMessage('Dozaj değeri zorunludur').isFloat({ min: 0 }),
    validateEnum('dosage.unit', [
      'mg', 'g', 'mcg', 'mL', 'IU', 'tsp', 'tbsp', 'tablet', 'kapsül', 'damla', 'ampul', 'ünite', 'diğer'
    ]).notEmpty().withMessage('Dozaj birimi zorunludur'),
    validateEnum('dosage.form', [
      'tablet', 'kapsül', 'şurup', 'damla', 'merhem', 'sprey', 'iğne', 'patch', 'inhaler', 'diğer'
    ]),
    
    // Zamanlama bilgileri
    validatePastDate('startDate').notEmpty().withMessage('Başlangıç tarihi zorunludur'),
    validateDate('endDate'),
    validateInteger('duration', { min: 0 }),
    validateBoolean('isActive'),
    validateBoolean('isRegular'),
    validateBoolean('isCritical'),
    
    // Çizelge bilgileri
    body('schedule.times.*.time').optional().matches(/^([01]\d|2[0-3]):([0-5]\d)$/),
    body('schedule.times.*.dosage').optional().isFloat({ min: 0 }),
    body('schedule.times.*.withFood').optional().isBoolean(),
    validateEnum('schedule.frequency', ['günde', 'haftada', 'ayda']),
    validateInteger('schedule.frequencyCount', { min: 1 }),
    body('schedule.daysOfWeek.*').optional().isIn(['pazartesi', 'salı', 'çarşamba', 'perşembe', 'cuma', 'cumartesi', 'pazar']),
    validateBoolean('schedule.asNeeded'),
    body('schedule.instructions').optional().trim().isLength({ max: 200 }),
    
    // Diğer bilgiler
    body('purpose').optional().trim().isLength({ max: 200 }),
    body('prescribedBy.name').optional().trim().isLength({ max: 100 }),
    body('prescribedBy.specialty').optional().trim().isLength({ max: 100 }),
    body('prescribedBy.hospital').optional().trim().isLength({ max: 100 }),
    validatePastDate('prescribedBy.date'),
    body('sideEffects.*').optional().trim().isLength({ max: 100 }),
    body('interactions.*.medicationName').optional().trim().isLength({ max: 100 }),
    body('interactions.*.description').optional().trim().isLength({ max: 200 }),
    validateEnum('interactions.*.severity', ['mild', 'moderate', 'severe']),
    
    // Envanter bilgileri
    validateInteger('inventory.unitsRemaining', { min: 0 }),
    validateInteger('inventory.unitsTotal', { min: 0 }),
    validateFutureDate('inventory.refillDate'),
    validateBoolean('inventory.refillReminder'),
    validateInteger('inventory.reminderDays', { min: 1 }),
    
    // Notlar
    body('notes').optional().trim().isLength({ max: 500 })
  ];
};

/**
 * Beslenme verisi doğrulama
 */
const nutritionDataValidationRules = () => {
  return [
    body('familyMemberId').notEmpty().withMessage('Aile üyesi ID\'si zorunludur'),
    validateObjectId('familyMemberId'),
    validateEnum('mealType', [
      'kahvaltı', 'öğle_yemeği', 'akşam_yemeği', 'ara_öğün', 'atıştırmalık'
    ]).notEmpty().withMessage('Öğün türü zorunludur'),
    validatePastDate('date').notEmpty().withMessage('Tarih zorunludur'),
    validateTime('time'),
    validateInteger('duration', { min: 0 }),
    validateEnum('location', ['ev', 'iş', 'okul', 'restoran', 'dışarıda', 'diğer']),
    
    // Yiyecek verileri
    body('foods.*.name').optional().trim().notEmpty().withMessage('Yiyecek adı zorunludur'),
    validateEnum('foods.*.category', [
      'meyve', 'sebze', 'tahıl', 'süt_ürünleri', 'et', 'kümes_hayvanları', 
      'balık', 'baklagiller', 'yağlar', 'tatlılar', 'içecekler', 'fast_food', 
      'hazır_yemek', 'atıştırmalıklar', 'diğer'
    ]),
    body('foods.*.portion.amount').optional().isFloat({ min: 0 }).withMessage('Porsiyon miktarı negatif olamaz'),
    validateEnum('foods.*.portion.unit', ['g', 'ml', 'adet', 'dilim', 'porsiyon', 'kaşık', 'bardak', 'avuç', 'diğer']),
    validateNumber('foods.*.nutritionalValues.calories', { min: 0 }),
    validateNumber('foods.*.nutritionalValues.carbs', { min: 0 }),
    validateNumber('foods.*.nutritionalValues.proteins', { min: 0 }),
    validateNumber('foods.*.nutritionalValues.fats', { min: 0 }),
    
    // İçecek verileri
    body('beverages.*.name').optional().trim(),
    validateEnum('beverages.*.category', [
      'su', 'çay', 'kahve', 'meyve_suyu', 'gazlı_içecek', 'alkollü_içecek',
      'süt', 'ayran', 'enerji_içeceği', 'bitki_çayı', 'diğer'
    ]),
    body('beverages.*.portion.amount').optional().isFloat({ min: 0 }).withMessage('Porsiyon miktarı negatif olamaz'),
    validateEnum('beverages.*.portion.unit', ['ml', 'bardak', 'şişe', 'litre', 'fincan', 'diğer']),
    validateNumber('beverages.*.nutritionalValues.calories', { min: 0 }),
    validateNumber('beverages.*.nutritionalValues.sugar', { min: 0 }),
    
    // Kan şekeri ölçümleri
    validateNumber('bloodSugarBefore.value', { min: 0 }),
    validateEnum('bloodSugarBefore.unit', ['mg/dL', 'mmol/L']),
    validateTime('bloodSugarBefore.time'),
    validateNumber('bloodSugarAfter.value', { min: 0 }),
    validateEnum('bloodSugarAfter.unit', ['mg/dL', 'mmol/L']),
    validateTime('bloodSugarAfter.time'),
    validateInteger('bloodSugarAfter.minutesAfter', { min: 0 }),
    
    // Diğer alanlar
    validateEnum('mood.before', ['çok_iyi', 'iyi', 'normal', 'kötü', 'çok_kötü']),
    validateEnum('mood.after', ['çok_iyi', 'iyi', 'normal', 'kötü', 'çok_kötü']),
    validateInteger('hunger.before', { min: 0, max: 10 }),
    validateInteger('hunger.after', { min: 0, max: 10 }),
    validateEnum('symptoms.*.type', [
      'mide_ağrısı', 'şişkinlik', 'bulantı', 'ishal', 'kabızlık', 'baş_ağrısı',
      'yorgunluk', 'enerji_artışı', 'reflü', 'alerjik_reaksiyon', 'diğer'
    ]),
    validateInteger('symptoms.*.severity', { min: 1, max: 10 }),
    validateInteger('symptoms.*.duration', { min: 0 }),
    validateBoolean('isPlanned'),
    validateBoolean('isFasting'),
    body('notes').optional().trim().isLength({ max: 500 })
  ];
};

/**
 * Fiziksel aktivite doğrulama
 */
const physicalActivityValidationRules = () => {
  return [
    body('familyMemberId').notEmpty().withMessage('Aile üyesi ID\'si zorunludur'),
    validateObjectId('familyMemberId'),
    validateEnum('activityType', [
      'yürüyüş', 'koşu', 'bisiklet', 'yüzme', 'fitness', 'yoga', 'pilates', 
      'dans', 'futbol', 'basketbol', 'tenis', 'voleybol', 'golf', 'dağcılık', 
      'ev_egzersizi', 'bahçe_işleri', 'merdiven_çıkma', 'diğer'
    ]).notEmpty().withMessage('Aktivite türü zorunludur'),
    validatePastDate('startTime').notEmpty().withMessage('Başlangıç zamanı zorunludur'),
    validatePastDate('endTime'),
    validateInteger('duration', { min: 0 }).notEmpty().withMessage('Süre zorunludur'),
    validateNumber('distance.value', { min: 0 }),
    validateEnum('distance.unit', ['km', 'm', 'mil']),
    validateInteger('steps', { min: 0 }),
    validateNumber('calories', { min: 0 }),
    validateEnum('intensity', ['hafif', 'orta', 'yüksek', 'maksimum']),
    
    // Kalp ritmi verileri
    validateNumber('heartRate.average', { min: 0 }),
    validateNumber('heartRate.max', { min: 0 }),
    validateNumber('heartRate.min', { min: 0 }),
    
    // Konum bilgileri
    validateNumber('locationData.startLocation.latitude'),
    validateNumber('locationData.startLocation.longitude'),
    validateNumber('locationData.endLocation.latitude'),
    validateNumber('locationData.endLocation.longitude'),
    
    // Performans metrikleri
    validateNumber('performanceMetrics.pace.value'),
    validateEnum('performanceMetrics.pace.unit', ['min/km', 'min/mil']),
    validateNumber('performanceMetrics.speed.value'),
    validateEnum('performanceMetrics.speed.unit', ['km/s', 'km/dk', 'km/sa', 'm/s', 'mil/sa']),
    
    // Sağlık verileri
    validateNumber('bloodSugar.before.value', { min: 0 }),
    validateEnum('bloodSugar.before.unit', ['mg/dL', 'mmol/L']),
    validateNumber('bloodSugar.after.value', { min: 0 }),
    validateEnum('bloodSugar.after.unit', ['mg/dL', 'mmol/L']),
    validateNumber('bloodPressure.before.systolic', { min: 0, max: 300 }),
    validateNumber('bloodPressure.before.diastolic', { min: 0, max: 200 }),
    validateNumber('bloodPressure.after.systolic', { min: 0, max: 300 }),
    validateNumber('bloodPressure.after.diastolic', { min: 0, max: 200 }),
    
    // Kullanıcı deneyimi
    validateInteger('perceivedExertion', { min: 0, max: 10 }),
    validateEnum('mood.before', ['çok_kötü', 'kötü', 'normal', 'iyi', 'çok_iyi']),
    validateEnum('mood.after', ['çok_kötü', 'kötü', 'normal', 'iyi', 'çok_iyi']),
    validateInteger('energyLevel.before', { min: 0, max: 10 }),
    validateInteger('energyLevel.after', { min: 0, max: 10 }),
    
    // Hedefler
    validateNumber('goals.targetDistance'),
    validateInteger('goals.targetDuration'),
    validateNumber('goals.targetCalories'),
    validateInteger('goals.targetSteps'),
    validateBoolean('goals.achieved'),
    
    // Diğer alanlar
    validateEnum('source', ['manual', 'app', 'wearable', 'imported']),
    body('notes').optional().trim().isLength({ max: 500 })
  ];
};

/**
 * Hatırlatıcı doğrulama
 */
const reminderValidationRules = () => {
  return [
    body('familyMemberId').notEmpty().withMessage('Aile üyesi ID\'si zorunludur'),
    validateObjectId('familyMemberId'),
    validateEnum('type', [
      'medication', 'measurement', 'appointment', 'activity', 
      'nutrition', 'water', 'custom'
    ]).notEmpty().withMessage('Hatırlatıcı türü zorunludur'),
    body('title').notEmpty().withMessage('Başlık gereklidir').trim().isLength({ max: 100 }),
    body('description').optional().trim().isLength({ max: 500 }),
    
    // Zamanlama bilgileri
    validateDate('schedule.startDate').notEmpty().withMessage('Başlangıç tarihi zorunludur'),
    validateDate('schedule.endDate'),
    validateTime('schedule.time').notEmpty().withMessage('Zaman bilgisi zorunludur'),
    validateEnum('schedule.frequency', ['once', 'daily', 'weekly', 'monthly', 'custom']),
    body('schedule.daysOfWeek.*').optional().isIn(['pazartesi', 'salı', 'çarşamba', 'perşembe', 'cuma', 'cumartesi', 'pazar']),
    body('schedule.daysOfMonth.*').optional().isInt({ min: 1, max: 31 }),
    validateInteger('schedule.customInterval.value', { min: 1 }),
    validateEnum('schedule.customInterval.unit', ['gün', 'hafta', 'ay']),
    
    // Bildirim ayarları
    validateBoolean('notification.channels.app'),
    validateBoolean('notification.channels.email'),
    validateBoolean('notification.channels.sms'),
    body('notification.sound').optional().trim(),
    validateBoolean('notification.vibration'),
    validateBoolean('notification.repeat.enabled'),
    validateInteger('notification.repeat.interval', { min: 1 }),
    validateInteger('notification.repeat.maxCount', { min: 1 }),
    
    // Diğer alanlar
    validateEnum('priority', ['low', 'medium', 'high', 'critical']),
    validateBoolean('isActive')
  ];
};

/**
 * Rapor doğrulama
 */
const reportValidationRules = () => {
  return [
    body('familyMemberId').notEmpty().withMessage('Aile üyesi ID\'si zorunludur'),
    validateObjectId('familyMemberId'),
    body('title').notEmpty().withMessage('Rapor başlığı zorunludur').trim().isLength({ max: 100 }),
    validateEnum('type', [
      'health_summary', 'medication_adherence', 'blood_sugar_analysis', 
      'blood_pressure_analysis', 'activity_summary', 'nutrition_analysis', 
      'custom'
    ]).notEmpty().withMessage('Rapor türü zorunludur'),
    body('description').optional().trim().isLength({ max: 500 }),
    
    // Tarih aralığı
    validatePastDate('dateRange.startDate').notEmpty().withMessage('Başlangıç tarihi zorunludur'),
    validatePastDate('dateRange.endDate').notEmpty().withMessage('Bitiş tarihi zorunludur'),
    
    // Rapor formatı ve durumu
    validateEnum('format', ['pdf', 'excel', 'html', 'text']),
    validateEnum('status', ['draft', 'generated', 'sent', 'read', 'archived']),
    
    // Zamanlama ayarları
    validateBoolean('isScheduled'),
    validateEnum('schedule.frequency', ['daily', 'weekly', 'monthly', 'quarterly', 'custom']),
    
    // Alıcılar
    body('recipients.*.email').optional().isEmail(),
    body('recipients.*.name').optional().trim().isLength({ max: 100 }),
    validateEnum('recipients.*.role', ['user', 'family_member', 'doctor', 'caregiver', 'other'])
  ];
};

// Tüm doğrulama fonksiyonlarını dışa aktar
module.exports = {
  validate,
  validateObjectId,
  validateEmail,
  validatePassword,
  validatePasswordConfirmation,
  validateName,
  validatePhone,
  validateDate,
  validatePastDate,
  validateFutureDate,
  validateNumber,
  validateInteger,
  validateEnum,
  validateURL,
  validateBoolean,
  validateTime,
  userValidationRules,
  loginValidationRules,
  familyMemberValidationRules,
  healthDataValidationRules,
  medicationValidationRules,
  nutritionDataValidationRules,
  physicalActivityValidationRules,
  reminderValidationRules,
  reportValidationRules
};
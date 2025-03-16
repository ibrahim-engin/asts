/**
 * ASTS - Aile Sağlık Takip Sistemi
 * Validators - Doğrulama Yardımcıları
 * 
 * Bu dosya, veri doğrulama işlemleri için yardımcı fonksiyonları içerir.
 * Formlardan veya API'den gelen verilerin doğrulanması için kullanılır.
 */

const { body, validationResult } = require('express-validator');
const { REGEX_PATTERNS } = require('./constants');
const mongoose = require('mongoose');

/**
 * Doğrulama hatalarını işler
 * @param {Object} req - HTTP istek nesnesi
 * @param {Object} res - HTTP yanıt nesnesi
 * @param {Function} next - Sonraki middleware
 * @returns {Object|void} - Hata varsa hata yanıtı, yoksa sonraki middleware
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    // API rotaları için JSON yanıtı
    if (req.originalUrl.startsWith('/api')) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }
    
    // Web formları için
    req.flash('error_msg', errors.array().map(err => err.msg).join(', '));
    return res.redirect('back');
  }
  
  next();
};

/**
 * ObjectId formatını doğrular
 * @param {string} id - Doğrulanacak ID
 * @returns {boolean} - Geçerli ise true
 */
const isValidObjectId = (id) => {
  return mongoose.Types.ObjectId.isValid(id);
};

/**
 * E-posta formatını doğrular
 * @param {string} email - Doğrulanacak e-posta
 * @returns {boolean} - Geçerli ise true
 */
const isValidEmail = (email) => {
  return REGEX_PATTERNS.EMAIL.test(email);
};

/**
 * Telefon numarası formatını doğrular
 * @param {string} phone - Doğrulanacak telefon numarası
 * @returns {boolean} - Geçerli ise true
 */
const isValidPhone = (phone) => {
  return REGEX_PATTERNS.PHONE.test(phone);
};

/**
 * Şifre formatını doğrular
 * @param {string} password - Doğrulanacak şifre
 * @returns {boolean} - Geçerli ise true
 */
const isValidPassword = (password) => {
  return REGEX_PATTERNS.PASSWORD.test(password);
};

/**
 * Saat formatını doğrular
 * @param {string} time - Doğrulanacak saat
 * @returns {boolean} - Geçerli ise true
 */
const isValidTime = (time) => {
  return REGEX_PATTERNS.TIME.test(time);
};

/**
 * Dosya boyutunu doğrular
 * @param {number} fileSize - Dosya boyutu (byte)
 * @param {number} maxSize - İzin verilen maksimum boyut
 * @returns {boolean} - Geçerli ise true
 */
const isValidFileSize = (fileSize, maxSize) => {
  return fileSize <= maxSize;
};

/**
 * Dosya türünü doğrular
 * @param {string} mimetype - Dosya MIME türü
 * @param {Array<string>} allowedTypes - İzin verilen türler
 * @returns {boolean} - Geçerli ise true
 */
const isValidFileType = (mimetype, allowedTypes) => {
  return allowedTypes.includes(mimetype);
};

/**
 * Tarih aralığını doğrular (başlangıç < bitiş)
 * @param {Date} startDate - Başlangıç tarihi
 * @param {Date} endDate - Bitiş tarihi
 * @returns {boolean} - Geçerli ise true
 */
const isValidDateRange = (startDate, endDate) => {
  return new Date(startDate) < new Date(endDate);
};

/**
 * Sayı aralığını doğrular (min <= değer <= max)
 * @param {number} value - Doğrulanacak değer
 * @param {number} min - Minimum değer
 * @param {number} max - Maksimum değer
 * @returns {boolean} - Geçerli ise true
 */
const isInRange = (value, min, max) => {
  return value >= min && value <= max;
};

/**
 * Değerin bir dizi içinde olup olmadığını kontrol eder
 * @param {any} value - Doğrulanacak değer
 * @param {Array} allowedValues - İzin verilen değerler
 * @returns {boolean} - Geçerli ise true
 */
const isInArray = (value, allowedValues) => {
  return allowedValues.includes(value);
};

/**
 * Kullanıcı kaydı doğrulama kuralları
 * @returns {Array} - Doğrulama kuralları
 */
const registerValidationRules = () => [
  body('name')
    .trim()
    .notEmpty().withMessage('İsim alanı zorunludur')
    .isLength({ min: 2, max: 50 }).withMessage('İsim 2-50 karakter arasında olmalıdır')
    .matches(/^[a-zA-ZığüşöçİĞÜŞÖÇ\s]+$/).withMessage('İsim sadece harflerden oluşmalıdır'),
  
  body('surname')
    .trim()
    .notEmpty().withMessage('Soyisim alanı zorunludur')
    .isLength({ min: 2, max: 50 }).withMessage('Soyisim 2-50 karakter arasında olmalıdır')
    .matches(/^[a-zA-ZığüşöçİĞÜŞÖÇ\s]+$/).withMessage('Soyisim sadece harflerden oluşmalıdır'),
  
  body('email')
    .trim()
    .notEmpty().withMessage('E-posta alanı zorunludur')
    .isEmail().withMessage('Geçerli bir e-posta adresi giriniz')
    .normalizeEmail(),
  
  body('password')
    .notEmpty().withMessage('Şifre alanı zorunludur')
    .isLength({ min: 6 }).withMessage('Şifre en az 6 karakter olmalıdır')
    .matches(/\d/).withMessage('Şifre en az bir rakam içermelidir'),
  
  body('passwordConfirm')
    .notEmpty().withMessage('Şifre tekrarı alanı zorunludur')
    .custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error('Şifreler eşleşmiyor');
      }
      return true;
    }),
  
  body('phone')
    .optional()
    .trim()
    .matches(REGEX_PATTERNS.PHONE).withMessage('Geçerli bir telefon numarası giriniz')
];

/**
 * Kullanıcı girişi doğrulama kuralları
 * @returns {Array} - Doğrulama kuralları
 */
const loginValidationRules = () => [
  body('email')
    .trim()
    .notEmpty().withMessage('E-posta alanı zorunludur')
    .isEmail().withMessage('Geçerli bir e-posta adresi giriniz'),
  
  body('password')
    .notEmpty().withMessage('Şifre alanı zorunludur')
];

/**
 * Profil güncelleme doğrulama kuralları
 * @returns {Array} - Doğrulama kuralları
 */
const profileUpdateValidationRules = () => [
  body('name')
    .trim()
    .notEmpty().withMessage('İsim alanı zorunludur')
    .isLength({ min: 2, max: 50 }).withMessage('İsim 2-50 karakter arasında olmalıdır')
    .matches(/^[a-zA-ZığüşöçİĞÜŞÖÇ\s]+$/).withMessage('İsim sadece harflerden oluşmalıdır'),
  
  body('surname')
    .trim()
    .notEmpty().withMessage('Soyisim alanı zorunludur')
    .isLength({ min: 2, max: 50 }).withMessage('Soyisim 2-50 karakter arasında olmalıdır')
    .matches(/^[a-zA-ZığüşöçİĞÜŞÖÇ\s]+$/).withMessage('Soyisim sadece harflerden oluşmalıdır'),
  
  body('phone')
    .optional()
    .trim()
    .matches(REGEX_PATTERNS.PHONE).withMessage('Geçerli bir telefon numarası giriniz')
];

/**
 * Şifre değiştirme doğrulama kuralları
 * @returns {Array} - Doğrulama kuralları
 */
const passwordChangeValidationRules = () => [
    body('currentPassword')
      .notEmpty().withMessage('Mevcut şifre alanı zorunludur'),
    
    body('newPassword')
      .notEmpty().withMessage('Yeni şifre alanı zorunludur')
      .isLength({ min: 6 }).withMessage('Şifre en az 6 karakter olmalıdır')
      .matches(/\d/).withMessage('Şifre en az bir rakam içermelidir'),
    
    body('newPasswordConfirm')
      .notEmpty().withMessage('Şifre tekrarı alanı zorunludur')
      .custom((value, { req }) => {
        if (value !== req.body.newPassword) {
          throw new Error('Şifreler eşleşmiyor');
        }
        return true;
      })
  ];
  
  /**
   * Aile üyesi ekleme/güncelleme doğrulama kuralları
   * @returns {Array} - Doğrulama kuralları
   */
  const familyMemberValidationRules = () => [
    body('name')
      .trim()
      .notEmpty().withMessage('İsim alanı zorunludur')
      .isLength({ min: 2, max: 50 }).withMessage('İsim 2-50 karakter arasında olmalıdır')
      .matches(/^[a-zA-ZığüşöçİĞÜŞÖÇ\s]+$/).withMessage('İsim sadece harflerden oluşmalıdır'),
    
    body('surname')
      .trim()
      .notEmpty().withMessage('Soyisim alanı zorunludur')
      .isLength({ min: 2, max: 50 }).withMessage('Soyisim 2-50 karakter arasında olmalıdır')
      .matches(/^[a-zA-ZığüşöçİĞÜŞÖÇ\s]+$/).withMessage('Soyisim sadece harflerden oluşmalıdır'),
    
    body('relationship')
      .notEmpty().withMessage('İlişki türü zorunludur')
      .isIn(['anne', 'baba', 'eş', 'çocuk', 'kardeş', 'anneanne', 'babaanne', 'dede', 'torun', 'diğer'])
      .withMessage('Geçerli bir ilişki türü seçiniz'),
    
    body('dateOfBirth')
      .notEmpty().withMessage('Doğum tarihi zorunludur')
      .isDate().withMessage('Geçerli bir doğum tarihi giriniz')
      .custom(value => {
        if (new Date(value) > new Date()) {
          throw new Error('Doğum tarihi gelecekte olamaz');
        }
        return true;
      }),
    
    body('gender')
      .notEmpty().withMessage('Cinsiyet zorunludur')
      .isIn(['erkek', 'kadın', 'diğer']).withMessage('Geçerli bir cinsiyet seçiniz'),
    
    body('bloodType')
      .optional()
      .isIn(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', '0+', '0-', 'bilinmiyor'])
      .withMessage('Geçerli bir kan grubu seçiniz'),
    
    body('height')
      .optional()
      .isFloat({ min: 1, max: 250 }).withMessage('Boy 1-250 cm arasında olmalıdır'),
    
    body('weight')
      .optional()
      .isFloat({ min: 1, max: 500 }).withMessage('Kilo 1-500 kg arasında olmalıdır'),
    
    body('allergies.*.type')
      .optional()
      .isIn(['ilaç', 'gıda', 'böcek', 'çevresel', 'diğer'])
      .withMessage('Geçerli bir alerji türü seçiniz'),
    
    body('allergies.*.name')
      .optional()
      .trim()
      .isLength({ min: 2, max: 100 }).withMessage('Alerji adı 2-100 karakter arasında olmalıdır'),
    
    body('allergies.*.severity')
      .optional()
      .isIn(['hafif', 'orta', 'şiddetli', 'ölümcül'])
      .withMessage('Geçerli bir alerji şiddeti seçiniz'),
    
    body('chronicDiseases.*.name')
      .optional()
      .trim()
      .isLength({ min: 2, max: 100 }).withMessage('Hastalık adı 2-100 karakter arasında olmalıdır'),
    
    body('chronicDiseases.*.diagnosisDate')
      .optional()
      .isDate().withMessage('Geçerli bir teşhis tarihi giriniz')
      .custom(value => {
        if (new Date(value) > new Date()) {
          throw new Error('Teşhis tarihi gelecekte olamaz');
        }
        return true;
      }),
    
    body('notes')
      .optional()
      .trim()
      .isLength({ max: 1000 }).withMessage('Notlar en fazla 1000 karakter olabilir')
  ];
  
  /**
   * Sağlık verisi ekleme/güncelleme doğrulama kuralları
   * @returns {Array} - Doğrulama kuralları
   */
  const healthDataValidationRules = () => [
    body('dataType')
      .notEmpty().withMessage('Veri türü zorunludur')
      .isIn(['bloodSugar', 'bloodPressure', 'heartRate', 'weight', 'temperature', 'oxygen', 'stress', 'other'])
      .withMessage('Geçerli bir veri türü seçiniz'),
    
    body('measuredAt')
      .notEmpty().withMessage('Ölçüm tarihi zorunludur')
      .isISO8601().withMessage('Geçerli bir tarih giriniz')
      .custom(value => {
        if (new Date(value) > new Date()) {
          throw new Error('Ölçüm tarihi gelecekte olamaz');
        }
        return true;
      }),
    
    // Kan şekeri alanları
    body('bloodSugar.value')
      .if(body('dataType').equals('bloodSugar'))
      .notEmpty().withMessage('Kan şekeri değeri zorunludur')
      .isFloat({ min: 10, max: 1000 }).withMessage('Geçerli bir kan şekeri değeri giriniz'),
    
    body('bloodSugar.unit')
      .if(body('dataType').equals('bloodSugar'))
      .notEmpty().withMessage('Birim zorunludur')
      .isIn(['mg/dL', 'mmol/L']).withMessage('Geçerli bir birim seçiniz'),
    
    body('bloodSugar.measurementType')
      .if(body('dataType').equals('bloodSugar'))
      .notEmpty().withMessage('Ölçüm türü zorunludur')
      .isIn(['fasting', 'postprandial', 'random']).withMessage('Geçerli bir ölçüm türü seçiniz'),
    
    // Tansiyon alanları
    body('bloodPressure.systolic')
      .if(body('dataType').equals('bloodPressure'))
      .notEmpty().withMessage('Sistolik değer zorunludur')
      .isFloat({ min: 50, max: 300 }).withMessage('Geçerli bir sistolik değer giriniz'),
    
    body('bloodPressure.diastolic')
      .if(body('dataType').equals('bloodPressure'))
      .notEmpty().withMessage('Diastolik değer zorunludur')
      .isFloat({ min: 30, max: 200 }).withMessage('Geçerli bir diastolik değer giriniz'),
    
    body('bloodPressure.position')
      .if(body('dataType').equals('bloodPressure'))
      .optional()
      .isIn(['sitting', 'standing', 'lying']).withMessage('Geçerli bir pozisyon seçiniz'),
    
    // Nabız alanları
    body('heartRate.value')
      .if(body('dataType').equals('heartRate'))
      .notEmpty().withMessage('Nabız değeri zorunludur')
      .isFloat({ min: 30, max: 250 }).withMessage('Geçerli bir nabız değeri giriniz'),
    
    body('heartRate.activityLevel')
      .if(body('dataType').equals('heartRate'))
      .optional()
      .isIn(['rest', 'light', 'moderate', 'intense']).withMessage('Geçerli bir aktivite seviyesi seçiniz'),
    
    // Kilo alanları
    body('weight.value')
      .if(body('dataType').equals('weight'))
      .notEmpty().withMessage('Kilo değeri zorunludur')
      .isFloat({ min: 1, max: 500 }).withMessage('Geçerli bir kilo değeri giriniz'),
    
    body('weight.unit')
      .if(body('dataType').equals('weight'))
      .optional()
      .isIn(['kg', 'lb']).withMessage('Geçerli bir birim seçiniz'),
    
    // Ateş alanları
    body('temperature.value')
      .if(body('dataType').equals('temperature'))
      .notEmpty().withMessage('Sıcaklık değeri zorunludur')
      .isFloat({ min: 30, max: 45 }).withMessage('Geçerli bir vücut sıcaklığı değeri giriniz'),
    
    body('temperature.unit')
      .if(body('dataType').equals('temperature'))
      .optional()
      .isIn(['C', 'F']).withMessage('Geçerli bir birim seçiniz')
  ];
  
  /**
   * İlaç ekleme/güncelleme doğrulama kuralları
   * @returns {Array} - Doğrulama kuralları
   */
  const medicationValidationRules = () => [
    body('name')
      .notEmpty().withMessage('İlaç adı zorunludur')
      .trim()
      .isLength({ min: 2, max: 100 }).withMessage('İlaç adı 2-100 karakter arasında olmalıdır'),
    
    body('dosage.value')
      .notEmpty().withMessage('Dozaj değeri zorunludur')
      .isFloat({ min: 0.1 }).withMessage('Geçerli bir dozaj değeri giriniz'),
    
    body('dosage.unit')
      .notEmpty().withMessage('Dozaj birimi zorunludur')
      .isIn(['mg', 'g', 'mcg', 'mL', 'IU', 'tsp', 'tbsp', 'tablet', 'kapsül', 'damla', 'ampul', 'ünite', 'diğer'])
      .withMessage('Geçerli bir dozaj birimi seçiniz'),
    
    body('startDate')
      .notEmpty().withMessage('Başlangıç tarihi zorunludur')
      .isISO8601().withMessage('Geçerli bir tarih giriniz'),
    
    body('endDate')
      .optional({ nullable: true })
      .custom((value, { req }) => {
        if (value && new Date(value) < new Date(req.body.startDate)) {
          throw new Error('Bitiş tarihi başlangıç tarihinden önce olamaz');
        }
        return true;
      }),
    
    body('schedule.frequency')
      .notEmpty().withMessage('Kullanım sıklığı zorunludur')
      .isIn(['günde', 'haftada', 'ayda']).withMessage('Geçerli bir sıklık seçiniz'),
    
    body('schedule.frequencyCount')
      .notEmpty().withMessage('Sıklık sayısı zorunludur')
      .isInt({ min: 1, max: 24 }).withMessage('Geçerli bir sıklık sayısı giriniz'),
    
    body('schedule.times')
      .isArray().withMessage('Kullanım zamanları dizi formatında olmalıdır')
      .custom((times, { req }) => {
        if (req.body.schedule.frequency === 'günde' && times.length !== parseInt(req.body.schedule.frequencyCount)) {
          throw new Error(`Toplam ${req.body.schedule.frequencyCount} adet kullanım zamanı girmelisiniz`);
        }
        return true;
      }),
    
    body('schedule.times.*.time')
      .matches(/^([01][0-9]|2[0-3]):([0-5][0-9])$/).withMessage('Geçerli bir saat formatı giriniz (HH:MM)')
  ];
  
  // Diğer doğrulama kuralları buraya eklenebilir
  
  module.exports = {
    handleValidationErrors,
    isValidObjectId,
    isValidEmail,
    isValidPhone,
    isValidPassword,
    isValidTime,
    isValidFileSize,
    isValidFileType,
    isValidDateRange,
    isInRange,
    isInArray,
    registerValidationRules,
    loginValidationRules,
    profileUpdateValidationRules,
    passwordChangeValidationRules,
    familyMemberValidationRules,
    healthDataValidationRules,
    medicationValidationRules
  };
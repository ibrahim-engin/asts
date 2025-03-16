/**
 * ASTS - Aile Sağlık Takip Sistemi
 * Constants - Sistem Sabit Değerleri
 * 
 * Bu dosya, uygulama genelinde kullanılan sabit değerleri içerir.
 * Veri doğrulama, görüntüleme, hesaplama işlemleri için kullanılır.
 */

/**
 * HTTP Durum Kodları
 */
const HTTP_STATUS = {
    OK: 200,
    CREATED: 201,
    NO_CONTENT: 204,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    CONFLICT: 409,
    UNPROCESSABLE_ENTITY: 422,
    INTERNAL_SERVER_ERROR: 500
  };
  
  /**
   * Loglama Seviyeleri
   */
  const LOG_LEVELS = {
    ERROR: 'error',
    WARN: 'warn',
    INFO: 'info',
    DEBUG: 'debug'
  };
  
  /**
   * Kullanıcı Rolleri
   */
  const USER_ROLES = {
    USER: 'user',
    ADMIN: 'admin'
  };
  
  /**
   * Admin Seviyeleri
   */
  const ADMIN_LEVELS = {
    SUPER_ADMIN: 'super-admin',
    ADMIN: 'admin',
    MODERATOR: 'moderator'
  };
  
  /**
   * Cinsiyet Türleri
   */
  const GENDER_TYPES = {
    MALE: 'erkek',
    FEMALE: 'kadın',
    OTHER: 'diğer'
  };
  
  /**
   * İlişki Türleri
   */
  const RELATIONSHIP_TYPES = {
    MOTHER: 'anne',
    FATHER: 'baba',
    SPOUSE: 'eş',
    CHILD: 'çocuk',
    SIBLING: 'kardeş',
    GRANDMOTHER: 'anneanne',
    GRANDFATHER_MOTHER: 'babaanne',
    GRANDFATHER: 'dede',
    GRANDCHILD: 'torun',
    OTHER: 'diğer'
  };
  
  /**
   * Kan Grupları
   */
  const BLOOD_TYPES = {
    A_POSITIVE: 'A+',
    A_NEGATIVE: 'A-',
    B_POSITIVE: 'B+',
    B_NEGATIVE: 'B-',
    AB_POSITIVE: 'AB+',
    AB_NEGATIVE: 'AB-',
    O_POSITIVE: '0+',
    O_NEGATIVE: '0-',
    UNKNOWN: 'bilinmiyor'
  };
  
  /**
   * Sağlık Veri Türleri
   */
  const HEALTH_DATA_TYPES = {
    BLOOD_SUGAR: 'bloodSugar',
    BLOOD_PRESSURE: 'bloodPressure',
    HEART_RATE: 'heartRate',
    WEIGHT: 'weight',
    TEMPERATURE: 'temperature',
    OXYGEN: 'oxygen',
    STRESS: 'stress',
    OTHER: 'other'
  };
  
  /**
   * Kan Şekeri Ölçüm Türleri
   */
  const BLOOD_SUGAR_MEASUREMENT_TYPES = {
    FASTING: 'fasting',
    POSTPRANDIAL: 'postprandial',
    RANDOM: 'random'
  };
  
  /**
   * Durum Türleri
   */
  const STATUS_TYPES = {
    NORMAL: 'normal',
    WARNING: 'warning',
    CRITICAL: 'critical'
  };
  
  /**
   * Tansiyon Ölçüm Pozisyonları
   */
  const BLOOD_PRESSURE_POSITIONS = {
    SITTING: 'sitting',
    STANDING: 'standing',
    LYING: 'lying'
  };
  
  /**
   * Aktivite Seviyeleri
   */
  const ACTIVITY_LEVELS = {
    REST: 'rest',
    LIGHT: 'light',
    MODERATE: 'moderate',
    INTENSE: 'intense'
  };
  
  /**
   * Sıcaklık Ölçüm Yöntemleri
   */
  const TEMPERATURE_METHODS = {
    ORAL: 'oral',
    TYMPANIC: 'tympanic',
    AXILLARY: 'axillary',
    RECTAL: 'rectal',
    FOREHEAD: 'forehead'
  };
  
  /**
   * İlaç Formları
   */
  const MEDICATION_FORMS = {
    TABLET: 'tablet',
    CAPSULE: 'kapsül',
    SYRUP: 'şurup',
    DROPS: 'damla',
    OINTMENT: 'merhem',
    SPRAY: 'sprey',
    INJECTION: 'iğne',
    PATCH: 'patch',
    INHALER: 'inhaler',
    OTHER: 'diğer'
  };
  
  /**
   * İlaç Birimleri
   */
  const MEDICATION_UNITS = {
    MG: 'mg',
    G: 'g',
    MCG: 'mcg',
    ML: 'ml',
    IU: 'IU',
    TSP: 'tsp',
    TBSP: 'tbsp',
    TABLET: 'tablet',
    CAPSULE: 'kapsül',
    DROP: 'damla',
    AMPULE: 'ampul',
    UNIT: 'ünite',
    OTHER: 'diğer'
  };
  
  /**
   * İlaç Kullanım Frekansları
   */
  const MEDICATION_FREQUENCIES = {
    DAILY: 'günde',
    WEEKLY: 'haftada',
    MONTHLY: 'ayda'
  };
  
  /**
   * Haftanın Günleri
   */
  const DAYS_OF_WEEK = {
    MONDAY: 'pazartesi',
    TUESDAY: 'salı',
    WEDNESDAY: 'çarşamba',
    THURSDAY: 'perşembe',
    FRIDAY: 'cuma',
    SATURDAY: 'cumartesi',
    SUNDAY: 'pazar'
  };
  
  /**
   * Alerji Türleri
   */
  const ALLERGY_TYPES = {
    DRUG: 'ilaç',
    FOOD: 'gıda',
    INSECT: 'böcek',
    ENVIRONMENTAL: 'çevresel',
    OTHER: 'diğer'
  };
  
  /**
   * Alerji Şiddetleri
   */
  const ALLERGY_SEVERITIES = {
    MILD: 'hafif',
    MODERATE: 'orta',
    SEVERE: 'şiddetli',
    LIFE_THREATENING: 'ölümcül'
  };
  
  /**
   * Tıbbi Geçmiş Türleri
   */
  const MEDICAL_HISTORY_TYPES = {
    DIAGNOSIS: 'diagnosis',
    SURGERY: 'surgery',
    HOSPITALIZATION: 'hospitalization',
    VACCINATION: 'vaccination',
    TEST: 'test',
    CONSULTATION: 'consultation',
    EMERGENCY: 'emergency',
    OTHER: 'other'
  };
  
  /**
   * Hatırlatıcı Türleri
   */
  const REMINDER_TYPES = {
    MEDICATION: 'medication',
    MEASUREMENT: 'measurement',
    APPOINTMENT: 'appointment',
    ACTIVITY: 'activity',
    NUTRITION: 'nutrition',
    WATER: 'water',
    CUSTOM: 'custom'
  };
  
  /**
   * Hatırlatıcı Frekansları
   */
  const REMINDER_FREQUENCIES = {
    ONCE: 'once',
    DAILY: 'daily',
    WEEKLY: 'weekly',
    MONTHLY: 'monthly',
    CUSTOM: 'custom'
  };
  
  /**
   * Rapor Türleri
   */
  const REPORT_TYPES = {
    HEALTH_SUMMARY: 'health_summary',
    MEDICATION_ADHERENCE: 'medication_adherence',
    BLOOD_SUGAR_ANALYSIS: 'blood_sugar_analysis',
    BLOOD_PRESSURE_ANALYSIS: 'blood_pressure_analysis',
    ACTIVITY_SUMMARY: 'activity_summary',
    NUTRITION_ANALYSIS: 'nutrition_analysis',
    CUSTOM: 'custom'
  };
  
  /**
   * Rapor Durumları
   */
  const REPORT_STATUSES = {
    DRAFT: 'draft',
    GENERATED: 'generated',
    SENT: 'sent',
    READ: 'read',
    ARCHIVED: 'archived'
  };
  
  /**
   * Rapor Formatları
   */
  const REPORT_FORMATS = {
    PDF: 'pdf',
    EXCEL: 'excel',
    HTML: 'html',
    TEXT: 'text'
  };
  
  /**
   * Beslenme Öğün Türleri
   */
  const MEAL_TYPES = {
    BREAKFAST: 'kahvaltı',
    LUNCH: 'öğle_yemeği',
    DINNER: 'akşam_yemeği',
    SNACK: 'ara_öğün',
    NIBBLE: 'atıştırmalık'
  };
  
  /**
   * Yiyecek Kategorileri
   */
  const FOOD_CATEGORIES = {
    FRUIT: 'meyve',
    VEGETABLE: 'sebze',
    GRAIN: 'tahıl',
    DAIRY: 'süt_ürünleri',
    MEAT: 'et',
    POULTRY: 'kümes_hayvanları',
    FISH: 'balık',
    LEGUMES: 'baklagiller',
    FATS: 'yağlar',
    DESSERTS: 'tatlılar',
    BEVERAGES: 'içecekler',
    FAST_FOOD: 'fast_food',
    READY_MEAL: 'hazır_yemek',
    SNACKS: 'atıştırmalıklar',
    OTHER: 'diğer'
  };
  
  /**
   * İçecek Kategorileri
   */
  const BEVERAGE_CATEGORIES = {
    WATER: 'su',
    TEA: 'çay',
    COFFEE: 'kahve',
    JUICE: 'meyve_suyu',
    SODA: 'gazlı_içecek',
    ALCOHOL: 'alkollü_içecek',
    MILK: 'süt',
    AYRAN: 'ayran',
    ENERGY_DRINK: 'enerji_içeceği',
    HERBAL_TEA: 'bitki_çayı',
    OTHER: 'diğer'
  };
  
  /**
   * Porsiyon Birimleri
   */
  const PORTION_UNITS = {
    GRAM: 'g',
    MILLILITER: 'ml',
    PIECE: 'adet',
    SLICE: 'dilim',
    PORTION: 'porsiyon',
    SPOON: 'kaşık',
    GLASS: 'bardak',
    HANDFUL: 'avuç',
    OTHER: 'diğer'
  };
  
  /**
   * Duygu Durumları
   */
  const MOOD_TYPES = {
    VERY_GOOD: 'çok_iyi',
    GOOD: 'iyi',
    NORMAL: 'normal',
    BAD: 'kötü',
    VERY_BAD: 'çok_kötü'
  };
  
  /**
   * Beslenme Semptom Türleri
   */
  const NUTRITION_SYMPTOM_TYPES = {
    STOMACH_PAIN: 'mide_ağrısı',
    BLOATING: 'şişkinlik',
    NAUSEA: 'bulantı',
    DIARRHEA: 'ishal',
    CONSTIPATION: 'kabızlık',
    HEADACHE: 'baş_ağrısı',
    FATIGUE: 'yorgunluk',
    ENERGY_INCREASE: 'enerji_artışı',
    REFLUX: 'reflü',
    ALLERGIC_REACTION: 'alerjik_reaksiyon',
    OTHER: 'diğer'
  };
  
  /**
   * Fiziksel Aktivite Türleri
   */
  const PHYSICAL_ACTIVITY_TYPES = {
    WALKING: 'yürüyüş',
    RUNNING: 'koşu',
    CYCLING: 'bisiklet',
    SWIMMING: 'yüzme',
    FITNESS: 'fitness',
    YOGA: 'yoga',
    PILATES: 'pilates',
    DANCING: 'dans',
    FOOTBALL: 'futbol',
    BASKETBALL: 'basketbol',
    TENNIS: 'tenis',
    VOLLEYBALL: 'voleybol',
    GOLF: 'golf',
    HIKING: 'dağcılık',
    HOME_EXERCISE: 'ev_egzersizi',
    GARDENING: 'bahçe_işleri',
    STAIR_CLIMBING: 'merdiven_çıkma',
    OTHER: 'diğer'
  };
  
  /**
   * Fiziksel Aktivite Semptom Türleri
   */
  const ACTIVITY_SYMPTOM_TYPES = {
    MUSCLE_PAIN: 'kas_ağrısı',
    JOINT_PAIN: 'eklem_ağrısı',
    SHORTNESS_OF_BREATH: 'nefes_darlığı',
    DIZZINESS: 'baş_dönmesi',
    NAUSEA: 'bulantı',
    EXCESSIVE_SWEATING: 'aşırı_terleme',
    CRAMP: 'kramp',
    FATIGUE: 'yorgunluk',
    OTHER: 'diğer'
  };
  
  /**
   * Ölçüm Birimleri
   */
  const MEASUREMENT_UNITS = {
    // Ağırlık birimleri
    WEIGHT: {
      KG: 'kg',
      LB: 'lb'
    },
    // Uzunluk birimleri
    LENGTH: {
      CM: 'cm',
      M: 'm',
      INCH: 'inch'
    },
    // Mesafe birimleri
    DISTANCE: {
      KM: 'km',
      M: 'm',
      MILE: 'mil'
    },
    // Sıcaklık birimleri
    TEMPERATURE: {
      CELSIUS: 'C',
      FAHRENHEIT: 'F'
    },
    // Kan şekeri birimleri
    BLOOD_SUGAR: {
      MG_DL: 'mg/dL',
      MMOL_L: 'mmol/L'
    },
    // Kan basıncı birimleri
    BLOOD_PRESSURE: {
      MMHG: 'mmHg'
    },
    // Nabız birimleri
    HEART_RATE: {
      BPM: 'bpm'
    },
    // Oksijen satürasyonu birimleri
    OXYGEN: {
      PERCENTAGE: '%'
    }
  };
  
  /**
   * Dosya MIME Türleri
   */
  const FILE_MIME_TYPES = {
    // Resim türleri
    IMAGE: {
      JPEG: 'image/jpeg',
      PNG: 'image/png',
      GIF: 'image/gif'
    },
    // Belge türleri
    DOCUMENT: {
      PDF: 'application/pdf',
      DOC: 'application/msword',
      DOCX: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    },
    // Tablo türleri
    SPREADSHEET: {
      XLS: 'application/vnd.ms-excel',
      XLSX: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      CSV: 'text/csv'
    },
    // Diğer türler
    OTHERS: {
      TEXT: 'text/plain',
      JSON: 'application/json'
    }
  };
  
  /**
   * Tarih Formatları
   */
  const DATE_FORMATS = {
    SHORT: 'DD.MM.YYYY',
    LONG: 'DD MMMM YYYY',
    TIME: 'HH:mm',
    DATETIME: 'DD.MM.YYYY HH:mm',
    ISO8601: 'YYYY-MM-DDTHH:mm:ss.SSSZ'
  };
  
  /**
   * Önbellek Anahtarları
   */
  const CACHE_KEYS = {
    USER_PROFILE: 'user_profile_',
    FAMILY_MEMBERS: 'family_members_',
    HEALTH_DATA: 'health_data_',
    MEDICATIONS: 'medications_',
    REMINDERS: 'reminders_'
  };
  
  /**
   * Önbellek TTL (Saniye)
   */
  const CACHE_TTL = {
    SHORT: 300, // 5 dakika
    MEDIUM: 1800, // 30 dakika
    LONG: 3600, // 1 saat
    DAY: 86400 // 1 gün
  };
  
  /**
   * Regex Desenleri
   */
  const REGEX_PATTERNS = {
    EMAIL: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
    PHONE: /^[0-9]{10}$/,
    PASSWORD: /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*#?&]{6,}$/,
    TIME: /^([01][0-9]|2[0-3]):([0-5][0-9])$/
  };
  
  /**
   * Sistem Varsayılanları
   */
  const DEFAULTS = {
    PAGINATION: {
      LIMIT: 10,
      PAGE: 1,
      MAX_LIMIT: 100
    },
    LOCALE: 'tr',
    TIMEZONE: 'Europe/Istanbul'
  };
  
  /**
   * Sistem Limitleri
   */
  const LIMITS = {
    MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB
    MAX_FILES_PER_REQUEST: 5,
    MAX_FAMILY_MEMBERS: 15
  };
  
  /**
   * API versiyon anahtarları
   */
  const API_VERSIONS = {
    V1: 'v1'
  };
  
  module.exports = {
    HTTP_STATUS,
    LOG_LEVELS,
    USER_ROLES,
    ADMIN_LEVELS,
    GENDER_TYPES,
    RELATIONSHIP_TYPES,
    BLOOD_TYPES,
    HEALTH_DATA_TYPES,
    BLOOD_SUGAR_MEASUREMENT_TYPES,
    STATUS_TYPES,
    BLOOD_PRESSURE_POSITIONS,
    ACTIVITY_LEVELS,
    TEMPERATURE_METHODS,
    MEDICATION_FORMS,
    MEDICATION_UNITS,
    MEDICATION_FREQUENCIES,
    DAYS_OF_WEEK,
    ALLERGY_TYPES,
    ALLERGY_SEVERITIES,
    MEDICAL_HISTORY_TYPES,
    REMINDER_TYPES,
    REMINDER_FREQUENCIES,
    REPORT_TYPES,
    REPORT_STATUSES,
    REPORT_FORMATS,
    MEAL_TYPES,
    FOOD_CATEGORIES,
    BEVERAGE_CATEGORIES,
    PORTION_UNITS,
    MOOD_TYPES,
    NUTRITION_SYMPTOM_TYPES,
    PHYSICAL_ACTIVITY_TYPES,
    ACTIVITY_SYMPTOM_TYPES,
    MEASUREMENT_UNITS,
    FILE_MIME_TYPES,
    DATE_FORMATS,
    CACHE_KEYS,
    CACHE_TTL,
    REGEX_PATTERNS,
    DEFAULTS,
    LIMITS,
    API_VERSIONS
  };
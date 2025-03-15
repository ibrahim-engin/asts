// ASTS - Aile Sağlık Takip Sistemi Yapılandırma Dosyası
const path = require('path');

// Sabit yapılandırma değişkenleri
const config = {
  // MongoDB bağlantı seçenekleri
  mongooseOptions: {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    autoIndex: true,
  },

  // JWT yapılandırması
  jwt: {
    secret: process.env.JWT_SECRET || 'your-default-jwt-secret',
    expiresIn: process.env.JWT_EXPIRES_IN || '1d',
    cookieName: 'asts_token',
    cookieOptions: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000, // 1 gün
    }
  },

  // E-posta yapılandırması
  email: {
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    secure: process.env.EMAIL_PORT === '465', // true for 465, false for other ports
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
    from: `ASTS <${process.env.EMAIL_USER}>`,
  },
  
  // Dosya yükleme yapılandırması
  uploads: {
    profileImages: {
      destination: path.join(__dirname, 'public/uploads/profiles'),
      limits: {
        fileSize: 1 * 1024 * 1024, // 1MB
      },
      allowedTypes: ['image/jpeg', 'image/png'],
      filename: (req, file, cb) => {
        const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
        const extension = path.extname(file.originalname);
        cb(null, `profile-${uniqueSuffix}${extension}`);
      }
    },
    medicalDocs: {
      destination: path.join(__dirname, 'public/uploads/medical'),
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB
      },
      allowedTypes: ['application/pdf', 'image/jpeg', 'image/png'],
      filename: (req, file, cb) => {
        const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
        const extension = path.extname(file.originalname);
        cb(null, `medical-${uniqueSuffix}${extension}`);
      }
    }
  },
  
  // Sağlık verileri için referans değerleri
  healthReferenceValues: {
    bloodSugar: {
      fasting: {
        min: 70,
        max: 100,
        unit: 'mg/dL',
        warning: {
          low: { min: 0, max: 70 },
          high: { min: 100, max: 126 },
          critical: { min: 126, max: Infinity }
        }
      },
      postprandial: {
        min: 70,
        max: 140,
        unit: 'mg/dL',
        warning: {
          low: { min: 0, max: 70 },
          high: { min: 140, max: 200 },
          critical: { min: 200, max: Infinity }
        }
      }
    },
    bloodPressure: {
      systolic: {
        min: 90,
        max: 120,
        unit: 'mmHg',
        warning: {
          low: { min: 0, max: 90 },
          high: { min: 120, max: 140 },
          critical: { min: 140, max: Infinity }
        }
      },
      diastolic: {
        min: 60,
        max: 80,
        unit: 'mmHg',
        warning: {
          low: { min: 0, max: 60 },
          high: { min: 80, max: 90 },
          critical: { min: 90, max: Infinity }
        }
      }
    },
    heartRate: {
      min: 60,
      max: 100,
      unit: 'bpm',
      warning: {
        low: { min: 0, max: 60 },
        high: { min: 100, max: 120 },
        critical: { min: 120, max: Infinity }
      }
    },
    bmi: {
      underweight: { min: 0, max: 18.5 },
      normal: { min: 18.5, max: 24.9 },
      overweight: { min: 25, max: 29.9 },
      obese: { min: 30, max: Infinity }
    }
  },
  
  // Raporlama yapılandırması
  reports: {
    chartColors: {
      bloodSugar: {
        backgroundColor: 'rgba(255, 99, 132, 0.2)',
        borderColor: 'rgba(255, 99, 132, 1)'
      },
      bloodPressure: {
        systolic: {
          backgroundColor: 'rgba(54, 162, 235, 0.2)',
          borderColor: 'rgba(54, 162, 235, 1)'
        },
        diastolic: {
          backgroundColor: 'rgba(75, 192, 192, 0.2)',
          borderColor: 'rgba(75, 192, 192, 1)'
        }
      },
      heartRate: {
        backgroundColor: 'rgba(153, 102, 255, 0.2)',
        borderColor: 'rgba(153, 102, 255, 1)'
      },
      weight: {
        backgroundColor: 'rgba(255, 159, 64, 0.2)',
        borderColor: 'rgba(255, 159, 64, 1)'
      }
    },
    defaultTimeRanges: {
      week: 7,
      month: 30,
      quarter: 90,
      halfYear: 180,
      year: 365
    }
  },
  
  // Sistem yapılandırması
  system: {
    defaultLanguage: 'tr',
    dateFormat: 'DD.MM.YYYY',
    timeFormat: 'HH:mm',
    measurementUnits: {
      weight: 'kg',
      height: 'cm',
      bloodSugar: 'mg/dL'
    },
    backupSettings: {
      automated: true,
      frequency: 'weekly', // daily, weekly, monthly
      keepCount: 5 // Son 5 yedeği tut
    }
  }
};

module.exports = config;
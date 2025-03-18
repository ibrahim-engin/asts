const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const config = require('../config');
const { logError } = require('./logger');



/**
 * Yükleme dizinini oluşturma yardımcı fonksiyonu
 * @param {string} destination - Dosya yolu
 */
const createDestination = (destination) => {
  if (!fs.existsSync(destination)) {
    try {
      fs.mkdirSync(destination, { recursive: true });
    } catch (error) {
      logError(error);
      throw new Error(`Dizin oluşturulamadı: ${destination}`);
    }
  }
};

/**
 * Dosya adı oluşturucu fonksiyonu
 * @param {Object} file - Yüklenen dosya
 * @param {string} prefix - Dosya adı öneki
 * @returns {string} Oluşturulan dosya adı
 */
const generateFileName = (file, prefix = '') => {
  const uniqueString = crypto.randomBytes(16).toString('hex');
  const timestamp = Date.now();
  const extension = path.extname(file.originalname).toLowerCase();
  return `${prefix}${timestamp}-${uniqueString}${extension}`;
};

/**
 * Dosya türü kontrol fonksiyonu
 * @param {Object} file - Yüklenen dosya
 * @param {Array} allowedTypes - İzin verilen MIME türleri
 * @param {Function} cb - Callback fonksiyonu
 */
const checkFileType = (file, allowedTypes, cb) => {
  if (allowedTypes.includes(file.mimetype)) {
    return cb(null, true);
  }
  
  return cb(new Error(`Sadece ${allowedTypes.join(', ')} türündeki dosyalar yüklenebilir`), false);
};

// Temel multer yapılandırması
const baseStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    try {
      const destination = path.join(__dirname, '../public/uploads/general');
      createDestination(destination);
      cb(null, destination);
    } catch (error) {
      cb(error, null);
    }
  },
  filename: (req, file, cb) => {
    try {
      cb(null, generateFileName(file));
    } catch (error) {
      cb(error, null);
    }
  },
});

// Temel multer filtresi
const baseFileFilter = (req, file, cb) => {
  checkFileType(
    file,
    ['image/jpeg', 'image/png', 'image/gif', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
    cb
  );
};

// Profil resmi için multer yapılandırması
const profileStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    try {
      const destination = path.join(__dirname, '../public/uploads/profiles');
      createDestination(destination);
      cb(null, destination);
    } catch (error) {
      cb(error, null);
    }
  },
  filename: (req, file, cb) => {
    try {
      const user = req.user || req.admin;
      const prefix = user ? `${user._id}-` : '';
      cb(null, generateFileName(file, prefix));
    } catch (error) {
      cb(error, null);
    }
  },
});

// Profil resmi için multer filtresi
const profileFileFilter = (req, file, cb) => {
  checkFileType(
    file,
    ['image/jpeg', 'image/png', 'image/gif'],
    cb
  );
};

// Tıbbi dökümanlar için multer yapılandırması
const medicalStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    try {
      const destination = path.join(__dirname, '../public/uploads/medical');
      createDestination(destination);
      cb(null, destination);
    } catch (error) {
      cb(error, null);
    }
  },
  filename: (req, file, cb) => {
    try {
      const familyMemberId = req.params.familyMemberId || req.body.familyMemberId;
      const prefix = familyMemberId ? `medical-${familyMemberId}-` : 'medical-';
      cb(null, generateFileName(file, prefix));
    } catch (error) {
      cb(error, null);
    }
  },
});

// Tıbbi dökümanlar için multer filtresi
const medicalFileFilter = (req, file, cb) => {
  checkFileType(
    file,
    ['image/jpeg', 'image/png', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
    cb
  );
};

// Rapor dosyaları için multer yapılandırması
const reportStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    try {
      const destination = path.join(__dirname, '../public/uploads/reports');
      createDestination(destination);
      cb(null, destination);
    } catch (error) {
      cb(error, null);
    }
  },
  filename: (req, file, cb) => {
    try {
      const familyMemberId = req.params.familyMemberId || req.body.familyMemberId;
      const prefix = familyMemberId ? `report-${familyMemberId}-` : 'report-';
      cb(null, generateFileName(file, prefix));
    } catch (error) {
      cb(error, null);
    }
  },
});

// Rapor dosyaları için multer filtresi
const reportFileFilter = (req, file, cb) => {
  checkFileType(
    file,
    ['application/pdf', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'text/csv', 'text/plain'],
    cb
  );
};

// Beslenme fotoğrafları için multer yapılandırması
const nutritionStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    try {
      const destination = path.join(__dirname, '../public/uploads/nutrition');
      createDestination(destination);
      cb(null, destination);
    } catch (error) {
      cb(error, null);
    }
  },
  filename: (req, file, cb) => {
    try {
      const familyMemberId = req.params.familyMemberId || req.body.familyMemberId;
      const prefix = familyMemberId ? `nutrition-${familyMemberId}-` : 'nutrition-';
      cb(null, generateFileName(file, prefix));
    } catch (error) {
      cb(error, null);
    }
  },
});

// Beslenme fotoğrafları için multer filtresi
const nutritionFileFilter = (req, file, cb) => {
  checkFileType(
    file,
    ['image/jpeg', 'image/png', 'image/gif'],
    cb
  );
};

// Aktivite fotoğrafları için multer yapılandırması
const activityStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    try {
      const destination = path.join(__dirname, '../public/uploads/activity');
      createDestination(destination);
      cb(null, destination);
    } catch (error) {
      cb(error, null);
    }
  },
  filename: (req, file, cb) => {
    try {
      const familyMemberId = req.params.familyMemberId || req.body.familyMemberId;
      const prefix = familyMemberId ? `activity-${familyMemberId}-` : 'activity-';
      cb(null, generateFileName(file, prefix));
    } catch (error) {
      cb(error, null);
    }
  },
});

// Aktivite fotoğrafları için multer filtresi
const activityFileFilter = (req, file, cb) => {
  checkFileType(
    file,
    ['image/jpeg', 'image/png', 'image/gif'],
    cb
  );
};

// Veri içe aktarma dosyaları için multer yapılandırması
const importStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    try {
      const destination = path.join(__dirname, '../public/uploads/imports');
      createDestination(destination);
      cb(null, destination);
    } catch (error) {
      cb(error, null);
    }
  },
  filename: (req, file, cb) => {
    try {
      const userId = req.user ? req.user._id : (req.admin ? req.admin._id : 'guest');
      const prefix = `import-${userId}-`;
      cb(null, generateFileName(file, prefix));
    } catch (error) {
      cb(error, null);
    }
  },
});

// Veri içe aktarma dosyaları için multer filtresi
const importFileFilter = (req, file, cb) => {
  checkFileType(
    file,
    ['application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'text/csv', 'application/json'],
    cb
  );
};

// Hata yakalama middleware'i
const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    // Multer hatası
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        error: 'Dosya boyutu çok büyük'
      });
    }
    
    return res.status(400).json({
      success: false,
      error: err.message
    });
  } else if (err) {
    // Diğer hatalar
    return res.status(400).json({
      success: false,
      error: err.message
    });
  }
  
  next();
};

// Multer konfigürasyonları
const upload = {
    // avatar form alanını kullanmak için
    avatar: multer({
      storage: profileStorage,
      limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
      fileFilter: profileFileFilter
    }).single('avatar'),
    
  // Temel dosya yükleme
  single: multer({
    storage: baseStorage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
    fileFilter: baseFileFilter
  }).single('file'),
  
  // Profil resmi yükleme
  profileImage: multer({
    storage: profileStorage,
    limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
    fileFilter: profileFileFilter
  }).single('profileImage'),
  
  // Tıbbi döküman yükleme
  medicalDocument: multer({
    storage: medicalStorage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    fileFilter: medicalFileFilter
  }).single('medicalDocument'),
  
  // Birden fazla tıbbi döküman yükleme
  medicalDocuments: multer({
    storage: medicalStorage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    fileFilter: medicalFileFilter
  }).array('medicalDocuments', 5),
  
  // Rapor dosyası yükleme
  reportFile: multer({
    storage: reportStorage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    fileFilter: reportFileFilter
  }).single('reportFile'),
  
  // Beslenme fotoğrafı yükleme
  nutritionPhoto: multer({
    storage: nutritionStorage,
    limits: { fileSize: 3 * 1024 * 1024 }, // 3MB
    fileFilter: nutritionFileFilter
  }).single('nutritionPhoto'),
  
  // Aktivite fotoğrafı yükleme
  activityPhoto: multer({
    storage: activityStorage,
    limits: { fileSize: 3 * 1024 * 1024 }, // 3MB
    fileFilter: activityFileFilter
  }).single('activityPhoto'),
  
  // Veri içe aktarma dosyası yükleme
  importFile: multer({
    storage: importStorage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    fileFilter: importFileFilter
  }).single('importFile')
};

// Kullanım örneği:
// router.post('/upload', upload.single, handleMulterError, (req, res) => { ... });

// Yeni export - multer örneğini direkt export ediyoruz
// Profil resmi yükleme için multer yapılandırması
const simpleUpload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      const dest = path.join(__dirname, '../public/uploads/profiles');
      if (!fs.existsSync(dest)) {
        fs.mkdirSync(dest, { recursive: true });
      }
      cb(null, dest);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
      const extension = path.extname(file.originalname).toLowerCase();
      cb(null, `profile-${uniqueSuffix}${extension}`);
    }
  }),
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB
});

const profileUploadsDir = path.join(__dirname, '../public/uploads/profiles');
if (!fs.existsSync(profileUploadsDir)) {
  fs.mkdirSync(profileUploadsDir, { recursive: true });
  console.log("Created profiles upload directory:", profileUploadsDir);
}

module.exports = {
  upload, // Mevcut konfigürasyon
  handleMulterError,
  simpleUpload // Yeni eklediğimiz basit konfigürasyon
};
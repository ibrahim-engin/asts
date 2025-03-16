/**
 * ASTS - Aile Sağlık Takip Sistemi
 * Storage Service - Dosya Depolama Servisi
 * 
 * Bu servis, sisteme yüklenen dosyaların yönetimini sağlar.
 * Profil resimleri, tıbbi belgeler, raporlar ve diğer dosyaların işlenmesi için kullanılır.
 */

const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const crypto = require('crypto');
const sharp = require('sharp');
const { logInfo, logError } = require('../middlewares/logger');

// FS fonksiyonlarını promisify'lama
const mkdir = promisify(fs.mkdir);
const copyFile = promisify(fs.copyFile);
const unlink = promisify(fs.unlink);
const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);
const stat = promisify(fs.stat);
const readdir = promisify(fs.readdir);

// Depolama dizinleri
const STORAGE_ROOT = path.join(__dirname, '../public/uploads');
const PROFILE_DIR = path.join(STORAGE_ROOT, 'profiles');
const MEDICAL_DIR = path.join(STORAGE_ROOT, 'medical');
const REPORT_DIR = path.join(STORAGE_ROOT, 'reports');
const TEMP_DIR = path.join(STORAGE_ROOT, 'temp');
const NUTRITION_DIR = path.join(STORAGE_ROOT, 'nutrition');
const ACTIVITY_DIR = path.join(STORAGE_ROOT, 'activity');

// Dizin yapısını oluştur
const initStorageDirs = async () => {
  try {
    const dirs = [
      STORAGE_ROOT,
      PROFILE_DIR,
      MEDICAL_DIR,
      REPORT_DIR,
      TEMP_DIR,
      NUTRITION_DIR,
      ACTIVITY_DIR
    ];
    
    for (const dir of dirs) {
      if (!fs.existsSync(dir)) {
        await mkdir(dir, { recursive: true });
        logInfo(`Dizin oluşturuldu: ${dir}`);
      }
    }
    
    logInfo('Depolama dizinleri başarıyla oluşturuldu');
    return true;
  } catch (error) {
    logError('Depolama dizinleri oluşturulamadı', error);
    return false;
  }
};

/**
 * Benzersiz dosya adı oluşturur
 * @param {string} originalFilename - Orijinal dosya adı
 * @param {string} prefix - Öneki (opsiyonel)
 * @returns {string} - Oluşturulan dosya adı
 */
const generateUniqueFilename = (originalFilename, prefix = '') => {
  const timestamp = Date.now();
  const randomString = crypto.randomBytes(8).toString('hex');
  const extension = path.extname(originalFilename).toLowerCase();
  
  return `${prefix}${timestamp}-${randomString}${extension}`;
};

/**
 * Profil resmi kaydet
 * @param {Object} fileData - Dosya verileri
 * @param {string} fileData.path - Geçici dosya yolu
 * @param {string} fileData.originalname - Orijinal dosya adı
 * @param {string} fileData.mimetype - MIME türü
 * @param {string} userId - Kullanıcı ID'si
 * @param {Object} options - Seçenekler
 * @param {number} options.width - Genişlik (varsayılan: 300)
 * @param {number} options.height - Yükseklik (varsayılan: 300)
 * @returns {Promise<Object>} - Kaydedilen dosya bilgileri
 */
const saveProfileImage = async (fileData, userId, options = {}) => {
  try {
    const { width = 300, height = 300 } = options;
    
    // Benzersiz dosya adı oluştur
    const filename = generateUniqueFilename(fileData.originalname, `user_${userId}_`);
    const filePath = path.join(PROFILE_DIR, filename);
    
    // Resmi işle ve kaydet
    await sharp(fileData.path)
      .resize(width, height, { fit: 'cover' })
      .toFile(filePath);
    
    // Geçici dosyayı sil
    if (fs.existsSync(fileData.path)) {
      await unlink(fileData.path);
    }
    
    return {
      filename,
      originalname: fileData.originalname,
      mimetype: fileData.mimetype,
      size: (await stat(filePath)).size,
      path: `/uploads/profiles/${filename}`
    };
  } catch (error) {
    logError('Profil resmi kaydedilemedi', error);
    throw error;
  }
};

/**
 * Tıbbi belge kaydet
 * @param {Object} fileData - Dosya verileri
 * @param {string} familyMemberId - Aile üyesi ID'si
 * @returns {Promise<Object>} - Kaydedilen dosya bilgileri
 */
const saveMedicalDocument = async (fileData, familyMemberId) => {
  try {
    // Benzersiz dosya adı oluştur
    const filename = generateUniqueFilename(fileData.originalname, `medical_${familyMemberId}_`);
    const filePath = path.join(MEDICAL_DIR, filename);
    
    // Dosyayı kopyala
    await copyFile(fileData.path, filePath);
    
    // Geçici dosyayı sil
    if (fs.existsSync(fileData.path)) {
      await unlink(fileData.path);
    }
    
    return {
      filename,
      originalname: fileData.originalname,
      mimetype: fileData.mimetype,
      size: (await stat(filePath)).size,
      path: `/uploads/medical/${filename}`
    };
  } catch (error) {
    logError('Tıbbi belge kaydedilemedi', error);
    throw error;
  }
};

/**
 * Rapor dosyası kaydet
 * @param {Object} fileData - Dosya verileri veya Buffer
 * @param {string} reportId - Rapor ID'si
 * @param {string} extension - Dosya uzantısı (buffer için gerekli)
 * @returns {Promise<Object>} - Kaydedilen dosya bilgileri
 */
const saveReportFile = async (fileData, reportId, extension = null) => {
  try {
    let filename, filePath, isBuffer = false;
    
    // Buffer mı dosya mı kontrol et
    if (Buffer.isBuffer(fileData)) {
      isBuffer = true;
      filename = `report_${reportId}_${Date.now()}${extension || '.pdf'}`;
      filePath = path.join(REPORT_DIR, filename);
      
      // Buffer'ı dosyaya yaz
      await writeFile(filePath, fileData);
    } else {
      // Benzersiz dosya adı oluştur
      filename = generateUniqueFilename(fileData.originalname, `report_${reportId}_`);
      filePath = path.join(REPORT_DIR, filename);
      
      // Dosyayı kopyala
      await copyFile(fileData.path, filePath);
      
      // Geçici dosyayı sil
      if (fs.existsSync(fileData.path)) {
        await unlink(fileData.path);
      }
    }
    
    return {
      filename,
      originalname: isBuffer ? filename : fileData.originalname,
      mimetype: isBuffer ? (extension === '.pdf' ? 'application/pdf' : 'application/octet-stream') : fileData.mimetype,
      size: (await stat(filePath)).size,
      path: `/uploads/reports/${filename}`
    };
  } catch (error) {
    logError('Rapor dosyası kaydedilemedi', error);
    throw error;
  }
};

/**
 * Beslenme fotoğrafı kaydet
 * @param {Object} fileData - Dosya verileri
 * @param {string} familyMemberId - Aile üyesi ID'si
 * @param {Object} options - Seçenekler
 * @param {number} options.width - Genişlik (varsayılan: 800)
 * @param {number} options.height - Yükseklik (varsayılan: 600)
 * @returns {Promise<Object>} - Kaydedilen dosya bilgileri
 */
const saveNutritionPhoto = async (fileData, familyMemberId, options = {}) => {
  try {
    const { width = 800, height = 600 } = options;
    
    // Benzersiz dosya adı oluştur
    const filename = generateUniqueFilename(fileData.originalname, `nutrition_${familyMemberId}_`);
    const filePath = path.join(NUTRITION_DIR, filename);
    
    // Resmi işle ve kaydet
    await sharp(fileData.path)
      .resize(width, height, { fit: 'inside' })
      .toFile(filePath);
    
    // Geçici dosyayı sil
    if (fs.existsSync(fileData.path)) {
      await unlink(fileData.path);
    }
    
    return {
      filename,
      originalname: fileData.originalname,
      mimetype: fileData.mimetype,
      size: (await stat(filePath)).size,
      path: `/uploads/nutrition/${filename}`
    };
  } catch (error) {
    logError('Beslenme fotoğrafı kaydedilemedi', error);
    throw error;
  }
};

/**
 * Aktivite fotoğrafı kaydet
 * @param {Object} fileData - Dosya verileri
 * @param {string} familyMemberId - Aile üyesi ID'si
 * @param {Object} options - Seçenekler
 * @param {number} options.width - Genişlik (varsayılan: 800)
 * @param {number} options.height - Yükseklik (varsayılan: 600)
 * @returns {Promise<Object>} - Kaydedilen dosya bilgileri
 */
const saveActivityPhoto = async (fileData, familyMemberId, options = {}) => {
  try {
    const { width = 800, height = 600 } = options;
    
    // Benzersiz dosya adı oluştur
    const filename = generateUniqueFilename(fileData.originalname, `activity_${familyMemberId}_`);
    const filePath = path.join(ACTIVITY_DIR, filename);
    
    // Resmi işle ve kaydet
    await sharp(fileData.path)
      .resize(width, height, { fit: 'inside' })
      .toFile(filePath);
    
    // Geçici dosyayı sil
    if (fs.existsSync(fileData.path)) {
      await unlink(fileData.path);
    }
    
    return {
      filename,
      originalname: fileData.originalname,
      mimetype: fileData.mimetype,
      size: (await stat(filePath)).size,
      path: `/uploads/activity/${filename}`
    };
  } catch (error) {
    logError('Aktivite fotoğrafı kaydedilemedi', error);
    throw error;
  }
};

/**
 * Geçici dosya kaydet
 * @param {Object} fileData - Dosya verileri veya Buffer
 * @param {string} prefix - Dosya adı öneki
 * @param {string} extension - Dosya uzantısı (buffer için gerekli)
 * @returns {Promise<Object>} - Kaydedilen dosya bilgileri
 */
const saveTempFile = async (fileData, prefix = 'temp', extension = null) => {
  try {
    let filename, filePath, isBuffer = false;
    
    // Buffer mı dosya mı kontrol et
    if (Buffer.isBuffer(fileData)) {
      isBuffer = true;
      filename = `${prefix}_${Date.now()}${extension || '.bin'}`;
      filePath = path.join(TEMP_DIR, filename);
      
      // Buffer'ı dosyaya yaz
      await writeFile(filePath, fileData);
    } else {
      // Benzersiz dosya adı oluştur
      filename = generateUniqueFilename(fileData.originalname, `${prefix}_`);
      filePath = path.join(TEMP_DIR, filename);
      
      // Dosyayı kopyala
      await copyFile(fileData.path, filePath);
      
      // Geçici dosyayı sil
      if (fs.existsSync(fileData.path)) {
        await unlink(fileData.path);
      }
    }
    
    return {
      filename,
      originalname: isBuffer ? filename : fileData.originalname,
      mimetype: isBuffer ? 'application/octet-stream' : fileData.mimetype,
      size: (await stat(filePath)).size,
      path: `/uploads/temp/${filename}`
    };
  } catch (error) {
    logError('Geçici dosya kaydedilemedi', error);
    throw error;
  }
};

/**
 * Dosya sil
 * @param {string} filePath - Dosya yolu (public kısmı hariç)
 * @returns {Promise<boolean>} - Başarılı ise true
 */
const deleteFile = async (filePath) => {
  try {
    // Tam dosya yolunu oluştur
    const fullPath = path.join(__dirname, '../public', filePath);
    
    // Dosya var mı kontrol et
    if (fs.existsSync(fullPath)) {
      await unlink(fullPath);
      logInfo(`Dosya silindi: ${filePath}`);
      return true;
    }
    
    return false;
  } catch (error) {
    logError(`Dosya silinemedi: ${filePath}`, error);
    return false;
  }
};

/**
 * Dosya var mı kontrol et
 * @param {string} filePath - Dosya yolu (public kısmı hariç)
 * @returns {Promise<boolean>} - Dosya varsa true
 */
const fileExists = async (filePath) => {
  try {
    // Tam dosya yolunu oluştur
    const fullPath = path.join(__dirname, '../public', filePath);
    
    // Dosya var mı kontrol et
    if (fs.existsSync(fullPath)) {
      return true;
    }
    
    return false;
  } catch (error) {
    logError(`Dosya kontrolü başarısız: ${filePath}`, error);
    return false;
  }
};

/**
 * Dosya oku
 * @param {string} filePath - Dosya yolu (public kısmı hariç)
 * @returns {Promise<Buffer>} - Dosya içeriği
 */
const readFileContent = async (filePath) => {
  try {
    // Tam dosya yolunu oluştur
    const fullPath = path.join(__dirname, '../public', filePath);
    
    // Dosya var mı kontrol et
    if (!fs.existsSync(fullPath)) {
      throw new Error(`Dosya bulunamadı: ${filePath}`);
    }
    
    // Dosyayı oku
    return await readFile(fullPath);
  } catch (error) {
    logError(`Dosya okunamadı: ${filePath}`, error);
    throw error;
  }
};

/**
 * Geçici dosyaları temizle
 * @param {number} maxAge - En fazla yaş (dakika cinsinden)
 * @returns {Promise<number>} - Silinen dosya sayısı
 */
const cleanupTempFiles = async (maxAge = 60) => {
  try {
    // Tüm geçici dosyaları listele
    const files = await readdir(TEMP_DIR);
    
    let deletedCount = 0;
    const now = Date.now();
    
    // Her dosya için
    for (const file of files) {
      const filePath = path.join(TEMP_DIR, file);
      const fileStat = await stat(filePath);
      
      // Dosya yaşını hesapla (dakika cinsinden)
      const fileAge = (now - fileStat.mtime.getTime()) / (1000 * 60);
      
      // Belirtilen yaştan büyükse sil
      if (fileAge > maxAge) {
        await unlink(filePath);
        deletedCount++;
      }
    }
    
    logInfo(`${deletedCount} geçici dosya temizlendi`);
    return deletedCount;
  } catch (error) {
    logError('Geçici dosyalar temizlenemedi', error);
    return 0;
  }
};

/**
 * Veritabanında bulunmayan dosyaları temizle
 * @param {string} directory - Temizlenecek dizin
 * @param {Array<string>} validFilenames - Geçerli dosya adları
 * @returns {Promise<number>} - Silinen dosya sayısı
 */
const cleanupOrphanedFiles = async (directory, validFilenames) => {
  try {
    // Dizini belirle
    let targetDir;
    switch (directory) {
      case 'profiles':
        targetDir = PROFILE_DIR;
        break;
      case 'medical':
        targetDir = MEDICAL_DIR;
        break;
      case 'reports':
        targetDir = REPORT_DIR;
        break;
      case 'nutrition':
        targetDir = NUTRITION_DIR;
        break;
        case 'activity':
            targetDir = ACTIVITY_DIR;
            break;
          default:
            throw new Error(`Geçersiz dizin: ${directory}`);
        }
        
        // Tüm dosyaları listele
        const files = await readdir(targetDir);
        
        let deletedCount = 0;
        
        // Her dosya için
        for (const file of files) {
          // varsayılan dosyaları atla
          if (file.startsWith('default-')) {
            continue;
          }
          
          // Dosya geçerli dosyalar listesinde yoksa sil
          if (!validFilenames.includes(file)) {
            const filePath = path.join(targetDir, file);
            await unlink(filePath);
            deletedCount++;
          }
        }
        
        logInfo(`${deletedCount} sahipsiz dosya temizlendi (${directory})`);
        return deletedCount;
      } catch (error) {
        logError(`Sahipsiz dosyalar temizlenemedi: ${directory}`, error);
        return 0;
      }
    };
    
    /**
     * Depolama kullanım istatistiklerini al
     * @returns {Promise<Object>} - Kullanım istatistikleri
     */
    const getStorageStats = async () => {
      try {
        // Tüm dizinleri ve dosya sayılarını hesapla
        const stats = {
          profiles: 0,
          medical: 0,
          reports: 0,
          nutrition: 0,
          activity: 0,
          temp: 0,
          totalSize: 0,
          totalFiles: 0
        };
        
        // Her dizin için istatistik topla
        const collectStats = async (dir, statKey) => {
          const files = await readdir(dir);
          stats[statKey] = files.length;
          stats.totalFiles += files.length;
          
          // Toplam boyutu hesapla
          for (const file of files) {
            const filePath = path.join(dir, file);
            const fileStat = await stat(filePath);
            stats.totalSize += fileStat.size;
          }
        };
        
        // Her dizin için istatistik topla
        await collectStats(PROFILE_DIR, 'profiles');
        await collectStats(MEDICAL_DIR, 'medical');
        await collectStats(REPORT_DIR, 'reports');
        await collectStats(NUTRITION_DIR, 'nutrition');
        await collectStats(ACTIVITY_DIR, 'activity');
        await collectStats(TEMP_DIR, 'temp');
        
        // Toplam boyutu MB cinsine çevir
        stats.totalSizeMB = (stats.totalSize / (1024 * 1024)).toFixed(2);
        
        return stats;
      } catch (error) {
        logError('Depolama istatistikleri alınamadı', error);
        throw error;
      }
    };
    
    /**
     * Dosya tipini mimetype'a göre kontrol et
     * @param {string} mimetype - MIME türü
     * @param {Array<string>} allowedTypes - İzin verilen MIME türleri
     * @returns {boolean} - Geçerli ise true
     */
    const isValidFileType = (mimetype, allowedTypes) => {
      return allowedTypes.includes(mimetype);
    };
    
    /**
     * Dosya boyutunu kontrol et
     * @param {number} fileSize - Dosya boyutu (byte)
     * @param {number} maxSize - İzin verilen maksimum boyut (byte)
     * @returns {boolean} - Geçerli ise true
     */
    const isValidFileSize = (fileSize, maxSize) => {
      return fileSize <= maxSize;
    };
    
    // Başlangıçta depolama dizinlerini oluştur
    initStorageDirs();
    
    module.exports = {
      saveProfileImage,
      saveMedicalDocument,
      saveReportFile,
      saveNutritionPhoto,
      saveActivityPhoto,
      saveTempFile,
      deleteFile,
      fileExists,
      readFileContent,
      cleanupTempFiles,
      cleanupOrphanedFiles,
      getStorageStats,
      isValidFileType,
      isValidFileSize,
      generateUniqueFilename,
      STORAGE_ROOT,
      PROFILE_DIR,
      MEDICAL_DIR,
      REPORT_DIR,
      TEMP_DIR,
      NUTRITION_DIR,
      ACTIVITY_DIR
    };
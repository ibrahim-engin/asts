/**
 * ASTS - Aile Sağlık Takip Sistemi
 * Logger - Loglama Yardımcıları
 * 
 * Bu dosya, uygulama genelinde loglama işlemleri için yardımcı fonksiyonları içerir.
 * Farklı seviyelerde loglama ve biçimlendirme için kullanılır.
 */

const winston = require('winston');
const path = require('path');
const fs = require('fs');
const { format } = winston;
const { LOG_LEVELS } = require('./constants');

// Log dizinini oluştur
const logDirectory = path.join(__dirname, '../logs');
if (!fs.existsSync(logDirectory)) {
  fs.mkdirSync(logDirectory, { recursive: true });
}

// Tarih formatı
const timestamp = format((info) => {
  info.timestamp = new Date().toISOString();
  return info;
});

// Özel format oluştur
const customFormat = format.printf(({ level, message, timestamp, ...meta }) => {
  return `${timestamp} ${level.toUpperCase()}: ${message} ${Object.keys(meta).length ? JSON.stringify(meta, null, 2) : ''}`;
});

// Winston logger oluştur
const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: format.combine(
    timestamp(),
    format.errors({ stack: true }),
    format.splat(),
    customFormat
  ),
  transports: [
    // Konsol çıktısı
    new winston.transports.Console({
      format: format.combine(
        format.colorize(),
        customFormat
      )
    }),
    // Hata logları
    new winston.transports.File({
      filename: path.join(logDirectory, 'error.log'),
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    // Tüm loglar
    new winston.transports.File({
      filename: path.join(logDirectory, 'combined.log'),
      maxsize: 10485760, // 10MB
      maxFiles: 5,
    })
  ],
  exceptionHandlers: [
    new winston.transports.File({
      filename: path.join(logDirectory, 'exceptions.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    })
  ],
  rejectionHandlers: [
    new winston.transports.File({
      filename: path.join(logDirectory, 'rejections.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    })
  ]
});

/**
 * Bilgi seviyesinde log kaydeder
 * @param {string} message - Log mesajı
 * @param {Object} meta - Ek veriler
 */
const logInfo = (message, meta = {}) => {
  logger.info(message, meta);
};

/**
 * Hata seviyesinde log kaydeder
 * @param {string} message - Log mesajı
 * @param {Error|Object} error - Hata nesnesi veya ek veriler
 */
const logError = (message, error = {}) => {
  if (error instanceof Error) {
    logger.error(message, {
      error: error.message,
      stack: error.stack
    });
  } else {
    logger.error(message, error);
  }
};

/**
 * Uyarı seviyesinde log kaydeder
 * @param {string} message - Log mesajı
 * @param {Object} meta - Ek veriler
 */
const logWarning = (message, meta = {}) => {
  logger.warn(message, meta);
};

/**
 * Hata ayıklama seviyesinde log kaydeder
 * @param {string} message - Log mesajı
 * @param {Object} meta - Ek veriler
 */
const logDebug = (message, meta = {}) => {
  logger.debug(message, meta);
};

/**
 * HTTP istek log kaydeder
 * @param {Object} req - HTTP istek nesnesi
 * @param {Object} res - HTTP yanıt nesnesi
 * @param {number} duration - İstek süresi (ms)
 */
const logHttpRequest = (req, res, duration) => {
  const logData = {
    method: req.method,
    url: req.originalUrl,
    status: res.statusCode,
    duration: `${duration}ms`,
    userAgent: req.get('User-Agent') || 'Unknown',
    ip: req.ip || req.connection.remoteAddress,
    userId: req.user ? req.user._id : (req.admin ? req.admin._id : null),
    userType: req.isAdmin ? 'admin' : (req.user ? 'user' : 'guest')
  };
  
  // 4xx ve 5xx hataları için ekstra log
  if (res.statusCode >= 400) {
    const level = res.statusCode >= 500 ? 'error' : 'warn';
    
    // Hassas verileri filtrele
    const filtered = { ...req.body };
    ['password', 'passwordConfirm', 'token'].forEach(field => {
      if (filtered[field]) filtered[field] = '[FILTERED]';
    });
    
    logger[level](`HTTP ${res.statusCode} - ${req.method} ${req.originalUrl}`, {
      ...logData,
      body: filtered,
      query: req.query,
      params: req.params
    });
  } else {
    logInfo(`HTTP ${res.statusCode} - ${req.method} ${req.originalUrl}`, logData);
  }
};

/**
 * Kullanıcı işlemi log kaydeder
 * @param {string} action - İşlem adı
 * @param {Object} user - Kullanıcı bilgileri
 * @param {Object} details - İşlem detayları
 */
const logUserAction = (action, user, details = {}) => {
  logInfo(`USER ACTION: ${action}`, {
    userId: user._id,
    email: user.email,
    userType: user.isAdmin ? 'admin' : 'user',
    ...details
  });
};

/**
 * Veritabanı işlemi log kaydeder
 * @param {string} operation - İşlem adı (create, update, delete, query)
 * @param {string} model - Model adı
 * @param {string|Object} document - Belge ID'si veya belge
 * @param {Object} details - İşlem detayları
 */
const logDbOperation = (operation, model, document, details = {}) => {
  let documentId;
  
  if (typeof document === 'string') {
    documentId = document;
  } else if (document && document._id) {
    documentId = document._id;
  }
  
  logDebug(`DB ${operation.toUpperCase()}: ${model}`, {
    model,
    operation,
    documentId,
    ...details
  });
};

/**
 * Performans ölçümü log kaydeder
 * @param {string} action - İşlem adı
 * @param {number} duration - Süre (ms)
 * @param {Object} details - İşlem detayları
 */
const logPerformance = (action, duration, details = {}) => {
  logDebug(`PERFORMANCE: ${action} took ${duration}ms`, {
    action,
    duration,
    ...details
  });
};

/**
 * Kritik işlem log kaydeder
 * @param {string} action - İşlem adı
 * @param {Object} user - Kullanıcı bilgileri
 * @param {Object} details - İşlem detayları
 */
const logCriticalAction = (action, user, details = {}) => {
  logWarning(`CRITICAL ACTION: ${action}`, {
    userId: user ? user._id : null,
    email: user ? user.email : null,
    userType: user ? (user.isAdmin ? 'admin' : 'user') : 'system',
    timestamp: new Date().toISOString(),
    ...details
  });
};

/**
 * Başlangıç log kaydeder
 * @param {string} environment - Çalışma ortamı
 * @param {number} port - Port numarası
 */
const logStartup = (environment, port) => {
  logInfo(`Server starting in ${environment} mode on port ${port}`, {
    nodeEnv: environment,
    port,
    timestamp: new Date().toISOString()
  });
};

/**
 * Log dosyalarını temizler
 * @param {number} days - Belirtilen günden eski logları sil
 * @returns {Promise<number>} - Silinen dosya sayısı
 */
const cleanupLogs = async (days = 30) => {
  try {
    const files = fs.readdirSync(logDirectory);
    const now = Date.now();
    const cutoff = now - (days * 24 * 60 * 60 * 1000);
    let deletedCount = 0;
    
    for (const file of files) {
      const filePath = path.join(logDirectory, file);
      const stats = fs.statSync(filePath);
      
      if (stats.isFile() && stats.mtime.getTime() < cutoff) {
        fs.unlinkSync(filePath);
        deletedCount++;
      }
    }
    
    logInfo(`Cleaned up ${deletedCount} log files older than ${days} days`);
    return deletedCount;
  } catch (error) {
    logError('Error cleaning up log files', error);
    return 0;
  }
};

/**
 * Performans ölçümü başlatır
 * @returns {Function} - Ölçümü sonlandırma fonksiyonu
 */
const startPerformanceMeasurement = () => {
  const startTime = process.hrtime();
  
  return (label) => {
    const diff = process.hrtime(startTime);
    const duration = Math.round((diff[0] * 1e9 + diff[1]) / 1e6);
    logPerformance(label, duration);
    return duration;
  };
};

module.exports = {
  logger,
  logInfo,
  logError,
  logWarning,
  logDebug,
  logHttpRequest,
  logUserAction,
  logDbOperation,
  logPerformance,
  logCriticalAction,
  logStartup,
  cleanupLogs,
  startPerformanceMeasurement
};
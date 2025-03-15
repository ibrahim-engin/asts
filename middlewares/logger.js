const winston = require('winston');
const path = require('path');
const fs = require('fs');

// Loglama dizinini oluştur
const logDirectory = path.join(__dirname, '../logs');
if (!fs.existsSync(logDirectory)) {
  fs.mkdirSync(logDirectory);
}

// Winston logger konfigürasyonu
const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json()
  ),
  defaultMeta: { service: 'asts' },
  transports: [
    // Hata seviyesi logları için ayrı dosya
    new winston.transports.File({
      filename: path.join(logDirectory, 'error.log'),
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    // Tüm loglar için ayrı dosya
    new winston.transports.File({
      filename: path.join(logDirectory, 'combined.log'),
      maxsize: 10485760, // 10MB
      maxFiles: 5,
    }),
  ],
  exceptionHandlers: [
    new winston.transports.File({
      filename: path.join(logDirectory, 'exceptions.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
  ],
  rejectionHandlers: [
    new winston.transports.File({
      filename: path.join(logDirectory, 'rejections.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
  ],
});

// Geliştirme ortamında konsola da log yazdır
if (process.env.NODE_ENV !== 'production') {
  logger.add(
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    })
  );
}

/**
 * Express istek loglaması için middleware
 */
const requestLogger = (req, res, next) => {
  // İsteğin başlangıç zamanı
  const start = new Date();
  
  // İstek tamamlandığında loglama
  res.on('finish', () => {
    // İstek süresi hesapla
    const duration = new Date() - start;
    
    // HTTP istek bilgilerini logla
    logger.info({
      method: req.method,
      url: req.originalUrl,
      status: res.statusCode,
      contentLength: res.get('Content-Length') || 0,
      userAgent: req.get('User-Agent') || 'Unknown',
      ip: req.ip || req.connection.remoteAddress,
      duration: `${duration}ms`,
      userId: req.user ? req.user._id : (req.admin ? req.admin._id : null),
      userType: req.isAdmin ? 'admin' : (req.user ? 'user' : 'guest'),
    });
    
    // Hata durumunda ekstra loglama
    if (res.statusCode >= 400) {
      const logLevel = res.statusCode >= 500 ? 'error' : 'warn';
      logger[logLevel]({
        method: req.method,
        url: req.originalUrl,
        status: res.statusCode,
        duration: `${duration}ms`,
        ip: req.ip || req.connection.remoteAddress,
        userId: req.user ? req.user._id : (req.admin ? req.admin._id : null),
        userType: req.isAdmin ? 'admin' : (req.user ? 'user' : 'guest'),
        body: req.body,
        params: req.params,
        query: req.query,
      });
    }
  });
  
  next();
};

/**
 * Kullanıcı etkinliği loglama middleware'i
 * Oturum açma, kapama, önemli işlemler gibi etkinlikleri loglar
 */
const activityLogger = (activity, details = {}) => {
  return (req, res, next) => {
    // İstek tamamlandığında loglama
    res.on('finish', () => {
      // Başarılı işlemleri logla (2xx durum kodları)
      if (res.statusCode >= 200 && res.statusCode < 300) {
        logger.info({
          activity,
          status: res.statusCode,
          userId: req.user ? req.user._id : (req.admin ? req.admin._id : null),
          userType: req.isAdmin ? 'admin' : (req.user ? 'user' : 'guest'),
          ip: req.ip || req.connection.remoteAddress,
          userAgent: req.get('User-Agent') || 'Unknown',
          ...details,
        });
      }
    });
    
    next();
  };
};

/**
 * Veri değişikliklerini loglama middleware'i
 * Veri ekleme, güncelleme, silme gibi işlemleri loglar
 */
const dataChangeLogger = (modelName, operation, idExtractor) => {
  return (req, res, next) => {
    // İstek tamamlandığında loglama
    res.on('finish', () => {
      // Başarılı işlemleri logla
      if (res.statusCode >= 200 && res.statusCode < 300) {
        // Değişikliğe uğrayan veri ID'si
        const id = idExtractor ? idExtractor(req) : (req.params.id || null);
        
        logger.info({
          model: modelName,
          operation,
          dataId: id,
          userId: req.user ? req.user._id : (req.admin ? req.admin._id : null),
          userType: req.isAdmin ? 'admin' : (req.user ? 'user' : 'guest'),
          ip: req.ip || req.connection.remoteAddress,
        });
      }
    });
    
    next();
  };
};

/**
 * Kritik işlemlerin loglanması için middleware
 * Şifre değişikliği, kullanıcı engelleme gibi kritik işlemleri loglar
 */
const criticalActionLogger = (action, details = {}) => {
  return (req, res, next) => {
    // İstek öncesi log oluştur (işlem başarısız olsa bile)
    logger.warn({
      criticalAction: action,
      initiatedBy: req.user ? req.user._id : (req.admin ? req.admin._id : null),
      userType: req.isAdmin ? 'admin' : (req.user ? 'user' : 'guest'),
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent') || 'Unknown',
      ...details,
    });
    
    // İstek tamamlandığında son durumu logla
    res.on('finish', () => {
      logger.warn({
        criticalAction: action,
        status: res.statusCode,
        succeeded: res.statusCode >= 200 && res.statusCode < 300,
        initiatedBy: req.user ? req.user._id : (req.admin ? req.admin._id : null),
        userType: req.isAdmin ? 'admin' : (req.user ? 'user' : 'guest'),
        ip: req.ip || req.connection.remoteAddress,
        ...details,
      });
    });
    
    next();
  };
};

/**
 * Belirli bir kullanıcının eylemlerini loglama
 * @param {string} userId - Loglanacak kullanıcı ID'si
 */
const auditUserLogger = (userId) => {
  return (req, res, next) => {
    // Belirtilen kullanıcı için audit loglama yap
    if (
      (req.user && req.user._id.toString() === userId) ||
      (req.admin && req.admin._id.toString() === userId)
    ) {
      logger.debug({
        auditUser: userId,
        method: req.method,
        url: req.originalUrl,
        status: res.statusCode,
        ip: req.ip || req.connection.remoteAddress,
        userAgent: req.get('User-Agent') || 'Unknown',
        body: req.body,
        params: req.params,
        query: req.query,
      });
    }
    
    next();
  };
};

// Hata loglama yardımcısı
const logError = (err, req = {}) => {
  logger.error({
    message: err.message,
    stack: err.stack,
    url: req.originalUrl || 'N/A',
    method: req.method || 'N/A',
    userId: req.user ? req.user._id : (req.admin ? req.admin._id : null),
    userType: req.isAdmin ? 'admin' : (req.user ? 'user' : 'guest'),
    ip: req.ip || (req.connection ? req.connection.remoteAddress : 'N/A'),
  });
};

// Bilgi loglama yardımcısı
const logInfo = (message, data = {}) => {
  logger.info({
    message,
    ...data,
  });
};

// Uyarı loglama yardımcısı
const logWarning = (message, data = {}) => {
  logger.warn({
    message,
    ...data,
  });
};

module.exports = {
  logger,
  requestLogger,
  activityLogger,
  dataChangeLogger,
  criticalActionLogger,
  auditUserLogger,
  logError,
  logInfo,
  logWarning,
};
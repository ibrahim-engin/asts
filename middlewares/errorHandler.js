const config = require('../config');

/**
 * Global hata yakalama middleware'i
 * Uygulama genelinde oluşan hataları yakalayıp uygun formatta döndürür
 */
const errorHandler = (err, req, res, next) => {
  // Konsola hata bilgisini yazdır
  console.error('Hata bilgisi:'.red.bold);
  console.error(err);

  // Mongoose validation hatası
  if (err.name === 'ValidationError') {
    return handleValidationError(err, req, res);
  }

  // Mongoose duplicate key hatası
  if (err.code === 11000) {
    return handleDuplicateKeyError(err, req, res);
  }

  // Mongoose cast hatası (ObjectId vb.)
  if (err.name === 'CastError') {
    return handleCastError(err, req, res);
  }

  // JWT hatası
  if (err.name === 'JsonWebTokenError') {
    return handleJWTError(req, res);
  }

  // JWT sona erme hatası
  if (err.name === 'TokenExpiredError') {
    return handleJWTExpiredError(req, res);
  }

  // Genel hata mesajı
  const statusCode = err.statusCode || 500;
  const errorMessage = err.message || 'Sunucu hatası';

  // API isteklerinde JSON yanıtı dön
  if (req.originalUrl.startsWith('/api')) {
    return res.status(statusCode).json({
      success: false,
      error: errorMessage,
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
  }

  // Sayfa isteklerinde hata sayfasına yönlendir
  let template = 'error';
  if (statusCode === 404) {
    template = '404';
  } else if (statusCode === 500) {
    template = '500';
  }

  return res.status(statusCode).render(template, {
    title: `Hata ${statusCode}`,
    message: errorMessage,
    error: process.env.NODE_ENV === 'development' ? err : {}
  });
};

/**
 * Mongoose validation hatalarını işleme
 */
const handleValidationError = (err, req, res) => {
  // Validation hatalarını topla
  const errors = Object.values(err.errors).map(val => val.message);
  const errorMessage = `Geçersiz veri girişi: ${errors.join('. ')}`;

  // API isteklerinde JSON yanıtı dön
  if (req.originalUrl.startsWith('/api')) {
    return res.status(400).json({
      success: false,
      error: errorMessage,
      details: errors
    });
  }

  // Sayfa isteklerinde flash mesajı ile hata sayfasına yönlendir
  req.flash('error_msg', errorMessage);
  return res.status(400).render('error', {
    title: 'Geçersiz Veri',
    message: errorMessage
  });
};

/**
 * Mongoose duplicate key hatalarını işleme
 */
const handleDuplicateKeyError = (err, req, res) => {
  // Yinelenen değeri bul
  const field = Object.keys(err.keyValue)[0];
  const value = err.keyValue[field];
  const errorMessage = `${field} alanında '${value}' değeri zaten kullanılıyor.`;

  // API isteklerinde JSON yanıtı dön
  if (req.originalUrl.startsWith('/api')) {
    return res.status(400).json({
      success: false,
      error: errorMessage,
      field
    });
  }

  // Sayfa isteklerinde flash mesajı ile hata sayfasına yönlendir
  req.flash('error_msg', errorMessage);
  return res.status(400).render('error', {
    title: 'Yinelenen Değer',
    message: errorMessage
  });
};

/**
 * Mongoose cast hatalarını işleme (ObjectId vb.)
 */
const handleCastError = (err, req, res) => {
  const errorMessage = `Geçersiz ${err.path}: ${err.value}`;

  // API isteklerinde JSON yanıtı dön
  if (req.originalUrl.startsWith('/api')) {
    return res.status(400).json({
      success: false,
      error: errorMessage
    });
  }

  // Sayfa isteklerinde flash mesajı ile hata sayfasına yönlendir
  req.flash('error_msg', errorMessage);
  return res.status(400).render('error', {
    title: 'Geçersiz Değer',
    message: errorMessage
  });
};

/**
 * JWT hatalarını işleme
 */
const handleJWTError = (req, res) => {
  const errorMessage = 'Yetkilendirme hatası. Lütfen tekrar giriş yapın.';

  // API isteklerinde JSON yanıtı dön
  if (req.originalUrl.startsWith('/api')) {
    return res.status(401).json({
      success: false,
      error: errorMessage
    });
  }

  // Sayfa isteklerinde giriş sayfasına yönlendir
  req.flash('error_msg', errorMessage);
  return res.redirect('/auth/login');
};

/**
 * JWT sona erme hatalarını işleme
 */
const handleJWTExpiredError = (req, res) => {
  const errorMessage = 'Oturumunuzun süresi doldu. Lütfen tekrar giriş yapın.';

  // API isteklerinde JSON yanıtı dön
  if (req.originalUrl.startsWith('/api')) {
    return res.status(401).json({
      success: false,
      error: errorMessage
    });
  }

  // Sayfa isteklerinde giriş sayfasına yönlendir
  req.flash('error_msg', errorMessage);
  return res.redirect('/auth/login');
};

module.exports = errorHandler;
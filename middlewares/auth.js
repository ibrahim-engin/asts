const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Admin = require('../models/Admin');
const config = require('../config');

/**
 * Token doğrulama middleware'i
 * JWT token ile kullanıcı kimlik doğrulaması yapar
 */
exports.protect = async (req, res, next) => {
  let token;

  // Token kontrolü - Header veya Cookie'den al
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    // Header'dan token al
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies && req.cookies[config.jwt.cookieName]) {
    // Cookie'den token al
    token = req.cookies[config.jwt.cookieName];
  }

  // Token yoksa yetkilendirme hatası
  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'Bu sayfaya erişmek için giriş yapmalısınız'
    });
  }

  try {
    // Token doğrulama
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Token'ın içindeki isAdmin değeri true ise admin kontrol et
    if (decoded.isAdmin) {
      const admin = await Admin.findById(decoded.id);
      
      if (!admin) {
        return res.status(401).json({
          success: false,
          error: 'Geçersiz yetkilendirme'
        });
      }

      // Aktif değilse erişimi engelle
      if (!admin.isActive) {
        return res.status(401).json({
          success: false,
          error: 'Hesabınız devre dışı bırakılmış'
        });
      }

      // Admin bilgisini request'e ekle
      req.admin = admin;
      req.isAdmin = true;
    } else {
      // Normal kullanıcı kontrolü
      const user = await User.findById(decoded.id);
      
      if (!user) {
        return res.status(401).json({
          success: false,
          error: 'Geçersiz yetkilendirme'
        });
      }

      // Aktif değilse erişimi engelle
      if (!user.isActive) {
        return res.status(401).json({
          success: false,
          error: 'Hesabınız devre dışı bırakılmış'
        });
      }

      // Kullanıcı bilgisini request'e ekle
      req.user = user;
      req.isAdmin = false;
    }

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      error: 'Geçersiz yetkilendirme'
    });
  }
};

/**
 * Oturum açık mı kontrolü middleware'i
 * Misafir erişimli sayfalarda kullanıcı bilgisini döndürür (zorunlu değil)
 */
exports.optionalAuth = async (req, res, next) => {
  let token;

  // Token kontrolü - Header veya Cookie'den al
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies && req.cookies[config.jwt.cookieName]) {
    token = req.cookies[config.jwt.cookieName];
  }

  // Token yoksa geç
  if (!token) {
    return next();
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Admin kontrolü
    if (decoded.isAdmin) {
      const admin = await Admin.findById(decoded.id);
      
      if (admin && admin.isActive) {
        req.admin = admin;
        req.isAdmin = true;
      }
    } else {
      // Kullanıcı kontrolü
      const user = await User.findById(decoded.id);
      
      if (user && user.isActive) {
        req.user = user;
        req.isAdmin = false;
      }
    }

    next();
  } catch (error) {
    // Token geçersiz olsa bile devam et
    next();
  }
};

/**
 * Token yenileme middleware'i
 * Eğer token belirli bir sürenin altında ise yeni token oluşturur
 */
exports.refreshToken = async (req, res, next) => {
  // Kullanıcı yoksa geç
  if (!req.user && !req.admin) {
    return next();
  }

  const token = req.cookies[config.jwt.cookieName];

  if (!token) {
    return next();
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Token süresinin dolmasına 24 saatten az kaldıysa yenile
    const expiresIn = decoded.exp - Math.floor(Date.now() / 1000);
    
    if (expiresIn < 60 * 60 * 24) {
      // Yeni token oluştur
      let newToken;
      
      if (req.isAdmin) {
        newToken = req.admin.getSignedJwtToken();
      } else {
        newToken = req.user.getSignedJwtToken();
      }
      
      // Cookie olarak gönder
      res.cookie(
        config.jwt.cookieName,
        newToken,
        config.jwt.cookieOptions
      );
    }
    
    next();
  } catch (error) {
    next();
  }
};

/**
 * Oturum bilgilerini view'lara aktarma middleware'i
 * EJS şablonlarında kullanım için
 */
exports.setAuthLocals = (req, res, next) => {
  // İstemciye gönderilecek kullanıcı bilgilerini ayarla
  res.locals.currentUser = null;
  res.locals.isAuthenticated = false;
  res.locals.isAdmin = false;

  if (req.user) {
    res.locals.currentUser = {
      id: req.user._id,
      name: req.user.name,
      surname: req.user.surname,
      fullName: req.user.name + ' ' + req.user.surname,
      email: req.user.email,
      avatar: req.user.avatar,
      role: req.user.role
    };
    res.locals.isAuthenticated = true;
  } else if (req.admin) {
    res.locals.currentUser = {
      id: req.admin._id,
      name: req.admin.name,
      surname: req.admin.surname,
      fullName: req.admin.name + ' ' + req.admin.surname,
      email: req.admin.email,
      avatar: req.admin.avatar,
      level: req.admin.level
    };
    res.locals.isAuthenticated = true;
    res.locals.isAdmin = true;
  }

  next();
};

/**
 * API isteklerinde kullanıcı bilgilerini gönderme middleware'i
 */
exports.setAuthUser = (req, res, next) => {
  // İsteğe bağlı olarak middleware chain'de kullanılır
  // Eğer kullanıcı bilgisi varsa response'a ekler
  if (req.user) {
    res.locals.user = {
      id: req.user._id,
      name: req.user.name,
      surname: req.user.surname,
      email: req.user.email,
      role: req.user.role
    };
  } else if (req.admin) {
    res.locals.admin = {
      id: req.admin._id,
      name: req.admin.name,
      surname: req.admin.surname,
      email: req.admin.email,
      level: req.admin.level
    };
  }

  next();
};
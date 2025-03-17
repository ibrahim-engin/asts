/**
 * Giriş yapılıp yapılmadığını kontrol eden middleware
 * Kullanıcı veya admin girişi var mı kontrol eder
 */
exports.isAuthenticated = (req, res, next) => {
  // Hem req.user (JWT kontrolü için) hem de req.session.user (Sessions kontrolü için) kontrol et
  if (!req.user && !req.admin && !req.session.user) {
    // API isteği ise JSON dön
    if (req.originalUrl.startsWith('/api')) {
      return res.status(401).json({
        success: false,
        error: 'Bu işlemi gerçekleştirmek için giriş yapmalısınız'
      });
    }
    
    // İstek URL'ini kaydet (giriş sonrası bu sayfaya dönmek için)
    req.session.returnTo = req.originalUrl;
    req.flash('error_msg', 'Bu sayfaya erişmek için giriş yapmalısınız');
    return res.redirect('/auth/login');
  }

  // Eğer req.user yoksa ama req.session.user varsa, req.user'a aktarıyoruz
  // Bu, JWT ve session karışımı bir kimlik doğrulama kullandığınız durumları destekler
  if (!req.user && req.session.user) {
    req.user = req.session.user;
  }

  next();
};
  
  /**
   * Giriş yapılmadığını kontrol eden middleware
   * Kullanıcı veya admin girişi yoksa devam eder
   * Login, register gibi sayfalar için kullanılır
   */
  exports.isNotAuthenticated = (req, res, next) => {
    if (req.user || req.admin) {
      // API isteği ise JSON dön
      if (req.originalUrl.startsWith('/api')) {
        return res.status(400).json({
          success: false,
          error: 'Zaten giriş yapmış durumdasınız'
        });
      }
      
      // Admin ise admin paneline, kullanıcı ise ana sayfaya yönlendir
      const redirectUrl = req.isAdmin ? `/${process.env.ADMIN_PAGE_URL}/dashboard` : '/home';
      return res.redirect(redirectUrl);
    }
  
    next();
  };
  
  /**
   * Sadece kullanıcı girişi kontrolü yapan middleware
   * Admin girişlerini reddeder, sadece normal kullanıcıları kabul eder
   */
  exports.isUser = (req, res, next) => {
    if (!req.user) {
      // Admin mi kontrol et
      if (req.admin) {
        // API isteği ise JSON dön
        if (req.originalUrl.startsWith('/api')) {
          return res.status(403).json({
            success: false,
            error: 'Bu sayfa admin kullanıcıları için kullanılamaz'
          });
        }
        
        req.flash('error_msg', 'Bu sayfa admin kullanıcıları için kullanılamaz');
        return res.redirect(`/${process.env.ADMIN_PAGE_URL}/dashboard`);
      }
      
      // Giriş yapmamış kullanıcı
      // API isteği ise JSON dön
      if (req.originalUrl.startsWith('/api')) {
        return res.status(401).json({
          success: false,
          error: 'Bu işlemi gerçekleştirmek için giriş yapmalısınız'
        });
      }
      
      req.session.returnTo = req.originalUrl;
      req.flash('error_msg', 'Bu sayfaya erişmek için giriş yapmalısınız');
      return res.redirect('/auth/login');
    }
  
    next();
  };
  
  /**
   * Oturum açıksa belirli bir sayfaya yönlendirme middleware'i
   * URL parametresi veya session'daki returnTo değerini kullanır
   */
  exports.redirectAfterAuth = (defaultRedirect = '/home') => {
    return (req, res, next) => {
      // URL'den redirect parametresi var mı kontrol et
      const redirectUrl = req.query.redirect || req.session.returnTo || defaultRedirect;
      
      // Session'dan returnTo değerini temizle
      delete req.session.returnTo;
      
      // Admin ise ve admin panel dışına yönlendiriliyorsa, admin paneline yönlendir
      if (req.isAdmin && !redirectUrl.includes(process.env.ADMIN_PAGE_URL)) {
        return res.redirect(`/${process.env.ADMIN_PAGE_URL}/dashboard`);
      }
      
      return res.redirect(redirectUrl);
    };
  };
  
  /**
   * Aile üyesi erişimi kontrolü
   * Verilen ID'ye sahip aile üyesine kullanıcının erişimi var mı kontrol eder
   */
  exports.canAccessFamilyMember = async (req, res, next) => {
    try {
      const familyMemberId = req.params.id || req.body.familyMemberId;
      
      if (!familyMemberId) {
        throw new Error('Aile üyesi ID\'si belirtilmedi');
      }
      
      // Admin her aile üyesine erişebilir
      if (req.isAdmin) {
        return next();
      }
      
      // Kullanıcının aile üyesine erişimi var mı kontrol et
      const FamilyMember = require('../models/FamilyMember');
      const familyMember = await FamilyMember.findById(familyMemberId);
      
      if (!familyMember) {
        throw new Error('Aile üyesi bulunamadı');
      }
      
      if (familyMember.userId.toString() !== req.user._id.toString()) {
        throw new Error('Bu aile üyesine erişim yetkiniz yok');
      }
      
      // Aile üyesi bilgisini request'e ekle
      req.familyMember = familyMember;
      
      next();
    } catch (error) {
      // API isteği ise JSON dön
      if (req.originalUrl.startsWith('/api')) {
        return res.status(403).json({
          success: false,
          error: error.message || 'Bu veriye erişim yetkiniz bulunmuyor'
        });
      }
      
      req.flash('error_msg', error.message || 'Bu veriye erişim yetkiniz bulunmuyor');
      return res.redirect('/home');
    }
  };
  
  /**
   * Kullanıcı rolü kontrolü
   * Belirli rollere sahip kullanıcıların erişimine izin verir
   * @param {Array|String} roles - İzin verilen roller dizisi veya tek bir rol
   */
  exports.hasRole = (roles) => {
    return (req, res, next) => {
      // Giriş yapılmış mı kontrol et
      if (!req.user && !req.admin) {
        // API isteği ise JSON dön
        if (req.originalUrl.startsWith('/api')) {
          return res.status(401).json({
            success: false,
            error: 'Bu işlemi gerçekleştirmek için giriş yapmalısınız'
          });
        }
        
        req.session.returnTo = req.originalUrl;
        req.flash('error_msg', 'Bu sayfaya erişmek için giriş yapmalısınız');
        return res.redirect('/auth/login');
      }
      
      // Admin her zaman erişebilir
      if (req.isAdmin) {
        return next();
      }
      
      // Rolleri dizi formatına çevir
      const allowedRoles = Array.isArray(roles) ? roles : [roles];
      
      // Kullanıcının rolü izin verilen roller arasında mı kontrol et
      if (!allowedRoles.includes(req.user.role)) {
        // API isteği ise JSON dön
        if (req.originalUrl.startsWith('/api')) {
          return res.status(403).json({
            success: false,
            error: 'Bu işlemi gerçekleştirmek için gerekli yetkiye sahip değilsiniz'
          });
        }
        
        req.flash('error_msg', 'Bu sayfaya erişmek için gerekli yetkiye sahip değilsiniz');
        return res.redirect('/home');
      }
      
      next();
    };
  };
  
  /**
   * Veri sahibi veya admin kontrolü
   * Veri sahibi veya admin olan kullanıcıların erişimine izin verir
   * @param {Function} ownerIdExtractor - Request'ten veri sahibi ID'sini çıkaran fonksiyon
   * @param {string} ownerField - Veri sahibi ID'sinin bulunduğu alan adı (varsayılan: 'userId')
   */
  exports.isOwnerOrAdmin = (ownerIdExtractor, ownerField = 'userId') => {
    return async (req, res, next) => {
      // Giriş yapılmış mı kontrol et
      if (!req.user && !req.admin) {
        // API isteği ise JSON dön
        if (req.originalUrl.startsWith('/api')) {
          return res.status(401).json({
            success: false,
            error: 'Bu işlemi gerçekleştirmek için giriş yapmalısınız'
          });
        }
        
        req.session.returnTo = req.originalUrl;
        req.flash('error_msg', 'Bu sayfaya erişmek için giriş yapmalısınız');
        return res.redirect('/auth/login');
      }
      
      // Admin ise her zaman erişebilir
      if (req.isAdmin) {
        return next();
      }
      
      try {
        // Veri sahibi ID'sini al
        const ownerId = ownerIdExtractor(req);
        
        if (!ownerId) {
          throw new Error('Veri sahibi ID\'si bulunamadı');
        }
        
        // Kullanıcı veri sahibi mi kontrol et
        if (ownerId.toString() !== req.user._id.toString()) {
          throw new Error('Bu veriye erişim yetkiniz bulunmuyor');
        }
        
        next();
      } catch (error) {
        // API isteği ise JSON dön
        if (req.originalUrl.startsWith('/api')) {
          return res.status(403).json({
            success: false,
            error: error.message || 'Bu veriye erişim yetkiniz bulunmuyor'
          });
        }
        
        req.flash('error_msg', error.message || 'Bu veriye erişim yetkiniz bulunmuyor');
        return res.redirect('/home');
      }
    };
  };
  
  module.exports = exports;
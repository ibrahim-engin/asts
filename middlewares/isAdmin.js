/**
 * Admin rolü kontrolü middleware'i
 * Sadece admin rolündeki kullanıcıların erişimine izin verir
 */
exports.isAdmin = (req, res, next) => {
    // Auth middleware'inden geçti mi kontrol et
    if (!req.user && !req.admin) {
      return res.status(401).json({
        success: false,
        error: 'Bu sayfaya erişmek için giriş yapmalısınız'
      });
    }
  
    // Admin kontrolü
    if (!req.isAdmin) {
      if (req.originalUrl.startsWith('/api')) {
        return res.status(403).json({
          success: false,
          error: 'Bu işlemi gerçekleştirmek için yetkiniz yok'
        });
      }
      
      req.flash('error_msg', 'Bu sayfaya erişmek için admin yetkisine sahip olmalısınız');
      return res.redirect('/');
    }
  
    next();
  };
  
  /**
   * Süper admin rolü kontrolü middleware'i
   * Sadece süper admin rolündeki admin kullanıcıların erişimine izin verir
   */
  exports.isSuperAdmin = (req, res, next) => {
    // Auth middleware'inden geçti mi kontrol et
    if (!req.admin) {
      return res.status(401).json({
        success: false,
        error: 'Bu sayfaya erişmek için giriş yapmalısınız'
      });
    }
  
    // Süper admin kontrolü
    if (req.admin.level !== 'super-admin') {
      if (req.originalUrl.startsWith('/api')) {
        return res.status(403).json({
          success: false,
          error: 'Bu işlemi gerçekleştirmek için süper admin yetkisine sahip olmalısınız'
        });
      }
      
      req.flash('error_msg', 'Bu sayfaya erişmek için süper admin yetkisine sahip olmalısınız');
      return res.redirect(`/${process.env.ADMIN_PAGE_URL}/dashboard`);
    }
  
    next();
  };
  
  /**
   * Admin izin kontrolü middleware'i
   * Belirli bir bölüm ve işlem için yetki kontrolü yapar
   * @param {string} section - İzin kontrol edilecek bölüm (users, familyMembers, healthData, vb.)
   * @param {string} action - İzin kontrol edilecek işlem (view, create, edit, delete)
   */
  exports.hasPermission = (section, action) => {
    return (req, res, next) => {
      // Auth middleware'inden geçti mi kontrol et
      if (!req.admin) {
        return res.status(401).json({
          success: false,
          error: 'Bu sayfaya erişmek için giriş yapmalısınız'
        });
      }
  
      // İzin kontrolü
      if (!req.admin.hasPermission(section, action)) {
        if (req.originalUrl.startsWith('/api')) {
          return res.status(403).json({
            success: false,
            error: `Bu işlemi gerçekleştirmek için ${section} bölümünde ${action} yetkisine sahip olmalısınız`
          });
        }
        
        req.flash('error_msg', `Bu işlemi gerçekleştirmek için gerekli yetkiye sahip değilsiniz`);
        return res.redirect(`/${process.env.ADMIN_PAGE_URL}/dashboard`);
      }
  
      next();
    };
  };
  
  /**
   * Admin veya kullanıcı kontrolü middleware'i
   * Admin veya belirli bir kullanıcının kendi verilerine erişimine izin verir
   * @param {Function} userIdExtractor - Request'ten kontrol edilecek kullanıcı ID'sini çıkaran fonksiyon
   */
  exports.isAdminOrSelf = (userIdExtractor) => {
    return (req, res, next) => {
      // Auth middleware'inden geçti mi kontrol et
      if (!req.user && !req.admin) {
        return res.status(401).json({
          success: false,
          error: 'Bu sayfaya erişmek için giriş yapmalısınız'
        });
      }
  
      // Admin ise her zaman izin ver
      if (req.isAdmin) {
        return next();
      }
  
      // Kullanıcının kendi verilerine erişim kontrolü
      const targetUserId = userIdExtractor(req);
      
      if (!targetUserId || targetUserId.toString() !== req.user._id.toString()) {
        if (req.originalUrl.startsWith('/api')) {
          return res.status(403).json({
            success: false,
            error: 'Bu işlemi gerçekleştirmek için yetkiniz yok'
          });
        }
        
        req.flash('error_msg', 'Bu veriye erişim yetkiniz bulunmuyor');
        return res.redirect('/');
      }
  
      next();
    };
  };
  
  /**
   * Admin veya aile üyesi kontrolü middleware'i
   * Admin veya belirli bir kullanıcının kendi ailesine ait verilere erişimine izin verir
   * @param {Function} familyMemberIdExtractor - Request'ten kontrol edilecek aile üyesi ID'sini çıkaran fonksiyon
   */
  exports.isAdminOrFamilyOwner = (familyMemberIdExtractor) => {
    return async (req, res, next) => {
      // Auth middleware'inden geçti mi kontrol et
      if (!req.user && !req.admin) {
        return res.status(401).json({
          success: false,
          error: 'Bu sayfaya erişmek için giriş yapmalısınız'
        });
      }
  
      // Admin ise her zaman izin ver
      if (req.isAdmin) {
        return next();
      }
  
      try {
        // Aile üyesi ID'sini al
        const familyMemberId = familyMemberIdExtractor(req);
        
        if (!familyMemberId) {
          throw new Error('Aile üyesi ID\'si bulunamadı');
        }
  
        // Aile üyesini bul ve kullanıcıya ait mi kontrol et
        const FamilyMember = require('../models/FamilyMember');
        const familyMember = await FamilyMember.findById(familyMemberId);
        
        if (!familyMember) {
          throw new Error('Aile üyesi bulunamadı');
        }
  
        // Kullanıcıya ait mi kontrol et
        if (familyMember.userId.toString() !== req.user._id.toString()) {
          throw new Error('Bu aile üyesine erişim yetkiniz yok');
        }
  
        // Aile üyesi bilgisini request'e ekle (sonraki middleware'ler için)
        req.familyMember = familyMember;
        
        next();
      } catch (error) {
        if (req.originalUrl.startsWith('/api')) {
          return res.status(403).json({
            success: false,
            error: 'Bu veriye erişim yetkiniz bulunmuyor'
          });
        }
        
        req.flash('error_msg', 'Bu veriye erişim yetkiniz bulunmuyor');
        return res.redirect('/');
      }
    };
  };
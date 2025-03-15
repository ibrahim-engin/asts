const User = require('../models/User');
const Admin = require('../models/Admin');
const Settings = require('../models/Settings');
const crypto = require('crypto');
const { logInfo, logError, logWarning } = require('../middlewares/logger');
const bcrypt = require('bcryptjs');
const config = require('../config');
const { sendEmail } = require('../services/emailService');

/**
 * Giriş sayfasını göster
 * @route   GET /auth/login
 * @access  Public
 */
exports.getLogin = (req, res) => {
  res.render('front/login', {
    title: 'Giriş Yap',
    isAdmin: false
  });
};

/**
 * Kullanıcı giriş işlemi
 * @route   POST /auth/login
 * @access  Public
 */
exports.login = async (req, res) => {
  try {
    const { email, password, remember } = req.body;
    
    // Kullanıcıyı e-posta ile bul
    const user = await User.findOne({ email }).select('+password');
    
    if (!user) {
      req.flash('error_msg', 'Geçersiz e-posta veya şifre');
      return res.redirect('/auth/login');
    }
    
    // Kullanıcı aktif değilse
    if (!user.isActive) {
      logWarning('Devre dışı hesaba giriş denemesi', {
        email,
        userId: user._id,
        ip: req.ip
      });
      
      req.flash('error_msg', 'Hesabınız devre dışı bırakılmış. Lütfen yönetici ile iletişime geçin.');
      return res.redirect('/auth/login');
    }
    
    // Şifre kontrolü
    const isMatch = await user.matchPassword(password);
    
    if (!isMatch) {
      logWarning('Başarısız giriş denemesi - Yanlış şifre', {
        email,
        userId: user._id,
        ip: req.ip
      });
      
      req.flash('error_msg', 'Geçersiz e-posta veya şifre');
      return res.redirect('/auth/login');
    }
    
    // Son giriş tarihini güncelle
    user.lastLogin = Date.now();
    await user.save({ validateBeforeSave: false });
    
    // JWT token oluştur
    const token = user.getSignedJwtToken();
    
    // Cookie seçenekleri
    const cookieOptions = { ...config.jwt.cookieOptions };
    
    // "Beni hatırla" seçeneği için cookie süresini uzat
    if (remember) {
      cookieOptions.maxAge = 30 * 24 * 60 * 60 * 1000; // 30 gün
    }
    
    // Token'ı cookie olarak gönder
    res.cookie(config.jwt.cookieName, token, cookieOptions);
    
    // Kullanıcı bilgilerini session'a ekle
    req.session.user = {
      id: user._id,
      name: user.name,
      surname: user.surname,
      email: user.email,
      role: user.role
    };
    
    // Log kaydı
    logInfo('Kullanıcı giriş yaptı', {
      userId: user._id,
      email: user.email,
      ip: req.ip
    });
    
    // Kullanıcı ayarları yoksa oluştur
    const userSettings = await Settings.findOne({ userId: user._id });
    if (!userSettings) {
      await Settings.create({ userId: user._id });
    }
    
    // Yönlendirme
    const redirectUrl = req.session.returnTo || '/home';
    delete req.session.returnTo;
    
    res.redirect(redirectUrl);
  } catch (error) {
    logError(error, req);
    
    req.flash('error_msg', 'Giriş yapılırken bir hata oluştu. Lütfen tekrar deneyin.');
    res.redirect('/auth/login');
  }
};

/**
 * Admin giriş sayfasını göster
 * @route   GET /${process.env.ADMIN_PAGE_URL}/login
 * @access  Public
 */
exports.getAdminLogin = (req, res) => {
  res.render('admin/login', {
    title: 'Admin Girişi',
    isAdmin: true
  });
};

/**
 * Admin giriş işlemi
 * @route   POST /${process.env.ADMIN_PAGE_URL}/login
 * @access  Public
 */
exports.adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Admini e-posta ile bul
    const admin = await Admin.findOne({ email }).select('+password');
    
    if (!admin) {
      req.flash('error_msg', 'Geçersiz e-posta veya şifre');
      return res.redirect(`/${process.env.ADMIN_PAGE_URL}/login`);
    }
    
    // Admin aktif değilse
    if (!admin.isActive) {
      logWarning('Devre dışı admin hesabına giriş denemesi', {
        email,
        adminId: admin._id,
        ip: req.ip
      });
      
      req.flash('error_msg', 'Hesabınız devre dışı bırakılmış. Lütfen süper admin ile iletişime geçin.');
      return res.redirect(`/${process.env.ADMIN_PAGE_URL}/login`);
    }
    
    // Şifre kontrolü
    const isMatch = await admin.matchPassword(password);
    
    if (!isMatch) {
      logWarning('Başarısız admin giriş denemesi - Yanlış şifre', {
        email,
        adminId: admin._id,
        ip: req.ip
      });
      
      req.flash('error_msg', 'Geçersiz e-posta veya şifre');
      return res.redirect(`/${process.env.ADMIN_PAGE_URL}/login`);
    }
    
    // Giriş kaydı ekle
    await admin.addLoginRecord(req.ip, req.get('User-Agent'));
    
    // JWT token oluştur
    const token = admin.getSignedJwtToken();
    
    // Token'ı cookie olarak gönder
    res.cookie(config.jwt.cookieName, token, config.jwt.cookieOptions);
    
    // Admin bilgilerini session'a ekle
    req.session.admin = {
      id: admin._id,
      name: admin.name,
      surname: admin.surname,
      email: admin.email,
      level: admin.level
    };
    
    // Log kaydı
    logInfo('Admin giriş yaptı', {
      adminId: admin._id,
      email: admin.email,
      level: admin.level,
      ip: req.ip
    });
    
    // Admin paneline yönlendir
    res.redirect(`/${process.env.ADMIN_PAGE_URL}/dashboard`);
  } catch (error) {
    logError(error, req);
    
    req.flash('error_msg', 'Giriş yapılırken bir hata oluştu. Lütfen tekrar deneyin.');
    res.redirect(`/${process.env.ADMIN_PAGE_URL}/login`);
  }
};

/**
 * Kayıt sayfasını göster
 * @route   GET /auth/register
 * @access  Public
 */
exports.getRegister = (req, res) => {
  res.render('front/register', {
    title: 'Kayıt Ol'
  });
};

/**
 * Kullanıcı kayıt işlemi
 * @route   POST /auth/register
 * @access  Public
 */
exports.register = async (req, res) => {
  try {
    const { name, surname, email, password, passwordConfirm, phone } = req.body;
    
    // Şifre kontrolü
    if (password !== passwordConfirm) {
      req.flash('error_msg', 'Şifreler eşleşmiyor');
      return res.redirect('/auth/register');
    }
    
    // E-posta kullanımda mı kontrol et
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      req.flash('error_msg', 'Bu e-posta adresi zaten kullanılıyor');
      return res.redirect('/auth/register');
    }
    
    // Yeni kullanıcı oluştur
    const user = await User.create({
      name,
      surname,
      email,
      password,
      phone
    });
    
    // Kullanıcı ayarlarını oluştur
    await Settings.create({ userId: user._id });
    
    // Log kaydı
    logInfo('Yeni kullanıcı kaydı', {
      userId: user._id,
      email: user.email,
      ip: req.ip
    });
    
    // Başarılı kayıt mesajı
    req.flash('success_msg', 'Başarıyla kayıt oldunuz. Şimdi giriş yapabilirsiniz.');
    res.redirect('/auth/login');
  } catch (error) {
    logError(error, req);
    
    // Validation hatası
    if (error.name === 'ValidationError') {
      req.flash('error_msg', Object.values(error.errors)[0].message);
      return res.redirect('/auth/register');
    }
    
    // Duplicate key hatası
    if (error.code === 11000) {
      req.flash('error_msg', 'Bu e-posta adresi başka bir kullanıcı tarafından kullanılıyor');
      return res.redirect('/auth/register');
    }
    
    req.flash('error_msg', 'Kayıt olurken bir hata oluştu. Lütfen tekrar deneyin.');
    res.redirect('/auth/register');
  }
};

/**
 * Çıkış işlemi
 * @route   GET /auth/logout
 * @access  Private
 */
exports.logout = (req, res) => {
  // Cookie'yi temizle
  res.clearCookie(config.jwt.cookieName);
  
  // Session'ı temizle
  req.session.destroy();
  
  // Ana sayfaya yönlendir
  res.redirect('/');
};

/**
 * Şifremi unuttum sayfasını göster
 * @route   GET /auth/forgot-password
 * @access  Public
 */
exports.getForgotPassword = (req, res) => {
  res.render('front/forgot-password', {
    title: 'Şifremi Unuttum'
  });
};

/**
 * Şifre sıfırlama e-postası gönder
 * @route   POST /auth/forgot-password
 * @access  Public
 */
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    
    // Kullanıcıyı e-posta ile bul
    const user = await User.findOne({ email });
    
    if (!user) {
      // Güvenlik için kullanıcı bulunamasa bile başarılı mesajı göster
      req.flash('success_msg', 'Şifre sıfırlama bağlantısı e-posta adresinize gönderildi');
      return res.redirect('/auth/login');
    }
    
    // Kullanıcı aktif değilse
    if (!user.isActive) {
      req.flash('error_msg', 'Hesabınız devre dışı bırakılmış. Lütfen yönetici ile iletişime geçin.');
      return res.redirect('/auth/forgot-password');
    }
    
    // Şifre sıfırlama tokeni oluştur
    const resetToken = crypto.randomBytes(20).toString('hex');
    
    // Token'ı hashle ve kullanıcıya kaydet
    user.resetPasswordToken = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');
    
    // Token'ın son kullanma tarihini 10 dakika olarak ayarla
    user.resetPasswordExpire = Date.now() + 10 * 60 * 1000;
    
    await user.save({ validateBeforeSave: false });
    
    // Şifre sıfırlama URL'i oluştur
    const resetUrl = `${req.protocol}://${req.get('host')}/auth/reset-password/${resetToken}`;
    
    // E-posta içeriği
    const message = `
      <h1>Şifre Sıfırlama İsteği</h1>
      <p>Merhaba ${user.name},</p>
      <p>Şifrenizi sıfırlamak için aşağıdaki bağlantıya tıklayın:</p>
      <a href="${resetUrl}" style="display: inline-block; background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Şifremi Sıfırla</a>
      <p>Bu bağlantı 10 dakika içinde geçerliliğini yitirecektir.</p>
      <p>Eğer bu isteği siz yapmadıysanız, lütfen bu e-postayı dikkate almayınız.</p>
      <p>Saygılarımızla,<br/>ASTS Ekibi</p>
    `;
    
    // E-posta gönder
    await sendEmail({
      to: user.email,
      subject: 'ASTS - Şifre Sıfırlama İsteği',
      html: message
    });
    
    // Log kaydı
    logInfo('Şifre sıfırlama e-postası gönderildi', {
      userId: user._id,
      email: user.email,
      ip: req.ip
    });
    
    req.flash('success_msg', 'Şifre sıfırlama bağlantısı e-posta adresinize gönderildi');
    res.redirect('/auth/login');
  } catch (error) {
    logError(error, req);
    
    // Şifre sıfırlama tokenlerini temizle
    const user = await User.findOne({ email: req.body.email });
    if (user) {
      user.resetPasswordToken = undefined;
      user.resetPasswordExpire = undefined;
      await user.save({ validateBeforeSave: false });
    }
    
    req.flash('error_msg', 'Şifre sıfırlama e-postası gönderilirken bir hata oluştu. Lütfen tekrar deneyin.');
    res.redirect('/auth/forgot-password');
  }
};

/**
 * Şifre sıfırlama sayfasını göster
 * @route   GET /auth/reset-password/:token
 * @access  Public
 */
exports.getResetPassword = async (req, res) => {
  try {
    // Token'ı al ve hashle
    const resetToken = req.params.token;
    const resetPasswordToken = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');
    
    // Token'ı kontrol et
    const user = await User.findOne({
      resetPasswordToken,
      resetPasswordExpire: { $gt: Date.now() }
    });
    
    if (!user) {
      req.flash('error_msg', 'Geçersiz veya süresi dolmuş şifre sıfırlama bağlantısı');
      return res.redirect('/auth/forgot-password');
    }
    
    // Şifre sıfırlama sayfasını göster
    res.render('front/reset-password', {
      title: 'Şifre Sıfırlama',
      token: resetToken
    });
  } catch (error) {
    logError(error, req);
    
    req.flash('error_msg', 'Şifre sıfırlama sayfası yüklenirken bir hata oluştu');
    res.redirect('/auth/forgot-password');
  }
};

/**
 * Şifre sıfırlama işlemi
 * @route   POST /auth/reset-password/:token
 * @access  Public
 */
exports.resetPassword = async (req, res) => {
  try {
    // Token'ı al ve hashle
    const resetToken = req.params.token;
    const resetPasswordToken = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');
    
    // Şifre alanlarını al
    const { password, passwordConfirm } = req.body;
    
    // Şifre kontrolü
    if (password !== passwordConfirm) {
      req.flash('error_msg', 'Şifreler eşleşmiyor');
      return res.redirect(`/auth/reset-password/${resetToken}`);
    }
    
    // Token'ı kontrol et
    const user = await User.findOne({
      resetPasswordToken,
      resetPasswordExpire: { $gt: Date.now() }
    });
    
    if (!user) {
      req.flash('error_msg', 'Geçersiz veya süresi dolmuş şifre sıfırlama bağlantısı');
      return res.redirect('/auth/forgot-password');
    }
    
    // Yeni şifreyi ayarla
    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    
    await user.save();
    
    // Log kaydı
    logInfo('Kullanıcı şifresini sıfırladı', {
      userId: user._id,
      email: user.email,
      ip: req.ip
    });
    
    req.flash('success_msg', 'Şifreniz başarıyla sıfırlandı. Şimdi giriş yapabilirsiniz.');
    res.redirect('/auth/login');
  } catch (error) {
    logError(error, req);
    
    req.flash('error_msg', 'Şifre sıfırlanırken bir hata oluştu. Lütfen tekrar deneyin.');
    res.redirect(`/auth/reset-password/${req.params.token}`);
  }
};

/**
 * Admin şifremi unuttum sayfasını göster
 * @route   GET /${process.env.ADMIN_PAGE_URL}/forgot-password
 * @access  Public
 */
exports.getAdminForgotPassword = (req, res) => {
  res.render('admin/forgot-password', {
    title: 'Admin Şifre Sıfırlama'
  });
};

/**
 * Admin şifre sıfırlama e-postası gönder
 * @route   POST /${process.env.ADMIN_PAGE_URL}/forgot-password
 * @access  Public
 */
exports.adminForgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    
    // Admini e-posta ile bul
    const admin = await Admin.findOne({ email });
    
    if (!admin) {
      // Güvenlik için admin bulunamasa bile başarılı mesajı göster
      req.flash('success_msg', 'Şifre sıfırlama bağlantısı e-posta adresinize gönderildi');
      return res.redirect(`/${process.env.ADMIN_PAGE_URL}/login`);
    }
    
    // Admin aktif değilse
    if (!admin.isActive) {
      req.flash('error_msg', 'Hesabınız devre dışı bırakılmış. Lütfen süper admin ile iletişime geçin.');
      return res.redirect(`/${process.env.ADMIN_PAGE_URL}/forgot-password`);
    }
    
    // Şifre sıfırlama tokeni oluştur
    const resetToken = crypto.randomBytes(32).toString('hex');
    
    // Token'ı hashle ve admine kaydet
    admin.resetPasswordToken = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');
    
    // Token'ın son kullanma tarihini 30 dakika olarak ayarla
    admin.resetPasswordExpire = Date.now() + 30 * 60 * 1000;
    
    await admin.save({ validateBeforeSave: false });
    
    // Şifre sıfırlama URL'i oluştur
    const resetUrl = `${req.protocol}://${req.get('host')}/${process.env.ADMIN_PAGE_URL}/reset-password/${resetToken}`;
    
    // E-posta içeriği
    const message = `
      <h1>Admin Şifre Sıfırlama İsteği</h1>
      <p>Merhaba ${admin.name},</p>
      <p>Admin hesabınızın şifresini sıfırlamak için aşağıdaki bağlantıya tıklayın:</p>
      <a href="${resetUrl}" style="display: inline-block; background-color: #3498db; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Şifremi Sıfırla</a>
      <p>Bu bağlantı 30 dakika içinde geçerliliğini yitirecektir.</p>
      <p>Eğer bu isteği siz yapmadıysanız, lütfen bu e-postayı dikkate almayınız ve sistem yöneticisine bildiriniz.</p>
      <p>Saygılarımızla,<br/>ASTS Ekibi</p>
    `;
    
    // E-posta gönder
    await sendEmail({
      to: admin.email,
      subject: 'ASTS - Admin Şifre Sıfırlama İsteği',
      html: message
    });
    
    // Log kaydı
    logInfo('Admin şifre sıfırlama e-postası gönderildi', {
      adminId: admin._id,
      email: admin.email,
      ip: req.ip
    });
    
    req.flash('success_msg', 'Şifre sıfırlama bağlantısı e-posta adresinize gönderildi');
    res.redirect(`/${process.env.ADMIN_PAGE_URL}/login`);
  } catch (error) {
    logError(error, req);
    
    // Şifre sıfırlama tokenlerini temizle
    const admin = await Admin.findOne({ email: req.body.email });
    if (admin) {
      admin.resetPasswordToken = undefined;
      admin.resetPasswordExpire = undefined;
      await admin.save({ validateBeforeSave: false });
    }
    
    req.flash('error_msg', 'Şifre sıfırlama e-postası gönderilirken bir hata oluştu. Lütfen tekrar deneyin.');
    res.redirect(`/${process.env.ADMIN_PAGE_URL}/forgot-password`);
  }
};

/**
 * Admin şifre sıfırlama sayfasını göster
 * @route   GET /${process.env.ADMIN_PAGE_URL}/reset-password/:token
 * @access  Public
 */
exports.getAdminResetPassword = async (req, res) => {
  try {
    // Token'ı al ve hashle
    const resetToken = req.params.token;
    const resetPasswordToken = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');
    
    // Token'ı kontrol et
    const admin = await Admin.findOne({
      resetPasswordToken,
      resetPasswordExpire: { $gt: Date.now() }
    });
    
    if (!admin) {
      req.flash('error_msg', 'Geçersiz veya süresi dolmuş şifre sıfırlama bağlantısı');
      return res.redirect(`/${process.env.ADMIN_PAGE_URL}/forgot-password`);
    }
    
    // Şifre sıfırlama sayfasını göster
    res.render('admin/reset-password', {
      title: 'Admin Şifre Sıfırlama',
      token: resetToken
    });
  } catch (error) {
    logError(error, req);
    
    req.flash('error_msg', 'Şifre sıfırlama sayfası yüklenirken bir hata oluştu');
    res.redirect(`/${process.env.ADMIN_PAGE_URL}/forgot-password`);
  }
};

/**
 * Admin şifre sıfırlama işlemi
 * @route   POST /${process.env.ADMIN_PAGE_URL}/reset-password/:token
 * @access  Public
 */
exports.adminResetPassword = async (req, res) => {
  try {
    // Token'ı al ve hashle
    const resetToken = req.params.token;
    const resetPasswordToken = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');
    
    // Şifre alanlarını al
    const { password, passwordConfirm } = req.body;
    
    // Şifre kontrolü
    if (password !== passwordConfirm) {
      req.flash('error_msg', 'Şifreler eşleşmiyor');
      return res.redirect(`/${process.env.ADMIN_PAGE_URL}/reset-password/${resetToken}`);
    }
    
    // Şifre uzunluğu kontrolü
    if (password.length < 8) {
      req.flash('error_msg', 'Şifre en az 8 karakter olmalıdır');
      return res.redirect(`/${process.env.ADMIN_PAGE_URL}/reset-password/${resetToken}`);
    }
    
    // Token'ı kontrol et
    const admin = await Admin.findOne({
      resetPasswordToken,
      resetPasswordExpire: { $gt: Date.now() }
    });
    
    if (!admin) {
      req.flash('error_msg', 'Geçersiz veya süresi dolmuş şifre sıfırlama bağlantısı');
      return res.redirect(`/${process.env.ADMIN_PAGE_URL}/forgot-password`);
    }
    
    // Yeni şifreyi ayarla
    admin.password = password;
    admin.resetPasswordToken = undefined;
    admin.resetPasswordExpire = undefined;
    
    await admin.save();
    
    // Log kaydı
    logInfo('Admin şifresini sıfırladı', {
      adminId: admin._id,
      email: admin.email,
      ip: req.ip
    });
    
    req.flash('success_msg', 'Şifreniz başarıyla sıfırlandı. Şimdi giriş yapabilirsiniz.');
    res.redirect(`/${process.env.ADMIN_PAGE_URL}/login`);
  } catch (error) {
    logError(error, req);
    
    req.flash('error_msg', 'Şifre sıfırlanırken bir hata oluştu. Lütfen tekrar deneyin.');
    res.redirect(`/${process.env.ADMIN_PAGE_URL}/reset-password/${req.params.token}`);
  }
};

/**
 * API Kullanıcı giriş işlemi
 * @route   POST /api/auth/login
 * @access  Public
 */
exports.apiLogin = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // E-posta ve şifre kontrolü
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Lütfen e-posta ve şifre giriniz'
      });
    }
    
    // Kullanıcıyı e-posta ile bul
    const user = await User.findOne({ email }).select('+password');
    
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Geçersiz kimlik bilgileri'
      });
    }
    
    // Kullanıcı aktif değilse
    if (!user.isActive) {
      logWarning('Devre dışı hesaba API giriş denemesi', {
        email,
        userId: user._id,
        ip: req.ip
      });
      
      return res.status(401).json({
        success: false,
        error: 'Hesabınız devre dışı bırakılmış'
      });
    }
    
    // Şifre kontrolü
    const isMatch = await user.matchPassword(password);
    
    if (!isMatch) {
      logWarning('Başarısız API giriş denemesi - Yanlış şifre', {
        email,
        userId: user._id,
        ip: req.ip
      });
      
      return res.status(401).json({
        success: false,
        error: 'Geçersiz kimlik bilgileri'
      });
    }
    
    // Son giriş tarihini güncelle
    user.lastLogin = Date.now();
    await user.save({ validateBeforeSave: false });
    
    // JWT token oluştur
    const token = user.getSignedJwtToken();
    
    // Log kaydı
    logInfo('API kullanıcı giriş yaptı', {
      userId: user._id,
      email: user.email,
      ip: req.ip
    });
    
    res.status(200).json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        surname: user.surname,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    logError(error, req);
    
    res.status(500).json({
      success: false,
      error: 'Sunucu hatası'
    });
  }
};

/**
 * API Admin giriş işlemi
 * @route   POST /api/${process.env.ADMIN_PAGE_URL}/login
 * @access  Public
 */
exports.apiAdminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // E-posta ve şifre kontrolü
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Lütfen e-posta ve şifre giriniz'
      });
    }
    
    // Admini e-posta ile bul
    const admin = await Admin.findOne({ email }).select('+password');
    
    if (!admin) {
      return res.status(401).json({
        success: false,
        error: 'Geçersiz kimlik bilgileri'
      });
    }
    
    // Admin aktif değilse
    if (!admin.isActive) {
      logWarning('Devre dışı admin hesabına API giriş denemesi', {
        email,
        adminId: admin._id,
        ip: req.ip
      });
      
      return res.status(401).json({
        success: false,
        error: 'Hesabınız devre dışı bırakılmış'
      });
    }
    
    // Şifre kontrolü
    const isMatch = await admin.matchPassword(password);
    
    if (!isMatch) {
      logWarning('Başarısız admin API giriş denemesi - Yanlış şifre', {
        email,
        adminId: admin._id,
        ip: req.ip
      });
      
      return res.status(401).json({
        success: false,
        error: 'Geçersiz kimlik bilgileri'
      });
    }
    
    // Giriş kaydı ekle
    await admin.addLoginRecord(req.ip, req.get('User-Agent'));
    
    // JWT token oluştur
    const token = admin.getSignedJwtToken();
    
    // Log kaydı
    logInfo('API admin giriş yaptı', {
      adminId: admin._id,
      email: admin.email,
      level: admin.level,
      ip: req.ip
    });
    
    res.status(200).json({
      success: true,
      token,
      admin: {
        id: admin._id,
        name: admin.name,
        surname: admin.surname,
        email: admin.email,
        level: admin.level
      }
    });
  } catch (error) {
    logError(error, req);
    
    res.status(500).json({
      success: false,
      error: 'Sunucu hatası'
    });
  }
};

/**
 * Mevcut kullanıcı bilgilerini getir (API)
 * @route   GET /api/auth/me
 * @access  Private
 */
exports.getMe = async (req, res) => {
  try {
    let user;
    
    if (req.user) {
      user = {
        id: req.user._id,
        name: req.user.name,
        surname: req.user.surname,
        email: req.user.email,
        role: req.user.role,
        avatar: req.user.avatar,
        isAdmin: false
      };
    } else if (req.admin) {
      user = {
        id: req.admin._id,
        name: req.admin.name,
        surname: req.admin.surname,
        email: req.admin.email,
        level: req.admin.level,
        avatar: req.admin.avatar,
        isAdmin: true
      };
    } else {
      return res.status(401).json({
        success: false,
        error: 'Kimlik doğrulama gerekli'
      });
    }
    
    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    logError(error, req);
    
    res.status(500).json({
      success: false,
      error: 'Sunucu hatası'
    });
  }
};

module.exports = exports;
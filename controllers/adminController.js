const Admin = require('../models/Admin');
const User = require('../models/User');
const FamilyMember = require('../models/FamilyMember');
const HealthData = require('../models/HealthData');
const Settings = require('../models/Settings');
const Report = require('../models/Report');
const { logInfo, logError } = require('../middlewares/logger');
const mongoose = require('mongoose');

/**
 * Admin panel ana sayfa
 * @route   GET /${process.env.ADMIN_PAGE_URL}/dashboard
 * @access  Private (Admin Only)
 */
exports.getDashboard = async (req, res) => {
  try {
    // İstatistikler için kullanılacak veriler
    const totalUsers = await User.countDocuments();
    const totalFamilyMembers = await FamilyMember.countDocuments();
    const totalActiveUsers = await User.countDocuments({ isActive: true });
    const totalHealthData = await HealthData.countDocuments();
    
    // Son katılan 5 kullanıcı
    const recentUsers = await User.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .select('name surname email createdAt lastLogin');
    
    // Son eklenen sağlık verileri
    const recentHealthData = await HealthData.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('familyMemberId', 'name surname relationship')
      .select('familyMemberId dataType measuredAt status');
    
    // Kritik sağlık verileri
    const criticalHealthData = await HealthData.find({ status: 'critical' })
      .sort({ measuredAt: -1 })
      .limit(5)
      .populate('familyMemberId', 'name surname relationship')
      .select('familyMemberId dataType measuredAt status');
    
    // Geçtiğimiz ay kayıt olan kullanıcı sayısı
    const lastMonth = new Date();
    lastMonth.setMonth(lastMonth.getMonth() - 1);
    
    const newUsersLastMonth = await User.countDocuments({
      createdAt: { $gte: lastMonth }
    });
    
    // Bugün eklenen toplam veri sayısı
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const todayHealthData = await HealthData.countDocuments({
      createdAt: { $gte: today }
    });
    
    // Admin panelini render et
    res.render('admin/dashboard', {
      title: 'Admin Paneli',
      stats: {
        totalUsers,
        totalFamilyMembers,
        totalActiveUsers,
        totalHealthData,
        newUsersLastMonth,
        todayHealthData
      },
      recentUsers,
      recentHealthData,
      criticalHealthData
    });
  } catch (error) {
    logError(error, req);
    
    res.status(500).render('500', {
      title: 'Sunucu Hatası',
      message: 'Dashboard verileri alınırken bir hata oluştu',
      error: process.env.NODE_ENV === 'development' ? error : {}
    });
  }
};

/**
 * Kullanıcılar sayfası
 * @route   GET /${process.env.ADMIN_PAGE_URL}/users
 * @access  Private (Admin Only)
 */
exports.getUsers = async (req, res) => {
  try {
    // Sayfalama parametreleri
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    
    // Filtreleme parametreleri
    const filter = {};
    
    if (req.query.search) {
      filter.$or = [
        { name: { $regex: req.query.search, $options: 'i' } },
        { surname: { $regex: req.query.search, $options: 'i' } },
        { email: { $regex: req.query.search, $options: 'i' } }
      ];
    }
    
    if (req.query.isActive) {
      filter.isActive = req.query.isActive === 'true';
    }
    
    // Toplam kayıt sayısı
    const total = await User.countDocuments(filter);
    
    // Kullanıcıları getir
    const users = await User.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .select('name surname email isActive lastLogin createdAt');
    
    // Sayfalama bilgilerini hazırla
    const totalPages = Math.ceil(total / limit);
    const pagination = {
      currentPage: page,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
      nextPage: page < totalPages ? page + 1 : null,
      prevPage: page > 1 ? page - 1 : null
    };
    
    // Admin kullanıcılar sayfasını render et
    res.render('admin/users', {
      title: 'Kullanıcı Yönetimi',
      users,
      pagination,
      filter: req.query,
      total
    });
  } catch (error) {
    logError(error, req);
    
    res.status(500).render('500', {
      title: 'Sunucu Hatası',
      message: 'Kullanıcı verileri alınırken bir hata oluştu',
      error: process.env.NODE_ENV === 'development' ? error : {}
    });
  }
};

/**
 * Kullanıcı detay sayfası
 * @route   GET /${process.env.ADMIN_PAGE_URL}/users/:id
 * @access  Private (Admin Only)
 */
exports.getUserDetail = async (req, res) => {
  try {
    const userId = req.params.id;
    
    // Kullanıcı bilgisini getir
    const user = await User.findById(userId).select('-password');
    
    if (!user) {
      req.flash('error_msg', 'Kullanıcı bulunamadı');
      return res.redirect(`/${process.env.ADMIN_PAGE_URL}/users`);
    }
    
    // Kullanıcıya ait aile üyelerini getir
    const familyMembers = await FamilyMember.find({ userId })
      .sort({ name: 1 })
      .select('name surname relationship dateOfBirth gender isActive');
    
    // Kullanıcıya ait istatistikler
    const totalHealthData = await HealthData.countDocuments({
      familyMemberId: { $in: familyMembers.map(member => member._id) }
    });
    
    const lastLogin = user.lastLogin ? new Date(user.lastLogin).toLocaleString('tr-TR') : 'Hiç giriş yapmadı';
    
    // Kullanıcı ayarlarını getir
    const settings = await Settings.findOne({ userId });
    
    // Admin kullanıcı detay sayfasını render et
    res.render('admin/user-detail', {
      title: `${user.name} ${user.surname} - Kullanıcı Detayı`,
      user,
      familyMembers,
      stats: {
        totalFamilyMembers: familyMembers.length,
        totalHealthData,
        lastLogin
      },
      settings
    });
  } catch (error) {
    logError(error, req);
    
    if (error.name === 'CastError') {
      req.flash('error_msg', 'Geçersiz kullanıcı ID formatı');
      return res.redirect(`/${process.env.ADMIN_PAGE_URL}/users`);
    }
    
    res.status(500).render('500', {
      title: 'Sunucu Hatası',
      message: 'Kullanıcı detayları alınırken bir hata oluştu',
      error: process.env.NODE_ENV === 'development' ? error : {}
    });
  }
};

/**
 * Kullanıcı düzenleme sayfası
 * @route   GET /${process.env.ADMIN_PAGE_URL}/users/:id/edit
 * @access  Private (Admin Only)
 */
exports.getEditUser = async (req, res) => {
  try {
    const userId = req.params.id;
    
    // Kullanıcı bilgisini getir
    const user = await User.findById(userId).select('-password');
    
    if (!user) {
      req.flash('error_msg', 'Kullanıcı bulunamadı');
      return res.redirect(`/${process.env.ADMIN_PAGE_URL}/users`);
    }
    
    // Admin kullanıcı düzenleme sayfasını render et
    res.render('admin/edit-user', {
      title: `${user.name} ${user.surname} - Kullanıcı Düzenleme`,
      user
    });
  } catch (error) {
    logError(error, req);
    
    if (error.name === 'CastError') {
      req.flash('error_msg', 'Geçersiz kullanıcı ID formatı');
      return res.redirect(`/${process.env.ADMIN_PAGE_URL}/users`);
    }
    
    res.status(500).render('500', {
      title: 'Sunucu Hatası',
      message: 'Kullanıcı bilgileri alınırken bir hata oluştu',
      error: process.env.NODE_ENV === 'development' ? error : {}
    });
  }
};

/**
 * Kullanıcı güncelleme
 * @route   POST /${process.env.ADMIN_PAGE_URL}/users/:id
 * @access  Private (Admin Only)
 */
exports.updateUser = async (req, res) => {
  try {
    const userId = req.params.id;
    
    // Güncellenecek alanlar
    const { name, surname, email, phone, isActive } = req.body;
    
    // Kullanıcıyı bul ve güncelle
    const user = await User.findByIdAndUpdate(
      userId,
      {
        name,
        surname,
        email,
        phone,
        isActive: isActive === 'on'
      },
      { new: true, runValidators: true }
    );
    
    if (!user) {
      req.flash('error_msg', 'Kullanıcı bulunamadı');
      return res.redirect(`/${process.env.ADMIN_PAGE_URL}/users`);
    }
    
    // Başarılı güncelleme mesajı
    req.flash('success_msg', 'Kullanıcı bilgileri başarıyla güncellendi');
    
    // Log kaydı
    logInfo('Kullanıcı güncellendi', {
      adminId: req.admin._id,
      userId: user._id,
      changedFields: ['name', 'surname', 'email', 'phone', 'isActive']
    });
    
    // Kullanıcı detay sayfasına yönlendir
    res.redirect(`/${process.env.ADMIN_PAGE_URL}/users/${userId}`);
  } catch (error) {
    logError(error, req);
    
    if (error.name === 'CastError') {
      req.flash('error_msg', 'Geçersiz kullanıcı ID formatı');
      return res.redirect(`/${process.env.ADMIN_PAGE_URL}/users`);
    }
    
    // Validation hatası
    if (error.name === 'ValidationError') {
      req.flash('error_msg', Object.values(error.errors)[0].message);
      return res.redirect(`/${process.env.ADMIN_PAGE_URL}/users/${req.params.id}/edit`);
    }
    
    req.flash('error_msg', 'Kullanıcı güncellenirken bir hata oluştu');
    res.redirect(`/${process.env.ADMIN_PAGE_URL}/users/${req.params.id}/edit`);
  }
};

/**
 * Kullanıcı aktif/pasif durumunu değiştirme
 * @route   PATCH /${process.env.ADMIN_PAGE_URL}/users/:id/status
 * @access  Private (Admin Only)
 */
exports.toggleUserStatus = async (req, res) => {
  try {
    const userId = req.params.id;
    
    // Kullanıcıyı bul
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Kullanıcı bulunamadı'
      });
    }
    
    // Durumu değiştir
    user.isActive = !user.isActive;
    await user.save();
    
    // Log kaydı
    logInfo(`Kullanıcı durumu ${user.isActive ? 'aktif' : 'pasif'} olarak değiştirildi`, {
      adminId: req.admin._id,
      userId: user._id
    });
    
    // Başarılı yanıt
    res.json({
      success: true,
      data: {
        id: user._id,
        isActive: user.isActive
      }
    });
  } catch (error) {
    logError(error, req);
    
    res.status(500).json({
      success: false,
      error: 'Kullanıcı durumu değiştirilirken bir hata oluştu'
    });
  }
};

/**
 * Kullanıcı silme
 * @route   DELETE /${process.env.ADMIN_PAGE_URL}/users/:id
 * @access  Private (Admin Only)
 */
exports.deleteUser = async (req, res) => {
  try {
    const userId = req.params.id;
    
    // MongoDB Transaction başlat
    const session = await mongoose.startSession();
    session.startTransaction();
    
    try {
      // Kullanıcıyı bul
      const user = await User.findById(userId).session(session);
      
      if (!user) {
        await session.abortTransaction();
        session.endSession();
        
        return res.status(404).json({
          success: false,
          error: 'Kullanıcı bulunamadı'
        });
      }
      
      // Kullanıcının aile üyelerini bul
      const familyMembers = await FamilyMember.find({ userId }).session(session);
      const familyMemberIds = familyMembers.map(member => member._id);
      
      // Aile üyelerine ait verileri sil
      await HealthData.deleteMany({ familyMemberId: { $in: familyMemberIds } }).session(session);
      
      // Kullanıcının raporlarını sil
      await Report.deleteMany({ familyMemberId: { $in: familyMemberIds } }).session(session);
      
      // Kullanıcının aile üyelerini sil
      await FamilyMember.deleteMany({ userId }).session(session);
      
      // Kullanıcının ayarlarını sil
      await Settings.deleteOne({ userId }).session(session);
      
      // Kullanıcıyı sil
      await User.findByIdAndDelete(userId).session(session);
      
      // Transaction'ı tamamla
      await session.commitTransaction();
      session.endSession();
      
      // Log kaydı
      logInfo('Kullanıcı silindi', {
        adminId: req.admin._id,
        userId,
        deletedFamilyMembers: familyMemberIds.length
      });
      
      // Başarılı yanıt
      res.json({
        success: true,
        message: 'Kullanıcı ve ilişkili tüm veriler başarıyla silindi'
      });
    } catch (error) {
      // Hata durumunda transaction'ı geri al
      await session.abortTransaction();
      session.endSession();
      
      throw error;
    }
  } catch (error) {
    logError(error, req);
    
    res.status(500).json({
      success: false,
      error: 'Kullanıcı silinirken bir hata oluştu'
    });
  }
};

/**
 * Aile üyeleri yönetim sayfası
 * @route   GET /${process.env.ADMIN_PAGE_URL}/family-members
 * @access  Private (Admin Only)
 */
exports.getFamilyMembers = async (req, res) => {
  try {
    // Sayfalama parametreleri
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    
    // Filtreleme parametreleri
    const filter = {};
    
    if (req.query.search) {
      filter.$or = [
        { name: { $regex: req.query.search, $options: 'i' } },
        { surname: { $regex: req.query.search, $options: 'i' } }
      ];
    }
    
    if (req.query.userId) {
      filter.userId = req.query.userId;
    }
    
    if (req.query.isActive) {
      filter.isActive = req.query.isActive === 'true';
    }
    
    // Toplam kayıt sayısı
    const total = await FamilyMember.countDocuments(filter);
    
    // Aile üyelerini getir
    const familyMembers = await FamilyMember.find(filter)
      .populate('userId', 'name surname email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
    
    // Sayfalama bilgilerini hazırla
    const totalPages = Math.ceil(total / limit);
    const pagination = {
      currentPage: page,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
      nextPage: page < totalPages ? page + 1 : null,
      prevPage: page > 1 ? page - 1 : null
    };
    
    // Aktif kullanıcıları getir (dropdown için)
    const users = await User.find({ isActive: true })
      .sort({ name: 1 })
      .select('name surname email');
    
    // Admin aile üyeleri sayfasını render et
    res.render('admin/family-members', {
      title: 'Aile Üyeleri Yönetimi',
      familyMembers,
      pagination,
      filter: req.query,
      total,
      users
    });
  } catch (error) {
    logError(error, req);
    
    res.status(500).render('500', {
      title: 'Sunucu Hatası',
      message: 'Aile üyeleri verileri alınırken bir hata oluştu',
      error: process.env.NODE_ENV === 'development' ? error : {}
    });
  }
};

/**
 * Aile üyesi detay sayfası
 * @route   GET /${process.env.ADMIN_PAGE_URL}/family-members/:id
 * @access  Private (Admin Only)
 */
exports.getFamilyMemberDetail = async (req, res) => {
  try {
    const memberId = req.params.id;
    
    // Aile üyesi bilgisini getir
    const familyMember = await FamilyMember.findById(memberId)
      .populate('userId', 'name surname email');
    
    if (!familyMember) {
      req.flash('error_msg', 'Aile üyesi bulunamadı');
      return res.redirect(`/${process.env.ADMIN_PAGE_URL}/family-members`);
    }
    
    // Aile üyesine ait sağlık verilerini getir
    const healthData = await HealthData.find({ familyMemberId: memberId })
      .sort({ measuredAt: -1 })
      .limit(10);
    
    // Raporları getir
    const reports = await Report.find({ familyMemberId: memberId })
      .sort({ createdAt: -1 })
      .limit(5);
    
    // Admin aile üyesi detay sayfasını render et
    res.render('admin/family-member-detail', {
      title: `${familyMember.name} ${familyMember.surname} - Aile Üyesi Detayı`,
      familyMember,
      healthData,
      reports
    });
  } catch (error) {
    logError(error, req);
    
    if (error.name === 'CastError') {
      req.flash('error_msg', 'Geçersiz aile üyesi ID formatı');
      return res.redirect(`/${process.env.ADMIN_PAGE_URL}/family-members`);
    }
    
    res.status(500).render('500', {
      title: 'Sunucu Hatası',
      message: 'Aile üyesi detayları alınırken bir hata oluştu',
      error: process.env.NODE_ENV === 'development' ? error : {}
    });
  }
};

/**
 * Admin ayarları sayfası
 * @route   GET /${process.env.ADMIN_PAGE_URL}/settings
 * @access  Private (Admin Only)
 */
exports.getSettings = async (req, res) => {
  try {
    // Sistemde kayıtlı admin sayısı
    const totalAdmins = await Admin.countDocuments();
    
    // Sadece süper admin yeni admin ekleyebilir
    const canCreateAdmin = req.admin.isSuperAdmin();
    
    // Admin ayarları sayfasını render et
    res.render('admin/settings', {
      title: 'Sistem Ayarları',
      admin: req.admin,
      totalAdmins,
      canCreateAdmin
    });
  } catch (error) {
    logError(error, req);
    
    res.status(500).render('500', {
      title: 'Sunucu Hatası',
      message: 'Ayarlar alınırken bir hata oluştu',
      error: process.env.NODE_ENV === 'development' ? error : {}
    });
  }
};

/**
 * Admin bilgilerini güncelleme
 * @route   POST /${process.env.ADMIN_PAGE_URL}/settings/profile
 * @access  Private (Admin Only)
 */
exports.updateProfile = async (req, res) => {
  try {
    const adminId = req.admin._id;
    
    // Güncellenecek alanlar
    const { name, surname, email, phone } = req.body;
    
    // Admini bul ve güncelle
    const admin = await Admin.findByIdAndUpdate(
      adminId,
      { name, surname, email, phone },
      { new: true, runValidators: true }
    );
    
    // Başarılı güncelleme mesajı
    req.flash('success_msg', 'Profil bilgileriniz başarıyla güncellendi');
    
    // Ayarlar sayfasına yönlendir
    res.redirect(`/${process.env.ADMIN_PAGE_URL}/settings`);
  } catch (error) {
    logError(error, req);
    
    // Validation hatası
    if (error.name === 'ValidationError') {
      req.flash('error_msg', Object.values(error.errors)[0].message);
      return res.redirect(`/${process.env.ADMIN_PAGE_URL}/settings`);
    }
    
    // Duplicate key hatası
    if (error.code === 11000) {
      req.flash('error_msg', 'Bu e-posta adresi başka bir kullanıcı tarafından kullanılıyor');
      return res.redirect(`/${process.env.ADMIN_PAGE_URL}/settings`);
    }
    
    req.flash('error_msg', 'Profil güncellenirken bir hata oluştu');
    res.redirect(`/${process.env.ADMIN_PAGE_URL}/settings`);
  }
};

/**
 * Admin şifre değiştirme
 * @route   POST /${process.env.ADMIN_PAGE_URL}/settings/password
 * @access  Private (Admin Only)
 */
exports.changePassword = async (req, res) => {
  try {
    const adminId = req.admin._id;
    
    // Şifre alanları
    const { currentPassword, newPassword, confirmPassword } = req.body;
    
    // Yeni şifre ve onay şifresi kontrol
    if (newPassword !== confirmPassword) {
      req.flash('error_msg', 'Yeni şifre ve onay şifresi eşleşmiyor');
      return res.redirect(`/${process.env.ADMIN_PAGE_URL}/settings`);
    }
    
    // Şifre uzunluğu kontrolü
    if (newPassword.length < 8) {
      req.flash('error_msg', 'Şifre en az 8 karakter olmalıdır');
      return res.redirect(`/${process.env.ADMIN_PAGE_URL}/settings`);
    }
    
    // Admini şifresiyle birlikte getir
    const admin = await Admin.findById(adminId).select('+password');
    
    // Mevcut şifre kontrolü
    const isMatch = await admin.matchPassword(currentPassword);
    if (!isMatch) {
      req.flash('error_msg', 'Mevcut şifre yanlış');
      return res.redirect(`/${process.env.ADMIN_PAGE_URL}/settings`);
    }
    
    // Yeni şifreyi güncelle
    admin.password = newPassword;
    await admin.save();
    
    // Log kaydı
    logInfo('Admin şifre değişikliği', {
      adminId: admin._id
    });
    
    // Başarılı güncelleme mesajı
    req.flash('success_msg', 'Şifreniz başarıyla güncellendi');
    
    // Ayarlar sayfasına yönlendir
    res.redirect(`/${process.env.ADMIN_PAGE_URL}/settings`);
  } catch (error) {
    logError(error, req);
    
    req.flash('error_msg', 'Şifre değiştirilirken bir hata oluştu');
    res.redirect(`/${process.env.ADMIN_PAGE_URL}/settings`);
  }
};

/**
 * Yeni admin ekleme sayfası
 * @route   GET /${process.env.ADMIN_PAGE_URL}/admins/new
 * @access  Private (Super Admin Only)
 */
exports.getNewAdmin = async (req, res) => {
  try {
    // Admin ekleme sayfasını render et
    res.render('admin/new-admin', {
      title: 'Yeni Admin Ekle'
    });
  } catch (error) {
    logError(error, req);
    
    res.status(500).render('500', {
      title: 'Sunucu Hatası',
      message: 'Sayfa yüklenirken bir hata oluştu',
      error: process.env.NODE_ENV === 'development' ? error : {}
    });
  }
};

/**
 * Yeni admin ekleme
 * @route   POST /${process.env.ADMIN_PAGE_URL}/admins
 * @access  Private (Super Admin Only)
 */
exports.createAdmin = async (req, res) => {
  try {
    // Sadece süper admin yeni admin ekleyebilir
    if (!req.admin.isSuperAdmin()) {
      req.flash('error_msg', 'Bu işlemi gerçekleştirmek için yetkiniz yok');
      return res.redirect(`/${process.env.ADMIN_PAGE_URL}/settings`);
    }
    
    // Form alanları
    const { name, surname, email, password, confirmPassword, level } = req.body;
    
    // Şifre kontrolü
    if (password !== confirmPassword) {
      req.flash('error_msg', 'Şifreler eşleşmiyor');
      return res.redirect(`/${process.env.ADMIN_PAGE_URL}/admins/new`);
    }
    
    // E-posta kullanımda mı kontrol et
    const existingAdmin = await Admin.findOne({ email });
    if (existingAdmin) {
      req.flash('error_msg', 'Bu e-posta adresi zaten kullanılıyor');
      return res.redirect(`/${process.env.ADMIN_PAGE_URL}/admins/new`);
    }
    
    // Yeni admin oluştur
    const newAdmin = new Admin({
      name,
      surname,
      email,
      password,
      level
    });
    
    // İzinleri ayarla (moderate seviyesi için kısıtlı izinler)
    if (level === 'moderator') {
      newAdmin.permissions.users.delete = false;
      newAdmin.permissions.admins.view = false;
      newAdmin.permissions.settings.edit = false;
    }
    
    await newAdmin.save();
    
    // Log kaydı
    logInfo('Yeni admin oluşturuldu', {
      createdBy: req.admin._id,
      newAdminId: newAdmin._id,
      level
    });
    
    // Başarılı ekleme mesajı
    req.flash('success_msg', 'Yeni admin başarıyla oluşturuldu');
    
    // Ayarlar sayfasına yönlendir
    res.redirect(`/${process.env.ADMIN_PAGE_URL}/settings`);
  } catch (error) {
    logError(error, req);
    
// Validation hatası
if (error.name === 'ValidationError') {
    req.flash('error_msg', Object.values(error.errors)[0].message);
    return res.redirect(`/${process.env.ADMIN_PAGE_URL}/admins/new`);
  }
  
  // Duplicate key hatası
  if (error.code === 11000) {
    req.flash('error_msg', 'Bu e-posta adresi başka bir kullanıcı tarafından kullanılıyor');
    return res.redirect(`/${process.env.ADMIN_PAGE_URL}/admins/new`);
  }
  
  req.flash('error_msg', 'Admin oluşturulurken bir hata oluştu');
  res.redirect(`/${process.env.ADMIN_PAGE_URL}/admins/new`);
}
};

/**
* Admin listesi sayfası
* @route   GET /${process.env.ADMIN_PAGE_URL}/admins
* @access  Private (Super Admin Only)
*/
exports.getAdmins = async (req, res) => {
try {
  // Sadece süper admin adminleri görüntüleyebilir
  if (!req.admin.isSuperAdmin()) {
    req.flash('error_msg', 'Bu sayfaya erişim yetkiniz yok');
    return res.redirect(`/${process.env.ADMIN_PAGE_URL}/dashboard`);
  }
  
  // Tüm adminleri getir
  const admins = await Admin.find()
    .sort({ level: -1, name: 1 })
    .select('name surname email level isActive lastLogin createdAt');
  
  // Admin listesi sayfasını render et
  res.render('admin/admins', {
    title: 'Admin Yönetimi',
    admins,
    currentAdmin: req.admin
  });
} catch (error) {
  logError(error, req);
  
  res.status(500).render('500', {
    title: 'Sunucu Hatası',
    message: 'Admin verileri alınırken bir hata oluştu',
    error: process.env.NODE_ENV === 'development' ? error : {}
  });
}
};

/**
* Admin aktif/pasif durumunu değiştirme
* @route   PATCH /${process.env.ADMIN_PAGE_URL}/admins/:id/status
* @access  Private (Super Admin Only)
*/
exports.toggleAdminStatus = async (req, res) => {
try {
  // Sadece süper admin admin durumunu değiştirebilir
  if (!req.admin.isSuperAdmin()) {
    return res.status(403).json({
      success: false,
      error: 'Bu işlemi gerçekleştirmek için yetkiniz yok'
    });
  }
  
  const adminId = req.params.id;
  
  // Kendisini devre dışı bırakamaz
  if (adminId.toString() === req.admin._id.toString()) {
    return res.status(400).json({
      success: false,
      error: 'Kendi hesabınızı devre dışı bırakamazsınız'
    });
  }
  
  // Admini bul
  const admin = await Admin.findById(adminId);
  
  if (!admin) {
    return res.status(404).json({
      success: false,
      error: 'Admin bulunamadı'
    });
  }
  
  // Durumu değiştir
  admin.isActive = !admin.isActive;
  await admin.save();
  
  // Log kaydı
  logInfo(`Admin durumu ${admin.isActive ? 'aktif' : 'pasif'} olarak değiştirildi`, {
    adminId: req.admin._id,
    targetAdminId: admin._id
  });
  
  // Başarılı yanıt
  res.json({
    success: true,
    data: {
      id: admin._id,
      isActive: admin.isActive
    }
  });
} catch (error) {
  logError(error, req);
  
  res.status(500).json({
    success: false,
    error: 'Admin durumu değiştirilirken bir hata oluştu'
  });
}
};

/**
* Admin silme
* @route   DELETE /${process.env.ADMIN_PAGE_URL}/admins/:id
* @access  Private (Super Admin Only)
*/
exports.deleteAdmin = async (req, res) => {
try {
  // Sadece süper admin admin silebilir
  if (!req.admin.isSuperAdmin()) {
    return res.status(403).json({
      success: false,
      error: 'Bu işlemi gerçekleştirmek için yetkiniz yok'
    });
  }
  
  const adminId = req.params.id;
  
  // Kendisini silemez
  if (adminId.toString() === req.admin._id.toString()) {
    return res.status(400).json({
      success: false,
      error: 'Kendi hesabınızı silemezsiniz'
    });
  }
  
  // Admini bul ve sil
  const admin = await Admin.findByIdAndDelete(adminId);
  
  if (!admin) {
    return res.status(404).json({
      success: false,
      error: 'Admin bulunamadı'
    });
  }
  
  // Log kaydı
  logInfo('Admin silindi', {
    adminId: req.admin._id,
    deletedAdminId: adminId,
    deletedAdminEmail: admin.email
  });
  
  // Başarılı yanıt
  res.json({
    success: true,
    message: 'Admin başarıyla silindi'
  });
} catch (error) {
  logError(error, req);
  
  res.status(500).json({
    success: false,
    error: 'Admin silinirken bir hata oluştu'
  });
}
};

/**
* Sistem istatistikleri API
* @route   GET /${process.env.ADMIN_PAGE_URL}/api/stats
* @access  Private (Admin Only)
*/
exports.getSystemStats = async (req, res) => {
try {
  // Son 7 gün için tarih aralığı
  const last7Days = new Date();
  last7Days.setDate(last7Days.getDate() - 7);
  
  // Son 30 gün için tarih aralığı
  const last30Days = new Date();
  last30Days.setDate(last30Days.getDate() - 30);
  
  // Baz istatistikler
  const totalUsers = await User.countDocuments();
  const totalFamilyMembers = await FamilyMember.countDocuments();
  const totalHealthData = await HealthData.countDocuments();
  const activeUsers = await User.countDocuments({ isActive: true });
  
  // Son 7 gün kayıt olan kullanıcı sayısı
  const newUsersLast7Days = await User.countDocuments({
    createdAt: { $gte: last7Days }
  });
  
  // Son 30 gün kayıt olan kullanıcı sayısı
  const newUsersLast30Days = await User.countDocuments({
    createdAt: { $gte: last30Days }
  });
  
  // Son 7 gün eklenen sağlık verisi sayısı
  const newHealthDataLast7Days = await HealthData.countDocuments({
    createdAt: { $gte: last7Days }
  });
  
  // Son 30 gün eklenen sağlık verisi sayısı
  const newHealthDataLast30Days = await HealthData.countDocuments({
    createdAt: { $gte: last30Days }
  });
  
  // Veri türlerine göre sağlık verisi dağılımı
  const healthDataByType = await HealthData.aggregate([
    {
      $group: {
        _id: '$dataType',
        count: { $sum: 1 }
      }
    },
    {
      $sort: { count: -1 }
    }
  ]);
  
  // Duruma göre sağlık verisi dağılımı
  const healthDataByStatus = await HealthData.aggregate([
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 }
      }
    },
    {
      $sort: { _id: 1 }
    }
  ]);
  
  // Son 7 gün için günlük sağlık verisi sayısı
  const last7DaysStats = await HealthData.aggregate([
    {
      $match: {
        createdAt: { $gte: last7Days }
      }
    },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
        count: { $sum: 1 }
      }
    },
    {
      $sort: { _id: 1 }
    }
  ]);
  
  // İstatistik verilerini döndür
  res.json({
    success: true,
    data: {
      totalUsers,
      totalFamilyMembers,
      totalHealthData,
      activeUsers,
      newUsersLast7Days,
      newUsersLast30Days,
      newHealthDataLast7Days,
      newHealthDataLast30Days,
      healthDataByType,
      healthDataByStatus,
      last7DaysStats
    }
  });
} catch (error) {
  logError(error, req);
  
  res.status(500).json({
    success: false,
    error: 'İstatistikler alınırken bir hata oluştu'
  });
}
};

module.exports = exports;
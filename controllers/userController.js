const User = require('../models/User');
const FamilyMember = require('../models/FamilyMember');
const Settings = require('../models/Settings');
const { logError, logInfo } = require('../middlewares/logger');
const { upload } = require('../middlewares/multer');
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');

/**
 * Kullanıcı profil sayfası
 * @route   GET /user/profile
 * @access  Private
 */
exports.getProfile = async (req, res) => {
  try {
    // Kullanıcı bilgilerini getir
    const user = await User.findById(req.user._id);
    
    if (!user) {
      req.flash('error_msg', 'Kullanıcı bulunamadı');
      return res.redirect('/auth/logout');
    }
    
    // Aile üyelerini bul
    const familyMembers = await FamilyMember.find({ userId: req.user._id, isActive: true });
    
    // Profil sayfasını render et
    res.render('front/profile', {
      title: 'Profil',
      user,
      familyMembers
    });
  } catch (error) {
    logError(error, req);
    
    res.status(500).render('500', {
      title: 'Sunucu Hatası',
      message: 'Profil bilgileri alınırken bir hata oluştu',
      error: process.env.NODE_ENV === 'development' ? error : {}
    });
  }
};

/**
 * Profil düzenleme sayfası
 * @route   GET /user/profile/edit
 * @access  Private
 */
exports.getEditProfile = async (req, res) => {
  try {
    // Kullanıcı bilgilerini getir
    const user = await User.findById(req.user._id);
    
    if (!user) {
      req.flash('error_msg', 'Kullanıcı bulunamadı');
      return res.redirect('/auth/logout');
    }
    
    // Düzenleme sayfasını render et
    res.render('front/edit-profile', {
      title: 'Profili Düzenle',
      user
    });
  } catch (error) {
    logError(error, req);
    
    res.status(500).render('500', {
      title: 'Sunucu Hatası',
      message: 'Profil düzenleme sayfası yüklenirken bir hata oluştu',
      error: process.env.NODE_ENV === 'development' ? error : {}
    });
  }
};

/**
 * Profil güncelleme
 * @route   PUT /user/profile
 * @access  Private
 */
exports.updateProfile = async (req, res) => {
  try {
    // Kullanıcıyı bul
    const user = await User.findById(req.user._id);
    
    if (!user) {
      req.flash('error_msg', 'Kullanıcı bulunamadı');
      return res.redirect('/auth/logout');
    }
    
    // Form verilerini al
    const { name, surname, email, phone } = req.body;
    
    // Eğer e-posta değiştirildiyse, benzersiz olup olmadığını kontrol et
    if (email !== user.email) {
      const emailExists = await User.findOne({ email });
      
      if (emailExists) {
        req.flash('error_msg', 'Bu e-posta adresi zaten kullanılıyor');
        return res.redirect('/user/profile/edit');
      }
    }
    
    // Kullanıcı bilgilerini güncelle
    user.name = name;
    user.surname = surname;
    user.email = email;
    user.phone = phone;
    
    // Profil fotoğrafı yüklendiyse
    if (req.file) {
      // Eski profil fotoğrafını sil (varsayılan fotoğraf değilse)
      if (user.avatar && user.avatar !== 'default-avatar.png') {
        const oldAvatarPath = path.join(__dirname, '../public/uploads/profiles', user.avatar);
        
        if (fs.existsSync(oldAvatarPath)) {
          fs.unlinkSync(oldAvatarPath);
        }
      }
      
      // Yeni profil fotoğrafını kaydet
      user.avatar = req.file.filename;
    }
    
    // Kullanıcıyı kaydet
    await user.save();
    
    // Log kaydı
    logInfo('Kullanıcı profili güncellendi', {
      userId: user._id
    });
    
    req.flash('success_msg', 'Profil bilgileriniz başarıyla güncellendi');
    
    // Profil sayfasına yönlendir
    res.redirect('/user/profile');
  } catch (error) {
    logError(error, req);
    
    if (error.name === 'ValidationError') {
      req.flash('error_msg', 'Geçersiz veya eksik veri');
      return res.redirect('/user/profile/edit');
    }
    
    req.flash('error_msg', 'Profil güncellenirken bir hata oluştu');
    res.redirect('/user/profile/edit');
  }
};

/**
 * Şifre değiştirme sayfası
 * @route   GET /user/change-password
 * @access  Private
 */
exports.getChangePassword = async (req, res) => {
  try {
    // Şifre değiştirme sayfasını render et
    res.render('front/change-password', {
      title: 'Şifre Değiştir'
    });
  } catch (error) {
    logError(error, req);
    
    res.status(500).render('500', {
      title: 'Sunucu Hatası',
      message: 'Şifre değiştirme sayfası yüklenirken bir hata oluştu',
      error: process.env.NODE_ENV === 'development' ? error : {}
    });
  }
};

/**
 * Şifre değiştirme
 * @route   POST /user/change-password
 * @access  Private
 */
exports.changePassword = async (req, res) => {
  try {
    // Form verilerini al
    const { currentPassword, newPassword, confirmPassword } = req.body;
    
    // Şifre doğrulamaları
    if (!currentPassword || !newPassword || !confirmPassword) {
      req.flash('error_msg', 'Lütfen tüm alanları doldurun');
      return res.redirect('/user/change-password');
    }
    
    if (newPassword !== confirmPassword) {
      req.flash('error_msg', 'Yeni şifreler eşleşmiyor');
      return res.redirect('/user/change-password');
    }
    
    if (newPassword.length < 6) {
      req.flash('error_msg', 'Şifre en az 6 karakter olmalıdır');
      return res.redirect('/user/change-password');
    }
    
    // Kullanıcıyı şifresiyle birlikte getir
    const user = await User.findById(req.user._id).select('+password');
    
    if (!user) {
      req.flash('error_msg', 'Kullanıcı bulunamadı');
      return res.redirect('/auth/logout');
    }
    
    // Mevcut şifreyi kontrol et
    const isMatch = await user.matchPassword(currentPassword);
    
    if (!isMatch) {
      req.flash('error_msg', 'Mevcut şifre yanlış');
      return res.redirect('/user/change-password');
    }
    
    // Yeni şifreyi hashle ve kaydet
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    
    await user.save();
    
    // Log kaydı
    logInfo('Kullanıcı şifresi değiştirildi', {
      userId: user._id
    });
    
    req.flash('success_msg', 'Şifreniz başarıyla değiştirildi');
    
    // Profil sayfasına yönlendir
    res.redirect('/user/profile');
  } catch (error) {
    logError(error, req);
    
    req.flash('error_msg', 'Şifre değiştirilirken bir hata oluştu');
    res.redirect('/user/change-password');
  }
};

/**
 * Ayarlar sayfası
 * @route   GET /user/settings
 * @access  Private
 */
exports.getSettings = async (req, res) => {
  try {
    // Kullanıcı ayarlarını getir
    const settings = await Settings.findOne({ userId: req.user._id });
    
    // Eğer ayarlar yoksa, varsayılan ayarları kullan
    if (!settings) {
      const defaultSettings = await Settings.getDefaults();
      defaultSettings.userId = req.user._id;
      await defaultSettings.save();
      
      return res.render('front/settings', {
        title: 'Ayarlar',
        settings: defaultSettings
      });
    }
    
    // Ayarlar sayfasını render et
    res.render('front/settings', {
      title: 'Ayarlar',
      settings
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
 * Ayarları güncelleme
 * @route   PUT /user/settings
 * @access  Private
 */
exports.updateSettings = async (req, res) => {
  try {
    // Kullanıcı ayarlarını getir
    let settings = await Settings.findOne({ userId: req.user._id });
    
    // Eğer ayarlar yoksa, varsayılan ayarları oluştur
    if (!settings) {
      settings = new Settings({
        userId: req.user._id
      });
    }
    
    // Form verilerini ayarları güncellemek için kullan
    settings.updateSettings(req.body);
    
    // Ayarları kaydet
    await settings.save();
    
    // Log kaydı
    logInfo('Kullanıcı ayarları güncellendi', {
      userId: req.user._id
    });
    
    // Güncellenen ayarları kullanıcı nesnesine de kaydet
    req.user.settings = {
      language: settings.general.language,
      dateFormat: settings.general.dateFormat,
      timeFormat: settings.general.timeFormat,
      theme: settings.general.theme,
      notifications: {
        email: settings.notifications.email.enabled,
        push: settings.notifications.pushNotifications.enabled,
        reminders: settings.notifications.types.medication_reminder || 
                  settings.notifications.types.measurement_reminder || 
                  settings.notifications.types.appointment_reminder
      }
    };
    
    await User.findByIdAndUpdate(req.user._id, { settings: req.user.settings });
    
    req.flash('success_msg', 'Ayarlarınız başarıyla güncellendi');
    
    // Ayarlar sayfasına yönlendir
    res.redirect('/user/settings');
  } catch (error) {
    logError(error, req);
    
    req.flash('error_msg', 'Ayarlar güncellenirken bir hata oluştu');
    res.redirect('/user/settings');
  }
};

/**
 * Aile üyelerini listele
 * @route   GET /user/family
 * @access  Private
 */
exports.getFamilyMembers = async (req, res) => {
  try {
    // Aktif aile üyelerini getir
    const familyMembers = await FamilyMember.find({ 
      userId: req.user._id, 
      isActive: true 
    }).sort('name');
    
    // Aile üyeleri sayfasını render et
    res.render('front/family-members', {
      title: 'Aile Üyeleri',
      familyMembers
    });
  } catch (error) {
    logError(error, req);
    
    res.status(500).render('500', {
      title: 'Sunucu Hatası',
      message: 'Aile üyeleri alınırken bir hata oluştu',
      error: process.env.NODE_ENV === 'development' ? error : {}
    });
  }
};

/**
 * Aile üyesi ekleme sayfası
 * @route   GET /user/family/add
 * @access  Private
 */
exports.getAddFamilyMember = async (req, res) => {
  try {
    // Aile üyesi ekleme sayfasını render et
    res.render('front/family-member-form', {
      title: 'Aile Üyesi Ekle',
      familyMember: null,
      formAction: '/user/family',
      formMethod: 'POST',
      relationshipOptions: [
        { value: 'anne', label: 'Anne' },
        { value: 'baba', label: 'Baba' },
        { value: 'eş', label: 'Eş' },
        { value: 'çocuk', label: 'Çocuk' },
        { value: 'kardeş', label: 'Kardeş' },
        { value: 'anneanne', label: 'Anneanne' },
        { value: 'babaanne', label: 'Babaanne' },
        { value: 'dede', label: 'Dede' },
        { value: 'torun', label: 'Torun' },
        { value: 'diğer', label: 'Diğer' }
      ],
      genderOptions: [
        { value: 'kadın', label: 'Kadın' },
        { value: 'erkek', label: 'Erkek' },
        { value: 'diğer', label: 'Diğer' }
      ],
      bloodTypeOptions: [
        { value: 'A+', label: 'A+' },
        { value: 'A-', label: 'A-' },
        { value: 'B+', label: 'B+' },
        { value: 'B-', label: 'B-' },
        { value: 'AB+', label: 'AB+' },
        { value: 'AB-', label: 'AB-' },
        { value: '0+', label: '0+' },
        { value: '0-', label: '0-' },
        { value: 'bilinmiyor', label: 'Bilinmiyor' }
      ]
    });
  } catch (error) {
    logError(error, req);
    
    res.status(500).render('500', {
      title: 'Sunucu Hatası',
      message: 'Aile üyesi ekleme sayfası yüklenirken bir hata oluştu',
      error: process.env.NODE_ENV === 'development' ? error : {}
    });
  }
};

/**
 * Aile üyesi ekleme
 * @route   POST /user/family
 * @access  Private
 */
exports.addFamilyMember = async (req, res) => {
  try {
    // Form verilerini al
    const { 
      name, 
      surname, 
      relationship, 
      dateOfBirth, 
      gender, 
      bloodType, 
      height, 
      weight, 
      notes
    } = req.body;
    
    // Yeni aile üyesi oluştur
    const familyMember = new FamilyMember({
      userId: req.user._id,
      name,
      surname,
      relationship,
      dateOfBirth: new Date(dateOfBirth),
      gender,
      bloodType: bloodType || 'bilinmiyor',
      height: height ? parseFloat(height) : undefined,
      weight: weight ? parseFloat(weight) : undefined,
      notes
    });
    
    // Alerjileri doldur
    if (req.body.allergies && Array.isArray(req.body.allergies)) {
      familyMember.allergies = [];
      
      for (let i = 0; i < req.body.allergies.length; i++) {
        if (!req.body[`allergies[${i}].name`]) continue;
        
        const allergy = {
          type: req.body[`allergies[${i}].type`] || 'diğer',
          name: req.body[`allergies[${i}].name`],
          severity: req.body[`allergies[${i}].severity`] || 'orta',
          notes: req.body[`allergies[${i}].notes`]
        };
        
        familyMember.allergies.push(allergy);
      }
    } else if (req.body['allergies.name']) {
      const allergy = {
        type: req.body['allergies.type'] || 'diğer',
        name: req.body['allergies.name'],
        severity: req.body['allergies.severity'] || 'orta',
        notes: req.body['allergies.notes']
      };
      
      familyMember.allergies = [allergy];
    }
    
    // Kronik hastalıkları doldur
    if (req.body.chronicDiseases && Array.isArray(req.body.chronicDiseases)) {
      familyMember.chronicDiseases = [];
      
      for (let i = 0; i < req.body.chronicDiseases.length; i++) {
        if (!req.body[`chronicDiseases[${i}].name`]) continue;
        
        const disease = {
          name: req.body[`chronicDiseases[${i}].name`],
          diagnosisDate: req.body[`chronicDiseases[${i}].diagnosisDate`] ? new Date(req.body[`chronicDiseases[${i}].diagnosisDate`]) : undefined,
          medications: req.body[`chronicDiseases[${i}].medications`] ? req.body[`chronicDiseases[${i}].medications`].split(',').map(m => m.trim()) : [],
          notes: req.body[`chronicDiseases[${i}].notes`]
        };
        
        familyMember.chronicDiseases.push(disease);
      }
    } else if (req.body['chronicDiseases.name']) {
      const disease = {
        name: req.body['chronicDiseases.name'],
        diagnosisDate: req.body['chronicDiseases.diagnosisDate'] ? new Date(req.body['chronicDiseases.diagnosisDate']) : undefined,
        medications: req.body['chronicDiseases.medications'] ? req.body['chronicDiseases.medications'].split(',').map(m => m.trim()) : [],
        notes: req.body['chronicDiseases.notes']
      };
      
      familyMember.chronicDiseases = [disease];
    }
    
    // Acil durum iletişim bilgilerini doldur
    if (req.body['emergencyContact.name'] || req.body['emergencyContact.phone']) {
      familyMember.emergencyContact = {
        name: req.body['emergencyContact.name'],
        phone: req.body['emergencyContact.phone'],
        relationship: req.body['emergencyContact.relationship']
      };
    }
    
    // Profil fotoğrafı yüklendiyse
    if (req.file) {
      familyMember.avatar = req.file.filename;
    }
    
    // Aile üyesini kaydet
    await familyMember.save();
    
    // Kullanıcının aile üyeleri listesini güncelle
    await User.findByIdAndUpdate(req.user._id, {
      $addToSet: { familyMembers: familyMember._id }
    });
    
    // Log kaydı
    logInfo('Yeni aile üyesi eklendi', {
      userId: req.user._id,
      familyMemberId: familyMember._id
    });
    
    req.flash('success_msg', `${familyMember.name} ${familyMember.surname} başarıyla eklendi`);
    
    // Aile üyeleri listesine veya yeni eklenen üyenin sayfasına yönlendir
    res.redirect(`/user/family/${familyMember._id}`);
  } catch (error) {
    logError(error, req);
    
    if (error.name === 'ValidationError') {
      req.flash('error_msg', 'Geçersiz veya eksik veri');
      return res.redirect('/user/family/add');
    }
    
    req.flash('error_msg', 'Aile üyesi eklenirken bir hata oluştu');
    res.redirect('/user/family/add');
  }
};

/**
 * Aile üyesi detayı
 * @route   GET /user/family/:id
 * @access  Private
 */
exports.getFamilyMemberDetail = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Aile üyesini bul
    const familyMember = await FamilyMember.findOne({
      _id: id,
      userId: req.user._id
    });
    
    if (!familyMember) {
      req.flash('error_msg', 'Aile üyesi bulunamadı');
      return res.redirect('/user/family');
    }
    
    // Aile üyesi detay sayfasını render et
    res.render('front/family-member-detail', {
      title: `${familyMember.name} ${familyMember.surname} - Detay`,
      familyMember
    });
  } catch (error) {
    logError(error, req);
    
    if (error.name === 'CastError') {
      req.flash('error_msg', 'Geçersiz aile üyesi ID formatı');
      return res.redirect('/user/family');
    }
    
    res.status(500).render('500', {
      title: 'Sunucu Hatası',
      message: 'Aile üyesi detayı alınırken bir hata oluştu',
      error: process.env.NODE_ENV === 'development' ? error : {}
    });
  }
};

/**
 * Aile üyesi düzenleme sayfası
 * @route   GET /user/family/:id/edit
 * @access  Private
 */
exports.getEditFamilyMember = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Aile üyesini bul
    const familyMember = await FamilyMember.findOne({
      _id: id,
      userId: req.user._id
    });
    
    if (!familyMember) {
      req.flash('error_msg', 'Aile üyesi bulunamadı');
      return res.redirect('/user/family');
    }
    
    // Düzenleme sayfasını render et
    res.render('front/family-member-form', {
      title: `${familyMember.name} ${familyMember.surname} - Düzenle`,
      familyMember,
      formAction: `/user/family/${id}?_method=PUT`,
      formMethod: 'POST',
      relationshipOptions: [
        { value: 'anne', label: 'Anne' },
        { value: 'baba', label: 'Baba' },
        { value: 'eş', label: 'Eş' },
        { value: 'çocuk', label: 'Çocuk' },
        { value: 'kardeş', label: 'Kardeş' },
        { value: 'anneanne', label: 'Anneanne' },
        { value: 'babaanne', label: 'Babaanne' },
        { value: 'dede', label: 'Dede' },
        { value: 'torun', label: 'Torun' },
        { value: 'diğer', label: 'Diğer' }
      ],
      genderOptions: [
        { value: 'kadın', label: 'Kadın' },
        { value: 'erkek', label: 'Erkek' },
        { value: 'diğer', label: 'Diğer' }
      ],
      bloodTypeOptions: [
        { value: 'A+', label: 'A+' },
        { value: 'A-', label: 'A-' },
        { value: 'B+', label: 'B+' },
        { value: 'B-', label: 'B-' },
        { value: 'AB+', label: 'AB+' },
        { value: 'AB-', label: 'AB-' },
        { value: '0+', label: '0+' },
        { value: '0-', label: '0-' },
        { value: 'bilinmiyor', label: 'Bilinmiyor' }
      ]
    });
  } catch (error) {
    logError(error, req);
    
    if (error.name === 'CastError') {
      req.flash('error_msg', 'Geçersiz aile üyesi ID formatı');
      return res.redirect('/user/family');
    }
    
    res.status(500).render('500', {
      title: 'Sunucu Hatası',
      message: 'Aile üyesi düzenleme sayfası yüklenirken bir hata oluştu',
      error: process.env.NODE_ENV === 'development' ? error : {}
    });
  }
};

/**
 * Aile üyesi güncelleme
 * @route   PUT /user/family/:id
 * @access  Private
 */
exports.updateFamilyMember = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Aile üyesini bul
    const familyMember = await FamilyMember.findOne({
      _id: id,
      userId: req.user._id
    });
    
    if (!familyMember) {
      req.flash('error_msg', 'Aile üyesi bulunamadı');
      return res.redirect('/user/family');
    }
    
    // Form verilerini al
    const { 
      name, 
      surname, 
      relationship, 
      dateOfBirth, 
      gender, 
      bloodType, 
      height, 
      weight, 
      notes
    } = req.body;
    
    // Aile üyesi bilgilerini güncelle
    familyMember.name = name;
    familyMember.surname = surname;
    familyMember.relationship = relationship;
    familyMember.dateOfBirth = new Date(dateOfBirth);
    familyMember.gender = gender;
    familyMember.bloodType = bloodType || 'bilinmiyor';
    familyMember.height = height ? parseFloat(height) : undefined;
    familyMember.weight = weight ? parseFloat(weight) : undefined;
    familyMember.notes = notes;
    
    // Alerjileri güncelle
    familyMember.allergies = [];
    
    if (req.body.allergies && Array.isArray(req.body.allergies)) {
      for (let i = 0; i < req.body.allergies.length; i++) {
        if (!req.body[`allergies[${i}].name`]) continue;
        
        const allergy = {
          type: req.body[`allergies[${i}].type`] || 'diğer',
          name: req.body[`allergies[${i}].name`],
          severity: req.body[`allergies[${i}].severity`] || 'orta',
          notes: req.body[`allergies[${i}].notes`]
        };
        
        familyMember.allergies.push(allergy);
      }
    } else if (req.body['allergies.name']) {
      const allergy = {
        type: req.body['allergies.type'] || 'diğer',
        name: req.body['allergies.name'],
        severity: req.body['allergies.severity'] || 'orta',
        notes: req.body['allergies.notes']
      };
      
      familyMember.allergies.push(allergy);
    }
    
    // Kronik hastalıkları güncelle
    familyMember.chronicDiseases = [];
    
    if (req.body.chronicDiseases && Array.isArray(req.body.chronicDiseases)) {
      for (let i = 0; i < req.body.chronicDiseases.length; i++) {
        if (!req.body[`chronicDiseases[${i}].name`]) continue;
        
        const disease = {
          name: req.body[`chronicDiseases[${i}].name`],
          diagnosisDate: req.body[`chronicDiseases[${i}].diagnosisDate`] ? new Date(req.body[`chronicDiseases[${i}].diagnosisDate`]) : undefined,
          medications: req.body[`chronicDiseases[${i}].medications`] ? req.body[`chronicDiseases[${i}].medications`].split(',').map(m => m.trim()) : [],
          notes: req.body[`chronicDiseases[${i}].notes`]
        };
        
        familyMember.chronicDiseases.push(disease);
      }
    } else if (req.body['chronicDiseases.name']) {
      const disease = {
        name: req.body['chronicDiseases.name'],
        diagnosisDate: req.body['chronicDiseases.diagnosisDate'] ? new Date(req.body['chronicDiseases.diagnosisDate']) : undefined,
        medications: req.body['chronicDiseases.medications'] ? req.body['chronicDiseases.medications'].split(',').map(m => m.trim()) : [],
        notes: req.body['chronicDiseases.notes']
      };
      
      familyMember.chronicDiseases.push(disease);
    }
    
    // Acil durum iletişim bilgilerini güncelle
    if (req.body['emergencyContact.name'] || req.body['emergencyContact.phone']) {
      familyMember.emergencyContact = {
        name: req.body['emergencyContact.name'],
        phone: req.body['emergencyContact.phone'],
        relationship: req.body['emergencyContact.relationship']
      };
    } else {
      familyMember.emergencyContact = undefined;
    }
    
    // Profil fotoğrafı yüklendiyse
    if (req.file) {
      // Eski profil fotoğrafını sil (varsayılan fotoğraf değilse)
      if (familyMember.avatar && familyMember.avatar !== 'default-member-avatar.png') {
        const oldAvatarPath = path.join(__dirname, '../public/uploads/profiles', familyMember.avatar);
        
        if (fs.existsSync(oldAvatarPath)) {
          fs.unlinkSync(oldAvatarPath);
        }
      }
      
      // Yeni profil fotoğrafını kaydet
      familyMember.avatar = req.file.filename;
    }
    
    // Aile üyesini kaydet
    await familyMember.save();
    
    // Log kaydı
    logInfo('Aile üyesi güncellendi', {
      userId: req.user._id,
      familyMemberId: familyMember._id
    });
    
    req.flash('success_msg', `${familyMember.name} ${familyMember.surname} bilgileri başarıyla güncellendi`);
    
    // Aile üyesi detay sayfasına yönlendir
    res.redirect(`/user/family/${familyMember._id}`);
  } catch (error) {
    logError(error, req);
    
    if (error.name === 'ValidationError') {
      req.flash('error_msg', 'Geçersiz veya eksik veri');
      return res.redirect(`/user/family/${req.params.id}/edit`);
    }
    
    req.flash('error_msg', 'Aile üyesi güncellenirken bir hata oluştu');
    res.redirect(`/user/family/${req.params.id}/edit`);
  }
};

/**
 * Aile üyesi silme
 * @route   DELETE /user/family/:id
 * @access  Private
 */
exports.deleteFamilyMember = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Aile üyesini bul
    const familyMember = await FamilyMember.findOne({
      _id: id,
      userId: req.user._id
    });
    
    if (!familyMember) {
      req.flash('error_msg', 'Aile üyesi bulunamadı');
      return res.redirect('/user/family');
    }
    
    // Aile üyesini pasif yap (tamamen silmek yerine)
    familyMember.isActive = false;
    await familyMember.save();
    
    // Log kaydı
    logInfo('Aile üyesi silindi (pasif yapıldı)', {
      userId: req.user._id,
      familyMemberId: familyMember._id
    });
    
    req.flash('success_msg', `${familyMember.name} ${familyMember.surname} başarıyla silindi`);
    
    // Aile üyeleri listesine yönlendir
    res.redirect('/user/family');
  } catch (error) {
    logError(error, req);
    
    if (error.name === 'CastError') {
      req.flash('error_msg', 'Geçersiz aile üyesi ID formatı');
      return res.redirect('/user/family');
    }
    
    req.flash('error_msg', 'Aile üyesi silinirken bir hata oluştu');
    res.redirect('/user/family');
  }
};

/**
 * API: Kullanıcı profil bilgileri
 * @route   GET /api/user/profile
 * @access  Private
 */
exports.apiGetProfile = async (req, res) => {
  try {
    // Kullanıcı bilgilerini getir
    const user = await User.findById(req.user._id).select('-password');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Kullanıcı bulunamadı'
      });
    }
    
    // Yanıt
    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    logError(error, req);
    
    res.status(500).json({
      success: false,
      error: 'Profil bilgileri alınırken bir hata oluştu'
    });
  }
};

/**
 * API: Kullanıcı profil güncelleme
 * @route   PUT /api/user/profile
 * @access  Private
 */
exports.apiUpdateProfile = async (req, res) => {
  try {
    // Kullanıcıyı bul
    const user = await User.findById(req.user._id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Kullanıcı bulunamadı'
      });
    }
    
    // Güncellenebilir alanlar
    const updateFields = ['name', 'surname', 'phone'];
    
    // Alanları güncelle
    updateFields.forEach(field => {
      if (req.body[field] !== undefined) {
        user[field] = req.body[field];
      }
    });
    
    // E-posta değiştirildiyse, benzersizliğini kontrol et
    if (req.body.email && req.body.email !== user.email) {
      const emailExists = await User.findOne({ email: req.body.email });
      
      if (emailExists) {
        return res.status(400).json({
          success: false,
          error: 'Bu e-posta adresi zaten kullanılıyor'
        });
      }
      
      user.email = req.body.email;
    }
    
    // Kullanıcıyı kaydet
    await user.save();
    
    // Log kaydı
    logInfo('API: Kullanıcı profili güncellendi', {
      userId: user._id
    });
    
    // Yanıt
    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    logError(error, req);
    
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        error: 'Geçersiz veri formatı',
        details: Object.values(error.errors).map(err => err.message)
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Profil güncellenirken bir hata oluştu'
    });
  }
};

/**
 * API: Kullanıcı şifre değiştirme
 * @route   PUT /api/user/change-password
 * @access  Private
 */
exports.apiChangePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    // Giriş verilerini kontrol et
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        error: 'Mevcut şifre ve yeni şifre alanları gereklidir'
      });
    }
    
    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'Yeni şifre en az 6 karakter olmalıdır'
      });
    }
    
    // Kullanıcıyı şifresiyle birlikte getir
    const user = await User.findById(req.user._id).select('+password');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Kullanıcı bulunamadı'
      });
    }
    
    // Mevcut şifreyi kontrol et
    const isMatch = await user.matchPassword(currentPassword);
    
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: 'Mevcut şifre yanlış'
      });
    }
    
    // Yeni şifreyi hashle ve kaydet
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    
    await user.save();
    
    // Log kaydı
    logInfo('API: Kullanıcı şifresi değiştirildi', {
      userId: user._id
    });
    
    // Yanıt
    res.json({
      success: true,
      message: 'Şifre başarıyla değiştirildi'
    });
  } catch (error) {
    logError(error, req);
    
    res.status(500).json({
      success: false,
      error: 'Şifre değiştirilirken bir hata oluştu'
    });
  }
};

/**
 * API: Kullanıcının aile üyelerini listele
 * @route   GET /api/user/family
 * @access  Private
 */
exports.apiGetFamilyMembers = async (req, res) => {
  try {
    // Varsayılan olarak sadece aktif aile üyelerini getir
    const isActive = req.query.all !== 'true';
    
    // Aile üyelerini getir
    const familyMembers = await FamilyMember.find({ 
      userId: req.user._id,
      ...(isActive ? { isActive: true } : {})
    }).sort('name');
    
    // Yanıt
    res.json({
      success: true,
      count: familyMembers.length,
      data: familyMembers
    });
  } catch (error) {
    logError(error, req);
    
    res.status(500).json({
      success: false,
      error: 'Aile üyeleri alınırken bir hata oluştu'
    });
  }
};

/**
 * API: Aile üyesi detayı
 * @route   GET /api/user/family/:id
 * @access  Private
 */
exports.apiGetFamilyMember = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Aile üyesini bul
    const familyMember = await FamilyMember.findOne({
      _id: id,
      userId: req.user._id
    });
    
    if (!familyMember) {
      return res.status(404).json({
        success: false,
        error: 'Aile üyesi bulunamadı'
      });
    }
    
    // Yanıt
    res.json({
      success: true,
      data: familyMember
    });
  } catch (error) {
    logError(error, req);
    
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        error: 'Geçersiz aile üyesi ID formatı'
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Aile üyesi detayı alınırken bir hata oluştu'
    });
  }
};

/**
 * API: Yeni aile üyesi ekleme
 * @route   POST /api/user/family
 * @access  Private
 */
exports.apiAddFamilyMember = async (req, res) => {
  try {
    // Yeni aile üyesi oluştur
    const familyMember = new FamilyMember({
      userId: req.user._id,
      ...req.body
    });
    
    // Aile üyesini kaydet
    await familyMember.save();
    
    // Kullanıcının aile üyeleri listesini güncelle
    await User.findByIdAndUpdate(req.user._id, {
      $addToSet: { familyMembers: familyMember._id }
    });
    
    // Log kaydı
    logInfo('API: Yeni aile üyesi eklendi', {
      userId: req.user._id,
      familyMemberId: familyMember._id
    });
    
    // Yanıt
    res.status(201).json({
      success: true,
      data: familyMember
    });
  } catch (error) {
    logError(error, req);
    
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        error: 'Geçersiz veri formatı',
        details: Object.values(error.errors).map(err => err.message)
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Aile üyesi eklenirken bir hata oluştu'
    });
  }
};

/**
 * API: Aile üyesi güncelleme
 * @route   PUT /api/user/family/:id
 * @access  Private
 */
exports.apiUpdateFamilyMember = async (req, res) => {
  try {
    const { id } = req.params;
// Aile üyesini bul
const familyMember = await FamilyMember.findOne({
    _id: id,
    userId: req.user._id
  });
  
  if (!familyMember) {
    return res.status(404).json({
      success: false,
      error: 'Aile üyesi bulunamadı'
    });
  }
  
  // Güncellenebilir alanlar
  const updateFields = [
    'name', 'surname', 'relationship', 'dateOfBirth', 'gender',
    'bloodType', 'height', 'weight', 'allergies', 'chronicDiseases',
    'emergencyContact', 'notes', 'isActive'
  ];
  
  // Alanları güncelle
  updateFields.forEach(field => {
    if (req.body[field] !== undefined) {
      familyMember[field] = req.body[field];
    }
  });
  
  // Aile üyesini kaydet
  await familyMember.save();
  
  // Log kaydı
  logInfo('API: Aile üyesi güncellendi', {
    userId: req.user._id,
    familyMemberId: familyMember._id
  });
  
  // Yanıt
  res.json({
    success: true,
    data: familyMember
  });
} catch (error) {
  logError(error, req);
  
  if (error.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      error: 'Geçersiz veri formatı',
      details: Object.values(error.errors).map(err => err.message)
    });
  }
  
  if (error.name === 'CastError') {
    return res.status(400).json({
      success: false,
      error: 'Geçersiz aile üyesi ID formatı'
    });
  }
  
  res.status(500).json({
    success: false,
    error: 'Aile üyesi güncellenirken bir hata oluştu'
  });
}
};

/**
* API: Aile üyesi silme (pasif yapma)
* @route   DELETE /api/user/family/:id
* @access  Private
*/
exports.apiDeleteFamilyMember = async (req, res) => {
try {
  const { id } = req.params;
  
  // Aile üyesini bul
  const familyMember = await FamilyMember.findOne({
    _id: id,
    userId: req.user._id
  });
  
  if (!familyMember) {
    return res.status(404).json({
      success: false,
      error: 'Aile üyesi bulunamadı'
    });
  }
  
  // Aile üyesini pasif yap (tamamen silmek yerine)
  familyMember.isActive = false;
  await familyMember.save();
  
  // Log kaydı
  logInfo('API: Aile üyesi silindi (pasif yapıldı)', {
    userId: req.user._id,
    familyMemberId: familyMember._id
  });
  
  // Yanıt
  res.json({
    success: true,
    data: {}
  });
} catch (error) {
  logError(error, req);
  
  if (error.name === 'CastError') {
    return res.status(400).json({
      success: false,
      error: 'Geçersiz aile üyesi ID formatı'
    });
  }
  
  res.status(500).json({
    success: false,
    error: 'Aile üyesi silinirken bir hata oluştu'
  });
}
};

/**
* API: Kullanıcı ayarlarını getir
* @route   GET /api/user/settings
* @access  Private
*/
exports.apiGetSettings = async (req, res) => {
try {
  // Kullanıcı ayarlarını getir
  let settings = await Settings.findOne({ userId: req.user._id });
  
  // Eğer ayarlar yoksa, varsayılan ayarları kullan
  if (!settings) {
    settings = await Settings.getDefaults();
    settings.userId = req.user._id;
    await settings.save();
  }
  
  // Yanıt
  res.json({
    success: true,
    data: settings
  });
} catch (error) {
  logError(error, req);
  
  res.status(500).json({
    success: false,
    error: 'Ayarlar alınırken bir hata oluştu'
  });
}
};

/**
* API: Kullanıcı ayarlarını güncelle
* @route   PUT /api/user/settings
* @access  Private
*/
exports.apiUpdateSettings = async (req, res) => {
try {
  // Kullanıcı ayarlarını getir
  let settings = await Settings.findOne({ userId: req.user._id });
  
  // Eğer ayarlar yoksa, yeni ayarlar oluştur
  if (!settings) {
    settings = new Settings({
      userId: req.user._id
    });
  }
  
  // Ayarları güncelle
  settings.updateSettings(req.body);
  
  // Ayarları kaydet
  await settings.save();
  
  // Kullanıcı nesnesindeki ayarları da güncelle
  const userSettings = {
    language: settings.general.language,
    dateFormat: settings.general.dateFormat,
    timeFormat: settings.general.timeFormat,
    theme: settings.general.theme,
    notifications: {
      email: settings.notifications.email.enabled,
      push: settings.notifications.pushNotifications.enabled,
      reminders: settings.notifications.types.medication_reminder || 
                settings.notifications.types.measurement_reminder || 
                settings.notifications.types.appointment_reminder
    }
  };
  
  await User.findByIdAndUpdate(req.user._id, { settings: userSettings });
  
  // Log kaydı
  logInfo('API: Kullanıcı ayarları güncellendi', {
    userId: req.user._id
  });
  
  // Yanıt
  res.json({
    success: true,
    data: settings
  });
} catch (error) {
  logError(error, req);
  
  res.status(500).json({
    success: false,
    error: 'Ayarlar güncellenirken bir hata oluştu'
  });
}
};

module.exports = exports;
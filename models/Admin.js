const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const AdminSchema = new mongoose.Schema({
  email: {
    type: String,
    required: [true, 'E-posta adresi gereklidir'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Geçerli bir e-posta adresi giriniz']
  },
  password: {
    type: String,
    required: [true, 'Şifre gereklidir'],
    minlength: [8, 'Şifre en az 8 karakter olmalıdır'],
    select: false // Varsayılan olarak şifreyi sorguya dahil etme
  },
  name: {
    type: String,
    required: [true, 'İsim gereklidir'],
    trim: true,
    maxlength: [50, 'İsim 50 karakterden uzun olamaz']
  },
  surname: {
    type: String,
    required: [true, 'Soyisim gereklidir'],
    trim: true,
    maxlength: [50, 'Soyisim 50 karakterden uzun olamaz']
  },
  level: {
    type: String,
    enum: ['super-admin', 'admin', 'moderator'],
    default: 'admin'
  },
  avatar: {
    type: String,
    default: 'default-admin-avatar.png'
  },
  permissions: {
    users: {
      view: { type: Boolean, default: true },
      create: { type: Boolean, default: true },
      edit: { type: Boolean, default: true },
      delete: { type: Boolean, default: false }
    },
    familyMembers: {
      view: { type: Boolean, default: true },
      create: { type: Boolean, default: true },
      edit: { type: Boolean, default: true },
      delete: { type: Boolean, default: false }
    },
    healthData: {
      view: { type: Boolean, default: true },
      create: { type: Boolean, default: true },
      edit: { type: Boolean, default: true },
      delete: { type: Boolean, default: false }
    },
    medicalHistory: {
      view: { type: Boolean, default: true },
      create: { type: Boolean, default: true },
      edit: { type: Boolean, default: true },
      delete: { type: Boolean, default: false }
    },
    reports: {
      view: { type: Boolean, default: true },
      create: { type: Boolean, default: true },
      export: { type: Boolean, default: true }
    },
    settings: {
      view: { type: Boolean, default: true },
      edit: { type: Boolean, default: false }
    },
    admins: {
      view: { type: Boolean, default: false },
      create: { type: Boolean, default: false },
      edit: { type: Boolean, default: false },
      delete: { type: Boolean, default: false }
    }
  },
  resetPasswordToken: String,
  resetPasswordExpire: Date,
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: {
    type: Date,
    default: Date.now
  },
  loginHistory: [{
    loginDate: {
      type: Date,
      default: Date.now
    },
    ipAddress: String,
    userAgent: String
  }]
}, {
  timestamps: true // createdAt ve updatedAt alanlarını otomatik ekler
});

// Şifreyi hashle
AdminSchema.pre('save', async function(next) {
  // Şifre değişmediyse hash'leme
  if (!this.isModified('password')) {
    return next();
  }

  try {
    const salt = await bcrypt.genSalt(12); // Admin için daha yüksek güvenlik
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Tam adı döndüren metod
AdminSchema.virtual('fullName').get(function() {
  return `${this.name} ${this.surname}`;
});

// Şifre karşılaştırma metodu
AdminSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// JWT token oluşturma metodu
AdminSchema.methods.getSignedJwtToken = function() {
  return jwt.sign(
    { id: this._id, level: this.level, isAdmin: true },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN }
  );
};

// Şifre sıfırlama tokeni oluşturma
AdminSchema.methods.createResetPasswordToken = function() {
  // Token oluştur
  const resetToken = crypto.randomBytes(32).toString('hex');

  // Token'ı hashle ve modele kaydet
  this.resetPasswordToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');

  // Token'ın son kullanma tarihini ayarla (30 dk)
  this.resetPasswordExpire = Date.now() + 30 * 60 * 1000;

  return resetToken;
};

// Oturum açma kaydı ekleme metodu
AdminSchema.methods.addLoginRecord = function(ipAddress, userAgent) {
  this.lastLogin = Date.now();
  
  const loginRecord = {
    loginDate: Date.now(),
    ipAddress,
    userAgent
  };
  
  this.loginHistory.push(loginRecord);
  
  // Son 100 giriş kaydını tut
  if (this.loginHistory.length > 100) {
    this.loginHistory = this.loginHistory.slice(-100);
  }
  
  return this.save();
};

// Süper admin kontrolü metodu
AdminSchema.methods.isSuperAdmin = function() {
  return this.level === 'super-admin';
};

// Belirli bir izin kontrolü metodu
AdminSchema.methods.hasPermission = function(section, action) {
  // Süper admin ise her zaman tüm izinlere sahiptir
  if (this.isSuperAdmin()) {
    return true;
  }
  
  // İzin kontrolü
  if (this.permissions && 
      this.permissions[section] && 
      this.permissions[section][action] !== undefined) {
    return this.permissions[section][action];
  }
  
  return false;
};

module.exports = mongoose.model('Admin', AdminSchema);
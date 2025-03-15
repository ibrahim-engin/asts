const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const UserSchema = new mongoose.Schema({
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
    minlength: [6, 'Şifre en az 6 karakter olmalıdır'],
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
  phone: {
    type: String,
    trim: true,
    match: [/^[0-9]{10}$/, 'Geçerli bir telefon numarası giriniz (10 haneli, başında 0 olmadan)']
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  avatar: {
    type: String,
    default: 'default-avatar.png'
  },
  resetPasswordToken: String,
  resetPasswordExpire: Date,
  familyMembers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'FamilyMember'
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: {
    type: Date,
    default: Date.now
  },
  settings: {
    language: {
      type: String,
      enum: ['tr', 'en'],
      default: 'tr'
    },
    dateFormat: {
      type: String,
      enum: ['DD.MM.YYYY', 'MM.DD.YYYY', 'YYYY.MM.DD'],
      default: 'DD.MM.YYYY'
    },
    timeFormat: {
      type: String,
      enum: ['24', '12'],
      default: '24'
    },
    theme: {
      type: String,
      enum: ['light', 'dark'],
      default: 'light'
    },
    notifications: {
      email: {
        type: Boolean,
        default: true
      },
      push: {
        type: Boolean,
        default: true
      },
      reminders: {
        type: Boolean,
        default: true
      }
    }
  }
}, {
  timestamps: true, // createdAt ve updatedAt alanlarını otomatik ekler
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Şifreyi hashle
UserSchema.pre('save', async function(next) {
  // Şifre değişmediyse hash'leme
  if (!this.isModified('password')) {
    return next();
  }

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Tam adı döndüren virtual field
UserSchema.virtual('fullName').get(function() {
  return `${this.name} ${this.surname}`;
});

// Şifre karşılaştırma metodu
UserSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// JWT token oluşturma metodu
UserSchema.methods.getSignedJwtToken = function() {
  return jwt.sign(
    { id: this._id, role: this.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN }
  );
};

// Şifre sıfırlama tokeni oluşturma
UserSchema.methods.createResetPasswordToken = function() {
  // Token oluştur
  const resetToken = crypto.randomBytes(20).toString('hex');

  // Token'ı hashle ve modele kaydet
  this.resetPasswordToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');

  // Token'ın son kullanma tarihini ayarla (10 dk)
  this.resetPasswordExpire = Date.now() + 10 * 60 * 1000;

  return resetToken;
};

module.exports = mongoose.model('User', UserSchema);
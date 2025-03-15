const mongoose = require('mongoose');

const FamilyMemberSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Kullanıcı referansı gereklidir']
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
  relationship: {
    type: String,
    required: [true, 'İlişki türü gereklidir'],
    enum: ['anne', 'baba', 'eş', 'çocuk', 'kardeş', 'anneanne', 'babaanne', 'dede', 'torun', 'diğer'],
    default: 'diğer'
  },
  dateOfBirth: {
    type: Date,
    required: [true, 'Doğum tarihi gereklidir']
  },
  gender: {
    type: String,
    enum: ['kadın', 'erkek', 'diğer'],
    required: [true, 'Cinsiyet gereklidir']
  },
  bloodType: {
    type: String,
    enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', '0+', '0-', 'bilinmiyor'],
    default: 'bilinmiyor'
  },
  height: {
    type: Number,
    min: [0, 'Boy negatif olamaz'],
    max: [250, 'Boy 250 cm\'den fazla olamaz']
  },
  weight: {
    type: Number,
    min: [0, 'Kilo negatif olamaz'],
    max: [500, 'Kilo 500 kg\'dan fazla olamaz']
  },
  avatar: {
    type: String,
    default: 'default-member-avatar.png'
  },
  allergies: [{
    type: {
      type: String,
      enum: ['ilaç', 'gıda', 'böcek', 'çevresel', 'diğer'],
      required: [true, 'Alerji türü gereklidir']
    },
    name: {
      type: String,
      required: [true, 'Alerji adı gereklidir'],
      trim: true
    },
    severity: {
      type: String,
      enum: ['hafif', 'orta', 'şiddetli', 'ölümcül'],
      default: 'orta'
    },
    notes: String
  }],
  chronicDiseases: [{
    name: {
      type: String,
      required: [true, 'Hastalık adı gereklidir'],
      trim: true
    },
    diagnosisDate: Date,
    medications: [String],
    notes: String
  }],
  emergencyContact: {
    name: String,
    phone: String,
    relationship: String
  },
  isActive: {
    type: Boolean,
    default: true
  },
  notes: {
    type: String,
    maxlength: [1000, 'Notlar 1000 karakterden uzun olamaz']
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Tam adı döndüren virtual field
FamilyMemberSchema.virtual('fullName').get(function() {
  return `${this.name} ${this.surname}`;
});

// Yaşı hesaplayan virtual field
FamilyMemberSchema.virtual('age').get(function() {
  if (!this.dateOfBirth) return null;
  
  const today = new Date();
  const birthDate = new Date(this.dateOfBirth);
  
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  
  return age;
});

// BMI (Vücut Kitle İndeksi) hesaplayan virtual field
FamilyMemberSchema.virtual('bmi').get(function() {
  if (!this.height || !this.weight) return null;
  
  // BMI = kg / (metre cinsinden boy)^2
  const heightInMeters = this.height / 100;
  return (this.weight / (heightInMeters * heightInMeters)).toFixed(1);
});

// Özel statik sorgular
FamilyMemberSchema.statics.findByUserId = function(userId) {
  return this.find({ userId }).sort('name');
};

FamilyMemberSchema.statics.findActiveByUserId = function(userId) {
  return this.find({ userId, isActive: true }).sort('name');
};

FamilyMemberSchema.statics.findByCriteria = function(userId, criteria = {}) {
  const query = { userId, ...criteria };
  return this.find(query).sort('name');
};

// HealthData ile ilişki kuran virtual
FamilyMemberSchema.virtual('healthData', {
  ref: 'HealthData',
  localField: '_id',
  foreignField: 'familyMemberId',
  justOne: false
});

// MedicalHistory ile ilişki kuran virtual
FamilyMemberSchema.virtual('medicalHistory', {
  ref: 'MedicalHistory',
  localField: '_id',
  foreignField: 'familyMemberId',
  justOne: false
});

// Medication ile ilişki kuran virtual
FamilyMemberSchema.virtual('medications', {
  ref: 'Medication',
  localField: '_id',
  foreignField: 'familyMemberId',
  justOne: false
});

// Son eklenen sağlık verisini getiren metod
FamilyMemberSchema.methods.getLatestHealthData = async function() {
  const HealthData = mongoose.model('HealthData');
  return await HealthData.findOne({ familyMemberId: this._id })
    .sort({ measuredAt: -1 })
    .exec();
};

// Kullanıcının yeni bir aile üyesi eklendiğinde index üzerinde arama yapabilmek için
FamilyMemberSchema.index({ userId: 1, name: 1, surname: 1 });
FamilyMemberSchema.index({ userId: 1, isActive: 1 });

module.exports = mongoose.model('FamilyMember', FamilyMemberSchema);
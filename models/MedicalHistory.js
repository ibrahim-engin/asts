const mongoose = require('mongoose');

const MedicalHistorySchema = new mongoose.Schema({
  familyMemberId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'FamilyMember',
    required: [true, 'Aile üyesi referansı gereklidir']
  },
  type: {
    type: String,
    enum: ['diagnosis', 'surgery', 'hospitalization', 'vaccination', 'test', 'consultation', 'emergency', 'other'],
    required: [true, 'Tıbbi geçmiş türü gereklidir']
  },
  title: {
    type: String,
    required: [true, 'Başlık gereklidir'],
    trim: true,
    maxlength: [100, 'Başlık 100 karakterden uzun olamaz']
  },
  date: {
    type: Date,
    required: [true, 'Tarih gereklidir']
  },
  endDate: {
    type: Date
  },
  ongoing: {
    type: Boolean,
    default: false
  },
  doctor: {
    name: String,
    specialty: String,
    hospital: String,
    phone: String,
    email: String
  },
  location: {
    name: String,
    address: String,
    city: String,
    country: String,
    phone: String
  },
  // Teşhis bilgileri
  diagnosis: {
    name: String,
    icd10Code: String,
    severity: {
      type: String,
      enum: ['mild', 'moderate', 'severe', 'critical']
    },
    chronic: Boolean
  },
  // Ameliyat bilgileri
  surgery: {
    procedure: String,
    method: String,
    anesthesia: String,
    duration: Number, // dakika cinsinden
    complications: [String]
  },
  // Hastane yatışı bilgileri
  hospitalization: {
    reason: String,
    ward: String,
    roomNumber: String,
    durationDays: Number,
    dischargeReason: String
  },
  // Aşı bilgileri
  vaccination: {
    name: String,
    dose: String,
    manufacturer: String,
    lotNumber: String,
    nextDoseDate: Date
  },
  // Test bilgileri
  test: {
    name: String,
    results: String,
    referenceRange: String,
    interpretation: String
  },
  // İlaç tedavisi
  medications: [{
    name: String,
    dosage: String,
    frequency: String,
    startDate: Date,
    endDate: Date,
    ongoing: Boolean,
    reason: String
  }],
  // Teşhis sonrası öneriler
  recommendations: {
    dietChanges: String,
    activityRestrictions: String,
    followUpDate: Date,
    referrals: [String],
    otherRecommendations: String
  },
  // Dosya ekleri
  attachments: [{
    filename: String,
    originalName: String,
    mimeType: String,
    size: Number,
    path: String,
    uploadDate: {
      type: Date,
      default: Date.now
    },
    description: String
  }],
  // Semptomlar ve notlar
  symptoms: [String],
  notes: {
    type: String,
    maxlength: [2000, 'Notlar 2000 karakterden uzun olamaz']
  },
  importance: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium'
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Tarih aralığı veren virtual
MedicalHistorySchema.virtual('dateRange').get(function() {
  if (this.ongoing) {
    return `${new Date(this.date).toLocaleDateString()} - Devam ediyor`;
  } else if (this.endDate) {
    return `${new Date(this.date).toLocaleDateString()} - ${new Date(this.endDate).toLocaleDateString()}`;
  } else {
    return new Date(this.date).toLocaleDateString();
  }
});

// Süreyi hesaplayan virtual (gün cinsinden)
MedicalHistorySchema.virtual('duration').get(function() {
  if (this.ongoing) {
    const today = new Date();
    const start = new Date(this.date);
    return Math.floor((today - start) / (1000 * 60 * 60 * 24));
  } else if (this.endDate) {
    const end = new Date(this.endDate);
    const start = new Date(this.date);
    return Math.floor((end - start) / (1000 * 60 * 60 * 24));
  } else {
    return 0;
  }
});

// İlişkili sağlık verilerine referans
MedicalHistorySchema.virtual('healthData', {
  ref: 'HealthData',
  localField: 'familyMemberId',
  foreignField: 'familyMemberId',
  options: { sort: { measuredAt: -1 } },
  justOne: false
});

// İlaçlarla kolay ilişki kurma
MedicalHistorySchema.virtual('activeMedications', {
  ref: 'Medication',
  localField: 'familyMemberId',
  foreignField: 'familyMemberId',
  match: { isActive: true },
  justOne: false
});

// Statik sorgular
MedicalHistorySchema.statics.findByFamilyMemberId = function(familyMemberId, options = {}) {
  const query = { familyMemberId };
  
  // Eğer tip belirtilmişse filtrele
  if (options.type) {
    query.type = options.type;
  }
  
  // Eğer tarih aralığı belirtilmişse filtrele
  if (options.startDate) {
    query.date = { $gte: new Date(options.startDate) };
  }
  
  if (options.endDate) {
    query.date = query.date || {};
    query.date.$lte = new Date(options.endDate);
  }
  
  // Önem derecesine göre filtrele
  if (options.importance) {
    query.importance = options.importance;
  }
  
  return this.find(query).sort({ date: -1 });
};

// Kronik hastalıkları bul
MedicalHistorySchema.statics.findChronicConditions = function(familyMemberId) {
  return this.find({
    familyMemberId,
    type: 'diagnosis',
    'diagnosis.chronic': true
  }).sort({ date: -1 });
};

// En son hastane ziyaretleri
MedicalHistorySchema.statics.findRecentHospitalizations = function(familyMemberId, limit = 5) {
  return this.find({
    familyMemberId,
    type: { $in: ['hospitalization', 'emergency'] }
  })
  .sort({ date: -1 })
  .limit(limit);
};

// Belirli dönemde olan olayları bul
MedicalHistorySchema.statics.findByPeriod = function(familyMemberId, startDate, endDate) {
  return this.find({
    familyMemberId,
    $or: [
      // Başlangıç tarihi belirtilen aralıkta
      { date: { $gte: new Date(startDate), $lte: new Date(endDate) } },
      // Bitiş tarihi belirtilen aralıkta
      { endDate: { $gte: new Date(startDate), $lte: new Date(endDate) } },
      // Başlangıç tarihinden önce başlayıp, bitiş tarihinden sonra biten olaylar
      { 
        date: { $lte: new Date(startDate) },
        $or: [
          { endDate: { $gte: new Date(endDate) } },
          { ongoing: true }
        ]
      }
    ]
  }).sort({ date: -1 });
};

// Performans için indeksler
MedicalHistorySchema.index({ familyMemberId: 1, type: 1, date: -1 });
MedicalHistorySchema.index({ familyMemberId: 1, importance: 1 });
MedicalHistorySchema.index({ date: -1 });

module.exports = mongoose.model('MedicalHistory', MedicalHistorySchema);
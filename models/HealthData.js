const mongoose = require('mongoose');
const config = require('../config');

const HealthDataSchema = new mongoose.Schema({
  familyMemberId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'FamilyMember',
    required: [true, 'Aile üyesi referansı gereklidir']
  },
  measuredAt: {
    type: Date,
    default: Date.now,
    required: [true, 'Ölçüm tarihi gereklidir']
  },
  measuredBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  dataType: {
    type: String,
    enum: ['bloodSugar', 'bloodPressure', 'heartRate', 'weight', 'temperature', 'oxygen', 'stress', 'other'],
    required: [true, 'Veri türü gereklidir']
  },
  // Kan şekeri değerleri
  bloodSugar: {
    value: {
      type: Number,
      min: [0, 'Kan şekeri negatif olamaz'],
      max: [1000, 'Kan şekeri 1000 mg/dL\'den fazla olamaz']
    },
    unit: {
      type: String,
      enum: ['mg/dL', 'mmol/L'],
      default: 'mg/dL'
    },
    measurementType: {
      type: String,
      enum: ['fasting', 'postprandial', 'random'],
      default: 'random'
    },
    timeSinceLastMeal: {
      type: Number, // Dakika cinsinden
      min: [0, 'Son yemekten geçen süre negatif olamaz']
    }
  },
  // Tansiyon değerleri
  bloodPressure: {
    systolic: {
      type: Number,
      min: [0, 'Sistolik değer negatif olamaz'],
      max: [300, 'Sistolik değer 300 mmHg\'den fazla olamaz']
    },
    diastolic: {
      type: Number,
      min: [0, 'Diyastolik değer negatif olamaz'],
      max: [200, 'Diyastolik değer 200 mmHg\'den fazla olamaz']
    },
    unit: {
      type: String,
      enum: ['mmHg'],
      default: 'mmHg'
    },
    position: {
      type: String,
      enum: ['sitting', 'standing', 'lying'],
      default: 'sitting'
    }
  },
  // Nabız/Kalp Ritmi değerleri
  heartRate: {
    value: {
      type: Number,
      min: [0, 'Nabız negatif olamaz'],
      max: [300, 'Nabız 300 atım/dk\'dan fazla olamaz']
    },
    unit: {
      type: String,
      enum: ['bpm'],
      default: 'bpm'
    },
    activityLevel: {
      type: String,
      enum: ['rest', 'light', 'moderate', 'intense'],
      default: 'rest'
    }
  },
  // Kilo değerleri
  weight: {
    value: {
      type: Number,
      min: [0, 'Kilo negatif olamaz'],
      max: [500, 'Kilo 500 kg\'dan fazla olamaz']
    },
    unit: {
      type: String,
      enum: ['kg', 'lb'],
      default: 'kg'
    }
  },
  // Vücut sıcaklığı değerleri
  temperature: {
    value: {
      type: Number,
      min: [30, 'Vücut sıcaklığı 30°C\'den az olamaz'],
      max: [45, 'Vücut sıcaklığı 45°C\'den fazla olamaz']
    },
    unit: {
      type: String,
      enum: ['C', 'F'],
      default: 'C'
    },
    measurementMethod: {
      type: String,
      enum: ['oral', 'tympanic', 'axillary', 'rectal', 'forehead'],
      default: 'oral'
    }
  },
  // Oksijen satürasyonu değerleri
  oxygen: {
    value: {
      type: Number,
      min: [0, 'Oksijen satürasyonu negatif olamaz'],
      max: [100, 'Oksijen satürasyonu %100\'den fazla olamaz']
    },
    unit: {
      type: String,
      enum: ['%'],
      default: '%'
    }
  },
  // Stres seviyesi değerleri
  stress: {
    value: {
      type: Number,
      min: [0, 'Stres seviyesi negatif olamaz'],
      max: [10, 'Stres seviyesi 10\'dan fazla olamaz']
    },
    unit: {
      type: String,
      enum: ['level'],
      default: 'level'
    }
  },
  // Diğer ölçümler için esnek yapı
  other: {
    name: String,
    value: Number,
    unit: String
  },
  // Ölçüm durumu ve notları
  status: {
    type: String,
    enum: ['normal', 'warning', 'critical'],
    default: 'normal'
  },
  notes: {
    type: String,
    maxlength: [500, 'Notlar 500 karakterden uzun olamaz']
  },
  // Ölçümü etkileyen faktörler
  factors: {
    medication: Boolean,
    exercise: Boolean,
    diet: Boolean,
    illness: Boolean,
    stress: Boolean,
    details: String
  },
  // Cihazdan alınan ölçüm ise
  device: {
    name: String,
    manufacturer: String,
    model: String,
    isVerified: Boolean
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Ölçüm durumunu otomatik hesaplayan middleware
HealthDataSchema.pre('save', function(next) {
  // Status değeri zaten elle girilmişse dokunma
  if (this.status !== 'normal') {
    return next();
  }

  try {
    // Kan şekeri durumu
    if (this.dataType === 'bloodSugar' && this.bloodSugar && this.bloodSugar.value) {
      let refValues;
      
      if (this.bloodSugar.measurementType === 'fasting') {
        refValues = config.healthReferenceValues.bloodSugar.fasting;
      } else {
        refValues = config.healthReferenceValues.bloodSugar.postprandial;
      }
      
      const value = this.bloodSugar.value;
      
      if (value <= refValues.warning.low.max || value >= refValues.warning.high.min) {
        this.status = 'warning';
      }
      
      if (value <= refValues.warning.low.min || value >= refValues.warning.critical.min) {
        this.status = 'critical';
      }
    }
    
    // Tansiyon durumu
    else if (this.dataType === 'bloodPressure' && this.bloodPressure) {
      const systolicRef = config.healthReferenceValues.bloodPressure.systolic;
      const diastolicRef = config.healthReferenceValues.bloodPressure.diastolic;
      
      const systolic = this.bloodPressure.systolic;
      const diastolic = this.bloodPressure.diastolic;
      
      if (
        (systolic && (systolic <= systolicRef.warning.low.max || systolic >= systolicRef.warning.high.min)) ||
        (diastolic && (diastolic <= diastolicRef.warning.low.max || diastolic >= diastolicRef.warning.high.min))
      ) {
        this.status = 'warning';
      }
      
      if (
        (systolic && (systolic <= systolicRef.warning.low.min || systolic >= systolicRef.warning.critical.min)) ||
        (diastolic && (diastolic <= diastolicRef.warning.low.min || diastolic >= diastolicRef.warning.critical.min))
      ) {
        this.status = 'critical';
      }
    }
    
    // Kalp hızı durumu
    else if (this.dataType === 'heartRate' && this.heartRate && this.heartRate.value) {
      const refValues = config.healthReferenceValues.heartRate;
      const value = this.heartRate.value;
      
      if (value <= refValues.warning.low.max || value >= refValues.warning.high.min) {
        this.status = 'warning';
      }
      
      if (value <= refValues.warning.low.min || value >= refValues.warning.critical.min) {
        this.status = 'critical';
      }
    }
    
    next();
  } catch (error) {
    next(error);
  }
});

// Değer fonksiyonu - ilgili veri türüne göre değeri döndürür
HealthDataSchema.methods.getValue = function() {
  switch (this.dataType) {
    case 'bloodSugar':
      return this.bloodSugar ? this.bloodSugar.value : null;
    case 'bloodPressure':
      return this.bloodPressure ? `${this.bloodPressure.systolic}/${this.bloodPressure.diastolic}` : null;
    case 'heartRate':
      return this.heartRate ? this.heartRate.value : null;
    case 'weight':
      return this.weight ? this.weight.value : null;
    case 'temperature':
      return this.temperature ? this.temperature.value : null;
    case 'oxygen':
      return this.oxygen ? this.oxygen.value : null;
    case 'stress':
      return this.stress ? this.stress.value : null;
    case 'other':
      return this.other ? this.other.value : null;
    default:
      return null;
  }
};

// Birim fonksiyonu - ilgili veri türüne göre birimi döndürür
HealthDataSchema.methods.getUnit = function() {
  switch (this.dataType) {
    case 'bloodSugar':
      return this.bloodSugar ? this.bloodSugar.unit : 'mg/dL';
    case 'bloodPressure':
      return this.bloodPressure ? this.bloodPressure.unit : 'mmHg';
    case 'heartRate':
      return this.heartRate ? this.heartRate.unit : 'bpm';
    case 'weight':
      return this.weight ? this.weight.unit : 'kg';
    case 'temperature':
      return this.temperature ? this.temperature.unit : 'C';
    case 'oxygen':
      return this.oxygen ? this.oxygen.unit : '%';
    case 'stress':
      return this.stress ? this.stress.unit : 'level';
    case 'other':
      return this.other ? this.other.unit : '';
    default:
      return '';
  }
};

// Referans aralıklarını kontrol eden fonksiyon
HealthDataSchema.methods.isInNormalRange = function() {
  const value = this.getValue();
  if (value === null) return false;
  
  try {
    switch (this.dataType) {
      case 'bloodSugar': {
        const type = this.bloodSugar.measurementType;
        const refValues = type === 'fasting' 
          ? config.healthReferenceValues.bloodSugar.fasting 
          : config.healthReferenceValues.bloodSugar.postprandial;
          
        return value >= refValues.min && value <= refValues.max;
      }
      case 'bloodPressure': {
        const [systolic, diastolic] = value.split('/').map(Number);
        const systolicRef = config.healthReferenceValues.bloodPressure.systolic;
        const diastolicRef = config.healthReferenceValues.bloodPressure.diastolic;
        
        return systolic >= systolicRef.min && systolic <= systolicRef.max &&
               diastolic >= diastolicRef.min && diastolic <= diastolicRef.max;
      }
      case 'heartRate': {
        const refValues = config.healthReferenceValues.heartRate;
        return value >= refValues.min && value <= refValues.max;
      }
      default:
        return true;
    }
  } catch (error) {
    console.error('Range check error:', error);
    return false;
  }
};

// Performans için indeksler
HealthDataSchema.index({ familyMemberId: 1, dataType: 1, measuredAt: -1 });
HealthDataSchema.index({ familyMemberId: 1, status: 1 });
HealthDataSchema.index({ measuredAt: -1 });

module.exports = mongoose.model('HealthData', HealthDataSchema);
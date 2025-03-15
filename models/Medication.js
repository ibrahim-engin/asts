const mongoose = require('mongoose');

const MedicationSchema = new mongoose.Schema({
  familyMemberId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'FamilyMember',
    required: [true, 'Aile üyesi referansı gereklidir']
  },
  name: {
    type: String,
    required: [true, 'İlaç adı gereklidir'],
    trim: true,
    maxlength: [100, 'İlaç adı 100 karakterden uzun olamaz']
  },
  genericName: {
    type: String,
    trim: true
  },
  dosage: {
    value: {
      type: Number,
      required: [true, 'Dozaj değeri gereklidir']
    },
    unit: {
      type: String,
      required: [true, 'Dozaj birimi gereklidir'],
      enum: ['mg', 'g', 'mcg', 'mL', 'IU', 'tsp', 'tbsp', 'tablet', 'kapsül', 'damla', 'ampul', 'ünite', 'diğer']
    },
    form: {
      type: String,
      enum: ['tablet', 'kapsül', 'şurup', 'damla', 'merhem', 'sprey', 'iğne', 'patch', 'inhaler', 'diğer'],
      default: 'tablet'
    }
  },
  schedule: {
    times: [{
      time: String, // Örn: "08:00"
      dosage: Number, // Kaç adet/damla
      withFood: Boolean
    }],
    frequency: {
      type: String,
      enum: ['günde', 'haftada', 'ayda'],
      default: 'günde'
    },
    frequencyCount: {
      type: Number,
      default: 1
    },
    daysOfWeek: [{
      type: String,
      enum: ['pazartesi', 'salı', 'çarşamba', 'perşembe', 'cuma', 'cumartesi', 'pazar']
    }],
    asNeeded: {
      type: Boolean,
      default: false
    },
    instructions: {
      type: String,
      maxlength: [200, 'Talimatlar 200 karakterden uzun olamaz']
    }
  },
  purpose: {
    type: String,
    maxlength: [200, 'Kullanım amacı 200 karakterden uzun olamaz']
  },
  prescribedBy: {
    name: String,
    specialty: String,
    hospital: String,
    date: Date
  },
  pharmacy: {
    name: String,
    address: String,
    phone: String
  },
  startDate: {
    type: Date,
    required: [true, 'Başlangıç tarihi gereklidir']
  },
  endDate: Date,
  duration: Number, // Gün cinsinden
  isActive: {
    type: Boolean,
    default: true
  },
  isRegular: {
    type: Boolean,
    default: true
  },
  isCritical: {
    type: Boolean,
    default: false
  },
  sideEffects: [String],
  interactions: [{
    medicationName: String,
    description: String,
    severity: {
      type: String,
      enum: ['mild', 'moderate', 'severe']
    }
  }],
  inventory: {
    unitsRemaining: Number,
    unitsTotal: Number,
    refillDate: Date,
    refillReminder: Boolean,
    reminderDays: {
      type: Number,
      default: 3
    }
  },
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
  notes: {
    type: String,
    maxlength: [500, 'Notlar 500 karakterden uzun olamaz']
  },
  // İlacın alınma takibi
  medicationLogs: [{
    scheduledTime: {
      type: Date,
      required: true
    },
    takenTime: Date,
    status: {
      type: String,
      enum: ['taken', 'skipped', 'postponed', 'pending'],
      default: 'pending'
    },
    dosageTaken: Number,
    notes: String,
    symptomsAfter: [String],
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  }],
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

// İlaç adının tam versiyonunu oluşturan virtual
MedicationSchema.virtual('fullName').get(function() {
  return `${this.name} ${this.dosage.value}${this.dosage.unit} ${this.dosage.form}`;
});

// Durum açıklamasını döndüren virtual
MedicationSchema.virtual('statusText').get(function() {
  if (this.isActive) {
    if (this.endDate) {
      return `Aktif (${new Date(this.endDate).toLocaleDateString()} tarihinde sona erecek)`;
    } else {
      return 'Aktif (süresiz)';
    }
  } else {
    return 'Sona erdi';
  }
});

// Günlük toplam dozajı hesaplayan virtual
MedicationSchema.virtual('dailyDosage').get(function() {
  if (!this.schedule || !this.schedule.times || this.schedule.times.length === 0) return 0;
  
  let totalDailyDosage = 0;
  
  // Her bir zaman için dozajları topla
  for (const time of this.schedule.times) {
    totalDailyDosage += time.dosage || 1;
  }
  
  // Eğer haftalık veya aylık ise günlük ortalamaya çevir
  if (this.schedule.frequency === 'haftada') {
    if (this.schedule.daysOfWeek && this.schedule.daysOfWeek.length > 0) {
      totalDailyDosage = (totalDailyDosage * this.schedule.daysOfWeek.length) / 7;
    } else {
      totalDailyDosage = (totalDailyDosage * this.schedule.frequencyCount) / 7;
    }
  } else if (this.schedule.frequency === 'ayda') {
    totalDailyDosage = (totalDailyDosage * this.schedule.frequencyCount) / 30;
  }
  
  return totalDailyDosage * this.dosage.value;
});

// İlaç için kalan gün sayısını hesaplayan virtual
MedicationSchema.virtual('daysRemaining').get(function() {
  if (!this.isActive) return 0;
  
  if (this.endDate) {
    const today = new Date();
    const end = new Date(this.endDate);
    return Math.max(0, Math.floor((end - today) / (1000 * 60 * 60 * 24)));
  }
  
  if (this.inventory && this.inventory.unitsRemaining > 0) {
    const dailyUsage = this.getDailyUsageUnits();
    if (dailyUsage > 0) {
      return Math.floor(this.inventory.unitsRemaining / dailyUsage);
    }
  }
  
  return -1; // Sonsuz
});

// İlacın günlük kullanım miktarını hesaplayan metod (birim cinsinden)
MedicationSchema.methods.getDailyUsageUnits = function() {
  if (!this.schedule || !this.schedule.times || this.schedule.times.length === 0) return 0;
  
  let totalDailyUnits = 0;
  
  // Her bir zaman için dozajları topla
  for (const time of this.schedule.times) {
    totalDailyUnits += time.dosage || 1;
  }
  
  // Eğer haftalık veya aylık ise günlük ortalamaya çevir
  if (this.schedule.frequency === 'haftada') {
    if (this.schedule.daysOfWeek && this.schedule.daysOfWeek.length > 0) {
      totalDailyUnits = (totalDailyUnits * this.schedule.daysOfWeek.length) / 7;
    } else {
      totalDailyUnits = (totalDailyUnits * this.schedule.frequencyCount) / 7;
    }
  } else if (this.schedule.frequency === 'ayda') {
    totalDailyUnits = (totalDailyUnits * this.schedule.frequencyCount) / 30;
  }
  
  return totalDailyUnits;
};

// İlaç alınma durumunu kontrol eden metod
MedicationSchema.methods.checkMedicationStatus = function() {
  if (!this.isActive) return { adherenceRate: 0, missedDoses: 0, totalDoses: 0 };
  
  // Son 30 gün içindeki kayıtları analiz et
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  const recentLogs = this.medicationLogs.filter(log => new Date(log.scheduledTime) >= thirtyDaysAgo);
  
  const totalDoses = recentLogs.length;
  const takenDoses = recentLogs.filter(log => log.status === 'taken').length;
  const missedDoses = recentLogs.filter(log => log.status === 'skipped').length;
  
  const adherenceRate = totalDoses > 0 ? (takenDoses / totalDoses) * 100 : 0;
  
  return {
    adherenceRate: parseFloat(adherenceRate.toFixed(1)),
    missedDoses,
    totalDoses
  };
};

// Günün ilaç programını oluşturan statik metod
MedicationSchema.statics.getDailySchedule = async function(familyMemberId, date = new Date()) {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);
  
  // İlgili aile üyesinin aktif ilaçlarını bul
  const medications = await this.find({
    familyMemberId,
    isActive: true,
    $or: [
      { endDate: null },
      { endDate: { $gte: startOfDay } }
    ],
    startDate: { $lte: endOfDay }
  });
  
  const dayOfWeek = ['pazar', 'pazartesi', 'salı', 'çarşamba', 'perşembe', 'cuma', 'cumartesi'][date.getDay()];
  
  const schedule = [];
  
  for (const medication of medications) {
    // İlacın bugün alınması gerekiyorsa
    if (medication.schedule && medication.schedule.times && medication.schedule.times.length > 0) {
      // Günlük alınması gereken bir ilaç
      if (medication.schedule.frequency === 'günde') {
        for (const time of medication.schedule.times) {
          schedule.push({
            medicationId: medication._id,
            medicationName: medication.name,
            fullName: medication.fullName,
            time: time.time,
            dosage: time.dosage || 1,
            withFood: time.withFood,
            instructions: medication.schedule.instructions,
            isCritical: medication.isCritical
          });
        }
      }
      // Haftalık alınması gereken bir ilaç
      else if (medication.schedule.frequency === 'haftada') {
        // Belirli günlerde alınıyorsa
        if (medication.schedule.daysOfWeek && medication.schedule.daysOfWeek.includes(dayOfWeek)) {
          for (const time of medication.schedule.times) {
            schedule.push({
              medicationId: medication._id,
              medicationName: medication.name,
              fullName: medication.fullName,
              time: time.time,
              dosage: time.dosage || 1,
              withFood: time.withFood,
              instructions: medication.schedule.instructions,
              isCritical: medication.isCritical
            });
          }
        }
      }
      // Aylık alınması gereken bir ilaç - aylık hesaplama için daha karmaşık mantık gerekir
      // Bu örnekte basitçe ayın ilk günü alınacak şekilde yapılandırıldı
      else if (medication.schedule.frequency === 'ayda' && date.getDate() <= medication.schedule.frequencyCount) {
        for (const time of medication.schedule.times) {
          schedule.push({
            medicationId: medication._id,
            medicationName: medication.name,
            fullName: medication.fullName,
            time: time.time,
            dosage: time.dosage || 1,
            withFood: time.withFood,
            instructions: medication.schedule.instructions,
            isCritical: medication.isCritical
          });
        }
      }
    }
  }
  
  // Zamanlarına göre sırala
  return schedule.sort((a, b) => {
    if (a.time < b.time) return -1;
    if (a.time > b.time) return 1;
    return 0;
  });
};

// Performans için indeksler
MedicationSchema.index({ familyMemberId: 1, isActive: 1 });
MedicationSchema.index({ familyMemberId: 1, name: 1 });
MedicationSchema.index({ startDate: -1, endDate: 1 });
MedicationSchema.index({ isCritical: 1 });

module.exports = mongoose.model('Medication', MedicationSchema);
const mongoose = require('mongoose');

const ReminderSchema = new mongoose.Schema({
  familyMemberId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'FamilyMember',
    required: [true, 'Aile üyesi referansı gereklidir']
  },
  type: {
    type: String,
    enum: [
      'medication', 'measurement', 'appointment', 'activity', 
      'nutrition', 'water', 'custom'
    ],
    required: [true, 'Hatırlatıcı türü gereklidir']
  },
  title: {
    type: String,
    required: [true, 'Başlık gereklidir'],
    trim: true,
    maxlength: [100, 'Başlık 100 karakterden uzun olamaz']
  },
  description: {
    type: String,
    maxlength: [500, 'Açıklama 500 karakterden uzun olamaz']
  },
  // İlaç hatırlatıcısı için
  medication: {
    medicationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Medication'
    },
    dosage: String,
    withFood: Boolean,
    instructions: String
  },
  // Ölçüm hatırlatıcısı için
  measurement: {
    type: {
      type: String,
      enum: ['bloodSugar', 'bloodPressure', 'weight', 'temperature', 'other']
    },
    fasting: Boolean,
    instructions: String
  },
  // Randevu hatırlatıcısı için
  appointment: {
    doctorName: String,
    specialty: String,
    hospital: String,
    address: String,
    phone: String,
    reason: String,
    instructions: String
  },
  // Zaman ayarları
  schedule: {
    startDate: {
      type: Date,
      required: [true, 'Başlangıç tarihi gereklidir']
    },
    endDate: Date,
    time: {
      type: String,
      match: [/^([01]\d|2[0-3]):([0-5]\d)$/, 'Geçerli bir saat formatı giriniz (HH:MM)'],
      required: [true, 'Saat gereklidir']
    },
    frequency: {
      type: String,
      enum: ['once', 'daily', 'weekly', 'monthly', 'custom'],
      default: 'daily'
    },
    // daily için -> her gün
    // weekly için -> haftanın belirli günleri
    daysOfWeek: [{
      type: String,
      enum: ['pazartesi', 'salı', 'çarşamba', 'perşembe', 'cuma', 'cumartesi', 'pazar']
    }],
    // monthly için -> ayın belirli günleri
    daysOfMonth: [{
      type: Number,
      min: [1, 'Gün değeri 1\'den küçük olamaz'],
      max: [31, 'Gün değeri 31\'den büyük olamaz']
    }],
    // custom için -> özel tekrarlama
    customInterval: {
      value: {
        type: Number,
        min: [1, 'Aralık değeri 1\'den küçük olamaz']
      },
      unit: {
        type: String,
        enum: ['gün', 'hafta', 'ay']
      }
    },
    // Son hatırlatma için takip
    lastScheduled: Date,
    nextScheduled: Date
  },
  // Bildirim ayarları
  notification: {
    // Birden fazla hatırlatma (15 dk önce, 1 saat önce gibi)
    reminderTimes: [{
      type: Number, // Dakika cinsinden
      min: [0, 'Hatırlatma zamanı negatif olamaz']
    }],
    channels: {
      app: {
        type: Boolean,
        default: true
      },
      email: {
        type: Boolean,
        default: false
      },
      sms: {
        type: Boolean,
        default: false
      }
    },
    sound: {
      type: String,
      default: 'default'
    },
    vibration: {
      type: Boolean,
      default: true
    },
    repeat: {
      enabled: {
        type: Boolean,
        default: false
      },
      interval: {
        type: Number, // Dakika cinsinden
        default: 5,
        min: [1, 'Tekrarlama aralığı 1 dakikadan az olamaz']
      },
      maxCount: {
        type: Number,
        default: 3,
        min: [1, 'Maksimum tekrarlama sayısı 1\'den az olamaz']
      }
    }
  },
  // Öncelik seviyesi
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium'
  },
  // Aktif/Pasif durumu
  isActive: {
    type: Boolean,
    default: true
  },
  // Tamamlanma durumu
  completionHistory: [{
    scheduledTime: {
      type: Date,
      required: true
    },
    completedTime: Date,
    status: {
      type: String,
      enum: ['completed', 'skipped', 'missed'],
      required: true
    },
    notes: String
  }],
  // İstatistikler
  stats: {
    totalScheduled: {
      type: Number,
      default: 0
    },
    totalCompleted: {
      type: Number,
      default: 0
    },
    totalSkipped: {
      type: Number,
      default: 0
    },
    totalMissed: {
      type: Number,
      default: 0
    },
    adherenceRate: {
      type: Number,
      default: 0
    }
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

// Bir sonraki hatırlatıcıyı zamanla
ReminderSchema.methods.scheduleNext = function() {
  const now = new Date();
  
  // Hatırlatıcı aktif değilse veya bitiş tarihi geçmişse, bir sonraki zamanı hesaplama
  if (!this.isActive || (this.schedule.endDate && now > this.schedule.endDate)) {
    this.schedule.nextScheduled = null;
    return null;
  }
  
  // Şu anki tarihi ve zamanı al
  const currentDate = new Date(now);
  currentDate.setHours(0, 0, 0, 0);
  
  // Hatırlatıcının zamanını al
  const [hour, minute] = this.schedule.time.split(':').map(Number);
  
  // Bir sonraki hatırlatıcı zamanını hesapla
  let nextDate = null;
  
  if (this.schedule.frequency === 'once') {
    // Tek seferlik hatırlatıcılar için
    nextDate = new Date(this.schedule.startDate);
    nextDate.setHours(hour, minute, 0, 0);
    
    // Eğer zaman geçtiyse, hatırlatıcıyı iptal et
    if (nextDate < now) {
      this.schedule.nextScheduled = null;
      return null;
    }
  } 
  else if (this.schedule.frequency === 'daily') {
    // Günlük hatırlatıcılar için
    nextDate = new Date(currentDate);
    nextDate.setHours(hour, minute, 0, 0);
    
    // Eğer bugünün zamanı geçtiyse, yarına ayarla
    if (nextDate < now) {
      nextDate.setDate(nextDate.getDate() + 1);
    }
  } 
  else if (this.schedule.frequency === 'weekly') {
    // Haftalık hatırlatıcılar için
    
    // Eğer gün belirtilmemişse, başlangıç gününü kullan
    if (!this.schedule.daysOfWeek || this.schedule.daysOfWeek.length === 0) {
      const startDay = new Date(this.schedule.startDate).getDay();
      this.schedule.daysOfWeek = [['pazar', 'pazartesi', 'salı', 'çarşamba', 'perşembe', 'cuma', 'cumartesi'][startDay]];
    }
    
    // Türkçe gün adlarını sayısal indekse dönüştür
    const dayMap = {
      'pazar': 0,
      'pazartesi': 1,
      'salı': 2,
      'çarşamba': 3,
      'perşembe': 4,
      'cuma': 5,
      'cumartesi': 6
    };
    
    // Bugünün gün indeksi
    const today = now.getDay();
    
    // Seçili günlerin sayısal indeksleri
    const selectedDays = this.schedule.daysOfWeek.map(day => dayMap[day]).sort((a, b) => a - b);
    
    // Bugünden sonraki ilk gün indeksi
    let nextDayIndex = selectedDays.find(day => day > today);
    
    if (nextDayIndex === undefined) {
      // Eğer bugünden sonra gün yoksa, haftanın başındaki ilk günü al
      nextDayIndex = selectedDays[0];
      nextDate = new Date(currentDate);
      nextDate.setDate(nextDate.getDate() + (7 - today + nextDayIndex));
    } else {
      // Bugünden sonraki gün
      nextDate = new Date(currentDate);
      nextDate.setDate(nextDate.getDate() + (nextDayIndex - today));
    }
    
    // Saati ayarla
    nextDate.setHours(hour, minute, 0, 0);
    
    // Eğer bugün hatırlatma günüyse ve saat geçmediyse
    if (selectedDays.includes(today) && new Date(currentDate.setHours(hour, minute, 0, 0)) > now) {
      nextDate = new Date(currentDate);
      nextDate.setHours(hour, minute, 0, 0);
    }
  } 
  else if (this.schedule.frequency === 'monthly') {
    // Aylık hatırlatıcılar için
    
    // Eğer gün belirtilmemişse, başlangıç gününü kullan
    if (!this.schedule.daysOfMonth || this.schedule.daysOfMonth.length === 0) {
      const startDay = new Date(this.schedule.startDate).getDate();
      this.schedule.daysOfMonth = [startDay];
    }
    
    // Bugünün günü
    const today = now.getDate();
    
    // Seçili günler
    const selectedDays = [...this.schedule.daysOfMonth].sort((a, b) => a - b);
    
    // Bugünden sonraki ilk gün
    let nextDay = selectedDays.find(day => day > today);
    
    if (nextDay === undefined) {
      // Eğer bugünden sonra gün yoksa, sonraki ayın ilk gününü al
      nextDay = selectedDays[0];
      nextDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, nextDay);
    } else {
      // Bugünden sonraki gün
      nextDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), nextDay);
    }
    
    // Saati ayarla
    nextDate.setHours(hour, minute, 0, 0);
    
    // Eğer bugün hatırlatma günüyse ve saat geçmediyse
    if (selectedDays.includes(today) && new Date(currentDate.setHours(hour, minute, 0, 0)) > now) {
      nextDate = new Date(currentDate);
      nextDate.setHours(hour, minute, 0, 0);
    }
  } 
  else if (this.schedule.frequency === 'custom') {
    // Özel aralıklı hatırlatıcılar için
    
    if (!this.schedule.lastScheduled) {
      // Eğer hiç planlanmamışsa, başlangıç tarihini kullan
      nextDate = new Date(this.schedule.startDate);
      nextDate.setHours(hour, minute, 0, 0);
      
      // Eğer başlangıç zamanı geçtiyse, özel aralığı ekle
      if (nextDate < now) {
        if (this.schedule.customInterval.unit === 'gün') {
          nextDate.setDate(nextDate.getDate() + this.schedule.customInterval.value);
        } else if (this.schedule.customInterval.unit === 'hafta') {
          nextDate.setDate(nextDate.getDate() + (this.schedule.customInterval.value * 7));
        } else if (this.schedule.customInterval.unit === 'ay') {
          nextDate.setMonth(nextDate.getMonth() + this.schedule.customInterval.value);
        }
      }
    } else {
      // Son planlanan zamandan sonraki zamanı hesapla
      nextDate = new Date(this.schedule.lastScheduled);
      
      if (this.schedule.customInterval.unit === 'gün') {
        nextDate.setDate(nextDate.getDate() + this.schedule.customInterval.value);
      } else if (this.schedule.customInterval.unit === 'hafta') {
        nextDate.setDate(nextDate.getDate() + (this.schedule.customInterval.value * 7));
      } else if (this.schedule.customInterval.unit === 'ay') {
        nextDate.setMonth(nextDate.getMonth() + this.schedule.customInterval.value);
      }
      
      nextDate.setHours(hour, minute, 0, 0);
    }
  }
  
  // Eğer bitiş tarihi varsa kontrol et
  if (this.schedule.endDate && nextDate > this.schedule.endDate) {
    this.schedule.nextScheduled = null;
    return null;
  }
  
  this.schedule.nextScheduled = nextDate;
  return nextDate;
};

// Hatırlatıcı durumunu kaydet
ReminderSchema.methods.markCompletion = function(status, notes) {
  const now = new Date();
  
  if (!this.schedule.nextScheduled) {
    return false;
  }
  
  // Tamamlanma kaydını ekle
  this.completionHistory.push({
    scheduledTime: this.schedule.nextScheduled,
    completedTime: now,
    status: status,
    notes: notes || ''
  });
  
  // İstatistikleri güncelle
  this.stats.totalScheduled++;
  
  if (status === 'completed') {
    this.stats.totalCompleted++;
  } else if (status === 'skipped') {
    this.stats.totalSkipped++;
  } else if (status === 'missed') {
    this.stats.totalMissed++;
  }
  
  // Uyum oranını hesapla
  if (this.stats.totalScheduled > 0) {
    this.stats.adherenceRate = (this.stats.totalCompleted / this.stats.totalScheduled) * 100;
  }
  
  // Son planlanan zamanı güncelle
  this.schedule.lastScheduled = this.schedule.nextScheduled;
  
  // Bir sonraki zamanı hesapla
  this.scheduleNext();
  
  return true;
};

// Tek seferlik hatırlatıcı için uygunluk kontrolü
ReminderSchema.pre('save', function(next) {
  // Eğer tek seferlik bir hatırlatıcıysa ve bitiş tarihi yoksa
  if (this.schedule.frequency === 'once' && !this.schedule.endDate) {
    // Başlangıç tarihini bitiş tarihi olarak ayarla
    const startDate = new Date(this.schedule.startDate);
    const [hour, minute] = this.schedule.time.split(':').map(Number);
    startDate.setHours(hour, minute, 0, 0);
    
    // Bir gün ekle (ihtiyati olarak)
    startDate.setDate(startDate.getDate() + 1);
    this.schedule.endDate = startDate;
  }
  
  next();
});

// İlk kaydedildiğinde bir sonraki zamanı hesapla
ReminderSchema.pre('save', function(next) {
  if (this.isNew || !this.schedule.nextScheduled) {
    this.scheduleNext();
  }
  
  next();
});

// Hatırlatıcı tipine göre başlık formatı
ReminderSchema.virtual('typeTitle').get(function() {
  const typeMap = {
    'medication': 'İlaç',
    'measurement': 'Ölçüm',
    'appointment': 'Randevu',
    'activity': 'Aktivite',
    'nutrition': 'Beslenme',
    'water': 'Su İçme',
    'custom': 'Özel'
  };
  
  return `${typeMap[this.type] || this.type} Hatırlatıcısı`;
});

// Tekrarlama frekansı metni
ReminderSchema.virtual('frequencyText').get(function() {
  const frequencyMap = {
    'once': 'Bir kere',
    'daily': 'Her gün',
    'weekly': 'Haftalık',
    'monthly': 'Aylık',
    'custom': 'Özel'
  };
  
  let text = frequencyMap[this.schedule.frequency] || this.schedule.frequency;
  
  if (this.schedule.frequency === 'weekly' && this.schedule.daysOfWeek && this.schedule.daysOfWeek.length > 0) {
    const days = this.schedule.daysOfWeek.map(day => {
      const dayMap = {
        'pazartesi': 'Pazartesi',
        'salı': 'Salı',
        'çarşamba': 'Çarşamba',
        'perşembe': 'Perşembe',
        'cuma': 'Cuma',
        'cumartesi': 'Cumartesi',
        'pazar': 'Pazar'
      };
      return dayMap[day] || day;
    });
    
    text += ` (${days.join(', ')})`;
  } else if (this.schedule.frequency === 'monthly' && this.schedule.daysOfMonth && this.schedule.daysOfMonth.length > 0) {
    text += ` (Ayın ${this.schedule.daysOfMonth.join(', ')}. günleri)`;
  } else if (this.schedule.frequency === 'custom' && this.schedule.customInterval) {
    const unitMap = {
      'gün': 'gün',
      'hafta': 'hafta',
      'ay': 'ay'
    };
    
    const unit = unitMap[this.schedule.customInterval.unit] || this.schedule.customInterval.unit;
    text += ` (Her ${this.schedule.customInterval.value} ${unit})`;
  }
  
  return text;
});

// Bu günün hatırlatıcılarını bul
ReminderSchema.statics.findTodayReminders = function(familyMemberId) {
  const now = new Date();
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);
  
  const endOfDay = new Date(now);
  endOfDay.setHours(23, 59, 59, 999);
  
  return this.find({
    familyMemberId,
    isActive: true,
    'schedule.nextScheduled': {
      $gte: startOfDay,
      $lte: endOfDay
    }
  }).sort({ 'schedule.nextScheduled': 1 });
};

// Yaklaşan hatırlatıcıları bul
ReminderSchema.statics.findUpcomingReminders = function(familyMemberId, days = 7) {
  const now = new Date();
  const future = new Date(now);
  future.setDate(future.getDate() + days);
  
  return this.find({
    familyMemberId,
    isActive: true,
    'schedule.nextScheduled': {
      $gte: now,
      $lte: future
    }
  }).sort({ 'schedule.nextScheduled': 1 });
};

// Performans için indeksler
ReminderSchema.index({ familyMemberId: 1, isActive: 1, 'schedule.nextScheduled': 1 });
ReminderSchema.index({ familyMemberId: 1, type: 1 });
ReminderSchema.index({ 'schedule.nextScheduled': 1 });

module.exports = mongoose.model('Reminder', ReminderSchema);
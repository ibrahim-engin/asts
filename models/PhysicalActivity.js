const mongoose = require('mongoose');

const PhysicalActivitySchema = new mongoose.Schema({
  familyMemberId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'FamilyMember',
    required: [true, 'Aile üyesi referansı gereklidir']
  },
  activityType: {
    type: String,
    enum: [
      'yürüyüş', 'koşu', 'bisiklet', 'yüzme', 'fitness', 'yoga', 'pilates', 
      'dans', 'futbol', 'basketbol', 'tenis', 'voleybol', 'golf', 'dağcılık', 
      'ev_egzersizi', 'bahçe_işleri', 'merdiven_çıkma', 'diğer'
    ],
    required: [true, 'Aktivite türü gereklidir']
  },
  startTime: {
    type: Date,
    required: [true, 'Başlangıç zamanı gereklidir']
  },
  endTime: {
    type: Date
  },
  duration: {
    type: Number, // Dakika cinsinden
    min: [0, 'Süre negatif olamaz'],
    required: [true, 'Süre gereklidir']
  },
  distance: {
    value: {
      type: Number,
      min: [0, 'Mesafe negatif olamaz']
    },
    unit: {
      type: String,
      enum: ['km', 'm', 'mil'],
      default: 'km'
    }
  },
  steps: {
    type: Number,
    min: [0, 'Adım sayısı negatif olamaz']
  },
  calories: {
    type: Number,
    min: [0, 'Kalori değeri negatif olamaz']
  },
  intensity: {
    type: String,
    enum: ['hafif', 'orta', 'yüksek', 'maksimum'],
    default: 'orta'
  },
  heartRate: {
    average: {
      type: Number,
      min: [0, 'Ortalama kalp ritmi negatif olamaz']
    },
    max: {
      type: Number,
      min: [0, 'Maksimum kalp ritmi negatif olamaz']
    },
    min: {
      type: Number,
      min: [0, 'Minimum kalp ritmi negatif olamaz']
    }
  },
  locationData: {
    startLocation: {
      latitude: Number,
      longitude: Number,
      name: String
    },
    endLocation: {
      latitude: Number,
      longitude: Number,
      name: String
    },
    route: [{
      latitude: Number,
      longitude: Number,
      elevation: Number,
      timestamp: Date
    }]
  },
  weather: {
    temperature: Number,
    condition: String,
    humidity: Number,
    windSpeed: Number
  },
  equipment: [String],
  indoors: {
    type: Boolean,
    default: false
  },
  groupActivity: {
    type: Boolean,
    default: false
  },
  groupMembers: [String],
  performanceMetrics: {
    pace: {
      value: Number, // Dakika/km veya dakika/mil
      unit: {
        type: String,
        enum: ['min/km', 'min/mil'],
        default: 'min/km'
      }
    },
    speed: {
      value: Number,
      unit: {
        type: String,
        enum: ['km/s', 'km/dk', 'km/sa', 'm/s', 'mil/sa'],
        default: 'km/sa'
      }
    },
    elevation: {
      gain: Number, // Metre cinsinden
      loss: Number, // Metre cinsinden
      max: Number,
      min: Number
    },
    cadence: Number, // Adım/dakika veya devir/dakika
    strokes: Number, // Yüzme için
    laps: Number
  },
  bloodSugar: {
    before: {
      value: Number,
      unit: {
        type: String,
        enum: ['mg/dL', 'mmol/L'],
        default: 'mg/dL'
      }
    },
    after: {
      value: Number,
      unit: {
        type: String,
        enum: ['mg/dL', 'mmol/L'],
        default: 'mg/dL'
      }
    }
  },
  bloodPressure: {
    before: {
      systolic: Number,
      diastolic: Number,
      unit: {
        type: String,
        enum: ['mmHg'],
        default: 'mmHg'
      }
    },
    after: {
      systolic: Number,
      diastolic: Number,
      unit: {
        type: String,
        enum: ['mmHg'],
        default: 'mmHg'
      }
    }
  },
  perceivedExertion: {
    type: Number,
    min: [0, 'Algılanan zorluk 0\'dan az olamaz'],
    max: [10, 'Algılanan zorluk 10\'dan fazla olamaz']
  },
  mood: {
    before: {
      type: String,
      enum: ['çok_kötü', 'kötü', 'normal', 'iyi', 'çok_iyi']
    },
    after: {
      type: String,
      enum: ['çok_kötü', 'kötü', 'normal', 'iyi', 'çok_iyi']
    }
  },
  energyLevel: {
    before: {
      type: Number,
      min: [0, 'Enerji seviyesi 0\'dan az olamaz'],
      max: [10, 'Enerji seviyesi 10\'dan fazla olamaz']
    },
    after: {
      type: Number,
      min: [0, 'Enerji seviyesi 0\'dan az olamaz'],
      max: [10, 'Enerji seviyesi 10\'dan fazla olamaz']
    }
  },
  hydration: {
    before: {
      type: Number,
      min: [0, 'Hidrasyon seviyesi 0\'dan az olamaz'],
      max: [10, 'Hidrasyon seviyesi 10\'dan fazla olamaz']
    },
    during: {
      type: Number, // ml cinsinden
      min: [0, 'Hidrasyon miktarı negatif olamaz']
    }
  },
  symptoms: [{
    type: {
      type: String,
      enum: [
        'kas_ağrısı', 'eklem_ağrısı', 'nefes_darlığı', 'baş_dönmesi', 
        'bulantı', 'aşırı_terleme', 'kramp', 'yorgunluk', 'diğer'
      ],
      required: [true, 'Semptom türü gereklidir']
    },
    severity: {
      type: Number,
      min: [1, 'Şiddet değeri 1\'den az olamaz'],
      max: [10, 'Şiddet değeri 10\'dan fazla olamaz']
    },
    time: {
      type: String,
      enum: ['before', 'during', 'after'],
      default: 'during'
    },
    notes: String
  }],
  goals: {
    targetDistance: Number,
    targetDuration: Number,
    targetCalories: Number,
    targetSteps: Number,
    achieved: {
      type: Boolean,
      default: false
    }
  },
  notes: {
    type: String,
    maxlength: [500, 'Notlar 500 karakterden uzun olamaz']
  },
  activityPhoto: {
    filename: String,
    originalName: String,
    mimeType: String,
    size: Number,
    path: String,
    uploadDate: {
      type: Date,
      default: Date.now
    }
  },
  source: {
    type: String,
    enum: ['manual', 'app', 'wearable', 'imported'],
    default: 'manual'
  },
  deviceInfo: {
    name: String,
    manufacturer: String,
    model: String,
    version: String
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Süreyi otomatik hesaplayan pre-save middleware
PhysicalActivitySchema.pre('save', function(next) {
  // Eğer hem başlangıç hem de bitiş zamanı varsa ve süre belirtilmediyse
  if (this.startTime && this.endTime && !this.duration) {
    const startTime = new Date(this.startTime);
    const endTime = new Date(this.endTime);
    
    // Saniye cinsinden farkı alıp dakikaya çevir
    this.duration = Math.round((endTime - startTime) / (1000 * 60));
  }
  
  next();
});

// Kalori hesaplama fonksiyonu
PhysicalActivitySchema.methods.calculateCalories = function(weight) {
  if (!weight || this.calories) return;
  
  // MET (Metabolic Equivalent of Task) değerleri
  const metValues = {
    'yürüyüş': { 'hafif': 2.5, 'orta': 3.5, 'yüksek': 5.0, 'maksimum': 6.5 },
    'koşu': { 'hafif': 7.0, 'orta': 8.5, 'yüksek': 11.0, 'maksimum': 14.0 },
    'bisiklet': { 'hafif': 4.0, 'orta': 6.0, 'yüksek': 8.0, 'maksimum': 10.0 },
    'yüzme': { 'hafif': 5.0, 'orta': 6.0, 'yüksek': 8.0, 'maksimum': 10.0 },
    'fitness': { 'hafif': 3.5, 'orta': 5.0, 'yüksek': 7.0, 'maksimum': 9.0 },
    'yoga': { 'hafif': 2.5, 'orta': 3.0, 'yüksek': 4.0, 'maksimum': 5.0 },
    'pilates': { 'hafif': 3.0, 'orta': 3.5, 'yüksek': 4.5, 'maksimum': 5.5 },
    'dans': { 'hafif': 3.5, 'orta': 5.0, 'yüksek': 7.0, 'maksimum': 9.0 },
    'futbol': { 'hafif': 5.0, 'orta': 7.0, 'yüksek': 9.0, 'maksimum': 10.0 },
    'basketbol': { 'hafif': 4.5, 'orta': 6.0, 'yüksek': 8.0, 'maksimum': 9.5 },
    'tenis': { 'hafif': 4.0, 'orta': 6.0, 'yüksek': 8.0, 'maksimum': 9.0 },
    'voleybol': { 'hafif': 3.0, 'orta': 4.0, 'yüksek': 6.0, 'maksimum': 8.0 },
    'golf': { 'hafif': 2.5, 'orta': 3.5, 'yüksek': 4.5, 'maksimum': 5.0 },
    'dağcılık': { 'hafif': 4.0, 'orta': 6.0, 'yüksek': 8.0, 'maksimum': 10.0 },
    'ev_egzersizi': { 'hafif': 2.5, 'orta': 3.5, 'yüksek': 4.5, 'maksimum': 6.0 },
    'bahçe_işleri': { 'hafif': 2.5, 'orta': 3.5, 'yüksek': 4.5, 'maksimum': 5.5 },
    'merdiven_çıkma': { 'hafif': 4.0, 'orta': 6.0, 'yüksek': 8.0, 'maksimum': 10.0 },
    'diğer': { 'hafif': 3.0, 'orta': 4.0, 'yüksek': 6.0, 'maksimum': 8.0 }
  };
  
  // Aktivite türü ve yoğunluğuna göre MET değerini al
  let met = 4.0; // Varsayılan değer
  
  if (metValues[this.activityType] && metValues[this.activityType][this.intensity]) {
    met = metValues[this.activityType][this.intensity];
  }
  
  // Kalori hesaplama formülü: MET * ağırlık (kg) * süre (saat)
  // 1 MET yaklaşık 1 kcal/kg/saat
  this.calories = Math.round(met * weight * (this.duration / 60));
  
  return this.calories;
};

// Aktivitenin adını formatla
PhysicalActivitySchema.virtual('activityName').get(function() {
  const activityTypeMap = {
    'yürüyüş': 'Yürüyüş',
    'koşu': 'Koşu',
    'bisiklet': 'Bisiklet',
    'yüzme': 'Yüzme',
    'fitness': 'Fitness',
    'yoga': 'Yoga',
    'pilates': 'Pilates',
    'dans': 'Dans',
    'futbol': 'Futbol',
    'basketbol': 'Basketbol',
    'tenis': 'Tenis',
    'voleybol': 'Voleybol',
    'golf': 'Golf',
    'dağcılık': 'Dağcılık',
    'ev_egzersizi': 'Ev Egzersizi',
    'bahçe_işleri': 'Bahçe İşleri',
    'merdiven_çıkma': 'Merdiven Çıkma',
    'diğer': 'Diğer'
  };
  
  return activityTypeMap[this.activityType] || this.activityType;
});

// Süreyi formatla
PhysicalActivitySchema.virtual('formattedDuration').get(function() {
  if (!this.duration) return '';
  
  const hours = Math.floor(this.duration / 60);
  const minutes = this.duration % 60;
  
  if (hours > 0) {
    return `${hours} saat ${minutes} dakika`;
  } else {
    return `${minutes} dakika`;
  }
});

// Mesafeyi formatla
PhysicalActivitySchema.virtual('formattedDistance').get(function() {
  if (!this.distance || !this.distance.value) return '';
  
  return `${this.distance.value.toFixed(2)} ${this.distance.unit}`;
});

// Hız hesaplama
PhysicalActivitySchema.virtual('calculatedSpeed').get(function() {
  if (!this.distance || !this.distance.value || !this.duration) return null;
  
  let distanceInKm = this.distance.value;
  
  // Birim dönüşümleri
  if (this.distance.unit === 'm') {
    distanceInKm = this.distance.value / 1000;
  } else if (this.distance.unit === 'mil') {
    distanceInKm = this.distance.value * 1.60934;
  }
  
  // km/sa cinsinden hız
  const speedKmh = (distanceInKm / (this.duration / 60)).toFixed(2);
  
  return {
    value: parseFloat(speedKmh),
    unit: 'km/sa'
  };
});

// Hedeflere ulaşılıp ulaşılmadığını kontrol eden fonksiyon
PhysicalActivitySchema.methods.checkGoals = function() {
  if (!this.goals) return;
  
  let achieved = true;
  
  if (this.goals.targetDistance && this.distance && this.distance.value) {
    achieved = achieved && (this.distance.value >= this.goals.targetDistance);
  }
  
  if (this.goals.targetDuration && this.duration) {
    achieved = achieved && (this.duration >= this.goals.targetDuration);
  }
  
  if (this.goals.targetCalories && this.calories) {
    achieved = achieved && (this.calories >= this.goals.targetCalories);
  }
  
  if (this.goals.targetSteps && this.steps) {
    achieved = achieved && (this.steps >= this.goals.targetSteps);
  }
  
  this.goals.achieved = achieved;
  
  return achieved;
};

// Statik sorgular
PhysicalActivitySchema.statics.findByDateRange = function(familyMemberId, startDate, endDate) {
  return this.find({
    familyMemberId,
    startTime: {
      $gte: new Date(startDate),
      $lte: new Date(endDate)
    }
  }).sort({ startTime: -1 });
};

PhysicalActivitySchema.statics.findByActivityType = function(familyMemberId, activityType, limit = 10) {
  return this.find({
    familyMemberId,
    activityType
  })
  .sort({ startTime: -1 })
  .limit(limit);
};

PhysicalActivitySchema.statics.getWeeklyStats = async function(familyMemberId, date = new Date()) {
  // Haftanın başlangıç ve bitiş tarihlerini hesapla
  const startOfWeek = new Date(date);
  startOfWeek.setDate(date.getDate() - date.getDay()); // Pazar gününden başla
  startOfWeek.setHours(0, 0, 0, 0);
  
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);
  endOfWeek.setHours(23, 59, 59, 999);
  
  // Haftalık aktiviteleri bul
  const activities = await this.find({
    familyMemberId,
    startTime: {
      $gte: startOfWeek,
      $lte: endOfWeek
    }
  }).sort({ startTime: 1 });
  
  // İstatistikleri hesapla
  const stats = {
    totalActivities: activities.length,
    totalDuration: 0,
    totalCalories: 0,
    totalDistance: 0,
    totalSteps: 0,
    activityBreakdown: {},
    dailyActivity: Array(7).fill(0), // Haftanın her günü için
    mostCommonActivity: null
  };
  
  // Aktivite sayılarını saymak için
  const activityCounts = {};
  
  for (const activity of activities) {
    stats.totalDuration += activity.duration || 0;
    stats.totalCalories += activity.calories || 0;
    
    if (activity.distance && activity.distance.value) {
      // Mesafeyi km'ye çevir
      let distanceInKm = activity.distance.value;
      if (activity.distance.unit === 'm') {
        distanceInKm = activity.distance.value / 1000;
      } else if (activity.distance.unit === 'mil') {
        distanceInKm = activity.distance.value * 1.60934;
      }
      
      stats.totalDistance += distanceInKm;
    }
    
    stats.totalSteps += activity.steps || 0;
    
    // Aktivite tipine göre sayıları hesapla
    if (!activityCounts[activity.activityType]) {
      activityCounts[activity.activityType] = 0;
    }
    activityCounts[activity.activityType]++;
    
    // Aktivite tipine göre süreyi hesapla
    if (!stats.activityBreakdown[activity.activityType]) {
      stats.activityBreakdown[activity.activityType] = {
        count: 0,
        duration: 0,
        calories: 0
      };
    }
    
    stats.activityBreakdown[activity.activityType].count++;
    stats.activityBreakdown[activity.activityType].duration += activity.duration || 0;
    stats.activityBreakdown[activity.activityType].calories += activity.calories || 0;
    
    // Günlük aktivite süresini hesapla
    const dayOfWeek = new Date(activity.startTime).getDay(); // 0 = Pazar, 1 = Pazartesi, ...
    stats.dailyActivity[dayOfWeek] += activity.duration || 0;
  }
  
  // En çok yapılan aktiviteyi bul
  let maxCount = 0;
  for (const [type, count] of Object.entries(activityCounts)) {
    if (count > maxCount) {
      maxCount = count;
      stats.mostCommonActivity = type;
    }
  }
  
  // Toplam mesafeyi yuvarla
  stats.totalDistance = parseFloat(stats.totalDistance.toFixed(2));
  
  return stats;
};

// Performans için indeksler
PhysicalActivitySchema.index({ familyMemberId: 1, startTime: -1 });
PhysicalActivitySchema.index({ familyMemberId: 1, activityType: 1, startTime: -1 });
PhysicalActivitySchema.index({ startTime: -1 });

module.exports = mongoose.model('PhysicalActivity', PhysicalActivitySchema);
const mongoose = require('mongoose');

const NutritionDataSchema = new mongoose.Schema({
  familyMemberId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'FamilyMember',
    required: [true, 'Aile üyesi referansı gereklidir']
  },
  date: {
    type: Date,
    default: Date.now,
    required: [true, 'Tarih gereklidir']
  },
  mealType: {
    type: String,
    enum: ['kahvaltı', 'öğle_yemeği', 'akşam_yemeği', 'ara_öğün', 'atıştırmalık'],
    required: [true, 'Öğün türü gereklidir']
  },
  time: {
    type: String,
    match: [/^([01]\d|2[0-3]):([0-5]\d)$/, 'Geçerli bir saat formatı giriniz (HH:MM)']
  },
  duration: {
    type: Number, // Dakika cinsinden
    min: [0, 'Süre negatif olamaz']
  },
  location: {
    type: String,
    enum: ['ev', 'iş', 'okul', 'restoran', 'dışarıda', 'diğer'],
    default: 'ev'
  },
  foods: [{
    name: {
      type: String,
      required: [true, 'Yiyecek adı gereklidir'],
      trim: true
    },
    category: {
      type: String,
      enum: [
        'meyve', 'sebze', 'tahıl', 'süt_ürünleri', 'et', 'kümes_hayvanları', 
        'balık', 'baklagiller', 'yağlar', 'tatlılar', 'içecekler', 'fast_food', 
        'hazır_yemek', 'atıştırmalıklar', 'diğer'
      ],
      default: 'diğer'
    },
    portion: {
      amount: {
        type: Number,
        required: [true, 'Porsiyon miktarı gereklidir'],
        min: [0, 'Porsiyon miktarı negatif olamaz']
      },
      unit: {
        type: String,
        enum: ['g', 'ml', 'adet', 'dilim', 'porsiyon', 'kaşık', 'bardak', 'avuç', 'diğer'],
        default: 'g'
      }
    },
    nutritionalValues: {
      calories: {
        type: Number,
        min: [0, 'Kalori değeri negatif olamaz']
      },
      carbs: {
        type: Number,
        min: [0, 'Karbonhidrat değeri negatif olamaz']
      },
      proteins: {
        type: Number,
        min: [0, 'Protein değeri negatif olamaz']
      },
      fats: {
        type: Number,
        min: [0, 'Yağ değeri negatif olamaz']
      },
      fiber: Number,
      sugar: Number,
      sodium: Number
    }
  }],
  beverages: [{
    name: {
      type: String,
      trim: true
    },
    category: {
      type: String,
      enum: [
        'su', 'çay', 'kahve', 'meyve_suyu', 'gazlı_içecek', 'alkollü_içecek',
        'süt', 'ayran', 'enerji_içeceği', 'bitki_çayı', 'diğer'
      ],
      default: 'diğer'
    },
    portion: {
      amount: {
        type: Number,
        min: [0, 'Porsiyon miktarı negatif olamaz']
      },
      unit: {
        type: String,
        enum: ['ml', 'bardak', 'şişe', 'litre', 'fincan', 'diğer'],
        default: 'ml'
      }
    },
    nutritionalValues: {
      calories: {
        type: Number,
        min: [0, 'Kalori değeri negatif olamaz']
      },
      sugar: Number,
      caffeine: Number,
      alcohol: Number
    }
  }],
  totalNutritionalValues: {
    calories: {
      type: Number,
      min: [0, 'Toplam kalori değeri negatif olamaz']
    },
    carbs: {
      type: Number,
      min: [0, 'Toplam karbonhidrat değeri negatif olamaz']
    },
    proteins: {
      type: Number,
      min: [0, 'Toplam protein değeri negatif olamaz']
    },
    fats: {
      type: Number,
      min: [0, 'Toplam yağ değeri negatif olamaz']
    },
    fiber: Number,
    sugar: Number,
    sodium: Number,
    water: Number
  },
  bloodSugarBefore: {
    value: Number,
    unit: {
      type: String,
      enum: ['mg/dL', 'mmol/L'],
      default: 'mg/dL'
    },
    time: String
  },
  bloodSugarAfter: {
    value: Number,
    unit: {
      type: String,
      enum: ['mg/dL', 'mmol/L'],
      default: 'mg/dL'
    },
    time: String,
    minutesAfter: Number
  },
  mood: {
    before: {
      type: String,
      enum: ['çok_iyi', 'iyi', 'normal', 'kötü', 'çok_kötü']
    },
    after: {
      type: String,
      enum: ['çok_iyi', 'iyi', 'normal', 'kötü', 'çok_kötü']
    }
  },
  hunger: {
    before: {
      type: Number,
      min: [0, 'Açlık değeri 0\'dan küçük olamaz'],
      max: [10, 'Açlık değeri 10\'dan büyük olamaz']
    },
    after: {
      type: Number,
      min: [0, 'Açlık değeri 0\'dan küçük olamaz'],
      max: [10, 'Açlık değeri 10\'dan büyük olamaz']
    }
  },
  symptoms: [{
    type: {
      type: String,
      enum: [
        'mide_ağrısı', 'şişkinlik', 'bulantı', 'ishal', 'kabızlık', 'baş_ağrısı',
        'yorgunluk', 'enerji_artışı', 'reflü', 'alerjik_reaksiyon', 'diğer'
      ],
      required: [true, 'Semptom türü gereklidir']
    },
    severity: {
      type: Number,
      min: [1, 'Şiddet değeri 1\'den küçük olamaz'],
      max: [10, 'Şiddet değeri 10\'dan büyük olamaz']
    },
    duration: {
      type: Number, // Dakika cinsinden
      min: [0, 'Süre negatif olamaz']
    },
    notes: String
  }],
  notes: {
    type: String,
    maxlength: [500, 'Notlar 500 karakterden uzun olamaz']
  },
  mealPhoto: {
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
  isPlanned: {
    type: Boolean,
    default: false
  },
  isFasting: {
    type: Boolean,
    default: false
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

// Toplam beslenme değerlerini hesaplayan middleware
NutritionDataSchema.pre('save', function(next) {
  try {
    // Toplam değerleri sıfırla
    this.totalNutritionalValues = {
      calories: 0,
      carbs: 0,
      proteins: 0,
      fats: 0,
      fiber: 0,
      sugar: 0,
      sodium: 0,
      water: 0
    };
    
    // Yiyeceklerden gelen değerleri topla
    if (this.foods && this.foods.length > 0) {
      for (const food of this.foods) {
        if (food.nutritionalValues) {
          this.totalNutritionalValues.calories += food.nutritionalValues.calories || 0;
          this.totalNutritionalValues.carbs += food.nutritionalValues.carbs || 0;
          this.totalNutritionalValues.proteins += food.nutritionalValues.proteins || 0;
          this.totalNutritionalValues.fats += food.nutritionalValues.fats || 0;
          this.totalNutritionalValues.fiber += food.nutritionalValues.fiber || 0;
          this.totalNutritionalValues.sugar += food.nutritionalValues.sugar || 0;
          this.totalNutritionalValues.sodium += food.nutritionalValues.sodium || 0;
        }
      }
    }
    
    // İçeceklerden gelen değerleri topla
    if (this.beverages && this.beverages.length > 0) {
      for (const beverage of this.beverages) {
        if (beverage.nutritionalValues) {
          this.totalNutritionalValues.calories += beverage.nutritionalValues.calories || 0;
          this.totalNutritionalValues.sugar += beverage.nutritionalValues.sugar || 0;
          
          // Su içeriğini yaklaşık olarak hesapla (içecekler için)
          if (beverage.portion && beverage.portion.amount) {
            let waterAmount = 0;
            
            if (beverage.category === 'su') {
              waterAmount = beverage.portion.amount;
            } else if (['çay', 'kahve', 'meyve_suyu', 'gazlı_içecek', 'süt', 'ayran'].includes(beverage.category)) {
              waterAmount = beverage.portion.amount * 0.9; // %90 su içeriği varsayımı
            } else {
              waterAmount = beverage.portion.amount * 0.8; // %80 su içeriği varsayımı
            }
            
            // ml biriminde değilse çevir
            if (beverage.portion.unit === 'litre') {
              waterAmount *= 1000;
            } else if (beverage.portion.unit === 'bardak') {
              waterAmount *= 200; // varsayılan bardak büyüklüğü
            } else if (beverage.portion.unit === 'fincan') {
              waterAmount *= 150; // varsayılan fincan büyüklüğü
            } else if (beverage.portion.unit === 'şişe') {
              waterAmount *= 500; // varsayılan şişe büyüklüğü
            }
            
            this.totalNutritionalValues.water += waterAmount;
          }
        }
      }
    }
    
    next();
  } catch (error) {
    next(error);
  }
});

// Öğün adını döndüren virtual
NutritionDataSchema.virtual('mealTypeName').get(function() {
  const mealTypeMap = {
    'kahvaltı': 'Kahvaltı',
    'öğle_yemeği': 'Öğle Yemeği',
    'akşam_yemeği': 'Akşam Yemeği',
    'ara_öğün': 'Ara Öğün',
    'atıştırmalık': 'Atıştırmalık'
  };
  
  return mealTypeMap[this.mealType] || this.mealType;
});

// Makro besin oranlarını hesaplayan virtual
NutritionDataSchema.virtual('macroRatio').get(function() {
  const total = (this.totalNutritionalValues.carbs * 4) + 
                (this.totalNutritionalValues.proteins * 4) + 
                (this.totalNutritionalValues.fats * 9);
  
  if (total <= 0) return { carbs: 0, proteins: 0, fats: 0 };
  
  return {
    carbs: parseFloat(((this.totalNutritionalValues.carbs * 4) / total * 100).toFixed(1)),
    proteins: parseFloat(((this.totalNutritionalValues.proteins * 4) / total * 100).toFixed(1)),
    fats: parseFloat(((this.totalNutritionalValues.fats * 9) / total * 100).toFixed(1))
  };
});

// Kan şekeri değişimini hesaplayan virtual
NutritionDataSchema.virtual('bloodSugarChange').get(function() {
  if (!this.bloodSugarBefore || !this.bloodSugarAfter || 
      !this.bloodSugarBefore.value || !this.bloodSugarAfter.value) {
    return null;
  }
  
  // Birim dönüşümü (eğer gerekliyse)
  let before = this.bloodSugarBefore.value;
  let after = this.bloodSugarAfter.value;
  
  // mmol/L ise mg/dL'ye çevir
  if (this.bloodSugarBefore.unit === 'mmol/L') {
    before = before * 18;
  }
  
  if (this.bloodSugarAfter.unit === 'mmol/L') {
    after = after * 18;
  }
  
  const change = after - before;
  const percentChange = before > 0 ? (change / before) * 100 : 0;
  
  return {
    absolute: parseFloat(change.toFixed(1)),
    percent: parseFloat(percentChange.toFixed(1)),
    perHour: this.bloodSugarAfter.minutesAfter ? 
      parseFloat(((change / this.bloodSugarAfter.minutesAfter) * 60).toFixed(1)) : null
  };
});

// Tüm yiyecek isimlerini dizi olarak döndüren virtual
NutritionDataSchema.virtual('foodList').get(function() {
  const foodNames = this.foods.map(food => food.name);
  const beverageNames = this.beverages.map(beverage => beverage.name);
  
  return [...foodNames, ...beverageNames];
});

// Yiyecek kategorilerine göre gruplama yapan metod
NutritionDataSchema.methods.getFoodsByCategory = function() {
  const categories = {};
  
  // Yiyecekleri kategorilere göre gruplandırma
  if (this.foods && this.foods.length > 0) {
    for (const food of this.foods) {
      const category = food.category;
      
      if (!categories[category]) {
        categories[category] = [];
      }
      
      categories[category].push(food);
    }
  }
  
  // İçecekleri ayrı kategoride gruplandırma
  if (this.beverages && this.beverages.length > 0) {
    categories.içecekler = this.beverages;
  }
  
  return categories;
};

// Statik sorgular
// Belirli bir tarih aralığında öğün bulma
NutritionDataSchema.statics.findByDateRange = function(familyMemberId, startDate, endDate) {
  return this.find({
    familyMemberId,
    date: {
      $gte: new Date(startDate),
      $lte: new Date(endDate)
    }
  }).sort({ date: 1, time: 1 });
};

// Öğün türüne göre bulma
NutritionDataSchema.statics.findByMealType = function(familyMemberId, mealType, limit = 10) {
  return this.find({
    familyMemberId,
    mealType
  })
  .sort({ date: -1 })
  .limit(limit);
};

// Günlük kalori toplamını hesaplama
NutritionDataSchema.statics.getDailyCalories = async function(familyMemberId, date) {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);
  
  const meals = await this.find({
    familyMemberId,
    date: {
      $gte: startOfDay,
      $lte: endOfDay
    }
  });
  
  let totalCalories = 0;
  let macros = { carbs: 0, proteins: 0, fats: 0 };
  
  for (const meal of meals) {
    if (meal.totalNutritionalValues && meal.totalNutritionalValues.calories) {
      totalCalories += meal.totalNutritionalValues.calories;
      
      macros.carbs += meal.totalNutritionalValues.carbs || 0;
      macros.proteins += meal.totalNutritionalValues.proteins || 0;
      macros.fats += meal.totalNutritionalValues.fats || 0;
    }
  }
  
  return { totalCalories, macros, mealCount: meals.length };
};

// Performans için indeksler
NutritionDataSchema.index({ familyMemberId: 1, date: -1 });
NutritionDataSchema.index({ familyMemberId: 1, mealType: 1, date: -1 });
NutritionDataSchema.index({ date: -1 });

module.exports = mongoose.model('NutritionData', NutritionDataSchema);
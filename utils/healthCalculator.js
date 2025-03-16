/**
 * ASTS - Aile Sağlık Takip Sistemi
 * Health Calculator - Sağlık Hesaplamaları
 * 
 * Bu dosya, sağlık verilerine dayalı hesaplamalar için kullanılacak fonksiyonları içerir.
 * BMI, kalori, nabız bölgesi ve diğer sağlık hesaplamaları için kullanılır.
 */

const config = require('../config');
const { logError } = require('./logger');
const { GENDER_TYPES, STATUS_TYPES } = require('./constants');

/**
 * Vücut Kitle İndeksi (BMI) hesaplar
 * @param {number} weight - Kilo (kg)
 * @param {number} height - Boy (cm)
 * @returns {number} BMI değeri
 */
const calculateBMI = (weight, height) => {
  try {
    if (!weight || !height || height <= 0 || weight <= 0) {
      return null;
    }
    
    // Boy metreye çevrilir
    const heightInMeters = height / 100;
    // BMI = Kilo (kg) / (Boy (m))²
    const bmi = weight / (heightInMeters * heightInMeters);
    
    return parseFloat(bmi.toFixed(1));
  } catch (error) {
    logError('BMI hesaplanamadı', error);
    return null;
  }
};

/**
 * BMI kategorisini döndürür
 * @param {number} bmi - BMI değeri
 * @returns {string} BMI kategorisi
 */
const getBMICategory = (bmi) => {
  if (bmi === null || isNaN(bmi)) {
    return 'unknown';
  }
  
  const bmiRanges = config.healthReferenceValues.bmi;
  
  if (bmi < bmiRanges.underweight.max) {
    return 'underweight';
  } else if (bmi < bmiRanges.normal.max) {
    return 'normal';
  } else if (bmi < bmiRanges.overweight.max) {
    return 'overweight';
  } else {
    return 'obese';
  }
};

/**
 * BMI kategorisinin görünen adını döndürür
 * @param {string} category - BMI kategorisi
 * @returns {string} Kategori adı
 */
const getBMICategoryName = (category) => {
  const categories = {
    'underweight': 'Zayıf',
    'normal': 'Normal',
    'overweight': 'Kilolu',
    'obese': 'Obez',
    'unknown': 'Bilinmiyor'
  };
  
  return categories[category] || 'Bilinmiyor';
};

/**
 * İdeal kilo hesaplar
 * @param {number} height - Boy (cm)
 * @param {string} gender - Cinsiyet
 * @returns {Object} Min ve max ideal kilo
 */
const calculateIdealWeight = (height, gender) => {
  try {
    if (!height || height <= 0) {
      return null;
    }
    
    let minWeight, maxWeight;
    
    // Farklı formüller kullanarak hesaplama
    if (gender === GENDER_TYPES.MALE) {
      // Erkekler için
      minWeight = (height - 100) * 0.9;
      maxWeight = (height - 100) * 0.95;
    } else {
      // Kadınlar için
      minWeight = (height - 100) * 0.85;
      maxWeight = (height - 100) * 0.9;
    }
    
    return {
      min: parseFloat(minWeight.toFixed(1)),
      max: parseFloat(maxWeight.toFixed(1))
    };
  } catch (error) {
    logError('İdeal kilo hesaplanamadı', error);
    return null;
  }
};

/**
 * Bazal Metabolizma Hızı (BMR) hesaplar
 * @param {number} weight - Kilo (kg)
 * @param {number} height - Boy (cm)
 * @param {number} age - Yaş
 * @param {string} gender - Cinsiyet
 * @returns {number} BMR değeri (kalori/gün)
 */
const calculateBMR = (weight, height, age, gender) => {
  try {
    if (!weight || !height || !age || weight <= 0 || height <= 0 || age <= 0) {
      return null;
    }
    
    let bmr;
    
    // Harris-Benedict denklemi
    if (gender === GENDER_TYPES.MALE) {
      // Erkekler için
      bmr = 88.362 + (13.397 * weight) + (4.799 * height) - (5.677 * age);
    } else {
      // Kadınlar için
      bmr = 447.593 + (9.247 * weight) + (3.098 * height) - (4.330 * age);
    }
    
    return Math.round(bmr);
  } catch (error) {
    logError('BMR hesaplanamadı', error);
    return null;
  }
};

/**
 * Günlük kalori ihtiyacı hesaplar
 * @param {number} bmr - Bazal Metabolizma Hızı
 * @param {string} activityLevel - Aktivite seviyesi
 * @returns {number} Günlük kalori ihtiyacı
 */
const calculateDailyCalories = (bmr, activityLevel) => {
  try {
    if (!bmr || bmr <= 0) {
      return null;
    }
    
    // Aktivite seviyeleri için çarpanlar
    const activityFactors = {
      'sedentary': 1.2, // Hareketsiz veya çok az hareket
      'light': 1.375, // Haftada 1-3 gün egzersiz
      'moderate': 1.55, // Haftada 3-5 gün egzersiz
      'active': 1.725, // Haftada 6-7 gün egzersiz
      'very_active': 1.9 // Günde 2 kez egzersiz
    };
    
    const factor = activityFactors[activityLevel] || activityFactors.moderate;
    
    return Math.round(bmr * factor);
  } catch (error) {
    logError('Günlük kalori ihtiyacı hesaplanamadı', error);
    return null;
  }
};

/**
 * Vücut Yağ Oranı hesaplar
 * @param {number} bmi - BMI değeri
 * @param {number} age - Yaş
 * @param {string} gender - Cinsiyet
 * @returns {number} Vücut yağ oranı (%)
 */
const calculateBodyFatPercentage = (bmi, age, gender) => {
  try {
    if (!bmi || !age || bmi <= 0 || age <= 0) {
      return null;
    }
    
    let bodyFat;
    
    // BMI temelli formül
    if (gender === GENDER_TYPES.MALE) {
      // Erkekler için
      bodyFat = (1.20 * bmi) + (0.23 * age) - 16.2;
    } else {
      // Kadınlar için
      bodyFat = (1.20 * bmi) + (0.23 * age) - 5.4;
    }
    
    return parseFloat(bodyFat.toFixed(1));
  } catch (error) {
    logError('Vücut yağ oranı hesaplanamadı', error);
    return null;
  }
};

/**
 * Maksimum kalp atış hızı hesaplar
 * @param {number} age - Yaş
 * @returns {number} Maksimum kalp atış hızı
 */
const calculateMaxHeartRate = (age) => {
  try {
    if (!age || age <= 0) {
      return null;
    }
    
    // Yaşa göre maksimum kalp atış hızı (220 - yaş)
    const maxHeartRate = 220 - age;
    
    return maxHeartRate;
  } catch (error) {
    logError('Maksimum kalp atış hızı hesaplanamadı', error);
    return null;
  }
};

/**
 * Hedef kalp atış bölgelerini hesaplar
 * @param {number} maxHeartRate - Maksimum kalp atış hızı
 * @returns {Object} Hedef kalp atış bölgeleri
 */
const calculateHeartRateZones = (maxHeartRate) => {
  try {
    if (!maxHeartRate || maxHeartRate <= 0) {
      return null;
    }
    
    // Farklı yoğunluk bölgeleri için
    return {
      rest: {
        min: 0,
        max: Math.round(maxHeartRate * 0.5)
      },
      warmup: {
        min: Math.round(maxHeartRate * 0.5),
        max: Math.round(maxHeartRate * 0.6)
      },
      fatBurn: {
        min: Math.round(maxHeartRate * 0.6),
        max: Math.round(maxHeartRate * 0.7)
      },
      cardio: {
        min: Math.round(maxHeartRate * 0.7),
        max: Math.round(maxHeartRate * 0.8)
      },
      peak: {
        min: Math.round(maxHeartRate * 0.8),
        max: Math.round(maxHeartRate * 0.9)
      },
      maximum: {
        min: Math.round(maxHeartRate * 0.9),
        max: maxHeartRate
      }
    };
  } catch (error) {
    logError('Kalp atış bölgeleri hesaplanamadı', error);
    return null;
  }
};

/**
 * Vücut su ihtiyacını hesaplar
 * @param {number} weight - Kilo (kg)
 * @param {number} activityLevel - Aktivite seviyesi (1-5)
 * @returns {number} Günlük su ihtiyacı (ml)
 */
const calculateWaterNeeds = (weight, activityLevel = 3) => {
  try {
    if (!weight || weight <= 0) {
      return null;
    }
    
    // Baz değer: Her kilo için 30ml
    let waterNeed = weight * 30;
    
    // Aktivite seviyesine göre ek su ihtiyacı
    const activityFactors = {
      1: 0.8,  // Düşük aktivite
      2: 0.9,  // Az aktivite
      3: 1.0,  // Normal aktivite
      4: 1.1,  // Yüksek aktivite
      5: 1.2   // Çok yüksek aktivite
    };
    
    const factor = activityFactors[activityLevel] || activityFactors[3];
    waterNeed *= factor;
    
    return Math.round(waterNeed);
  } catch (error) {
    logError('Su ihtiyacı hesaplanamadı', error);
    return null;
  }
};

/**
 * Kan şekeri değerini mmol/L ve mg/dL arasında dönüştürür
 * @param {number} value - Kan şekeri değeri
 * @param {string} fromUnit - Kaynak birim ('mg/dL' veya 'mmol/L')
 * @param {string} toUnit - Hedef birim ('mg/dL' veya 'mmol/L')
 * @returns {number} Dönüştürülmüş kan şekeri değeri
 */
const convertBloodSugar = (value, fromUnit, toUnit) => {
  try {
    if (value === null || value === undefined || value < 0) {
      return null;
    }
    
    if (fromUnit === toUnit) {
      return value;
    }
    
    let result;
    
    if (fromUnit === 'mg/dL' && toUnit === 'mmol/L') {
      // mg/dL'den mmol/L'ye dönüşüm (bölme faktörü: 18)
      result = value / 18;
    } else if (fromUnit === 'mmol/L' && toUnit === 'mg/dL') {
      // mmol/L'den mg/dL'ye dönüşüm (çarpma faktörü: 18)
      result = value * 18;
    } else {
      throw new Error('Geçersiz birim dönüşümü');
    }
    
    return parseFloat(result.toFixed(2));
  } catch (error) {
    logError('Kan şekeri dönüşümü yapılamadı', error);
    return null;
  }
};

/**
 * Kan şekeri durumunu değerlendirir
 * @param {number} value - Kan şekeri değeri
 * @param {string} unit - Birim ('mg/dL' veya 'mmol/L')
 * @param {string} measurementType - Ölçüm tipi ('fasting' veya 'postprandial')
 * @returns {string} Durum ('normal', 'warning', 'critical')
 */
const evaluateBloodSugar = (value, unit, measurementType) => {
  try {
    if (value === null || value === undefined || value < 0) {
      return null;
    }
    
    // mg/dL'ye çevir
    let valueInMgDl = value;
    if (unit === 'mmol/L') {
      valueInMgDl = convertBloodSugar(value, 'mmol/L', 'mg/dL');
    }
    
    // Config'den referans değerleri al
    const refValues = measurementType === 'fasting' 
      ? config.healthReferenceValues.bloodSugar.fasting 
      : config.healthReferenceValues.bloodSugar.postprandial;
    
    // Durumu değerlendir
    if (valueInMgDl < refValues.warning.low.max) {
      if (valueInMgDl <= refValues.warning.low.min) {
        return STATUS_TYPES.CRITICAL;
      }
      return STATUS_TYPES.WARNING;
    } else if (valueInMgDl > refValues.warning.high.min) {
      if (valueInMgDl >= refValues.warning.critical.min) {
        return STATUS_TYPES.CRITICAL;
      }
      return STATUS_TYPES.WARNING;
    }
    
    return STATUS_TYPES.NORMAL;
  } catch (error) {
    logError('Kan şekeri değerlendirmesi yapılamadı', error);
    return null;
  }
};

/**
 * Tansiyon durumunu değerlendirir
 * @param {number} systolic - Sistolik değer
 * @param {number} diastolic - Diastolik değer
 * @returns {string} Durum ('normal', 'warning', 'critical')
 */
const evaluateBloodPressure = (systolic, diastolic) => {
  try {
    if (systolic === null || diastolic === null || 
        systolic === undefined || diastolic === undefined || 
        systolic <= 0 || diastolic <= 0) {
      return null;
    }
    
    // Config'den referans değerleri al
    const systolicRef = config.healthReferenceValues.bloodPressure.systolic;
    const diastolicRef = config.healthReferenceValues.bloodPressure.diastolic;
    
    // Kritik durum kontrolü
    if (systolic <= systolicRef.warning.low.min || 
        systolic >= systolicRef.warning.critical.min ||
        diastolic <= diastolicRef.warning.low.min || 
        diastolic >= diastolicRef.warning.critical.min) {
      return STATUS_TYPES.CRITICAL;
    }
    
    // Uyarı durumu kontrolü
    if (systolic <= systolicRef.warning.low.max || 
        systolic >= systolicRef.warning.high.min ||
        diastolic <= diastolicRef.warning.low.max || 
        diastolic >= diastolicRef.warning.high.min) {
      return STATUS_TYPES.WARNING;
    }
    
    return STATUS_TYPES.NORMAL;
  } catch (error) {
    logError('Tansiyon değerlendirmesi yapılamadı', error);
    return null;
  }
};

/**
 * Nabız durumunu değerlendirir
 * @param {number} heartRate - Nabız değeri
 * @param {string} activityLevel - Aktivite seviyesi
 * @returns {string} Durum ('normal', 'warning', 'critical')
 */
const evaluateHeartRate = (heartRate, activityLevel = 'rest') => {
  try {
    if (heartRate === null || heartRate === undefined || heartRate <= 0) {
      return null;
    }
    
    // Config'den referans değerleri al
    const refValues = config.healthReferenceValues.heartRate;
    
    // Aktivite seviyesine göre baz değerler
    const activityBasedLimits = {
      'rest': {
        min: refValues.min,
        max: refValues.max
      },
      'light': {
        min: refValues.min * 1.2,
        max: refValues.max * 1.3
      },
      'moderate': {
        min: refValues.min * 1.4,
        max: refValues.max * 1.5
      },
      'intense': {
        min: refValues.min * 1.6,
        max: refValues.max * 1.7
      }
    };
    
    const limits = activityBasedLimits[activityLevel] || activityBasedLimits.rest;
    
    // Kritik durum kontrolü
    if (heartRate <= refValues.warning.low.min || 
        heartRate >= refValues.warning.critical.min) {
      return STATUS_TYPES.CRITICAL;
    }
    
    // Uyarı durumu kontrolü (aktivite seviyesine göre)
    if (heartRate <= limits.min || heartRate >= limits.max) {
      return STATUS_TYPES.WARNING;
    }
    
    return STATUS_TYPES.NORMAL;
  } catch (error) {
    logError('Nabız değerlendirmesi yapılamadı', error);
    return null;
  }
};

/**
 * Aktivitede harcanan kaloriyi hesaplar
 * @param {number} weight - Kilo (kg)
 * @param {string} activityType - Aktivite türü
 * @param {number} duration - Süre (dakika)
 * @param {string} intensity - Yoğunluk seviyesi
 * @returns {number} Harcanan kalori
 */
const calculateActivityCalories = (weight, activityType, duration, intensity = 'moderate') => {
  try {
    if (!weight || !duration || weight <= 0 || duration <= 0) {
      return null;
    }
    
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
    
    // MET değerini belirle
    let met = 4.0; // Varsayılan
    if (metValues[activityType] && metValues[activityType][intensity]) {
      met = metValues[activityType][intensity];
    }
    
    // Kalori hesaplama formülü
    // Kalori = MET * Kilo * Saat
    const hours = duration / 60;
    const calories = met * weight * hours;
    
    return Math.round(calories);
  } catch (error) {
    logError('Aktivite kalorisi hesaplanamadı', error);
    return null;
  }
};

/**
 * Verilen kalori değerindeki besin içeriğini hesaplar
 * @param {number} calories - Kalori değeri
 * @param {Object} macroRatio - Makro besin oranları (carbs, proteins, fats)
 * @returns {Object} Besin içeriği (karbonhidrat, protein, yağ)
 */
const calculateNutrients = (calories, macroRatio = { carbs: 50, proteins: 20, fats: 30 }) => {
  try {
    if (calories === null || calories === undefined || calories < 0) {
      return null;
    }
    
    // Toplam oranın %100 olduğundan emin ol
    const totalRatio = macroRatio.carbs + macroRatio.proteins + macroRatio.fats;
    if (totalRatio !== 100) {
      // Oranları normalize et
      macroRatio.carbs = (macroRatio.carbs / totalRatio) * 100;
      macroRatio.proteins = (macroRatio.proteins / totalRatio) * 100;
      macroRatio.fats = (macroRatio.fats / totalRatio) * 100;
    }
    
    // Besin içeriği hesaplama
    // 1g karbonhidrat = 4 kalori
    // 1g protein = 4 kalori
    // 1g yağ = 9 kalori
    const carbs = (calories * (macroRatio.carbs / 100)) / 4;
    const proteins = (calories * (macroRatio.proteins / 100)) / 4;
    const fats = (calories * (macroRatio.fats / 100)) / 9;
    
    return {
      carbs: parseFloat(carbs.toFixed(1)),
      proteins: parseFloat(proteins.toFixed(1)),
      fats: parseFloat(fats.toFixed(1))
    };
  } catch (error) {
    logError('Besin içeriği hesaplanamadı', error);
    return null;
  }
};

/**
 * Belirli bir sürede adım sayısından mesafeyi hesaplar
 * @param {number} steps - Adım sayısı
 * @param {number} height - Boy (cm)
 * @param {string} gender - Cinsiyet
 * @returns {Object} Mesafe (km ve mil)
 */
const calculateDistanceFromSteps = (steps, height, gender) => {
  try {
    if (steps === null || steps === undefined || steps < 0 || !height || height <= 0) {
      return null;
    }
    
    // Adım uzunluğu hesaplama (cm)
    // Ortalama olarak boy * 0.415 (erkekler için) veya boy * 0.413 (kadınlar için)
    let stepLength;
    if (gender === GENDER_TYPES.MALE) {
      stepLength = height * 0.415;
    } else {
      stepLength = height * 0.413;
    }
    
    // Toplam mesafe (cm)
    const distanceInCm = steps * stepLength;
    
    // km ve mil olarak dönüşüm
    const distanceInKm = distanceInCm / 100000;
    const distanceInMiles = distanceInKm * 0.621371;
    
    return {
      km: parseFloat(distanceInKm.toFixed(2)),
      miles: parseFloat(distanceInMiles.toFixed(2))
    };
  } catch (error) {
    logError('Adımdan mesafe hesaplanamadı', error);
    return null;
  }
};

/**
 * Hızı hesaplar
 * @param {number} distance - Mesafe (km)
 * @param {number} duration - Süre (dakika)
 * @returns {Object} Hız (km/sa, m/s, pace)
 */
const calculateSpeed = (distance, duration) => {
  try {
    if (distance === null || duration === null || 
        distance === undefined || duration === undefined || 
        distance < 0 || duration <= 0) {
      return null;
    }
    
    // km/sa cinsinden hız
    const speedKmh = (distance / (duration / 60));
    
    // m/s cinsinden hız
    const speedMs = speedKmh / 3.6;
    
    // Pace (dakika/km) - koşucular için
    const paceMinPerKm = duration / distance;
    const paceMin = Math.floor(paceMinPerKm);
    const paceSec = Math.round((paceMinPerKm - paceMin) * 60);
    
    return {
      kmh: parseFloat(speedKmh.toFixed(2)),
      ms: parseFloat(speedMs.toFixed(2)),
      pace: `${paceMin}:${paceSec.toString().padStart(2, '0')}`
    };
  } catch (error) {
    logError('Hız hesaplanamadı', error);
    return null;
  }
};

/**
 * Tüketilen besinlerin toplam besin değerlerini hesaplar
 * @param {Array} foods - Besin listesi
 * @returns {Object} Toplam besin değerleri
 */
const calculateTotalNutrients = (foods) => {
  try {
    if (!foods || !Array.isArray(foods) || foods.length === 0) {
      return null;
    }
    
    // Başlangıç değerleri
    const totals = {
      calories: 0,
      carbs: 0,
      proteins: 0,
      fats: 0,
      fiber: 0,
      sugar: 0,
      sodium: 0
    };
    
    // Her besin için değerleri topla
    foods.forEach(food => {
      if (food.nutritionalValues) {
        totals.calories += food.nutritionalValues.calories || 0;
        totals.carbs += food.nutritionalValues.carbs || 0;
        totals.proteins += food.nutritionalValues.proteins || 0;
        totals.fats += food.nutritionalValues.fats || 0;
        totals.fiber += food.nutritionalValues.fiber ||
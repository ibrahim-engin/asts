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
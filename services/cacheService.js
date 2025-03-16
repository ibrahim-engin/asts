/**
 * ASTS - Aile Sağlık Takip Sistemi
 * Cache Service - Önbellek Servisi
 * 
 * Bu servis, sık kullanılan verilerin önbellekte tutulmasını sağlar.
 * Performansı artırmak ve veritabanı yükünü azaltmak için kullanılır.
 */

const NodeCache = require('node-cache');
const { logInfo, logError } = require('../middlewares/logger');

// Standart TTL: 10 dakika, kontrol periyodu: 60 saniye
const cache = new NodeCache({ stdTTL: 600, checkperiod: 60 });

/**
 * Cache servisini başlatan fonksiyon
 */
const initCache = () => {
  logInfo('Cache servisi başlatıldı');
  
  // Önbellek temizleme olayını dinle
  cache.on('expired', (key, value) => {
    logInfo(`Önbellek kaydı süresi doldu: ${key}`);
  });
  
  return cache;
};

/**
 * Önbelleğe veri ekler
 * @param {string} key - Önbellek anahtarı
 * @param {any} value - Kaydedilecek değer
 * @param {number} ttl - Yaşam süresi (saniye cinsinden, opsiyonel)
 * @returns {boolean} - İşlem başarılı ise true
 */
const set = (key, value, ttl = undefined) => {
  try {
    return cache.set(key, value, ttl);
  } catch (error) {
    logError(`Önbelleğe veri kaydedilemedi: ${key}`, error);
    return false;
  }
};

/**
 * Önbellekten veri alır
 * @param {string} key - Önbellek anahtarı
 * @returns {any} - Kaydedilen değer veya undefined
 */
const get = (key) => {
  try {
    return cache.get(key);
  } catch (error) {
    logError(`Önbellekten veri alınamadı: ${key}`, error);
    return undefined;
  }
};

/**
 * Önbellekten veri alır, yoksa callback fonksiyonu ile oluşturur ve kaydeder
 * @param {string} key - Önbellek anahtarı
 * @param {function} storeFunction - Veri yoksa çağrılacak fonksiyon
 * @param {number} ttl - Yaşam süresi (saniye cinsinden, opsiyonel)
 * @returns {Promise<any>} - Kaydedilen değer
 */
const getOrSet = async (key, storeFunction, ttl = undefined) => {
  try {
    // Önbellekte varsa döndür
    const value = cache.get(key);
    if (value !== undefined) {
      return value;
    }
    
    // Yoksa fonksiyonu çağır ve sonucu önbelleğe kaydet
    const result = await storeFunction();
    cache.set(key, result, ttl);
    return result;
  } catch (error) {
    logError(`Önbellek getOrSet hatası: ${key}`, error);
    // Hata durumunda fonksiyonu direkt çağır (önbellekleme olmadan)
    return await storeFunction();
  }
};

/**
 * Belirli bir anahtarı önbellekten siler
 * @param {string} key - Önbellek anahtarı
 * @returns {number} - Silinen öğe sayısı
 */
const del = (key) => {
  try {
    return cache.del(key);
  } catch (error) {
    logError(`Önbellekten veri silinemedi: ${key}`, error);
    return 0;
  }
};

/**
 * Birden fazla anahtarı önbellekten siler
 * @param {string[]} keys - Önbellek anahtarları
 * @returns {number} - Silinen öğe sayısı
 */
const delMultiple = (keys) => {
  try {
    return cache.del(keys);
  } catch (error) {
    logError(`Önbellekten çoklu veri silinemedi`, error);
    return 0;
  }
};

/**
 * Belirli bir önekle başlayan tüm anahtarları önbellekten siler
 * @param {string} prefix - Anahtar öneki
 * @returns {number} - Silinen öğe sayısı
 */
const delByPrefix = (prefix) => {
  try {
    const keys = cache.keys().filter(key => key.startsWith(prefix));
    return cache.del(keys);
  } catch (error) {
    logError(`Önbellekten önekli veri silinemedi: ${prefix}`, error);
    return 0;
  }
};

/**
 * Önbelleği tamamen temizler
 * @returns {boolean} - İşlem başarılı ise true
 */
const flushAll = () => {
  try {
    return cache.flushAll();
  } catch (error) {
    logError('Önbellek temizlenemedi', error);
    return false;
  }
};

/**
 * Anahtar için TTL değerini günceller
 * @param {string} key - Önbellek anahtarı
 * @param {number} ttl - Yeni yaşam süresi (saniye cinsinden)
 * @returns {boolean} - İşlem başarılı ise true
 */
const updateTTL = (key, ttl) => {
  try {
    return cache.ttl(key, ttl);
  } catch (error) {
    logError(`Önbellek TTL güncellenemedi: ${key}`, error);
    return false;
  }
};

/**
 * Önbellekteki öğe sayısını döndürür
 * @returns {number} - Öğe sayısı
 */
const getStats = () => {
  try {
    return {
      keys: cache.keys().length,
      hits: cache.getStats().hits,
      misses: cache.getStats().misses,
      ksize: cache.getStats().ksize,
      vsize: cache.getStats().vsize
    };
  } catch (error) {
    logError('Önbellek istatistikleri alınamadı', error);
    return {
      keys: 0,
      hits: 0,
      misses: 0,
      ksize: 0,
      vsize: 0
    };
  }
};

/**
 * Kullanıcı verilerini önbellekten siler (örn. kullanıcı oturumu kapatınca)
 * @param {string} userId - Kullanıcı ID'si
 */
const clearUserData = (userId) => {
  return delByPrefix(`user_${userId}_`);
};

/**
 * Aile üyesi verilerini önbellekten siler
 * @param {string} familyMemberId - Aile üyesi ID'si
 */
const clearFamilyMemberData = (familyMemberId) => {
  return delByPrefix(`family_${familyMemberId}_`);
};

/**
 * Sağlık verilerini önbellekten siler
 * @param {string} familyMemberId - Aile üyesi ID'si
 * @param {string} dataType - Veri tipi (opsiyonel)
 */
const clearHealthData = (familyMemberId, dataType = null) => {
  const prefix = dataType 
    ? `health_${familyMemberId}_${dataType}_` 
    : `health_${familyMemberId}_`;
  
  return delByPrefix(prefix);
};

/**
 * Anahtar oluşturucu yardımcı fonksiyonları
 */
const keyGenerators = {
  // Kullanıcı verileri için
  userProfile: (userId) => `user_${userId}_profile`,
  userSettings: (userId) => `user_${userId}_settings`,
  userFamilyMembers: (userId) => `user_${userId}_family_members`,
  
  // Aile üyesi verileri için
  familyMember: (familyMemberId) => `family_${familyMemberId}_profile`,
  familyMemberDashboard: (familyMemberId) => `family_${familyMemberId}_dashboard`,
  
  // Sağlık verileri için
  healthData: (familyMemberId, dataType, timeRange = 'all') => 
    `health_${familyMemberId}_${dataType}_${timeRange}`,
  
  // İlaç verileri için
  medications: (familyMemberId) => `medications_${familyMemberId}_list`,
  medicationSchedule: (familyMemberId, date) => 
    `medications_${familyMemberId}_schedule_${date}`,
  
  // Hatırlatıcılar için
  reminders: (familyMemberId) => `reminders_${familyMemberId}_all`,
  todayReminders: (familyMemberId, date) => 
    `reminders_${familyMemberId}_today_${date}`,
  
  // Raporlar için
  reports: (familyMemberId, reportType = 'all') => 
    `reports_${familyMemberId}_${reportType}`
};

// Cache servisini başlat
initCache();

module.exports = {
  set,
  get,
  getOrSet,
  del,
  delMultiple,
  delByPrefix,
  flushAll,
  updateTTL,
  getStats,
  clearUserData,
  clearFamilyMemberData,
  clearHealthData,
  keyGenerators
};
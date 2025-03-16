/**
 * ASTS - Aile Sağlık Takip Sistemi
 * Database Connection - Veritabanı Bağlantı Yönetimi
 * 
 * Bu dosya, MongoDB veritabanı bağlantısını yönetir.
 * Bağlantı kurma, kesme ve izleme işlemleri için kullanılır.
 */

const mongoose = require('mongoose');
const { logInfo, logError, logWarning } = require('./logger');
const config = require('../config');

// Mongoose Promise'i global Promise'e ayarla
mongoose.Promise = global.Promise;

// Mongoose strictQuery
// mongoose.set('strictQuery', false); // veya false

// Bağlantı durumları
const CONNECTION_STATES = {
  0: 'disconnected',
  1: 'connected',
  2: 'connecting',
  3: 'disconnecting',
  99: 'uninitialized'
};

/**
 * Veritabanı bağlantısını kurar
 * @returns {Promise<mongoose.Connection>} MongoDB bağlantısı
 */
const connectDB = async () => {
  try {
    // Bağlantı zaten kurulmuşsa mevcut bağlantıyı döndür
    if (mongoose.connection.readyState === 1) {
      logInfo('Veritabanı bağlantısı zaten kurulu');
      return mongoose.connection;
    }

    // MongoDB URI kontrolü
    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI çevre değişkeni tanımlanmamış');
    }

    // Bağlantı seçenekleri
    const mongooseOptions = config.mongooseOptions || {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      autoIndex: true
    };

    // Bağlantıyı kur
    await mongoose.connect(process.env.MONGODB_URI, mongooseOptions);

    // Bağlantı başarılı
    logInfo(`MongoDB bağlantısı kuruldu: ${mongoose.connection.host}`);

    // Bağlantı olaylarını dinle
    setupConnectionListeners();

    return mongoose.connection;
  } catch (error) {
    logError('MongoDB bağlantısı kurulamadı', error);
    throw error;
  }
};

/**
 * Veritabanı bağlantısını kapatır
 * @returns {Promise<void>}
 */
const disconnectDB = async () => {
  try {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
      logInfo('MongoDB bağlantısı kapatıldı');
    }
  } catch (error) {
    logError('MongoDB bağlantısı kapatılamadı', error);
    throw error;
  }
};

/**
 * MongoDB bağlantı olaylarını dinler
 */
const setupConnectionListeners = () => {
  const conn = mongoose.connection;

  // Bağlantı başarılı
  conn.on('connected', () => {
    logInfo('MongoDB bağlantısı kuruldu');
  });

  // Bağlantı kesildi
  conn.on('disconnected', () => {
    logWarning('MongoDB bağlantısı kesildi');
  });

  // Bağlantı hatası
  conn.on('error', (err) => {
    logError('MongoDB bağlantı hatası', err);
  });

  // Yeniden bağlanıyor
  conn.on('reconnected', () => {
    logInfo('MongoDB yeniden bağlandı');
  });

  // Uygulama çıkışında bağlantıyı kapat
  process.on('SIGINT', async () => {
    await disconnectDB();
    process.exit(0);
  });
};

/**
 * Mevcut bağlantı durumunu kontrol eder
 * @returns {Object} Bağlantı durumu
 */
const checkConnection = () => {
  const state = mongoose.connection.readyState;
  return {
    state,
    status: CONNECTION_STATES[state] || 'unknown',
    isConnected: state === 1,
    host: mongoose.connection.host,
    name: mongoose.connection.name
  };
};

/**
 * Veritabanı durumunu izler
 * @returns {Object} Veritabanı durumu
 */
const getDBStats = async () => {
  try {
    if (mongoose.connection.readyState !== 1) {
      throw new Error('Veritabanı bağlantısı kurulu değil');
    }

    // Admin veritabanını al
    const db = mongoose.connection.db;

    // Veritabanı durumunu al
    const stats = await db.stats();

    // Koleksiyonları listele
    const collections = await db.listCollections().toArray();
    const collectionStats = {};

    // Her koleksiyon için istatistikleri al
    for (const collection of collections) {
      const collStat = await db.collection(collection.name).stats();
      collectionStats[collection.name] = {
        count: collStat.count,
        size: formatBytes(collStat.size),
        avgObjSize: formatBytes(collStat.avgObjSize)
      };
    }

    return {
      database: mongoose.connection.name,
      host: mongoose.connection.host,
      collections: collections.length,
      documents: stats.objects,
      dataSize: formatBytes(stats.dataSize),
      storageSize: formatBytes(stats.storageSize),
      indexes: stats.indexes,
      indexSize: formatBytes(stats.indexSize),
      collectionStats
    };
  } catch (error) {
    logError('Veritabanı istatistikleri alınamadı', error);
    throw error;
  }
};

/**
 * Byte değerini okunabilir formata dönüştürür
 * @param {number} bytes - Byte değeri
 * @returns {string} Formatlanmış değer
 */
const formatBytes = (bytes) => {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

/**
 * Belirli bir koleksiyonun istatistiklerini al
 * @param {string} collectionName - Koleksiyon adı
 * @returns {Promise<Object>} Koleksiyon istatistikleri
 */
const getCollectionStats = async (collectionName) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      throw new Error('Veritabanı bağlantısı kurulu değil');
    }

    // MongoDB bağlantısı öncesine
    console.log('MongoDB bağlantısı kuruluyor...');
    console.log('Bağlantı URI:', process.env.MONGODB_URI);

    const db = mongoose.connection.db;
    const stats = await db.collection(collectionName).stats();

    return {
      name: stats.ns,
      count: stats.count,
      size: formatBytes(stats.size),
      avgObjSize: formatBytes(stats.avgObjSize),
      storageSize: formatBytes(stats.storageSize),
      indexes: stats.nindexes,
      indexSize: formatBytes(stats.totalIndexSize),
      capped: stats.capped || false
    };
  } catch (error) {
    logError(`Koleksiyon istatistikleri alınamadı: ${collectionName}`, error);
    throw error;
  }
};

/**
 * Veritabanı bağlantısını yeniden kurar
 * @returns {Promise<mongoose.Connection>} MongoDB bağlantısı
 */
const reconnectDB = async () => {
  try {
    // Mevcut bağlantıyı kontrol et
    if (mongoose.connection.readyState !== 0) {
      // Bağlantıyı kapat
      await disconnectDB();
    }

    // Yeniden bağlan
    return await connectDB();
  } catch (error) {
    logError('Veritabanı yeniden bağlantı hatası', error);
    throw error;
  }
};

/**
 * Mongoose bağlantı bilgilerini al
 * @returns {Object} Mongoose bağlantı bilgileri
 */
const getMongooseInfo = () => {
  return {
    version: mongoose.version,
    connection: mongoose.connection.readyState,
    status: CONNECTION_STATES[mongoose.connection.readyState] || 'unknown',
    models: Object.keys(mongoose.models)
  };
};

module.exports = {
  connectDB,
  disconnectDB,
  checkConnection,
  getDBStats,
  getCollectionStats,
  reconnectDB,
  getMongooseInfo,
  CONNECTION_STATES
};
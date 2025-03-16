/**
 * ASTS - Aile Sağlık Takip Sistemi
 * Database Seeder - Veritabanı Başlangıç Verileri
 * 
 * Bu dosya, veritabanı başlatıldığında örnek verilerin oluşturulmasını sağlar.
 * Geliştirme ve test ortamlarında kullanılmak üzere tasarlanmıştır.
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { connectDB } = require('./dbConnection');
const { logInfo, logError } = require('./logger');
const config = require('../config');

// Model dosyalarını içe aktar
const User = require('../models/User');
const Admin = require('../models/Admin');
const FamilyMember = require('../models/FamilyMember');
const HealthData = require('../models/HealthData');
const MedicalHistory = require('../models/MedicalHistory');
const Medication = require('../models/Medication');
const Settings = require('../models/Settings');

/**
 * Mevcut verileri temizler
 * @param {boolean} deleteAll - Tüm verileri sil
 * @returns {Promise<void>}
 */
const clearData = async (deleteAll = false) => {
  try {
    if (deleteAll) {
      // Tüm koleksiyonları temizle
      await Promise.all([
        User.deleteMany({}),
        Admin.deleteMany({}),
        FamilyMember.deleteMany({}),
        HealthData.deleteMany({}),
        MedicalHistory.deleteMany({}),
        Medication.deleteMany({})
      ]);
      
      logInfo('Tüm veriler temizlendi');
    } else {
      // Süper admin dışındaki verileri temizle
      await Promise.all([
        User.deleteMany({}),
        Admin.deleteMany({ level: { $ne: 'super-admin' } }),
        FamilyMember.deleteMany({}),
        HealthData.deleteMany({}),
        MedicalHistory.deleteMany({}),
        Medication.deleteMany({})
      ]);
      
      logInfo('Veriler temizlendi (süper admin hariç)');
    }
  } catch (error) {
    logError('Veri temizleme hatası', error);
    throw error;
  }
};

/**
 * Süper admin oluşturur
 * @returns {Promise<Object>} - Oluşturulan admin
 */
const createSuperAdmin = async () => {
  try {
    // Süper admin var mı kontrol et
    const existingAdmin = await Admin.findOne({ level: 'super-admin' });
    
    if (existingAdmin) {
      logInfo('Süper admin zaten mevcut');
      return existingAdmin;
    }
    
    // Şifreyi hashle
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('admin123', salt);
    
    // Süper admin oluştur
    const superAdmin = await Admin.create({
      name: 'Admin',
      surname: 'ASTS',
      email: 'admin@asts.com',
      password: hashedPassword,
      level: 'super-admin',
      isActive: true,
      permissions: {
        users: { view: true, create: true, edit: true, delete: true },
        familyMembers: { view: true, create: true, edit: true, delete: true },
        healthData: { view: true, create: true, edit: true, delete: true },
        medications: { view: true, create: true, edit: true, delete: true },
        reports: { view: true, create: true, edit: true, delete: true },
        settings: { view: true, edit: true }
      }
    });
    
    logInfo('Süper admin oluşturuldu');
    return superAdmin;
  } catch (error) {
    logError('Süper admin oluşturma hatası', error);
    throw error;
  }
};

/**
 * Normal admin oluşturur
 * @returns {Promise<Object>} - Oluşturulan admin
 */
const createNormalAdmin = async () => {
  try {
    // Şifreyi hashle
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('admin456', salt);
    
    // Normal admin oluştur
    const normalAdmin = await Admin.create({
      name: 'Yönetici',
      surname: 'ASTS',
      email: 'moderator@asts.com',
      password: hashedPassword,
      level: 'admin',
      isActive: true,
      permissions: {
        users: { view: true, create: true, edit: true, delete: false },
        familyMembers: { view: true, create: false, edit: false, delete: false },
        healthData: { view: true, create: false, edit: false, delete: false },
        medications: { view: true, create: false, edit: false, delete: false },
        reports: { view: true, create: true, edit: false, delete: false },
        settings: { view: true, edit: false }
      }
    });
    
    logInfo('Normal admin oluşturuldu');
    return normalAdmin;
  } catch (error) {
    logError('Normal admin oluşturma hatası', error);
    throw error;
  }
};

/**
 * Demo kullanıcıları oluşturur
 * @param {number} count - Oluşturulacak kullanıcı sayısı
 * @returns {Promise<Array>} - Oluşturulan kullanıcılar
 */
const createDemoUsers = async (count = 5) => {
  try {
    const users = [];
    
    // Şifreyi hashle (tüm demo kullanıcılar için aynı şifre)
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('demo123', salt);
    
    // Demo kullanıcılar
    const demoUsers = [
      { name: 'Ahmet', surname: 'Yılmaz', email: 'ahmet@demo.com' },
      { name: 'Ayşe', surname: 'Kaya', email: 'ayse@demo.com' },
      { name: 'Mehmet', surname: 'Demir', email: 'mehmet@demo.com' },
      { name: 'Fatma', surname: 'Çelik', email: 'fatma@demo.com' },
      { name: 'Ali', surname: 'Şahin', email: 'ali@demo.com' }
    ];
    
    // İstenen sayıda kullanıcı oluştur
    for (let i = 0; i < Math.min(count, demoUsers.length); i++) {
      const userData = demoUsers[i];
      
      // Kullanıcı oluştur
      const user = await User.create({
        name: userData.name,
        surname: userData.surname,
        email: userData.email,
        password: hashedPassword,
        isActive: true,
        phone: `5${Math.floor(Math.random() * 100000000).toString().padStart(8, '0')}`,
        role: 'user',
        isVerified: true,
        avatar: '/img/defaults/avatar.png'
      });
      
      // Kullanıcı ayarlarını oluştur
      await Settings.create({
        userId: user._id,
        language: 'tr',
        theme: 'light',
        notifications: {
          email: true,
          push: true,
          reminders: true,
          critical_values: true,
          reports: true
        },
        privacy: {
          shareData: false,
          anonymousStatistics: true
        },
        reports: {
          defaultPeriod: 'month',
          autoGenerate: {
            enabled: true,
            frequency: 'monthly',
            types: {
              health_summary: true,
              blood_sugar_analysis: true
            }
          }
        },
        display: {
          defaultView: 'monthly',
          startPage: 'dashboard'
        }
      });
      
      users.push(user);
      logInfo(`Demo kullanıcı oluşturuldu: ${userData.name} ${userData.surname}`);
    }
    
    return users;
  } catch (error) {
    logError('Demo kullanıcı oluşturma hatası', error);
    throw error;
  }
};

/**
 * Demo aile üyeleri oluşturur
 * @param {Array} users - Kullanıcılar
 * @returns {Promise<Array>} - Oluşturulan aile üyeleri
 */
const createDemoFamilyMembers = async (users) => {
  try {
    const familyMembers = [];
    
    // Her kullanıcı için aile üyeleri oluştur
    for (const user of users) {
      // Kullanıcının kendisi
      const self = await FamilyMember.create({
        userId: user._id,
        name: user.name,
        surname: user.surname,
        relationship: 'diğer',
        dateOfBirth: new Date(1980 + Math.floor(Math.random() * 20), Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1),
        gender: Math.random() > 0.5 ? 'erkek' : 'kadın',
        bloodType: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', '0+', '0-'][Math.floor(Math.random() * 8)],
        height: 160 + Math.floor(Math.random() * 30),
        weight: 60 + Math.floor(Math.random() * 30),
        isActive: true,
        isSelf: true
      });
      
      familyMembers.push(self);
      
      // Eş
      if (Math.random() > 0.3) {
        const spouseGender = self.gender === 'erkek' ? 'kadın' : 'erkek';
        const spouse = await FamilyMember.create({
          userId: user._id,
          name: spouseGender === 'erkek' ? ['Ahmet', 'Mehmet', 'Ali', 'Hasan', 'Mustafa'][Math.floor(Math.random() * 5)] : ['Ayşe', 'Fatma', 'Zeynep', 'Hatice', 'Emine'][Math.floor(Math.random() * 5)],
          surname: user.surname,
          relationship: 'eş',
          dateOfBirth: new Date(1980 + Math.floor(Math.random() * 20), Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1),
          gender: spouseGender,
          bloodType: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', '0+', '0-'][Math.floor(Math.random() * 8)],
          height: spouseGender === 'erkek' ? 170 + Math.floor(Math.random() * 15) : 155 + Math.floor(Math.random() * 15),
          weight: spouseGender === 'erkek' ? 70 + Math.floor(Math.random() * 20) : 55 + Math.floor(Math.random() * 15),
          isActive: true
        });
        
        familyMembers.push(spouse);
      }
      
      // Çocuk
      if (Math.random() > 0.5) {
        const childCount = Math.floor(Math.random() * 3) + 1;
        
        for (let i = 0; i < childCount; i++) {
          const childGender = Math.random() > 0.5 ? 'erkek' : 'kadın';
          const child = await FamilyMember.create({
            userId: user._id,
            name: childGender === 'erkek' ? ['Can', 'Mert', 'Ege', 'Emir', 'Yiğit'][Math.floor(Math.random() * 5)] : ['Elif', 'Ceren', 'Zara', 'Mina', 'Defne'][Math.floor(Math.random() * 5)],
            surname: user.surname,
            relationship: 'çocuk',
            dateOfBirth: new Date(2005 + Math.floor(Math.random() * 15), Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1),
            gender: childGender,
            bloodType: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', '0+', '0-'][Math.floor(Math.random() * 8)],
            height: childGender === 'erkek' ? 120 + Math.floor(Math.random() * 40) : 115 + Math.floor(Math.random() * 40),
            weight: childGender === 'erkek' ? 30 + Math.floor(Math.random() * 30) : 28 + Math.floor(Math.random() * 30),
            isActive: true
          });
          
          familyMembers.push(child);
        }
      }
      
      // Ebeveyn
      if (Math.random() > 0.7) {
        const parent = await FamilyMember.create({
          userId: user._id,
          name: ['Mehmet', 'Mustafa', 'Ahmet', 'Ali', 'Hüseyin'][Math.floor(Math.random() * 5)],
          surname: user.surname,
          relationship: 'baba',
          dateOfBirth: new Date(1940 + Math.floor(Math.random() * 20), Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1),
          gender: 'erkek',
          bloodType: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', '0+', '0-'][Math.floor(Math.random() * 8)],
          height: 165 + Math.floor(Math.random() * 15),
          weight: 70 + Math.floor(Math.random() * 15),
          isActive: true,
          chronicDiseases: [
            {
              name: 'Hipertansiyon',
              diagnosisDate: new Date(2010, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1)
            }
          ]
        });
        
        familyMembers.push(parent);
      }
    }
    
    logInfo(`${familyMembers.length} demo aile üyesi oluşturuldu`);
    return familyMembers;
  } catch (error) {
    logError('Demo aile üyesi oluşturma hatası', error);
    throw error;
  }
};

/**
 * Demo sağlık verileri oluşturur
 * @param {Array} familyMembers - Aile üyeleri
 * @returns {Promise<Array>} - Oluşturulan sağlık verileri
 */
const createDemoHealthData = async (familyMembers) => {
  try {
    const healthData = [];
    
    // Her aile üyesi için sağlık verileri oluştur
    for (const member of familyMembers) {
      // Son 30 gün için veriler oluştur
      const today = new Date();
      
      // Kan şekeri verileri
      if (Math.random() > 0.3) {
        for (let i = 0; i < 30; i++) {
          const date = new Date(today);
          date.setDate(date.getDate() - i);
          date.setHours(Math.floor(Math.random() * 12) + 7, Math.floor(Math.random() * 60), 0, 0);
          
          // Rastgele değer (80-200 arası)
          const value = 80 + Math.floor(Math.random() * 120);
          
          // Durumu belirle
          let status;
          if (value < 70 || value > 180) {
            status = 'critical';
          } else if (value < 80 || value > 140) {
            status = 'warning';
          } else {
            status = 'normal';
          }
          
          // Açlık/tokluk durumu
          const measurementType = Math.random() > 0.5 ? 'fasting' : 'postprandial';
          
          const bloodSugarData = await HealthData.create({
            familyMemberId: member._id,
            dataType: 'bloodSugar',
            measuredAt: date,
            bloodSugar: {
              value: value,
              unit: 'mg/dL',
              measurementType: measurementType,
              timeSinceLastMeal: measurementType === 'postprandial' ? Math.floor(Math.random() * 120) + 30 : null
            },
            status: status,
            notes: status === 'critical' ? 'Dikkat edilmeli' : ''
          });
          
          healthData.push(bloodSugarData);
        }
      }
      
      // Tansiyon verileri
      if (Math.random() > 0.4) {
        for (let i = 0; i < 20; i++) {
          const date = new Date(today);
          date.setDate(date.getDate() - i);
          date.setHours(Math.floor(Math.random() * 12) + 7, Math.floor(Math.random() * 60), 0, 0);
          
          // Rastgele değerler
          const systolic = 110 + Math.floor(Math.random() * 60); // 110-170 arası
          const diastolic = 60 + Math.floor(Math.random() * 40); // 60-100 arası
          
          // Durumu belirle
          let status;
          if (systolic > 160 || diastolic > 100 || systolic < 90 || diastolic < 60) {
            status = 'critical';
          } else if (systolic > 140 || diastolic > 90 || systolic < 100 || diastolic < 65) {
            status = 'warning';
          } else {
            status = 'normal';
          }
          
          const bloodPressureData = await HealthData.create({
            familyMemberId: member._id,
            dataType: 'bloodPressure',
            measuredAt: date,
            bloodPressure: {
              systolic: systolic,
              diastolic: diastolic,
              unit: 'mmHg',
              position: ['sitting', 'standing', 'lying'][Math.floor(Math.random() * 3)]
            },
            status: status,
            notes: status === 'critical' ? 'Takip edilmeli' : ''
          });
          
          healthData.push(bloodPressureData);
        }
      }
      
      // Nabız verileri
      if (Math.random() > 0.5) {
        for (let i = 0; i < 15; i++) {
          const date = new Date(today);
          date.setDate(date.getDate() - i);
          date.setHours(Math.floor(Math.random() * 12) + 7, Math.floor(Math.random() * 60), 0, 0);
          
          // Rastgele değer (50-120 arası)
          const value = 50 + Math.floor(Math.random() * 70);
          
          // Durumu belirle
          let status;
          if (value < 50 || value > 120) {
            status = 'critical';
          } else if (value < 60 || value > 100) {
            status = 'warning';
          } else {
            status = 'normal';
          }
          
          const heartRateData = await HealthData.create({
            familyMemberId: member._id,
            dataType: 'heartRate',
            measuredAt: date,
            heartRate: {
              value: value,
              unit: 'bpm',
              activityLevel: ['rest', 'light', 'moderate', 'intense'][Math.floor(Math.random() * 4)]
            },
            status: status,
            notes: ''
          });
          
          healthData.push(heartRateData);
        }
      }
      
      // Kilo verileri
      if (Math.random() > 0.6) {
        for (let i = 0; i < 10; i++) {
          const date = new Date(today);
          date.setDate(date.getDate() - i * 3); // 3 günde bir ölçüm
          date.setHours(Math.floor(Math.random() * 12) + 7, Math.floor(Math.random() * 60), 0, 0);
          
          // Rastgele değer (baza göre +-5 kg)
          const value = member.weight + (Math.random() * 10 - 5);
          
          const weightData = await HealthData.create({
            familyMemberId: member._id,
            dataType: 'weight',
            measuredAt: date,
            weight: {
              value: parseFloat(value.toFixed(1)),
              unit: 'kg'
            },
            status: 'normal',
            notes: ''
          });
          
          healthData.push(weightData);
        }
      }
    }
    
    logInfo(`${healthData.length} demo sağlık verisi oluşturuldu`);
    return healthData;
  } catch (error) {
    logError('Demo sağlık verisi oluşturma hatası', error);
    throw error;
  }
};

/**
 * Demo ilaçlar oluşturur
 * @param {Array} familyMembers - Aile üyeleri
 * @returns {Promise<Array>} - Oluşturulan ilaçlar
 */
const createDemoMedications = async (familyMembers) => {
  try {
    const medications = [];
    
    // İlaç listesi
    const medicationsList = [
      { name: 'Aspirin', genericName: 'Asetilsalisilik asit', form: 'tablet', purpose: 'Ağrı kesici' },
      { name: 'Parol', genericName: 'Parasetamol', form: 'tablet', purpose: 'Ateş düşürücü' },
      { name: 'Ecopirin', genericName: 'Asetilsalisilik asit', form: 'tablet', purpose: 'Kan sulandırıcı' },
      { name: 'Nurofen', genericName: 'İbuprofen', form: 'tablet', purpose: 'Ağrı kesici' },
      { name: 'Coraspin', genericName: 'Asetilsalisilik asit', form: 'tablet', purpose: 'Kan sulandırıcı' },
      { name: 'Beloc', genericName: 'Metoprolol', form: 'tablet', purpose: 'Tansiyon düşürücü' },
      { name: 'Glucophage', genericName: 'Metformin', form: 'tablet', purpose: 'Kan şekeri düşürücü' },
      { name: 'Euthyrox', genericName: 'Levotiroksin', form: 'tablet', purpose: 'Tiroid ilacı' },
      { name: 'Cipro', genericName: 'Siprofloksasin', form: 'tablet', purpose: 'Antibiyotik' },
      { name: 'Arvales', genericName: 'Diklofenak', form: 'tablet', purpose: 'Ağrı kesici' }
    ];
    
    // Her aile üyesi için ilaçlar oluştur
    for (const member of familyMembers) {
      // 0-3 arası ilaç oluştur
      const medicationCount = Math.floor(Math.random() * 4);
      
      // Kullanılacak ilaçlar
      const usedIndices = new Set();
      
      for (let i = 0; i < medicationCount; i++) {
        // Rastgele bir ilaç seç (tekrarı önle)
        let index;
        do {
          index = Math.floor(Math.random() * medicationsList.length);
        } while (usedIndices.has(index));
        
        usedIndices.add(index);
        const med = medicationsList[index];
        
        // Başlangıç tarihi
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - Math.floor(Math.random() * 180)); // Son 6 ay içinde
        
        // Bitiş tarihi (bazıları sürekli kullanım)
        let endDate = null;
        if (Math.random() > 0.6) {
          endDate = new Date(startDate);
          endDate.setDate(endDate.getDate() + Math.floor(Math.random() * 90) + 30); // 1-4 ay arası
        }
        
        // Kullanım zamanları
        const times = [];
        const frequencyCount = Math.floor(Math.random() * 3) + 1; // 1-3 arası
        
        for (let j = 0; j < frequencyCount; j++) {
          const hour = 8 + j * 6; // 8, 14, 20 gibi
          times.push({
            time: `${hour.toString().padStart(2, '0')}:00`,
            dosage: 1,
            withFood: Math.random() > 0.5
          });
        }
        
        // İlaç oluştur
        const medication = await Medication.create({
          familyMemberId: member._id,
          name: med.name,
          genericName: med.genericName,
          dosage: {
            value: Math.random() > 0.5 ? 1 : 0.5,
            unit: 'tablet',
            form: med.form
          },
          startDate: startDate,
          endDate: endDate,
          isActive: endDate ? new Date() < endDate : true,
          isRegular: Math.random() > 0.3,
          isCritical: Math.random() > 0.8,
          schedule: {
            frequency: 'günde',
            frequencyCount: frequencyCount,
            times: times,
            asNeeded: Math.random() > 0.7,
            instructions: Math.random() > 0.7 ? 'Yemekten sonra alınmalıdır' : ''
          },
          purpose: med.purpose,
          prescribedBy: {
            name: ['Dr. Ahmet Yılmaz', 'Dr. Ayşe Demir', 'Dr. Mehmet Kaya'][Math.floor(Math.random() * 3)],
            specialty: ['Aile Hekimi', 'İç Hastalıkları', 'Kardiyoloji'][Math.floor(Math.random() * 3)],
            hospital: ['Şehir Hastanesi', 'Devlet Hastanesi', 'Üniversite Hastanesi'][Math.floor(Math.random() * 3)],
            date: startDate
          },
          inventory: {
            unitsRemaining: Math.floor(Math.random() * 30),
            unitsTotal: 30,
            refillDate: null,
            refillReminder: Math.random() > 0.5,
            reminderDays: 5
          },
          notes: Math.random() > 0.8 ? 'Düzenli kullanılmalıdır' : ''
        });
        
        medications.push(medication);
      }
    }
    
    logInfo(`${medications.length} demo ilaç oluşturuldu`);
    return medications;
  } catch (error) {
    logError('Demo ilaç oluşturma hatası', error);
    throw error;
  }
};

/**
 * Demo tıbbi geçmiş oluşturur
 * @param {Array} familyMembers - Aile üyeleri
 * @returns {Promise<Array>} - Oluşturulan tıbbi geçmiş kayıtları
 */
const createDemoMedicalHistory = async (familyMembers) => {
  try {
    const medicalHistories = [];
    
    // Tıbbi geçmiş türleri ve açıklamaları
    const medicalHistoryTypes = [
      { type: 'diagnosis', title: 'Teşhis', descriptions: ['Hipertansiyon', 'Diyabet', 'Astım', 'Kolesterol', 'Anemi'] },
      { type: 'surgery', title: 'Ameliyat', descriptions: ['Apandisit', 'Safra kesesi', 'Diz protezi', 'Bademcik', 'Fıtık'] },
      { type: 'hospitalization', title: 'Hastane Yatışı', descriptions: ['Zatürre', 'Covid-19', 'Böbrek iltihabı', 'Kalp ritim bozukluğu', 'Mide kanaması'] },
      { type: 'vaccination', title: 'Aşı', descriptions: ['Grip aşısı', 'Tetanoz aşısı', 'Covid-19 aşısı', 'Hepatit aşısı', 'Pnömokok aşısı'] },
      { type: 'test', title: 'Test', descriptions: ['Tam kan sayımı', 'Tiroid testi', 'Kolesterol testi', 'Karaciğer fonksiyon testi', 'Böbrek fonksiyon testi'] },
      { type: 'consultation', title: 'Konsültasyon', descriptions: ['Kardiyoloji', 'Nöroloji', 'Ortopedi', 'Göz hastalıkları', 'Dermatoloji'] },
      { type: 'emergency', title: 'Acil', descriptions: ['Yüksek ateş', 'Şiddetli karın ağrısı', 'Baş dönmesi', 'Göğüs ağrısı', 'Kırık'] }
    ];
    
    // Her aile üyesi için tıbbi geçmiş oluştur
    for (const member of familyMembers) {
      // 0-5 arası tıbbi geçmiş oluştur
      const historyCount = Math.floor(Math.random() * 6);
      
      for (let i = 0; i < historyCount; i++) {
        // Rastgele bir tıbbi geçmiş türü seç
        const historyTypeIndex = Math.floor(Math.random() * medicalHistoryTypes.length);
        const historyType = medicalHistoryTypes[historyTypeIndex];
        
        // Rastgele bir açıklama seç
        const descriptionIndex = Math.floor(Math.random() * historyType.descriptions.length);
        const description = historyType.descriptions[descriptionIndex];
        
        // Tarih
        const date = new Date();
        date.setFullYear(date.getFullYear() - Math.floor(Math.random() * 5)); // Son 5 yıl içinde
        date.setMonth(Math.floor(Math.random() * 12));
        date.setDate(Math.floor(Math.random() * 28) + 1);
        
        // Tıbbi geçmiş oluştur
        const medicalHistory = await MedicalHistory.create({
          familyMemberId: member._id,
          type: historyType.type,
          title: `${historyType.title}: ${description}`,
          description: `${description} için ${historyType.title.toLowerCase()} gerçekleştirildi.`,
          date: date,
          location: ['Şehir Hastanesi', 'Devlet Hastanesi', 'Üniversite Hastanesi', 'Özel Hastane', 'Aile Sağlığı Merkezi'][Math.floor(Math.random() * 5)],
          doctor: ['Dr. Ahmet Yılmaz', 'Dr. Ayşe Demir', 'Dr. Mehmet Kaya', 'Dr. Fatma Şahin', 'Dr. Ali Öztürk'][Math.floor(Math.random() * 5)],
          attachments: [],
          notes: Math.random() > 0.7 ? 'Düzenli kontrol gerekli' : ''
        });
        
        medicalHistories.push(medicalHistory);
      }
    }
    
    logInfo(`${medicalHistories.length} demo tıbbi geçmiş oluşturuldu`);
    return medicalHistories;
  } catch (error) {
    logError('Demo tıbbi geçmiş oluşturma hatası', error);
    throw error;
  }
};

/**
 * Seed işlemini çalıştırır
 * @param {Object} options - Seçenekler
 * @returns {Promise<void>}
 */
const seed = async (options = {}) => {
  try {
    const {
      deleteAll = false,
      createAdmins = true,
      createUsers = true,
      createMembers = true,
      createHealth = true,
      createMeds = true,
      createHistory = true,
      userCount = 5
    } = options;
    
    // Veritabanı bağlantısı
    await connectDB();
    
    // Verileri temizle
    await clearData(deleteAll);
    
    // Admin oluştur
    if (createAdmins) {
      await createSuperAdmin();
      await createNormalAdmin();
    }
    
    // Kullanıcılar ve ilişkili veriler
    if (createUsers) {
      const users = await createDemoUsers(userCount);
      
      if (createMembers) {
        const familyMembers = await createDemoFamilyMembers(users);
        
        if (createHealth) {
          await createDemoHealthData(familyMembers);
        }
        
        if (createMeds) {
          await createDemoMedications(familyMembers);
        }
        
        if (createHistory) {
          await createDemoMedicalHistory(familyMembers);
        }
      }
    }
    
    logInfo('Seed işlemi tamamlandı');
    process.exit(0);
  } catch (error) {
    logError('Seed işlemi hatası', error);
    process.exit(1);
  }
};

// Komut satırı argümanlarını işle
if (require.main === module) {
  const args = process.argv.slice(2);
  const options = {
    deleteAll: args.includes('--delete-all'),
    createAdmins: !args.includes('--no-admins'),
    createUsers: !args.includes('--no-users'),
    createMembers: !args.includes('--no-members'),
    createHealth: !args.includes('--no-health'),
    createMeds: !args.includes('--no-meds'),
    createHistory: !args.includes('--no-history'),
    userCount: parseInt(args.find(arg => arg.startsWith('--user-count='))?.split('=')[1] || '5')
  };
  
  seed(options);
}

module.exports = {
  seed,
  clearData,
  createSuperAdmin,
  createNormalAdmin,
  createDemoUsers,
  createDemoFamilyMembers,
  createDemoHealthData,
  createDemoMedications,
  createDemoMedicalHistory
};
/**
 * ASTS - Aile Sağlık Takip Sistemi
 * Report Service - Rapor Oluşturma Servisi
 * 
 * Bu servis, farklı türlerdeki sağlık raporlarının oluşturulmasını ve işlenmesini sağlar.
 * Sağlık özeti, ilaç kullanım analizi, kan şekeri/tansiyon takibi gibi raporlar için kullanılır.
 */

const mongoose = require('mongoose');
const moment = require('moment');
const { logInfo, logError } = require('../middlewares/logger');
const graphService = require('./graphService');
const exportService = require('./exportService');
const notificationService = require('./notificationService');

/**
 * Rapor için tarih aralığı oluşturur
 * @param {string} period - Dönem ('week', 'month', 'quarter', 'halfYear', 'year')
 * @param {Date} endDate - Bitiş tarihi (varsayılan: bugün)
 * @returns {Object} - Başlangıç ve bitiş tarihleri
 */
const createDateRange = (period, endDate = new Date()) => {
  const end = moment(endDate).endOf('day');
  let start;
  
  switch (period) {
    case 'week':
      start = moment(end).subtract(7, 'days').startOf('day');
      break;
    case 'month':
      start = moment(end).subtract(30, 'days').startOf('day');
      break;
    case 'quarter':
      start = moment(end).subtract(90, 'days').startOf('day');
      break;
    case 'halfYear':
      start = moment(end).subtract(180, 'days').startOf('day');
      break;
    case 'year':
      start = moment(end).subtract(365, 'days').startOf('day');
      break;
    default:
      start = moment(end).subtract(30, 'days').startOf('day');
  }
  
  return {
    startDate: start.toDate(),
    endDate: end.toDate()
  };
};

/**
 * Belirli bir tarih aralığı için sağlık verilerini getirir
 * @param {string} familyMemberId - Aile üyesi ID'si
 * @param {Date} startDate - Başlangıç tarihi
 * @param {Date} endDate - Bitiş tarihi
 * @param {string} dataType - Veri tipi (opsiyonel, belirtilmezse tüm veriler)
 * @returns {Promise<Array>} - Sağlık verileri
 */
const getHealthDataForDateRange = async (familyMemberId, startDate, endDate, dataType = null) => {
  try {
    const HealthData = mongoose.model('HealthData');
    
    const query = {
      familyMemberId,
      measuredAt: {
        $gte: startDate,
        $lte: endDate
      }
    };
    
    if (dataType) {
      query.dataType = dataType;
    }
    
    return await HealthData.find(query).sort({ measuredAt: 1 });
  } catch (error) {
    logError('Sağlık verileri getirilemedi', error);
    throw error;
  }
};

/**
 * Belirli bir tarih aralığı için ilaç verilerini getirir
 * @param {string} familyMemberId - Aile üyesi ID'si
 * @param {Date} startDate - Başlangıç tarihi
 * @param {Date} endDate - Bitiş tarihi
 * @returns {Promise<Array>} - İlaç verileri
 */
const getMedicationsForDateRange = async (familyMemberId, startDate, endDate) => {
  try {
    const Medication = mongoose.model('Medication');
    
    return await Medication.find({
      familyMemberId,
      $or: [
        { endDate: null },
        { endDate: { $gte: startDate } }
      ],
      startDate: { $lte: endDate }
    });
  } catch (error) {
    logError('İlaç verileri getirilemedi', error);
    throw error;
  }
};

/**
 * Belirli bir tarih aralığı için fiziksel aktivite verilerini getirir
 * @param {string} familyMemberId - Aile üyesi ID'si
 * @param {Date} startDate - Başlangıç tarihi
 * @param {Date} endDate - Bitiş tarihi
 * @returns {Promise<Array>} - Aktivite verileri
 */
const getActivitiesForDateRange = async (familyMemberId, startDate, endDate) => {
  try {
    const PhysicalActivity = mongoose.model('PhysicalActivity');
    
    return await PhysicalActivity.find({
      familyMemberId,
      startTime: {
        $gte: startDate,
        $lte: endDate
      }
    }).sort({ startTime: 1 });
  } catch (error) {
    logError('Aktivite verileri getirilemedi', error);
    throw error;
  }
};

/**
 * Belirli bir tarih aralığı için beslenme verilerini getirir
 * @param {string} familyMemberId - Aile üyesi ID'si
 * @param {Date} startDate - Başlangıç tarihi
 * @param {Date} endDate - Bitiş tarihi
 * @returns {Promise<Array>} - Beslenme verileri
 */
const getNutritionDataForDateRange = async (familyMemberId, startDate, endDate) => {
  try {
    const NutritionData = mongoose.model('NutritionData');
    
    return await NutritionData.find({
      familyMemberId,
      date: {
        $gte: startDate,
        $lte: endDate
      }
    }).sort({ date: 1 });
  } catch (error) {
    logError('Beslenme verileri getirilemedi', error);
    throw error;
  }
};

/**
 * Sağlık özeti raporu oluşturur
 * @param {string} familyMemberId - Aile üyesi ID'si
 * @param {string} period - Dönem ('week', 'month', 'quarter', 'halfYear', 'year')
 * @param {Object} options - Ek seçenekler
 * @returns {Promise<Object>} - Oluşturulan rapor
 */
const createHealthSummaryReport = async (familyMemberId, period = 'month', options = {}) => {
  try {
    // Modelleri yükle
    const FamilyMember = mongoose.model('FamilyMember');
    const Report = mongoose.model('Report');
    
    // Aile üyesi bilgilerini al
    const familyMember = await FamilyMember.findById(familyMemberId);
    if (!familyMember) {
      throw new Error('Aile üyesi bulunamadı');
    }
    
    // Tarih aralığını oluştur
    const dateRange = createDateRange(period);
    
    // Sağlık verilerini getir
    const healthData = await getHealthDataForDateRange(
      familyMemberId,
      dateRange.startDate,
      dateRange.endDate
    );
    
    // İlaç verilerini getir
    const medications = await getMedicationsForDateRange(
      familyMemberId,
      dateRange.startDate,
      dateRange.endDate
    );
    
    // Kan şekeri ve tansiyon verilerini filtrele
    const bloodSugarData = healthData.filter(data => data.dataType === 'bloodSugar');
    const bloodPressureData = healthData.filter(data => data.dataType === 'bloodPressure');
    const heartRateData = healthData.filter(data => data.dataType === 'heartRate');
    const weightData = healthData.filter(data => data.dataType === 'weight');
    
    // Rapor başlığı
    const title = `Sağlık Özeti Raporu (${moment(dateRange.startDate).format('DD.MM.YYYY')} - ${moment(dateRange.endDate).format('DD.MM.YYYY')})`;
    
    // Rapor bölümleri
    const sections = [];
    const summary = {
      key_findings: [],
      recommendations: [],
      flags: []
    };
    
    // Genel bölüm oluştur
    sections.push({
      title: 'Genel Sağlık Durumu',
      text: `Bu rapor, ${moment(dateRange.startDate).format('DD.MM.YYYY')} - ${moment(dateRange.endDate).format('DD.MM.YYYY')} tarihleri arasındaki sağlık verilerinizi özetlemektedir.`,
      data: {
        totalMeasurements: healthData.length,
        bloodSugarCount: bloodSugarData.length,
        bloodPressureCount: bloodPressureData.length,
        heartRateCount: heartRateData.length,
        weightCount: weightData.length,
        medicationCount: medications.length
      }
    });
    
    // Kan şekeri analizi bölümü
    if (bloodSugarData.length > 0) {
      const values = bloodSugarData.map(data => data.bloodSugar.value);
      const average = values.reduce((sum, val) => sum + val, 0) / values.length;
      const min = Math.min(...values);
      const max = Math.max(...values);
      
      const normalCount = bloodSugarData.filter(data => data.status === 'normal').length;
      const warningCount = bloodSugarData.filter(data => data.status === 'warning').length;
      const criticalCount = bloodSugarData.filter(data => data.status === 'critical').length;
      
      // Kan şekeri grafiği
      const bloodSugarChartData = graphService.createHealthDataLineChart(
        bloodSugarData,
        'bloodSugar',
        dateRange.startDate,
        dateRange.endDate
      );
      
      sections.push({
        title: 'Kan Şekeri Analizi',
        text: `Bu dönemde toplam ${bloodSugarData.length} kan şekeri ölçümü kaydedilmiştir. Ortalama kan şekeri değeri ${average.toFixed(1)} mg/dL olarak hesaplanmıştır.`,
        data: {
          average: average.toFixed(1),
          min,
          max,
          normalCount,
          warningCount,
          criticalCount,
          measurements: bloodSugarData
        },
        chartType: 'line',
        chartData: bloodSugarChartData
      });
      
      // Kan şekeri bulgular
      if (average > 140) {
        summary.key_findings.push(`Ortalama kan şekeri değeri (${average.toFixed(1)} mg/dL) hedef değerin üzerinde.`);
        summary.recommendations.push('Kan şekeri kontrolü için beslenme düzenine dikkat edilmeli ve düzenli ölçüm yapılmalı.');
        
        summary.flags.push({
          type: 'warning',
          message: 'Kan şekeri ortalaması yüksek',
          details: `Ortalama kan şekeri değeri ${average.toFixed(1)} mg/dL`
        });
      }
      
      if (criticalCount > 0) {
        summary.key_findings.push(`${criticalCount} adet kritik kan şekeri değeri tespit edildi.`);
        summary.flags.push({
          type: 'critical',
          message: 'Kritik kan şekeri değerleri var',
          details: `${criticalCount} adet kritik değer. En yüksek: ${max} mg/dL`
        });
      }
    }
    
    // Tansiyon analizi bölümü
    if (bloodPressureData.length > 0) {
      const systolicValues = bloodPressureData
        .filter(data => data.bloodPressure && data.bloodPressure.systolic)
        .map(data => data.bloodPressure.systolic);
      
      const diastolicValues = bloodPressureData
        .filter(data => data.bloodPressure && data.bloodPressure.diastolic)
        .map(data => data.bloodPressure.diastolic);
      
      let systolicAvg = 0;
      let diastolicAvg = 0;
      
      if (systolicValues.length > 0) {
        systolicAvg = systolicValues.reduce((sum, val) => sum + val, 0) / systolicValues.length;
      }
      
      if (diastolicValues.length > 0) {
        diastolicAvg = diastolicValues.reduce((sum, val) => sum + val, 0) / diastolicValues.length;
      }
      
      const normalCount = bloodPressureData.filter(data => data.status === 'normal').length;
      const warningCount = bloodPressureData.filter(data => data.status === 'warning').length;
      const criticalCount = bloodPressureData.filter(data => data.status === 'critical').length;
      
      // Tansiyon grafiği
      const bloodPressureChartData = graphService.createHealthDataLineChart(
        bloodPressureData,
        'bloodPressure',
        dateRange.startDate,
        dateRange.endDate
      );
      
      sections.push({
        title: 'Tansiyon Analizi',
        text: `Bu dönemde toplam ${bloodPressureData.length} tansiyon ölçümü kaydedilmiştir. Ortalama tansiyon değeri ${systolicAvg.toFixed(0)}/${diastolicAvg.toFixed(0)} mmHg olarak hesaplanmıştır.`,
        data: {
          systolicAvg: systolicAvg.toFixed(0),
          diastolicAvg: diastolicAvg.toFixed(0),
          normalCount,
          warningCount,
          criticalCount,
          measurements: bloodPressureData
        },
        chartType: 'line',
        chartData: bloodPressureChartData
      });
      
      // Tansiyon bulgular
      if (systolicAvg > 130 || diastolicAvg > 80) {
        summary.key_findings.push(`Ortalama tansiyon değeri (${systolicAvg.toFixed(0)}/${diastolicAvg.toFixed(0)} mmHg) hedef değerin üzerinde.`);
        summary.recommendations.push('Tansiyon kontrolü için tuz tüketiminin azaltılması ve düzenli egzersiz önerilir.');
        
        summary.flags.push({
          type: 'warning',
          message: 'Tansiyon ortalaması yüksek',
          details: `Ortalama tansiyon değeri ${systolicAvg.toFixed(0)}/${diastolicAvg.toFixed(0)} mmHg`
        });
      }
      
      if (criticalCount > 0) {
        summary.key_findings.push(`${criticalCount} adet kritik tansiyon değeri tespit edildi.`);
        summary.flags.push({
          type: 'critical',
          message: 'Kritik tansiyon değerleri var',
          details: `${criticalCount} adet kritik tansiyon ölçümü`
        });
      }
    }
    
    // İlaç kullanım analizi
    if (medications.length > 0) {
      const activeMedications = medications.filter(med => med.isActive);
      const totalMedicationLogs = activeMedications.reduce((sum, med) => {
        return sum + (med.medicationLogs ? med.medicationLogs.length : 0);
      }, 0);
      
      const adherenceData = activeMedications.map(med => {
        const status = med.checkMedicationStatus ? med.checkMedicationStatus() : { adherenceRate: 0 };
        return {
          name: med.name,
          adherenceRate: status.adherenceRate || 0,
          missedDoses: status.missedDoses || 0,
          totalDoses: status.totalDoses || 0
        };
      });
      
      const avgAdherence = adherenceData.length > 0
        ? adherenceData.reduce((sum, item) => sum + item.adherenceRate, 0) / adherenceData.length
        : 0;
      
      sections.push({
        title: 'İlaç Kullanım Analizi',
        text: `Bu dönemde ${activeMedications.length} farklı ilaç kullanımı takip edilmiştir. Ortalama ilaç kullanım uyumu %${avgAdherence.toFixed(1)} olarak hesaplanmıştır.`,
        data: {
          activeMedicationCount: activeMedications.length,
          totalMedicationCount: medications.length,
          totalLogs: totalMedicationLogs,
          averageAdherence: avgAdherence.toFixed(1),
          adherenceData: adherenceData
        },
        chartType: 'bar'
      });
      
      // İlaç kullanımı bulguları
      if (avgAdherence < 80) {
        summary.key_findings.push(`İlaç kullanım uyumu (%${avgAdherence.toFixed(1)}) hedef değerin altında.`);
        summary.recommendations.push('İlaç hatırlatıcıları kullanılarak ilaç uyumunun artırılması önerilir.');
        
        summary.flags.push({
          type: 'warning',
          message: 'İlaç kullanım uyumu düşük',
          details: `Ortalama uyum oranı %${avgAdherence.toFixed(1)}`
        });
      } else {
        summary.key_findings.push(`İlaç kullanım uyumu (%${avgAdherence.toFixed(1)}) iyi seviyede.`);
      }
      
      // Düşük uyumlu ilaçlar
      const lowAdherenceMeds = adherenceData.filter(med => med.adherenceRate < 70);
      if (lowAdherenceMeds.length > 0) {
        const medNames = lowAdherenceMeds.map(med => med.name).join(', ');
        summary.key_findings.push(`${lowAdherenceMeds.length} ilacın kullanım uyumu düşük: ${medNames}`);
        
        summary.flags.push({
          type: 'warning',
          message: 'Bazı ilaçların kullanım uyumu düşük',
          details: `${medNames} ilaçlarında uyum oranı %70'in altında`
        });
      }
    }
    
    // Genel öneriler
    summary.recommendations.push('Düzenli sağlık kontrolleri ve ölçümler sürdürülmelidir.');
    
    // İyileşme belirtileri
    if (bloodSugarData.length >= 2) {
      const firstHalf = bloodSugarData.slice(0, Math.floor(bloodSugarData.length / 2));
      const secondHalf = bloodSugarData.slice(Math.floor(bloodSugarData.length / 2));
      
      const firstHalfAvg = firstHalf.reduce((sum, data) => sum + data.bloodSugar.value, 0) / firstHalf.length;
      const secondHalfAvg = secondHalf.reduce((sum, data) => sum + data.bloodSugar.value, 0) / secondHalf.length;
      
      if (secondHalfAvg < firstHalfAvg && firstHalfAvg > 140 && secondHalfAvg <= 140) {
        summary.key_findings.push('Kan şekeri değerlerinde iyileşme görülüyor.');
        summary.flags.push({
          type: 'improvement',
          message: 'Kan şekeri değerlerinde iyileşme',
          details: `Ortalama değer ${firstHalfAvg.toFixed(1)} mg/dL'den ${secondHalfAvg.toFixed(1)} mg/dL'ye düştü`
        });
      }
    }
    
    // Rapor oluştur
    const report = new Report({
      familyMemberId,
      title,
      type: 'health_summary',
      description: `${moment(dateRange.startDate).format('DD.MM.YYYY')} - ${moment(dateRange.endDate).format('DD.MM.YYYY')} tarihleri arasındaki sağlık verileri özeti`,
      dateRange,
      content: {
        sections,
        summary
      },
      format: options.format || 'pdf',
      createdBy: options.userId
    });
    
    // İlişkili verileri ekle
    report.relatedData = {
      healthData: healthData.map(data => data._id),
      medications: medications.map(med => med._id)
    };
    
    // Metrikleri ekle
    report.metrics = {
      averages: {},
      trends: {},
      adherence: {}
    };
    
    // Metrikleri doldur
    if (bloodSugarData.length > 0) {
      const values = bloodSugarData.map(data => data.bloodSugar.value);
      report.metrics.averages.bloodSugar = (values.reduce((sum, val) => sum + val, 0) / values.length).toFixed(1);
    }
    
    if (bloodPressureData.length > 0) {
      const systolicValues = bloodPressureData
        .filter(data => data.bloodPressure && data.bloodPressure.systolic)
        .map(data => data.bloodPressure.systolic);
      
      const diastolicValues = bloodPressureData
        .filter(data => data.bloodPressure && data.bloodPressure.diastolic)
        .map(data => data.bloodPressure.diastolic);
      
      if (systolicValues.length > 0) {
        report.metrics.averages.systolic = (systolicValues.reduce((sum, val) => sum + val, 0) / systolicValues.length).toFixed(0);
      }
      
      if (diastolicValues.length > 0) {
        report.metrics.averages.diastolic = (diastolicValues.reduce((sum, val) => sum + val, 0) / diastolicValues.length).toFixed(0);
      }
    }
    
    if (medications.length > 0) {
      const activeData = medications
        .filter(med => med.isActive)
        .map(med => {
          const status = med.checkMedicationStatus ? med.checkMedicationStatus() : { adherenceRate: 0 };
          return status.adherenceRate || 0;
        });
      
      if (activeData.length > 0) {
        report.metrics.adherence.medication = (activeData.reduce((sum, val) => sum + val, 0) / activeData.length).toFixed(1);
      }
    }
    
    // Raporu kaydet
    await report.save();
    
    // Bildirim gönder
    try {
      await notificationService.sendReportReadyNotification(report, familyMember);
    } catch (error) {
      logError('Rapor bildirimi gönderilemedi', error);
    }
    
    return report;
  } catch (error) {
    logError('Sağlık özeti raporu oluşturulamadı', error);
    throw error;
  }
};

/**
 * Kan şekeri analiz raporu oluşturur
 * @param {string} familyMemberId - Aile üyesi ID'si
 * @param {string} period - Dönem ('week', 'month', 'quarter', 'halfYear', 'year')
 * @param {Object} options - Ek seçenekler
 * @returns {Promise<Object>} - Oluşturulan rapor
 */
const createBloodSugarAnalysisReport = async (familyMemberId, period = 'month', options = {}) => {
  try {
    // Modelleri yükle
    const FamilyMember = mongoose.model('FamilyMember');
    const Report = mongoose.model('Report');
    
    // Aile üyesi bilgilerini al
    const familyMember = await FamilyMember.findById(familyMemberId);
    if (!familyMember) {
      throw new Error('Aile üyesi bulunamadı');
    }
    
    // Tarih aralığını oluştur
    const dateRange = createDateRange(period);
    
    // Kan şekeri verilerini getir
    const bloodSugarData = await getHealthDataForDateRange(
      familyMemberId,
      dateRange.startDate,
      dateRange.endDate,
      'bloodSugar'
    );
    
    if (bloodSugarData.length === 0) {
      throw new Error('Seçilen dönemde kan şekeri verisi bulunamadı');
    }
    
    // Rapor başlığı
    const title = `Kan Şekeri Analiz Raporu (${moment(dateRange.startDate).format('DD.MM.YYYY')} - ${moment(dateRange.endDate).format('DD.MM.YYYY')})`;
    
    // Rapor bölümleri
    const sections = [];
    const summary = {
      key_findings: [],
      recommendations: [],
      flags: []
    };
    
    // Genel istatistikler
    const values = bloodSugarData.map(data => data.bloodSugar.value);
    const average = values.reduce((sum, val) => sum + val, 0) / values.length;
    const min = Math.min(...values);
    const max = Math.max(...values);
    
    const normalCount = bloodSugarData.filter(data => data.status === 'normal').length;
    const warningCount = bloodSugarData.filter(data => data.status === 'warning').length;
    const criticalCount = bloodSugarData.filter(data => data.status === 'critical').length;
    
    const normalPercentage = (normalCount / bloodSugarData.length * 100).toFixed(1);
    const warningPercentage = (warningCount / bloodSugarData.length * 100).toFixed(1);
    const criticalPercentage = (criticalCount / bloodSugarData.length * 100).toFixed(1);
    
    // Ölçüm tiplerine göre filtrele
    const fastingData = bloodSugarData.filter(data => 
      data.bloodSugar.measurementType === 'fasting'
    );
    
    const postprandialData = bloodSugarData.filter(data => 
      data.bloodSugar.measurementType === 'postprandial'
    );
    
    // Açlık ve tokluk ortalamaları
    let fastingAvg = 0;
    let postprandialAvg = 0;
    
    if (fastingData.length > 0) {
      fastingAvg = fastingData.reduce((sum, data) => sum + data.bloodSugar.value, 0) / fastingData.length;
    }
    
    if (postprandialData.length > 0) {
      postprandialAvg = postprandialData.reduce((sum, data) => sum + data.bloodSugar.value, 0) / postprandialData.length;
    }
    
    // Kan şekeri grafiği
    const bloodSugarChartData = graphService.createHealthDataLineChart(
      bloodSugarData,
      'bloodSugar',
      dateRange.startDate,
      dateRange.endDate
    );
    
    // Dağılım grafiği
    const distributionChartData = graphService.createHealthDataDistributionChart(
      bloodSugarData,
      'bloodSugar'
    );
    
    // Saatlik dağılım grafiği
    const hourlyChartData = graphService.createHealthDataHourlyChart(
      bloodSugarData,
      'bloodSugar'
    );
    
    // Genel analiz bölümü
    sections.push({
      title: 'Kan Şekeri Genel Analiz',
      text: `Bu dönemde toplam ${bloodSugarData.length} kan şekeri ölçümü yapılmıştır. Ortalama kan şekeri değeri ${average.toFixed(1)} mg/dL olarak hesaplanmıştır.`,
      data: {
        measurements: bloodSugarData.length,
        average: average.toFixed(1),
        min,
        max,
        normalCount,
        warningCount,
        criticalCount,
        normalPercentage,
        warningPercentage,
        criticalPercentage,
        fastingCount: fastingData.length,
        postprandialCount: postprandialData.length,
        fastingAvg: fastingAvg.toFixed(1),
        postprandialAvg: postprandialAvg.toFixed(1)
      },
      chartType: 'line',
      chartData: bloodSugarChartData
    });
    
    // Ölçüm tipi dağılımı bölümü
    sections.push({
      title: 'Ölçüm Tipi Dağılımı',
      text: `Toplam ${fastingData.length} açlık ve ${postprandialData.length} tokluk ölçümü yapılmıştır.`,
      data: {
        fastingCount: fastingData.length,
        postprandialCount: postprandialData.length,
        randomCount: bloodSugarData.length - fastingData.length - postprandialData.length,
        fastingAvg: fastingAvg.toFixed(1),
        postprandialAvg: postprandialAvg.toFixed(1)
      },
      chartType: 'pie',
      chartData: distributionChartData
    });
    
    // Saatlik dağılım bölümü
    sections.push({
      title: 'Günlük Kan Şekeri Dalgalanması',
      text: 'Bu grafik, gün içindeki kan şekeri değişimlerini göstermektedir. Belirli saatlerdeki ortalama kan şekeri değerleri analiz edilmiştir.',
      data: {
        hourlyData: bloodSugarData
      },
      chartType: 'bar',
      chartData: hourlyChartData
    });
    
    // Bulgular ve öneriler
    if (average > 140) {
      summary.key_findings.push(`Ortalama kan şekeri değeri (${average.toFixed(1)} mg/dL) hedef değerin üzerinde.`);
      summary.recommendations.push('Kan şekeri kontrolü için beslenme düzenine dikkat edilmeli ve düzenli ölçüm yapılmalı.');
      
      summary.flags.push({
        type: 'warning',
        message: 'Kan şekeri ortalaması yüksek',
        details: `Ortalama kan şekeri değeri ${average.toFixed(1)} mg/dL`
      });
    }
    
    if (fastingAvg > 100 && fastingData.length > 0) {
      summary.key_findings.push(`Ortalama açlık kan şekeri değeri (${fastingAvg.toFixed(1)} mg/dL) hedef değerin üzerinde.`);
      summary.recommendations.push('Açlık kan şekeri değerlerini düşürmek için gece yemek yeme alışkanlıklarınızı gözden geçirin.');
      
      summary.flags.push({
        type: 'warning',
        message: 'Açlık kan şekeri ortalaması yüksek',
        details: `Ortalama açlık değeri ${fastingAvg.toFixed(1)} mg/dL`
      });
    }
    
    if (postprandialAvg > 140 && postprandialData.length > 0) {
      summary.key_findings.push(`Ortalama tokluk kan şekeri değeri (${postprandialAvg.toFixed(1)} mg/dL) hedef değerin üzerinde.`);
      summary.recommendations.push('Tokluk kan şekeri değerlerini düşürmek için öğün içeriğinizi gözden geçirin, karbonhidrat miktarını azaltın.');
      
      summary.flags.push({
        type: 'warning',
        message: 'Tokluk kan şekeri ortalaması yüksek',
        details: `Ortalama tokluk değeri ${postprandialAvg.toFixed(1)} mg/dL`
      });
    }
    
    if (criticalCount > 0) {
      summary.key_findings.push(`${criticalCount} adet kritik kan şekeri değeri tespit edildi.`);
      summary.flags.push({
        type: 'critical',
        message: 'Kritik kan şekeri değerleri var',
        details: `${criticalCount} adet kritik değer. En yüksek: ${max} mg/dL`
      });
    }
    
    // Gelişme belirtileri
    if (bloodSugarData.length >= 4) {
      const firstHalf = bloodSugarData.slice(0, Math.floor(bloodSugarData.length / 2));
      const secondHalf = bloodSugarData.slice(Math.floor(bloodSugarData.length / 2));
      
      const firstHalfAvg = firstHalf.reduce((sum, data) => sum + data.bloodSugar.value, 0) / firstHalf.length;
      const secondHalfAvg = secondHalf.reduce((sum, data) => sum + data.bloodSugar.value, 0) / secondHalf.length;
      
      const improvement = ((firstHalfAvg - secondHalfAvg) / firstHalfAvg * 100).toFixed(1);
      
      if (secondHalfAvg < firstHalfAvg && parseFloat(improvement) > 5) {
        summary.key_findings.push(`Kan şekeri değerlerinde %${improvement} oranında iyileşme görülüyor.`);
        summary.flags.push({
          type: 'improvement',
          message: 'Kan şekeri değerlerinde iyileşme',
          details: `Ortalama değer ${firstHalfAvg.toFixed(1)} mg/dL'den ${secondHalfAvg.toFixed(1)} mg/dL'ye düştü (-%${improvement})`
        });
      }
    }
    
    // Genel öneriler
    summary.recommendations.push('Kan şekeri değerlerinizi düzenli olarak ölçmeye devam edin.');
    summary.recommendations.push('Beslenme, fiziksel aktivite ve ilaç kullanımı konusunda doktorunuzun önerilerine uyun.');
    
    // Rapor oluştur
    const report = new Report({
      familyMemberId,
      title,
      type: 'blood_sugar_analysis',
      description: `${moment(dateRange.startDate).format('DD.MM.YYYY')} - ${moment(dateRange.endDate).format('DD.MM.YYYY')} tarihleri arasındaki kan şekeri verileri analizi`,
      dateRange,
      content: {
        sections,
        summary
      },
      format: options.format || 'pdf',
      createdBy: options.userId
    });
    
    // İlişkili verileri ekle
    report.relatedData = {
      healthData: bloodSugarData.map(data => data._id)
    };
    
    // Metrikleri ekle
    report.metrics = {
      averages: {
        bloodSugar: average.toFixed(1),
        fastingBloodSugar: fastingAvg.toFixed(1),
        postprandialBloodSugar: postprandialAvg.toFixed(1)
      },
      distribution: {
        normal: normalPercentage,
        warning: warningPercentage,
        critical: criticalPercentage
      }
    };
    
    // Raporu kaydet
    await report.save();
    
    // Bildirim gönder
    try {
      await notificationService.sendReportReadyNotification(report, familyMember);
    } catch (error) {
      logError('Rapor bildirimi gönderilemedi', error);
    }
    
    return report;
  } catch (error) {
    logError('Kan şekeri analiz raporu oluşturulamadı', error);
    throw error;
  }
};

/**
 * Raporu dışa aktarır
 * @param {Object} report - Rapor nesnesi
 * @param {Object} familyMember - Aile üyesi nesnesi
 * @param {string} format - Çıktı formatı (pdf, excel)
 * @returns {Promise<string>} - Oluşturulan dosyanın yolu
 */
const exportReport = async (report, familyMember, format = 'pdf') => {
  try {
    return await exportService.exportReport(report, familyMember, format);
  } catch (error) {
    logError('Rapor dışa aktarılamadı', error);
    throw error;
  }
};

/**
 * Otomatik rapor oluşturma işlemini çalıştırır
 * Zamanlanmış görev (cron job) tarafından çağrılır
 */
const runScheduledReports = async () => {
  try {
    const User = mongoose.model('User');
    const FamilyMember = mongoose.model('FamilyMember');
    const Settings = mongoose.model('Settings');
    
    // Tüm aktif kullanıcıları getir
    const users = await User.find({ isActive: true });
    
    for (const user of users) {
      try {
        // Kullanıcı ayarlarını getir
        const settings = await Settings.findOne({ userId: user._id });
        
        // Otomatik rapor oluşturma aktif mi kontrol et
        if (!settings || !settings.reports || !settings.reports.autoGenerate || !settings.reports.autoGenerate.enabled) {
          continue;
        }
        
        // Kullanıcının aile üyelerini getir
        const familyMembers = await FamilyMember.find({ userId: user._id, isActive: true });
        
        for (const familyMember of familyMembers) {
          // Rapor türleri
          const reportTypes = settings.reports.autoGenerate.types || {};
          
          // Otomatik dönem
          const period = settings.reports.defaultPeriod || 'month';
          
          // Sağlık özeti raporu
          if (reportTypes.health_summary) {
            try {
              await createHealthSummaryReport(familyMember._id, period, { userId: user._id });
              logInfo(`Otomatik sağlık özeti raporu oluşturuldu: ${familyMember.name} ${familyMember.surname}`);
            } catch (error) {
              logError(`Otomatik sağlık özeti raporu oluşturulamadı: ${familyMember._id}`, error);
            }
          }
          
          // Kan şekeri analiz raporu
          if (reportTypes.blood_sugar_analysis) {
            try {
              await createBloodSugarAnalysisReport(familyMember._id, period, { userId: user._id });
              logInfo(`Otomatik kan şekeri analiz raporu oluşturuldu: ${familyMember.name} ${familyMember.surname}`);
            } catch (error) {
              logError(`Otomatik kan şekeri analiz raporu oluşturulamadı: ${familyMember._id}`, error);
            }
          }
          
          // Diğer rapor türleri buraya eklenebilir
        }
      } catch (error) {
        logError(`Kullanıcı için otomatik rapor oluşturulamadı: ${user._id}`, error);
      }
    }
  } catch (error) {
    logError('Zamanlanmış raporlar çalıştırılamadı', error);
  }
};

/**
 * Raporu arşivler
 * @param {string} reportId - Rapor ID'si
 * @returns {Promise<Object>} - Güncellenen rapor
 */
const archiveReport = async (reportId) => {
  try {
    const Report = mongoose.model('Report');
    const report = await Report.findById(reportId);
    
    if (!report) {
      throw new Error('Rapor bulunamadı');
    }
    
    report.status = 'archived';
    await report.save();
    
    return report;
  } catch (error) {
    logError(`Rapor arşivlenemedi: ${reportId}`, error);
    throw error;
  }
};

/**
 * Raporu siler
 * @param {string} reportId - Rapor ID'si
 * @returns {Promise<boolean>} - Başarılı ise true
 */
const deleteReport = async (reportId) => {
  try {
    const Report = mongoose.model('Report');
    await Report.findByIdAndDelete(reportId);
    
    return true;
  } catch (error) {
    logError(`Rapor silinemedi: ${reportId}`, error);
    throw error;
  }
};

module.exports = {
  createHealthSummaryReport,
  createBloodSugarAnalysisReport,
  exportReport,
  runScheduledReports,
  archiveReport,
  deleteReport,
  getHealthDataForDateRange,
  getMedicationsForDateRange,
  getActivitiesForDateRange,
  getNutritionDataForDateRange,
  createDateRange
};
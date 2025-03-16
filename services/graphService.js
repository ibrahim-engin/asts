/**
 * ASTS - Aile Sağlık Takip Sistemi
 * Graph Service - Grafik Oluşturma Servisi
 * 
 * Bu servis, sağlık verilerinin grafiksel gösterimini sağlar.
 * Chart.js kütüphanesi ile uyumlu grafik verileri oluşturur.
 */

const moment = require('moment');
const config = require('../config');
const { logError } = require('../middlewares/logger');

/**
 * Chart.js için renk yapılandırmasını döndürür
 * @param {string} dataType - Veri tipi
 * @param {string} subType - Alt tür (opsiyonel)
 * @returns {Object} - Renk yapılandırması
 */
const getChartColors = (dataType, subType = null) => {
  // Config'den renkleri al
  const colors = config.reports.chartColors;
  
  if (dataType === 'bloodPressure' && subType) {
    // Tansiyon alt türleri için
    if (subType === 'systolic' && colors.bloodPressure.systolic) {
      return colors.bloodPressure.systolic;
    } else if (subType === 'diastolic' && colors.bloodPressure.diastolic) {
      return colors.bloodPressure.diastolic;
    }
  } else if (colors[dataType]) {
    // Diğer veri tipleri için
    return colors[dataType];
  }
  
  // Varsayılan renkler
  return {
    backgroundColor: 'rgba(54, 162, 235, 0.2)',
    borderColor: 'rgba(54, 162, 235, 1)'
  };
};

/**
 * Bir zaman aralığı için veri noktaları oluşturur
 * @param {Date} startDate - Başlangıç tarihi
 * @param {Date} endDate - Bitiş tarihi
 * @param {string} interval - Aralık ('day', 'week', 'month')
 * @returns {Array<Object>} - Tarih formatlanmış veri noktaları
 */
const generateTimePoints = (startDate, endDate, interval = 'day') => {
  const start = moment(startDate).startOf('day');
  const end = moment(endDate).endOf('day');
  const result = [];
  
  let current = start.clone();
  
  while (current.isSameOrBefore(end)) {
    result.push({
      date: current.toDate(),
      formattedDate: formatDateByInterval(current, interval),
      rawDate: current.format('YYYY-MM-DD'),
      value: null
    });
    
    if (interval === 'day') {
      current.add(1, 'days');
    } else if (interval === 'week') {
      current.add(1, 'weeks');
    } else if (interval === 'month') {
      current.add(1, 'months');
    }
  }
  
  return result;
};

/**
 * Aralığa göre tarihi formatlar
 * @param {moment.Moment} date - Moment tarihi
 * @param {string} interval - Aralık ('day', 'week', 'month')
 * @returns {string} - Formatlanmış tarih
 */
const formatDateByInterval = (date, interval) => {
  if (interval === 'day') {
    return date.format('DD.MM.YYYY');
  } else if (interval === 'week') {
    return `${date.startOf('isoWeek').format('DD.MM')} - ${date.endOf('isoWeek').format('DD.MM.YYYY')}`;
  } else if (interval === 'month') {
    return date.format('MMMM YYYY');
  }
  
  return date.format('DD.MM.YYYY');
};

/**
 * Veri aralığı için uygun zaman aralığını belirler
 * @param {Date} startDate - Başlangıç tarihi
 * @param {Date} endDate - Bitiş tarihi
 * @returns {string} - Aralık türü ('day', 'week', 'month')
 */
const determineInterval = (startDate, endDate) => {
  const start = moment(startDate);
  const end = moment(endDate);
  const daysDiff = end.diff(start, 'days');
  
  if (daysDiff <= 31) {
    return 'day';
  } else if (daysDiff <= 120) {
    return 'week';
  } else {
    return 'month';
  }
};

/**
 * Sağlık verilerinden Line Chart verisi oluşturur
 * @param {Array} healthData - Sağlık verileri
 * @param {string} dataType - Veri tipi
 * @param {Date} startDate - Başlangıç tarihi
 * @param {Date} endDate - Bitiş tarihi
 * @returns {Object} - Line Chart verisi
 */
const createHealthDataLineChart = (healthData, dataType, startDate, endDate) => {
  try {
    // Uygun aralığı belirle
    const interval = determineInterval(startDate, endDate);
    
    // Başlangıç ve bitiş tarihlerini ayarla
    const start = startDate ? moment(startDate).startOf('day').toDate() : moment().subtract(30, 'days').startOf('day').toDate();
    const end = endDate ? moment(endDate).endOf('day').toDate() : moment().endOf('day').toDate();
    
    // Zaman noktalarını oluştur
    const timePoints = generateTimePoints(start, end, interval);
    
    // Veri tipi için yapılandırma
    let chartTitle, yAxisLabel, datasets = [];
    
    // Özel veri işleme mantığı ve veri setleri oluştur
    if (dataType === 'bloodSugar') {
      chartTitle = 'Kan Şekeri Takibi';
      yAxisLabel = 'Kan Şekeri (mg/dL)';
      
      // Kan şekeri verileri
      const dataMap = {};
      
      // Verileri grupla
      healthData.forEach(data => {
        if (data.dataType === 'bloodSugar' && data.bloodSugar && data.bloodSugar.value) {
          const date = moment(data.measuredAt).startOf('day').format('YYYY-MM-DD');
          
          if (!dataMap[date]) {
            dataMap[date] = [];
          }
          
          dataMap[date].push({
            value: data.bloodSugar.value,
            measuredAt: data.measuredAt,
            type: data.bloodSugar.measurementType || 'random',
            status: data.status
          });
        }
      });
      
      // Zaman noktalarına verileri ekle
      timePoints.forEach(point => {
        const dateData = dataMap[point.rawDate];
        
        if (dateData && dateData.length > 0) {
          // Günlük ortalama
          const sum = dateData.reduce((total, item) => total + item.value, 0);
          const avg = sum / dateData.length;
          point.value = Math.round(avg * 10) / 10; // 1 ondalık basamak
          
          // En düşük ve en yüksek değerler
          point.min = Math.min(...dateData.map(item => item.value));
          point.max = Math.max(...dateData.map(item => item.value));
          
          // Durum bilgisi
          if (dateData.some(item => item.status === 'critical')) {
            point.status = 'critical';
          } else if (dateData.some(item => item.status === 'warning')) {
            point.status = 'warning';
          } else {
            point.status = 'normal';
          }
        }
      });
      
      // Ana veri seti
      const colors = getChartColors('bloodSugar');
      datasets.push({
        label: 'Kan Şekeri',
        data: timePoints.map(point => point.value),
        backgroundColor: colors.backgroundColor,
        borderColor: colors.borderColor,
        borderWidth: 2,
        tension: 0.2,
        pointBackgroundColor: timePoints.map(point => {
          if (point.status === 'critical') return 'rgba(255, 0, 0, 0.8)';
          if (point.status === 'warning') return 'rgba(255, 193, 7, 0.8)';
          return colors.borderColor;
        }),
        pointRadius: 4
      });
      
      // Referans çizgileri
      const refValues = config.healthReferenceValues.bloodSugar.fasting;
      
      // Normal aralık
      datasets.push({
        label: 'Minimum Normal',
        data: timePoints.map(() => refValues.min),
        borderColor: 'rgba(0, 200, 0, 0.3)',
        borderWidth: 1,
        pointRadius: 0,
        fill: false,
        tension: 0
      });
      
      datasets.push({
        label: 'Maksimum Normal',
        data: timePoints.map(() => refValues.max),
        borderColor: 'rgba(200, 0, 0, 0.3)',
        borderWidth: 1,
        pointRadius: 0,
        fill: false,
        tension: 0
      });
      
    } else if (dataType === 'bloodPressure') {
      chartTitle = 'Tansiyon Takibi';
      yAxisLabel = 'Tansiyon (mmHg)';
      
      // Sistolik ve diastolik değerler için ayrı veri kümeleri
      const systolicMap = {};
      const diastolicMap = {};
      
      // Verileri grupla
      healthData.forEach(data => {
        if (data.dataType === 'bloodPressure' && data.bloodPressure) {
          const date = moment(data.measuredAt).startOf('day').format('YYYY-MM-DD');
          
          if (data.bloodPressure.systolic) {
            if (!systolicMap[date]) {
              systolicMap[date] = [];
            }
            
            systolicMap[date].push({
              value: data.bloodPressure.systolic,
              measuredAt: data.measuredAt,
              status: data.status
            });
          }
          
          if (data.bloodPressure.diastolic) {
            if (!diastolicMap[date]) {
              diastolicMap[date] = [];
            }
            
            diastolicMap[date].push({
                value: data.bloodPressure.diastolic,
                measuredAt: data.measuredAt,
                status: data.status
              });
            }
          }
        });
        
        // Zaman noktalarına verileri ekle
        const systolicPoints = JSON.parse(JSON.stringify(timePoints));
        const diastolicPoints = JSON.parse(JSON.stringify(timePoints));
        
        // Sistolik değerler
        systolicPoints.forEach(point => {
          const dateData = systolicMap[point.rawDate];
          
          if (dateData && dateData.length > 0) {
            // Günlük ortalama
            const sum = dateData.reduce((total, item) => total + item.value, 0);
            const avg = sum / dateData.length;
            point.value = Math.round(avg);
            
            // Durum bilgisi
            if (dateData.some(item => item.status === 'critical')) {
              point.status = 'critical';
            } else if (dateData.some(item => item.status === 'warning')) {
              point.status = 'warning';
            } else {
              point.status = 'normal';
            }
          }
        });
        
        // Diastolik değerler
        diastolicPoints.forEach(point => {
          const dateData = diastolicMap[point.rawDate];
          
          if (dateData && dateData.length > 0) {
            // Günlük ortalama
            const sum = dateData.reduce((total, item) => total + item.value, 0);
            const avg = sum / dateData.length;
            point.value = Math.round(avg);
            
            // Durum bilgisi
            if (dateData.some(item => item.status === 'critical')) {
              point.status = 'critical';
            } else if (dateData.some(item => item.status === 'warning')) {
              point.status = 'warning';
            } else {
              point.status = 'normal';
            }
          }
        });
        
        // Sistolik veri seti
        const systolicColors = getChartColors('bloodPressure', 'systolic');
        datasets.push({
          label: 'Sistolik',
          data: systolicPoints.map(point => point.value),
          backgroundColor: systolicColors.backgroundColor,
          borderColor: systolicColors.borderColor,
          borderWidth: 2,
          tension: 0.2,
          pointBackgroundColor: systolicPoints.map(point => {
            if (point.status === 'critical') return 'rgba(255, 0, 0, 0.8)';
            if (point.status === 'warning') return 'rgba(255, 193, 7, 0.8)';
            return systolicColors.borderColor;
          }),
          pointRadius: 4
        });
        
        // Diastolik veri seti
        const diastolicColors = getChartColors('bloodPressure', 'diastolic');
        datasets.push({
          label: 'Diastolik',
          data: diastolicPoints.map(point => point.value),
          backgroundColor: diastolicColors.backgroundColor,
          borderColor: diastolicColors.borderColor,
          borderWidth: 2,
          tension: 0.2,
          pointBackgroundColor: diastolicPoints.map(point => {
            if (point.status === 'critical') return 'rgba(255, 0, 0, 0.8)';
            if (point.status === 'warning') return 'rgba(255, 193, 7, 0.8)';
            return diastolicColors.borderColor;
          }),
          pointRadius: 4
        });
        
        // Referans çizgileri - sistolik
        const systolicRef = config.healthReferenceValues.bloodPressure.systolic;
        datasets.push({
          label: 'Sistolik Maks. Normal',
          data: timePoints.map(() => systolicRef.max),
          borderColor: 'rgba(200, 0, 0, 0.3)',
          borderWidth: 1,
          pointRadius: 0,
          fill: false,
          tension: 0
        });
        
        // Referans çizgileri - diastolik
        const diastolicRef = config.healthReferenceValues.bloodPressure.diastolic;
        datasets.push({
          label: 'Diastolik Maks. Normal',
          data: timePoints.map(() => diastolicRef.max),
          borderColor: 'rgba(0, 0, 200, 0.3)',
          borderWidth: 1,
          pointRadius: 0,
          fill: false,
          tension: 0
        });
        
      } else if (dataType === 'heartRate') {
        chartTitle = 'Nabız Takibi';
        yAxisLabel = 'Nabız (atım/dk)';
        
        // Nabız verileri
        const dataMap = {};
        
        // Verileri grupla
        healthData.forEach(data => {
          if (data.dataType === 'heartRate' && data.heartRate && data.heartRate.value) {
            const date = moment(data.measuredAt).startOf('day').format('YYYY-MM-DD');
            
            if (!dataMap[date]) {
              dataMap[date] = [];
            }
            
            dataMap[date].push({
              value: data.heartRate.value,
              measuredAt: data.measuredAt,
              activityLevel: data.heartRate.activityLevel || 'rest',
              status: data.status
            });
          }
        });
        
        // Zaman noktalarına verileri ekle
        timePoints.forEach(point => {
          const dateData = dataMap[point.rawDate];
          
          if (dateData && dateData.length > 0) {
            // Günlük ortalama
            const sum = dateData.reduce((total, item) => total + item.value, 0);
            const avg = sum / dateData.length;
            point.value = Math.round(avg);
            
            // En düşük ve en yüksek değerler
            point.min = Math.min(...dateData.map(item => item.value));
            point.max = Math.max(...dateData.map(item => item.value));
            
            // Durum bilgisi
            if (dateData.some(item => item.status === 'critical')) {
              point.status = 'critical';
            } else if (dateData.some(item => item.status === 'warning')) {
              point.status = 'warning';
            } else {
              point.status = 'normal';
            }
          }
        });
        
        // Ana veri seti
        const colors = getChartColors('heartRate');
        datasets.push({
          label: 'Nabız',
          data: timePoints.map(point => point.value),
          backgroundColor: colors.backgroundColor,
          borderColor: colors.borderColor,
          borderWidth: 2,
          tension: 0.2,
          pointBackgroundColor: timePoints.map(point => {
            if (point.status === 'critical') return 'rgba(255, 0, 0, 0.8)';
            if (point.status === 'warning') return 'rgba(255, 193, 7, 0.8)';
            return colors.borderColor;
          }),
          pointRadius: 4
        });
        
        // Referans çizgileri
        const refValues = config.healthReferenceValues.heartRate;
        
        // Min-Max normal
        datasets.push({
          label: 'Minimum Normal',
          data: timePoints.map(() => refValues.min),
          borderColor: 'rgba(0, 200, 0, 0.3)',
          borderWidth: 1,
          pointRadius: 0,
          fill: false,
          tension: 0
        });
        
        datasets.push({
          label: 'Maksimum Normal',
          data: timePoints.map(() => refValues.max),
          borderColor: 'rgba(200, 0, 0, 0.3)',
          borderWidth: 1,
          pointRadius: 0,
          fill: false,
          tension: 0
        });
        
      } else if (dataType === 'weight') {
        chartTitle = 'Kilo Takibi';
        yAxisLabel = 'Kilo (kg)';
        
        // Kilo verileri
        const dataMap = {};
        
        // Verileri grupla
        healthData.forEach(data => {
          if (data.dataType === 'weight' && data.weight && data.weight.value) {
            const date = moment(data.measuredAt).startOf('day').format('YYYY-MM-DD');
            
            if (!dataMap[date]) {
              dataMap[date] = [];
            }
            
            let value = data.weight.value;
            
            // Birim dönüşümü
            if (data.weight.unit === 'lb') {
              value = value * 0.453592; // pound'dan kg'a çevir
            }
            
            dataMap[date].push({
              value: value,
              measuredAt: data.measuredAt
            });
          }
        });
        
        // Zaman noktalarına verileri ekle
        timePoints.forEach(point => {
          const dateData = dataMap[point.rawDate];
          
          if (dateData && dateData.length > 0) {
            // Günün son ölçümü
            dateData.sort((a, b) => new Date(b.measuredAt) - new Date(a.measuredAt));
            point.value = parseFloat(dateData[0].value.toFixed(1));
          }
        });
        
        // En son ölçümü olmayan günleri interpolasyon ile doldur
        let lastValue = null;
        for (let i = 0; i < timePoints.length; i++) {
          if (timePoints[i].value !== null) {
            lastValue = timePoints[i].value;
          } else if (lastValue !== null) {
            // İlerideki bir değer var mı bak
            let nextValue = null;
            let nextIndex = -1;
            
            for (let j = i + 1; j < timePoints.length; j++) {
              if (timePoints[j].value !== null) {
                nextValue = timePoints[j].value;
                nextIndex = j;
                break;
              }
            }
            
            // İlerideki değer varsa iki nokta arasında interpolasyon yap
            if (nextValue !== null) {
              const gap = nextIndex - i + 1;
              const step = (nextValue - lastValue) / gap;
              timePoints[i].value = parseFloat((lastValue + step).toFixed(1));
              lastValue = timePoints[i].value;
            } else {
              // İleride değer yoksa son değeri kullan
              timePoints[i].value = lastValue;
            }
          }
        }
        
        // Ana veri seti
        const colors = getChartColors('weight');
        datasets.push({
          label: 'Kilo',
          data: timePoints.map(point => point.value),
          backgroundColor: colors.backgroundColor,
          borderColor: colors.borderColor,
          borderWidth: 2,
          tension: 0.3,
          fill: false,
          pointRadius: 4
        });
        
      } else {
        // Desteklenen diğer veri tipleri buraya eklenebilir
        return null;
      }
      
      // Grafik yapılandırması
      return {
        type: 'line',
        data: {
          labels: timePoints.map(point => point.formattedDate),
          datasets: datasets
        },
        options: {
          responsive: true,
          plugins: {
            title: {
              display: true,
              text: chartTitle
            },
            tooltip: {
              mode: 'index',
              intersect: false
            },
            legend: {
              position: 'top',
            }
          },
          scales: {
            x: {
              display: true,
              title: {
                display: true,
                text: 'Tarih'
              }
            },
            y: {
              display: true,
              title: {
                display: true,
                text: yAxisLabel
              }
            }
          }
        }
      };
    } catch (error) {
      logError('Line Chart oluşturma hatası', error);
      return null;
    }
  };
  
  /**
   * Sağlık verileri için dağılım grafiği oluşturur
   * @param {Array} healthData - Sağlık verileri
   * @param {string} dataType - Veri tipi
   * @returns {Object} - Pie Chart verisi
   */
  const createHealthDataDistributionChart = (healthData, dataType) => {
    try {
      // Veri tipi için yapılandırma
      let chartTitle, data, labels, backgroundColors;
      
      // Filtreleme
      const filteredData = healthData.filter(data => data.dataType === dataType);
      
      if (!filteredData || filteredData.length === 0) {
        return null;
      }
      
      // Durum dağılımını hesapla
      const statusCounts = {
        normal: filteredData.filter(item => item.status === 'normal').length,
        warning: filteredData.filter(item => item.status === 'warning').length,
        critical: filteredData.filter(item => item.status === 'critical').length
      };
      
      if (dataType === 'bloodSugar') {
        chartTitle = 'Kan Şekeri Değer Dağılımı';
        
        // Ölçüm tiplerine göre dağılım
        const typeCounts = {
          fasting: filteredData.filter(item => item.bloodSugar && item.bloodSugar.measurementType === 'fasting').length,
          postprandial: filteredData.filter(item => item.bloodSugar && item.bloodSugar.measurementType === 'postprandial').length,
          random: filteredData.filter(item => item.bloodSugar && (!item.bloodSugar.measurementType || item.bloodSugar.measurementType === 'random')).length
        };
        
        labels = ['Açlık', 'Tokluk', 'Rastgele'];
        data = [typeCounts.fasting, typeCounts.postprandial, typeCounts.random];
        backgroundColors = [
          'rgba(54, 162, 235, 0.6)',
          'rgba(255, 99, 132, 0.6)',
          'rgba(255, 205, 86, 0.6)'
        ];
        
      } else if (dataType === 'bloodPressure') {
        chartTitle = 'Tansiyon Değer Dağılımı';
        
        // Pozisyona göre dağılım
        const positionCounts = {
          sitting: filteredData.filter(item => item.bloodPressure && item.bloodPressure.position === 'sitting').length,
          standing: filteredData.filter(item => item.bloodPressure && item.bloodPressure.position === 'standing').length,
          lying: filteredData.filter(item => item.bloodPressure && item.bloodPressure.position === 'lying').length
        };
        
        labels = ['Oturarak', 'Ayakta', 'Yatarak'];
        data = [positionCounts.sitting, positionCounts.standing, positionCounts.lying];
        backgroundColors = [
          'rgba(54, 162, 235, 0.6)',
          'rgba(75, 192, 192, 0.6)',
          'rgba(153, 102, 255, 0.6)'
        ];
        
      } else if (dataType === 'heartRate') {
        chartTitle = 'Nabız Ölçüm Dağılımı';
        
        // Aktivite seviyesine göre dağılım
        const activityCounts = {
          rest: filteredData.filter(item => item.heartRate && (!item.heartRate.activityLevel || item.heartRate.activityLevel === 'rest')).length,
          light: filteredData.filter(item => item.heartRate && item.heartRate.activityLevel === 'light').length,
          moderate: filteredData.filter(item => item.heartRate && item.heartRate.activityLevel === 'moderate').length,
          intense: filteredData.filter(item => item.heartRate && item.heartRate.activityLevel === 'intense').length
        };
        
        labels = ['Dinlenme', 'Hafif', 'Orta', 'Yoğun'];
        data = [activityCounts.rest, activityCounts.light, activityCounts.moderate, activityCounts.intense];
        backgroundColors = [
          'rgba(54, 162, 235, 0.6)',
          'rgba(75, 192, 192, 0.6)',
          'rgba(255, 205, 86, 0.6)',
          'rgba(255, 99, 132, 0.6)'
        ];
        
      } else {
        // Varsayılan olarak durum dağılımını kullan
        chartTitle = `${getDataTypeName(dataType)} Durum Dağılımı`;
        
        labels = ['Normal', 'Uyarı', 'Kritik'];
        data = [statusCounts.normal, statusCounts.warning, statusCounts.critical];
        backgroundColors = [
          'rgba(75, 192, 192, 0.6)',
          'rgba(255, 205, 86, 0.6)',
          'rgba(255, 99, 132, 0.6)'
        ];
      }
      
      // Grafik yapılandırması
      return {
        type: 'pie',
        data: {
          labels: labels,
          datasets: [{
            data: data,
            backgroundColor: backgroundColors,
            borderWidth: 1
          }]
        },
        options: {
          responsive: true,
          plugins: {
            title: {
              display: true,
              text: chartTitle
            },
            legend: {
              position: 'top',
            },
            tooltip: {
              callbacks: {
                label: function(context) {
                  const label = context.label || '';
                  const value = context.raw || 0;
                  const total = context.dataset.data.reduce((a, b) => a + b, 0);
                  const percentage = Math.round((value / total) * 100);
                  return `${label}: ${value} (${percentage}%)`;
                }
              }
            }
          }
        }
      };
    } catch (error) {
      logError('Pie Chart oluşturma hatası', error);
      return null;
    }
  };
  
  /**
   * Sağlık verilerinden saatlik dağılım grafiği oluşturur
   * @param {Array} healthData - Sağlık verileri
   * @param {string} dataType - Veri tipi
   * @returns {Object} - Bar Chart verisi
   */
  const createHealthDataHourlyChart = (healthData, dataType) => {
    try {
      // Veri tipi için yapılandırma
      let chartTitle, yAxisLabel;
      
      // Saatlik ortalama değerleri hesapla
      const hourlyData = Array(24).fill(0);
      const hourlyCount = Array(24).fill(0);
      
      // Filtreleme
      const filteredData = healthData.filter(data => data.dataType === dataType);
      
      if (!filteredData || filteredData.length === 0) {
        return null;
      }
      
      // Saatlik değerleri hesapla
      filteredData.forEach(data => {
        const hour = moment(data.measuredAt).hour();
        
        if (dataType === 'bloodSugar' && data.bloodSugar && data.bloodSugar.value) {
          hourlyData[hour] += data.bloodSugar.value;
          hourlyCount[hour]++;
        } else if (dataType === 'bloodPressure' && data.bloodPressure) {
          if (data.bloodPressure.systolic) {
            hourlyData[hour] += data.bloodPressure.systolic;
            hourlyCount[hour]++;
          }
        } else if (dataType === 'heartRate' && data.heartRate && data.heartRate.value) {
          hourlyData[hour] += data.heartRate.value;
          hourlyCount[hour]++;
        } else if (dataType === 'weight' && data.weight && data.weight.value) {
          hourlyData[hour] += data.weight.value;
          hourlyCount[hour]++;
        }
      });
      
      // Ortalama değerleri hesapla
      const hourlyAverage = hourlyData.map((value, index) => {
        return hourlyCount[index] > 0 ? Math.round(value / hourlyCount[index] * 10) / 10 : null;
      });
      
      // Veri tipi için başlık ve eksen adı belirle
      if (dataType === 'bloodSugar') {
        chartTitle = 'Kan Şekeri Günlük Dağılımı';
        yAxisLabel = 'Kan Şekeri (mg/dL)';
      } else if (dataType === 'bloodPressure') {
        chartTitle = 'Sistolik Tansiyon Günlük Dağılımı';
        yAxisLabel = 'Sistolik Tansiyon (mmHg)';
      } else if (dataType === 'heartRate') {
        chartTitle = 'Nabız Günlük Dağılımı';
        yAxisLabel = 'Nabız (atım/dk)';
      } else if (dataType === 'weight') {
        chartTitle = 'Kilo Ölçüm Saatleri';
        yAxisLabel = 'Kilo (kg)';
      } else {
        return null;
      }
      
      // Saat etiketleri
      const labels = Array(24).fill().map((_, i) => `${i}:00`);
      
      // Ana veri seti renkleri
      const colors = getChartColors(dataType);
      
      // Grafik yapılandırması
      return {
        type: 'bar',
        data: {
          labels: labels,
          datasets: [{
            label: getDataTypeName(dataType),
            data: hourlyAverage,
            backgroundColor: colors.backgroundColor,
            borderColor: colors.borderColor,
            borderWidth: 1
          }]
        },
        options: {
          responsive: true,
          plugins: {
            title: {
              display: true,
              text: chartTitle
            },
            tooltip: {
              callbacks: {
                footer: function(tooltipItems) {
                  const index = tooltipItems[0].dataIndex;
                  return `Ölçüm Sayısı: ${hourlyCount[index]}`;
                }
              }
            }
          },
          scales: {
            x: {
              display: true,
              title: {
                display: true,
                text: 'Saat'
              }
            },
            y: {
              display: true,
              title: {
                display: true,
                text: yAxisLabel
              }
            }
          }
        }
      };
    } catch (error) {
      logError('Bar Chart oluşturma hatası', error);
      return null;
    }
  };
  
  /**
   * İlaç kullanım uyumu için grafik oluşturur
   * @param {Array} medications - İlaç verileri
   * @returns {Object} - Bar Chart verisi
   */
  const createMedicationAdherenceChart = (medications) => {
    try {
      // Aktif ilaçları filtrele
      const activeMeds = medications.filter(med => med.isActive);
      
      if (!activeMeds || activeMeds.length === 0) {
        return null;
      }
      
      // İlaç uyum oranlarını hesapla
      const adherenceData = activeMeds.map(med => {
        const status = med.checkMedicationStatus ? med.checkMedicationStatus() : { adherenceRate: 0 };
        return {
          name: med.name,
          adherenceRate: status.adherenceRate || 0,
          missedDoses: status.missedDoses || 0,
          totalDoses: status.totalDoses || 0
        };
      });
      
      // İlaç sayısı 10'dan fazlaysa ilk 10'u al
      const limitedData = adherenceData.length > 10 ? adherenceData.slice(0, 10) : adherenceData;
      
      // Grafik yapılandırması
      return {
        type: 'bar',
        data: {
          labels: limitedData.map(item => item.name),
          datasets: [{
            label: 'Uyum Oranı (%)',
            data: limitedData.map(item => item.adherenceRate),
            backgroundColor: limitedData.map(item => {
              if (item.adherenceRate >= 90) return 'rgba(75, 192, 192, 0.6)';
              if (item.adherenceRate >= 70) return 'rgba(255, 205, 86, 0.6)';
              return 'rgba(255, 99, 132, 0.6)';
            }),
            borderColor: limitedData.map(item => {
              if (item.adherenceRate >= 90) return 'rgba(75, 192, 192, 1)';
              if (item.adherenceRate >= 70) return 'rgba(255, 205, 86, 1)';
              return 'rgba(255, 99, 132, 1)';
            }),
            borderWidth: 1
          }]
        },
        options: {
          responsive: true,
          plugins: {
            title: {
              display: true,
              text: 'İlaç Kullanım Uyum Oranları'
            },
            tooltip: {
              callbacks: {
                afterLabel: function(context) {
                  const index = context.dataIndex;
                  const item = limitedData[index];
                  return [
                    `Toplam Doz: ${item.totalDoses}`,
                    `Kaçırılan Doz: ${item.missedDoses}`
                  ];
                }
              }
            }
          },
          scales: {
            x: {
              display: true,
              title: {
                display: true,
                text: 'İlaç'
              }
            },
            y: {
              display: true,
              title: {
                display: true,
                text: 'Uyum Oranı (%)'
              },
              min: 0,
              max: 100
            }
          }
        }
      };
    } catch (error) {
      logError('İlaç uyum grafiği oluşturma hatası', error);
      return null;
    }
  };
  
  /**
   * İlaç kullanım zamanları için grafik oluşturur
   * @param {Array} medications - İlaç verileri
   * @returns {Object} - Bubble Chart verisi
   */
  const createMedicationScheduleChart = (medications) => {
    try {
      // Aktif ilaçları filtrele
      const activeMeds = medications.filter(med => med.isActive && med.schedule && med.schedule.times && med.schedule.times.length > 0);
      
      if (!activeMeds || activeMeds.length === 0) {
        return null;
      }
      
      // Her bir zaman için veri noktası oluştur
      const datasets = [];
      const colors = [
        { bg: 'rgba(54, 162, 235, 0.4)', border: 'rgba(54, 162, 235, 0.8)' },
        { bg: 'rgba(255, 99, 132, 0.4)', border: 'rgba(255, 99, 132, 0.8)' },
        { bg: 'rgba(75, 192, 192, 0.4)', border: 'rgba(75, 192, 192, 0.8)' },
        { bg: 'rgba(255, 205, 86, 0.4)', border: 'rgba(255, 205, 86, 0.8)' },
        { bg: 'rgba(153, 102, 255, 0.4)', border: 'rgba(153, 102, 255, 0.8)' }
      ];
      
      activeMeds.forEach((med, index) => {
        const colorIndex = index % colors.length;
        const data = [];
        
        med.schedule.times.forEach(time => {
          const [hour, minute] = time.split(':').map(Number);
          const minutesFromMidnight = hour * 60 + minute;
          const dosage = time.dosage || 1;
          
          data.push({
            x: minutesFromMidnight,
            y: index + 1, // Y ekseninde her ilaç ayrı satırda
            r: dosage * 5 + 5, // Baloncuk boyutu
            time: time.time,
            withFood: time.withFood
          });
        });
        
        datasets.push({
          label: med.name,
          data: data,
          backgroundColor: colors[colorIndex].bg,
          borderColor: colors[colorIndex].border,
          borderWidth: 1
        });
      });
      
      // X ekseni için saat etiketleri
      const hourLabels = Array(25).fill().map((_, i) => `${i}:00`);
      
      // Y ekseni için ilaç adları
      const medicationLabels = activeMeds.map(med => med.name);
      
      // Grafik yapılandırması
      return {
        type: 'bubble',
        data: {
          datasets: datasets
        },
        options: {
          responsive: true,
          plugins: {
            title: {
              display: true,
              text: 'Günlük İlaç Kullanım Programı'
            },
            tooltip: {
              callbacks: {
                label: function(context) {
                  const data = context.raw;
                  const medName = context.dataset.label;
                  const time = data.time;
                  const withFood = data.withFood ? ', yemekle birlikte' : '';
                  return [`${medName}: ${time}${withFood}`, `Dozaj: ${data.r / 5}`];
                }
              }
            }
          },
          scales: {
            x: {
              type: 'linear',
              position: 'bottom',
              min: 0,
              max: 24 * 60,
              ticks: { stepSize: 60,
                callback: function(value) {
                  const hours = Math.floor(value / 60);
                  return `${hours}:00`;
                }
              },
              title: {
                display: true,
                text: 'Saat'
              }
            },
            y: {
              type: 'linear',
              min: 0,
              max: activeMeds.length + 1,
              ticks: {
                stepSize: 1,
                callback: function(value) {
                  return value > 0 && value <= medicationLabels.length ? medicationLabels[value - 1] : '';
                }
              },
              title: {
                display: true,
                text: 'İlaç'
              }
            }
          }
        }
      };
    } catch (error) {
      logError('İlaç programı grafiği oluşturma hatası', error);
      return null;
    }
  };
  
  /**
   * Fiziksel aktivite verileri için çizgi grafiği oluşturur
   * @param {Array} activities - Aktivite verileri
   * @param {Date} startDate - Başlangıç tarihi
   * @param {Date} endDate - Bitiş tarihi
   * @returns {Object} - Line Chart verisi
   */
  const createActivityLineChart = (activities, startDate, endDate) => {
    try {
      if (!activities || activities.length === 0) {
        return null;
      }
      
      // Uygun aralığı belirle
      const interval = determineInterval(startDate, endDate);
      
      // Başlangıç ve bitiş tarihlerini ayarla
      const start = startDate ? moment(startDate).startOf('day').toDate() : moment().subtract(30, 'days').startOf('day').toDate();
      const end = endDate ? moment(endDate).endOf('day').toDate() : moment().endOf('day').toDate();
      
      // Zaman noktalarını oluştur
      const timePoints = generateTimePoints(start, end, interval);
      
      // Aktivite verisi hazırlama
      const activityMap = {};
      
      // Verileri gruplandır
      activities.forEach(activity => {
        const date = moment(activity.startTime).startOf('day').format('YYYY-MM-DD');
        
        if (!activityMap[date]) {
          activityMap[date] = {
            duration: 0,
            calories: 0,
            distance: 0,
            steps: 0,
            activities: []
          };
        }
        
        // Toplam süre
        activityMap[date].duration += activity.duration || 0;
        
        // Toplam kalori
        activityMap[date].calories += activity.calories || 0;
        
        // Toplam adım
        activityMap[date].steps += activity.steps || 0;
        
        // Toplam mesafe (km cinsinden)
        if (activity.distance && activity.distance.value) {
          let distanceInKm = activity.distance.value;
          
          if (activity.distance.unit === 'm') {
            distanceInKm = activity.distance.value / 1000;
          } else if (activity.distance.unit === 'mil') {
            distanceInKm = activity.distance.value * 1.60934;
          }
          
          activityMap[date].distance += distanceInKm;
        }
        
        // Aktivite detayını ekle
        activityMap[date].activities.push({
          type: activity.activityType,
          duration: activity.duration,
          calories: activity.calories,
          startTime: activity.startTime
        });
      });
      
      // Zaman noktalarına verileri ekle
      timePoints.forEach(point => {
        const dateData = activityMap[point.rawDate];
        
        if (dateData) {
          point.duration = dateData.duration;
          point.calories = dateData.calories;
          point.distance = parseFloat(dateData.distance.toFixed(2));
          point.steps = dateData.steps;
          point.activities = dateData.activities;
        } else {
          point.duration = 0;
          point.calories = 0;
          point.distance = 0;
          point.steps = 0;
          point.activities = [];
        }
      });
      
      // Veri setleri
      const datasets = [
        {
          label: 'Süre (dakika)',
          data: timePoints.map(point => point.duration),
          backgroundColor: 'rgba(54, 162, 235, 0.2)',
          borderColor: 'rgba(54, 162, 235, 1)',
          borderWidth: 2,
          tension: 0.2,
          yAxisID: 'y'
        },
        {
          label: 'Kalori',
          data: timePoints.map(point => point.calories),
          backgroundColor: 'rgba(255, 99, 132, 0.2)',
          borderColor: 'rgba(255, 99, 132, 1)',
          borderWidth: 2,
          tension: 0.2,
          yAxisID: 'y1'
        }
      ];
      
      // Mesafe verileri
      if (timePoints.some(point => point.distance > 0)) {
        datasets.push({
          label: 'Mesafe (km)',
          data: timePoints.map(point => point.distance),
          backgroundColor: 'rgba(75, 192, 192, 0.2)',
          borderColor: 'rgba(75, 192, 192, 1)',
          borderWidth: 2,
          tension: 0.2,
          yAxisID: 'y'
        });
      }
      
      // Adım verileri
      if (timePoints.some(point => point.steps > 0)) {
        datasets.push({
          label: 'Adım',
          data: timePoints.map(point => point.steps),
          backgroundColor: 'rgba(153, 102, 255, 0.2)',
          borderColor: 'rgba(153, 102, 255, 1)',
          borderWidth: 2,
          tension: 0.2,
          yAxisID: 'y1'
        });
      }
      
      // Grafik yapılandırması
      return {
        type: 'line',
        data: {
          labels: timePoints.map(point => point.formattedDate),
          datasets: datasets
        },
        options: {
          responsive: true,
          plugins: {
            title: {
              display: true,
              text: 'Fiziksel Aktivite Takibi'
            },
            tooltip: {
              mode: 'index',
              intersect: false,
              callbacks: {
                afterBody: function(context) {
                  const index = context[0].dataIndex;
                  const activities = timePoints[index].activities;
                  
                  if (activities && activities.length > 0) {
                    const lines = ['Aktiviteler:'];
                    activities.forEach(activity => {
                      const type = getActivityTypeName(activity.type);
                      const time = moment(activity.startTime).format('HH:mm');
                      lines.push(`${time} - ${type} (${activity.duration} dk.)`);
                    });
                    return lines;
                  }
                  return [];
                }
              }
            },
            legend: {
              position: 'top',
            }
          },
          scales: {
            x: {
              display: true,
              title: {
                display: true,
                text: 'Tarih'
              }
            },
            y: {
              type: 'linear',
              display: true,
              position: 'left',
              title: {
                display: true,
                text: 'Süre / Mesafe'
              }
            },
            y1: {
              type: 'linear',
              display: true,
              position: 'right',
              title: {
                display: true,
                text: 'Kalori / Adım'
              },
              grid: {
                drawOnChartArea: false
              }
            }
          }
        }
      };
    } catch (error) {
      logError('Aktivite çizgi grafiği oluşturma hatası', error);
      return null;
    }
  };
  
  /**
   * Fiziksel aktivite türleri için dağılım grafiği oluşturur
   * @param {Array} activities - Aktivite verileri
   * @returns {Object} - Pie Chart verisi
   */
  const createActivityTypeDistributionChart = (activities) => {
    try {
      if (!activities || activities.length === 0) {
        return null;
      }
      
      // Aktivite türlerine göre gruplandırma
      const typeMap = {};
      
      activities.forEach(activity => {
        const type = activity.activityType;
        
        if (!typeMap[type]) {
          typeMap[type] = {
            count: 0,
            duration: 0,
            calories: 0
          };
        }
        
        typeMap[type].count++;
        typeMap[type].duration += activity.duration || 0;
        typeMap[type].calories += activity.calories || 0;
      });
      
      // En çok yapılan 8 aktiviteyi al, diğerlerini "Diğer" kategorisinde topla
      const typeEntries = Object.entries(typeMap).sort((a, b) => b[1].duration - a[1].duration);
      const topTypes = typeEntries.slice(0, 8);
      
      // "Diğer" kategorisi
      if (typeEntries.length > 8) {
        const otherTypes = typeEntries.slice(8);
        const otherData = {
          count: 0,
          duration: 0,
          calories: 0
        };
        
        otherTypes.forEach(([_, data]) => {
          otherData.count += data.count;
          otherData.duration += data.duration;
          otherData.calories += data.calories;
        });
        
        topTypes.push(['diğer', otherData]);
      }
      
      // Türlerin görünen adları
      const labels = topTypes.map(([type]) => getActivityTypeName(type));
      
      // Renkler
      const backgroundColors = [
        'rgba(54, 162, 235, 0.6)',
        'rgba(255, 99, 132, 0.6)',
        'rgba(75, 192, 192, 0.6)',
        'rgba(255, 205, 86, 0.6)',
        'rgba(153, 102, 255, 0.6)',
        'rgba(255, 159, 64, 0.6)',
        'rgba(201, 203, 207, 0.6)',
        'rgba(136, 212, 152, 0.6)',
        'rgba(106, 76, 156, 0.6)'
      ];
      
      // Grafik yapılandırması - Aktivite Sayısı
      const countChart = {
        type: 'pie',
        data: {
          labels: labels,
          datasets: [{
            data: topTypes.map(([_, data]) => data.count),
            backgroundColor: backgroundColors,
            borderWidth: 1
          }]
        },
        options: {
          responsive: true,
          plugins: {
            title: {
              display: true,
              text: 'Aktivite Türleri (Sayı)'
            },
            tooltip: {
              callbacks: {
                label: function(context) {
                  const label = context.label || '';
                  const value = context.raw || 0;
                  const total = context.dataset.data.reduce((a, b) => a + b, 0);
                  const percentage = Math.round((value / total) * 100);
                  return `${label}: ${value} (${percentage}%)`;
                }
              }
            }
          }
        }
      };
      
      // Grafik yapılandırması - Aktivite Süresi
      const durationChart = {
        type: 'pie',
        data: {
          labels: labels,
          datasets: [{
            data: topTypes.map(([_, data]) => data.duration),
            backgroundColor: backgroundColors,
            borderWidth: 1
          }]
        },
        options: {
          responsive: true,
          plugins: {
            title: {
              display: true,
              text: 'Aktivite Türleri (Süre)'
            },
            tooltip: {
              callbacks: {
                label: function(context) {
                  const label = context.label || '';
                  const value = context.raw || 0;
                  const total = context.dataset.data.reduce((a, b) => a + b, 0);
                  const percentage = Math.round((value / total) * 100);
                  const hours = Math.floor(value / 60);
                  const minutes = value % 60;
                  const durationText = hours > 0 ? `${hours} saat ${minutes} dk.` : `${minutes} dk.`;
                  return `${label}: ${durationText} (${percentage}%)`;
                }
              }
            }
          }
        }
      };
      
      // Her iki grafiği de döndür
      return {
        count: countChart,
        duration: durationChart
      };
    } catch (error) {
      logError('Aktivite dağılım grafiği oluşturma hatası', error);
      return null;
    }
  };
  
  /**
   * Beslenme verileri için günlük kalori grafiği oluşturur
   * @param {Array} nutritionData - Beslenme verileri
   * @param {Date} startDate - Başlangıç tarihi
   * @param {Date} endDate - Bitiş tarihi
   * @returns {Object} - Bar Chart verisi
   */
  const createNutritionCalorieChart = (nutritionData, startDate, endDate) => {
    try {
      if (!nutritionData || nutritionData.length === 0) {
        return null;
      }
      
      // Uygun aralığı belirle
      const interval = determineInterval(startDate, endDate);
      
      // Başlangıç ve bitiş tarihlerini ayarla
      const start = startDate ? moment(startDate).startOf('day').toDate() : moment().subtract(30, 'days').startOf('day').toDate();
      const end = endDate ? moment(endDate).endOf('day').toDate() : moment().endOf('day').toDate();
      
      // Zaman noktalarını oluştur
      const timePoints = generateTimePoints(start, end, interval);
      
      // Günlük kalori haritası
      const dailyCalorieMap = {};
      
      // Verileri gruplandır
      nutritionData.forEach(data => {
        const date = moment(data.date).startOf('day').format('YYYY-MM-DD');
        
        if (!dailyCalorieMap[date]) {
          dailyCalorieMap[date] = {
            total: 0,
            mealTypes: {
              'kahvaltı': 0,
              'öğle_yemeği': 0,
              'akşam_yemeği': 0,
              'ara_öğün': 0,
              'atıştırmalık': 0
            }
          };
        }
        
        // Toplam kalori
        if (data.totalNutritionalValues && data.totalNutritionalValues.calories) {
          dailyCalorieMap[date].total += data.totalNutritionalValues.calories;
          
          // Öğün türüne göre kaloriler
          if (data.mealType) {
            dailyCalorieMap[date].mealTypes[data.mealType] += data.totalNutritionalValues.calories;
          }
        }
      });
      
      // Zaman noktalarına verileri ekle
      timePoints.forEach(point => {
        const dateData = dailyCalorieMap[point.rawDate];
        
        if (dateData) {
          point.totalCalories = Math.round(dateData.total);
          point.mealTypes = dateData.mealTypes;
        } else {
          point.totalCalories = 0;
          point.mealTypes = {
            'kahvaltı': 0,
            'öğle_yemeği': 0,
            'akşam_yemeği': 0,
            'ara_öğün': 0,
            'atıştırmalık': 0
          };
        }
      });
      
      // Grafik yapılandırması - Toplam kalori
      const totalCalorieChart = {
        type: 'bar',
        data: {
          labels: timePoints.map(point => point.formattedDate),
          datasets: [
            {
              label: 'Toplam Kalori',
              data: timePoints.map(point => point.totalCalories),
              backgroundColor: 'rgba(54, 162, 235, 0.6)',
              borderColor: 'rgba(54, 162, 235, 1)',
              borderWidth: 1
            }
          ]
        },
        options: {
          responsive: true,
          plugins: {
            title: {
              display: true,
              text: 'Günlük Toplam Kalori'
            }
          },
          scales: {
            x: {
              display: true,
              title: {
                display: true,
                text: 'Tarih'
              }
            },
            y: {
              display: true,
              title: {
                display: true,
                text: 'Kalori (kcal)'
              },
              min: 0
            }
          }
        }
      };
      
      // Grafik yapılandırması - Öğün türüne göre kalori
      const mealTypeChart = {
        type: 'bar',
        data: {
          labels: timePoints.map(point => point.formattedDate),
          datasets: [
            {
              label: 'Kahvaltı',
              data: timePoints.map(point => point.mealTypes['kahvaltı']),
              backgroundColor: 'rgba(255, 99, 132, 0.6)',
              borderColor: 'rgba(255, 99, 132, 1)',
              borderWidth: 1
            },
            {
              label: 'Öğle Yemeği',
              data: timePoints.map(point => point.mealTypes['öğle_yemeği']),
              backgroundColor: 'rgba(54, 162, 235, 0.6)',
              borderColor: 'rgba(54, 162, 235, 1)',
              borderWidth: 1
            },
            {
              label: 'Akşam Yemeği',
              data: timePoints.map(point => point.mealTypes['akşam_yemeği']),
              backgroundColor: 'rgba(75, 192, 192, 0.6)',
              borderColor: 'rgba(75, 192, 192, 1)',
              borderWidth: 1
            },
            {
              label: 'Ara Öğün',
              data: timePoints.map(point => point.mealTypes['ara_öğün']),
              backgroundColor: 'rgba(255, 205, 86, 0.6)',
              borderColor: 'rgba(255, 205, 86, 1)',
              borderWidth: 1
            },
            {
              label: 'Atıştırmalık',
              data: timePoints.map(point => point.mealTypes['atıştırmalık']),
              backgroundColor: 'rgba(153, 102, 255, 0.6)',
              borderColor: 'rgba(153, 102, 255, 1)',
              borderWidth: 1
            }
          ]
        },
        options: {
          responsive: true,
          plugins: {
            title: {
              display: true,
              text: 'Öğün Türüne Göre Kalori'
            }
          },
          scales: {
            x: {
              display: true,
              title: {
                display: true,
                text: 'Tarih'
              }
            },
            y: {
              display: true,
              title: {
                display: true,
                text: 'Kalori (kcal)'
              },
              stacked: true,
              min: 0
            }
          }
        }
      };
      
      // Her iki grafiği de döndür
      return {
        total: totalCalorieChart,
        byMealType: mealTypeChart
      };
    } catch (error) {
      logError('Beslenme kalori grafiği oluşturma hatası', error);
      return null;
    }
  };
  
  /**
   * Beslenme verileri için makro dağılım grafiği oluşturur
   * @param {Array} nutritionData - Beslenme verileri
   * @returns {Object} - Pie Chart verisi
   */
  const createNutritionMacroDistributionChart = (nutritionData) => {
    try {
      if (!nutritionData || nutritionData.length === 0) {
        return null;
      }
      
      // Son 30 günlük verileri filtrele
      const thirtyDaysAgo = moment().subtract(30, 'days').startOf('day');
      const recentData = nutritionData.filter(data => 
        moment(data.date).isAfter(thirtyDaysAgo) && 
        data.totalNutritionalValues
      );
      
      if (recentData.length === 0) {
        return null;
      }
      
      // Toplam makro değerleri
      let totalCarbs = 0;
      let totalProteins = 0;
      let totalFats = 0;
      
      recentData.forEach(data => {
        if (data.totalNutritionalValues) {
          totalCarbs += data.totalNutritionalValues.carbs || 0;
          totalProteins += data.totalNutritionalValues.proteins || 0;
          totalFats += data.totalNutritionalValues.fats || 0;
        }
      });
      
      // Kalori değerleri
      const carbCalories = totalCarbs * 4; // 1g karbonhidrat = 4 kalori
      const proteinCalories = totalProteins * 4; // 1g protein = 4 kalori
      const fatCalories = totalFats * 9; // 1g yağ = 9 kalori
      const totalCalories = carbCalories + proteinCalories + fatCalories;
      
      // Yüzdeler
      const carbsPercentage = totalCalories > 0 ? Math.round((carbCalories / totalCalories) * 100) : 0;
      const proteinsPercentage = totalCalories > 0 ? Math.round((proteinCalories / totalCalories) * 100) : 0;
      const fatsPercentage = totalCalories > 0 ? Math.round((fatCalories / totalCalories) * 100) : 0;
      
      // Grafik yapılandırması
      return {
        type: 'pie',
        data: {
          labels: ['Karbonhidrat', 'Protein', 'Yağ'],
          datasets: [{
            data: [carbsPercentage, proteinsPercentage, fatsPercentage],
            backgroundColor: [
              'rgba(54, 162, 235, 0.6)',
              'rgba(255, 99, 132, 0.6)',
              'rgba(255, 205, 86, 0.6)'
            ],
            borderWidth: 1
          }]
        },
        options: {
          responsive: true,
          plugins: {
            title: {
              display: true,
              text: 'Makro Besin Dağılımı'
            },
            tooltip: {
              callbacks: {
                label: function(context) {
                  const label = context.label || '';
                  const value = context.raw || 0;
                  return `${label}: %${value}`;
                },
                afterLabel: function(context) {
                  const index = context.dataIndex;
                  if (index === 0) {
                    return `${Math.round(totalCarbs)} g (${Math.round(carbCalories)} kalori)`;
                  } else if (index === 1) {
                    return `${Math.round(totalProteins)} g (${Math.round(proteinCalories)} kalori)`;
                  } else if (index === 2) {
                    return `${Math.round(totalFats)} g (${Math.round(fatCalories)} kalori)`;
                  }
                  return '';
                }
              }
            }
          }
        }
      };
    } catch (error) {
      logError('Beslenme makro dağılım grafiği oluşturma hatası', error);
      return null;
    }
  };
  
  /**
   * Veri tipinin görünen adını döndürür
   * @param {string} dataType - Veri tipi
   * @returns {string} - Görünen ad
   */
  const getDataTypeName = (dataType) => {
    const typeMap = {
      'bloodSugar': 'Kan Şekeri',
      'bloodPressure': 'Tansiyon',
      'heartRate': 'Nabız',
      'weight': 'Kilo',
      'temperature': 'Vücut Sıcaklığı',
      'oxygen': 'Oksijen Satürasyonu',
      'stress': 'Stres Seviyesi'
    };
    
    return typeMap[dataType] || dataType;
  };
  
  /**
   * Aktivite tipinin görünen adını döndürür
   * @param {string} activityType - Aktivite tipi
   * @returns {string} - Görünen ad
   */
  const getActivityTypeName = (activityType) => {
    const typeMap = {
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
    
    return typeMap[activityType] || activityType;
  };
  
  module.exports = {
    createHealthDataLineChart,
    createHealthDataDistributionChart,
    createHealthDataHourlyChart,
    createMedicationAdherenceChart,
    createMedicationScheduleChart,
    createActivityLineChart,
    createActivityTypeDistributionChart,
    createNutritionCalorieChart,
    createNutritionMacroDistributionChart,
    getChartColors,
    getDataTypeName,
    getActivityTypeName
  };
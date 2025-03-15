const mongoose = require('mongoose');

const ReportSchema = new mongoose.Schema({
  familyMemberId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'FamilyMember',
    required: [true, 'Aile üyesi referansı gereklidir']
  },
  title: {
    type: String,
    required: [true, 'Rapor başlığı gereklidir'],
    trim: true,
    maxlength: [100, 'Başlık 100 karakterden uzun olamaz']
  },
  type: {
    type: String,
    enum: [
      'health_summary', 'medication_adherence', 'blood_sugar_analysis', 
      'blood_pressure_analysis', 'activity_summary', 'nutrition_analysis', 
      'custom'
    ],
    required: [true, 'Rapor türü gereklidir']
  },
  description: {
    type: String,
    maxlength: [500, 'Açıklama 500 karakterden uzun olamaz']
  },
  dateRange: {
    startDate: {
      type: Date,
      required: [true, 'Başlangıç tarihi gereklidir']
    },
    endDate: {
      type: Date,
      required: [true, 'Bitiş tarihi gereklidir']
    }
  },
  content: {
    sections: [{
      title: {
        type: String,
        required: [true, 'Bölüm başlığı gereklidir']
      },
      text: String,
      data: mongoose.Schema.Types.Mixed, // İstatistik verisi, grafik verisi vb.
      chartType: {
        type: String,
        enum: ['line', 'bar', 'pie', 'scatter', 'table', 'none'],
        default: 'none'
      },
      chartOptions: mongoose.Schema.Types.Mixed // Grafik ayarları
    }],
    summary: {
      key_findings: [String],
      recommendations: [String],
      flags: [{
        type: {
          type: String,
          enum: ['warning', 'critical', 'improvement', 'normal'],
          required: true
        },
        message: {
          type: String,
          required: true
        },
        details: String
      }]
    }
  },
  metrics: {
    averages: mongoose.Schema.Types.Mixed, // Ortalama değerler
    trends: mongoose.Schema.Types.Mixed, // Trend değerleri
    comparisons: mongoose.Schema.Types.Mixed, // Karşılaştırma değerleri
    adherence: mongoose.Schema.Types.Mixed // Uyum değerleri
  },
  relatedData: {
    healthData: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'HealthData'
    }],
    medications: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Medication'
    }],
    nutritionData: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'NutritionData'
    }],
    activities: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PhysicalActivity'
    }],
    medicalHistory: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MedicalHistory'
    }]
  },
  isTemplate: {
    type: Boolean,
    default: false
  },
  isScheduled: {
    type: Boolean,
    default: false
  },
  schedule: {
    frequency: {
      type: String,
      enum: ['daily', 'weekly', 'monthly', 'quarterly', 'custom'],
      default: 'monthly'
    },
    lastGenerated: Date,
    nextGeneration: Date
  },
  recipients: [{
    email: String,
    name: String,
    role: {
      type: String,
      enum: ['user', 'family_member', 'doctor', 'caregiver', 'other'],
      default: 'user'
    }
  }],
  format: {
    type: String,
    enum: ['pdf', 'excel', 'html', 'text'],
    default: 'pdf'
  },
  status: {
    type: String,
    enum: ['draft', 'generated', 'sent', 'read', 'archived'],
    default: 'draft'
  },
  generatedFile: {
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
  accessLog: [{
    accessedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    accessDate: {
      type: Date,
      default: Date.now
    },
    ipAddress: String,
    userAgent: String
  }],
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

// Tarih aralığı metni döndüren virtual
ReportSchema.virtual('dateRangeText').get(function() {
  if (!this.dateRange || !this.dateRange.startDate || !this.dateRange.endDate) {
    return '';
  }
  
  const startDate = new Date(this.dateRange.startDate).toLocaleDateString('tr-TR');
  const endDate = new Date(this.dateRange.endDate).toLocaleDateString('tr-TR');
  
  return `${startDate} - ${endDate}`;
});

// Raporun toplam süresini hesaplayan virtual (gün cinsinden)
ReportSchema.virtual('durationInDays').get(function() {
  if (!this.dateRange || !this.dateRange.startDate || !this.dateRange.endDate) {
    return 0;
  }
  
  const startDate = new Date(this.dateRange.startDate);
  const endDate = new Date(this.dateRange.endDate);
  
  return Math.floor((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;
});

// Rapor için alarmları hesaplayan metod
ReportSchema.methods.calculateAlerts = function() {
  if (!this.content || !this.content.summary) {
    return { warnings: 0, criticals: 0, improvements: 0 };
  }
  
  const flags = this.content.summary.flags || [];
  
  const alerts = {
    warnings: flags.filter(flag => flag.type === 'warning').length,
    criticals: flags.filter(flag => flag.type === 'critical').length,
    improvements: flags.filter(flag => flag.type === 'improvement').length
  };
  
  return alerts;
};

// Rapor türü metnini döndüren metod
ReportSchema.methods.getTypeText = function() {
  const typeMap = {
    'health_summary': 'Sağlık Özeti',
    'medication_adherence': 'İlaç Kullanım Raporu',
    'blood_sugar_analysis': 'Kan Şekeri Analizi',
    'blood_pressure_analysis': 'Tansiyon Analizi',
    'activity_summary': 'Aktivite Özeti',
    'nutrition_analysis': 'Beslenme Analizi',
    'custom': 'Özel Rapor'
  };
  
  return typeMap[this.type] || this.type;
};

// Yeni rapor oluşturma
ReportSchema.statics.createHealthSummary = async function(familyMemberId, dateRange, options = {}) {
  // Varsayılan başlık
  const title = options.title || 'Sağlık Özeti Raporu';
  
  // Yeni rapor oluştur
  const report = new this({
    familyMemberId,
    title,
    type: 'health_summary',
    description: options.description || 'Sağlık verilerinin özet raporu',
    dateRange,
    content: {
      sections: [],
      summary: {
        key_findings: [],
        recommendations: [],
        flags: []
      }
    },
    metrics: {
      averages: {},
      trends: {},
      comparisons: {},
      adherence: {}
    },
    format: options.format || 'pdf',
    status: 'draft',
    createdBy: options.createdBy
  });
  
  // Tarih aralığındaki sağlık verilerini bul
  const HealthData = mongoose.model('HealthData');
  const healthData = await HealthData.find({
    familyMemberId,
    measuredAt: {
      $gte: new Date(dateRange.startDate),
      $lte: new Date(dateRange.endDate)
    }
  }).sort({ measuredAt: 1 });
  
  // İlgili verileri ekle
  report.relatedData.healthData = healthData.map(data => data._id);
  
  // İlaç verilerini bul
  const Medication = mongoose.model('Medication');
  const medications = await Medication.find({
    familyMemberId,
    isActive: true,
    $or: [
      { startDate: { $lte: new Date(dateRange.endDate) } },
      { endDate: { $gte: new Date(dateRange.startDate) } },
      { endDate: null }
    ]
  });
  
  report.relatedData.medications = medications.map(med => med._id);
  
  // Raporun bölümlerini oluştur
  
  // 1. Genel Sağlık Durumu Bölümü
  const generalHealthSection = {
    title: 'Genel Sağlık Durumu',
    text: 'Bu bölüm, belirlenen tarih aralığındaki genel sağlık durumunu özetlemektedir.',
    data: {},
    chartType: 'none'
  };
  
  // 2. Kan Şekeri Bölümü
  const bloodSugarData = healthData.filter(data => data.dataType === 'bloodSugar');
  
  let bloodSugarSection = null;
  if (bloodSugarData.length > 0) {
    const bloodSugarValues = bloodSugarData.map(data => ({
      date: data.measuredAt,
      value: data.bloodSugar.value,
      status: data.status
    }));
    
    // Ortalama kan şekeri değeri
    const avgBloodSugar = bloodSugarValues.reduce((sum, item) => sum + item.value, 0) / bloodSugarValues.length;
    
    // Kan şekeri değer aralıkları
    const criticalLowCount = bloodSugarValues.filter(item => item.status === 'critical' && item.value < 70).length;
    const lowCount = bloodSugarValues.filter(item => item.status === 'warning' && item.value < 70).length;
    const normalCount = bloodSugarValues.filter(item => item.status === 'normal').length;
    const highCount = bloodSugarValues.filter(item => item.status === 'warning' && item.value > 130).length;
    const criticalHighCount = bloodSugarValues.filter(item => item.status === 'critical' && item.value > 180).length;
    
    // Metrikleri kaydet
    report.metrics.averages.bloodSugar = avgBloodSugar.toFixed(1);
    
    // Bölümü oluştur
    bloodSugarSection = {
      title: 'Kan Şekeri Takibi',
      text: `Bu dönemde toplam ${bloodSugarValues.length} kan şekeri ölçümü kaydedilmiştir. Ortalama kan şekeri değeri ${avgBloodSugar.toFixed(1)} mg/dL olarak hesaplanmıştır.`,
      data: {
        measurements: bloodSugarValues,
        distribution: {
          criticalLow: criticalLowCount,
          low: lowCount,
          normal: normalCount,
          high: highCount,
          criticalHigh: criticalHighCount
        }
      },
      chartType: 'line',
      chartOptions: {
        xAxis: 'date',
        yAxis: 'value',
        title: 'Kan Şekeri Değerleri (mg/dL)'
      }
    };
    
    // Uyarılar
    if (criticalLowCount > 0 || criticalHighCount > 0) {
      report.content.summary.flags.push({
        type: 'critical',
        message: `${criticalHighCount + criticalLowCount} kritik kan şekeri değeri tespit edildi.`,
        details: `${criticalLowCount} adet düşük, ${criticalHighCount} adet yüksek kritik değer.`
      });
    }
    
    if (lowCount > 3 || highCount > 3) {
      report.content.summary.flags.push({
        type: 'warning',
        message: 'Kan şekeri uyarı bölgesinde çok sayıda ölçüm var.',
        details: `${lowCount} adet düşük, ${highCount} adet yüksek uyarı değeri.`
      });
    }
  }
  
  // 3. Tansiyon Bölümü
  const bloodPressureData = healthData.filter(data => data.dataType === 'bloodPressure');
  
  let bloodPressureSection = null;
  if (bloodPressureData.length > 0) {
    const bloodPressureValues = bloodPressureData.map(data => ({
      date: data.measuredAt,
      systolic: data.bloodPressure.systolic,
      diastolic: data.bloodPressure.diastolic,
      status: data.status
    }));
    
    // Ortalama tansiyon değerleri
    const avgSystolic = bloodPressureValues.reduce((sum, item) => sum + item.systolic, 0) / bloodPressureValues.length;
    const avgDiastolic = bloodPressureValues.reduce((sum, item) => sum + item.diastolic, 0) / bloodPressureValues.length;
    
    // Tansiyon değer aralıkları
    const highSystolicCount = bloodPressureValues.filter(item => item.systolic > 139).length;
    const highDiastolicCount = bloodPressureValues.filter(item => item.diastolic > 89).length;
    const normalCount = bloodPressureValues.filter(item => item.systolic <= 139 && item.diastolic <= 89).length;
    
    // Metrikleri kaydet
    report.metrics.averages.bloodPressure = {
      systolic: avgSystolic.toFixed(1),
      diastolic: avgDiastolic.toFixed(1)
    };
    
    // Bölümü oluştur
    bloodPressureSection = {
      title: 'Tansiyon Takibi',
      text: `Bu dönemde toplam ${bloodPressureValues.length} tansiyon ölçümü kaydedilmiştir. Ortalama tansiyon değeri ${avgSystolic.toFixed(1)}/${avgDiastolic.toFixed(1)} mmHg olarak hesaplanmıştır.`,
      data: {
        measurements: bloodPressureValues,
        distribution: {
          normal: normalCount,
          highSystolic: highSystolicCount,
          highDiastolic: highDiastolicCount
        }
      },
      chartType: 'line',
      chartOptions: {
        xAxis: 'date',
        yAxis: ['systolic', 'diastolic'],
        title: 'Tansiyon Değerleri (mmHg)'
      }
    };
    
    // Uyarılar
    if (highSystolicCount > 3 || highDiastolicCount > 3) {
      report.content.summary.flags.push({
        type: 'warning',
        message: 'Yüksek tansiyon değerleri tespit edildi.',
        details: `${highSystolicCount} adet yüksek sistolik, ${highDiastolicCount} adet yüksek diastolik değer.`
      });
    }
  }
  
  // 4. İlaç Kullanımı Bölümü
  let medicationSection = null;
  if (medications.length > 0) {
    const medicationStatus = medications.map(med => {
      const adherenceStatus = med.checkMedicationStatus ? med.checkMedicationStatus() : { adherenceRate: 0 };
      
      return {
        name: med.name,
        dosage: `${med.dosage.value} ${med.dosage.unit}`,
        isActive: med.isActive,
        adherenceRate: adherenceStatus.adherenceRate || 0,
        missedDoses: adherenceStatus.missedDoses || 0
      };
    });
    
    // Ortalama ilaç uyum oranı
    const avgAdherenceRate = medicationStatus.reduce((sum, med) => sum + med.adherenceRate, 0) / medicationStatus.length;
    
    // Metrikleri kaydet
    report.metrics.adherence.medication = avgAdherenceRate.toFixed(1);
    
    // Bölümü oluştur
    medicationSection = {
      title: 'İlaç Kullanım Raporu',
      text: `Bu dönemde ${medications.length} farklı ilaç kullanımı takip edilmiştir. Ortalama ilaç kullanım uyumu %${avgAdherenceRate.toFixed(1)} olarak hesaplanmıştır.`,
      data: {
        medications: medicationStatus
      },
      chartType: 'bar',
      chartOptions: {
        xAxis: 'name',
        yAxis: 'adherenceRate',
        title: 'İlaç Kullanım Uyum Oranları (%)'
      }
    };
    
    // Uyarılar
    const lowAdherenceMeds = medicationStatus.filter(med => med.adherenceRate < 70);
    if (lowAdherenceMeds.length > 0) {
      report.content.summary.flags.push({
        type: 'warning',
        message: `${lowAdherenceMeds.length} ilacın kullanım uyumu düşük.`,
        details: `${lowAdherenceMeds.map(med => med.name).join(', ')} ilaçlarında kullanım uyumu %70'in altında.`
      });
    }
  }
  
  // Bölümleri rapora ekle
  report.content.sections.push(generalHealthSection);
  
  if (bloodSugarSection) {
    report.content.sections.push(bloodSugarSection);
  }
  
  if (bloodPressureSection) {
    report.content.sections.push(bloodPressureSection);
  }
  
  if (medicationSection) {
    report.content.sections.push(medicationSection);
  }
  
  // Özet bulguları oluştur
  const keyFindings = [];
  const recommendations = [];
  
  // Kan şekeri için bulgular
  if (bloodSugarSection) {
    const avgBloodSugar = parseFloat(report.metrics.averages.bloodSugar);
    
    if (avgBloodSugar > 150) {
      keyFindings.push(`Ortalama kan şekeri değeri (${avgBloodSugar} mg/dL) hedef değerin üzerinde.`);
      recommendations.push('Kan şekeri kontrolü için beslenme düzenine dikkat edilmeli.');
    } else if (avgBloodSugar < 70) {
      keyFindings.push(`Ortalama kan şekeri değeri (${avgBloodSugar} mg/dL) hedef değerin altında.`);
      recommendations.push('Düşük kan şekeri için öğün planlamasına dikkat edilmeli.');
    } else {
      keyFindings.push(`Ortalama kan şekeri değeri (${avgBloodSugar} mg/dL) normal aralıkta.`);
    }
  }
  
  // Tansiyon için bulgular
  if (bloodPressureSection) {
    const avgSystolic = parseFloat(report.metrics.averages.bloodPressure.systolic);
    const avgDiastolic = parseFloat(report.metrics.averages.bloodPressure.diastolic);
    
    if (avgSystolic > 130 || avgDiastolic > 80) {
      keyFindings.push(`Ortalama tansiyon değeri (${avgSystolic}/${avgDiastolic} mmHg) hedef değerin üzerinde.`);
      recommendations.push('Tansiyon kontrolü için tuz tüketiminin azaltılması ve düzenli egzersiz önerilir.');
    } else {
      keyFindings.push(`Ortalama tansiyon değeri (${avgSystolic}/${avgDiastolic} mmHg) normal aralıkta.`);
    }
  }
  
  // İlaç kullanımı için bulgular
  if (medicationSection) {
    const avgAdherence = parseFloat(report.metrics.adherence.medication);
    
    if (avgAdherence < 80) {
      keyFindings.push(`İlaç kullanım uyumu (${avgAdherence}%) hedef değerin altında.`);
      recommendations.push('İlaç hatırlatıcıları kullanılarak ilaç uyumunun artırılması önerilir.');
    } else {
      keyFindings.push(`İlaç kullanım uyumu (${avgAdherence}%) iyi seviyede.`);
    }
  }
  
  // Genel öneriler
  recommendations.push('Düzenli sağlık takipleri ve kontroller sürdürülmelidir.');
  
  report.content.summary.key_findings = keyFindings;
  report.content.summary.recommendations = recommendations;
  
  return report;
};

// Belirli bir tarih aralığındaki raporları bul
ReportSchema.statics.findByDateRange = function(familyMemberId, startDate, endDate) {
  return this.find({
    familyMemberId,
    'dateRange.startDate': { $gte: new Date(startDate) },
    'dateRange.endDate': { $lte: new Date(endDate) }
  }).sort({ 'dateRange.startDate': -1 });
};

// Belirli bir türdeki raporları bul
ReportSchema.statics.findByType = function(familyMemberId, type, limit = 10) {
  return this.find({
    familyMemberId,
    type
  })
  .sort({ 'dateRange.endDate': -1 })
  .limit(limit);
};

// Performans için indeksler
ReportSchema.index({ familyMemberId: 1, type: 1, 'dateRange.startDate': -1 });
ReportSchema.index({ familyMemberId: 1, status: 1 });
ReportSchema.index({ 'dateRange.endDate': -1 });

module.exports = mongoose.model('Report', ReportSchema);
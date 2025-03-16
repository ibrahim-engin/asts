const Report = require('../models/Report');
const FamilyMember = require('../models/FamilyMember');
const HealthData = require('../models/HealthData');
const MedicalHistory = require('../models/MedicalHistory');
const Medication = require('../models/Medication');
const NutritionData = require('../models/NutritionData');
const PhysicalActivity = require('../models/PhysicalActivity');
const { logError, logInfo } = require('../middlewares/logger');
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

/**
 * Raporları listele
 * @route   GET /report/:familyMemberId
 * @access  Private
 */
exports.getReportList = async (req, res) => {
  try {
    const { familyMemberId } = req.params;
    
    // Aile üyesini bul
    const familyMember = await FamilyMember.findOne({
      _id: familyMemberId,
      userId: req.user._id
    });
    
    if (!familyMember) {
      req.flash('error_msg', 'Aile üyesi bulunamadı');
      return res.redirect('/home');
    }
    
    // Sayfalama parametreleri
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    
    // Filtreleme parametreleri
    const filter = { familyMemberId };
    
    if (req.query.type) {
      filter.type = req.query.type;
    }
    
    if (req.query.startDate && req.query.endDate) {
      filter['dateRange.startDate'] = { $gte: new Date(req.query.startDate) };
      filter['dateRange.endDate'] = { $lte: new Date(req.query.endDate) };
    } else if (req.query.startDate) {
      filter['dateRange.startDate'] = { $gte: new Date(req.query.startDate) };
    } else if (req.query.endDate) {
      filter['dateRange.endDate'] = { $lte: new Date(req.query.endDate) };
    }
    
    // Toplam rapor sayısı
    const total = await Report.countDocuments(filter);
    
    // Raporları getir
    const reports = await Report.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
    
    // Sayfalama bilgilerini hazırla
    const totalPages = Math.ceil(total / limit);
    const pagination = {
      currentPage: page,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
      nextPage: page < totalPages ? page + 1 : null,
      prevPage: page > 1 ? page - 1 : null,
      total
    };
    
    // Rapor türlerini gruplandır
    const reportTypes = await Report.aggregate([
      { $match: { familyMemberId: mongoose.Types.ObjectId(familyMemberId) } },
      { $group: { _id: '$type', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    
    // Rapor türü seçenekleri
    const reportTypeOptions = [
      { value: 'health_summary', label: 'Sağlık Özeti' },
      { value: 'medication_adherence', label: 'İlaç Kullanım Raporu' },
      { value: 'blood_sugar_analysis', label: 'Kan Şekeri Analizi' },
      { value: 'blood_pressure_analysis', label: 'Tansiyon Analizi' },
      { value: 'activity_summary', label: 'Aktivite Özeti' },
      { value: 'nutrition_analysis', label: 'Beslenme Analizi' },
      { value: 'custom', label: 'Özel Rapor' }
    ];
    
    // Sayfayı render et
    res.render('front/report-list', {
      title: `${familyMember.name} ${familyMember.surname} - Raporlar`,
      familyMember,
      reports,
      pagination,
      filter: req.query,
      reportTypes,
      reportTypeOptions
    });
  } catch (error) {
    logError(error, req);
    
    if (error.name === 'CastError') {
      req.flash('error_msg', 'Geçersiz aile üyesi ID formatı');
      return res.redirect('/home');
    }
    
    res.status(500).render('500', {
      title: 'Sunucu Hatası',
      message: 'Raporlar alınırken bir hata oluştu',
      error: process.env.NODE_ENV === 'development' ? error : {}
    });
  }
};

/**
 * Yeni rapor oluşturma sayfası
 * @route   GET /report/:familyMemberId/add
 * @access  Private
 */
exports.getAddReport = async (req, res) => {
  try {
    const { familyMemberId } = req.params;
    
    // Aile üyesini bul
    const familyMember = await FamilyMember.findOne({
      _id: familyMemberId,
      userId: req.user._id
    });
    
    if (!familyMember) {
      req.flash('error_msg', 'Aile üyesi bulunamadı');
      return res.redirect('/home');
    }
    
    // Rapor türünü al (opsiyonel)
    const type = req.query.type || 'health_summary';
    
    // Tarih aralığı parametreleri
    const period = req.query.period || 'month';
    let startDate, endDate;
    
    const now = new Date();
    
    if (period === 'week') {
      startDate = new Date(now);
      startDate.setDate(now.getDate() - 7);
    } else if (period === 'month') {
      startDate = new Date(now);
      startDate.setMonth(now.getMonth() - 1);
    } else if (period === 'quarter') {
      startDate = new Date(now);
      startDate.setMonth(now.getMonth() - 3);
    } else if (period === 'year') {
      startDate = new Date(now);
      startDate.setFullYear(now.getFullYear() - 1);
    } else {
      startDate = new Date(now);
      startDate.setMonth(now.getMonth() - 1);
    }
    
    endDate = new Date(now);
    
    // Rapor oluşturma sayfasını render et
    res.render('front/report-form', {
      title: `${familyMember.name} ${familyMember.surname} - Rapor Oluştur`,
      familyMember,
      type,
      formAction: `/report/${familyMemberId}`,
      formMethod: 'POST',
      report: null,
      defaultDateRange: {
        startDate,
        endDate
      },
      reportTypeOptions: [
        { value: 'health_summary', label: 'Sağlık Özeti' },
        { value: 'medication_adherence', label: 'İlaç Kullanım Raporu' },
        { value: 'blood_sugar_analysis', label: 'Kan Şekeri Analizi' },
        { value: 'blood_pressure_analysis', label: 'Tansiyon Analizi' },
        { value: 'activity_summary', label: 'Aktivite Özeti' },
        { value: 'nutrition_analysis', label: 'Beslenme Analizi' },
        { value: 'custom', label: 'Özel Rapor' }
      ],
      periodOptions: [
        { value: 'week', label: 'Son Hafta' },
        { value: 'month', label: 'Son Ay' },
        { value: 'quarter', label: 'Son 3 Ay' },
        { value: 'year', label: 'Son Yıl' }
      ],
      formatOptions: [
        { value: 'pdf', label: 'PDF' },
        { value: 'excel', label: 'Excel' },
        { value: 'html', label: 'HTML' },
        { value: 'text', label: 'Metin' }
      ],
      frequencyOptions: [
        { value: 'daily', label: 'Günlük' },
        { value: 'weekly', label: 'Haftalık' },
        { value: 'monthly', label: 'Aylık' },
        { value: 'quarterly', label: 'Üç Aylık' },
        { value: 'custom', label: 'Özel' }
      ]
    });
  } catch (error) {
    logError(error, req);
    
    if (error.name === 'CastError') {
      req.flash('error_msg', 'Geçersiz aile üyesi ID formatı');
      return res.redirect('/home');
    }
    
    res.status(500).render('500', {
      title: 'Sunucu Hatası',
      message: 'Rapor oluşturma sayfası yüklenirken bir hata oluştu',
      error: process.env.NODE_ENV === 'development' ? error : {}
    });
  }
};

/**
 * Rapor oluştur
 * @route   POST /report/:familyMemberId
 * @access  Private
 */
exports.addReport = async (req, res) => {
  try {
    const { familyMemberId } = req.params;
    
    // Aile üyesini kontrol et
    const familyMember = await FamilyMember.findOne({
      _id: familyMemberId,
      userId: req.user._id
    });
    
    if (!familyMember) {
      req.flash('error_msg', 'Aile üyesi bulunamadı');
      return res.redirect('/home');
    }
    
    // Form verilerini al
    const { 
      type,
      title,
      description,
      'dateRange.startDate': startDate,
      'dateRange.endDate': endDate,
      format
    } = req.body;
    
    // Tarih aralığı
    const dateRange = {
      startDate: new Date(startDate),
      endDate: new Date(endDate)
    };
    
    // Rapor türüne göre uygun metodu çağır
    let report;
    
    if (type === 'health_summary') {
      report = await Report.createHealthSummary(familyMemberId, dateRange, {
        title,
        description,
        format,
        createdBy: req.user._id
      });
    } else if (type === 'medication_adherence') {
      // İlaç kullanım raporu oluşturma fonksiyonu (model içinde tanımlı olmalı)
      // TODO: İlgili metodu implementasyon sonra eklenecek
      req.flash('error_msg', 'Bu rapor türü henüz desteklenmiyor');
      return res.redirect(`/report/${familyMemberId}/add?type=${type}`);
    } else if (type === 'blood_sugar_analysis') {
      // Kan şekeri analiz raporu oluşturma fonksiyonu (model içinde tanımlı olmalı)
      // TODO: İlgili metodu implementasyon sonra eklenecek
      req.flash('error_msg', 'Bu rapor türü henüz desteklenmiyor');
      return res.redirect(`/report/${familyMemberId}/add?type=${type}`);
    } else if (type === 'blood_pressure_analysis') {
      // Tansiyon analiz raporu oluşturma fonksiyonu (model içinde tanımlı olmalı)
      // TODO: İlgili metodu implementasyon sonra eklenecek
      req.flash('error_msg', 'Bu rapor türü henüz desteklenmiyor');
      return res.redirect(`/report/${familyMemberId}/add?type=${type}`);
    } else if (type === 'activity_summary') {
      // Aktivite özet raporu oluşturma fonksiyonu (model içinde tanımlı olmalı)
      // TODO: İlgili metodu implementasyon sonra eklenecek
      req.flash('error_msg', 'Bu rapor türü henüz desteklenmiyor');
      return res.redirect(`/report/${familyMemberId}/add?type=${type}`);
    } else if (type === 'nutrition_analysis') {
      // Beslenme analiz raporu oluşturma fonksiyonu (model içinde tanımlı olmalı)
      // TODO: İlgili metodu implementasyon sonra eklenecek
      req.flash('error_msg', 'Bu rapor türü henüz desteklenmiyor');
      return res.redirect(`/report/${familyMemberId}/add?type=${type}`);
    } else {
      // Özel rapor oluştur
      report = new Report({
        familyMemberId,
        title,
        type,
        description,
        dateRange,
        content: {
          sections: [],
          summary: {
            key_findings: [],
            recommendations: [],
            flags: []
          }
        },
        format: format || 'pdf',
        status: 'draft',
        createdBy: req.user._id
      });
      
      await report.save();
    }
    
    // Otomatik zamanlama ayarları
    if (req.body.isScheduled === 'on') {
      report.isScheduled = true;
      report.schedule = {
        frequency: req.body['schedule.frequency'] || 'monthly',
        lastGenerated: new Date()
      };
      
      await report.save();
    }
    
    // Log kaydı
    logInfo('Yeni rapor oluşturuldu', {
      userId: req.user._id,
      familyMemberId,
      reportId: report._id,
      type
    });
    
    req.flash('success_msg', 'Rapor başarıyla oluşturuldu');
    
    // Rapor görüntüleme sayfasına yönlendir
    res.redirect(`/report/${familyMemberId}/${report._id}`);
  } catch (error) {
    logError(error, req);
    
    if (error.name === 'ValidationError') {
      req.flash('error_msg', 'Geçersiz veya eksik veri');
      return res.redirect(`/report/${req.params.familyMemberId}/add?type=${req.body.type || 'health_summary'}`);
    }
    
    req.flash('error_msg', 'Rapor oluşturulurken bir hata oluştu');
    res.redirect(`/report/${req.params.familyMemberId}/add`);
  }
};

/**
 * Rapor detayını göster
 * @route   GET /report/:familyMemberId/:reportId
 * @access  Private
 */
exports.getReportDetail = async (req, res) => {
  try {
    const { familyMemberId, reportId } = req.params;
    
    // Aile üyesini kontrol et
    const familyMember = await FamilyMember.findOne({
      _id: familyMemberId,
      userId: req.user._id
    });
    
    if (!familyMember) {
      req.flash('error_msg', 'Aile üyesi bulunamadı');
      return res.redirect('/home');
    }
    
    // Raporu bul
    const report = await Report.findOne({
      _id: reportId,
      familyMemberId
    });
    
    if (!report) {
      req.flash('error_msg', 'Rapor bulunamadı');
      return res.redirect(`/report/${familyMemberId}`);
    }
    
    // Erişim kaydı ekle
    if (!report.accessLog) {
      report.accessLog = [];
    }
    
    report.accessLog.push({
      accessedBy: req.user._id,
      accessDate: new Date(),
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });
    
    await report.save();
    
    // Rapor türü metni
    const reportTypeMap = {
      'health_summary': 'Sağlık Özeti',
      'medication_adherence': 'İlaç Kullanım Raporu',
      'blood_sugar_analysis': 'Kan Şekeri Analizi',
      'blood_pressure_analysis': 'Tansiyon Analizi',
      'activity_summary': 'Aktivite Özeti',
      'nutrition_analysis': 'Beslenme Analizi',
      'custom': 'Özel Rapor'
    };
    
    // Detay sayfasını render et
    res.render('front/report-detail', {
      title: `${familyMember.name} ${familyMember.surname} - ${report.title}`,
      familyMember,
      report,
      reportTypeMap,
      alerts: report.calculateAlerts()
    });
  } catch (error) {
    logError(error, req);
    
    if (error.name === 'CastError') {
      req.flash('error_msg', 'Geçersiz ID formatı');
      return res.redirect('/home');
    }
    
    res.status(500).render('500', {
      title: 'Sunucu Hatası',
      message: 'Rapor detayı alınırken bir hata oluştu',
      error: process.env.NODE_ENV === 'development' ? error : {}
    });
  }
};

/**
 * Rapor dışa aktarma
 * @route   GET /report/:familyMemberId/:reportId/export
 * @access  Private
 */
exports.exportReport = async (req, res) => {
  try {
    const { familyMemberId, reportId } = req.params;
    const format = req.query.format || 'pdf';
    
    // Aile üyesini kontrol et
    const familyMember = await FamilyMember.findOne({
      _id: familyMemberId,
      userId: req.user._id
    });
    
    if (!familyMember) {
      req.flash('error_msg', 'Aile üyesi bulunamadı');
      return res.redirect('/home');
    }
    
    // Raporu bul
    const report = await Report.findOne({
      _id: reportId,
      familyMemberId
    });
    
    if (!report) {
      req.flash('error_msg', 'Rapor bulunamadı');
      return res.redirect(`/report/${familyMemberId}`);
    }
    
    // Rapor dışa aktarma işlemi
    // Bu kısım henüz tamamlanmadı, bir örnek yanıt veriliyor
    if (format === 'pdf') {
      // PDF oluşturma işlemi
      // Bu kısım için PDF oluşturma kütüphanesi (örn: pdfkit) kullanılacak
      req.flash('error_msg', 'PDF dışa aktarma şu anda desteklenmiyor');
      return res.redirect(`/report/${familyMemberId}/${reportId}`);
    } else if (format === 'excel') {
      // Excel oluşturma işlemi
      // Bu kısım için Excel oluşturma kütüphanesi (örn: xlsx) kullanılacak
      req.flash('error_msg', 'Excel dışa aktarma şu anda desteklenmiyor');
      return res.redirect(`/report/${familyMemberId}/${reportId}`);
    } else if (format === 'html') {
      // HTML olarak görüntüleme işlemi
      return res.render('front/report-export-html', {
        title: `${familyMember.name} ${familyMember.surname} - ${report.title}`,
        familyMember,
        report
      });
    } else if (format === 'text') {
      // Metin olarak dışa aktarma işlemi
      // İçeriği metin formatına çevir
      let textContent = `${report.title}\n`;
      textContent += `=`.repeat(report.title.length) + `\n\n`;
      textContent += `Tarih Aralığı: ${new Date(report.dateRange.startDate).toLocaleDateString()} - ${new Date(report.dateRange.endDate).toLocaleDateString()}\n`;
      
      if (report.description) {
        textContent += `\nAçıklama: ${report.description}\n\n`;
      }
      
      // Bölümler
      if (report.content && report.content.sections) {
        for (const section of report.content.sections) {
          textContent += `\n## ${section.title} ##\n`;
          if (section.text) {
            textContent += `${section.text}\n`;
          }
          
          // Veri içeriğini metin formatına çevir
          if (section.data) {
            textContent += `\n${JSON.stringify(section.data, null, 2)}\n`;
          }
        }
      }
      
      // Özet
      if (report.content && report.content.summary) {
        textContent += `\n## ÖZET ##\n`;
        if (report.content.summary.key_findings && report.content.summary.key_findings.length > 0) {
            textContent += `\nÖnemli Bulgular:\n`;
            for (const finding of report.content.summary.key_findings) {
              textContent += `- ${finding}\n`;
            }
          }
          
          if (report.content.summary.recommendations && report.content.summary.recommendations.length > 0) {
            textContent += `\nÖneriler:\n`;
            for (const recommendation of report.content.summary.recommendations) {
              textContent += `- ${recommendation}\n`;
            }
          }
          
          if (report.content.summary.flags && report.content.summary.flags.length > 0) {
            textContent += `\nUyarılar:\n`;
            for (const flag of report.content.summary.flags) {
              textContent += `- [${flag.type.toUpperCase()}] ${flag.message}\n`;
              if (flag.details) {
                textContent += `  ${flag.details}\n`;
              }
            }
          }
        }
        
        // Dosya adını oluştur
        const fileName = `${report.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.txt`;
        
        // Dosya başlığı ve içerik tipi ayarla
        res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
        res.setHeader('Content-Type', 'text/plain');
        
        // İçeriği gönder
        return res.send(textContent);
      } else {
        req.flash('error_msg', 'Geçersiz dışa aktarma formatı');
        return res.redirect(`/report/${familyMemberId}/${reportId}`);
      }
    } catch (error) {
      logError(error, req);
      
      req.flash('error_msg', 'Rapor dışa aktarılırken bir hata oluştu');
      res.redirect(`/report/${req.params.familyMemberId}/${req.params.reportId}`);
    }
  };
  
  /**
   * Rapor silme
   * @route   DELETE /report/:familyMemberId/:reportId
   * @access  Private
   */
  exports.deleteReport = async (req, res) => {
    try {
      const { familyMemberId, reportId } = req.params;
      
      // Aile üyesini kontrol et
      const familyMember = await FamilyMember.findOne({
        _id: familyMemberId,
        userId: req.user._id
      });
      
      if (!familyMember) {
        req.flash('error_msg', 'Aile üyesi bulunamadı');
        return res.redirect('/home');
      }
      
      // Raporu bul ve sil
      const report = await Report.findOneAndDelete({
        _id: reportId,
        familyMemberId
      });
      
      if (!report) {
        req.flash('error_msg', 'Rapor bulunamadı');
        return res.redirect(`/report/${familyMemberId}`);
      }
      
      // Eğer oluşturulmuş bir rapor dosyası varsa, onu da sil
      if (report.generatedFile && report.generatedFile.path) {
        const filePath = path.join(__dirname, '..', report.generatedFile.path);
        
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }
      
      // Log kaydı
      logInfo('Rapor silindi', {
        userId: req.user._id,
        familyMemberId,
        reportId,
        type: report.type
      });
      
      req.flash('success_msg', 'Rapor başarıyla silindi');
      
      // Raporlar listesine yönlendir
      res.redirect(`/report/${familyMemberId}`);
    } catch (error) {
      logError(error, req);
      
      if (error.name === 'CastError') {
        req.flash('error_msg', 'Geçersiz ID formatı');
        return res.redirect(`/report/${req.params.familyMemberId}`);
      }
      
      req.flash('error_msg', 'Rapor silinirken bir hata oluştu');
      res.redirect(`/report/${req.params.familyMemberId}`);
    }
  };
  
  /**
   * API: Raporları listele
   * @route   GET /api/report/:familyMemberId
   * @access  Private
   */
  exports.apiGetReportList = async (req, res) => {
    try {
      const { familyMemberId } = req.params;
      
      // Aile üyesini kontrol et (admin her aile üyesine erişebilir)
      let familyMember;
      
      if (req.isAdmin) {
        familyMember = await FamilyMember.findById(familyMemberId);
      } else {
        familyMember = await FamilyMember.findOne({
          _id: familyMemberId,
          userId: req.user._id
        });
      }
      
      if (!familyMember) {
        return res.status(404).json({
          success: false,
          error: 'Aile üyesi bulunamadı'
        });
      }
      
      // Filtreleme parametreleri
      const filter = { familyMemberId };
      
      if (req.query.type) {
        filter.type = req.query.type;
      }
      
      if (req.query.startDate && req.query.endDate) {
        filter['dateRange.startDate'] = { $gte: new Date(req.query.startDate) };
        filter['dateRange.endDate'] = { $lte: new Date(req.query.endDate) };
      } else if (req.query.startDate) {
        filter['dateRange.startDate'] = { $gte: new Date(req.query.startDate) };
      } else if (req.query.endDate) {
        filter['dateRange.endDate'] = { $lte: new Date(req.query.endDate) };
      }
      
      // Sayfalama
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;
      const skip = (page - 1) * limit;
      
      // Toplam kayıt sayısı
      const total = await Report.countDocuments(filter);
      
      // Raporları getir
      const reports = await Report.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);
      
      // Formatlı verileri hazırla
      const formattedData = reports.map(report => ({
        id: report._id,
        familyMemberId: report.familyMemberId,
        title: report.title,
        type: report.type,
        dateRange: {
          startDate: report.dateRange.startDate,
          endDate: report.dateRange.endDate
        },
        format: report.format,
        status: report.status,
        isScheduled: report.isScheduled,
        hasGeneratedFile: !!report.generatedFile,
        createdAt: report.createdAt
      }));
      
      // API yanıtı
      res.json({
        success: true,
        count: formattedData.length,
        total,
        pagination: {
          page,
          limit,
          totalPages: Math.ceil(total / limit)
        },
        data: formattedData
      });
    } catch (error) {
      logError(error, req);
      
      res.status(500).json({
        success: false,
        error: 'Raporlar alınırken bir hata oluştu'
      });
    }
  };
  
  /**
   * API: Rapor detayı
   * @route   GET /api/report/:familyMemberId/:reportId
   * @access  Private
   */
  exports.apiGetReportDetail = async (req, res) => {
    try {
      const { familyMemberId, reportId } = req.params;
      
      // Aile üyesini kontrol et (admin her aile üyesine erişebilir)
      let familyMember;
      
      if (req.isAdmin) {
        familyMember = await FamilyMember.findById(familyMemberId);
      } else {
        familyMember = await FamilyMember.findOne({
          _id: familyMemberId,
          userId: req.user._id
        });
      }
      
      if (!familyMember) {
        return res.status(404).json({
          success: false,
          error: 'Aile üyesi bulunamadı'
        });
      }
      
      // Raporu bul
      const report = await Report.findOne({
        _id: reportId,
        familyMemberId
      });
      
      if (!report) {
        return res.status(404).json({
          success: false,
          error: 'Rapor bulunamadı'
        });
      }
      
      // Erişim kaydı ekle
      if (!report.accessLog) {
        report.accessLog = [];
      }
      
      report.accessLog.push({
        accessedBy: req.user._id,
        accessDate: new Date(),
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      });
      
      await report.save();
      
      // API yanıtı
      res.json({
        success: true,
        data: report
      });
    } catch (error) {
      logError(error, req);
      
      res.status(500).json({
        success: false,
        error: 'Rapor detayı alınırken bir hata oluştu'
      });
    }
  };
  
  /**
   * API: Rapor oluştur
   * @route   POST /api/report
   * @access  Private
   */
  exports.apiCreateReport = async (req, res) => {
    try {
      const { familyMemberId, type, title, description, dateRange, format } = req.body;
      
      if (!familyMemberId) {
        return res.status(400).json({
          success: false,
          error: 'Aile üyesi ID\'si belirtilmedi'
        });
      }
      
      // Aile üyesini kontrol et (admin her aile üyesine erişebilir)
      let familyMember;
      
      if (req.isAdmin) {
        familyMember = await FamilyMember.findById(familyMemberId);
      } else {
        familyMember = await FamilyMember.findOne({
          _id: familyMemberId,
          userId: req.user._id
        });
      }
      
      if (!familyMember) {
        return res.status(404).json({
          success: false,
          error: 'Aile üyesi bulunamadı'
        });
      }
      
      // Rapor türüne göre uygun metodu çağır
      let report;
      
      if (type === 'health_summary') {
        report = await Report.createHealthSummary(familyMemberId, dateRange, {
          title,
          description,
          format,
          createdBy: req.user._id
        });
      } else if (type === 'medication_adherence' || 
                 type === 'blood_sugar_analysis' || 
                 type === 'blood_pressure_analysis' || 
                 type === 'activity_summary' || 
                 type === 'nutrition_analysis') {
        // Henüz desteklenmeyen rapor türleri için hata
        return res.status(400).json({
          success: false,
          error: 'Bu rapor türü henüz desteklenmiyor'
        });
      } else {
        // Özel rapor oluştur
        report = new Report({
          familyMemberId,
          title,
          type: type || 'custom',
          description,
          dateRange,
          content: {
            sections: [],
            summary: {
              key_findings: [],
              recommendations: [],
              flags: []
            }
          },
          format: format || 'pdf',
          status: 'draft',
          createdBy: req.user._id
        });
        
        await report.save();
      }
      
      // Otomatik zamanlama
      if (req.body.isScheduled) {
        report.isScheduled = true;
        report.schedule = {
          frequency: req.body.schedule ? req.body.schedule.frequency : 'monthly',
          lastGenerated: new Date()
        };
        
        await report.save();
      }
      
      // Log kaydı
      logInfo('API: Rapor oluşturuldu', {
        userId: req.user._id,
        familyMemberId,
        reportId: report._id,
        type: report.type
      });
      
      // API yanıtı
      res.status(201).json({
        success: true,
        data: report
      });
    } catch (error) {
      logError(error, req);
      
      if (error.name === 'ValidationError') {
        return res.status(400).json({
          success: false,
          error: 'Geçersiz veri formatı',
          details: Object.values(error.errors).map(err => err.message)
        });
      }
      
      res.status(500).json({
        success: false,
        error: 'Rapor oluşturulurken bir hata oluştu'
      });
    }
  };
  
  /**
   * API: Rapor silme
   * @route   DELETE /api/report/:reportId
   * @access  Private
   */
  exports.apiDeleteReport = async (req, res) => {
    try {
      const { reportId } = req.params;
      
      // Raporu bul
      const report = await Report.findById(reportId);
      
      if (!report) {
        return res.status(404).json({
          success: false,
          error: 'Rapor bulunamadı'
        });
      }
      
      // Aile üyesini kontrol et
      let familyMember;
      
      if (req.isAdmin) {
        familyMember = await FamilyMember.findById(report.familyMemberId);
      } else {
        familyMember = await FamilyMember.findOne({
          _id: report.familyMemberId,
          userId: req.user._id
        });
      }
      
      if (!familyMember) {
        return res.status(403).json({
          success: false,
          error: 'Bu raporu silme yetkiniz yok'
        });
      }
      
      // Raporu sil
      await report.remove();
      
      // Eğer oluşturulmuş bir rapor dosyası varsa, onu da sil
      if (report.generatedFile && report.generatedFile.path) {
        const filePath = path.join(__dirname, '..', report.generatedFile.path);
        
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }
      
      // Log kaydı
      logInfo('API: Rapor silindi', {
        userId: req.user._id,
        familyMemberId: report.familyMemberId,
        reportId,
        type: report.type
      });
      
      // API yanıtı
      res.json({
        success: true,
        data: {}
      });
    } catch (error) {
      logError(error, req);
      
      res.status(500).json({
        success: false,
        error: 'Rapor silinirken bir hata oluştu'
      });
    }
  };
  
  module.exports = exports;
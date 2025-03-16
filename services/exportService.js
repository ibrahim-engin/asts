/**
 * ASTS - Aile Sağlık Takip Sistemi
 * Export Service - Veri Dışa Aktarma Servisi
 * 
 * Bu servis, sistem verilerinin farklı formatlarda (PDF, Excel, CSV) dışa aktarılmasını sağlar.
 * Raporlar, sağlık verileri, ilaç takipleri gibi bilgilerin dışa aktarımı için kullanılır.
 */

const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');
const moment = require('moment');
const { createObjectCsvWriter } = require('csv-writer');
const { logInfo, logError } = require('../middlewares/logger');
const config = require('../config');

// Geçici dosyalar için dizin
const TEMP_DIR = path.join(__dirname, '../public/temp');

// Temp dizinini oluştur (yoksa)
if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
}

/**
 * Geçici dosya adı oluşturur
 * @param {string} prefix - Dosya adı öneki
 * @param {string} extension - Dosya uzantısı (.pdf, .xlsx, .csv)
 * @returns {string} - Tam dosya yolu
 */
const generateTempFilename = (prefix, extension) => {
  const timestamp = moment().format('YYYYMMDD_HHmmss');
  const filename = `${prefix}_${timestamp}${extension}`;
  return path.join(TEMP_DIR, filename);
};

/**
 * Geçici dosyaları temizler
 * @param {number} maxAge - En fazla yaş (dakika cinsinden)
 */
const cleanupTempFiles = (maxAge = 60) => {
  fs.readdir(TEMP_DIR, (err, files) => {
    if (err) {
      logError('Temp dosyaları okunamadı', err);
      return;
    }
    
    const now = moment();
    
    files.forEach(file => {
      const filePath = path.join(TEMP_DIR, file);
      
      fs.stat(filePath, (err, stats) => {
        if (err) {
          logError(`Dosya bilgisi alınamadı: ${file}`, err);
          return;
        }
        
        const fileDate = moment(stats.mtime);
        const diffMinutes = now.diff(fileDate, 'minutes');
        
        if (diffMinutes > maxAge) {
          fs.unlink(filePath, (err) => {
            if (err) {
              logError(`Temp dosyası silinemedi: ${file}`, err);
            } else {
              logInfo(`Temp dosyası silindi: ${file}`);
            }
          });
        }
      });
    });
  });
};

// Periyodik temizleme işlemi (her saat)
setInterval(() => {
  cleanupTempFiles();
}, 60 * 60 * 1000);

/**
 * PDF dosyası oluşturur
 * @param {string} title - Belge başlığı
 * @param {Object} content - İçerik bilgileri
 * @param {Function} contentRenderer - PDF içeriğini işleyen fonksiyon
 * @returns {Promise<string>} - Oluşturulan dosyanın yolu
 */
const generatePDF = (title, content, contentRenderer) => {
  return new Promise((resolve, reject) => {
    try {
      const filename = generateTempFilename('report', '.pdf');
      const doc = new PDFDocument({
        size: 'A4',
        margins: { top: 50, bottom: 50, left: 50, right: 50 }
      });
      
      // PDF'i dosyaya yönlendir
      const stream = fs.createWriteStream(filename);
      doc.pipe(stream);
      
      // Standart font ve başlık ayarları
      doc.font('Helvetica');
      doc.fontSize(18).text(title, { align: 'center' });
      doc.moveDown();
      
      // Alt bilgi ekle
      doc.on('pageAdded', () => {
        const currentPage = doc.page.pageNumber;
        doc.fontSize(8)
          .text(
            `ASTS - Aile Sağlık Takip Sistemi - Sayfa ${currentPage}`,
            50,
            doc.page.height - 50,
            { align: 'center' }
          );
      });
      
      // İçerik işleyiciyi çağır
      contentRenderer(doc, content);
      
      // Oluşturma tarihini ekle
      doc.fontSize(8)
        .text(
          `Oluşturulma Tarihi: ${moment().format('DD.MM.YYYY HH:mm')}`,
          doc.fontSize(8)
          .text(
            `Oluşturulma Tarihi: ${moment().format('DD.MM.YYYY HH:mm')}`,
            50,
            doc.page.height - 30,
            { align: 'center' }
          ));
        
        // PDF'i sonlandır
        doc.end();
        
        // Stream kapandığında dosya yolunu döndür
        stream.on('finish', () => {
          logInfo(`PDF dosyası oluşturuldu: ${filename}`);
          resolve(filename);
        });
        
        stream.on('error', (error) => {
          logError('PDF oluşturma hatası', error);
          reject(error);
        });
      } catch (error) {
        logError('PDF oluşturma hatası', error);
        reject(error);
      }
    });
};

/**
* Excel dosyası oluşturur
* @param {string} title - Çalışma kitabı başlığı
* @param {Array<Object>} worksheets - Çalışma sayfaları yapılandırması
* @returns {Promise<string>} - Oluşturulan dosyanın yolu
*/
const generateExcel = async (title, worksheets) => {
try {
  const filename = generateTempFilename('report', '.xlsx');
  const workbook = new ExcelJS.Workbook();
  
  workbook.creator = 'ASTS';
  workbook.created = new Date();
  workbook.modified = new Date();
  
  // Her çalışma sayfasını ekle
  for (const worksheet of worksheets) {
    const sheet = workbook.addWorksheet(worksheet.name);
    
    // Başlık satırı
    if (worksheet.title) {
      sheet.mergeCells('A1:Z1');
      sheet.getCell('A1').value = worksheet.title;
      sheet.getCell('A1').font = { size: 14, bold: true };
      sheet.getCell('A1').alignment = { horizontal: 'center' };
      sheet.getRow(1).height = 30;
    }
    
    // Sütun başlıkları
    sheet.columns = worksheet.columns.map(column => ({
      header: column.header,
      key: column.key,
      width: column.width || 15
    }));
    
    // Sütun başlıklarını formatla
    const headerRow = sheet.getRow(worksheet.title ? 2 : 1);
    headerRow.font = { bold: true };
    headerRow.alignment = { horizontal: 'center' };
    headerRow.height = 20;
    
    // Verileri ekle
    if (worksheet.data && worksheet.data.length > 0) {
      sheet.addRows(worksheet.data);
    }
    
    // Tarih sütunlarını formatla
    worksheet.columns.forEach((column, index) => {
      if (column.type === 'date') {
        const col = sheet.getColumn(index + 1);
        col.eachCell({ includeEmpty: false }, (cell, rowNumber) => {
          if (rowNumber > (worksheet.title ? 2 : 1) && cell.value) {
            cell.numFmt = 'dd.mm.yyyy';
          }
        });
      }
    });
    
    // Tabloyu formatla
    if (worksheet.data && worksheet.data.length > 0) {
      const startRow = worksheet.title ? 2 : 1;
      const endRow = startRow + worksheet.data.length;
      const endCol = worksheet.columns.length;
      
      // Hücre çerçeveleri
      for (let i = startRow; i <= endRow; i++) {
        const row = sheet.getRow(i);
        for (let j = 1; j <= endCol; j++) {
          const cell = row.getCell(j);
          cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' }
          };
        }
      }
    }
  }
  
  // Dosyayı kaydet
  await workbook.xlsx.writeFile(filename);
  logInfo(`Excel dosyası oluşturuldu: ${filename}`);
  return filename;
} catch (error) {
  logError('Excel oluşturma hatası', error);
  throw error;
}
};

/**
* CSV dosyası oluşturur
* @param {string} title - Dosya başlığı
* @param {Array<Object>} data - CSV verileri
* @param {Array<Object>} columns - Sütun tanımları
* @returns {Promise<string>} - Oluşturulan dosyanın yolu
*/
const generateCSV = async (title, data, columns) => {
try {
  const filename = generateTempFilename('report', '.csv');
  
  const csvWriter = createObjectCsvWriter({
    path: filename,
    header: columns,
    encoding: 'utf8',
    headerIdDelimiter: '.'
  });
  
  await csvWriter.writeRecords(data);
  logInfo(`CSV dosyası oluşturuldu: ${filename}`);
  return filename;
} catch (error) {
  logError('CSV oluşturma hatası', error);
  throw error;
}
};

/**
* Sağlık verilerini PDF formatında dışa aktarır
* @param {Object} familyMember - Aile üyesi bilgileri
* @param {Array} healthData - Sağlık verileri
* @param {string} dataType - Veri tipi (kan şekeri, tansiyon vb.)
* @param {Object} options - Dışa aktarma seçenekleri
* @returns {Promise<string>} - Oluşturulan dosyanın yolu
*/
const exportHealthDataToPDF = async (familyMember, healthData, dataType, options = {}) => {
const title = `${familyMember.name} ${familyMember.surname} - ${getDataTypeName(dataType)} Raporu`;

// PDF içerik işleyicisi
const contentRenderer = (doc, content) => {
  // Aile üyesi bilgileri
  doc.fontSize(12).font('Helvetica-Bold').text('Kişi Bilgileri:');
  doc.fontSize(10).font('Helvetica')
    .text(`İsim: ${content.familyMember.name} ${content.familyMember.surname}`)
    .text(`Yaş: ${content.familyMember.age || 'Belirtilmemiş'}`)
    .text(`Cinsiyet: ${getGenderName(content.familyMember.gender)}`)
    .moveDown();
  
  // Tarih aralığı
  if (options.startDate && options.endDate) {
    doc.fontSize(10)
      .text(`Tarih Aralığı: ${moment(options.startDate).format('DD.MM.YYYY')} - ${moment(options.endDate).format('DD.MM.YYYY')}`)
      .moveDown();
  }
  
  // Tablo başlıkları
  doc.fontSize(10).font('Helvetica-Bold');
  let yPos = doc.y;
  
  // Sütun genişlikleri
  const dateWidth = 120;
  const valueWidth = 120;
  const statusWidth = 80;
  const notesWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right - dateWidth - valueWidth - statusWidth;
  
  // Tablo başlıkları
  doc.text('Tarih', doc.page.margins.left, yPos);
  doc.text('Değer', doc.page.margins.left + dateWidth, yPos);
  doc.text('Durum', doc.page.margins.left + dateWidth + valueWidth, yPos);
  doc.text('Notlar', doc.page.margins.left + dateWidth + valueWidth + statusWidth, yPos);
  
  // Çizgi çiz
  yPos += 15;
  doc.moveTo(doc.page.margins.left, yPos)
    .lineTo(doc.page.width - doc.page.margins.right, yPos)
    .stroke();
  
  // Veri satırları
  doc.font('Helvetica');
  
  content.healthData.forEach((data, index) => {
    yPos += 20;
    
    // Sayfa sınırına yaklaşıldıysa yeni sayfa
    if (yPos > doc.page.height - doc.page.margins.bottom - 40) {
      doc.addPage();
      yPos = doc.page.margins.top + 20;
    }
    
    // Tarih
    doc.text(
      moment(data.measuredAt).format('DD.MM.YYYY HH:mm'),
      doc.page.margins.left,
      yPos
    );
    
    // Değer
    let valueText = '';
    if (dataType === 'bloodSugar' && data.bloodSugar) {
      valueText = `${data.bloodSugar.value} ${data.bloodSugar.unit}`;
    } else if (dataType === 'bloodPressure' && data.bloodPressure) {
      valueText = `${data.bloodPressure.systolic}/${data.bloodPressure.diastolic} ${data.bloodPressure.unit || 'mmHg'}`;
    } else if (dataType === 'heartRate' && data.heartRate) {
      valueText = `${data.heartRate.value} ${data.heartRate.unit || 'bpm'}`;
    } else if (dataType === 'weight' && data.weight) {
      valueText = `${data.weight.value} ${data.weight.unit || 'kg'}`;
    } else {
      valueText = 'Belirtilmemiş';
    }
    
    doc.text(valueText, doc.page.margins.left + dateWidth, yPos);
    
    // Durum
    const statusText = getStatusName(data.status);
    doc.text(statusText, doc.page.margins.left + dateWidth + valueWidth, yPos);
    
    // Notlar
    if (data.notes) {
      // Uzun notları birden fazla satıra böl
      const notesText = doc.heightOfString(data.notes, { width: notesWidth });
      if (notesText > 20) {
        doc.text(
          data.notes,
          doc.page.margins.left + dateWidth + valueWidth + statusWidth,
          yPos,
          { width: notesWidth }
        );
        // Notlardan dolayı sonraki satırı aşağı kaydır
        yPos += notesText - 20;
      } else {
        doc.text(
          data.notes,
          doc.page.margins.left + dateWidth + valueWidth + statusWidth,
          yPos
        );
      }
    }
    
    // Satırları ayırmak için çizgi çiz
    if (index < content.healthData.length - 1) {
      yPos += 10;
      doc.moveTo(doc.page.margins.left, yPos)
        .lineTo(doc.page.width - doc.page.margins.right, yPos)
        .stroke();
    }
  });
  
  // Özet bilgiler
  if (content.summary) {
    doc.addPage();
    doc.fontSize(12).font('Helvetica-Bold').text('Özet Bilgiler:');
    doc.fontSize(10).font('Helvetica').moveDown(0.5);
    
    // Özet verileri
    if (content.summary.average) {
      doc.text(`Ortalama Değer: ${content.summary.average}`);
    }
    
    if (content.summary.min) {
      doc.text(`En Düşük Değer: ${content.summary.min}`);
    }
    
    if (content.summary.max) {
      doc.text(`En Yüksek Değer: ${content.summary.max}`);
    }
    
    if (content.summary.normalCount !== undefined) {
      doc.text(`Normal Değer Sayısı: ${content.summary.normalCount}`);
    }
    
    if (content.summary.warningCount !== undefined) {
      doc.text(`Uyarı Değeri Sayısı: ${content.summary.warningCount}`);
    }
    
    if (content.summary.criticalCount !== undefined) {
      doc.text(`Kritik Değer Sayısı: ${content.summary.criticalCount}`);
    }
  }
};

// PDF'i oluştur
return await generatePDF(title, { familyMember, healthData }, contentRenderer);
};

/**
* Sağlık verilerini Excel formatında dışa aktarır
* @param {Object} familyMember - Aile üyesi bilgileri
* @param {Array} healthData - Sağlık verileri
* @param {string} dataType - Veri tipi (kan şekeri, tansiyon vb.)
* @param {Object} options - Dışa aktarma seçenekleri
* @returns {Promise<string>} - Oluşturulan dosyanın yolu
*/
const exportHealthDataToExcel = async (familyMember, healthData, dataType, options = {}) => {
const title = `${familyMember.name} ${familyMember.surname} - ${getDataTypeName(dataType)} Raporu`;

// Veri dönüşümü
const data = healthData.map(item => {
  const base = {
    date: new Date(item.measuredAt),
    status: getStatusName(item.status),
    notes: item.notes || ''
  };
  
  // Veri tipine göre özel alanlar
  if (dataType === 'bloodSugar' && item.bloodSugar) {
    return {
      ...base,
      value: item.bloodSugar.value,
      unit: item.bloodSugar.unit,
      measurementType: item.bloodSugar.measurementType === 'fasting' ? 'Açlık' : 
                      (item.bloodSugar.measurementType === 'postprandial' ? 'Tokluk' : 'Rastgele')
    };
  } else if (dataType === 'bloodPressure' && item.bloodPressure) {
    return {
      ...base,
      systolic: item.bloodPressure.systolic,
      diastolic: item.bloodPressure.diastolic,
      unit: item.bloodPressure.unit || 'mmHg',
      position: getPositionName(item.bloodPressure.position)
    };
  } else if (dataType === 'heartRate' && item.heartRate) {
    return {
      ...base,
      value: item.heartRate.value,
      unit: item.heartRate.unit || 'bpm',
      activityLevel: getActivityLevelName(item.heartRate.activityLevel)
    };
  } else if (dataType === 'weight' && item.weight) {
    return {
      ...base,
      value: item.weight.value,
      unit: item.weight.unit || 'kg'
    };
  } else {
    return base;
  }
});

// Sütun tanımları
let columns = [
  { header: 'Tarih', key: 'date', width: 20, type: 'date' },
  { header: 'Durum', key: 'status', width: 15 },
  { header: 'Notlar', key: 'notes', width: 30 }
];

// Veri tipine göre özel sütunlar
if (dataType === 'bloodSugar') {
  columns.splice(1, 0, 
    { header: 'Değer', key: 'value', width: 15 },
    { header: 'Birim', key: 'unit', width: 10 },
    { header: 'Ölçüm Tipi', key: 'measurementType', width: 15 }
  );
} else if (dataType === 'bloodPressure') {
  columns.splice(1, 0, 
    { header: 'Sistolik', key: 'systolic', width: 15 },
    { header: 'Diastolik', key: 'diastolic', width: 15 },
    { header: 'Birim', key: 'unit', width: 10 },
    { header: 'Pozisyon', key: 'position', width: 15 }
  );
} else if (dataType === 'heartRate') {
  columns.splice(1, 0, 
    { header: 'Değer', key: 'value', width: 15 },
    { header: 'Birim', key: 'unit', width: 10 },
    { header: 'Aktivite Seviyesi', key: 'activityLevel', width: 20 }
  );
} else if (dataType === 'weight') {
  columns.splice(1, 0, 
    { header: 'Değer', key: 'value', width: 15 },
    { header: 'Birim', key: 'unit', width: 10 }
  );
}

// Excel çalışma sayfaları
const worksheets = [
  {
    name: 'Sağlık Verileri',
    title: title,
    columns: columns,
    data: data
  },
  {
    name: 'Kişi Bilgileri',
    title: 'Kişi Bilgileri',
    columns: [
      { header: 'Alan', key: 'field', width: 20 },
      { header: 'Değer', key: 'value', width: 30 }
    ],
    data: [
      { field: 'İsim', value: familyMember.name },
      { field: 'Soyisim', value: familyMember.surname },
      { field: 'Yaş', value: familyMember.age || 'Belirtilmemiş' },
      { field: 'Cinsiyet', value: getGenderName(familyMember.gender) },
      { field: 'Kan Grubu', value: familyMember.bloodType || 'Belirtilmemiş' }
    ]
  }
];

// Excel dosyasını oluştur
return await generateExcel(title, worksheets);
};

/**
* Sağlık verilerini CSV formatında dışa aktarır
* @param {Object} familyMember - Aile üyesi bilgileri
* @param {Array} healthData - Sağlık verileri
* @param {string} dataType - Veri tipi (kan şekeri, tansiyon vb.)
* @param {Object} options - Dışa aktarma seçenekleri
* @returns {Promise<string>} - Oluşturulan dosyanın yolu
*/
const exportHealthDataToCSV = async (familyMember, healthData, dataType, options = {}) => {
const title = `${familyMember.name} ${familyMember.surname} - ${getDataTypeName(dataType)}`;

// Veri dönüşümü
const data = healthData.map(item => {
  const base = {
    date: moment(item.measuredAt).format('YYYY-MM-DD HH:mm:ss'),
    status: getStatusName(item.status),
    notes: item.notes || ''
  };
  
  // Veri tipine göre özel alanlar
  if (dataType === 'bloodSugar' && item.bloodSugar) {
    return {
      ...base,
      value: item.bloodSugar.value,
      unit: item.bloodSugar.unit,
      measurementType: item.bloodSugar.measurementType
    };
  } else if (dataType === 'bloodPressure' && item.bloodPressure) {
    return {
      ...base,
      systolic: item.bloodPressure.systolic,
      diastolic: item.bloodPressure.diastolic,
      unit: item.bloodPressure.unit || 'mmHg',
      position: item.bloodPressure.position
    };
  } else if (dataType === 'heartRate' && item.heartRate) {
    return {
      ...base,
      value: item.heartRate.value,
      unit: item.heartRate.unit || 'bpm',
      activityLevel: item.heartRate.activityLevel
    };
  } else if (dataType === 'weight' && item.weight) {
    return {
      ...base,
      value: item.weight.value,
      unit: item.weight.unit || 'kg'
    };
  } else {
    return base;
  }
});

// Sütun tanımları
let columns = [
  { id: 'date', title: 'Tarih' },
  { id: 'status', title: 'Durum' },
  { id: 'notes', title: 'Notlar' }
];

// Veri tipine göre özel sütunlar
if (dataType === 'bloodSugar') {
  columns.splice(1, 0, 
    { id: 'value', title: 'Değer' },
    { id: 'unit', title: 'Birim' },
    { id: 'measurementType', title: 'Ölçüm Tipi' }
  );
} else if (dataType === 'bloodPressure') {
  columns.splice(1, 0, 
    { id: 'systolic', title: 'Sistolik' },
    { id: 'diastolic', title: 'Diastolik' },
    { id: 'unit', title: 'Birim' },
    { id: 'position', title: 'Pozisyon' }
  );
} else if (dataType === 'heartRate') {
  columns.splice(1, 0, 
    { id: 'value', title: 'Değer' },
    { id: 'unit', title: 'Birim' },
    { id: 'activityLevel', title: 'Aktivite Seviyesi' }
  );
} else if (dataType === 'weight') {
  columns.splice(1, 0, 
    { id: 'value', title: 'Değer' },
    { id: 'unit', title: 'Birim' }
  );
}

// CSV dosyasını oluştur
return await generateCSV(title, data, columns);
};

/**
* İlaç verilerini PDF formatında dışa aktarır
* @param {Object} familyMember - Aile üyesi bilgileri
* @param {Array} medications - İlaç verileri
* @param {Object} options - Dışa aktarma seçenekleri
* @returns {Promise<string>} - Oluşturulan dosyanın yolu
*/
const exportMedicationsToPDF = async (familyMember, medications, options = {}) => {
const title = `${familyMember.name} ${familyMember.surname} - İlaç Raporu`;

// PDF içerik işleyicisi
const contentRenderer = (doc, content) => {
  // Aile üyesi bilgileri
  doc.fontSize(12).font('Helvetica-Bold').text('Kişi Bilgileri:');
  doc.fontSize(10).font('Helvetica')
    .text(`İsim: ${content.familyMember.name} ${content.familyMember.surname}`)
    .text(`Yaş: ${content.familyMember.age || 'Belirtilmemiş'}`)
    .text(`Cinsiyet: ${getGenderName(content.familyMember.gender)}`)
    .moveDown();
  
  // İlaç listesi
  doc.fontSize(12).font('Helvetica-Bold').text('İlaç Listesi:');
  doc.moveDown(0.5);
  
  // İlaçları işle
  content.medications.forEach((medication, index) => {
    doc.fontSize(11).font('Helvetica-Bold')
      .text(`${index + 1}. ${medication.name}`);
    
    doc.fontSize(10).font('Helvetica')
      .text(`Dozaj: ${medication.dosage.value} ${medication.dosage.unit} ${medication.dosage.form || ''}`)
      .text(`Kullanım: ${getFrequencyText(medication)}`)
      .text(`Başlangıç: ${moment(medication.startDate).format('DD.MM.YYYY')}`)
      .text(`Bitiş: ${medication.endDate ? moment(medication.endDate).format('DD.MM.YYYY') : 'Belirtilmemiş'}`)
      .text(`Durum: ${medication.isActive ? 'Aktif' : 'Pasif'}`);
    
    // İlaç amacı
    if (medication.purpose) {
      doc.text(`Amaç: ${medication.purpose}`);
    }
    
    // Hatırlatıcı zamanları
    if (medication.schedule && medication.schedule.times && medication.schedule.times.length > 0) {
      doc.text('Kullanım Zamanları:');
      medication.schedule.times.forEach(time => {
        doc.text(`   - ${time.time} (${time.dosage || 1} adet${time.withFood ? ', yemekle birlikte' : ''})`);
      });
    }
    
    // Yan etkiler
    if (medication.sideEffects && medication.sideEffects.length > 0) {
      doc.text(`Yan Etkiler: ${medication.sideEffects.join(', ')}`);
    }
    
    // Notlar
    if (medication.notes) {
      doc.text(`Notlar: ${medication.notes}`);
    }
    
    // İlaçlar arası boşluk
    doc.moveDown();
  });
};

// PDF'i oluştur
return await generatePDF(title, { familyMember, medications }, contentRenderer);
};

/**
* İlaç verilerini Excel formatında dışa aktarır
* @param {Object} familyMember - Aile üyesi bilgileri
* @param {Array} medications - İlaç verileri
* @param {Object} options - Dışa aktarma seçenekleri
* @returns {Promise<string>} - Oluşturulan dosyanın yolu
*/
const exportMedicationsToExcel = async (familyMember, medications, options = {}) => {
const title = `${familyMember.name} ${familyMember.surname} - İlaç Raporu`;

// Veri dönüşümü
const data = medications.map(item => ({
  name: item.name,
  genericName: item.genericName || '',
  dosage: `${item.dosage.value} ${item.dosage.unit}`,
  form: item.dosage.form || '',
  frequency: getFrequencyText(item),
  startDate: new Date(item.startDate),
  endDate: item.endDate ? new Date(item.endDate) : null,
  status: item.isActive ? 'Aktif' : 'Pasif',
  purpose: item.purpose || '',
  prescribedBy: item.prescribedBy ? item.prescribedBy.name || '' : '',
  notes: item.notes || ''
}));

// Excel çalışma sayfaları
const worksheets = [
  {
    name: 'İlaçlar',
    title: title,
    columns: [
      { header: 'İlaç Adı', key: 'name', width: 25 },
      { header: 'Jenerik Adı', key: 'genericName', width: 25 },
      { header: 'Dozaj', key: 'dosage', width: 15 },
      { header: 'Form', key: 'form', width: 15 },
      { header: 'Kullanım', key: 'frequency', width: 25 },
      { header: 'Başlangıç', key: 'startDate', width: 15, type: 'date' },
      { header: 'Bitiş', key: 'endDate', width: 15, type: 'date' },
      { header: 'Durum', key: 'status', width: 10 },
      { header: 'Amaç', key: 'purpose', width: 30 },
      { header: 'Reçete Eden', key: 'prescribedBy', width: 20 },
      { header: 'Notlar', key: 'notes', width: 30 }
    ],
    data: data
  },
  {
    name: 'Kişi Bilgileri',
    title: 'Kişi Bilgileri',
    columns: [
      { header: 'Alan', key: 'field', width: 20 },
      { header: 'Değer', key: 'value', width: 30 }
    ],
    data: [
      { field: 'İsim', value: familyMember.name },
      { field: 'Soyisim', value: familyMember.surname },
      { field: 'Yaş', value: familyMember.age || 'Belirtilmemiş' },
      { field: 'Cinsiyet', value: getGenderName(familyMember.gender) },
      { field: 'Kan Grubu', value: familyMember.bloodType || 'Belirtilmemiş' }
    ]
  }
];

// İlaç zamanları sayfası
if (medications.some(med => med.schedule && med.schedule.times && med.schedule.times.length > 0)) {
  const scheduleData = [];
  
  medications.forEach(med => {
    if (med.schedule && med.schedule.times && med.schedule.times.length > 0) {
      med.schedule.times.forEach(time => {
        scheduleData.push({
          name: med.name,
          time: time.time,
          dosage: `${time.dosage || 1} ${med.dosage.unit}`,
            withFood: time.withFood ? 'Evet' : 'Hayır',
            status: med.isActive ? 'Aktif' : 'Pasif'
          });
        });
      }
    });
    
    if (scheduleData.length > 0) {
      worksheets.push({
        name: 'İlaç Zamanları',
        title: 'İlaç Kullanım Zamanları',
        columns: [
          { header: 'İlaç Adı', key: 'name', width: 25 },
          { header: 'Saat', key: 'time', width: 15 },
          { header: 'Dozaj', key: 'dosage', width: 15 },
          { header: 'Yemekle', key: 'withFood', width: 15 },
          { header: 'Durum', key: 'status', width: 10 }
        ],
        data: scheduleData
      });
    }
  }
  
  // Excel dosyasını oluştur
  return await generateExcel(title, worksheets);
};

/**
 * Raporu dışa aktarır
 * @param {Object} report - Rapor bilgileri
 * @param {Object} familyMember - Aile üyesi bilgileri
 * @param {string} format - Çıktı formatı (pdf, excel)
 * @returns {Promise<string>} - Oluşturulan dosyanın yolu
 */
const exportReport = async (report, familyMember, format = 'pdf') => {
  try {
    const title = `${report.title} - ${familyMember.name} ${familyMember.surname}`;
    
    if (format === 'pdf') {
      // PDF içerik işleyicisi
      const contentRenderer = (doc, content) => {
        // Rapor başlığı ve tarih aralığı
        doc.fontSize(12).font('Helvetica-Bold')
          .text('Rapor Bilgileri:');
        
        doc.fontSize(10).font('Helvetica')
          .text(`Rapor Türü: ${getReportTypeName(content.report.type)}`)
          .text(`Tarih Aralığı: ${moment(content.report.dateRange.startDate).format('DD.MM.YYYY')} - ${moment(content.report.dateRange.endDate).format('DD.MM.YYYY')}`)
          .moveDown();
        
        // Kişi bilgileri
        doc.fontSize(12).font('Helvetica-Bold')
          .text('Kişi Bilgileri:');
        
        doc.fontSize(10).font('Helvetica')
          .text(`İsim: ${content.familyMember.name} ${content.familyMember.surname}`)
          .text(`Yaş: ${content.familyMember.age || 'Belirtilmemiş'}`)
          .text(`Cinsiyet: ${getGenderName(content.familyMember.gender)}`)
          .moveDown();
        
        // Rapor bölümleri
        if (content.report.content && content.report.content.sections) {
          content.report.content.sections.forEach((section, index) => {
            // Yeni sayfaya geçme kontrolü
            if (index > 0 && doc.y > doc.page.height - 300) {
              doc.addPage();
            }
            
            doc.fontSize(12).font('Helvetica-Bold')
              .text(section.title);
              
            if (section.text) {
              doc.fontSize(10).font('Helvetica')
                .text(section.text)
                .moveDown(0.5);
            }
            
            // Veri tablosu ekle (sadece basit veriler için)
            if (section.data && !section.chartType) {
              Object.entries(section.data).forEach(([key, value]) => {
                if (typeof value === 'object') return; // Karmaşık nesneleri es geç
                
                doc.fontSize(10).font('Helvetica')
                  .text(`${key}: ${value}`)
                  .moveDown(0.1);
              });
            }
            
            // Grafik için yer tutucu
            if (section.chartType && section.chartType !== 'none') {
              doc.fontSize(10).font('Helvetica-Oblique')
                .text(`Not: ${section.chartType} tipinde grafik burada görüntülenemiyor. Lütfen web arayüzünü kullanın.`)
                .moveDown(0.5);
            }
            
            doc.moveDown();
          });
        }
        
        // Rapor özeti
        if (content.report.content && content.report.content.summary) {
          doc.addPage();
          doc.fontSize(14).font('Helvetica-Bold')
            .text('Rapor Özeti', { align: 'center' })
            .moveDown();
          
          // Önemli bulgular
          if (content.report.content.summary.key_findings && content.report.content.summary.key_findings.length > 0) {
            doc.fontSize(12).font('Helvetica-Bold')
              .text('Önemli Bulgular:');
              
            doc.fontSize(10).font('Helvetica');
            content.report.content.summary.key_findings.forEach((finding, index) => {
              doc.text(`${index + 1}. ${finding}`);
            });
            doc.moveDown();
          }
          
          // Öneriler
          if (content.report.content.summary.recommendations && content.report.content.summary.recommendations.length > 0) {
            doc.fontSize(12).font('Helvetica-Bold')
              .text('Öneriler:');
              
            doc.fontSize(10).font('Helvetica');
            content.report.content.summary.recommendations.forEach((recommendation, index) => {
              doc.text(`${index + 1}. ${recommendation}`);
            });
            doc.moveDown();
          }
          
          // Uyarılar
          if (content.report.content.summary.flags && content.report.content.summary.flags.length > 0) {
            doc.fontSize(12).font('Helvetica-Bold')
              .text('Uyarılar:');
              
            doc.fontSize(10).font('Helvetica');
            content.report.content.summary.flags.forEach((flag, index) => {
              const flagType = flag.type === 'warning' ? 'Uyarı' : 
                              flag.type === 'critical' ? 'Kritik' : 
                              flag.type === 'improvement' ? 'İyileşme' : 'Bilgi';
                              
              doc.text(`${flagType}: ${flag.message}`);
              
              if (flag.details) {
                doc.fontSize(9).font('Helvetica-Oblique')
                  .text(`   ${flag.details}`)
                  .fontSize(10).font('Helvetica');
              }
            });
          }
        }
      };
      
      // PDF'i oluştur
      return await generatePDF(title, { report, familyMember }, contentRenderer);
    } else if (format === 'excel') {
      // Excel çalışma sayfaları
      const worksheets = [
        {
          name: 'Rapor Özeti',
          title: title,
          columns: [
            { header: 'Alan', key: 'field', width: 25 },
            { header: 'Değer', key: 'value', width: 50 }
          ],
          data: [
            { field: 'Rapor Türü', value: getReportTypeName(report.type) },
            { field: 'Başlangıç Tarihi', value: new Date(report.dateRange.startDate) },
            { field: 'Bitiş Tarihi', value: new Date(report.dateRange.endDate) },
            { field: 'Oluşturulma Tarihi', value: new Date(report.createdAt) },
            { field: 'Durum', value: getReportStatusName(report.status) }
          ]
        },
        {
          name: 'Kişi Bilgileri',
          title: 'Kişi Bilgileri',
          columns: [
            { header: 'Alan', key: 'field', width: 20 },
            { header: 'Değer', key: 'value', width: 30 }
          ],
          data: [
            { field: 'İsim', value: familyMember.name },
            { field: 'Soyisim', value: familyMember.surname },
            { field: 'Yaş', value: familyMember.age || 'Belirtilmemiş' },
            { field: 'Cinsiyet', value: getGenderName(familyMember.gender) },
            { field: 'Kan Grubu', value: familyMember.bloodType || 'Belirtilmemiş' }
          ]
        }
      ];
      
      // Rapor özetini ekle
      if (report.content && report.content.summary) {
        const summaryData = [];
        
        // Önemli bulgular
        if (report.content.summary.key_findings) {
          report.content.summary.key_findings.forEach((finding, index) => {
            summaryData.push({ field: `Bulgu ${index + 1}`, value: finding });
          });
        }
        
        // Öneriler
        if (report.content.summary.recommendations) {
          report.content.summary.recommendations.forEach((recommendation, index) => {
            summaryData.push({ field: `Öneri ${index + 1}`, value: recommendation });
          });
        }
        
        // Uyarılar
        if (report.content.summary.flags) {
          report.content.summary.flags.forEach((flag, index) => {
            const flagType = flag.type === 'warning' ? 'Uyarı' : 
                            flag.type === 'critical' ? 'Kritik' : 
                            flag.type === 'improvement' ? 'İyileşme' : 'Bilgi';
                            
            summaryData.push({ field: `${flagType} ${index + 1}`, value: flag.message });
            
            if (flag.details) {
              summaryData.push({ field: `${flagType} ${index + 1} Detay`, value: flag.details });
            }
          });
        }
        
        if (summaryData.length > 0) {
          worksheets.push({
            name: 'Bulgular ve Öneriler',
            title: 'Bulgular ve Öneriler',
            columns: [
              { header: 'Tür', key: 'field', width: 25 },
              { header: 'Açıklama', key: 'value', width: 75 }
            ],
            data: summaryData
          });
        }
      }
      
      // Raporun için veri bölümlerini ekle
      if (report.content && report.content.sections) {
        report.content.sections.forEach(section => {
          if (section.data && typeof section.data === 'object' && !Array.isArray(section.data)) {
            // Basit veri nesnelerini tablo haline getir
            const sectionData = [];
            
            Object.entries(section.data).forEach(([key, value]) => {
              if (typeof value !== 'object') {
                sectionData.push({
                  field: key,
                  value: value
                });
              }
            });
            
            if (sectionData.length > 0) {
              worksheets.push({
                name: section.title.substring(0, 31), // Excel sayfa adı sınırı
                title: section.title,
                columns: [
                  { header: 'Alan', key: 'field', width: 25 },
                  { header: 'Değer', key: 'value', width: 50 }
                ],
                data: sectionData
              });
            }
          }
        });
      }
      
      // Excel dosyasını oluştur
      return await generateExcel(title, worksheets);
    } else {
      throw new Error(`Desteklenmeyen format: ${format}`);
    }
  } catch (error) {
    logError(`Rapor dışa aktarılamadı: ${report._id}`, error);
    throw error;
  }
};

// Yardımcı fonksiyonlar
/**
 * Veri tipi adını döndürür
 * @param {string} dataType - Veri tipi
 * @returns {string} - Veri tipi adı
 */
const getDataTypeName = (dataType) => {
  switch (dataType) {
    case 'bloodSugar': return 'Kan Şekeri';
    case 'bloodPressure': return 'Tansiyon';
    case 'heartRate': return 'Nabız';
    case 'weight': return 'Kilo';
    case 'temperature': return 'Vücut Sıcaklığı';
    case 'oxygen': return 'Oksijen Satürasyonu';
    case 'stress': return 'Stres Seviyesi';
    default: return dataType;
  }
};

/**
 * Cinsiyet adını döndürür
 * @param {string} gender - Cinsiyet
 * @returns {string} - Cinsiyet adı
 */
const getGenderName = (gender) => {
  switch (gender) {
    case 'erkek': return 'Erkek';
    case 'kadın': return 'Kadın';
    case 'diğer': return 'Diğer';
    default: return gender || 'Belirtilmemiş';
  }
};

/**
 * Durum adını döndürür
 * @param {string} status - Durum
 * @returns {string} - Durum adı
 */
const getStatusName = (status) => {
  switch (status) {
    case 'normal': return 'Normal';
    case 'warning': return 'Uyarı';
    case 'critical': return 'Kritik';
    default: return status || 'Belirtilmemiş';
  }
};

/**
 * Pozisyon adını döndürür
 * @param {string} position - Pozisyon
 * @returns {string} - Pozisyon adı
 */
const getPositionName = (position) => {
  switch (position) {
    case 'sitting': return 'Oturarak';
    case 'standing': return 'Ayakta';
    case 'lying': return 'Yatarak';
    default: return position || 'Belirtilmemiş';
  }
};

/**
 * Aktivite seviyesi adını döndürür
 * @param {string} level - Aktivite seviyesi
 * @returns {string} - Aktivite seviyesi adı
 */
const getActivityLevelName = (level) => {
  switch (level) {
    case 'rest': return 'Dinlenme';
    case 'light': return 'Hafif';
    case 'moderate': return 'Orta';
    case 'intense': return 'Yoğun';
    default: return level || 'Belirtilmemiş';
  }
};

/**
 * Rapor türü adını döndürür
 * @param {string} type - Rapor türü
 * @returns {string} - Rapor türü adı
 */
const getReportTypeName = (type) => {
  switch (type) {
    case 'health_summary': return 'Sağlık Özeti';
    case 'medication_adherence': return 'İlaç Kullanım Raporu';
    case 'blood_sugar_analysis': return 'Kan Şekeri Analizi';
    case 'blood_pressure_analysis': return 'Tansiyon Analizi';
    case 'activity_summary': return 'Aktivite Özeti';
    case 'nutrition_analysis': return 'Beslenme Analizi';
    case 'custom': return 'Özel Rapor';
    default: return type || 'Belirtilmemiş';
  }
};

/**
 * Rapor durumu adını döndürür
 * @param {string} status - Rapor durumu
 * @returns {string} - Rapor durumu adı
 */
const getReportStatusName = (status) => {
  switch (status) {
    case 'draft': return 'Taslak';
    case 'generated': return 'Oluşturuldu';
    case 'sent': return 'Gönderildi';
    case 'read': return 'Okundu';
    case 'archived': return 'Arşivlendi';
    default: return status || 'Belirtilmemiş';
  }
};

/**
 * İlaç kullanım metni oluşturur
 * @param {Object} medication - İlaç bilgileri
 * @returns {string} - Kullanım metni
 */
const getFrequencyText = (medication) => {
  if (!medication.schedule) {
    return 'Belirtilmemiş';
  }
  
  let text = '';
  
  if (medication.schedule.asNeeded) {
    return 'Gerektiğinde';
  }
  
  if (medication.schedule.frequency === 'günde') {
    text = `Günde ${medication.schedule.frequencyCount || 1} kez`;
  } else if (medication.schedule.frequency === 'haftada') {
    text = `Haftada ${medication.schedule.frequencyCount || 1} kez`;
    
    if (medication.schedule.daysOfWeek && medication.schedule.daysOfWeek.length > 0) {
      const days = medication.schedule.daysOfWeek.map(day => {
        switch (day) {
          case 'pazartesi': return 'Pazartesi';
          case 'salı': return 'Salı';
          case 'çarşamba': return 'Çarşamba';
          case 'perşembe': return 'Perşembe';
          case 'cuma': return 'Cuma';
          case 'cumartesi': return 'Cumartesi';
          case 'pazar': return 'Pazar';
          default: return day;
        }
      });
      
      text += ` (${days.join(', ')})`;
    }
  } else if (medication.schedule.frequency === 'ayda') {
    text = `Ayda ${medication.schedule.frequencyCount || 1} kez`;
  }
  
  return text;
};

module.exports = {
  exportHealthDataToPDF,
  exportHealthDataToExcel,
  exportHealthDataToCSV,
  exportMedicationsToPDF,
  exportMedicationsToExcel,
  exportReport,
  generatePDF,
  generateExcel,
  generateCSV,
  cleanupTempFiles
};
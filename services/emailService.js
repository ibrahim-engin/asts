/**
 * ASTS - Aile Sağlık Takip Sistemi
 * Email Service - E-posta Servisi
 * 
 * Bu servis, uygulama üzerinden e-posta gönderimini yönetir.
 * Bildirimler, şifre sıfırlama, rapor gönderimi gibi işlemler için kullanılır.
 */

const nodemailer = require('nodemailer');
const ejs = require('ejs');
const path = require('path');
const fs = require('fs').promises;
const { logInfo, logError } = require('../middlewares/logger');
const config = require('../config');

// E-posta gönderimi için transporter
let transporter;

/**
 * E-posta servisini başlatan fonksiyon
 */
const initEmailService = () => {
  try {
    transporter = nodemailer.createTransport({
      host: config.email.host,
      port: config.email.port,
      secure: config.email.secure,
      auth: {
        user: config.email.auth.user,
        pass: config.email.auth.pass
      }
    });
    
    // Bağlantıyı test et
    transporter.verify((error) => {
      if (error) {
        logError('E-posta sunucusuna bağlanılamadı', error);
      } else {
        logInfo('E-posta servisi başarıyla başlatıldı');
      }
    });

    return transporter;
  } catch (error) {
    logError('E-posta servisi başlatılamadı', error);
    return null;
  }
};

/**
 * EJS şablonunu işleyerek HTML e-posta içeriği oluşturur
 * @param {string} template - Şablon dosya adı (.ejs uzantısı olmadan)
 * @param {Object} data - Şablona gönderilecek veriler
 * @returns {Promise<string>} - İşlenmiş HTML içeriği
 */
const renderEmailTemplate = async (template, data) => {
  try {
    const templatePath = path.join(__dirname, '../views/emails', `${template}.ejs`);
    
    // Şablon dosyasını oku
    const templateContent = await fs.readFile(templatePath, 'utf8');
    
    // Şablonu derle
    const html = ejs.render(templateContent, {
      ...data,
      baseUrl: process.env.BASE_URL || `http://localhost:${process.env.PORT || 3000}`
    });
    
    return html;
  } catch (error) {
    logError(`E-posta şablonu işlenemedi: ${template}`, error);
    throw error;
  }
};

/**
 * E-posta gönderir
 * @param {Object} options - E-posta gönderim seçenekleri
 * @param {string} options.to - Alıcı e-posta adresi
 * @param {string} options.subject - E-posta konusu
 * @param {string} options.text - Düz metin içerik (HTML yoksa kullanılır)
 * @param {string} options.html - HTML içerik
 * @param {Array} options.attachments - Ekler
 * @returns {Promise<Object>} - Gönderim sonucu
 */
const sendEmail = async (options) => {
  try {
    if (!transporter) {
      initEmailService();
    }

    // E-posta gönderim ayarları
    const mailOptions = {
      from: options.from || config.email.from,
      to: options.to,
      subject: options.subject,
      text: options.text || '',
      html: options.html || '',
      attachments: options.attachments || []
    };

    // E-postayı gönder
    const info = await transporter.sendMail(mailOptions);
    
    logInfo(`E-posta gönderildi: ${info.messageId} - ${options.to}`);
    return info;
  } catch (error) {
    logError(`E-posta gönderilemedi: ${options.to}`, error);
    throw error;
  }
};

/**
 * Şablon kullanarak e-posta gönderir
 * @param {string} to - Alıcı e-posta adresi
 * @param {string} subject - E-posta konusu
 * @param {string} template - Kullanılacak şablon adı
 * @param {Object} data - Şablona gönderilecek veriler
 * @param {Array} attachments - Ekler (opsiyonel)
 * @returns {Promise<Object>} - Gönderim sonucu
 */
const sendTemplateEmail = async (to, subject, template, data, attachments = []) => {
  try {
    // Şablonu işle
    const html = await renderEmailTemplate(template, data);
    
    // Düz metin sürümü oluştur (basit HTML to text dönüşümü)
    const text = html.replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    
    // E-postayı gönder
    return await sendEmail({
      to,
      subject,
      text,
      html,
      attachments
    });
  } catch (error) {
    logError(`Şablon e-postası gönderilemedi: ${template} - ${to}`, error);
    throw error;
  }
};

/**
 * Toplu e-posta gönderir
 * @param {Array<string>} recipients - Alıcı e-posta adresleri
 * @param {string} subject - E-posta konusu
 * @param {string} template - Kullanılacak şablon adı
 * @param {Object} data - Şablona gönderilecek veriler
 * @param {Array} attachments - Ekler (opsiyonel)
 * @returns {Promise<Array>} - Gönderim sonuçları
 */
const sendBulkTemplateEmail = async (recipients, subject, template, data, attachments = []) => {
  try {
    // Şablonu işle (bir kez işle, tüm alıcılara aynı içerik)
    const html = await renderEmailTemplate(template, data);
    
    // Düz metin sürümü oluştur
    const text = html.replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    
    // Her alıcıya gönder
    const results = await Promise.all(
      recipients.map(recipient => 
        sendEmail({
          to: recipient,
          subject,
          text,
          html,
          attachments
        })
      )
    );
    
    logInfo(`Toplu e-posta gönderildi: ${template} - ${recipients.length} alıcı`);
    return results;
  } catch (error) {
    logError(`Toplu e-posta gönderilemedi: ${template}`, error);
    throw error;
  }
};

/**
 * Şifre sıfırlama e-postası gönderir
 * @param {string} to - Alıcı e-posta adresi
 * @param {string} resetToken - Şifre sıfırlama tokeni
 * @param {string} name - Kullanıcı adı
 * @param {boolean} isAdmin - Admin kullanıcısı mı?
 * @returns {Promise<Object>} - Gönderim sonucu
 */
const sendPasswordResetEmail = async (to, resetToken, name, isAdmin = false) => {
  // Şifre sıfırlama URL'sini oluştur
  const resetUrl = isAdmin
    ? `${process.env.BASE_URL}/${process.env.ADMIN_PAGE_URL}/reset-password/${resetToken}`
    : `${process.env.BASE_URL}/auth/reset-password/${resetToken}`;
  
  return await sendTemplateEmail(
    to,
    'ASTS - Şifre Sıfırlama İsteği',
    'password-reset',
    {
      name,
      resetUrl,
      validHours: 1, // Token geçerlilik süresi
      isAdmin
    }
  );
};

/**
 * Hoş geldiniz e-postası gönderir
 * @param {string} to - Alıcı e-posta adresi
 * @param {string} name - Kullanıcı adı
 * @returns {Promise<Object>} - Gönderim sonucu
 */
const sendWelcomeEmail = async (to, name) => {
  return await sendTemplateEmail(
    to,
    'ASTS - Hoş Geldiniz',
    'welcome',
    {
      name,
      loginUrl: `${process.env.BASE_URL}/auth/login`
    }
  );
};

/**
 * İlaç hatırlatıcı e-postası gönderir
 * @param {string} to - Alıcı e-posta adresi
 * @param {Object} reminder - Hatırlatıcı bilgileri
 * @param {Object} familyMember - Aile üyesi bilgileri
 * @returns {Promise<Object>} - Gönderim sonucu
 */
const sendMedicationReminderEmail = async (to, reminder, familyMember) => {
  return await sendTemplateEmail(
    to,
    `ASTS - İlaç Hatırlatıcısı: ${reminder.title}`,
    'medication-reminder',
    {
      reminder,
      familyMember,
      appUrl: process.env.BASE_URL
    }
  );
};

/**
 * Randevu hatırlatıcı e-postası gönderir
 * @param {string} to - Alıcı e-posta adresi
 * @param {Object} reminder - Hatırlatıcı bilgileri
 * @param {Object} familyMember - Aile üyesi bilgileri
 * @returns {Promise<Object>} - Gönderim sonucu
 */
const sendAppointmentReminderEmail = async (to, reminder, familyMember) => {
  return await sendTemplateEmail(
    to,
    `ASTS - Randevu Hatırlatıcısı: ${reminder.title}`,
    'appointment-reminder',
    {
      reminder,
      familyMember,
      appUrl: process.env.BASE_URL
    }
  );
};

/**
 * Kritik sağlık değeri bildirimi gönderir
 * @param {string} to - Alıcı e-posta adresi
 * @param {Object} healthData - Sağlık verisi
 * @param {Object} familyMember - Aile üyesi bilgileri
 * @returns {Promise<Object>} - Gönderim sonucu
 */
const sendCriticalHealthDataEmail = async (to, healthData, familyMember) => {
  let subject, template, dataType;
  
  switch (healthData.dataType) {
    case 'bloodSugar':
      dataType = 'Kan Şekeri';
      subject = 'ASTS - Kritik Kan Şekeri Değeri';
      template = 'critical-blood-sugar';
      break;
    case 'bloodPressure':
      dataType = 'Tansiyon';
      subject = 'ASTS - Kritik Tansiyon Değeri';
      template = 'critical-blood-pressure';
      break;
    default:
      dataType = 'Sağlık Verisi';
      subject = 'ASTS - Kritik Sağlık Verisi';
      template = 'critical-health-data';
  }
  
  return await sendTemplateEmail(
    to,
    subject,
    template,
    {
      dataType,
      healthData,
      familyMember,
      appUrl: process.env.BASE_URL
    }
  );
};

/**
 * Rapor e-postası gönderir
 * @param {string} to - Alıcı e-posta adresi
 * @param {Object} report - Rapor bilgileri
 * @param {Object} familyMember - Aile üyesi bilgileri
 * @param {string} attachmentPath - PDF/Excel dosyası yolu
 * @returns {Promise<Object>} - Gönderim sonucu
 */
const sendReportEmail = async (to, report, familyMember, attachmentPath) => {
  // Dosya adını temizle
  const filename = path.basename(attachmentPath);
  
  return await sendTemplateEmail(
    to,
    `ASTS - ${report.title}`,
    'report',
    {
      report,
      familyMember,
      reportUrl: `${process.env.BASE_URL}/report/${familyMember._id}/${report._id}`
    },
    [
      {
        filename,
        path: attachmentPath
      }
    ]
  );
};

// E-posta servisini başlat
initEmailService();

module.exports = {
  sendEmail,
  sendTemplateEmail,
  sendBulkTemplateEmail,
  sendPasswordResetEmail,
  sendWelcomeEmail,
  sendMedicationReminderEmail,
  sendAppointmentReminderEmail,
  sendCriticalHealthDataEmail,
  sendReportEmail
};
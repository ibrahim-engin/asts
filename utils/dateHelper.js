/**
 * ASTS - Aile Sağlık Takip Sistemi
 * Date Helper - Tarih Yardımcı Fonksiyonları
 * 
 * Bu dosya, tarih işlemleri için kullanılacak yardımcı fonksiyonları içerir.
 * Tarih biçimlendirme, hesaplama ve kontrol işlemleri için kullanılır.
 */

const moment = require('moment');
const { DATE_FORMATS } = require('./constants');
moment.locale('tr');

/**
 * Bir tarihi formatlar
 * @param {Date|string} date - Tarih nesnesi veya tarih stringi
 * @param {string} format - Formatı (constants.DATE_FORMATS'tan)
 * @returns {string} - Formatlanmış tarih
 */
const formatDate = (date, format = DATE_FORMATS.SHORT) => {
  if (!date) return '';
  return moment(date).format(format);
};

/**
 * Bir saati formatlar
 * @param {Date|string} date - Tarih nesnesi veya tarih stringi
 * @returns {string} - Formatlanmış saat (HH:mm)
 */
const formatTime = (date) => {
  if (!date) return '';
  return moment(date).format(DATE_FORMATS.TIME);
};

/**
 * Bir tarihi ve saati formatlar
 * @param {Date|string} date - Tarih nesnesi veya tarih stringi
 * @returns {string} - Formatlanmış tarih ve saat
 */
const formatDateTime = (date) => {
  if (!date) return '';
  return moment(date).format(DATE_FORMATS.DATETIME);
};

/**
 * Tarih ve saati tam formatta döndürür (gün adı dahil)
 * @param {Date|string} date - Tarih nesnesi veya tarih stringi
 * @returns {string} - Tam formatlanmış tarih ve saat
 */
const formatDateTimeFull = (date) => {
  if (!date) return '';
  return moment(date).format('dddd, DD MMMM YYYY HH:mm');
};

/**
 * İstenilen formatta tarih nesnesi oluşturur
 * @param {number} year - Yıl
 * @param {number} month - Ay (0-11)
 * @param {number} day - Gün
 * @param {number} hours - Saat (opsiyonel)
 * @param {number} minutes - Dakika (opsiyonel)
 * @returns {Date} - Oluşturulan tarih
 */
const createDate = (year, month, day, hours = 0, minutes = 0) => {
  return new Date(year, month, day, hours, minutes);
};

/**
 * İki tarih arasındaki farkı hesaplar
 * @param {Date|string} start - Başlangıç tarihi
 * @param {Date|string} end - Bitiş tarihi
 * @param {string} unit - Birim ('years', 'months', 'weeks', 'days', 'hours', 'minutes', 'seconds')
 * @returns {number} - Fark
 */
const dateDiff = (start, end, unit = 'days') => {
  return moment(end).diff(moment(start), unit);
};

/**
 * Belirtilen tarihten belirtilen süre kadar sonrasını döndürür
 * @param {Date|string} date - Başlangıç tarihi
 * @param {number} amount - Miktar
 * @param {string} unit - Birim ('years', 'months', 'weeks', 'days', 'hours', 'minutes', 'seconds')
 * @returns {Date} - Sonuç tarihi
 */
const addToDate = (date, amount, unit = 'days') => {
  return moment(date).add(amount, unit).toDate();
};

/**
 * Belirtilen tarihten belirtilen süre kadar öncesini döndürür
 * @param {Date|string} date - Başlangıç tarihi
 * @param {number} amount - Miktar
 * @param {string} unit - Birim ('years', 'months', 'weeks', 'days', 'hours', 'minutes', 'seconds')
 * @returns {Date} - Sonuç tarihi
 */
const subtractFromDate = (date, amount, unit = 'days') => {
  return moment(date).subtract(amount, unit).toDate();
};

/**
 * Saat formatını kontrol eder (HH:mm)
 * @param {string} time - Kontrol edilecek saat
 * @returns {boolean} - Geçerli ise true
 */
const isValidTimeFormat = (time) => {
  return /^([01][0-9]|2[0-3]):([0-5][0-9])$/.test(time);
};

/**
 * Geçmiş bir tarih olup olmadığını kontrol eder
 * @param {Date|string} date - Kontrol edilecek tarih
 * @returns {boolean} - Geçmiş tarih ise true
 */
const isPastDate = (date) => {
  return moment(date).isBefore(moment());
};

/**
 * Gelecek bir tarih olup olmadığını kontrol eder
 * @param {Date|string} date - Kontrol edilecek tarih
 * @returns {boolean} - Gelecek tarih ise true
 */
const isFutureDate = (date) => {
  return moment(date).isAfter(moment());
};

/**
 * Bugün olup olmadığını kontrol eder
 * @param {Date|string} date - Kontrol edilecek tarih
 * @returns {boolean} - Bugün ise true
 */
const isToday = (date) => {
  return moment(date).isSame(moment(), 'day');
};

/**
 * İki tarihin aynı gün olup olmadığını kontrol eder
 * @param {Date|string} date1 - İlk tarih
 * @param {Date|string} date2 - İkinci tarih
 * @returns {boolean} - Aynı gün ise true
 */
const isSameDay = (date1, date2) => {
  return moment(date1).isSame(moment(date2), 'day');
};

/**
 * Tarihin belirli bir aralıkta olup olmadığını kontrol eder
 * @param {Date|string} date - Kontrol edilecek tarih
 * @param {Date|string} start - Başlangıç tarihi
 * @param {Date|string} end - Bitiş tarihi
 * @returns {boolean} - Aralıkta ise true
 */
const isDateInRange = (date, start, end) => {
  return moment(date).isBetween(moment(start), moment(end), 'day', '[]');
};

/**
 * Yerel saat dilimindeki günün başlangıç anını döndürür
 * @param {Date|string} date - Tarih (opsiyonel, varsayılan: bugün)
 * @returns {Date} - Günün başlangıç anı
 */
const startOfDay = (date = new Date()) => {
  return moment(date).startOf('day').toDate();
};

/**
 * Yerel saat dilimindeki günün bitiş anını döndürür
 * @param {Date|string} date - Tarih (opsiyonel, varsayılan: bugün)
 * @returns {Date} - Günün bitiş anı
 */
const endOfDay = (date = new Date()) => {
  return moment(date).endOf('day').toDate();
};

/**
 * Yerel saat dilimindeki haftanın başlangıç anını döndürür
 * @param {Date|string} date - Tarih (opsiyonel, varsayılan: bugün)
 * @returns {Date} - Haftanın başlangıç anı
 */
const startOfWeek = (date = new Date()) => {
  return moment(date).startOf('isoWeek').toDate(); // Pazartesi başlangıç
};

/**
 * Yerel saat dilimindeki haftanın bitiş anını döndürür
 * @param {Date|string} date - Tarih (opsiyonel, varsayılan: bugün)
 * @returns {Date} - Haftanın bitiş anı
 */
const endOfWeek = (date = new Date()) => {
  return moment(date).endOf('isoWeek').toDate(); // Pazar bitiş
};

/**
 * Yerel saat dilimindeki ayın başlangıç anını döndürür
 * @param {Date|string} date - Tarih (opsiyonel, varsayılan: bugün)
 * @returns {Date} - Ayın başlangıç anı
 */
const startOfMonth = (date = new Date()) => {
  return moment(date).startOf('month').toDate();
};

/**
 * Yerel saat dilimindeki ayın bitiş anını döndürür
 * @param {Date|string} date - Tarih (opsiyonel, varsayılan: bugün)
 * @returns {Date} - Ayın bitiş anı
 */
const endOfMonth = (date = new Date()) => {
  return moment(date).endOf('month').toDate();
};

/**
 * Yerel saat dilimindeki yılın başlangıç anını döndürür
 * @param {Date|string} date - Tarih (opsiyonel, varsayılan: bugün)
 * @returns {Date} - Yılın başlangıç anı
 */
const startOfYear = (date = new Date()) => {
    return moment(date).startOf('year').toDate();
  };
  
  /**
   * Yerel saat dilimindeki yılın bitiş anını döndürür
   * @param {Date|string} date - Tarih (opsiyonel, varsayılan: bugün)
   * @returns {Date} - Yılın bitiş anı
   */
  const endOfYear = (date = new Date()) => {
    return moment(date).endOf('year').toDate();
  };
  
  /**
   * Tarih aralığı oluşturur
   * @param {string} period - Dönem ('day', 'week', 'month', 'quarter', 'year')
   * @param {Date|string} endDate - Bitiş tarihi (opsiyonel, varsayılan: bugün)
   * @returns {Object} - Başlangıç ve bitiş tarihleri
   */
  const createDateRange = (period, endDate = new Date()) => {
    const end = moment(endDate).endOf('day');
    let start;
  
    switch (period) {
      case 'day':
        start = moment(end).startOf('day');
        break;
      case 'week':
        start = moment(end).subtract(6, 'days').startOf('day');
        break;
      case 'month':
        start = moment(end).subtract(29, 'days').startOf('day');
        break;
      case 'quarter':
        start = moment(end).subtract(89, 'days').startOf('day');
        break;
      case 'year':
        start = moment(end).subtract(364, 'days').startOf('day');
        break;
      default:
        start = moment(end).subtract(29, 'days').startOf('day');
    }
  
    return {
      startDate: start.toDate(),
      endDate: end.toDate()
    };
  };
  
  /**
   * Tarih aralığının gün sayısını hesaplar
   * @param {Date|string} startDate - Başlangıç tarihi
   * @param {Date|string} endDate - Bitiş tarihi
   * @returns {number} - Gün sayısı
   */
  const getDaysInRange = (startDate, endDate) => {
    return moment(endDate).diff(moment(startDate), 'days') + 1;
  };
  
  /**
   * İki tarih arasındaki ayları listeler
   * @param {Date|string} startDate - Başlangıç tarihi
   * @param {Date|string} endDate - Bitiş tarihi
   * @returns {Array<Object>} - Ay listesi (name, year, month)
   */
  const getMonthsInRange = (startDate, endDate) => {
    const months = [];
    const start = moment(startDate).startOf('month');
    const end = moment(endDate).startOf('month');
  
    while (start.isSameOrBefore(end)) {
      months.push({
        name: start.format('MMMM YYYY'),
        year: start.year(),
        month: start.month()
      });
      start.add(1, 'month');
    }
  
    return months;
  };
  
  /**
   * Tarihten yaş hesaplar
   * @param {Date|string} birthDate - Doğum tarihi
   * @returns {number} - Yaş
   */
  const calculateAge = (birthDate) => {
    return moment().diff(moment(birthDate), 'years');
  };
  
  /**
   * Hafta numarasını döndürür
   * @param {Date|string} date - Tarih (opsiyonel, varsayılan: bugün)
   * @returns {number} - Hafta numarası
   */
  const getWeekNumber = (date = new Date()) => {
    return moment(date).isoWeek();
  };
  
  /**
   * Gün adını döndürür
   * @param {Date|string} date - Tarih (opsiyonel, varsayılan: bugün)
   * @returns {string} - Gün adı
   */
  const getDayName = (date = new Date()) => {
    return moment(date).format('dddd');
  };
  
  /**
   * Ay adını döndürür
   * @param {Date|string} date - Tarih (opsiyonel, varsayılan: bugün)
   * @returns {string} - Ay adı
   */
  const getMonthName = (date = new Date()) => {
    return moment(date).format('MMMM');
  };
  
  /**
   * Tarih dizisini sıralar
   * @param {Array<Date>} dates - Tarih dizisi
   * @param {string} order - Sıralama yönü ('asc' veya 'desc')
   * @returns {Array<Date>} - Sıralanmış tarih dizisi
   */
  const sortDates = (dates, order = 'asc') => {
    return [...dates].sort((a, b) => {
      const diff = moment(a) - moment(b);
      return order === 'asc' ? diff : -diff;
    });
  };
  
  /**
   * Geçerli bir tarih/saat nesnesi mi kontrol eder
   * @param {Date|string} date - Kontrol edilecek tarih/saat
   * @returns {boolean} - Geçerli tarih/saat ise true
   */
  const isValidDate = (date) => {
    return moment(date).isValid();
  };
  
  /**
   * Bir saat farkını dakika cinsinden hesaplar
   * @param {string} startTime - Başlangıç saati (HH:mm)
   * @param {string} endTime - Bitiş saati (HH:mm)
   * @returns {number} - Dakika cinsinden fark
   */
  const getTimeDiffInMinutes = (startTime, endTime) => {
    if (!isValidTimeFormat(startTime) || !isValidTimeFormat(endTime)) {
      return 0;
    }
  
    const [startHour, startMinute] = startTime.split(':').map(Number);
    const [endHour, endMinute] = endTime.split(':').map(Number);
  
    const startTotalMinutes = startHour * 60 + startMinute;
    const endTotalMinutes = endHour * 60 + endMinute;
  
    // Gün değişimi varsa 24 saat ekle
    if (endTotalMinutes < startTotalMinutes) {
      return (endTotalMinutes + 24 * 60) - startTotalMinutes;
    }
  
    return endTotalMinutes - startTotalMinutes;
  };
  
  /**
   * Dakika sayısını saat formatına dönüştürür
   * @param {number} minutes - Dakika sayısı
   * @returns {string} - Saat formatı (HH:mm)
   */
  const minutesToTimeFormat = (minutes) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  };
  
  /**
   * İki zaman arasında saat dilimleri oluşturur
   * @param {string} startTime - Başlangıç saati (HH:mm)
   * @param {string} endTime - Bitiş saati (HH:mm)
   * @param {number} intervalMinutes - Aralık (dakika)
   * @returns {Array<string>} - Saat dilimleri
   */
  const generateTimeSlots = (startTime, endTime, intervalMinutes = 30) => {
    if (!isValidTimeFormat(startTime) || !isValidTimeFormat(endTime)) {
      return [];
    }
  
    const slots = [];
    const totalMinutes = getTimeDiffInMinutes(startTime, endTime);
    const [startHour, startMinute] = startTime.split(':').map(Number);
  
    let currentMinutes = startHour * 60 + startMinute;
    const endMinutes = currentMinutes + totalMinutes;
  
    while (currentMinutes < endMinutes) {
      slots.push(minutesToTimeFormat(currentMinutes));
      currentMinutes += intervalMinutes;
    }
  
    return slots;
  };
  
  /**
   * Geçen süreyi insanın okuyabileceği formata dönüştürür
   * @param {Date|string} date - Geçmiş tarih
   * @returns {string} - İnsan tarafından okunabilir süre
   */
  const getTimeAgo = (date) => {
    return moment(date).fromNow();
  };
  
  /**
   * Belirtilen formatta tarih dizisi oluşturur
   * @param {number} days - Gün sayısı
   * @param {Date|string} startDate - Başlangıç tarihi (opsiyonel, varsayılan: bugün)
   * @param {string} format - Tarih formatı (opsiyonel)
   * @returns {Array<string>} - Tarih dizisi
   */
  const generateDateArray = (days, startDate = new Date(), format = null) => {
    const dates = [];
    const start = moment(startDate);
  
    for (let i = 0; i < days; i++) {
      const date = moment(start).add(i, 'days');
      dates.push(format ? date.format(format) : date.toDate());
    }
  
    return dates;
  };
  
  /**
   * ISO8601 formatında tarih döndürür
   * @param {Date|string} date - Tarih
   * @returns {string} - ISO8601 formatında tarih
   */
  const toISOString = (date) => {
    return moment(date).toISOString();
  };
  
  /**
   * Unix timestamp değerini döndürür
   * @param {Date|string} date - Tarih
   * @returns {number} - Unix timestamp (saniye)
   */
  const toUnixTimestamp = (date) => {
    return moment(date).unix();
  };
  
  /**
   * Belirtilen tarihin ayın kaçıncı günü olduğunu döndürür
   * @param {Date|string} date - Tarih
   * @returns {number} - Ayın günü
   */
  const getDayOfMonth = (date) => {
    return moment(date).date();
  };
  
  /**
   * Belirtilen tarihin haftanın kaçıncı günü olduğunu döndürür
   * @param {Date|string} date - Tarih
   * @returns {number} - Haftanın günü (0-6, 0: Pazar)
   */
  const getDayOfWeek = (date) => {
    return moment(date).day();
  };
  
  module.exports = {
    formatDate,
    formatTime,
    formatDateTime,
    formatDateTimeFull,
    createDate,
    dateDiff,
    addToDate,
    subtractFromDate,
    isValidTimeFormat,
    isPastDate,
    isFutureDate,
    isToday,
    isSameDay,
    isDateInRange,
    startOfDay,
    endOfDay,
    startOfWeek,
    endOfWeek,
    startOfMonth,
    endOfMonth,
    startOfYear,
    endOfYear,
    createDateRange,
    getDaysInRange,
    getMonthsInRange,
    calculateAge,
    getWeekNumber,
    getDayName,
    getMonthName,
    sortDates,
    isValidDate,
    getTimeDiffInMinutes,
    minutesToTimeFormat,
    generateTimeSlots,
    getTimeAgo,
    generateDateArray,
    toISOString,
    toUnixTimestamp,
    getDayOfMonth,
    getDayOfWeek
  };
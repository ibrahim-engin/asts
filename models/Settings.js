const mongoose = require('mongoose');

const SettingsSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    unique: true
  },
  // Genel Kullanıcı Ayarları
  general: {
    language: {
      type: String,
      enum: ['tr', 'en'],
      default: 'tr'
    },
    dateFormat: {
      type: String,
      enum: ['DD.MM.YYYY', 'MM.DD.YYYY', 'YYYY.MM.DD'],
      default: 'DD.MM.YYYY'
    },
    timeFormat: {
      type: String,
      enum: ['24', '12'],
      default: '24'
    },
    theme: {
      type: String,
      enum: ['light', 'dark', 'system'],
      default: 'system'
    },
    timezone: {
      type: String,
      default: 'Europe/Istanbul'
    }
  },
  
  // Bildirim Ayarları
  notifications: {
    enabled: {
      type: Boolean,
      default: true
    },
    pushNotifications: {
      enabled: {
        type: Boolean,
        default: true
      },
      quiet_hours: {
        enabled: {
          type: Boolean,
          default: false
        },
        start: {
          type: String,
          default: '22:00',
          match: [/^([01]\d|2[0-3]):([0-5]\d)$/, 'Geçerli bir saat formatı giriniz (HH:MM)']
        },
        end: {
          type: String,
          default: '08:00',
          match: [/^([01]\d|2[0-3]):([0-5]\d)$/, 'Geçerli bir saat formatı giriniz (HH:MM)']
        }
      }
    },
    email: {
      enabled: {
        type: Boolean,
        default: false
      },
      address: {
        type: String,
        trim: true,
        lowercase: true,
        match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Geçerli bir e-posta adresi giriniz']
      },
      frequency: {
        type: String,
        enum: ['instant', 'daily', 'weekly'],
        default: 'daily'
      },
      time: {
        type: String,
        default: '09:00',
        match: [/^([01]\d|2[0-3]):([0-5]\d)$/, 'Geçerli bir saat formatı giriniz (HH:MM)']
      }
    },
    sms: {
      enabled: {
        type: Boolean,
        default: false
      },
      phoneNumber: {
        type: String,
        match: [/^[0-9]{10}$/, 'Geçerli bir telefon numarası giriniz (10 haneli, başında 0 olmadan)']
      }
    },
    types: {
      medication_reminder: {
        type: Boolean,
        default: true
      },
      measurement_reminder: {
        type: Boolean,
        default: true
      },
      appointment_reminder: {
        type: Boolean,
        default: true
      },
      critical_values: {
        type: Boolean,
        default: true
      },
      reports: {
        type: Boolean,
        default: true
      },
      system_updates: {
        type: Boolean,
        default: true
      }
    }
  },
  
  // Ölçüm ve Birim Ayarları
  measurements: {
    weight: {
      unit: {
        type: String,
        enum: ['kg', 'lb'],
        default: 'kg'
      },
      target: {
        type: Number
      }
    },
    height: {
      unit: {
        type: String,
        enum: ['cm', 'inch'],
        default: 'cm'
      }
    },
    bloodSugar: {
      unit: {
        type: String,
        enum: ['mg/dL', 'mmol/L'],
        default: 'mg/dL'
      },
      targetRanges: {
        fasting: {
          min: {
            type: Number,
            default: 70
          },
          max: {
            type: Number,
            default: 100
          }
        },
        postprandial: {
          min: {
            type: Number,
            default: 70
          },
          max: {
            type: Number,
            default: 140
          }
        }
      }
    },
    bloodPressure: {
      unit: {
        type: String,
        enum: ['mmHg'],
        default: 'mmHg'
      },
      targetRanges: {
        systolic: {
          min: {
            type: Number,
            default: 90
          },
          max: {
            type: Number,
            default: 130
          }
        },
        diastolic: {
          min: {
            type: Number,
            default: 60
          },
          max: {
            type: Number,
            default: 85
          }
        }
      }
    },
    temperature: {
      unit: {
        type: String,
        enum: ['C', 'F'],
        default: 'C'
      }
    },
    distance: {
      unit: {
        type: String,
        enum: ['km', 'mile'],
        default: 'km'
      }
    }
  },
  
  // Rapor Ayarları
  reports: {
    defaultFormat: {
      type: String,
      enum: ['pdf', 'excel', 'html', 'text'],
      default: 'pdf'
    },
    defaultPeriod: {
      type: String,
      enum: ['week', 'month', 'quarter', 'year'],
      default: 'month'
    },
    autoGenerate: {
      enabled: {
        type: Boolean,
        default: false
      },
      frequency: {
        type: String,
        enum: ['weekly', 'monthly', 'quarterly'],
        default: 'monthly'
      },
      types: {
        health_summary: {
          type: Boolean,
          default: true
        },
        medication_adherence: {
          type: Boolean,
          default: true
        },
        blood_sugar_analysis: {
          type: Boolean,
          default: true
        },
        blood_pressure_analysis: {
          type: Boolean,
          default: true
        },
        activity_summary: {
          type: Boolean,
          default: false
        },
        nutrition_analysis: {
          type: Boolean,
          default: false
        }
      }
    },
    sharing: {
      autoShare: {
        type: Boolean,
        default: false
      },
      recipients: [{
        email: String,
        name: String,
        role: {
          type: String,
          enum: ['doctor', 'family_member', 'caregiver', 'other'],
          default: 'doctor'
        }
      }]
    }
  },
  
  // Veri Gizlilik Ayarları
  privacy: {
    dataSharing: {
      anonymous_statistics: {
        type: Boolean,
        default: true
      },
      research: {
        type: Boolean,
        default: false
      },
      third_party: {
        type: Boolean,
        default: false
      }
    },
    export: {
      exportAllowed: {
        type: Boolean,
        default: true
      },
      exportFormats: {
        pdf: {
          type: Boolean,
          default: true
        },
        excel: {
          type: Boolean,
          default: true
        },
        csv: {
          type: Boolean,
          default: true
        },
        json: {
          type: Boolean,
          default: false
        }
      }
    },
    dataRetention: {
      automaticDeletion: {
        type: Boolean,
        default: false
      },
      retentionPeriod: {
        type: Number, // Ay cinsinden
        default: 60 // 5 yıl
      }
    }
  },
  
  // Yedekleme Ayarları
  backup: {
    autoBackup: {
      type: Boolean,
      default: true
    },
    frequency: {
      type: String,
      enum: ['daily', 'weekly', 'monthly'],
      default: 'weekly'
    },
    storage: {
      local: {
        type: Boolean,
        default: true
      },
      cloud: {
        type: Boolean,
        default: false
      },
      cloudProvider: {
        type: String,
        enum: ['google_drive', 'dropbox', 'onedrive', 'other'],
        default: 'google_drive'
      }
    },
    retentionCount: {
      type: Number,
      default: 5 // Son 5 yedeği tut
    }
  },
  
  // Entegrasyon Ayarları
  integrations: {
    wearables: {
      enabled: {
        type: Boolean,
        default: false
      },
      devices: [{
        type: {
          type: String,
          enum: ['smartwatch', 'fitness_tracker', 'glucose_monitor', 'blood_pressure_monitor', 'other'],
          required: true
        },
        brand: String,
        model: String,
        connectionType: {
          type: String,
          enum: ['bluetooth', 'wifi', 'usb', 'manual', 'other'],
          default: 'bluetooth'
        },
        lastSync: Date,
        syncFrequency: {
          type: String,
          enum: ['realtime', 'hourly', 'daily', 'manual'],
          default: 'daily'
        }
      }]
    },
    healthApps: {
      enabled: {
        type: Boolean,
        default: false
      },
      apps: [{
        name: String,
        platform: {
          type: String,
          enum: ['android', 'ios', 'web', 'other'],
          required: true
        },
        dataTypes: [{
          type: String,
          enum: ['activity', 'sleep', 'nutrition', 'weight', 'blood_sugar', 'blood_pressure', 'heart_rate', 'other']
        }],
        lastSync: Date,
        syncFrequency: {
          type: String,
          enum: ['realtime', 'hourly', 'daily', 'manual'],
          default: 'daily'
        }
      }]
    },
    healthcareProviders: {
      enabled: {
        type: Boolean,
        default: false
      },
      providers: [{
        name: String,
        type: {
          type: String,
          enum: ['hospital', 'clinic', 'doctor', 'laboratory', 'other'],
          required: true
        },
        dataAccess: {
          type: String,
          enum: ['read_only', 'write_only', 'read_write', 'none'],
          default: 'read_only'
        },
        dataTypes: [{
          type: String,
          enum: ['medication', 'lab_results', 'diagnoses', 'appointments', 'all', 'other']
        }],
        lastSync: Date
      }]
    }
  },
  
  // Uygulama Davranış Ayarları
  behavior: {
    startPage: {
      type: String,
      enum: ['dashboard', 'medications', 'measurements', 'reports', 'profile'],
      default: 'dashboard'
    },
    reminderBehavior: {
      advanceNotice: {
        type: Number, // Dakika cinsinden
        default: 15
      },
      snoozeTime: {
        type: Number, // Dakika cinsinden
        default: 5
      },
      maxSnoozes: {
        type: Number,
        default: 3
      }
    },
    dataEntry: {
      defaultBloodSugarType: {
        type: String,
        enum: ['fasting', 'postprandial', 'random'],
        default: 'random'
      },
      bloodPressurePosition: {
        type: String,
        enum: ['sitting', 'standing', 'lying'],
        default: 'sitting'
      },
      autoCalculateBMI: {
        type: Boolean,
        default: true
      }
    }
  }
}, {
  timestamps: true
});

// Sistemin varsayılan ayarlarını döndüren statik metod
SettingsSchema.statics.getDefaults = function() {
  const defaults = new this();
  return defaults.toObject();
};

// Kullanıcıya özel ayarları alır, yoksa varsayılan ayarları döndürür
SettingsSchema.statics.getUserSettings = async function(userId) {
  if (!userId) {
    return this.getDefaults();
  }
  
  let settings = await this.findOne({ userId });
  
  if (!settings) {
    settings = new this({ userId });
    await settings.save();
  }
  
  return settings;
};

// Ayar değerini biçimlendirir (Örn: Tarih formatı)
SettingsSchema.methods.getFormattedValue = function(path) {
  const value = this.get(path);
  
  // Birim formatları
  const unitFormatMap = {
    'measurements.weight.unit': {
      'kg': 'Kilogram (kg)',
      'lb': 'Pound (lb)'
    },
    'measurements.height.unit': {
      'cm': 'Santimetre (cm)',
      'inch': 'İnç (inch)'
    },
    'measurements.bloodSugar.unit': {
      'mg/dL': 'mg/dL',
      'mmol/L': 'mmol/L'
    },
    'measurements.temperature.unit': {
      'C': 'Santigrat (°C)',
      'F': 'Fahrenayt (°F)'
    }
  };
  
  // Dil formatları
  const languageFormatMap = {
    'general.language': {
      'tr': 'Türkçe',
      'en': 'English'
    }
  };
  
  // Tema formatları
  const themeFormatMap = {
    'general.theme': {
      'light': 'Açık Tema',
      'dark': 'Koyu Tema',
      'system': 'Sistem Ayarlarına Göre'
    }
  };
  
  // Özel formatlar
  if (unitFormatMap[path] && unitFormatMap[path][value]) {
    return unitFormatMap[path][value];
  }
  
  if (languageFormatMap[path] && languageFormatMap[path][value]) {
    return languageFormatMap[path][value];
  }
  
  if (themeFormatMap[path] && themeFormatMap[path][value]) {
    return themeFormatMap[path][value];
  }
  
  return value;
};

// Ayarları güncelleyen metod - Var olan yapıyı korur
SettingsSchema.methods.updateSettings = function(newSettings) {
  const updateObject = {};
  
  // Geçerli ayar yollarını düz bir nesneye dönüştür
  const flattenObject = (obj, prefix = '') => {
    return Object.keys(obj).reduce((acc, key) => {
      const path = prefix ? `${prefix}.${key}` : key;
      
      if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
        Object.assign(acc, flattenObject(obj[key], path));
      } else {
        acc[path] = obj[key];
      }
      
      return acc;
    }, {});
  };
  
  const flatSettings = flattenObject(newSettings);
  
  // Her bir ayarı güncelle
  for (const [path, value] of Object.entries(flatSettings)) {
    if (this.schema.pathType(path) !== 'undefined') {
      updateObject[path] = value;
    }
  }
  
  // Ayarları güncelle
  this.set(updateObject);
  return this;
};

// Performans için indeksler
SettingsSchema.index({ userId: 1 }, { unique: true });

module.exports = mongoose.model('Settings', SettingsSchema);
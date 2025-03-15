# ASTS - Aile Sağlık Takip Sistemi

Aile Sağlık Takip Sistemi (ASTS), ailelerin sağlık verilerini takip edebilecekleri, farklı rollere sahip kullanıcıların olduğu, MongoDB tabanlı bir Node.js web uygulamasıdır.

## Proje Özeti

- **Teknoloji**: Node.js, Express, MongoDB, EJS, Bootstrap
- **Kimlik Doğrulama**: JWT (JSON Web Token)
- **Mimari**: MVC (Model-View-Controller)
- **Kullanıcı Rolleri**: Admin ve normal kullanıcılar
- **Arayüz**: Tamamen mobil uyumlu Bootstrap tabanlı tasarım

## Özellikler

- 📊 Sağlık verilerinin grafiksel görselleştirmesi
- 💊 İlaç takibi ve hatırlatıcılar
- 🏥 Tıbbi geçmiş kaydı ve analizi
- 🍎 Beslenme ve fiziksel aktivite takibi
- 📱 Mobil uyumlu tasarım
- 📑 Kapsamlı raporlama sistemi
- 👨‍👩‍👧‍👦 Çoklu aile üyesi yönetimi
- 🔒 Gelişmiş güvenlik önlemleri

## Kurulum

1. Projeyi klonlayın:
   ```bash
   git clone https://github.com/ibrahim-engin/asts.git
   cd asts
   ```

2. Bağımlılıkları yükleyin:
   ```bash
   npm install
   ```

3. `.env` dosyasını yapılandırın:
   ```
   PORT=80
   MONGO_URI=mongodb://localhost:27017/asts
   JWT_SECRET=your_jwt_secret
   ADMIN_PAGE_URL=your_admin_url
   ```

4. Veritabanını başlatın:
   ```bash
   npm run seed
   ```

5. Uygulamayı başlatın:
   ```bash
   npm run start
   ```

## Teknoloji Yığını

- **Backend**: Node.js, Express
- **Veritabanı**: MongoDB, Mongoose
- **Frontend**: EJS, Bootstrap, jQuery, Chart.js
- **Kimlik Doğrulama**: JWT, bcrypt
- **İşlevsellik**: Socket.io (bildirimler için)

## Geliştirme

Geliştirme modunda başlatmak için:

```bash
npm run dev
```

## Proje Yapısı

```
ASTS/
│
├── controllers/
│   ├── adminController.js            # Admin paneli yönetimi
│   ├── authController.js             # Kimlik doğrulama işlemleri
│   ├── dashboardController.js        # Panel verilerinin kontrolü
│   ├── healthDataController.js       # Sağlık verilerinin yönetimi
│   ├── medicationController.js       # İlaç takibi yönetimi
│   ├── medicalHistoryController.js   # Tıbbi geçmiş yönetimi
│   ├── nutritionController.js        # Beslenme verilerinin yönetimi
│   ├── physicalActivityController.js # Fiziksel aktivite verilerinin yönetimi
│   ├── reminderController.js         # Hatırlatıcıların yönetimi
│   ├── reportController.js           # Raporlama işlemleri
│   └── userController.js             # Kullanıcı yönetimi
│
├── middlewares/
│   ├── auth.js                       # Kimlik doğrulama middleware
│   ├── errorHandler.js               # Hata yakalama middleware
│   ├── isAdmin.js                    # Admin kontrolü middleware
│   ├── isAuth.js                     # Giriş kontrolü middleware
│   ├── logger.js                     # Loglama middleware
│   ├── multer.js                     # Dosya yükleme middleware
│   └── validators.js                 # Veri doğrulama middleware
│
├── models/
│   ├── Admin.js                      # Admin kullanıcı modeli
│   ├── FamilyMember.js               # Aile üyesi modeli
│   ├── HealthData.js                 # Sağlık verisi modeli
│   ├── MedicalHistory.js             # Tıbbi geçmiş modeli
│   ├── Medication.js                 # İlaç modeli
│   ├── NutritionData.js              # Beslenme verisi modeli
│   ├── PhysicalActivity.js           # Fiziksel aktivite modeli
│   ├── Reminder.js                   # Hatırlatıcı modeli
│   ├── Report.js                     # Rapor modeli
│   ├── Settings.js                   # Sistem ayarları modeli
│   └── User.js                       # Kullanıcı modeli
│
├── public/
│   ├── css/
│   │   ├── admin.css                 # Admin paneli stil dosyası
│   │   ├── bootstrap.min.css         # Bootstrap stil dosyası
│   │   ├── chart.min.css             # Grafik stil dosyası
│   │   └── main.css                  # Ana stil dosyası
│   ├── img/
│   │   ├── icons/                    # Sistem ikonları
│   │   ├── logos/                    # Logo görselleri
│   │   └── placeholders/             # Yer tutucu görseller
│   ├── js/
│   │   ├── admin.js                  # Admin paneli script
│   │   ├── bootstrap.min.js          # Bootstrap script
│   │   ├── chart.min.js              # Grafik script
│   │   ├── dashboard.js              # Panel script
│   │   ├── healthdata.js             # Sağlık verisi script
│   │   ├── jquery.min.js             # jQuery script
│   │   ├── main.js                   # Ana script
│   │   ├── reminders.js              # Hatırlatıcılar script
│   │   └── reports.js                # Raporlar script
│   └── favicon.ico                   # Site favicon
│
├── routes/
│   ├── adminRoutes.js                # Admin panel rotaları
│   ├── apiRoutes.js                  # API rotaları (mobil için)
│   ├── authRoutes.js                 # Kimlik doğrulama rotaları
│   ├── dashboardRoutes.js            # Panel rotaları
│   ├── healthDataRoutes.js           # Sağlık verisi rotaları
│   ├── medicationRoutes.js           # İlaç takibi rotaları
│   ├── nutritionRoutes.js            # Beslenme verisi rotaları
│   ├── physicalActivityRoutes.js     # Fiziksel aktivite rotaları
│   ├── reminderRoutes.js             # Hatırlatıcı rotaları
│   ├── reportRoutes.js               # Rapor rotaları
│   └── userRoutes.js                 # Kullanıcı rotaları
│
├── services/
│   ├── cacheService.js               # Önbellek servisi
│   ├── emailService.js               # E-posta servisi
│   ├── exportService.js              # Veri dışa aktarma servisi
│   ├── graphService.js               # Grafik oluşturma servisi
│   ├── notificationService.js        # Bildirim servisi
│   ├── reportService.js              # Rapor oluşturma servisi
│   └── storageService.js             # Dosya depolama servisi
│
├── utils/
│   ├── constants.js                  # Sabit değerler
│   ├── dateHelper.js                 # Tarih yardımcı fonksiyonları
│   ├── dbConnection.js               # Veritabanı bağlantı yönetimi
│   ├── healthCalculator.js           # Sağlık hesaplamaları
│   ├── logger.js                     # Loglama yardımcıları
│   └── validators.js                 # Doğrulama yardımcıları
│
├── views/
│   ├── admin/
│   │   ├── dashboard.ejs             # Admin ana panel
│   │   ├── family-members.ejs        # Aile üyeleri yönetimi
│   │   ├── login.ejs                 # Admin girişi
│   │   ├── medications.ejs           # İlaç verileri yönetimi
│   │   ├── reports.ejs               # Raporlar sayfası
│   │   ├── settings.ejs              # Sistem ayarları
│   │   └── users.ejs                 # Kullanıcı yönetimi
│   │
│   ├── front/
│   │   ├── health-data.ejs           # Sağlık verileri sayfası
│   │   ├── login.ejs                 # Kullanıcı girişi
│   │   ├── medications.ejs           # İlaç takibi sayfası
│   │   ├── medical-history.ejs       # Tıbbi geçmiş sayfası
│   │   ├── nutrition.ejs             # Beslenme sayfası
│   │   ├── physical-activity.ejs     # Fiziksel aktivite sayfası
│   │   ├── profile.ejs               # Profil sayfası
│   │   ├── register.ejs              # Kayıt sayfası
│   │   ├── reminders.ejs             # Hatırlatıcılar sayfası
│   │   └── reports.ejs               # Raporlar sayfası
│   │
│   ├── partials/
│   │   ├── admin/
│   │   │   ├── footer.ejs            # Admin panel footer
│   │   │   ├── header.ejs            # Admin panel header
│   │   │   └── sidebar.ejs           # Admin panel sidebar
│   │   │
│   │   ├── alerts.ejs                # Uyarı bileşenleri
│   │   ├── charts.ejs                # Grafik bileşenleri
│   │   ├── footer.ejs                # Ana sayfa footer
│   │   ├── header.ejs                # Ana sayfa header
│   │   ├── modals.ejs                # Modal bileşenleri
│   │   └── navbar.ejs                # Ana sayfa navbar
│   │
│   ├── 404.ejs                       # 404 hata sayfası
│   ├── 500.ejs                       # 500 hata sayfası
│   ├── error.ejs                     # Genel hata sayfası
│   ├── home.ejs                      # Ana sayfa
│   └── index.ejs                     # Karşılama sayfası
│
├── .env                              # Çevre değişkenleri
├── .gitignore                        # Git tarafından yok sayılacak dosyalar
├── index.js                          # Ana uygulama dosyası
├── config.js                         # Yapılandırma ayarları
├── package.json                      # NPM paket yapılandırması
├── package-lock.json                 # NPM paket kilitleme dosyası
└── README.md                         # Proje açıklaması
```

## Lisans

MIT

## İletişim

Projeyle ilgili sorularınız veya önerileriniz varsa, lütfen [burada](https://github.com/ibrahim-engin/asts/issues) bir konu açın.

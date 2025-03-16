# ASTS - Aile Sağlık Takip Sistemi: Yol Haritası

Bu belge, Aile Sağlık Takip Sistemi (ASTS) projesinin gelişim sürecini takip etmek için oluşturulmuştur. Tamamlanan, devam eden ve planlanmış görevleri içerir.

## 🟢 Tamamlanan Görevler

## ⚫ Back-End (Sistem ve Ana Altyapı Dosyaları)

### Proje Yapısı ve Temel Dosyalar
- [x] Proje mimarisi ve dosya yapısı tasarımı
- [x] README.md dosyası oluşturma
- [x] .env dosyası yapılandırma
- [x] index.js (ana uygulama dosyası) oluşturma
- [x] config.js (yapılandırma ayarları) oluşturma
- [x] package.json dosyası oluşturma
- [x] .gitignore dosyası oluşturma
- [x] ROADMAP.md oluşturma

### Veritabanı Modelleri
- [x] User.js - Kullanıcı modeli
- [x] Admin.js - Admin kullanıcı modeli
- [x] FamilyMember.js - Aile üyesi modeli
- [x] HealthData.js - Sağlık verisi modeli
- [X] MedicalHistory.js - Tıbbi geçmiş modeli
- [X] Medication.js - İlaç modeli
- [X] NutritionData.js - Beslenme verisi modeli
- [x] PhysicalActivity.js - Fiziksel aktivite modeli
- [x] Reminder.js - Hatırlatıcı modeli
- [x] Report.js - Rapor modeli
- [x] Settings.js - Sistem ayarları modeli

### Middleware Dosyaları
- [x] auth.js - Kimlik doğrulama middleware
- [X] errorHandler.js - Hata yakalama middleware
- [X] isAdmin.js - Admin kontrolü middleware
- [X] isAuth.js - Giriş kontrolü middleware
- [X] logger.js - Loglama middleware
- [x] multer.js - Dosya yükleme middleware
- [x] validators.js - Veri doğrulama middleware

### Controller Dosyaları
- [x] adminController.js - Admin paneli yönetimi
- [x] authController.js - Kimlik doğrulama işlemleri
- [x] dashboardController.js - Panel verilerinin kontrolü
- [x] healthDataController.js - Sağlık verilerinin yönetimi
- [x] medicationController.js - İlaç takibi yönetimi
- [x] medicalHistoryController.js - Tıbbi geçmiş yönetimi
- [x] nutritionController.js - Beslenme verilerinin yönetimi
- [x] physicalActivityController.js - Fiziksel aktivite verilerinin yönetimi
- [x] reminderController.js - Hatırlatıcıların yönetimi
- [x] reportController.js - Raporlama işlemleri
- [x] userController.js - Kullanıcı yönetimi

### Route Dosyaları
- [x] adminRoutes.js - Admin panel rotaları
- [x] apiRoutes.js - API rotaları (mobil için)
- [x] authRoutes.js - Kimlik doğrulama rotaları
- [x] dashboardRoutes.js - Panel rotaları
- [x] healthDataRoutes.js - Sağlık verisi rotaları
- [x] medicationRoutes.js - İlaç takibi rotaları
- [x] nutritionRoutes.js - Beslenme verisi rotaları
- [x] physicalActivityRoutes.js - Fiziksel aktivite rotaları
- [x] reminderRoutes.js - Hatırlatıcı rotaları
- [x] reportRoutes.js - Rapor rotaları
- [x] userRoutes.js - Kullanıcı rotaları

### Servis Dosyaları
- [x] cacheService.js - Önbellek servisi
- [x] emailService.js - E-posta servisi
- [x] exportService.js - Veri dışa aktarma servisi
- [x] graphService.js - Grafik oluşturma servisi
- [x] notificationService.js - Bildirim servisi
- [x] reportService.js - Rapor oluşturma servisi
- [x] storageService.js - Dosya depolama servisi

### Utility Dosyaları
- [x] constants.js - Sabit değerler
- [x] dateHelper.js - Tarih yardımcı fonksiyonları
- [x] dbConnection.js - Veritabanı bağlantı yönetimi
- [x] healthCalculator.js - Sağlık hesaplamaları
- [x] logger.js - Loglama yardımcıları
- [x] validators.js - Doğrulama yardımcıları
- [x] dbSeeder.js - Veritabanı başlangıç verileri

## 🔴 Frontend (EJS Şablonları)

### Admin Panel Görünümleri
- [x] admin/dashboard.ejs - Admin ana panel
- [x] admin/login.ejs - Admin girişi

### Kullanıcı Görünümleri
- [x] front/login.ejs - Kullanıcı girişi
- [x] front/register.ejs - Kayıt sayfası

### Kısmi Görünümler (Partials)
- [x] partials/admin/footer.ejs - Admin panel footer
- [x] partials/admin/header.ejs - Admin panel header
- [x] partials/admin/sidebar.ejs - Admin panel sidebar
- [x] partials/alerts.ejs - Uyarı bileşenleri
- [x] partials/footer.ejs - Ana sayfa footer
- [x] partials/header.ejs - Ana sayfa header
- [x] partials/navbar.ejs - Ana sayfa navbar

### Diğer Görünümler
- [x] home.ejs - Ana sayfa
- [x] index.ejs - Karşılama sayfası

## 🔵 Frontend Varlıkları

### CSS Dosyaları
- [x] public/css/admin.css - Admin paneli stil dosyası
- [x] public/css/all.min.css - Tamamlayıcı stil dosyası
- [x] public/css/bootstrap.min.css - Bootstrap stil dosyası
- [x] public/css/main.css - Ana stil dosyası

### JavaScript Dosyaları
- [x] public/js/admin.js - Admin paneli script
- [x] public/js/bootstrap.bundle.min.js - Bootstrap Bundle script
- [x] public/js/jquery-3.7.1.min.js - jQuery script
- [x] public/js/main.js - Ana script

### Resim Dosyaları
- [x] public/favicon.ico - Site favicon

## 🟡 Devam Eden Görevler

## 🔴 Frontend (EJS Şablonları)

### Admin Panel Görünümleri
- [ ] admin/family-members.ejs - Aile üyeleri yönetimi
- [ ] admin/medications.ejs - İlaç verileri yönetimi
- [ ] admin/reports.ejs - Raporlar sayfası
- [ ] admin/settings.ejs - Sistem ayarları
- [ ] admin/users.ejs - Kullanıcı yönetimi

### Kullanıcı Görünümleri
- [ ] front/health-data.ejs - Sağlık verileri sayfası
- [ ] front/medications.ejs - İlaç takibi sayfası
- [ ] front/medical-history.ejs - Tıbbi geçmiş sayfası
- [ ] front/nutrition.ejs - Beslenme sayfası
- [ ] front/physical-activity.ejs - Fiziksel aktivite sayfası
- [ ] front/profile.ejs - Profil sayfası
- [ ] front/reminders.ejs - Hatırlatıcılar sayfası
- [ ] front/reports.ejs - Raporlar sayfası

### Kısmi Görünümler (Partials)
- [ ] partials/charts.ejs - Grafik bileşenleri
- [ ] partials/modals.ejs - Modal bileşenleri

### Diğer Görünümler
- [ ] 404.ejs - 404 hata sayfası
- [ ] 500.ejs - 500 hata sayfası
- [ ] error.ejs - Genel hata sayfası

## 🔵 Frontend Varlıkları

### CSS Dosyaları
- [ ] public/css/chart.min.css - Grafik stil dosyası

### JavaScript Dosyaları
- [ ] public/js/chart.min.js - Grafik script
- [ ] public/js/dashboard.js - Panel script
- [ ] public/js/healthdata.js - Sağlık verisi script
- [ ] public/js/jquery.min.js - jQuery script
- [ ] public/js/reminders.js - Hatırlatıcılar script
- [ ] public/js/reports.js - Raporlar script

### Resim Dosyaları
- [ ] public/img/icons/ - Sistem ikonları
- [ ] public/img/logos/ - Logo görselleri
- [ ] public/img/placeholders/ - Yer tutucu görseller

## 📋 Test ve Dağıtım

- [ ] Jest ile birim testleri yazma
- [ ] API testleri yazma
- [ ] Entegrasyon testleri yazma
- [ ] Uygulama dağıtım ayarlarını yapılandırma
- [ ] İlk sürümü dağıtma

## 💡 Gelecek Özellikler

- [ ] Mobil uygulama geliştirme
- [ ] Giyilebilir cihaz entegrasyonu
- [ ] Çoklu dil desteği
- [ ] PWA (Progressive Web App) desteği
- [ ] Doktor portal entegrasyonu
- [ ] Paylaşılabilir sağlık raporu QR kodları

## 🔄 Güncelleme Geçmişi

- **15 Mart 2025** - Proje başlatıldı.
- **15 Mart 2025** - Temel mimari ve dosyalar oluşturuldu.
- **15 Mart 2025** - Veritabanı Modelleri ve dosyalar oluşturuldu.
- **15 Mart 2025** - Middleware Dosyaları oluşturuldu.
- **16 Mart 2025** - Controller Dosyaları oluşturuldu.
- **16 Mart 2025** - Routes Dosyaları oluşturuldu.
- **16 Mart 2025** - Servis Dosyaları oluşturuldu.
- **16 Mart 2025** - Utilty Dosyaları oluşturuldu.
- **17 Mart 2025** - Front-End Dosyalarının Bir Kısmı oluşturuldu.
- **17 Mart 2025** - Programın localhost ta çalışması sağlandı.

---

*Bu belge, proje ilerledikçe güncellenecektir.*
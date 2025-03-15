// ASTS - Aile Sağlık Takip Sistemi Ana Uygulama Dosyası
const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const morgan = require('morgan');
const colors = require('colors');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const flash = require('connect-flash');
const methodOverride = require('method-override');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');

// Yapılandırma dosyalarını yükle
dotenv.config();
const config = require('./config');

// Express uygulamasını başlat
const app = express();

// Veritabanı bağlantısını kurma
mongoose
  .connect(process.env.MONGODB_URI, config.mongooseOptions)
  .then(() => {
    console.log(`MongoDB Bağlantısı Başarılı: ${mongoose.connection.host}`.cyan.underline.bold);
  })
  .catch((err) => {
    console.error(`Veritabanı Bağlantı Hatası: ${err.message}`.red.bold);
    process.exit(1);
  });

// Güvenlik ayarları
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      ...helmet.contentSecurityPolicy.getDefaultDirectives(),
      "script-src": ["'self'", "'unsafe-inline'", "cdn.jsdelivr.net", "code.jquery.com"],
      "img-src": ["'self'", "data:"],
    },
  },
}));
app.use(cors());

// Body parser middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Cookie parser middleware
app.use(cookieParser(process.env.COOKIE_SECRET));

// Oturum yapılandırması
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: process.env.MONGODB_URI,
    collectionName: 'sessions'
  }),
  cookie: {
    maxAge: 1000 * 60 * 60 * 24, // 1 gün
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production'
  }
}));

// Flash mesajları
app.use(flash());

// Sıkıştırma middleware'i
app.use(compression());

// Method override for PUT and DELETE
app.use(methodOverride('_method'));

// Morgan logger
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Statik dosyalar
app.use(express.static(path.join(__dirname, 'public')));

// View engine ayarları
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Global değişkenler
app.use((req, res, next) => {
  res.locals.success_msg = req.flash('success_msg');
  res.locals.error_msg = req.flash('error_msg');
  res.locals.error = req.flash('error');
  res.locals.user = req.session.user || null;
  res.locals.isAdmin = req.session.isAdmin || false;
  next();
});

// Route dosyalarını içe aktarma
const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');
const userRoutes = require('./routes/userRoutes');
const healthDataRoutes = require('./routes/healthDataRoutes');
const medicationRoutes = require('./routes/medicationRoutes');
const nutritionRoutes = require('./routes/nutritionRoutes');
const physicalActivityRoutes = require('./routes/physicalActivityRoutes');
const reminderRoutes = require('./routes/reminderRoutes');
const reportRoutes = require('./routes/reportRoutes');
const apiRoutes = require('./routes/apiRoutes');

// Route'ları uygulama
app.use('/auth', authRoutes);
app.use(`/${process.env.ADMIN_PAGE_URL}`, adminRoutes);
app.use('/user', userRoutes);
app.use('/health', healthDataRoutes);
app.use('/medication', medicationRoutes);
app.use('/nutrition', nutritionRoutes);
app.use('/activity', physicalActivityRoutes);
app.use('/reminder', reminderRoutes);
app.use('/report', reportRoutes);
app.use('/api', apiRoutes);

// Ana sayfa rotası
app.get('/', (req, res) => {
  if (req.session.user) {
    return res.redirect('/home');
  }
  res.render('index');
});

// Home page
app.get('/home', (req, res) => {
  if (!req.session.user) {
    return res.redirect('/auth/login');
  }
  res.render('home');
});

// 404 Sayfası
app.use((req, res) => {
  res.status(404).render('404');
});

// Hata işleme middleware'i
app.use((err, req, res, next) => {
  console.error(err.stack.red);
  res.status(500).render('500', {
    error: process.env.NODE_ENV === 'development' ? err : 'Sunucu Hatası'
  });
});

// Portu dinleme
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Sunucu ${process.env.NODE_ENV} modunda ${PORT} portunda çalışıyor`.yellow.bold);
});

// Beklenmeyen hatalar için
process.on('unhandledRejection', (err) => {
  console.log(`Hata: ${err.message}`.red.bold);
  console.log('Beklenmeyen Red: Sunucu kapatılıyor...'.red);
  process.exit(1);
});
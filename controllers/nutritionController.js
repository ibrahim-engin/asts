const NutritionData = require('../models/NutritionData');
const FamilyMember = require('../models/FamilyMember');
const HealthData = require('../models/HealthData');
const { logError, logInfo } = require('../middlewares/logger');
const mongoose = require('mongoose');

/**
 * Beslenme verileri listesini göster
 * @route   GET /nutrition/:familyMemberId
 * @access  Private
 */
exports.getNutritionList = async (req, res) => {
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
    
    if (req.query.mealType) {
      filter.mealType = req.query.mealType;
    }
    
    if (req.query.startDate && req.query.endDate) {
      filter.date = {
        $gte: new Date(req.query.startDate),
        $lte: new Date(req.query.endDate)
      };
    } else if (req.query.startDate) {
      filter.date = { $gte: new Date(req.query.startDate) };
    } else if (req.query.endDate) {
      filter.date = { $lte: new Date(req.query.endDate) };
    }
    
    // Toplam kayıt sayısı
    const total = await NutritionData.countDocuments(filter);
    
    // Kayıtları getir
    const nutritionData = await NutritionData.find(filter)
      .sort({ date: -1, time: -1 })
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
    
    // Öğün tipine göre gruplandırma
    const mealTypes = await NutritionData.aggregate([
      { $match: { familyMemberId: mongoose.Types.ObjectId(familyMemberId) } },
      { $group: { _id: '$mealType', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    
    // Son 30 günlük kalori ortalaması
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const calorieStats = await NutritionData.aggregate([
      { 
        $match: { 
          familyMemberId: mongoose.Types.ObjectId(familyMemberId),
          date: { $gte: thirtyDaysAgo }
        } 
      },
      {
        $group: {
          _id: null,
          avgCalories: { $avg: '$totalNutritionalValues.calories' },
          minCalories: { $min: '$totalNutritionalValues.calories' },
          maxCalories: { $max: '$totalNutritionalValues.calories' },
          totalCalories: { $sum: '$totalNutritionalValues.calories' },
          count: { $sum: 1 }
        }
      }
    ]);
    
    // Sayfa görünümünü render et
    res.render('front/nutrition-list', {
      title: `${familyMember.name} ${familyMember.surname} - Beslenme Kayıtları`,
      familyMember,
      nutritionData,
      pagination,
      filter: req.query,
      mealTypes,
      calorieStats: calorieStats.length > 0 ? calorieStats[0] : null,
      mealTypeOptions: [
        { value: 'kahvaltı', label: 'Kahvaltı' },
        { value: 'öğle_yemeği', label: 'Öğle Yemeği' },
        { value: 'akşam_yemeği', label: 'Akşam Yemeği' },
        { value: 'ara_öğün', label: 'Ara Öğün' },
        { value: 'atıştırmalık', label: 'Atıştırmalık' }
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
      message: 'Beslenme verileri alınırken bir hata oluştu',
      error: process.env.NODE_ENV === 'development' ? error : {}
    });
  }
};

/**
 * Yeni beslenme verisi ekleme sayfası
 * @route   GET /nutrition/:familyMemberId/add
 * @access  Private
 */
exports.getAddNutrition = async (req, res) => {
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
    
    // Öğün tipini al (opsiyonel)
    const mealType = req.query.mealType || 'kahvaltı';
    
    // Beslenme verisi ekleme sayfasını render et
    res.render('front/nutrition-form', {
        title: `${familyMember.name} ${familyMember.surname} - Beslenme Verisi Ekle`,
        familyMember,
        mealType,
        formAction: `/nutrition/${familyMemberId}`,
        formMethod: 'POST',
        nutritionData: null,
        mealTypeOptions: [
          { value: 'kahvaltı', label: 'Kahvaltı', icon: 'sunrise' },
          { value: 'öğle_yemeği', label: 'Öğle Yemeği', icon: 'sun' },
          { value: 'akşam_yemeği', label: 'Akşam Yemeği', icon: 'sunset' },
          { value: 'ara_öğün', label: 'Ara Öğün', icon: 'clock' },
          { value: 'atıştırmalık', label: 'Atıştırmalık', icon: 'snack' }
        ],
        foodCategories: [
          { value: 'meyve', label: 'Meyve' },
          { value: 'sebze', label: 'Sebze' },
          { value: 'tahıl', label: 'Tahıl' },
          { value: 'süt_ürünleri', label: 'Süt Ürünleri' },
          { value: 'et', label: 'Et' },
          { value: 'kümes_hayvanları', label: 'Kümes Hayvanları' },
          { value: 'balık', label: 'Balık' },
          { value: 'baklagiller', label: 'Baklagiller' },
          { value: 'yağlar', label: 'Yağlar' },
          { value: 'tatlılar', label: 'Tatlılar' },
          { value: 'içecekler', label: 'İçecekler' },
          { value: 'fast_food', label: 'Fast Food' },
          { value: 'hazır_yemek', label: 'Hazır Yemek' },
          { value: 'atıştırmalıklar', label: 'Atıştırmalıklar' },
          { value: 'diğer', label: 'Diğer' }
        ],
        beverageCategories: [
          { value: 'su', label: 'Su' },
          { value: 'çay', label: 'Çay' },
          { value: 'kahve', label: 'Kahve' },
          { value: 'meyve_suyu', label: 'Meyve Suyu' },
          { value: 'gazlı_içecek', label: 'Gazlı İçecek' },
          { value: 'alkollü_içecek', label: 'Alkollü İçecek' },
          { value: 'süt', label: 'Süt' },
          { value: 'ayran', label: 'Ayran' },
          { value: 'enerji_içeceği', label: 'Enerji İçeceği' },
          { value: 'bitki_çayı', label: 'Bitki Çayı' },
          { value: 'diğer', label: 'Diğer' }
        ],
        portionUnits: {
          food: [
            { value: 'g', label: 'Gram (g)' },
            { value: 'adet', label: 'Adet' },
            { value: 'dilim', label: 'Dilim' },
            { value: 'porsiyon', label: 'Porsiyon' },
            { value: 'kaşık', label: 'Kaşık' },
            { value: 'bardak', label: 'Bardak' },
            { value: 'avuç', label: 'Avuç' },
            { value: 'diğer', label: 'Diğer' }
          ],
          beverage: [
            { value: 'ml', label: 'Mililitre (ml)' },
            { value: 'bardak', label: 'Bardak' },
            { value: 'şişe', label: 'Şişe' },
            { value: 'litre', label: 'Litre' },
            { value: 'fincan', label: 'Fincan' },
            { value: 'diğer', label: 'Diğer' }
          ]
        },
        moodOptions: [
          { value: 'çok_iyi', label: 'Çok İyi' },
          { value: 'iyi', label: 'İyi' },
          { value: 'normal', label: 'Normal' },
          { value: 'kötü', label: 'Kötü' },
          { value: 'çok_kötü', label: 'Çok Kötü' }
        ],
        locationOptions: [
          { value: 'ev', label: 'Ev' },
          { value: 'iş', label: 'İş' },
          { value: 'okul', label: 'Okul' },
          { value: 'restoran', label: 'Restoran' },
          { value: 'dışarıda', label: 'Dışarıda' },
          { value: 'diğer', label: 'Diğer' }
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
        message: 'Beslenme verisi ekleme sayfası yüklenirken bir hata oluştu',
        error: process.env.NODE_ENV === 'development' ? error : {}
      });
    }
  };
  
  /**
   * Beslenme verisi ekleme
   * @route   POST /nutrition/:familyMemberId
   * @access  Private
   */
  exports.addNutrition = async (req, res) => {
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
        mealType,
        date,
        time,
        duration,
        location,
        isPlanned,
        isFasting,
        notes
      } = req.body;
      
      // Yeni beslenme verisi oluştur
      const nutritionData = new NutritionData({
        familyMemberId,
        mealType,
        date: new Date(date),
        time,
        duration: duration ? parseInt(duration) : undefined,
        location,
        isPlanned: isPlanned === 'on',
        isFasting: isFasting === 'on',
        notes,
        createdBy: req.user._id
      });
      
      // Yiyecekleri doldur
      if (req.body['foods'] && Array.isArray(req.body['foods'])) {
        nutritionData.foods = [];
        
        for (let i = 0; i < req.body['foods'].length; i++) {
          // Eksik veri ile gönderilen yiyecekleri atla
          if (!req.body[`foods[${i}].name`]) continue;
          
          const food = {
            name: req.body[`foods[${i}].name`],
            category: req.body[`foods[${i}].category`],
            portion: {
              amount: parseFloat(req.body[`foods[${i}].portion.amount`]),
              unit: req.body[`foods[${i}].portion.unit`]
            },
            nutritionalValues: {
              calories: req.body[`foods[${i}].nutritionalValues.calories`] ? parseFloat(req.body[`foods[${i}].nutritionalValues.calories`]) : undefined,
              carbs: req.body[`foods[${i}].nutritionalValues.carbs`] ? parseFloat(req.body[`foods[${i}].nutritionalValues.carbs`]) : undefined,
              proteins: req.body[`foods[${i}].nutritionalValues.proteins`] ? parseFloat(req.body[`foods[${i}].nutritionalValues.proteins`]) : undefined,
              fats: req.body[`foods[${i}].nutritionalValues.fats`] ? parseFloat(req.body[`foods[${i}].nutritionalValues.fats`]) : undefined,
              fiber: req.body[`foods[${i}].nutritionalValues.fiber`] ? parseFloat(req.body[`foods[${i}].nutritionalValues.fiber`]) : undefined,
              sugar: req.body[`foods[${i}].nutritionalValues.sugar`] ? parseFloat(req.body[`foods[${i}].nutritionalValues.sugar`]) : undefined
            }
          };
          
          nutritionData.foods.push(food);
        }
      } else if (req.body['foods.name']) {
        // Tek yiyecek gönderilmişse
        const food = {
          name: req.body['foods.name'],
          category: req.body['foods.category'],
          portion: {
            amount: parseFloat(req.body['foods.portion.amount']),
            unit: req.body['foods.portion.unit']
          },
          nutritionalValues: {
            calories: req.body['foods.nutritionalValues.calories'] ? parseFloat(req.body['foods.nutritionalValues.calories']) : undefined,
            carbs: req.body['foods.nutritionalValues.carbs'] ? parseFloat(req.body['foods.nutritionalValues.carbs']) : undefined,
            proteins: req.body['foods.nutritionalValues.proteins'] ? parseFloat(req.body['foods.nutritionalValues.proteins']) : undefined,
            fats: req.body['foods.nutritionalValues.fats'] ? parseFloat(req.body['foods.nutritionalValues.fats']) : undefined,
            fiber: req.body['foods.nutritionalValues.fiber'] ? parseFloat(req.body['foods.nutritionalValues.fiber']) : undefined,
            sugar: req.body['foods.nutritionalValues.sugar'] ? parseFloat(req.body['foods.nutritionalValues.sugar']) : undefined
          }
        };
        
        nutritionData.foods = [food];
      }
      
      // İçecekleri doldur
      if (req.body['beverages'] && Array.isArray(req.body['beverages'])) {
        nutritionData.beverages = [];
        
        for (let i = 0; i < req.body['beverages'].length; i++) {
          // Eksik veri ile gönderilen içecekleri atla
          if (!req.body[`beverages[${i}].name`]) continue;
          
          const beverage = {
            name: req.body[`beverages[${i}].name`],
            category: req.body[`beverages[${i}].category`],
            portion: {
              amount: parseFloat(req.body[`beverages[${i}].portion.amount`]),
              unit: req.body[`beverages[${i}].portion.unit`]
            },
            nutritionalValues: {
              calories: req.body[`beverages[${i}].nutritionalValues.calories`] ? parseFloat(req.body[`beverages[${i}].nutritionalValues.calories`]) : undefined,
              sugar: req.body[`beverages[${i}].nutritionalValues.sugar`] ? parseFloat(req.body[`beverages[${i}].nutritionalValues.sugar`]) : undefined,
              caffeine: req.body[`beverages[${i}].nutritionalValues.caffeine`] ? parseFloat(req.body[`beverages[${i}].nutritionalValues.caffeine`]) : undefined,
              alcohol: req.body[`beverages[${i}].nutritionalValues.alcohol`] ? parseFloat(req.body[`beverages[${i}].nutritionalValues.alcohol`]) : undefined
            }
          };
          
          nutritionData.beverages.push(beverage);
        }
      } else if (req.body['beverages.name']) {
        // Tek içecek gönderilmişse
        const beverage = {
          name: req.body['beverages.name'],
          category: req.body['beverages.category'],
          portion: {
            amount: parseFloat(req.body['beverages.portion.amount']),
            unit: req.body['beverages.portion.unit']
          },
          nutritionalValues: {
            calories: req.body['beverages.nutritionalValues.calories'] ? parseFloat(req.body['beverages.nutritionalValues.calories']) : undefined,
            sugar: req.body['beverages.nutritionalValues.sugar'] ? parseFloat(req.body['beverages.nutritionalValues.sugar']) : undefined,
            caffeine: req.body['beverages.nutritionalValues.caffeine'] ? parseFloat(req.body['beverages.nutritionalValues.caffeine']) : undefined,
            alcohol: req.body['beverages.nutritionalValues.alcohol'] ? parseFloat(req.body['beverages.nutritionalValues.alcohol']) : undefined
          }
        };
        
        nutritionData.beverages = [beverage];
      }
      
      // Kan şekeri bilgilerini doldur
      if (req.body['bloodSugarBefore.value']) {
        nutritionData.bloodSugarBefore = {
          value: parseFloat(req.body['bloodSugarBefore.value']),
          unit: req.body['bloodSugarBefore.unit'] || 'mg/dL',
          time: req.body['bloodSugarBefore.time']
        };
      }
      
      if (req.body['bloodSugarAfter.value']) {
        nutritionData.bloodSugarAfter = {
          value: parseFloat(req.body['bloodSugarAfter.value']),
          unit: req.body['bloodSugarAfter.unit'] || 'mg/dL',
          time: req.body['bloodSugarAfter.time'],
          minutesAfter: req.body['bloodSugarAfter.minutesAfter'] ? parseInt(req.body['bloodSugarAfter.minutesAfter']) : undefined
        };
      }
      
      // Ruh hali ve açlık durumunu doldur
      if (req.body['mood.before'] || req.body['mood.after']) {
        nutritionData.mood = {
          before: req.body['mood.before'],
          after: req.body['mood.after']
        };
      }
      
      if (req.body['hunger.before'] || req.body['hunger.after']) {
        nutritionData.hunger = {
          before: req.body['hunger.before'] ? parseInt(req.body['hunger.before']) : undefined,
          after: req.body['hunger.after'] ? parseInt(req.body['hunger.after']) : undefined
        };
      }
      
      // Semptomları doldur
      if (req.body['symptoms'] && Array.isArray(req.body['symptoms'])) {
        nutritionData.symptoms = [];
        
        for (let i = 0; i < req.body['symptoms'].length; i++) {
          // Eksik veri ile gönderilen semptomları atla
          if (!req.body[`symptoms[${i}].type`]) continue;
          
          const symptom = {
            type: req.body[`symptoms[${i}].type`],
            severity: req.body[`symptoms[${i}].severity`] ? parseInt(req.body[`symptoms[${i}].severity`]) : undefined,
            duration: req.body[`symptoms[${i}].duration`] ? parseInt(req.body[`symptoms[${i}].duration`]) : undefined,
            notes: req.body[`symptoms[${i}].notes`]
          };
          
          nutritionData.symptoms.push(symptom);
        }
      } else if (req.body['symptoms.type']) {
        // Tek semptom gönderilmişse
        const symptom = {
          type: req.body['symptoms.type'],
          severity: req.body['symptoms.severity'] ? parseInt(req.body['symptoms.severity']) : undefined,
          duration: req.body['symptoms.duration'] ? parseInt(req.body['symptoms.duration']) : undefined,
          notes: req.body['symptoms.notes']
        };
        
        nutritionData.symptoms = [symptom];
      }
      
      // Öğün fotoğrafı
      if (req.file) {
        nutritionData.mealPhoto = {
          filename: req.file.filename,
          originalName: req.file.originalname,
          mimeType: req.file.mimetype,
          size: req.file.size,
          path: req.file.path,
          uploadDate: new Date()
        };
      }
      
      // Veriyi kaydet
      await nutritionData.save();
      
      // Log kaydı
      logInfo('Yeni beslenme verisi eklendi', {
        userId: req.user._id,
        familyMemberId,
        nutritionDataId: nutritionData._id,
        mealType
      });
      
      // Kan şekeri verilerini otomatik olarak kaydet
      if (nutritionData.bloodSugarBefore && nutritionData.bloodSugarBefore.value) {
        const healthData = new HealthData({
          familyMemberId,
          measuredBy: req.user._id,
          dataType: 'bloodSugar',
          measuredAt: new Date(`${date}T${nutritionData.bloodSugarBefore.time || time}`),
          bloodSugar: {
            value: nutritionData.bloodSugarBefore.value,
            unit: nutritionData.bloodSugarBefore.unit,
            measurementType: 'random',
            timeSinceLastMeal: 0 // Öğün öncesi
          },
          notes: `${mealType} öncesi otomatik kaydedilen kan şekeri ölçümü.`
        });
        
        await healthData.save();
        
        logInfo('Beslenme kaydından kan şekeri verisi oluşturuldu', {
          userId: req.user._id,
          familyMemberId,
          nutritionDataId: nutritionData._id,
          healthDataId: healthData._id,
          type: 'before'
        });
      }
      
      if (nutritionData.bloodSugarAfter && nutritionData.bloodSugarAfter.value) {
        const healthData = new HealthData({
          familyMemberId,
          measuredBy: req.user._id,
          dataType: 'bloodSugar',
          measuredAt: new Date(`${date}T${nutritionData.bloodSugarAfter.time || time}`),
          bloodSugar: {
            value: nutritionData.bloodSugarAfter.value,
            unit: nutritionData.bloodSugarAfter.unit,
            measurementType: 'postprandial',
            timeSinceLastMeal: nutritionData.bloodSugarAfter.minutesAfter || null
          },
          notes: `${mealType} sonrası otomatik kaydedilen kan şekeri ölçümü.`
        });
        
        await healthData.save();
        
        logInfo('Beslenme kaydından kan şekeri verisi oluşturuldu', {
          userId: req.user._id,
          familyMemberId,
          nutritionDataId: nutritionData._id,
          healthDataId: healthData._id,
          type: 'after'
        });
      }
      
      req.flash('success_msg', 'Beslenme verisi başarıyla eklendi');
      
      // Beslenme verileri listesine yönlendir
      res.redirect(`/nutrition/${familyMemberId}`);
    } catch (error) {
      logError(error, req);
      
      if (error.name === 'ValidationError') {
        req.flash('error_msg', 'Geçersiz veya eksik veri');
        return res.redirect(`/nutrition/${req.params.familyMemberId}/add?mealType=${req.body.mealType || 'kahvaltı'}`);
      }
      
      req.flash('error_msg', 'Beslenme verisi eklenirken bir hata oluştu');
      res.redirect(`/nutrition/${req.params.familyMemberId}/add`);
    }
  };
  
  /**
   * Beslenme verisi detayını göster
   * @route   GET /nutrition/:familyMemberId/:nutritionDataId
   * @access  Private
   */
  exports.getNutritionDetail = async (req, res) => {
    try {
      const { familyMemberId, nutritionDataId } = req.params;
      
      // Aile üyesini kontrol et
      const familyMember = await FamilyMember.findOne({
        _id: familyMemberId,
        userId: req.user._id
      });
      
      if (!familyMember) {
        req.flash('error_msg', 'Aile üyesi bulunamadı');
        return res.redirect('/home');
      }
      
      // Beslenme verisini bul
      const nutritionData = await NutritionData.findOne({
        _id: nutritionDataId,
        familyMemberId
      });
      
      if (!nutritionData) {
        req.flash('error_msg', 'Beslenme verisi bulunamadı');
        return res.redirect(`/nutrition/${familyMemberId}`);
      }
      
      // Aynı gün içindeki önceki ve sonraki kayıtları bul
      const startOfDay = new Date(nutritionData.date);
      startOfDay.setHours(0, 0, 0, 0);
      
      const endOfDay = new Date(nutritionData.date);
      endOfDay.setHours(23, 59, 59, 999);
      
      const previousData = await NutritionData.findOne({
        familyMemberId,
        date: { $gte: startOfDay, $lte: endOfDay },
        _id: { $lt: nutritionDataId }
      })
      .sort({ date: -1, time: -1 })
      .select('_id date time mealType');
      
      const nextData = await NutritionData.findOne({
        familyMemberId,
        date: { $gte: startOfDay, $lte: endOfDay },
        _id: { $gt: nutritionDataId }
      })
      .sort({ date: 1, time: 1 })
      .select('_id date time mealType');
      
      // Öğün tiplerinin Türkçe karşılıkları
      const mealTypeMap = {
        'kahvaltı': 'Kahvaltı',
        'öğle_yemeği': 'Öğle Yemeği',
        'akşam_yemeği': 'Akşam Yemeği',
        'ara_öğün': 'Ara Öğün',
        'atıştırmalık': 'Atıştırmalık'
      };
      
      // Yiyecek kategorilerinin Türkçe karşılıkları
      const foodCategoryMap = {
        'meyve': 'Meyve',
        'sebze': 'Sebze',
        'tahıl': 'Tahıl',
        'süt_ürünleri': 'Süt Ürünleri',
        'et': 'Et',
        'kümes_hayvanları': 'Kümes Hayvanları',
        'balık': 'Balık',
        'baklagiller': 'Baklagiller',
        'yağlar': 'Yağlar',
        'tatlılar': 'Tatlılar',
        'içecekler': 'İçecekler',
        'fast_food': 'Fast Food',
        'hazır_yemek': 'Hazır Yemek',
        'atıştırmalıklar': 'Atıştırmalıklar',
        'diğer': 'Diğer'
      };
      
      // İçecek kategorilerinin Türkçe karşılıkları
      const beverageCategoryMap = {
        'su': 'Su',
        'çay': 'Çay',
        'kahve': 'Kahve',
        'meyve_suyu': 'Meyve Suyu',
        'gazlı_içecek': 'Gazlı İçecek',
        'alkollü_içecek': 'Alkollü İçecek',
        'süt': 'Süt',
        'ayran': 'Ayran',
        'enerji_içeceği': 'Enerji İçeceği',
        'bitki_çayı': 'Bitki Çayı',
        'diğer': 'Diğer'
      };
      
      // Detay sayfasını render et
      res.render('front/nutrition-detail', {
        title: `${familyMember.name} ${familyMember.surname} - Beslenme Detayı`,
        familyMember,
        nutritionData,
        previousData,
        nextData,
        mealTypeMap,
        foodCategoryMap,
        beverageCategoryMap
      });
    } catch (error) {
      logError(error, req);
      
      if (error.name === 'CastError') {
        req.flash('error_msg', 'Geçersiz ID formatı');
        return res.redirect('/home');
      }
      
      res.status(500).render('500', {
        title: 'Sunucu Hatası',
        message: 'Beslenme verisi detayı alınırken bir hata oluştu',
        error: process.env.NODE_ENV === 'development' ? error : {}
      });
    }
  };
  
  /**
   * Beslenme verisi düzenleme sayfası
   * @route   GET /nutrition/:familyMemberId/:nutritionDataId/edit
   * @access  Private
   */
  exports.getEditNutrition = async (req, res) => {
    try {
      const { familyMemberId, nutritionDataId } = req.params;
      
      // Aile üyesini kontrol et
      const familyMember = await FamilyMember.findOne({
        _id: familyMemberId,
        userId: req.user._id
      });
      
      if (!familyMember) {
        req.flash('error_msg', 'Aile üyesi bulunamadı');
        return res.redirect('/home');
      }
      
      // Beslenme verisini bul
      const nutritionData = await NutritionData.findOne({
        _id: nutritionDataId,
        familyMemberId
      });
      
      if (!nutritionData) {
        req.flash('error_msg', 'Beslenme verisi bulunamadı');
        return res.redirect(`/nutrition/${familyMemberId}`);
      }
      
      // Düzenleme sayfasını render et
      res.render('front/nutrition-form', {
        title: `${familyMember.name} ${familyMember.surname} - Beslenme Verisi Düzenle`,
        familyMember,
        nutritionData,
        mealType: nutritionData.mealType,
        formAction: `/nutrition/${familyMemberId}/${nutritionDataId}?_method=PUT`,
        formMethod: 'POST',
        mealTypeOptions: [
          { value: 'kahvaltı', label: 'Kahvaltı', icon: 'sunrise' },
          { value: 'öğle_yemeği', label: 'Öğle Yemeği', icon: 'sun' },
          { value: 'akşam_yemeği', label: 'Akşam Yemeği', icon: 'sunset' },
          { value: 'ara_öğün', label: 'Ara Öğün', icon: 'clock' },
          { value: 'atıştırmalık', label: 'Atıştırmalık', icon: 'snack' }
        ],
        foodCategories: [
          { value: 'meyve', label: 'Meyve' },
          { value: 'sebze', label: 'Sebze' },
          { value: 'tahıl', label: 'Tahıl' },
          { value: 'süt_ürünleri', label: 'Süt Ürünleri' },
          { value: 'et', label: 'Et' },
          { value: 'kümes_hayvanları', label: 'Kümes Hayvanları' },
          { value: 'balık', label: 'Balık' },
          { value: 'baklagiller', label: 'Baklagiller' },
          { value: 'yağlar', label: 'Yağlar' },
          { value: 'tatlılar', label: 'Tatlılar' },
          { value: 'içecekler', label: 'İçecekler' },
          { value: 'fast_food', label: 'Fast Food' },
          { value: 'hazır_yemek', label: 'Hazır Yemek' },
          { value: 'atıştırmalıklar', label: 'Atıştırmalıklar' },
          { value: 'diğer', label: 'Diğer' }
        ],
        beverageCategories: [
          { value: 'su', label: 'Su' },
          { value: 'çay', label: 'Çay' },
          { value: 'kahve', label: 'Kahve' },
          { value: 'meyve_suyu', label: 'Meyve Suyu' },
          { value: 'gazlı_içecek', label: 'Gazlı İçecek' },
          { value: 'alkollü_içecek', label: 'Alkollü İçecek' },
          { value: 'süt', label: 'Süt' },
          { value: 'ayran', label: 'Ayran' },
          { value: 'enerji_içeceği', label: 'Enerji İçeceği' },
          { value:
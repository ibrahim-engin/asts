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
            { value: 'bitki_çayı', label: 'Bitki Çayı' },
            { value: 'diğer', label: 'Diğer' }
          ]
        }
      );
    } catch (error) {
        logError(error, req);
  
        if (error.name === 'ValidationError') {
          req.flash('error_msg', 'Geçersiz veya eksik veri');
          return res.redirect(`/nutrition/${req.params.familyMemberId}/${req.params.nutritionDataId}/edit`);
        }
  
        req.flash('error_msg', 'Beslenme verisi güncellenirken bir hata oluştu');
        res.redirect(`/nutrition/${req.params.familyMemberId}/${req.params.nutritionDataId}/edit`);
      }
  };
  
  /**
   * Beslenme verisi güncelleme
   * @route   PUT /nutrition/:familyMemberId/:nutritionDataId
   * @access  Private
   */
  exports.updateNutrition = async (req, res) => {
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
      
      // Temel bilgileri güncelle
      nutritionData.mealType = mealType;
      nutritionData.date = new Date(date);
      nutritionData.time = time;
      nutritionData.duration = duration ? parseInt(duration) : undefined;
      nutritionData.location = location;
      nutritionData.isPlanned = isPlanned === 'on';
      nutritionData.isFasting = isFasting === 'on';
      nutritionData.notes = notes;
      
      // Yiyecekleri güncelle
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
      } else {
        nutritionData.foods = [];
      }
      
      // İçecekleri güncelle
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
      } else {
        nutritionData.beverages = [];
      }
      
      // Kan şekeri bilgilerini güncelle
      if (req.body['bloodSugarBefore.value']) {
        nutritionData.bloodSugarBefore = {
          value: parseFloat(req.body['bloodSugarBefore.value']),
          unit: req.body['bloodSugarBefore.unit'] || 'mg/dL',
          time: req.body['bloodSugarBefore.time']
        };
      } else {
        nutritionData.bloodSugarBefore = undefined;
      }
      
      if (req.body['bloodSugarAfter.value']) {
        nutritionData.bloodSugarAfter = {
          value: parseFloat(req.body['bloodSugarAfter.value']),
          unit: req.body['bloodSugarAfter.unit'] || 'mg/dL',
          time: req.body['bloodSugarAfter.time'],
          minutesAfter: req.body['bloodSugarAfter.minutesAfter'] ? parseInt(req.body['bloodSugarAfter.minutesAfter']) : undefined
        };
      } else {
        nutritionData.bloodSugarAfter = undefined;
      }
      
      // Ruh hali ve açlık durumunu güncelle
      if (req.body['mood.before'] || req.body['mood.after']) {
        nutritionData.mood = {
          before: req.body['mood.before'],
          after: req.body['mood.after']
        };
      } else {
        nutritionData.mood = undefined;
      }
      
      if (req.body['hunger.before'] || req.body['hunger.after']) {
        nutritionData.hunger = {
          before: req.body['hunger.before'] ? parseInt(req.body['hunger.before']) : undefined,
          after: req.body['hunger.after'] ? parseInt(req.body['hunger.after']) : undefined
        };
      } else {
        nutritionData.hunger = undefined;
      }
      
      // Semptomları güncelle
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
      } else {
        nutritionData.symptoms = [];
      }
      
      // Dosya yüklendiyse öğün fotoğrafını güncelle
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
      logInfo('Beslenme verisi güncellendi', {
        userId: req.user._id,
        familyMemberId,
        nutritionDataId,
        mealType
      });
      
      req.flash('success_msg', 'Beslenme verisi başarıyla güncellendi');
      
      // Detay sayfasına yönlendir
      res.redirect(`/nutrition/${familyMemberId}/${nutritionDataId}`);
    } catch (error) {
      logError(error, req);
      
      if (error.name === 'ValidationError') {
        req.flash('error_msg', 'Geçersiz veya eksik veri');
        return res.redirect(`/nutrition/${req.params.familyMemberId}/${req.params.nutritionDataId}/edit`);
      }
      
      req.flash('error_msg', 'Beslenme verisi güncellenirken bir hata oluştu');
      res.redirect(`/nutrition/${req.params.familyMemberId}/${req.params.nutritionDataId}/edit`);
    }
  };
  
  /**
   * Beslenme verisi silme
   * @route   DELETE /nutrition/:familyMemberId/:nutritionDataId
   * @access  Private
   */
  exports.deleteNutrition = async (req, res) => {
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
      
      // Beslenme verisini bul ve sil
      const nutritionData = await NutritionData.findOneAndDelete({
        _id: nutritionDataId,
        familyMemberId
      });
      
      if (!nutritionData) {
        req.flash('error_msg', 'Beslenme verisi bulunamadı');
        return res.redirect(`/nutrition/${familyMemberId}`);
      }
      
      // Log kaydı
      logInfo('Beslenme verisi silindi', {
        userId: req.user._id,
        familyMemberId,
        nutritionDataId: nutritionData._id,
        mealType: nutritionData.mealType
      });
      
      req.flash('success_msg', 'Beslenme verisi başarıyla silindi');
      
      // Liste sayfasına yönlendir
      res.redirect(`/nutrition/${familyMemberId}`);
    } catch (error) {
      logError(error, req);
      
      if (error.name === 'CastError') {
        req.flash('error_msg', 'Geçersiz ID formatı');
        return res.redirect(`/nutrition/${req.params.familyMemberId}`);
      }
      
      req.flash('error_msg', 'Beslenme verisi silinirken bir hata oluştu');
      res.redirect(`/nutrition/${req.params.familyMemberId}`);
    }
  };
  
  /**
   * Beslenme istatistikleri görünümü
   * @route   GET /nutrition/:familyMemberId/stats
   * @access  Private
   */
  exports.getNutritionStats = async (req, res) => {
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
      
      // Tarih aralığı parametreleri
      const { period = 'month', startDate, endDate } = req.query;
      
      // Tarih aralığını hesapla
      let dateRange = {};
      
      if (startDate && endDate) {
        dateRange = {
          startDate: new Date(startDate),
          endDate: new Date(endDate)
        };
      } else {
        const now = new Date();
        
        if (period === 'week') {
          dateRange.startDate = new Date(now.setDate(now.getDate() - 7));
        } else if (period === 'month') {
          dateRange.startDate = new Date(now.setMonth(now.getMonth() - 1));
        } else if (period === 'quarter') {
          dateRange.startDate = new Date(now.setMonth(now.getMonth() - 3));
        } else if (period === 'year') {
          dateRange.startDate = new Date(now.setFullYear(now.getFullYear() - 1));
        } else {
          // Varsayılan olarak 1 ay
          dateRange.startDate = new Date(now.setMonth(now.getMonth() - 1));
        }
        dateRange.endDate = new Date();
      }
      
      // Tarih aralığındaki beslenme verilerini getir
      const nutritionData = await NutritionData.find({
        familyMemberId,
        date: {
          $gte: dateRange.startDate,
          $lte: dateRange.endDate
        }
      }).sort({ date: 1 });
      
      // İstatistikleri hesapla
      const stats = {
        totalEntries: nutritionData.length,
        totalCalories: 0,
        avgCaloriesPerDay: 0,
        avgCarbsPerDay: 0,
        avgProteinsPerDay: 0,
        avgFatsPerDay: 0,
        mealTypeDistribution: {},
        caloriesByDay: [],
        macroRatios: {
          carbs: 0,
          proteins: 0,
          fats: 0
        }
      };
      
      // Toplam değerleri hesapla
      let totalCarbs = 0;
      let totalProteins = 0;
      let totalFats = 0;
      
      // Öğün tipine göre sayaç
      const mealTypeCounts = {};
      
      // Günlük kalori değerleri
      const caloriesByDay = {};
      
      // Her bir beslenme verisini işle
      for (const data of nutritionData) {
        // Toplam kaloriyi ekle
        const mealCalories = data.totalNutritionalValues.calories || 0;
        stats.totalCalories += mealCalories;
        
        // Makro besinleri ekle
        totalCarbs += data.totalNutritionalValues.carbs || 0;
        totalProteins += data.totalNutritionalValues.proteins || 0;
        totalFats += data.totalNutritionalValues.fats || 0;
        
        // Öğün tipi sayacı
        if (!mealTypeCounts[data.mealType]) {
          mealTypeCounts[data.mealType] = 0;
        }
        mealTypeCounts[data.mealType]++;
        
        // Günlük kalori takibi
        const dateKey = new Date(data.date).toISOString().split('T')[0]; // YYYY-MM-DD formatı
        
        if (!caloriesByDay[dateKey]) {
          caloriesByDay[dateKey] = 0;
        }
        caloriesByDay[dateKey] += mealCalories;
      }
      
      // Tarih aralığındaki gün sayısını hesapla
      const dayCount = Math.ceil((dateRange.endDate - dateRange.startDate) / (1000 * 60 * 60 * 24));
      
      // Günlük ortalamaları hesapla
      stats.avgCaloriesPerDay = dayCount > 0 ? stats.totalCalories / dayCount : 0;
      stats.avgCarbsPerDay = dayCount > 0 ? totalCarbs / dayCount : 0;
      stats.avgProteinsPerDay = dayCount > 0 ? totalProteins / dayCount : 0;
      stats.avgFatsPerDay = dayCount > 0 ? totalFats / dayCount : 0;
      
      // Öğün tipi dağılımını hesapla
      stats.mealTypeDistribution = mealTypeCounts;
      
      // Makro besin oranlarını hesapla
      const totalMacroCalories = (totalCarbs * 4) + (totalProteins * 4) + (totalFats * 9);
      
      if (totalMacroCalories > 0) {
        stats.macroRatios = {
          carbs: parseFloat(((totalCarbs * 4) / totalMacroCalories * 100).toFixed(1)),
          proteins: parseFloat(((totalProteins * 4) / totalMacroCalories * 100).toFixed(1)),
          fats: parseFloat(((totalFats * 9) / totalMacroCalories * 100).toFixed(1))
        };
      }
      
      // Günlük kalori grafiği için veriyi oluştur
      const sortedDates = Object.keys(caloriesByDay).sort();
      stats.caloriesByDay = sortedDates.map(date => ({
        date,
        calories: caloriesByDay[date]
      }));
      
      // İstatistik sayfasını render et
      res.render('front/nutrition-stats', {
        title: `${familyMember.name} ${familyMember.surname} - Beslenme İstatistikleri`,
        familyMember,
        period,
        dateRange,
        stats,
        nutritionData
      });
    } catch (error) {
      logError(error, req);
      
      if (error.name === 'CastError') {
        req.flash('error_msg', 'Geçersiz ID formatı');
        return res.redirect('/home');
      }
      
      res.status(500).render('500', {
        title: 'Sunucu Hatası',
        message: 'Beslenme istatistikleri yüklenirken bir hata oluştu',
        error: process.env.NODE_ENV === 'development' ? error : {}
      });
    }
  };
  
  /**
   * API: Beslenme verileri listesi
   * @route   GET /api/nutrition/:familyMemberId
   * @access  Private
   */
  exports.apiGetNutritionList = async (req, res) => {
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
      
      // Sayfalama
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;
      const skip = (page - 1) * limit;
      
      // Toplam kayıt sayısı
      const total = await NutritionData.countDocuments(filter);
      
      // Beslenme verilerini getir
      const nutritionData = await NutritionData.find(filter)
        .sort({ date: -1, time: -1 })
        .skip(skip)
        .limit(limit);
      
      // Formatlı verileri hazırla
      const formattedData = nutritionData.map(data => ({
        id: data._id,
        familyMemberId: data.familyMemberId,
        mealType: data.mealType,
        date: data.date,
        time: data.time,
        location: data.location,
        foodCount: data.foods ? data.foods.length : 0,
        beverageCount: data.beverages ? data.beverages.length : 0,
        totalCalories: data.totalNutritionalValues.calories,
        totalCarbs: data.totalNutritionalValues.carbs,
        totalProteins: data.totalNutritionalValues.proteins,
        totalFats: data.totalNutritionalValues.fats,
        hasMealPhoto: !!data.mealPhoto,
        hasBloodSugarData: !!(data.bloodSugarBefore || data.bloodSugarAfter),
        createdAt: data.createdAt
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
        error: 'Beslenme verileri alınırken bir hata oluştu'
      });
    }
  };
  
  /**
   * API: Beslenme verisi detayı
   * @route   GET /api/nutrition/:familyMemberId/:nutritionDataId
   * @access  Private
   */
  exports.apiGetNutritionDetail = async (req, res) => {
    try {
      const { familyMemberId, nutritionDataId } = req.params;
      
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
      
      // Beslenme verisini bul
      const nutritionData = await NutritionData.findOne({
        _id: nutritionDataId,
        familyMemberId
      });
      
      if (!nutritionData) {
        return res.status(404).json({
          success: false,
          error: 'Beslenme verisi bulunamadı'
        });
      }
      
      // API yanıtı
      res.json({
        success: true,
        data: {
          id: nutritionData._id,
          familyMemberId: nutritionData.familyMemberId,
          mealType: nutritionData.mealType,
          date: nutritionData.date,
          time: nutritionData.time,
          duration: nutritionData.duration,
          location: nutritionData.location,
          isPlanned: nutritionData.isPlanned,
          isFasting: nutritionData.isFasting,
          foods: nutritionData.foods,
          beverages: nutritionData.beverages,
          totalNutritionalValues: nutritionData.totalNutritionalValues,
          bloodSugarBefore: nutritionData.bloodSugarBefore,
          bloodSugarAfter: nutritionData.bloodSugarAfter,
          bloodSugarChange: nutritionData.bloodSugarChange,
          mood: nutritionData.mood,
          hunger: nutritionData.hunger,
          symptoms: nutritionData.symptoms,
          mealPhoto: nutritionData.mealPhoto ? {
            filename: nutritionData.mealPhoto.filename,
            url: `/uploads/nutrition/${nutritionData.mealPhoto.filename}`
          } : null,
          notes: nutritionData.notes,
          macroRatio: nutritionData.macroRatio,
          createdAt: nutritionData.createdAt,
          updatedAt: nutritionData.updatedAt
        }
      });
    } catch (error) {
      logError(error, req);
      
      res.status(500).json({
        success: false,
        error: 'Beslenme verisi detayı alınırken bir hata oluştu'
      });
    }
  };
  
/**
 * API: Beslenme verisi ekleme
 * @route   POST /api/nutrition
 * @access  Private
 */
exports.apiAddNutrition = async (req, res) => {
    try {
      const { familyMemberId } = req.body;
      
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
      
      // Beslenme verisi oluştur
      const nutritionData = new NutritionData({
        ...req.body,
        createdBy: req.user._id
      });
      
      // Beslenme verisini kaydet
      await nutritionData.save();
      
      // Kan şekeri ölçümlerini sağlık verileri olarak da kaydet
      if (nutritionData.bloodSugarBefore && nutritionData.bloodSugarBefore.value) {
        const healthData = new HealthData({
          familyMemberId,
          measuredBy: req.user._id,
          dataType: 'bloodSugar',
          measuredAt: new Date(`${nutritionData.date.toISOString().split('T')[0]}T${nutritionData.bloodSugarBefore.time || '00:00'}`),
          bloodSugar: {
            value: nutritionData.bloodSugarBefore.value,
            unit: nutritionData.bloodSugarBefore.unit,
            measurementType: 'random',
            timeSinceLastMeal: 0 // Öğün öncesi
          },
          notes: `${nutritionData.mealType} öncesi otomatik kaydedilen kan şekeri ölçümü.`
        });
        
        await healthData.save();
        
        logInfo('API: Beslenme kaydından kan şekeri verisi oluşturuldu', {
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
          measuredAt: new Date(`${nutritionData.date.toISOString().split('T')[0]}T${nutritionData.bloodSugarAfter.time || '00:00'}`),
          bloodSugar: {
            value: nutritionData.bloodSugarAfter.value,
            unit: nutritionData.bloodSugarAfter.unit,
            measurementType: 'postprandial',
            timeSinceLastMeal: nutritionData.bloodSugarAfter.minutesAfter || null
          },
          notes: `${nutritionData.mealType} sonrası otomatik kaydedilen kan şekeri ölçümü.`
        });
        
        await healthData.save();
        
        logInfo('API: Beslenme kaydından kan şekeri verisi oluşturuldu', {
          userId: req.user._id,
          familyMemberId,
          nutritionDataId: nutritionData._id,
          healthDataId: healthData._id,
          type: 'after'
        });
      }
      
      // API yanıtı
      res.status(201).json({
        success: true,
        data: nutritionData
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
        error: 'Beslenme verisi eklenirken bir hata oluştu'
      });
    }
  };
  
  /**
   * API: Beslenme verisi güncelleme
   * @route   PUT /api/nutrition/:nutritionDataId
   * @access  Private
   */
  exports.apiUpdateNutrition = async (req, res) => {
    try {
      const { nutritionDataId } = req.params;
      const { familyMemberId } = req.body;
      
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
      
      // Beslenme verisini bul
      let nutritionData = await NutritionData.findOne({
        _id: nutritionDataId,
        familyMemberId
      });
      
      if (!nutritionData) {
        return res.status(404).json({
          success: false,
          error: 'Beslenme verisi bulunamadı'
        });
      }
      
      // Güncellenebilir alanlar
      const updateFields = [
        'mealType', 'date', 'time', 'duration', 'location', 'isPlanned', 'isFasting',
        'foods', 'beverages', 'bloodSugarBefore', 'bloodSugarAfter', 'mood', 'hunger',
        'symptoms', 'notes'
      ];
      
      // Alanları güncelle
      updateFields.forEach(field => {
        if (req.body[field] !== undefined) {
          nutritionData[field] = req.body[field];
        }
      });
      
      // Son güncelleyen kullanıcıyı kaydet
      nutritionData.updatedBy = req.user._id;
      
      // Beslenme verisini kaydet
      await nutritionData.save();
      
      // API yanıtı
      res.json({
        success: true,
        data: nutritionData
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
        error: 'Beslenme verisi güncellenirken bir hata oluştu'
      });
    }
  };
  
  /**
   * API: Beslenme verisi silme
   * @route   DELETE /api/nutrition/:nutritionDataId
   * @access  Private
   */
  exports.apiDeleteNutrition = async (req, res) => {
    try {
      const { nutritionDataId } = req.params;
      
      // Beslenme verisini bul
      const nutritionData = await NutritionData.findById(nutritionDataId);
      
      if (!nutritionData) {
        return res.status(404).json({
          success: false,
          error: 'Beslenme verisi bulunamadı'
        });
      }
      
      // Aile üyesini kontrol et
      let familyMember;
      
      if (req.isAdmin) {
        familyMember = await FamilyMember.findById(nutritionData.familyMemberId);
      } else {
        familyMember = await FamilyMember.findOne({
          _id: nutritionData.familyMemberId,
          userId: req.user._id
        });
      }
      
      if (!familyMember) {
        return res.status(403).json({
          success: false,
          error: 'Bu beslenme verisini silme yetkiniz yok'
        });
      }
      
      // Beslenme verisini sil
      await nutritionData.remove();
      
      // Log kaydı
      logInfo('API: Beslenme verisi silindi', {
        userId: req.user._id,
        familyMemberId: nutritionData.familyMemberId,
        nutritionDataId: nutritionData._id
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
        error: 'Beslenme verisi silinirken bir hata oluştu'
      });
    }
  };
  
  /**
   * API: Beslenme istatistikleri
   * @route   GET /api/nutrition/:familyMemberId/stats
   * @access  Private
   */
  exports.apiGetNutritionStats = async (req, res) => {
    try {
      const { familyMemberId } = req.params;
      const { startDate, endDate, period = 'month' } = req.query;
      
      // Aile üyesini kontrol et
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
      
      // Tarih aralığını hesapla
      let dateRange = {};
      
      if (startDate && endDate) {
        dateRange.startDate = new Date(startDate);
        dateRange.endDate = new Date(endDate);
      } else {
        const now = new Date();
        
        if (period === 'week') {
          dateRange.startDate = new Date(now.setDate(now.getDate() - 7));
        } else if (period === 'month') {
          dateRange.startDate = new Date(now.setMonth(now.getMonth() - 1));
        } else if (period === 'quarter') {
          dateRange.startDate = new Date(now.setMonth(now.getMonth() - 3));
        } else if (period === 'year') {
          dateRange.startDate = new Date(now.setFullYear(now.getFullYear() - 1));
        } else {
          // Varsayılan olarak 1 ay
          dateRange.startDate = new Date(now.setMonth(now.getMonth() - 1));
        }
        dateRange.endDate = new Date();
      }
      
      // Beslenme verilerini getir
      const nutritionData = await NutritionData.find({
        familyMemberId,
        date: {
          $gte: dateRange.startDate,
          $lte: dateRange.endDate
        }
      }).sort({ date: 1 });
      
      // İstatistikleri hesapla
      // Toplam değerler ve ortalamalar
      const totalCalories = nutritionData.reduce((sum, data) => sum + (data.totalNutritionalValues.calories || 0), 0);
      const totalCarbs = nutritionData.reduce((sum, data) => sum + (data.totalNutritionalValues.carbs || 0), 0);
      const totalProteins = nutritionData.reduce((sum, data) => sum + (data.totalNutritionalValues.proteins || 0), 0);
      const totalFats = nutritionData.reduce((sum, data) => sum + (data.totalNutritionalValues.fats || 0), 0);
      
      // Tarih aralığındaki gün sayısı
      const dayCount = Math.ceil((dateRange.endDate - dateRange.startDate) / (1000 * 60 * 60 * 24));
      
      // Öğün tipine göre dağılım
      const mealTypeCounts = {};
      nutritionData.forEach(data => {
        if (!mealTypeCounts[data.mealType]) {
          mealTypeCounts[data.mealType] = 0;
        }
        mealTypeCounts[data.mealType]++;
      });
      
      // Günlük kalori grafiği için veriyi oluştur
      const caloriesByDay = {};
      nutritionData.forEach(data => {
        const dateKey = data.date.toISOString().split('T')[0]; // YYYY-MM-DD formatı
        if (!caloriesByDay[dateKey]) {
          caloriesByDay[dateKey] = 0;
        }
        caloriesByDay[dateKey] += data.totalNutritionalValues.calories || 0;
      });
      
      // Günlük kalori verilerini dizi formatına dönüştür
      const caloriesArray = Object.keys(caloriesByDay).map(date => ({
        date,
        calories: caloriesByDay[date]
      }));
      
      // Makro besin dağılımı
      const totalMacroCalories = (totalCarbs * 4) + (totalProteins * 4) + (totalFats * 9);
      let macroRatios = {
        carbs: 0,
        proteins: 0,
        fats: 0
      };
      
      if (totalMacroCalories > 0) {
        macroRatios = {
          carbs: parseFloat(((totalCarbs * 4) / totalMacroCalories * 100).toFixed(1)),
          proteins: parseFloat(((totalProteins * 4) / totalMacroCalories * 100).toFixed(1)),
          fats: parseFloat(((totalFats * 9) / totalMacroCalories * 100).toFixed(1))
        };
      }
      
      // İstatistik sonuçlarını hazırla
      const stats = {
        period: {
          start: dateRange.startDate,
          end: dateRange.endDate,
          days: dayCount
        },
        overview: {
          totalEntries: nutritionData.length,
          totalCalories,
          avgCaloriesPerDay: dayCount > 0 ? Math.round(totalCalories / dayCount) : 0,
          entriesPerDay: dayCount > 0 ? parseFloat((nutritionData.length / dayCount).toFixed(1)) : 0
        },
        macronutrients: {
          total: {
            carbs: totalCarbs,
            proteins: totalProteins,
            fats: totalFats
          },
          daily: {
            carbs: dayCount > 0 ? parseFloat((totalCarbs / dayCount).toFixed(1)) : 0,
            proteins: dayCount > 0 ? parseFloat((totalProteins / dayCount).toFixed(1)) : 0,
            fats: dayCount > 0 ? parseFloat((totalFats / dayCount).toFixed(1)) : 0
          },
          ratios: macroRatios
        },
        distribution: {
          mealTypes: mealTypeCounts
        },
        timeSeries: {
          caloriesByDay: caloriesArray
        }
      };
      
      // API yanıtı
      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      logError(error, req);
      
      res.status(500).json({
        success: false,
        error: 'Beslenme istatistikleri hesaplanırken bir hata oluştu'
      });
    }
  };
  
  module.exports = exports;
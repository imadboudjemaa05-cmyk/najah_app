import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Easing,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  StatusBar,
  SafeAreaView,
  Modal,
  ActivityIndicator,
} from 'react-native';

const { height } = Dimensions.get('window');
const SAFE_TOP = Platform.OS === 'android' ? (StatusBar.currentHeight || 28) + 12 : 16;
const SAFE_BOTTOM = Platform.OS === 'ios' ? 34 : 24;

// ============================================================================
// 1. نظام التخزين الدائم الآمن
// ============================================================================
const STORAGE_KEY = 'NAJAH_APP_DATA_V2';
const memoryFallback = {};

const Storage = {
  save: (data) => {
    try {
      const serialized = JSON.stringify(data);
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(STORAGE_KEY, serialized);
      } else {
        memoryFallback[STORAGE_KEY] = serialized;
      }
    } catch (e) {}
  },
  load: () => {
    try {
      let raw = null;
      if (typeof window !== 'undefined' && window.localStorage) {
        raw = window.localStorage.getItem(STORAGE_KEY);
      } else {
        raw = memoryFallback[STORAGE_KEY] || null;
      }
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  },
  clear: () => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(STORAGE_KEY);
      }
      delete memoryFallback[STORAGE_KEY];
    } catch (e) {}
  },
};

// ============================================================================
// 2. البيانات والثوابت
// ============================================================================
const QUOTES = [
  {
    text: '«قليلٌ دائمٌ خيرٌ من كثيرٍ منقطع»',
    author: 'حديث شريف — قاعدة الاستمرارية',
  },
  {
    text: '«النجاح هو مجموع مجهودات صغيرة تتكرر يوماً بعد يوم»',
    author: 'روبرت كولير',
  },
  {
    text: '«من حاسب نفسه قبل أن يُحاسب، خفّ عليه الحساب غداً»',
    author: 'عمر بن الخطاب رضي الله عنه',
  },
  {
    text: '«البدايات الصغيرة الصادقة تصنع التحولات العظيمة»',
    author: 'تطبيق نجاح',
  },
];

const PLANT_STAGES = [
  { minXp: 0, icon: '🌰', name: 'بذرة البداية', desc: 'أنجز أول مهمة لتسقي بذرتك وتبدأ الحياة!' },
  { minXp: 30, icon: '🌱', name: 'برعم صاعد', desc: 'رائع! جذور الانضباط بدأت تترسخ.' },
  { minXp: 80, icon: '🌿', name: 'شتلة خضراء', desc: 'استمراريتك تصنع فارقاً حقيقياً يوماً بعد يوم.' },
  { minXp: 160, icon: '🌳', name: 'شجرة راسخة', desc: 'قوة عاداتك أصبحت واضحة وثابتة.' },
  { minXp: 300, icon: '🌴', name: 'شجرة النجاح المثمرة', desc: 'لقد بلغت قمة الانضباط وحصدت ثمار جهدك!' },
];

const SPACED_INTERVALS = [1, 3, 7, 14, 30];

// ============================================================================
// 3. مولّد المؤثرات الصوتية الذكي
// ============================================================================
function playSoundEffect(type = 'intro') {
  try {
    if (typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext)) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      const ctx = new AudioCtx();

      let notes = [523.25, 659.25, 783.99, 1046.5];
      if (type === 'task') notes = [587.33, 880.0];
      else if (type === 'levelup') notes = [523.25, 659.25, 783.99, 1046.5, 1318.5];

      notes.forEach((freq, index) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + index * 0.12);

        gain.gain.setValueAtTime(0.001, ctx.currentTime + index * 0.12);
        gain.gain.exponentialRampToValueAtTime(0.14, ctx.currentTime + index * 0.12 + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + index * 0.12 + 0.7);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(ctx.currentTime + index * 0.12);
        osc.stop(ctx.currentTime + index * 0.12 + 0.75);
      });
    }
  } catch (e) {}
}

// ============================================================================
// 4. شاشة الدخول ثلاثية الأبعاد (3D Splash Screen)
// ============================================================================
function SplashScreen({ onFinish }) {
  const [quote] = useState(() => QUOTES[Math.floor(Math.random() * QUOTES.length)]);
  const rotateY = useRef(new Animated.Value(0)).current;
  const rotateX = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.2)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const quoteOpacity = useRef(new Animated.Value(0)).current;
  const quoteTranslateY = useRef(new Animated.Value(25)).current;
  const btnOpacity = useRef(new Animated.Value(0)).current;
  const ringScale = useRef(new Animated.Value(0.4)).current;
  const ringOpacity = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    const timer = setTimeout(() => {
      playSoundEffect('intro');
      Animated.sequence([
        Animated.parallel([
          Animated.timing(opacityAnim, { toValue: 1, duration: 1100, useNativeDriver: true }),
          Animated.spring(scaleAnim, { toValue: 1, friction: 5, tension: 35, useNativeDriver: true }),
          Animated.timing(rotateY, { toValue: 1, duration: 2200, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
          Animated.timing(rotateX, { toValue: 1, duration: 2200, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
          Animated.timing(ringScale, { toValue: 2.2, duration: 2400, easing: Easing.out(Easing.ease), useNativeDriver: true }),
          Animated.timing(ringOpacity, { toValue: 0, duration: 2400, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(quoteOpacity, { toValue: 1, duration: 900, useNativeDriver: true }),
          Animated.timing(quoteTranslateY, { toValue: 0, duration: 900, easing: Easing.out(Easing.quad), useNativeDriver: true }),
          Animated.timing(btnOpacity, { toValue: 1, duration: 900, useNativeDriver: true }),
        ]),
      ]).start();
    }, 300);
    return () => clearTimeout(timer);
  }, []);

  const handleEnterApp = () => {
    playSoundEffect('intro');
    Animated.parallel([
      Animated.timing(scaleAnim, { toValue: 7, duration: 600, easing: Easing.in(Easing.exp), useNativeDriver: true }),
      Animated.timing(opacityAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
      Animated.timing(quoteOpacity, { toValue: 0, duration: 300, useNativeDriver: true }),
      Animated.timing(btnOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start(() => {
      if (onFinish) onFinish();
    });
  };

  const spinY = rotateY.interpolate({ inputRange: [0, 0.5, 1], outputRange: ['-85deg', '18deg', '0deg'] });
  const spinX = rotateX.interpolate({ inputRange: [0, 0.5, 1], outputRange: ['55deg', '-12deg', '0deg'] });

  return (
    <SafeAreaView style={splashStyles.safeArea}>
      <View style={splashStyles.container}>
        <Animated.View style={[splashStyles.glowRing, { transform: [{ scale: ringScale }], opacity: ringOpacity }]} />
        <View style={splashStyles.centerSection}>
          <Animated.View
            style={[
              splashStyles.word3DWrapper,
              { opacity: opacityAnim, transform: [{ perspective: 1000 }, { rotateY: spinY }, { rotateX: spinX }, { scale: scaleAnim }] },
            ]}
          >
            <Text style={[splashStyles.titleBase, splashStyles.layerDepth4]}>نَجَاح</Text>
            <Text style={[splashStyles.titleBase, splashStyles.layerDepth3]}>نَجَاح</Text>
            <Text style={[splashStyles.titleBase, splashStyles.layerDepth2]}>نَجَاح</Text>
            <Text style={[splashStyles.titleBase, splashStyles.layerDepth1]}>نَجَاح</Text>
            <Text style={[splashStyles.titleBase, splashStyles.titleFront]}>نَجَاح</Text>
            <View style={splashStyles.goldLine} />
          </Animated.View>
        </View>

        <View style={splashStyles.bottomSection}>
          <Animated.View style={[splashStyles.quoteContainer, { opacity: quoteOpacity, transform: [{ translateY: quoteTranslateY }] }]}>
            <Text style={splashStyles.quoteText}>{quote.text}</Text>
            <Text style={splashStyles.quoteAuthor}>{quote.author}</Text>
          </Animated.View>
          <Animated.View style={[splashStyles.btnContainer, { opacity: btnOpacity }]}>
            <TouchableOpacity style={splashStyles.enterBtn} onPress={handleEnterApp} activeOpacity={0.8}>
              <Text style={splashStyles.enterBtnText}>ابدأ رحلتك الآن ✨</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </View>
    </SafeAreaView>
  );
}

// ============================================================================
// 5. شاشة تسجيل الدخول وإنشاء الحساب (Auth Screen)
// ============================================================================
function AuthScreen({ onLoginSuccess, onReplaySplash }) {
  const [isLoginMode, setIsLoginMode] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const showMessage = (title, msg) => {
    if (Platform.OS === 'web') window.alert(`${title}: ${msg}`);
    else Alert.alert(title, msg);
  };

  const handleEmailAuth = () => {
    if (!email.trim() || !email.includes('@')) return showMessage('تنبيه', 'يرجى إدخال بريد إلكتروني صحيح.');
    if (password.length < 6) return showMessage('تنبيه', 'يجب أن تتكون كلمة المرور من 6 أحرف على الأقل.');
    if (!isLoginMode && !name.trim()) return showMessage('تنبيه', 'يرجى إدخال اسمك لكي يناديك به المدرب الذكي.');

    const userDisplayName = !isLoginMode ? name.trim() : email.split('@')[0];
    onLoginSuccess({ name: userDisplayName, email: email.trim(), provider: 'email' });
  };

  return (
    <SafeAreaView style={authStyles.safeArea}>
      <KeyboardAvoidingView style={authStyles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={authStyles.topBar}>
          <TouchableOpacity style={authStyles.replayTopBtn} onPress={onReplaySplash}>
            <Text style={authStyles.replayTopText}>↺ إعادة عرض واجهة البداية 3D</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={authStyles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={authStyles.cardWrapper}>
            <View style={authStyles.headerSection}>
              <View style={authStyles.logoBadge}>
                <Text style={authStyles.logoIcon}>🌱</Text>
              </View>
              <Text style={authStyles.appTitle}>نَجَاح</Text>
              <Text style={authStyles.headerSubtitle}>
                {isLoginMode ? 'أهلاً بعودتك! سجّل دخولك لمتابعة نمو نبتتك' : 'ابدأ رحلتك اليوم.. كل إنجاز يزرع بذرة جديدة'}
              </Text>
            </View>

            <View style={authStyles.toggleContainer}>
              <TouchableOpacity style={[authStyles.toggleBtn, !isLoginMode && authStyles.toggleBtnActive]} onPress={() => setIsLoginMode(false)}>
                <Text style={[authStyles.toggleText, !isLoginMode && authStyles.toggleTextActive]}>حساب جديد</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[authStyles.toggleBtn, isLoginMode && authStyles.toggleBtnActive]} onPress={() => setIsLoginMode(true)}>
                <Text style={[authStyles.toggleText, isLoginMode && authStyles.toggleTextActive]}>تسجيل الدخول</Text>
              </TouchableOpacity>
            </View>

            <View style={authStyles.formSection}>
              {!isLoginMode && (
                <View style={authStyles.inputGroup}>
                  <Text style={authStyles.label}>الاسم الكامل (أو اللقب)</Text>
                  <TextInput style={authStyles.input} placeholder="مثال: عماد" placeholderTextColor="#6B7280" value={name} onChangeText={setName} textAlign="right" />
                </View>
              )}

              <View style={authStyles.inputGroup}>
                <Text style={authStyles.label}>البريد الإلكتروني</Text>
                <TextInput style={authStyles.input} placeholder="example@gmail.com" placeholderTextColor="#6B7280" keyboardType="email-address" autoCapitalize="none" value={email} onChangeText={setEmail} textAlign="right" />
              </View>

              <View style={authStyles.inputGroup}>
                <Text style={authStyles.label}>كلمة المرور</Text>
                <View style={authStyles.passwordWrapper}>
                  <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={authStyles.eyeBtn}>
                    <Text style={authStyles.eyeText}>{showPassword ? 'إخفاء' : 'إظهار'}</Text>
                  </TouchableOpacity>
                  <TextInput style={authStyles.passwordInput} placeholder="••••••••" placeholderTextColor="#6B7280" secureTextEntry={!showPassword} value={password} onChangeText={setPassword} textAlign="right" />
                </View>
              </View>

              <TouchableOpacity style={authStyles.primaryBtn} onPress={handleEmailAuth}>
                <Text style={authStyles.primaryBtnText}>{isLoginMode ? 'دخول إلى مساحتي' : 'إنشاء حسابي وبدء الرحلة'}</Text>
              </TouchableOpacity>
            </View>

            <View style={authStyles.dividerRow}>
              <View style={authStyles.dividerLine} />
              <Text style={authStyles.dividerText}>أو المتابعة السريعة عبر</Text>
              <View style={authStyles.dividerLine} />
            </View>

            <View style={authStyles.socialRow}>
              <TouchableOpacity style={[authStyles.socialBtn, authStyles.googleBtn]} onPress={() => onLoginSuccess({ name: 'بطل النجاح', email: 'user@google.com', provider: 'Google' })}>
                <Text style={authStyles.googleIcon}>G</Text>
                <Text style={authStyles.googleText}>جوجل</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[authStyles.socialBtn, authStyles.facebookBtn]} onPress={() => onLoginSuccess({ name: 'مستخدم فيسبوك', email: 'user@facebook.com', provider: 'Facebook' })}>
                <Text style={authStyles.facebookIcon}>f</Text>
                <Text style={authStyles.facebookText}>فيسبوك</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ============================================================================
// 6. لوحة التحكم الرئيسية (مع الذكاء الاصطناعي الحقيقي Gemini API)
// ============================================================================
function MainDashboard({ user, initialData, onLogout }) {
  const [xp, setXp] = useState(initialData?.xp ?? 15);
  const [activeTab, setActiveTab] = useState('daily');
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [isSpacedRepetition, setIsSpacedRepetition] = useState(false);

  // مفتاح Gemini API (يُحفظ محلياً بأمان)
  const [apiKey, setApiKey] = useState(initialData?.apiKey ?? '');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const [tasks, setTasks] = useState(
    initialData?.tasks ?? [
      { id: '1', title: 'مراجعة أخطاء الأمس وتصحيحها', type: 'daily', completed: false, xpValue: 15, spacedLevel: 1, nextReview: 'بعد 1 يوم' },
      { id: '2', title: 'إنجاز جلسة تركيز لمدة 45 دقيقة', type: 'daily', completed: false, xpValue: 15, spacedLevel: 0, nextReview: null },
      { id: '3', title: 'تقييم التقدم الأسبوعي وترتيب الأولويات', type: 'weekly', completed: false, xpValue: 40, spacedLevel: 0, nextReview: null },
      { id: '4', title: 'تحقيق الهدف السنوي الكبير بامتياز', type: 'yearly', completed: false, xpValue: 100, spacedLevel: 0, nextReview: null },
    ]
  );

  const [mistakesLog, setMistakesLog] = useState(
    initialData?.mistakesLog ?? [
      { id: 'm1', text: 'تأجيل المهام الصعبة إلى آخر اليوم', date: 'مثال توضيحي', resolved: false },
    ]
  );

  useEffect(() => {
    Storage.save({ user, xp, tasks, mistakesLog, apiKey });
  }, [user, xp, tasks, mistakesLog, apiKey]);

  // حالات المدرب الذكي
  const [isCoachOpen, setIsCoachOpen] = useState(false);
  const [daySummary, setDaySummary] = useState('');
  const [dayMistakes, setDayMistakes] = useState('');
  const [coachReply, setCoachReply] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const plantScale = useRef(new Animated.Value(1)).current;

  const currentStageIndex = PLANT_STAGES.reduce((acc, stage, idx) => (xp >= stage.minXp ? idx : acc), 0);
  const currentStage = PLANT_STAGES[currentStageIndex];
  const nextStage = PLANT_STAGES[currentStageIndex + 1] || null;
  const progressPercent = nextStage
    ? Math.min(100, Math.round(((xp - currentStage.minXp) / (nextStage.minXp - currentStage.minXp)) * 100))
    : 100;

  const animatePlant = () => {
    Animated.sequence([
      Animated.timing(plantScale, { toValue: 1.25, duration: 250, useNativeDriver: true }),
      Animated.spring(plantScale, { toValue: 1, friction: 4, useNativeDriver: true }),
    ]).start();
  };

  const handleAddItem = () => {
    if (!newTaskTitle.trim()) return;

    if (activeTab === 'mistakes') {
      const todayStr = new Date().toLocaleDateString('ar-DZ');
      setMistakesLog([
        { id: Date.now().toString(), text: newTaskTitle.trim(), date: todayStr, resolved: false },
        ...mistakesLog,
      ]);
      setNewTaskTitle('');
      return;
    }

    const xpMap = { daily: 15, weekly: 40, yearly: 100 };
    const newTask = {
      id: Date.now().toString(),
      title: newTaskTitle.trim(),
      type: activeTab,
      completed: false,
      xpValue: xpMap[activeTab],
      spacedLevel: isSpacedRepetition ? 1 : 0,
      nextReview: isSpacedRepetition ? `بعد ${SPACED_INTERVALS[0]} يوم` : null,
    };
    setTasks([newTask, ...tasks]);
    setNewTaskTitle('');
    setIsSpacedRepetition(false);
  };

  const deleteTask = (taskId) => setTasks((prev) => prev.filter((t) => t.id !== taskId));

  const toggleTask = (taskId) => {
    setTasks((prevTasks) =>
      prevTasks.map((task) => {
        if (task.id !== taskId) return task;
        const becomingCompleted = !task.completed;

        if (becomingCompleted) {
          const newXp = xp + task.xpValue;
          const oldStageIdx = currentStageIndex;
          const newStageIdx = PLANT_STAGES.reduce((acc, s, i) => (newXp >= s.minXp ? i : acc), 0);

          setXp(newXp);
          animatePlant();
          playSoundEffect(newStageIdx > oldStageIdx ? 'levelup' : 'task');

          let updatedLevel = task.spacedLevel;
          let updatedReview = task.nextReview;
          if (task.spacedLevel > 0) {
            const nextInterval = SPACED_INTERVALS[Math.min(task.spacedLevel, SPACED_INTERVALS.length - 1)];
            updatedLevel = task.spacedLevel + 1;
            updatedReview = `المراجعة القادمة: بعد ${nextInterval} أيام`;
          }

          return { ...task, completed: true, spacedLevel: updatedLevel, nextReview: updatedReview };
        } else {
          setXp(Math.max(0, xp - task.xpValue));
          return { ...task, completed: false };
        }
      })
    );
  };

  const toggleMistakeResolved = (mistakeId) => {
    setMistakesLog((prev) =>
      prev.map((m) => {
        if (m.id !== mistakeId) return m;
        const becomingResolved = !m.resolved;
        if (becomingResolved) {
          setXp((prevXp) => prevXp + 20);
          animatePlant();
          playSoundEffect('task');
        } else {
          setXp((prevXp) => Math.max(0, prevXp - 20));
        }
        return { ...m, resolved: becomingResolved };
      })
    );
  };

  const deleteMistake = (mistakeId) => setMistakesLog((prev) => prev.filter((m) => m.id !== mistakeId));

  // الاتصال بالذكاء الاصطناعي الحقيقي (Gemini API) أو التحليل المحلي الذكي
  const handleAnalyzeDay = async () => {
    if (!daySummary.trim() && !dayMistakes.trim()) {
      if (Platform.OS === 'web') window.alert('اكتب ولو سطراً واحداً عن يومك أو أخطائك ليحللها المدرب الذكي.');
      else Alert.alert('تنبيه', 'اكتب ولو سطراً واحداً عن يومك أو أخطائك ليحللها المدرب الذكي.');
      return;
    }

    const completedToday = tasks.filter((t) => t.type === 'daily' && t.completed).length;
    const totalToday = tasks.filter((t) => t.type === 'daily').length;

    // 1. إذا كان المستخدم قد أدخل مفتاح Gemini API، نرسل الطلب مباشرة لنموذج Gemini
    if (apiKey.trim()) {
      setIsAnalyzing(true);
      try {
        const prompt = `أنت مدرب شخصي واقعي، داعم، وصريح (لا تجامل على التقصير وتهنئ بصدق عند الإنجاز) في تطبيق "نجاح".
اسم المستخدم: ${user.name}.
إنجازه اليوم في المهام اليومية: أنجز ${completedToday} من أصل ${totalToday}.
ملخص يومه كما كتبه: "${daySummary.trim() || 'لم يكتب ملخصاً'}".
الأخطاء أو العقبات التي واجهها اليوم: "${dayMistakes.trim() || 'لم يذكر أخطاء'}".

المطلوب منك الرد بصيغة JSON حصراً بدون أي نص إضافي خارج JSON، بهذا الشكل الدقيق:
{
  "feedback": "رسالة تقييم وتوجيه واقعية ومخصصة لما كتبه (3 إلى 4 أسطر)",
  "tasks": ["مهمة مقترحة للغد 1", "مهمة مقترحة للغد 2", "مهمة مقترحة للغد 3"]
}`;

        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey.trim()}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: { responseMimeType: 'application/json' },
            }),
          }
        );

        const data = await response.json();
        const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;

        if (rawText) {
          const parsed = JSON.parse(rawText);
          setCoachReply({
            feedback: parsed.feedback,
            suggestedTasks: parsed.tasks || [],
            isRealAI: true,
          });
          setIsAnalyzing(false);
          return;
        }
      } catch (err) {
        console.log('Fallback to local AI due to network/key:', err);
      }
      setIsAnalyzing(false);
    }

    // 2. التحليل المحلي الاحتياطي (في حال عدم وضع مفتاح API أو انقطاع الإنترنت)
    let feedback = '';
    if (completedToday === totalToday && totalToday > 0) {
      feedback = `أداء استثنائي يا ${user.name}! أتممت جميع مهامك اليومية (${completedToday}/${totalToday}). هذا الانضباط هو ما يصنع الفارق الحقيقي.`;
    } else if (completedToday > 0) {
      feedback = `عمل جيد وواقعي يا ${user.name}. أنجزت (${completedToday} من ${totalToday}) مهام اليوم. لا بأس بالتعثر البسيط، المهم أنك لم تتوقف.`;
    } else {
      feedback = `بصراحة وبدون مجاملة يا ${user.name}، اليوم كان بطيئاً ولم تنجز مهامك اليومية بعد. لنحوّل هذا التقصير إلى خطة عملية للغد فوراً.`;
    }

    const suggestedTasks = [];
    if (dayMistakes.trim()) {
      suggestedTasks.push(`معالجة وتصحيح خطأ اليوم: "${dayMistakes.trim()}"`);
    }
    suggestedTasks.push('تخصيص أول 30 دقيقة صباحاً لأهم مهمة قبل أي مشتتات');
    suggestedTasks.push('مراجعة سريعة بنظام التكرار المتباعد قبل النوم');

    setCoachReply({ feedback, suggestedTasks, isRealAI: false });
  };

  const acceptSuggestedTasks = () => {
    if (!coachReply) return;

    const added = coachReply.suggestedTasks.map((title, idx) => ({
      id: `${Date.now()}_${idx}`,
      title,
      type: 'daily',
      completed: false,
      xpValue: 15,
      spacedLevel: idx === 0 ? 1 : 0,
      nextReview: idx === 0 ? 'بعد 1 يوم' : null,
    }));
    setTasks([...added, ...tasks]);

    if (dayMistakes.trim()) {
      const todayStr = new Date().toLocaleDateString('ar-DZ');
      setMistakesLog([
        { id: `m_${Date.now()}`, text: dayMistakes.trim(), date: todayStr, resolved: false },
        ...mistakesLog,
      ]);
    }

    setCoachReply(null);
    setDaySummary('');
    setDayMistakes('');
    setIsCoachOpen(false);
    setActiveTab('daily');
  };

  const filteredTasks = tasks.filter((t) => t.type === activeTab);
  const completedCount = tasks.filter((t) => t.completed).length;

  return (
    <SafeAreaView style={dashStyles.safeArea}>
      <ScrollView contentContainerStyle={dashStyles.scrollContainer} showsVerticalScrollIndicator={false}>
        {/* الشريط العلوي مع زر إعدادات الذكاء الاصطناعي */}
        <View style={dashStyles.headerRow}>
          <View style={dashStyles.topActions}>
            <TouchableOpacity style={dashStyles.logoutPill} onPress={onLogout}>
              <Text style={dashStyles.logoutText}>خروج</Text>
            </TouchableOpacity>
            <TouchableOpacity style={dashStyles.settingsPill} onPress={() => setIsSettingsOpen(true)}>
              <Text style={dashStyles.settingsText}>{apiKey ? '⚙️ AI متصل' : '⚙️ ربط AI'}</Text>
            </TouchableOpacity>
          </View>

          <View style={dashStyles.userInfo}>
            <Text style={dashStyles.greetingText}>أهلاً بك، {user.name} 👋</Text>
            <Text style={dashStyles.dateSub}>
              المنجز: {completedCount}/{tasks.length} • {apiKey ? 'Gemini مفعّل' : 'الوضع المحلي'}
            </Text>
          </View>
        </View>

        {/* بطاقة النبتة التفاعلية */}
        <View style={dashStyles.plantCard}>
          <View style={dashStyles.plantTopRow}>
            <View style={dashStyles.xpBadge}>
              <Text style={dashStyles.xpText}>{xp} XP ✨</Text>
            </View>
            <Text style={dashStyles.stageBadge}>{currentStage.name}</Text>
          </View>

          <Animated.View style={[dashStyles.plantAvatarCircle, { transform: [{ scale: plantScale }] }]}>
            <Text style={dashStyles.plantEmoji}>{currentStage.icon}</Text>
          </Animated.View>

          <Text style={dashStyles.plantDesc}>{currentStage.desc}</Text>

          <View style={dashStyles.progressBarBg}>
            <View style={[dashStyles.progressBarFill, { width: `${progressPercent}%` }]} />
          </View>
          <Text style={dashStyles.progressLabel}>
            {nextStage ? `متبقي ${nextStage.minXp - xp} نقطة للوصول إلى: ${nextStage.name} ${nextStage.icon}` : 'بلغت أعلى مستوى للنمو!'}
          </Text>
        </View>

        {/* زر المدرب الذكي */}
        <TouchableOpacity style={dashStyles.aiCoachBanner} onPress={() => setIsCoachOpen(true)} activeOpacity={0.85}>
          <View style={dashStyles.aiBannerContent}>
            <Text style={dashStyles.aiBannerTitle}>🤖 المدرب الذكي: كيف كان يومك؟</Text>
            <Text style={dashStyles.aiBannerSub}>اضغط لمراجعة أخطائك اليوم وتحديد مهام الغد بالذكاء الاصطناعي</Text>
          </View>
        </TouchableOpacity>

        {/* التبويبات الأربعة */}
        <View style={dashStyles.tabsRow}>
          {[
            { key: 'mistakes', label: 'أخطائي 📓' },
            { key: 'yearly', label: 'سنوية 🎯' },
            { key: 'weekly', label: 'أسبوعية 📅' },
            { key: 'daily', label: 'يومية ⚡' },
          ].map((tab) => (
            <TouchableOpacity
              key={tab.key}
              style={[dashStyles.tabBtn, activeTab === tab.key && dashStyles.tabBtnActive]}
              onPress={() => setActiveTab(tab.key)}
            >
              <Text style={[dashStyles.tabText, activeTab === tab.key && dashStyles.tabTextActive]}>{tab.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* صندوق الإضافة */}
        <View style={dashStyles.addTaskBox}>
          <View style={dashStyles.inputRow}>
            <TouchableOpacity style={dashStyles.addBtn} onPress={handleAddItem}>
              <Text style={dashStyles.addBtnText}>+ أضف</Text>
            </TouchableOpacity>
            <TextInput
              style={dashStyles.taskInput}
              placeholder={
                activeTab === 'daily'
                  ? 'أضف مهمة لليوم...'
                  : activeTab === 'weekly'
                  ? 'أضف هدفاً لهذا الأسبوع...'
                  : activeTab === 'yearly'
                  ? 'أضف هدفاً سنوياً كبيراً...'
                  : 'سجّل خطأً تعلمت منه اليوم...'
              }
              placeholderTextColor="#6B7280"
              value={newTaskTitle}
              onChangeText={setNewTaskTitle}
              textAlign="right"
            />
          </View>

          {activeTab !== 'mistakes' && (
            <TouchableOpacity
              style={dashStyles.spacedToggleRow}
              onPress={() => setIsSpacedRepetition(!isSpacedRepetition)}
            >
              <Text style={[dashStyles.spacedToggleText, isSpacedRepetition && { color: '#F59E0B' }]}>
                {isSpacedRepetition ? '☑ مفعّل: التكرار المتباعد (مراجعة بعد 1، 3، 7، 30 يوماً)' : '☐ تفعيل التكرار المتباعد لترسيخ هذه المهمة/المراجعة'}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* القائمة */}
        {activeTab === 'mistakes' ? (
          <View style={dashStyles.tasksList}>
            <Text style={dashStyles.sectionHint}>
              سجل المحاسبة الذاتية: كل خطأ تتجاوزه يمنح نبتتك +20 XP 🌱
            </Text>
            {mistakesLog.length === 0 ? (
              <Text style={dashStyles.emptyText}>سجلك نظيف حالياً! أضف أي خطأ تريد تجنبه مستقبلاً.</Text>
            ) : (
              mistakesLog.map((m) => (
                <View key={m.id} style={[dashStyles.taskCard, m.resolved && dashStyles.taskCardCompleted]}>
                  <View style={dashStyles.taskLeft}>
                    <TouchableOpacity onPress={() => deleteMistake(m.id)} style={dashStyles.deleteIconBtn}>
                      <Text style={dashStyles.deleteIconText}>✕</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => toggleMistakeResolved(m.id)}
                      style={[dashStyles.checkbox, m.resolved && dashStyles.checkboxChecked]}
                    >
                      {m.resolved && <Text style={dashStyles.checkMark}>✓</Text>}
                    </TouchableOpacity>
                  </View>

                  <View style={dashStyles.taskRight}>
                    <Text style={[dashStyles.taskTitle, m.resolved && dashStyles.taskTitleCompleted]}>{m.text}</Text>
                    <Text style={dashStyles.spacedBadge}>
                      {m.resolved ? '✅ تم تجاوز هذا الخطأ (+20 XP)' : `📅 سُجّل بتاريخ: ${m.date}`}
                    </Text>
                  </View>
                </View>
              ))
            )}
          </View>
        ) : (
          <View style={dashStyles.tasksList}>
            {filteredTasks.length === 0 ? (
              <Text style={dashStyles.emptyText}>لا توجد مهام في هذا القسم حالياً. أضف مهمتك الأولى!</Text>
            ) : (
              filteredTasks.map((task) => (
                <View key={task.id} style={[dashStyles.taskCard, task.completed && dashStyles.taskCardCompleted]}>
                  <View style={dashStyles.taskLeft}>
                    <TouchableOpacity onPress={() => deleteTask(task.id)} style={dashStyles.deleteIconBtn}>
                      <Text style={dashStyles.deleteIconText}>✕</Text>
                    </TouchableOpacity>
                    <Text style={dashStyles.taskXp}>+{task.xpValue}</Text>
                    <TouchableOpacity
                      onPress={() => toggleTask(task.id)}
                      style={[dashStyles.checkbox, task.completed && dashStyles.checkboxChecked]}
                    >
                      {task.completed && <Text style={dashStyles.checkMark}>✓</Text>}
                    </TouchableOpacity>
                  </View>

                  <TouchableOpacity style={dashStyles.taskRight} onPress={() => toggleTask(task.id)}>
                    <Text style={[dashStyles.taskTitle, task.completed && dashStyles.taskTitleCompleted]}>
                      {task.title}
                    </Text>
                    {task.nextReview && <Text style={dashStyles.spacedBadge}>🔁 {task.nextReview}</Text>}
                  </TouchableOpacity>
                </View>
              ))
            )}
          </View>
        )}
      </ScrollView>

      {/* نافذة المدرب الذكي */}
      <Modal visible={isCoachOpen} animationType="slide" transparent={true}>
        <View style={modalStyles.overlay}>
          <View style={modalStyles.modalCard}>
            <View style={modalStyles.modalHeader}>
              <TouchableOpacity onPress={() => setIsCoachOpen(false)}>
                <Text style={modalStyles.closeText}>✕ إغلاق</Text>
              </TouchableOpacity>
              <Text style={modalStyles.modalTitle}>🤖 جلسة المحاسبة الذكية</Text>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={modalStyles.questionLabel}>1. كيف كان يومك اليوم باختصار؟</Text>
              <TextInput
                style={modalStyles.textArea}
                placeholder="مثال: أنجزت مراجعة الفيزياء لكنني شعرت بالتعب مساءً..."
                placeholderTextColor="#6B7280"
                multiline
                value={daySummary}
                onChangeText={setDaySummary}
                textAlign="right"
              />

              <Text style={modalStyles.questionLabel}>2. ما هو الخطأ أو التشتت الذي تريد تجنبه غداً؟</Text>
              <TextInput
                style={modalStyles.textArea}
                placeholder="مثال: تضييع ساعة على الهاتف قبل البدء..."
                placeholderTextColor="#6B7280"
                multiline
                value={dayMistakes}
                onChangeText={setDayMistakes}
                textAlign="right"
              />

              <TouchableOpacity style={modalStyles.analyzeBtn} onPress={handleAnalyzeDay} disabled={isAnalyzing}>
                {isAnalyzing ? (
                  <ActivityIndicator color="#090D16" />
                ) : (
                  <Text style={modalStyles.analyzeBtnText}>
                    {apiKey ? 'تحليل بالذكاء الاصطناعي Gemini ✨' : 'تحليل اليوم واقتراح مهام الغد ✨'}
                  </Text>
                )}
              </TouchableOpacity>

              {coachReply && (
                <View style={modalStyles.replyBox}>
                  {coachReply.isRealAI && (
                    <Text style={modalStyles.aiTag}>✨ رد مخصص من Gemini AI</Text>
                  )}
                  <Text style={modalStyles.replyFeedback}>{coachReply.feedback}</Text>
                  <Text style={modalStyles.suggestedHeader}>📋 خطة الغد المقترحة لك:</Text>
                  {coachReply.suggestedTasks.map((st, i) => (
                    <Text key={i} style={modalStyles.suggestedItem}>• {st}</Text>
                  ))}

                  <TouchableOpacity style={modalStyles.acceptBtn} onPress={acceptSuggestedTasks}>
                    <Text style={modalStyles.acceptBtnText}>اعتماد وإضافة مهام الغد وحفظ الخطأ ✓</Text>
                  </TouchableOpacity>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* نافذة إعدادات مفتاح الذكاء الاصطناعي */}
      <Modal visible={isSettingsOpen} animationType="fade" transparent={true}>
        <View style={modalStyles.overlay}>
          <View style={modalStyles.modalCard}>
            <View style={modalStyles.modalHeader}>
              <TouchableOpacity onPress={() => setIsSettingsOpen(false)}>
                <Text style={modalStyles.closeText}>✕ إغلاق</Text>
              </TouchableOpacity>
              <Text style={modalStyles.modalTitle}>⚙️ إعدادات الذكاء الاصطناعي</Text>
            </View>

            <Text style={modalStyles.questionLabel}>مفتاح Google Gemini API (اختياري):</Text>
            <Text style={modalStyles.helperDesc}>
              يمكنك الحصول على مفتاح مجاني من موقع Google AI Studio ولصقه هنا ليتفاعل معك المدرب الذكي بذكاء اصطناعي كامل.
            </Text>
            <TextInput
              style={dashStyles.taskInput}
              placeholder="AIzaSy..."
              placeholderTextColor="#6B7280"
              value={apiKey}
              onChangeText={setApiKey}
              autoCapitalize="none"
            />
            <TouchableOpacity style={modalStyles.acceptBtn} onPress={() => setIsSettingsOpen(false)}>
              <Text style={modalStyles.acceptBtnText}>حفظ الإعدادات ✓</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ============================================================================
// 7. التطبيق الرئيسي (App)
// ============================================================================
export default function App() {
  const savedData = useRef(Storage.load()).current;
  const [isSplashDone, setIsSplashDone] = useState(false);
  const [user, setUser] = useState(savedData?.user || null);

  const handleLogout = () => {
    Storage.clear();
    setUser(null);
  };

  if (!isSplashDone) {
    return (
      <>
        <StatusBar barStyle="light-content" backgroundColor="#090D16" translucent />
        <SplashScreen onFinish={() => setIsSplashDone(true)} />
      </>
    );
  }

  if (!user) {
    return (
      <>
        <StatusBar barStyle="light-content" backgroundColor="#090D16" translucent />
        <AuthScreen
          onLoginSuccess={(userData) => setUser(userData)}
          onReplaySplash={() => setIsSplashDone(false)}
        />
      </>
    );
  }

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor="#090D16" translucent />
      <MainDashboard user={user} initialData={savedData} onLogout={handleLogout} />
    </>
  );
}

// ============================================================================
// 8. التنسيقات (Styles)
// ============================================================================
const splashStyles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#090D16', paddingTop: SAFE_TOP, paddingBottom: SAFE_BOTTOM },
  container: { flex: 1, alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, paddingVertical: 20 },
  glowRing: { position: 'absolute', top: height * 0.25, width: 240, height: 240, borderRadius: 120, borderWidth: 2, borderColor: '#10B981', backgroundColor: 'rgba(16, 185, 129, 0.1)' },
  centerSection: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  word3DWrapper: { alignItems: 'center', justifyContent: 'center' },
  titleBase: { fontSize: 80, fontWeight: '900', letterSpacing: 4, textAlign: 'center' },
  layerDepth4: { position: 'absolute', color: '#022C22', transform: [{ translateX: 8 }, { translateY: 11 }] },
  layerDepth3: { position: 'absolute', color: '#064E3B', transform: [{ translateX: 6 }, { translateY: 8 }] },
  layerDepth2: { position: 'absolute', color: '#047857', transform: [{ translateX: 4 }, { translateY: 5 }] },
  layerDepth1: { position: 'absolute', color: '#D97706', transform: [{ translateX: 2 }, { translateY: 2 }] },
  titleFront: { color: '#ECFDF5', textShadowColor: 'rgba(16, 185, 129, 0.85)', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 24 },
  goldLine: { marginTop: 14, width: 120, height: 3.5, borderRadius: 2, backgroundColor: '#F59E0B' },
  bottomSection: { width: '100%', alignItems: 'center', paddingBottom: 16 },
  quoteContainer: { alignItems: 'center', paddingHorizontal: 18, marginBottom: 28, borderLeftWidth: 2, borderRightWidth: 2, borderColor: 'rgba(245, 158, 11, 0.4)' },
  quoteText: { color: '#F3F4F6', fontSize: 16, fontWeight: '600', textAlign: 'center', lineHeight: 26, marginBottom: 8 },
  quoteAuthor: { color: '#F59E0B', fontSize: 13, fontWeight: '500', textAlign: 'center' },
  btnContainer: { alignItems: 'center' },
  enterBtn: { backgroundColor: 'rgba(16, 185, 129, 0.15)', borderWidth: 1.5, borderColor: '#10B981', paddingVertical: 14, paddingHorizontal: 36, borderRadius: 30 },
  enterBtnText: { color: '#ECFDF5', fontSize: 16, fontWeight: '800' },
});

const authStyles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#090D16', paddingTop: SAFE_TOP, paddingBottom: SAFE_BOTTOM },
  container: { flex: 1 },
  topBar: { paddingVertical: 10, alignItems: 'center' },
  replayTopBtn: { backgroundColor: 'rgba(245, 158, 11, 0.1)', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(245, 158, 11, 0.3)' },
  replayTopText: { color: '#F59E0B', fontSize: 12, fontWeight: '600' },
  scrollContent: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 20, paddingVertical: 16 },
  cardWrapper: { backgroundColor: '#111827', borderRadius: 24, padding: 22, borderWidth: 1, borderColor: '#1F2937' },
  headerSection: { alignItems: 'center', marginBottom: 20 },
  logoBadge: { width: 58, height: 58, borderRadius: 29, backgroundColor: 'rgba(16, 185, 129, 0.15)', borderWidth: 1.5, borderColor: '#10B981', alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  logoIcon: { fontSize: 28 },
  appTitle: { fontSize: 30, fontWeight: '900', color: '#ECFDF5', marginBottom: 6 },
  headerSubtitle: { fontSize: 13.5, color: '#9CA3AF', textAlign: 'center', lineHeight: 20 },
  toggleContainer: { flexDirection: 'row', backgroundColor: '#090D16', borderRadius: 14, padding: 4, marginBottom: 18, borderWidth: 1, borderColor: '#1F2937' },
  toggleBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  toggleBtnActive: { backgroundColor: '#10B981' },
  toggleText: { color: '#9CA3AF', fontWeight: '600', fontSize: 14 },
  toggleTextActive: { color: '#090D16', fontWeight: '800' },
  formSection: { marginBottom: 16 },
  inputGroup: { marginBottom: 14 },
  label: { color: '#D1D5DB', fontSize: 13, fontWeight: '600', marginBottom: 6, textAlign: 'right' },
  input: { backgroundColor: '#090D16', borderWidth: 1, borderColor: '#374151', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, color: '#F9FAFB', fontSize: 15 },
  passwordWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#090D16', borderWidth: 1, borderColor: '#374151', borderRadius: 12, paddingHorizontal: 14 },
  passwordInput: { flex: 1, paddingVertical: 12, color: '#F9FAFB', fontSize: 15 },
  eyeBtn: { paddingRight: 10 },
  eyeText: { color: '#F59E0B', fontSize: 12, fontWeight: '600' },
  primaryBtn: { backgroundColor: '#10B981', borderRadius: 14, paddingVertical: 14, alignItems: 'center', marginTop: 8 },
  primaryBtnText: { color: '#090D16', fontSize: 16, fontWeight: '800' },
  dividerRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 14 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#1F2937' },
  dividerText: { color: '#6B7280', fontSize: 12, marginHorizontal: 10 },
  socialRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  socialBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 12, borderWidth: 1, gap: 8 },
  googleBtn: { backgroundColor: '#1F2937', borderColor: '#374151' },
  googleIcon: { color: '#F59E0B', fontSize: 18, fontWeight: '900' },
  googleText: { color: '#F9FAFB', fontSize: 15, fontWeight: '700' },
  facebookBtn: { backgroundColor: '#1877F2', borderColor: '#1877F2' },
  facebookIcon: { color: '#FFFFFF', fontSize: 19, fontWeight: '900' },
  facebookText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
});

const dashStyles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#090D16', paddingTop: SAFE_TOP, paddingBottom: SAFE_BOTTOM },
  scrollContainer: { padding: 18, paddingBottom: 40 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 },
  topActions: { flexDirection: 'row', gap: 8 },
  logoutPill: { backgroundColor: '#1F2937', paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10, borderWidth: 1, borderColor: '#EF4444' },
  logoutText: { color: '#EF4444', fontSize: 12, fontWeight: '700' },
  settingsPill: { backgroundColor: '#1F2937', paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10, borderWidth: 1, borderColor: '#10B981' },
  settingsText: { color: '#10B981', fontSize: 12, fontWeight: '700' },
  userInfo: { alignItems: 'flex-end' },
  greetingText: { color: '#F9FAFB', fontSize: 19, fontWeight: '800' },
  dateSub: { color: '#10B981', fontSize: 11.5, fontWeight: '600' },

  plantCard: { backgroundColor: '#111827', borderRadius: 22, padding: 18, alignItems: 'center', borderWidth: 1, borderColor: '#1F2937', marginBottom: 16 },
  plantTopRow: { width: '100%', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  xpBadge: { backgroundColor: 'rgba(245, 158, 11, 0.15)', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 12, borderWidth: 1, borderColor: '#F59E0B' },
  xpText: { color: '#F59E0B', fontWeight: '800', fontSize: 13 },
  stageBadge: { color: '#10B981', fontWeight: '800', fontSize: 15 },
  plantAvatarCircle: { width: 96, height: 96, borderRadius: 48, backgroundColor: 'rgba(16, 185, 129, 0.12)', borderWidth: 2, borderColor: '#10B981', alignItems: 'center', justifyContent: 'center', marginVertical: 10 },
  plantEmoji: { fontSize: 52 },
  plantDesc: { color: '#D1D5DB', fontSize: 13, textAlign: 'center', marginBottom: 14 },
  progressBarBg: { width: '100%', height: 10, backgroundColor: '#1F2937', borderRadius: 6, overflow: 'hidden', marginBottom: 6 },
  progressBarFill: { height: '100%', backgroundColor: '#10B981', borderRadius: 6 },
  progressLabel: { color: '#9CA3AF', fontSize: 11.5, textAlign: 'center' },

  aiCoachBanner: { backgroundColor: 'rgba(16, 185, 129, 0.14)', borderRadius: 18, padding: 16, borderWidth: 1.5, borderColor: '#10B981', marginBottom: 18 },
  aiBannerContent: { alignItems: 'flex-end' },
  aiBannerTitle: { color: '#ECFDF5', fontSize: 16, fontWeight: '800', marginBottom: 4 },
  aiBannerSub: { color: '#A7F3D0', fontSize: 12.5, textAlign: 'right' },

  tabsRow: { flexDirection: 'row', backgroundColor: '#111827', borderRadius: 14, padding: 4, marginBottom: 14, borderWidth: 1, borderColor: '#1F2937' },
  tabBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  tabBtnActive: { backgroundColor: '#10B981' },
  tabText: { color: '#9CA3AF', fontSize: 12, fontWeight: '700' },
  tabTextActive: { color: '#090D16', fontWeight: '900' },

  addTaskBox: { backgroundColor: '#111827', borderRadius: 16, padding: 12, borderWidth: 1, borderColor: '#1F2937', marginBottom: 16 },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  taskInput: { flex: 1, backgroundColor: '#090D16', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11, color: '#F9FAFB', borderWidth: 1, borderColor: '#374151', fontSize: 14 },
  addBtn: { backgroundColor: '#10B981', paddingHorizontal: 18, paddingVertical: 12, borderRadius: 12 },
  addBtnText: { color: '#090D16', fontWeight: '900', fontSize: 14 },
  spacedToggleRow: { marginTop: 10, alignItems: 'flex-end' },
  spacedToggleText: { color: '#9CA3AF', fontSize: 12, fontWeight: '600' },

  sectionHint: { color: '#F59E0B', fontSize: 12, textAlign: 'right', marginBottom: 8, fontWeight: '600' },
  tasksList: { gap: 10 },
  emptyText: { color: '#6B7280', textAlign: 'center', marginTop: 20, fontSize: 14 },
  taskCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#111827', padding: 15, borderRadius: 16, borderWidth: 1, borderColor: '#1F2937' },
  taskCardCompleted: { opacity: 0.65, borderColor: '#065F46', backgroundColor: '#0B131E' },
  taskLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  deleteIconBtn: { padding: 4 },
  deleteIconText: { color: '#EF4444', fontSize: 14, fontWeight: '800' },
  taskXp: { color: '#F59E0B', fontSize: 12, fontWeight: '800' },
  checkbox: { width: 24, height: 24, borderRadius: 7, borderWidth: 2, borderColor: '#10B981', alignItems: 'center', justifyContent: 'center' },
  checkboxChecked: { backgroundColor: '#10B981' },
  checkMark: { color: '#090D16', fontWeight: '900', fontSize: 14 },
  taskRight: { flex: 1, alignItems: 'flex-end', marginLeft: 12 },
  taskTitle: { color: '#F3F4F6', fontSize: 15, fontWeight: '700', textAlign: 'right' },
  taskTitleCompleted: { textDecorationLine: 'line-through', color: '#9CA3AF' },
  spacedBadge: { color: '#F59E0B', fontSize: 11.5, marginTop: 4, fontWeight: '600' },
});

const modalStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.8)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#111827', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 22, maxHeight: '88%', borderWidth: 1, borderColor: '#1F2937' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 },
  closeText: { color: '#EF4444', fontWeight: '700', fontSize: 14 },
  modalTitle: { color: '#10B981', fontSize: 19, fontWeight: '900' },
  questionLabel: { color: '#E5E7EB', fontSize: 14, fontWeight: '700', textAlign: 'right', marginBottom: 8, marginTop: 8 },
  helperDesc: { color: '#9CA3AF', fontSize: 12.5, textAlign: 'right', lineHeight: 19, marginBottom: 12 },
  textArea: { backgroundColor: '#090D16', borderRadius: 14, padding: 12, color: '#F9FAFB', borderWidth: 1, borderColor: '#374151', minHeight: 75, fontSize: 14, marginBottom: 10 },
  analyzeBtn: { backgroundColor: '#F59E0B', borderRadius: 14, paddingVertical: 14, alignItems: 'center', marginTop: 8 },
  analyzeBtnText: { color: '#090D16', fontWeight: '900', fontSize: 15 },
  replyBox: { backgroundColor: '#090D16', borderRadius: 16, padding: 16, marginTop: 16, borderWidth: 1, borderColor: '#10B981' },
  aiTag: { color: '#F59E0B', fontSize: 11.5, fontWeight: '800', textAlign: 'right', marginBottom: 6 },
  replyFeedback: { color: '#ECFDF5', fontSize: 14, lineHeight: 22, textAlign: 'right', marginBottom: 12 },
  suggestedHeader: { color: '#F59E0B', fontSize: 14, fontWeight: '800', textAlign: 'right', marginBottom: 6 },
  suggestedItem: { color: '#D1D5DB', fontSize: 13.5, textAlign: 'right', marginBottom: 4 },
  acceptBtn: { backgroundColor: '#10B981', borderRadius: 12, paddingVertical: 12, alignItems: 'center', marginTop: 14 },
  acceptBtnText: { color: '#090D16', fontWeight: '900', fontSize: 14 },
});
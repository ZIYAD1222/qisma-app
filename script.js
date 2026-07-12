/* ============================================================
   1) الوضع الداكن / الفاتح (Theme Toggle)
   ============================================================ */

// شكل أيقونتي الشمس والقمر (SVG) نبدّل بينهم حسب الوضع الحالي
const sunIcon = '<circle cx="12" cy="12" r="4"></circle><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"></path>';
const moonIcon = '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>';

// يطبّق الوضع (dark/light) على الصفحة كاملة عن طريق سمة data-theme في <html>،
// وكل متغيرات الألوان بملف style.css تتغير تلقائيًا تبعًا لها
function applyTheme(theme){
  document.documentElement.setAttribute('data-theme', theme);
  document.getElementById('theme-icon').innerHTML = theme === 'light' ? sunIcon : moonIcon;
}

// عند فتح الصفحة، يقرأ آخر وضع محفوظ بالمتصفح (localStorage) ويطبّقه
async function loadTheme(){
  let theme = 'dark';
  try{
    const v = localStorage.getItem('qisma-theme');
    if(v) theme = v;
  }catch(e){}
  applyTheme(theme);
}

// عند الضغط على زر التبديل: يعكس الوضع الحالي، يعطي دورة بصرية خفيفة للأيقونة،
// يعيد رسم الفئات بالألوان المناسبة للوضع الجديد، ويحفظ الاختيار
document.getElementById('theme-toggle').addEventListener('click', async () => {
  const current = document.documentElement.getAttribute('data-theme') || 'dark';
  const next = current === 'dark' ? 'light' : 'dark';
  const btn = document.getElementById('theme-toggle');
  btn.classList.add('spin');
  setTimeout(() => btn.classList.remove('spin'), 220);
  applyTheme(next);
  if(typeof categories !== 'undefined' && categories.length){
    renderCats();
    recalc();
  }
  try{ localStorage.setItem('qisma-theme', next); }catch(e){}
});

loadTheme();


/* ============================================================
   2) الألوان ومتغيرات الحالة العامة (State)
   ============================================================ */

// مجموعتا ألوان الفئات: نسخة للوضع الداكن (زاهية) ونسخة للفاتح (أغمق للتباين على الأبيض)
const paletteDark  = ['#7f77dd','#3fb88f','#378add','#efa927','#5dcaa5','#afa9ec','#8b979c','#85b7eb'];
const paletteLight = ['#534ab7','#0f6e56','#185fa5','#854f0b','#085041','#3c3489','#5f5e5a','#0c447c'];

// يرجع لون الفئة رقم idx بناءً على الوضع الحالي (داكن/فاتح)
function getColor(idx){
  const theme = document.documentElement.getAttribute('data-theme') || 'dark';
  const p = theme === 'light' ? paletteLight : paletteDark;
  return p[idx % p.length];
}

const ARC_LEN = 125.66; // طول قوس نصف الدائرة بالمؤشرات (ثابت هندسي حسب نصف القطر المستخدم بـ SVG)

// الحالة الأساسية للتطبيق: تتغير مع كل تفاعل من المستخدم
let categories = [];   // قائمة الفئات الحالية (كل فئة: id, name, colorIndex, pct)
let salary = 10000;    // الراتب الشهري الحالي
let history = [];      // سجل الأشهر المحفوظة

// يولّد معرّف عشوائي قصير لكل فئة/سجل، عشان نميزهم عن بعض
function uid(){ return Math.random().toString(36).slice(2,9); }

// ينسق رقم كبير بفواصل الآلاف (مثال: 10000 → "10,000")
function fmt(n){
  return Math.round(n).toLocaleString('en-US');
}


/* ============================================================
   3) تحميل وحفظ البيانات (localStorage)
   كل بيانات المستخدم تُحفظ محليًا بمتصفحه، بدون أي خادم خارجي
   ============================================================ */

// يقرأ الراتب والفئات والسجل المحفوظين، أو يبني بيانات افتراضية أول مرة
async function loadState(){
  try{
    const v = localStorage.getItem('qisma-state');
    if(v){
      const parsed = JSON.parse(v);
      salary = parsed.salary ?? 10000;
      categories = parsed.categories ?? defaultCats();
      // توافق مع بيانات قديمة ما فيها colorIndex، نعطيها ترقيم افتراضي
      categories.forEach((c, i) => { if(c.colorIndex === undefined) c.colorIndex = i; });
    } else {
      categories = defaultCats();
    }
  }catch(e){
    categories = defaultCats();
  }
  try{
    const v = localStorage.getItem('qisma-history');
    if(v){ history = JSON.parse(v); }
  }catch(e){
    history = [];
  }
  document.getElementById('salary').value = salary;
  renderCats();
  renderHistory();
  recalc();
}

// الفئات الافتراضية أول ما يفتح المستخدم التطبيق لأول مرة
function defaultCats(){
  return [
    { id: uid(), name: 'مصاريف شخصية', colorIndex: 0, pct: 30 },
    { id: uid(), name: 'استثمار',      colorIndex: 1, pct: 20 },
    { id: uid(), name: 'إيجار',        colorIndex: 2, pct: 25 },
    { id: uid(), name: 'ديون',         colorIndex: 3, pct: 15 }
  ];
}

// يحفظ الراتب والفئات الحالية بالمتصفح، يُستدعى بعد أي تعديل
async function saveState(){
  try{
    localStorage.setItem('qisma-state', JSON.stringify({ salary, categories }));
  }catch(e){
    console.error('تعذر الحفظ', e);
  }
}


/* ============================================================
   4) رسم بطاقات الفئات (renderCats)
   يبني كل بطاقة فئة من الصفر في كل مرة تتغير فيها البيانات
   ============================================================ */

// قائمة أسماء الفئات الجاهزة اللي تظهر بالقائمة المنسدلة
const CATEGORY_OPTIONS = [
  'مصاريف شخصية', 'إيجار', 'فواتير', 'مواصلات', 'تسوق',
  'ترفيه', 'تعليم', 'تأمين', 'ادخار', 'استثمار',
  'ديون', 'زكاة وصدقة', 'طوارئ', 'دعم العائلة'
];

function renderCats(){
  const el = document.getElementById('cats');
  el.innerHTML = '';

  // -- بناء بطاقة HTML لكل فئة --
  categories.forEach((cat, i) => {
    // إذا اسم الفئة مو من القائمة الجاهزة، نعتبرها "فئة مخصصة" ونظهر حقل كتابة إضافي
    const isCustom = !CATEGORY_OPTIONS.includes(cat.name);
    const card = document.createElement('div');
    card.className = 'cat-card';
    card.style.animationDelay = Math.min(i, 8) * 40 + 'ms'; // تأخير بسيط متدرج عشان تدخل البطاقات بالتتابع

    card.innerHTML = `
      <button class="del-btn" data-id="${cat.id}" aria-label="حذف الفئة">✕</button>

      <!-- مؤشر نصف الدائرة: مسار خلفي رمادي + مسار ملون فوقه يمثل النسبة -->
      <div class="gauge">
        <svg viewBox="0 0 100 56">
          <path class="gauge-bg" d="M10,50 A40,40 0 0,1 90,50"></path>
          <path class="gauge-fg" id="arc-${cat.id}" d="M10,50 A40,40 0 0,1 90,50"
                stroke="${getColor(cat.colorIndex)}" stroke-dasharray="${ARC_LEN}" stroke-dashoffset="${ARC_LEN}"></path>
        </svg>
        <div class="gauge-label" id="pct-${cat.id}">0%</div>
      </div>

      <!-- قائمة اختيار اسم الفئة -->
      <select class="cat-select" data-id="${cat.id}">
        ${CATEGORY_OPTIONS.map(opt => `<option value="${opt}" ${!isCustom && cat.name === opt ? 'selected' : ''}>${opt}</option>`).join('')}
        <option value="__custom__" ${isCustom ? 'selected' : ''}>فئة أخرى...</option>
      </select>

      <!-- يظهر بس إذا اختار المستخدم "فئة أخرى..." -->
      ${isCustom ? `<input class="cat-name-custom" data-id="${cat.id}" value="${cat.name}" placeholder="اكتب اسم الفئة" />` : ''}

      <!-- شريط تحكم بالنسبة -->
      <input type="range" min="0" max="100" step="1" value="${cat.pct}" data-id="${cat.id}" class="slider" />

      <!-- حقل المبلغ القابل للتعديل مباشرة -->
      <div class="amt-row">
        <input type="number" class="amt-input" id="amt-${cat.id}" data-id="${cat.id}" min="0" step="1" />
        <span class="amt-suffix">ريال</span>
      </div>

      <button class="fill-btn" data-id="${cat.id}">+ أضف الباقي</button>
    `;
    el.appendChild(card);
  });

  // -- ربط الأحداث (Event Listeners) بعناصر البطاقات بعد إنشائها --

  // تحريك شريط النسبة يحدّث pct للفئة ويعيد الحساب
  el.querySelectorAll('.slider').forEach(s => {
    s.addEventListener('input', e => {
      const cat = categories.find(c => c.id === e.target.dataset.id);
      cat.pct = Number(e.target.value);
      recalc();
      saveState();
    });
  });

  // اختيار اسم من القائمة المنسدلة (أو اختيار "فئة أخرى...")
  el.querySelectorAll('.cat-select').forEach(sel => {
    sel.addEventListener('change', e => {
      const cat = categories.find(c => c.id === e.target.dataset.id);
      if(e.target.value === '__custom__'){
        cat.name = '';
        renderCats();
        recalc();
        const input = el.querySelector(`.cat-name-custom[data-id="${cat.id}"]`);
        if(input) input.focus();
      } else {
        cat.name = e.target.value;
        renderCats();
        recalc();
      }
      saveState();
    });
  });

  // الكتابة بحقل الاسم المخصص (لما يكون "فئة أخرى...")
  el.querySelectorAll('.cat-name-custom').forEach(inp => {
    inp.addEventListener('input', e => {
      const cat = categories.find(c => c.id === e.target.dataset.id);
      cat.name = e.target.value;
      saveState();
    });
    inp.addEventListener('blur', e => {
      // إذا ترك الحقل فاضي، نرجع لاسم افتراضي بدل ما تضل الفئة بلا اسم
      const cat = categories.find(c => c.id === e.target.dataset.id);
      if(!cat.name.trim()) cat.name = 'فئة جديدة';
      saveState();
    });
  });

  // حذف فئة: نضيف كلاس "removing" أول (حركة تلاشي)، وبعد 180ms نحذفها فعليًا من المصفوفة
  el.querySelectorAll('.del-btn').forEach(btn => {
    btn.addEventListener('click', e => {
      const id = e.target.dataset.id;
      const card = e.target.closest('.cat-card');
      if(card){
        card.classList.add('removing');
        setTimeout(() => {
          categories = categories.filter(c => c.id !== id);
          renderCats();
          recalc();
          saveState();
        }, 180);
      }
    });
  });

  // زر "أضف الباقي": يحسب كم نسبة غير موزعة على باقي الفئات ويضيفها كاملة لهذي الفئة
  el.querySelectorAll('.fill-btn').forEach(btn => {
    btn.addEventListener('click', e => {
      const cat = categories.find(c => c.id === e.target.dataset.id);
      const totalPct = categories.reduce((sum, c) => sum + c.pct, 0);
      const remaining = 100 - totalPct;
      cat.pct = Math.max(0, Math.min(100, cat.pct + remaining));
      const slider = el.querySelector(`.slider[data-id="${cat.id}"]`);
      if(slider) slider.value = cat.pct;
      recalc();
      saveState();
    });
  });

  // الكتابة المباشرة بحقل المبلغ: نحوّل المبلغ لنسبة مئوية (مقربة لأقرب عدد صحيح)
  el.querySelectorAll('.amt-input').forEach(inp => {
    inp.addEventListener('input', e => {
      const cat = categories.find(c => c.id === e.target.dataset.id);
      const amt = Math.max(0, Number(e.target.value) || 0);
      const pct = salary > 0 ? Math.max(0, Math.min(100, Math.round((amt / salary) * 100))) : 0;
      cat.pct = pct;
      const slider = el.querySelector(`.slider[data-id="${cat.id}"]`);
      if(slider) slider.value = pct;
      recalc();
      saveState();
    });
  });
}


/* ============================================================
   5) إعادة الحساب وتحديث الواجهة (recalc)
   يُستدعى بعد أي تغيير: يحدّث كل الأرقام والمؤشرات على الصفحة
   ============================================================ */
function recalc(){
  salary = Math.max(0, Number(document.getElementById('salary').value) || 0);
  let totalPct = 0;
  const bar = document.getElementById('bar');
  bar.innerHTML = '';

  categories.forEach(cat => {
    totalPct += cat.pct;
    const amt = salary * cat.pct / 100;

    const pctEl = document.getElementById('pct-' + cat.id);
    const amtEl = document.getElementById('amt-' + cat.id);
    const arcEl = document.getElementById('arc-' + cat.id);

    if(pctEl) pctEl.textContent = cat.pct + '%';
    // ما نحدّث حقل المبلغ إذا المستخدم متركز فيه ويكتب فيه حاليًا، عشان ما نقاطع كتابته
    if(amtEl && document.activeElement !== amtEl) amtEl.value = Math.round(amt);
    if(arcEl) arcEl.setAttribute('stroke-dashoffset', ARC_LEN * (1 - cat.pct / 100));

    // شريحة الفئة بالشريط الملخص أسفل الصفحة
    const seg = document.createElement('div');
    seg.style.cssText = `height:100%; width:${cat.pct}%; background:${getColor(cat.colorIndex)};`;
    bar.appendChild(seg);
  });

  // إجمالي النسب: يتلون أحمر لو تجاوز 100%
  const totalEl = document.getElementById('total-pct');
  totalEl.textContent = totalPct + '%';
  totalEl.style.color = totalPct > 100 ? 'var(--danger)' : 'var(--text)';

  // المتبقي غير المخصص: يتلون أحمر لو صار سالب (يعني تجاوزت الراتب)
  const remaining = salary * (100 - totalPct) / 100;
  const remEl = document.getElementById('remaining');
  remEl.textContent = fmt(remaining) + ' ريال';
  remEl.style.color = remaining < 0 ? 'var(--danger)' : 'var(--text)';
}


/* ============================================================
   6) السجل الشهري (renderHistory)
   ============================================================ */
function renderHistory(){
  // حساب إجمالي وعدد الأشهر المحفوظة بالسنة الحالية فقط
  const currentYear = new Date().getFullYear();
  const yearEntries = history.filter(h => h.year === currentYear);
  const yearTotal = yearEntries.reduce((sum, h) => sum + h.salary, 0);
  document.getElementById('year-total-amt').textContent = fmt(yearTotal) + ' ريال';
  document.getElementById('year-total-count').textContent = yearEntries.length;

  const el = document.getElementById('history');
  if(history.length === 0){
    el.innerHTML = '<div class="empty">ما فيه سجل محفوظ بعد</div>';
    return;
  }

  el.innerHTML = '';
  // نعرض الأحدث أول (نعكس ترتيب المصفوفة)
  [...history].reverse().forEach(entry => {
    const item = document.createElement('div');
    item.className = 'hist-item';
    const breakdown = entry.categories.map(c => `${c.name} ${c.pct}%`).join(' · ');
    item.innerHTML = `
      <div>
        <div class="hist-date">${entry.date}</div>
        <div class="hist-breakdown">${breakdown}</div>
      </div>
      <div style="display:flex; align-items:center; gap:10px;">
        <div class="hist-salary">${fmt(entry.salary)} ريال</div>
        <button class="del-btn" style="position:static;" data-id="${entry.id}" aria-label="حذف من السجل">✕</button>
      </div>
    `;
    el.appendChild(item);
  });

  // حذف عنصر من السجل
  el.querySelectorAll('.del-btn').forEach(btn => {
    btn.addEventListener('click', async e => {
      history = history.filter(h => h.id !== e.target.dataset.id);
      renderHistory();
      try{ localStorage.setItem('qisma-history', JSON.stringify(history)); }catch(err){}
    });
  });
}


/* ============================================================
   7) الأحداث الرئيسية على مستوى الصفحة
   ============================================================ */

// تغيير قيمة الراتب: يعيد الحساب ويحفظ فورًا
document.getElementById('salary').addEventListener('input', () => { recalc(); saveState(); });

// زر "+ إضافة فئة": يضيف فئة جديدة بأول اسم غير مستخدم من القائمة الجاهزة
document.getElementById('add-cat').addEventListener('click', () => {
  const colorIndex = categories.length;
  const usedNames = categories.map(c => c.name);
  const defaultName = CATEGORY_OPTIONS.find(opt => !usedNames.includes(opt)) || CATEGORY_OPTIONS[0];
  categories.push({ id: uid(), name: defaultName, colorIndex, pct: 0 });
  renderCats();
  recalc();
  saveState();
});

// زر "حفظ هذا الشهر في السجل": يأخذ لقطة من الحالة الحالية ويضيفها للسجل،
// ثم يعطي تأكيد بصري مؤقت "تم الحفظ ✓" على الزر نفسه
document.getElementById('save-month').addEventListener('click', async () => {
  const now = new Date();
  const dateStr = now.toLocaleDateString('ar-SA', { year:'numeric', month:'long' });
  const entry = {
    id: uid(),
    date: dateStr,
    year: now.getFullYear(),
    salary,
    categories: categories.map(c => ({ name: c.name, pct: c.pct, colorIndex: c.colorIndex }))
  };
  history.push(entry);
  renderHistory();
  try{
    localStorage.setItem('qisma-history', JSON.stringify(history));
  }catch(e){
    console.error('تعذر حفظ السجل', e);
  }

  const btn = document.getElementById('save-month');
  const originalText = btn.textContent;
  btn.classList.add('saved');
  btn.textContent = 'تم الحفظ ✓';
  setTimeout(() => {
    btn.classList.remove('saved');
    btn.textContent = originalText;
  }, 1200);
});


// زر "مسح كل المبالغ والنسب": يصفّر نسبة كل فئة موجودة (يبقي أسماء الفئات، بس يرجع النسب لصفر)
document.getElementById('reset-all').addEventListener('click', () => {
  const confirmed = window.confirm('متأكد إنك تبي تصفر كل النسب والمبالغ بكل الفئات؟');
  if(!confirmed) return;
  categories.forEach(c => { c.pct = 0; });
  renderCats();
  recalc();
  saveState();
});


/* ============================================================
   8) نقطة الانطلاق: تشغيل التطبيق عند فتح الصفحة
   ============================================================ */
loadState();

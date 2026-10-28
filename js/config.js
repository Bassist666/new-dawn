/* ============================================================
   «Новый рассвет» — конфигурация игры и утилиты.
   ============================================================ */
(function () {
  'use strict';

  window.NG = window.NG || {};

  NG.CONFIG = {
    priceGrowth: 1.15,          // рост цены: baseCost × 1.15^n

    // Апгрейд силы тапа: покупается за энергию в карточке реактора.
    // Каждый уровень даёт +powerPerLevel к энергии за 1 клик.
    // Как и у построек, на уровнях 10/25/50/100/200 действуют вехи
    // (множители ×2/×3) — см. milestones ниже.
    tap: {
      baseCost: 10,             // стартовая цена апгрейда
      growth: 1.5,              // рост цены апгрейда за уровень
      powerPerLevel: 10,        // +10 к силе тапа за уровень
      powerPerBuilding: 0.1     // +10% к силе тапа за каждую постройку
    },

    offline: { rate: 0.5 / 3, capHours: 8 }, // ~17% дохода (в 3 раза медленнее), потолок 8 часов

    meteor: {
      minSec: 180,              // раз в 3–7 минут
      maxSec: 420,
      lifeSec: 10,              // живёт 10 секунд
      rewardSeconds: 60,        // награда = 60 секунд добычи
      minReward: 10             // но не меньше 10 (сила клика × 10)
    },

    prestige: {
      threshold: 1e9,           // порог по умолчанию: 1 млрд добычи за экспедицию

      // Пороги перехода по уровням (индекс = текущая планета/уровень):
      // уровень 1 → 2 — 1 млн, уровень 2 → 3 — 100 млн,
      // дальше (3 → 4 и повтор цикла) — 1 млрд.
      thresholds: [1e6, 1e8, 1e9, 1e9],

      pointsDivisor: 1e9,       // очки = floor(добыто / 1e9)
      bonusPerPoint: 0.02       // каждое очко — вечные +2%
    },

    ad: {
      minIntervalSec: 900,      // interstitial не чаще раза в 15 минут
      checkEverySec: 60,

      // Rewarded-реклама: игрок сам нажимает кнопку и смотрит ролик.
      rewarded: {
        rewardMult: 100,        // награда = 100 × добыча в секунду
        minReward: 30,          // но не меньше 30
        cooldownSec: 90,        // пауза между просмотрами
        maxPerDay: 10,          // суточный лимит просмотров (сброс в полночь)

        // Второй rewarded-бонус: удвоение добычи на время.
        // 120 с ×2 примерно равно награде обычного rewarded, но требует
        // активных построек; кулдаун 5 минут не даёт держать буст вечно.
        boost: {
          durationSec: 120,     // длительность ×2
          cooldownSec: 300,     // пауза между включениями
          maxPerDay: 8          // суточный лимит включений (сброс в полночь)
        }
      }
    },

    save: {
      localKey: 'new-dawn-save',
      autosaveSec: 15,
      cloudThrottleSec: 15
    },

    // Ступени добычи. index 0 — ручная зарядка (не покупается).
    // unlockLevel — уровень (планета + 1), с которого карточка доступна в панели покупок:
    //   1: ручная зарядка + дроны, 2: + солнце, конденсаторы, 3 и дальше: все.
    buildings: [
      { id: 'reactor',   baseCost: 0,       baseIncome: 1,    icon: '⚡', nameKey: 'b0_name', descKey: 'b0_desc', logKey: null, unlockLevel: 1 },
      { id: 'drones',    baseCost: 10,      baseIncome: 1,    icon: '🛸', nameKey: 'b1_name', descKey: 'b1_desc', logKey: 'b1_log', unlockLevel: 1 },
      { id: 'solar',     baseCost: 150,     baseIncome: 8,    icon: '☀️', nameKey: 'b2_name', descKey: 'b2_desc', logKey: 'b2_log', unlockLevel: 2 },
      { id: 'condenser', baseCost: 2000,    baseIncome: 60,   icon: '🌪️', nameKey: 'b3_name', descKey: 'b3_desc', logKey: 'b3_log', unlockLevel: 2 },
      { id: 'warp',      baseCost: 30000,   baseIncome: 450,  icon: '🛰️', nameKey: 'b4_name', descKey: 'b4_desc', logKey: 'b4_log', unlockLevel: 3 },
      { id: 'blackhole', baseCost: 500000,  baseIncome: 3500, icon: '🕳️', nameKey: 'b5_name', descKey: 'b5_desc', logKey: 'b5_log', unlockLevel: 3 }
    ],

    // Вехи-сертификация: множители перемножаются.
    milestones: [
      { at: 10,  mult: 2, textKey: 'milestone_x2' },
      { at: 25,  mult: 2, textKey: 'milestone_x2' },
      { at: 50,  mult: 2, textKey: 'milestone_x2' },
      { at: 100, mult: 3, textKey: 'milestone_x3_100' },
      { at: 200, mult: 3, textKey: 'milestone_x3_200' }
    ],

    // Цикл планет: меняется только тема.
    planets: [
      { id: 'xantha', nameKey: 'planet_xantha' },
      { id: 'ervin',  nameKey: 'planet_ervin' },
      { id: 'taiga9', nameKey: 'planet_taiga9' },
      { id: 'muur',   nameKey: 'planet_muur' }
    ]
  };

  // ---------- Форматирование больших чисел ----------
  var SUFFIXES = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No', 'Dc'];

  function fmt(n) {
    if (!isFinite(n)) return '∞';
    if (n < 0) return '-' + fmt(-n);
    if (n < 1000) return Math.floor(n).toString();
    var tier = Math.floor(Math.log10(n) / 3);
    if (tier >= SUFFIXES.length) tier = SUFFIXES.length - 1;
    var scaled = n / Math.pow(10, tier * 3);
    var digits = scaled < 10 ? 2 : scaled < 100 ? 1 : 0;
    return scaled.toFixed(digits) + SUFFIXES[tier];
  }

  // Полное число без сокращений: 1 234 567 890 (пробелы-разделители).
  // Дробная часть показывается 1 знаком для малых значений, чтобы был виден рост.
  function fmtFull(n) {
    if (!isFinite(n)) return '∞';
    if (n < 0) return '-' + fmtFull(-n);
    // Всегда целое число — без дробной части ни в счётчике, ни где-либо ещё.
    return Math.floor(n).toLocaleString('ru-RU', { maximumFractionDigits: 0 });
  }

  NG.Utils = { fmt: fmt, fmtFull: fmtFull };
})();

/* ============================================================
   «Новый рассвет» — ядро игры: состояние, экономика, вехи,
   метеорит, престиж. Плюс простой event-эмиттер.
   ============================================================ */
(function () {
  'use strict';

  var C = NG.CONFIG;

  /* ---------- Event emitter ---------- */
  var handlers = {};
  NG.Events = {
    on: function (evt, fn) {
      (handlers[evt] = handlers[evt] || []).push(fn);
    },
    emit: function (evt, data) {
      var list = handlers[evt];
      if (list) list.forEach(function (fn) { fn(data); });
    }
  };

  /* ---------- Состояние ---------- */
  var state = {
    energy: 0,
    totalEarned: 0,      // добыто за всё время (скор лидерборда)
    stintEarned: 0,      // добыто в текущей экспедиции (для престижа)
    buildings: {},       // { index: количество }
    planet: 0,
    prestigePoints: 0,
    tapLevel: 0,         // уровень апгрейда силы тапа
    lastSeen: Date.now(),
    lang: 'ru',
    muted: false,
    music: true,
    lastRewardedAt: 0,   // ts последней rewarded-рекламы (кулдаун)
    sessionRewarded: 0,  // просмотров rewarded за сессию
    lastBoostAt: 0,      // ts последнего включения буста ×2 (кулдаун)
    sessionBoost: 0,     // включений буста за сессию
    boostUntil: 0        // ts окончания действия буста ×2
  };

  /* ---------- Экономика ---------- */
  function milestoneMult(owned) {
    var m = 1;
    for (var i = 0; i < C.milestones.length; i++) {
      if (owned >= C.milestones[i].at) m *= C.milestones[i].mult;
    }
    return m;
  }

  function globalBonus() {
    return 1 + state.prestigePoints * C.prestige.bonusPerPoint;
  }

  // Добыча в секунду. Активный буст ×2 удваивает пассивный доход
  // (и заодно награды, считаемые от него: метеорит, rewarded-энергия, оффлайн).
  function incomePerSec() {
    var sum = 0;
    for (var i = 1; i < C.buildings.length; i++) {
      var n = state.buildings[i] || 0;
      if (n > 0) sum += C.buildings[i].baseIncome * n * milestoneMult(n);
    }
    var total = sum * globalBonus();
    if (state.boostUntil > Date.now()) total *= 2;
    return total;
  }

  function totalBuildings() {
    var sum = 0;
    for (var i = 1; i < C.buildings.length; i++) sum += state.buildings[i] || 0;
    return sum;
  }

  // Сила тапа: база 1 + уровни апгрейда + 10% за каждую постройку.
  // На 10/25/50/100/200 уровнях апгрейда действуют вехи, как у построек.
  // Всегда целое число (минимум 1) — дробных значений клика быть не должно.
  function clickPower() {
    var tapLevel = state.tapLevel || 0;
    var raw = (1 + tapLevel * C.tap.powerPerLevel + totalBuildings() * C.tap.powerPerBuilding)
      * milestoneMult(tapLevel) * globalBonus();
    return Math.max(1, Math.round(raw));
  }

  function addEnergy(amount) {
    state.energy += amount;
    state.totalEarned += amount;
    state.stintEarned += amount;
  }

  function click() {
    var p = clickPower();
    addEnergy(p);
    NG.Events.emit('click', p);
    return p;
  }

  // Цена следующего уровня апгрейда силы тапа.
  function tapUpgradeCost() {
    return Math.round(C.tap.baseCost * Math.pow(C.tap.growth, state.tapLevel || 0));
  }

  // Покупка уровня апгрейда силы тапа за энергию.
  // На уровнях 10/25/50/100/200 срабатывает веха-сертификация, как у построек.
  function buyTapUpgrade() {
    var cost = tapUpgradeCost();
    if (state.energy < cost) return false;
    state.energy -= cost;
    state.tapLevel = (state.tapLevel || 0) + 1;
    for (var j = 0; j < C.milestones.length; j++) {
      if (state.tapLevel === C.milestones[j].at) {
        NG.Events.emit('milestone', {
          building: 0,
          mult: C.milestones[j].mult,
          textKey: C.milestones[j].textKey
        });
      }
    }
    NG.Events.emit('buy', 0);
    return true;
  }

  function priceOf(i) {
    var b = C.buildings[i];
    var n = state.buildings[i] || 0;
    return Math.round(b.baseCost * Math.pow(C.priceGrowth, n));
  }

  function buy(i) {
    if (i === 0) return false;
    var price = priceOf(i);
    if (state.energy < price) return false;
    state.energy -= price;
    var n = (state.buildings[i] || 0) + 1;
    state.buildings[i] = n;

    if (n === 1) NG.Events.emit('firstBuy', i);
    for (var j = 0; j < C.milestones.length; j++) {
      if (n === C.milestones[j].at) {
        NG.Events.emit('milestone', {
          building: i,
          mult: C.milestones[j].mult,
          textKey: C.milestones[j].textKey
        });
      }
    }
    NG.Events.emit('buy', i);
    return true;
  }

  // Суммарная цена n построек подряд (с учётом роста цены).
  function priceOfN(i, n) {
    var b = C.buildings[i];
    var start = state.buildings[i] || 0;
    var total = 0;
    for (var k = 0; k < n; k++) {
      total += b.baseCost * Math.pow(C.priceGrowth, start + k);
    }
    return Math.round(total);
  }

  // Покупка n построек разом. Возвращает true, если куплено.
  function buyMany(i, n) {
    if (i === 0 || n <= 0) return false;
    var total = priceOfN(i, n);
    if (state.energy < total) return false;
    state.energy -= total;
    var start = state.buildings[i] || 0;
    var lastMilestone = null;
    for (var k = 0; k < n; k++) {
      var count = start + k + 1;
      state.buildings[i] = count;
      if (count === 1) NG.Events.emit('firstBuy', i);
      for (var j = 0; j < C.milestones.length; j++) {
        if (count === C.milestones[j].at) lastMilestone = C.milestones[j];
      }
    }
    if (lastMilestone) {
      NG.Events.emit('milestone', {
        building: i,
        mult: lastMilestone.mult,
        textKey: lastMilestone.textKey
      });
    }
    NG.Events.emit('buy', i);
    return true;
  }

  function tick(dt) {
    var inc = incomePerSec() * dt;
    if (inc > 0) addEnergy(inc);
  }

  /* ---------- Метеорит ---------- */
  var meteorTimer = 0;

  function scheduleMeteor() {
    meteorTimer = C.meteor.minSec + Math.random() * (C.meteor.maxSec - C.meteor.minSec);
  }

  function updateMeteor(dt) {
    meteorTimer -= dt;
    if (meteorTimer <= 0) {
      NG.Events.emit('meteorSpawn');
      scheduleMeteor();
    }
  }

  function meteorReward() {
    return Math.max(C.meteor.rewardSeconds * incomePerSec(), C.meteor.minReward);
  }

  function meteorHit() {
    var r = meteorReward();
    addEnergy(r);
    NG.Events.emit('meteorHit', r);
    return r;
  }

  /* ---------- Rewarded-реклама ---------- */
  var rwCfg = C.ad.rewarded;

  // Награда: rewardMult × текущая добыча в секунду, но не меньше минимума.
  function rewardedReward() {
    return Math.max(rwCfg.rewardMult * incomePerSec(), rwCfg.minReward);
  }

  // Текущее состояние кнопки rewarded: готово / кулдаун / лимит сессии.
  function rewardedState() {
    var maxed = state.sessionRewarded >= rwCfg.maxPerSession;
    var elapsedSec = (Date.now() - (state.lastRewardedAt || 0)) / 1000;
    var secsLeft = Math.max(0, Math.ceil(rwCfg.cooldownSec - elapsedSec));
    return {
      maxed: maxed,
      ready: !maxed && secsLeft <= 0,
      secsLeft: secsLeft,
      reward: rewardedReward()
    };
  }

  // Выдача награды после подтверждённого просмотра (вызывается из onRewarded).
  function claimRewarded() {
    var r = rewardedReward();
    addEnergy(r);
    state.lastRewardedAt = Date.now();
    state.sessionRewarded = (state.sessionRewarded || 0) + 1;
    NG.Events.emit('rewarded', r);
    return r;
  }

  /* ---------- Rewarded: буст ×2 на время ---------- */
  var boostCfg = rwCfg.boost;

  // Состояние кнопки буста: активно / готово / кулдаун / лимит сессии.
  function boostState() {
    var maxed = state.sessionBoost >= boostCfg.maxPerSession;
    var activeMs = Math.max(0, (state.boostUntil || 0) - Date.now());
    var elapsedSec = (Date.now() - (state.lastBoostAt || 0)) / 1000;
    var secsLeft = Math.max(0, Math.ceil(boostCfg.cooldownSec - elapsedSec));
    return {
      active: activeMs > 0,
      remainingSec: Math.ceil(activeMs / 1000),
      maxed: maxed,
      ready: !maxed && secsLeft <= 0,
      secsLeft: secsLeft,
      durationSec: boostCfg.durationSec
    };
  }

  // Включение буста после подтверждённого просмотра (onRewarded).
  function claimBoost() {
    var seconds = boostCfg.durationSec;
    state.boostUntil = Date.now() + seconds * 1000;
    state.lastBoostAt = Date.now();
    state.sessionBoost = (state.sessionBoost || 0) + 1;
    NG.Events.emit('boost', { seconds: seconds });
    return { seconds: seconds };
  }

  /* ---------- Уровни (планеты) и престиж ---------- */

  // Текущий уровень игрока = номер планеты (1-based): планета 0 → уровень 1.
  function currentLevel() {
    return state.planet + 1;
  }

  // Порог перехода с текущего уровня на следующий (уровневая прогрессия).
  function prestigeThreshold() {
    var t = C.prestige.thresholds[state.planet];
    return t != null ? t : C.prestige.threshold;
  }

  // Доступна ли постройка i на текущем уровне (карточка в панели покупок).
  function buildingUnlocked(i) {
    var need = C.buildings[i].unlockLevel || 1;
    return currentLevel() >= need;
  }

  function canPrestige() {
    return state.energy >= prestigeThreshold();
  }

  // Очки престижа считаются от накопленной энергии. За завершённый уровень
  // полагается минимум 1 очко (+2% навсегда), иначе первые уровни
  // (пороги 10M/100M ниже делителя 1B) давали бы 0 очков и переход
  // «зависал» бы при заполненном прогрессе.
  function prestigePointsEarned() {
    if (!canPrestige()) return 0;
    return Math.max(1, Math.floor(state.energy / C.prestige.pointsDivisor));
  }

  function prestige() {
    if (!canPrestige()) return null;
    var pts = prestigePointsEarned();
    state.prestigePoints += pts;
    state.planet = (state.planet + 1) % C.planets.length;
    state.energy = 0;
    state.buildings = {};
    state.stintEarned = 0;
    state.tapLevel = 0;
    NG.Events.emit('prestige', {
      points: pts,
      percent: pts * C.prestige.bonusPerPoint * 100
    });
    return { points: pts };
  }

  /* ---------- Полный сброс прогресса (dev / аварийный) ---------- */
  function reset() {
    state.energy = 0;
    state.totalEarned = 0;
    state.stintEarned = 0;
    state.buildings = {};
    state.planet = 0;
    state.prestigePoints = 0;
    state.tapLevel = 0;
    state.lastSeen = Date.now();
    state.lastRewardedAt = 0;
    state.sessionRewarded = 0;
    state.lastBoostAt = 0;
    state.sessionBoost = 0;
    state.boostUntil = 0;
  }

  /* ---------- Публичный API ---------- */
  NG.Game = {
    state: state,
    milestoneMult: milestoneMult,
    globalBonus: globalBonus,
    incomePerSec: incomePerSec,
    clickPower: clickPower,
    tapUpgradeCost: tapUpgradeCost,
    buyTapUpgrade: buyTapUpgrade,
    addEnergy: addEnergy,
    click: click,
    priceOf: priceOf,
    priceOfN: priceOfN,
    buy: buy,
    buyMany: buyMany,
    tick: tick,
    scheduleMeteor: scheduleMeteor,
    updateMeteor: updateMeteor,
    meteorReward: meteorReward,
    meteorHit: meteorHit,
    rewardedReward: rewardedReward,
    rewardedState: rewardedState,
    claimRewarded: claimRewarded,
    boostState: boostState,
    claimBoost: claimBoost,
    currentLevel: currentLevel,
    prestigeThreshold: prestigeThreshold,
    buildingUnlocked: buildingUnlocked,
    canPrestige: canPrestige,
    prestigePointsEarned: prestigePointsEarned,
    prestige: prestige,
    reset: reset
  };
})();

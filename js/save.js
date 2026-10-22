/* ============================================================
   «Новый рассвет» — сохранения: localStorage + облако Яндекса,
   автосейв, оффлайн-доход (~17%, потолок 8 часов).
   ============================================================ */
(function () {
  'use strict';

  var C = NG.CONFIG;
  var KEY = C.save.localKey;

  function serialize() {
    var s = NG.Game.state;
    return {
      v: 5,
      e: s.energy,
      tE: s.totalEarned,
      sE: s.stintEarned,
      b: s.buildings,
      pg: s.planet,
      pp: s.prestigePoints,
      tl: s.tapLevel || 0,
      ts: Date.now(),
      l: s.lang,
      m: s.muted,
      M: s.music,
      rA: s.lastRewardedAt || 0,
      lB: s.lastBoostAt || 0,
      sB: s.sessionBoost || 0,
      bU: s.boostUntil || 0
    };
  }

  function deserialize(d) {
    if (!d || typeof d !== 'object') return;
    var s = NG.Game.state;
    s.energy = +d.e || 0;
    s.totalEarned = +d.tE || 0;
    s.stintEarned = +d.sE || 0;
    s.buildings = d.b && typeof d.b === 'object' ? d.b : {};
    s.planet = +d.pg || 0;
    s.prestigePoints = +d.pp || 0;
    s.tapLevel = +d.tl || 0;
    s.lastSeen = +d.ts || Date.now();
    if (d.l) s.lang = d.l;
    if (typeof d.m === 'boolean') s.muted = d.m;
    if (typeof d.M === 'boolean') s.music = d.M;
    s.lastRewardedAt = +d.rA || 0;
    s.lastBoostAt = +d.lB || 0;
    s.sessionBoost = +d.sB || 0;
    s.boostUntil = +d.bU || 0;
  }

  function saveLocal() {
    try {
      localStorage.setItem(KEY, JSON.stringify(serialize()));
    } catch (e) { /* приватный режим и т.п. */ }
  }

  function loadLocal() {
    try {
      var raw = localStorage.getItem(KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  }

  function clearLocal() {
    try { localStorage.removeItem(KEY); } catch (e) {}
  }

  /* Полный сброс: чистим localStorage и облако и обнуляем состояние в памяти,
     чтобы перезагрузка гарантированно стартовала с чистого листа. */
  function hardReset() {
    clearLocal();
    NG.Game.reset();
    saveLocal();                    // фиксируем чистое состояние с актуальным ts
    NG.SDK.cloudSave(serialize());  // перезаписываем облако, чтобы не воскресло из него
  }

  /* Оффлайн-доход: ~17% от дохода за время отсутствия (в 3 раза медленнее онлайн), потолок 8 ч. */
  function applyOffline() {
    var s = NG.Game.state;
    var now = Date.now();
    var diffSec = (now - s.lastSeen) / 1000;
    s.lastSeen = now;
    if (diffSec < 5) return null; // короткие перезагрузки не считаем

    var cap = C.offline.capHours * 3600;
    var capped = Math.min(diffSec, cap);
    var gain = NG.Game.incomePerSec() * capped * C.offline.rate;
    if (gain <= 0) return null;

    NG.Game.addEnergy(gain);
    return { gain: gain, seconds: capped };
  }

  NG.Save = {
    serialize: serialize,
    deserialize: deserialize,
    saveLocal: saveLocal,
    loadLocal: loadLocal,
    clearLocal: clearLocal,
    hardReset: hardReset,
    applyOffline: applyOffline
  };
})();

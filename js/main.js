/* ============================================================
   «Новый рассвет» — точка входа: инициализация, игровой цикл,
   автосейв, реклама, метеорит.
   ============================================================ */
(function () {
  'use strict';

  var C = NG.CONFIG;

  function boot() {
    NG.SDK.init().then(function () {
      // Язык платформы
      var lang = NG.SDK.getLang();
      // Dev/съёмка: принудительный язык (?lang=en|ru) — для EN-скриншотов и видео
      var forced = (location.search.match(/[?&]lang=(en|ru)/) || [])[1];
      if (forced) lang = forced;
      NG.I18N.setLang(lang);
      NG.Game.state.lang = lang;

      // Сейв: локальный + облачный, берём более свежий
      var local = NG.Save.loadLocal();
      return NG.SDK.cloudLoad().then(function (cloud) {
        var data = null;
        if (cloud && local) data = cloud.ts > local.ts ? cloud : local;
        else data = cloud || local;
        NG.Save.deserialize(data);

        // Dev: сейв «середина игры» (?seed=mid) — постройки без вех и модалок,
        // прогресс планеты ~50%. Уровень 3 (планета 2): открыты все карточки,
        // порог уровня — 1 млрд, накоплено 500 млн — ровно 50%.
        // Работает без ?dev=1 (панель dev при этом не показывается).
        if (/[?&]seed=mid/.test(location.search)) {
          var st = NG.Game.state;
          st.planet = 2;
          st.buildings = { 1: 9, 2: 7, 3: 5, 4: 3, 5: 1 };
          st.energy = 5e8;
          st.totalEarned = 6e9;
          st.stintEarned = 5e8;
          st.tapLevel = 3;
        }
        // Dev: имитация отсутствия (?offline=1) — час вне игры до автозагрузки,
        // чтобы показать отчёт офлайн-дохода при старте.
        if (/[?&]offline=1/.test(location.search)) {
          NG.Game.state.lastSeen = Date.now() - 3600e3;
        }
        // Dev: готовность престижа (?prestige=1) — накопленная энергия
        // доводится до порога уровня, чтобы открыть модалку «Новая экспедиция».
        if (/[?&]prestige=1/.test(location.search)) {
          NG.Game.state.energy = NG.Game.prestigeThreshold();
        }

        NG.Audio.setMuted(NG.Game.state.muted);
        NG.Audio.setMusic(NG.Game.state.music);

        // Оффлайн-доход
        var off = NG.Save.applyOffline();

        NG.UI.init();

        if (off) {
          NG.Save.saveLocal();
          NG.UI.showOfflineReport(off.gain, off.seconds);
        }

        // Dev: мгновенный спавн метеорита (?meteor=1) для скриншотов/модерации.
        // Жизнь продлевается до 60 с, чтобы успеть снять кадр.
        if (/[?&]meteor=1/.test(location.search)) {
          C.meteor.lifeSec = 60;
          NG.UI.spawnMeteor();
        }

        NG.SDK.loadingReady();
        startLoops();
      });
    });
  }

  function startLoops() {
    // Игровой цикл: тик 100 мс, dt ограничен 1 сек (фон вкладки не «телепортит» доход)
    var last = performance.now();
    setInterval(function () {
      var now = performance.now();
      var dt = Math.min((now - last) / 1000, 1);
      last = now;
      NG.Game.tick(dt);
      NG.Game.updateMeteor(dt);
      NG.UI.renderAll();
    }, 100);

    // Автосейв + лидерборд
    setInterval(function () {
      NG.Save.saveLocal();
      NG.SDK.cloudSave(NG.Save.serialize());
      NG.SDK.submitScore(NG.Game.state.totalEarned);
    }, C.save.autosaveSec * 1000);

    // Реклама: мягкий интервал, без наказаний
    var lastAd = Date.now();
    setInterval(function () {
      if (Date.now() - lastAd >= C.ad.minIntervalSec * 1000) {
        lastAd = Date.now();
        NG.SDK.showInterstitial();
      }
    }, C.ad.checkEverySec * 1000);

    // Метеорит: первый спавн через 3–7 минут
    NG.Game.scheduleMeteor();

    // Сохранение при уходе
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) {
        NG.Game.state.lastSeen = Date.now();
        NG.Save.saveLocal();
        NG.SDK.cloudSave(NG.Save.serialize());
        NG.SDK.submitScore(NG.Game.state.totalEarned);
      }
    });
    window.addEventListener('beforeunload', function () {
      NG.Game.state.lastSeen = Date.now();
      NG.Save.saveLocal();
    });
  }

  boot();
})();

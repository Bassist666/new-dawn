/* ============================================================
   «Новый рассвет» — мост VK Bridge (VK Игры на vk.com).
   Подключается ПОСЛЕ js/sdk.js и ПЕРЕОПРЕДЕЛЯЕТ NG.SDK только
   когда игра реально запущена через VK Bridge (window.vkBridge).

   Каскад платформ:
     1) vk.com   → window.vkBridge есть → работает этот мост;
     2) yandex   → window.YaGames есть  → работает мост из js/sdk.js;
     3) локально → нет ни того, ни другого → заглушка из js/sdk.js.

   Облачные сейвы — через VK WebApp Storage (до ~4 КБ на значение).
   Реклама — VKWebAppShowNativeAds (interstitial / reward).
   Лидерборды: у VK нет публичного web-API «записи счёта» без серверной
   части приложения, поэтому submitScore/getLeaderboard честно
   деградируют (false/null) — UI и так умеет их обрабатывать.
   ============================================================ */
(function () {
  'use strict';

  // Нет VK Bridge (локальная разработка / Яндекс) — не мешаем sdk.js.
  if (!window.vkBridge) return;

  // Ключ облачного сейва: тот же, что и у локального localStorage.
  var KEY = (window.NG && NG.CONFIG && NG.CONFIG.save)
    ? NG.CONFIG.save.localKey
    : 'new-dawn-save';

  var SDK = {
    fake: false,   // VK-мост считается «настоящим» платформенным
    vk: true,
    lang: 'ru',    // проставляется при init() из VKWebAppGetClientInfo

    init: function () {
      return new Promise(function (resolve) {
        var done = false;
        var finish = function () { if (!done) { done = true; resolve(); } };
        // Страховка: если vkBridge есть, но окружение не vk.com и методы
        // не отвечают — не блокируем запуск игры (легенда не «зависает»).
        var guard = setTimeout(finish, 3000);

        try {
          window.vkBridge.send('VKWebAppInit', {})
            .catch(function () { /* web-окружение может не требовать init */ })
            .finally(function () { clearTimeout(guard); finish(); });

          // Язык интерфейса: uk/be/kk и прочие → ru, только en → en
          window.vkBridge.send('VKWebAppGetClientInfo', {})
            .then(function (info) {
              var l = info && info.language;
              SDK.lang = (l === 'en') ? 'en' : 'ru';
            })
            .catch(function () {});
        } catch (e) {
          clearTimeout(guard);
          finish();
        }
      });
    },

    getLang: function () {
      return SDK.lang === 'en' ? 'en' : 'ru';
    },

    // Аналог LoadingAPI: у VK нет обязательного сигнала готовности —
    // инициализация уже прошла в init(); метод оставлен для совместимости.
    loadingReady: function () {
      try { window.vkBridge.send('VKWebAppShowLoadingScreen', {}).catch(function () {}); } catch (e) {}
    },

    // Аналог GameplayAPI: VK не требует стоп/старт геймплея, no-op.
    gameplayStart: function () {},
    gameplayStop: function () {},

    cloudLoad: function () {
      return window.vkBridge.send('VKWebAppStorageGet', { keys: [KEY] })
        .then(function (res) {
          var arr = (res && res.keys) || [];
          var item = arr[0];
          if (!item || !item.value) return null;
          try { return JSON.parse(item.value); } catch (e) { return null; }
        })
        .catch(function () { return null; });
    },

    cloudSave: function (data) {
      return window.vkBridge.send('VKWebAppStorageSet', {
        key: KEY,
        value: JSON.stringify(data || {})
      })
        .then(function () { return true; })
        .catch(function () { return false; });
    },

    // Лидерборд VK требует серверную часть/настройки в консоли VK Игр —
    // для автономного web-билда честно возвращаем false (игра не ломается).
    submitScore: function () {
      return Promise.resolve(false);
    },

    getLeaderboard: function () {
      return Promise.resolve(null);
    },

    showInterstitial: function () {
      return new Promise(function (resolve) {
        try {
          window.vkBridge.send('VKWebAppShowNativeAds', { ad_format: 'interstitial' })
            .then(function () { resolve(true); })
            .catch(function () { resolve(false); });
        } catch (e) { resolve(false); }
      });
    },

    /**
     * Rewarded: VKWebAppShowNativeAds({ ad_format: 'reward' }).
     * Всегда резолвится { shown, rewarded }; страховочный таймаут 90 с,
     * чтобы «подвисшая» реклама не блокировала игрока навсегда.
     */
    showRewardedVideo: function (callbacks) {
      return new Promise(function (resolve) {
        var cb = callbacks || {};
        var done = false;
        var rewarded = false;
        var finish = function (shown) {
          if (done) return;
          done = true;
          resolve({ shown: shown, rewarded: rewarded });
        };
        var guard = setTimeout(function () { finish(false); }, 90000);

        try {
          if (cb.onOpen) cb.onOpen();
          window.vkBridge.send('VKWebAppShowNativeAds', { ad_format: 'reward' })
            .then(function (data) {
              clearTimeout(guard);
              rewarded = !!(data && data.result === true);
              if (rewarded && cb.onRewarded) cb.onRewarded();
              if (cb.onClose) cb.onClose(true);
              finish(true);
            })
            .catch(function (err) {
              clearTimeout(guard);
              if (cb.onError) cb.onError(err);
              if (cb.onClose) cb.onClose(false);
              finish(false);
            });
        } catch (e) {
          clearTimeout(guard);
          finish(false);
        }
      });
    }
  };

  NG.SDK = SDK;
})();

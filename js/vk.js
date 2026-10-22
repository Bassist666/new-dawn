/* ============================================================
   «Новый рассвет» — мост VK Bridge (VK Игры на vk.com).
   Загружается ПОСЛЕ js/sdk.js и ПЕРЕОПРЕДЕЛЯЕТ NG.SDK, только если
   игра запущена внутри VK (признак: query-параметры vk_* от ВКонтакте
   в адресе iframe, либо referrer с vk.com).

   Внешний скрипт VK Bridge НЕ подключается синхронно: он грузится
   динамически с официального CDN с таймаутом, поэтому запуск игры,
   рендер легенды и обработчики не зависят от сети/CDN.

   Каскад платформ:
     1) vk.com   → есть признаки VK → активен этот мост;
     2) yandex   → window.YaGames есть  → мост из js/sdk.js;
     3) локально → нет ни того, ни другого → заглушка из js/sdk.js.

   Лидерборд в VK-версии скрыт: ui.js прячет кнопку по NG.SDK.vk.
   ============================================================ */
(function () {
  'use strict';

  // Признак запуска внутри VK Игр: VK передаёт в iframe query-параметры
  // вида vk_user_id / vk_app_id и т.п. Страховка — referrer с vk.com.
  var q = window.location.search;
  var isVK = /(?:[?&](?:vk_|VK_))/.test(q) ||
             /(?:^|[?&])vk_user_id=/.test(q) ||
             (window.parent !== window &&
              /(?:^|\.)vk\.com$/i.test((document.referrer || '').split('/')[2] || ''));
  if (!isVK) return; // не VK → не мешаем мосту js/sdk.js (Яндекс / локально)

  var BRIDGE_SRC = 'https://unpkg.com/@vkontakte/vk-bridge/dist/browser.min.js';
  var KEY = (window.NG && NG.CONFIG && NG.CONFIG.save)
    ? NG.CONFIG.save.localKey
    : 'new-dawn-save';

  // Динамическая загрузка VK Bridge: async-скрипт + таймаут 4 с,
  // чтобы сетевые проблемы CDN никогда не блокировали запуск игры.
  var bridgePromise = new Promise(function (resolve) {
    if (window.vkBridge) { resolve(); return; }
    var s = document.createElement('script');
    s.src = BRIDGE_SRC;
    s.async = true;
    s.onload = function () { resolve(); };
    s.onerror = function () { resolve(); };
    var guard = setTimeout(function () { resolve(); }, 4000);
    document.head.appendChild(s);
  });

  var SDK = {
    fake: false,
    vk: true,
    lang: 'ru',

    init: function () {
      return bridgePromise.then(function () {
        return new Promise(function (resolve) {
          if (!window.vkBridge) { resolve(); return; } // CDN недоступен — живём на заглушке
          var done = false;
          var finish = function () { if (!done) { done = true; resolve(); } };
          var guard = setTimeout(finish, 3000);

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
        });
      });
    },

    getLang: function () {
      return SDK.lang === 'en' ? 'en' : 'ru';
    },

    // Аналог LoadingAPI: у VK нет обязательного сигнала готовности.
    loadingReady: function () {
      try { window.vkBridge.send('VKWebAppShowLoadingScreen', {}).catch(function () {}); } catch (e) {}
    },

    gameplayStart: function () {},
    gameplayStop: function () {},

    cloudLoad: function () {
      if (!window.vkBridge) return Promise.resolve(null);
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
      if (!window.vkBridge) return Promise.resolve(false);
      return window.vkBridge.send('VKWebAppStorageSet', {
        key: KEY,
        value: JSON.stringify(data || {})
      })
        .then(function () { return true; })
        .catch(function () { return false; });
    },

    // Лидерборд VK требует серверной части — деградируем (кнопка 🏆 скрыта).
    submitScore: function () { return Promise.resolve(false); },
    getLeaderboard: function () { return Promise.resolve(null); },

    showInterstitial: function () {
      return new Promise(function (resolve) {
        if (!window.vkBridge) { resolve(false); return; }
        try {
          window.vkBridge.send('VKWebAppShowNativeAds', { ad_format: 'interstitial' })
            .then(function () { resolve(true); })
            .catch(function () { resolve(false); });
        } catch (e) { resolve(false); }
      });
    },

    /**
     * Rewarded: VKWebAppShowNativeAds({ ad_format: 'reward' }).
     * Всегда резолвится { shown, rewarded }; страховочный таймаут 90 с.
     */
    showRewardedVideo: function (callbacks) {
      return new Promise(function (resolve) {
        var cb = callbacks || {};
        if (!window.vkBridge) { resolve({ shown: false, rewarded: false }); return; }
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

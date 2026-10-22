/* ============================================================
   «Новый рассвет» — мост Yandex Games SDK.
   Если window.YaGames отсутствует (локальная разработка) —
   работает заглушка: игра полностью функциональна, облако
   и реклама безвредно молчат.
   ============================================================ */
(function () {
  'use strict';

  var fakePlayer = {
    getData: function () { return Promise.resolve(null); },
    setData: function () { return Promise.resolve(); }
  };

  var fake = {
    environment: {
      i18n: {
        lang: (navigator.language || 'ru').toLowerCase().indexOf('en') === 0 ? 'en' : 'ru'
      }
    },
    features: {
      LoadingAPI: { ready: function () {} },
      GameplayAPI: { start: function () {}, stop: function () {} }
    },
    getPlayer: function () { return Promise.resolve(fakePlayer); },
    getLeaderboards: function () { return Promise.reject(new Error('no leaderboards in fake SDK')); },
    adv: {
      showFullscreenAdv: function () { return Promise.reject(new Error('no ads in fake SDK')); },
      // Заглушка rewarded-видео: имитирует показ и выставляет награду.
      showRewardedVideo: function (opts) {
        var cb = (opts && opts.callbacks) || {};
        setTimeout(function () {
          if (cb.onOpen) cb.onOpen();
          setTimeout(function () {
            if (cb.onRewarded) cb.onRewarded();
            if (cb.onClose) cb.onClose(true);
          }, 700);
        }, 300);
      }
    }
  };

  var SDK = {
    ysdk: null,
    fake: false,

    init: function () {
      return new Promise(function (resolve) {
        if (window.YaGames) {
          window.YaGames.init().then(function (ysdk) {
            SDK.ysdk = ysdk;
            SDK.fake = false;
            resolve();
          }).catch(function () {
            SDK.ysdk = fake;
            SDK.fake = true;
            resolve();
          });
        } else {
          SDK.ysdk = fake;
          SDK.fake = true;
          resolve();
        }
      });
    },

    getLang: function () {
      try {
        var l = SDK.ysdk.environment.i18n.lang;
        return l === 'en' ? 'en' : 'ru';
      } catch (e) { return 'ru'; }
    },

    loadingReady: function () {
      try {
        if (SDK.ysdk.features && SDK.ysdk.features.LoadingAPI) SDK.ysdk.features.LoadingAPI.ready();
      } catch (e) {}
    },

    gameplayStart: function () {
      try {
        if (SDK.ysdk.features && SDK.ysdk.features.GameplayAPI) SDK.ysdk.features.GameplayAPI.start();
      } catch (e) {}
    },

    gameplayStop: function () {
      try {
        if (SDK.ysdk.features && SDK.ysdk.features.GameplayAPI) SDK.ysdk.features.GameplayAPI.stop();
      } catch (e) {}
    },

    cloudLoad: function () {
      return SDK.ysdk.getPlayer().then(function (player) {
        return player.getData();
      }).then(function (data) {
        return data && typeof data === 'object' ? data : null;
      }).catch(function () { return null; });
    },

    cloudSave: function (data) {
      return SDK.ysdk.getPlayer().then(function (player) {
        return player.setData(data);
      }).then(function () { return true; }).catch(function () { return false; });
    },

    submitScore: function (score) {
      try {
        return SDK.ysdk.getLeaderboards().then(function (lb) {
          return lb.setLeaderboardScore('total', Math.floor(score));
        }).then(function () { return true; }).catch(function () { return false; });
      } catch (e) { return Promise.resolve(false); }
    },

    // Просмотр таблицы лидеров: топ-5 + записи вокруг игрока.
    // Резолвится объектом { entries, playerRank, total } или null,
    // если лидерборд недоступен (заглушка / ошибка / пусто).
    getLeaderboard: function () {
      try {
        return SDK.ysdk.getLeaderboards().then(function (lb) {
          return lb.getLeaderboardEntries('total', {
            quantityTop: 5,
            quantityAround: 3,
            includeMeta: true
          });
        }).then(function (data) {
          if (!data || !data.leaderboard) return null;
          return {
            entries: data.leaderboard,
            playerRank: (typeof data.rang === 'number' && data.rang > 0) ? data.rang : 0,
            total: typeof data.total === 'number' ? data.total : 0
          };
        }).catch(function () { return null; });
      } catch (e) { return Promise.resolve(null); }
    },

    showInterstitial: function () {
      try {
        if (!SDK.ysdk.adv) return Promise.resolve(false);
        SDK.gameplayStop();
        return SDK.ysdk.adv.showFullscreenAdv({ callbacks: {} })
          .then(function () { SDK.gameplayStart(); return true; })
          .catch(function () { SDK.gameplayStart(); return false; });
      } catch (e) { SDK.gameplayStart(); return Promise.resolve(false); }
    },

    /**
     * Rewarded-видео: показ инициирует сам игрок, награда выдаётся
     * в колбэке onRewarded. Метод всегда резолвится с объектом:
     *   { shown: boolean, rewarded: boolean }
     * На случай «подвисшего» ролика есть страховочный таймаут 90 с.
     */
    showRewardedVideo: function (callbacks) {
      return new Promise(function (resolve) {
        var cb = callbacks || {};
        try {
          if (!SDK.ysdk.adv || typeof SDK.ysdk.adv.showRewardedVideo !== 'function') {
            resolve({ shown: false, rewarded: false });
            return;
          }
          SDK.gameplayStop();

          var done = false;
          var rewarded = false;
          var finish = function (shown) {
            if (done) return;
            done = true;
            SDK.gameplayStart();
            resolve({ shown: shown, rewarded: rewarded });
          };
          var guard = setTimeout(function () { finish(false); }, 90000);

          SDK.ysdk.adv.showRewardedVideo({
            callbacks: {
              onOpen: function () { if (cb.onOpen) cb.onOpen(); },
              onRewarded: function () {
                rewarded = true;
                if (cb.onRewarded) cb.onRewarded();
              },
              onClose: function (wasShown) {
                clearTimeout(guard);
                if (cb.onClose) cb.onClose(wasShown);
                finish(!!wasShown);
              },
              onError: function (error) {
                clearTimeout(guard);
                if (cb.onError) cb.onError(error);
                finish(false);
              }
            }
          });
        } catch (e) {
          SDK.gameplayStart();
          resolve({ shown: false, rewarded: false });
        }
      });
    }
  };

  NG.SDK = SDK;
})();

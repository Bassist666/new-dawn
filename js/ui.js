/* ============================================================
   «Новый рассвет» — интерфейс: HUD, реактор, постройки,
   тосты диспетчера, модалки, метеорит, dev-панель.
   ============================================================ */
(function () {
  'use strict';

  var C = NG.CONFIG;
  var t = NG.I18N.t;
  var fmt = NG.Utils.fmtFull;  // полные числа — только для основного счётчика энергии
  var fmtShort = NG.Utils.fmt; // сокращённые (K/M/B/T) — всё остальное: цены, доход, награды

  var els = {};
  var buildingCards = [];
  var boosterCards = [];   // карточки бустеров за просмотр (в панели покупок — сразу за ручной зарядкой)
  var dispatcherTimer = null;
  var renderedLevel = -1;  // уровень, под который собраны карточки панели покупок

  // Счётчик энергии: плавное «догоняние» значения + пульс при изменении
  var energyDisplay = null;   // отображаемое значение («догоняет» реальное)
  var lastEnergyInt = 0;      // последняя показанная целая часть

  function $(sel) { return document.querySelector(sel); }

  function init() {
    els.loading = $('#loading-screen');
    els.game = $('#game-screen');
    els.energy = $('#energy-value');
    els.perSec = $('#per-sec-value');
    els.planet = $('#planet-name');
    els.bonus = $('#prestige-points');
    els.nextPlanetFill = $('#next-planet-fill');
    els.nextPlanetText = $('#next-planet-text');
    els.prestigeBtn = $('#prestige-btn');
    els.buildingsList = $('#buildings-list');
    els.buildingsPanel = $('#buildings-panel');
    els.toasts = $('#toasts');
    els.meteorLayer = $('#meteor-layer');
    els.particles = $('#particles');
    els.tapCost = $('#tap-cost');
    els.workers = $('#workers');
    els.dispatcher = $('#dispatcher');
    els.dispatcherBubble = els.dispatcher ? els.dispatcher.querySelector('.dispatcher-bubble') : null;
    els.offlineText = $('#offline-text');
    els.milestoneText = $('#milestone-text');
    els.prestigeText1 = $('#prestige-text1');
    els.prestigeText2 = $('#prestige-text2');
    els.prestigeEarned = $('#prestige-earned');
    els.soundToggle = $('#sound-toggle');
    els.musicToggle = $('#music-toggle');
    els.langToggle = $('#lang-toggle');
    els.rewardedText = $('#rewarded-text');
    els.boostText = $('#boost-text');
    els.leaderboardBtn = $('#leaderboard-btn');
    els.leaderboardList = $('#leaderboard-list');
    els.leaderboardMeta = $('#leaderboard-meta');

    // VK-версия: лидерборд не подключён (у VK нет публичного web-API записи
    // счёта), поэтому кнопку 🏆 скрываем — не показываем нерабочую функцию.
    if (NG.SDK && NG.SDK.vk && els.leaderboardBtn) {
      els.leaderboardBtn.classList.add('hidden');
    }

    // Легенда → игра
    $('#legend-start').addEventListener('click', function () {
      NG.Audio.click();
      els.loading.classList.add('hidden');
      els.game.classList.remove('hidden');
      NG.SDK.loadingReady();
      NG.Events.emit('gameStart');
    });

    // Dev: автозапуск (?autostart=1) — пропускает легенду
    if (/[?&]autostart=1/.test(location.search)) {
      $('#legend-start').click();
    }

    // Панель реактора — главная тап-зона
    $('#reactor-panel').addEventListener('click', function (e) {
      var p = NG.Game.click();
      NG.Audio.click();
      spawnParticle(e.clientX, e.clientY, '+' + fmtShort(p));
    });

    renderBuildings();
    generateStars();
    renderWorkers();
    setupDispatcher();

    // Стрелка-подсказка панели покупок: пересчитывать при прокрутке и ресайзе
    els.buildingsList.addEventListener('scroll', updateScrollHint);
    window.addEventListener('resize', updateScrollHint);
    updateScrollHint();

    // Престиж
    els.prestigeBtn.addEventListener('click', function () {
      NG.Audio.click();
      showPrestigeModal();
    });

    // Настройки
    $('#settings-btn').addEventListener('click', function () {
      NG.Audio.click();
      showModal('modal-settings');
    });
    els.soundToggle.addEventListener('click', function () {
      var m = !NG.Audio.isMuted();
      NG.Audio.setMuted(m);
      NG.Game.state.muted = m;
      updateSettingsUI();
    });
    els.musicToggle.addEventListener('click', function () {
      var m = !NG.Audio.isMusic();
      NG.Audio.setMusic(m);
      NG.Game.state.music = m;
      updateSettingsUI();
    });
    els.langToggle.addEventListener('click', function () {
      var l = NG.I18N.lang === 'ru' ? 'en' : 'ru';
      NG.I18N.setLang(l);
      NG.Game.state.lang = l;
      applyI18n();
      renderBuildings();
      updateSettingsUI();
      renderAll();
    });

    // Рекорды: кнопка в HUD → таблица лидеров (топ-5 + записи вокруг игрока)
    els.leaderboardBtn.addEventListener('click', function () {
      NG.Audio.click();
      showLeaderboard();
    });

    $('#rewarded-confirm').addEventListener('click', function () {
      NG.Audio.click();
      hideModal('modal-rewarded');
      var granted = false;
      NG.SDK.showRewardedVideo({
        onRewarded: function () {
          granted = true;
          var r = NG.Game.claimRewarded();
          NG.Audio.milestone();
          toast(t('rewarded_reward', { n: fmtShort(r) }));
          dispatcherSay(t('rewarded_reward', { n: fmtShort(r) }));
        }
      }).then(function (res) {
        if (!res.shown && !granted) toast(t('rewarded_error'));
        NG.Save.saveLocal();
        NG.SDK.cloudSave(NG.Save.serialize());
        NG.SDK.submitScore(NG.Game.state.totalEarned);
        renderAll();
      });
    });

    $('#rewarded-close').addEventListener('click', function () {
      hideModal('modal-rewarded');
    });

    $('#boost-confirm').addEventListener('click', function () {
      NG.Audio.click();
      hideModal('modal-boost');
      var granted = false;
      NG.SDK.showRewardedVideo({
        onRewarded: function () {
          granted = true;
          var r = NG.Game.claimBoost();
          NG.Audio.milestone();
          toast(t('boost_reward', { s: r.seconds }));
          dispatcherSay(t('boost_reward', { s: r.seconds }));
        }
      }).then(function (res) {
        if (!res.shown && !granted) toast(t('boost_error'));
        NG.Save.saveLocal();
        NG.SDK.cloudSave(NG.Save.serialize());
        NG.SDK.submitScore(NG.Game.state.totalEarned);
        renderAll();
      });
    });

    $('#boost-close').addEventListener('click', function () {
      hideModal('modal-boost');
    });

    // Бустеры за просмотр: единая точка входа для карточек панели покупок
    function openRewardedModal() {
      var rw = NG.Game.rewardedState();
      if (!rw.ready) {
        if (rw.maxed) toast(t('rewarded_limit'));
        else toast(t('rewarded_cooldown', { s: rw.secsLeft }));
        return;
      }
      els.rewardedText.textContent = t('rewarded_text', { n: fmtShort(rw.reward) });
      showModal('modal-rewarded');
    }

    function openBoostModal() {
      var b = NG.Game.boostState();
      if (!b.ready) {
        if (b.maxed) toast(t('boost_limit'));
        else toast(t('boost_cooldown', { s: b.secsLeft }));
        return;
      }
      els.boostText.textContent = t('boost_text', { m: Math.round(b.durationSec / 60) });
      showModal('modal-boost');
    }

    // Панель покупок: клик по любой карточке бустера (кнопке или всей области
    // карточки) открывает модалку просмотра. Делегирование устойчиво к
    // пересозданию списка при смене языка/рендере.
    els.buildingsList.addEventListener('click', function (e) {
      if (!e.target || !e.target.closest) return;
      var card = e.target.closest('.booster-card');
      if (!card || !card.dataset) return;
      if (card.dataset.booster === 'rewarded') openRewardedModal();
      else if (card.dataset.booster === 'boost') openBoostModal();
    });

    // Закрытие модалок (кроме кнопки подтверждения престижа)
    document.querySelectorAll('.modal .btn-primary:not(#prestige-confirm):not(#rewarded-confirm):not(#boost-confirm)').forEach(function (b) {
      b.addEventListener('click', function () {
        hideModal(b.closest('.modal').id);
      });
    });

    // Подтверждение престижа
    $('#prestige-confirm').addEventListener('click', function () {
      var res = NG.Game.prestige();
      hideModal('modal-prestige');
      if (res) {
        NG.Audio.prestige();
        NG.Save.saveLocal();
        NG.SDK.cloudSave(NG.Save.serialize());
        NG.SDK.submitScore(NG.Game.state.totalEarned);
        applyPlanetTheme();
        renderAll();
      }
    });

    // События игры
    NG.Events.on('firstBuy', function (i) {
      var logKey = C.buildings[i].logKey;
      if (logKey) {
        toast(t(logKey));
        dispatcherSay(t(logKey));
      }
    });
    NG.Events.on('buy', function () {
      NG.Audio.buy();
      renderAll();
    });
    NG.Events.on('milestone', function (d) {
      NG.Audio.milestone();
      showMilestoneModal(t(d.textKey));
      dispatcherSay(t(d.textKey));
    });
    NG.Events.on('meteorSpawn', function () {
      spawnMeteor();
    });
    NG.Events.on('meteorHit', function (r) {
      NG.Audio.meteor();
      toast(t('meteor_hit', { n: fmtShort(r) }));
      dispatcherSay(t('meteor_hit', { n: fmtShort(r) }));
    });

    setupDev();
    applyPlanetTheme();
    applyI18n();
    updateSettingsUI();
    renderAll();
  }

  /* ---------- Постройки ---------- */
  function renderBuildings() {
    els.buildingsList.innerHTML = '';
    buildingCards = [];

    function addBuildingCard(b, i) {
      var unlocked = NG.Game.buildingUnlocked(i);
      var card = document.createElement('div');
      card.className = 'building-card' + (unlocked ? '' : ' locked');

      var head = document.createElement('div');
      head.className = 'b-head';
      var name = document.createElement('span');
      name.className = 'b-name';
      name.textContent = (b.icon ? b.icon + ' ' : '') + t(b.nameKey);
      var count = document.createElement('span');
      count.className = 'b-count';
      count.textContent = unlocked ? '×0' : '🔒';
      head.appendChild(name);
      head.appendChild(count);

      var desc = document.createElement('div');
      desc.className = 'b-desc';
      desc.textContent = t(b.descKey);

      var foot = document.createElement('div');
      foot.className = 'b-foot';
      var income = document.createElement('span');
      income.className = 'b-income';
      foot.appendChild(income);

      var btn = null;
      var btn10 = null;
      var btnTap = null;
      if (!unlocked) {
        // Карточка заблокирована до уровня N: вместо кнопок — плашка с замком
        var lock = document.createElement('div');
        lock.className = 'b-lock';
        var lockIcon = document.createElement('span');
        lockIcon.className = 'b-lock-icon';
        lockIcon.textContent = '🔒';
        var lockText = document.createElement('span');
        lockText.className = 'b-lock-text';
        lockText.textContent = t('locked_at_level', { n: b.unlockLevel });
        lock.appendChild(lockIcon);
        lock.appendChild(lockText);
        foot.appendChild(lock);
      } else if (i === 0) {
        // Карточка реактора: апгрейд силы тапа за энергию
        btnTap = document.createElement('button');
        btnTap.type = 'button';
        btnTap.className = 'btn btn-small b-buy b-tap-upgrade';
        btnTap.addEventListener('click', function () {
          if (NG.Game.buyTapUpgrade()) {
            flyToReactor(btnTap, '⚡');
          }
        });
        foot.appendChild(btnTap);
      } else {
        var btns = document.createElement('div');
        btns.className = 'b-btns';

        btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'btn btn-small b-buy';
        btn.addEventListener('click', function () {
          if (NG.Game.buy(i)) flyToReactor(btn, b.icon);
        });
        btns.appendChild(btn);

        btn10 = document.createElement('button');
        btn10.type = 'button';
        btn10.className = 'btn btn-small b-buy10';
        btn10.addEventListener('click', function () {
          if (NG.Game.buyMany(i, 10)) flyToReactor(btn10, b.icon);
        });
        btns.appendChild(btn10);

        foot.appendChild(btns);
      }

      card.appendChild(head);
      card.appendChild(desc);
      card.appendChild(foot);
      els.buildingsList.appendChild(card);

      buildingCards.push({ card: card, count: count, income: income, btn: btn, btn10: btn10, btnTap: btnTap });
    }

    // 1) Ручная зарядка реактора — первая карточка панели покупок
    addBuildingCard(C.buildings[0], 0);
    // 2) Бустеры за просмотр — следом за ручной зарядкой
    createBoosterCards();
    // 3) Остальные постройки
    for (var i = 1; i < C.buildings.length; i++) {
      addBuildingCard(C.buildings[i], i);
    }

    updateScrollHint();
  }

  /* Стрелка-подсказка панели покупок: видна, пока в списке есть
     невидимые карточки ниже (список прокручивается и не в конце). */
  function updateScrollHint() {
    var list = els.buildingsList;
    var panel = els.buildingsPanel;
    if (!list || !panel) return;
    var scrollable = list.scrollHeight - list.clientHeight > 4;
    var atBottom = list.scrollTop + list.clientHeight >= list.scrollHeight - 8;
    panel.classList.toggle('has-more', scrollable && !atBottom);
  }

  /* ---------- Бустеры за просмотр: карточки панели покупок (сразу за ручной зарядкой) ---------- */
  function buildBoosterCard() {
    var card = document.createElement('div');
    card.className = 'building-card booster-card';

    var head = document.createElement('div');
    head.className = 'b-head';
    var name = document.createElement('span');
    name.className = 'b-name';
    var count = document.createElement('span');
    count.className = 'b-count';
    head.appendChild(name);
    head.appendChild(count);

    var desc = document.createElement('div');
    desc.className = 'b-desc';

    var foot = document.createElement('div');
    foot.className = 'b-foot';
    var income = document.createElement('span');
    income.className = 'b-income';
    foot.appendChild(income);

    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn btn-small';
    foot.appendChild(btn);

    card.appendChild(head);
    card.appendChild(desc);
    card.appendChild(foot);
    els.buildingsList.appendChild(card);

    return { card: card, name: name, count: count, desc: desc, income: income, btn: btn };
  }

  function createBoosterCards() {
    boosterCards = [];

    // Карточка 1: rewarded-энергия — оплата просмотром
    var rw = buildBoosterCard();
    rw.card.classList.add('booster-rewarded');
    rw.card.dataset.booster = 'rewarded';
    rw.name.textContent = '🛰️ ' + t('bRew_name');
    rw.desc.textContent = t('bRew_desc');
    rw.btn.classList.add('btn-watch');
    boosterCards.push(rw);

    // Карточка 2: буст добычи ×2 — оплата просмотром
    var bs = buildBoosterCard();
    bs.card.classList.add('booster-boost');
    bs.card.dataset.booster = 'boost';
    bs.name.textContent = '⚡ ' + t('bBoost_name');
    bs.desc.textContent = t('bBoost_desc');
    bs.btn.classList.add('btn-watch');
    boosterCards.push(bs);
  }

  function renderBoosterCards() {
    if (!boosterCards.length) return;

    // Карточка rewarded-энергии: награда / кулдаун / суточный лимит
    var rw = NG.Game.rewardedState();
    var r = boosterCards[0];
    r.income.textContent = '⚡ +' + fmtShort(rw.reward);
    if (rw.maxed) {
      r.count.textContent = t('card_maxed');
      r.btn.textContent = t('card_maxed');
      r.btn.disabled = true;
      r.btn.classList.remove('cooling', 'active');
    } else if (rw.ready) {
      r.count.textContent = t('card_ready');
      r.btn.textContent = '🎬 ' + t('watch_btn');
      r.btn.disabled = false;
      r.btn.classList.remove('cooling', 'active');
    } else {
      r.count.textContent = fmtClock(rw.secsLeft);
      r.btn.textContent = fmtClock(rw.secsLeft);
      r.btn.disabled = true;
      r.btn.classList.add('cooling');
      r.btn.classList.remove('active');
    }

    // Карточка буста ×2: активно / готово / кулдаун / лимит сессии
    var b = NG.Game.boostState();
    var bb = boosterCards[1];
    bb.income.textContent = t('boost_income', { m: Math.round(b.durationSec / 60) });
    if (b.active) {
      bb.count.textContent = '×2 ' + fmtClock(b.remainingSec);
      bb.btn.textContent = '⚡×2 ' + fmtClock(b.remainingSec);
      bb.btn.disabled = false;
      bb.btn.classList.remove('cooling');
      bb.btn.classList.add('active');
    } else if (b.maxed) {
      bb.count.textContent = t('card_maxed');
      bb.btn.textContent = t('card_maxed');
      bb.btn.disabled = true;
      bb.btn.classList.remove('active', 'cooling');
    } else if (b.ready) {
      bb.count.textContent = t('card_ready');
      bb.btn.textContent = '🎬 ' + t('watch_btn');
      bb.btn.disabled = false;
      bb.btn.classList.remove('active', 'cooling');
    } else {
      bb.count.textContent = fmtClock(b.secsLeft);
      bb.btn.textContent = fmtClock(b.secsLeft);
      bb.btn.disabled = true;
      bb.btn.classList.remove('active');
      bb.btn.classList.add('cooling');
    }
  }

  /* ---------- Рендер ---------- */
  function renderAll() {
    var s = NG.Game.state;

    // Состав карточек панели покупок зависит от уровня (планеты):
    // при смене уровня пересоздаём список, чтобы разблокировать новые карточки.
    if (NG.Game.currentLevel() !== renderedLevel) {
      renderedLevel = NG.Game.currentLevel();
      renderBuildings();
    }

    var target = s.energy;

    // Плавное движение отображаемого значения к реальному — цифры «бегут»
    if (energyDisplay === null) {
      energyDisplay = target;
    } else {
      energyDisplay += (target - energyDisplay) * 0.4;
      if (Math.abs(target - energyDisplay) < 0.05) energyDisplay = target;
    }

    // Полное число накопленной энергии
    els.energy.textContent = fmt(energyDisplay);
    fitEnergyFont();

    // Пульс счётчика: виден рост энергии (или трата при покупках)
    var intNow = Math.floor(energyDisplay);
    if (intNow > lastEnergyInt) {
      els.energy.classList.add('energy-up');
      els.energy.classList.remove('energy-down');
    } else if (intNow < lastEnergyInt) {
      els.energy.classList.add('energy-down');
      els.energy.classList.remove('energy-up');
    } else {
      els.energy.classList.remove('energy-up');
      els.energy.classList.remove('energy-down');
    }
    lastEnergyInt = intNow;

    els.perSec.textContent = fmtShort(NG.Game.incomePerSec()) + '/с';
    els.planet.textContent = t(C.planets[s.planet].nameKey);
    els.bonus.textContent = t('hud_bonus') + ': +' + fmtShort(s.prestigePoints * C.prestige.bonusPerPoint * 100) + '%';
    els.prestigeBtn.classList.toggle('hidden', !NG.Game.canPrestige());

    // Прогресс до следующей планеты (порог престижа текущего уровня).
    // Согласуется с накопленной энергией state.energy: бар, счётчик «осталось»
    // и кнопка перехода используют один и тот же источник.
    if (els.nextPlanetFill && els.nextPlanetText) {
      var threshold = NG.Game.prestigeThreshold();
      var need = Math.max(0, threshold - s.energy);
      var pct = Math.min(100, s.energy / threshold * 100);
      els.nextPlanetFill.style.width = pct + '%';
      els.nextPlanetText.textContent = need > 0
        ? t('hud_next_planet', { n: fmtShort(need) })
        : t('hud_next_ready');
      els.nextPlanetText.classList.toggle('ready', need <= 0);
    }

    // Индикатор тапа: сила и уровень апгрейда
    if (els.tapCost) {
      var power = NG.Game.clickPower();
      els.tapCost.textContent = t('tap_power') + ': +' + fmtShort(power) +
        ' • ' + t('tap_level') + ': ' + (s.tapLevel || 0);
    }

    buildingCards.forEach(function (bc, i) {
      // Заблокированные по уровню карточки: замок и подсказка вместо цен и кнопок
      if (!NG.Game.buildingUnlocked(i)) {
        bc.count.textContent = '🔒';
        bc.income.textContent = t('lock_level', { n: C.buildings[i].unlockLevel });
        return;
      }
      var n = s.buildings[i] || 0;
      if (i === 0) {
        bc.count.textContent = t('tap_level') + ' ' + (s.tapLevel || 0);
        bc.income.textContent = fmtShort(NG.Game.clickPower()) + ' ' + t('per_tap');
      } else {
        bc.count.textContent = '×' + n;
        bc.income.textContent = fmtShort(C.buildings[i].baseIncome * n * NG.Game.milestoneMult(n)) + '/с';
      }
      if (bc.btn) {
        var price = NG.Game.priceOf(i);
        bc.btn.textContent = t('buy_btn') + ' ' + fmtShort(price);
        bc.btn.disabled = s.energy < price;
      }
      if (bc.btn10) {
        var price10 = NG.Game.priceOfN(i, 10);
        bc.btn10.textContent = t('buy_10_btn') + ' ' + fmtShort(price10);
        bc.btn10.disabled = s.energy < price10;
      }
      if (bc.btnTap) {
        var tapPrice = NG.Game.tapUpgradeCost();
        bc.btnTap.textContent = t('tap_upgrade_btn') + ' ' + fmtShort(tapPrice);
        bc.btnTap.disabled = s.energy < tapPrice;
      }
    });

    renderBoosterCards();
    renderWorkers();
  }

  /* ---------- Таймер в формате м:сс для кнопок ---------- */
  function fmtClock(sec) {
    sec = Math.max(0, Math.floor(sec));
    var m = Math.floor(sec / 60);
    var s = sec % 60;
    return m + ':' + (s < 10 ? '0' + s : s);
  }

  /* ---------- Тосты диспетчера ---------- */
  function toast(text) {
    var el = document.createElement('div');
    el.className = 'toast';
    el.textContent = text;
    els.toasts.appendChild(el);
    while (els.toasts.children.length > 3) {
      els.toasts.removeChild(els.toasts.firstChild);
    }
    setTimeout(function () {
      el.classList.add('leaving');
      setTimeout(function () { el.remove(); }, 320);
    }, 4000);
  }

  /* ---------- Модалки ---------- */
  function showModal(id) {
    document.getElementById(id).classList.remove('hidden');
  }

  function hideModal(id) {
    document.getElementById(id).classList.add('hidden');
  }

  function showOfflineReport(gain, seconds) {
    var phrase = NG.I18N.randomPhrase('offline_phrases');
    els.offlineText.textContent = t('offline_text', { energy: fmtShort(gain), phrase: phrase });
    NG.Audio.offline();
    showModal('modal-offline');
  }

  function showMilestoneModal(text) {
    els.milestoneText.textContent = text;
    showModal('modal-milestone');
  }

  function showPrestigeModal() {
    var pts = NG.Game.prestigePointsEarned();
    var percent = pts * C.prestige.bonusPerPoint * 100;
    els.prestigeText1.textContent = t('prestige_text1');
    els.prestigeText2.textContent = t('prestige_text2', { percent: fmtShort(percent) });
    els.prestigeEarned.textContent = t('prestige_earned', { points: fmtShort(pts) });
    showModal('modal-prestige');
  }

  /* ---------- Таблица лидеров ---------- */
  function showLeaderboard() {
    showModal('modal-leaderboard');
    els.leaderboardMeta.textContent = '';
    els.leaderboardList.innerHTML = '<div class="lb-note">' + t('leaderboard_loading') + '</div>';

    NG.SDK.getLeaderboard().then(function (data) {
      if (!data || !data.entries || !data.entries.length) {
        els.leaderboardList.innerHTML = '<div class="lb-note">' +
          t(data ? 'leaderboard_empty' : 'leaderboard_error') + '</div>';
        return;
      }
      if (data.playerRank > 0 && data.total > 0) {
        els.leaderboardMeta.textContent = t('leaderboard_rank', {
          r: data.playerRank,
          total: data.total
        });
      }
      els.leaderboardList.innerHTML = '';
      data.entries.forEach(function (e) {
        var row = document.createElement('div');
        row.className = 'lb-row' + (e.me ? ' me' : '');

        var rank = document.createElement('span');
        rank.className = 'lb-rank';
        rank.textContent = e.rank != null ? e.rank : '—';

        var av = document.createElement('span');
        av.className = 'lb-avatar';
        if (e.player && e.player.avatar) {
          var img = document.createElement('img');
          img.src = e.player.avatar;
          img.alt = '';
          av.appendChild(img);
        } else {
          av.textContent = '👤';
        }

        var name = document.createElement('span');
        name.className = 'lb-name';
        var nick = (e.player && (e.player.publicName || e.player.uniqueID)) || 'Player';
        name.textContent = nick;
        name.title = nick;

        var score = document.createElement('span');
        score.className = 'lb-score';
        score.textContent = e.score != null ? fmtShort(e.score) : '—';

        row.appendChild(rank);
        row.appendChild(av);
        row.appendChild(name);
        row.appendChild(score);
        els.leaderboardList.appendChild(row);
      });
    });
  }

  /* ---------- Счётчик энергии: подгон размера под длину числа ---------- */
  function fitEnergyFont() {
    var len = els.energy.textContent.length;
    els.energy.style.removeProperty('font-size');
    if (len <= 11) return;
    var base = window.innerWidth <= 860 ? 36 : 48;
    var size = len <= 16 ? base * 0.8 : len <= 22 ? base * 0.62 : base * 0.5;
    els.energy.style.fontSize = Math.round(size) + 'px';
  }

  /* ---------- Партиклы энергии ---------- */
  function spawnParticle(x, y, text) {
    var rect = els.particles.getBoundingClientRect();
    var el = document.createElement('div');
    el.className = 'particle';
    el.textContent = text;
    el.style.left = (x - rect.left) + 'px';
    el.style.top = (y - rect.top) + 'px';
    els.particles.appendChild(el);
    setTimeout(function () { el.remove(); }, 1000);
  }

  /* ---------- Метеорит ---------- */
  function spawnMeteor() {
    var vw = window.innerWidth;
    var vh = window.innerHeight;
    var fromLeft = Math.random() < 0.5;
    var startX = fromLeft ? -60 : vw + 60;
    var startY = vh * (0.1 + Math.random() * 0.25);
    var endX = fromLeft ? vw + 60 : -60;
    var endY = vh * (0.6 + Math.random() * 0.3);

    var el = document.createElement('div');
    el.className = 'meteor';
    el.style.left = startX + 'px';
    el.style.top = startY + 'px';
    el.style.setProperty('--dx', (endX - startX) + 'px');
    el.style.setProperty('--dy', (endY - startY) + 'px');
    el.style.setProperty('--dur', C.meteor.lifeSec + 's');

    var hint = document.createElement('span');
    hint.className = 'meteor-hint';
    hint.textContent = t('meteor_hint');
    el.appendChild(hint);

    var hit = false;
    el.addEventListener('click', function (e) {
      e.stopPropagation();
      if (hit) return;
      hit = true;
      var r = NG.Game.meteorHit();
      spawnParticle(e.clientX, e.clientY, '+' + fmtShort(r));
      el.remove();
    });

    els.meteorLayer.appendChild(el);

    setTimeout(function () {
      if (!hit) {
        el.remove();
        toast(t('meteor_3'));
      }
    }, C.meteor.lifeSec * 1000);

    toast(t(Math.random() < 0.5 ? 'meteor_1' : 'meteor_2'));
  }

  /* ---------- Тема планеты ---------- */
  function applyPlanetTheme() {
    document.body.dataset.planet = NG.Game.state.planet;
  }

  /* ---------- i18n по data-атрибутам ---------- */
  function applyI18n() {
    document.querySelectorAll('[data-i18n]').forEach(function (el) {
      el.textContent = t(el.getAttribute('data-i18n'));
    });
    document.querySelectorAll('[data-i18n-title]').forEach(function (el) {
      el.title = t(el.getAttribute('data-i18n-title'));
    });
  }

  function updateSettingsUI() {
    els.soundToggle.textContent = NG.Audio.isMuted() ? t('sound_off') : t('sound_on');
    els.musicToggle.textContent = NG.Audio.isMusic() ? t('music_on') : t('music_off');
    els.langToggle.textContent = NG.I18N.lang.toUpperCase();
  }

  /* ---------- Dev-панель (?dev=1; скрывается флагом &nodev=1) ---------- */
  function setupDev() {
    if (!/[?&]dev=1/.test(location.search)) return;
    if (/[?&]nodev=1/.test(location.search)) return;
    var panel = $('#dev-panel');
    panel.classList.remove('hidden');

    $('#dev-energy').addEventListener('click', function () {
      NG.Game.addEnergy(1e12);
      renderAll();
    });
    $('#dev-meteor').addEventListener('click', function () {
      spawnMeteor();
    });
    $('#dev-rewarded').addEventListener('click', function () {
      openRewardedModal();
    });
    $('#dev-prestige').addEventListener('click', function () {
      NG.Game.state.energy = NG.Game.prestigeThreshold();
      showPrestigeModal();
    });
    $('#dev-reset').addEventListener('click', function () {
      NG.Save.hardReset();
      location.reload();
    });
  }

  /* ---------- Звёздное небо ---------- */
  function generateStars() {
    var layer = $('#stars');
    if (!layer) return;
    layer.innerHTML = '';
    var count = Math.min(160, Math.floor(window.innerWidth * window.innerHeight / 5000));
    for (var i = 0; i < count; i++) {
      var star = document.createElement('div');
      star.className = 'star';
      var size = 1 + Math.random() * 2.2;
      star.style.width = size + 'px';
      star.style.height = size + 'px';
      star.style.left = (Math.random() * 100) + '%';
      star.style.top = (Math.random() * 100) + '%';
      star.style.animationDelay = (Math.random() * 5) + 's';
      star.style.animationDuration = (2 + Math.random() * 4) + 's';
      layer.appendChild(star);
    }
  }

  /* ---------- Воркеры вокруг реактора ---------- */
  function renderWorkers() {
    if (!els.workers) return;
    var total = 0;
    for (var i = 1; i < C.buildings.length; i++) total += NG.Game.state.buildings[i] || 0;
    // Воркеры кружат вокруг ядра только пока есть постройки: один на каждые 4
    // (минимум 1 при любой постройке). После престижа/сброса (0 построек) их нет —
    // иначе «призрачный» воркер оставался бы летать вокруг пустого реактора.
    var count = total > 0 ? Math.min(8, Math.max(1, Math.floor(total / 4))) : 0;
    if (els.workers.children.length === count) return; // уже столько же
    els.workers.innerHTML = '';
    var reactorSize = Math.min(window.innerHeight * 0.46, 340);
    for (var k = 0; k < count; k++) {
      var w = document.createElement('div');
      w.className = 'worker';
      var radius = reactorSize / 2 + 18 + Math.random() * 30;
      w.style.setProperty('--radius', radius + 'px');
      w.style.setProperty('--dur', (6 + Math.random() * 6) + 's');
      w.style.setProperty('--delay', (-Math.random() * 8) + 's');
      var size = 10 + Math.random() * 6;
      w.style.width = size + 'px';
      w.style.height = size + 'px';
      w.style.margin = (-size / 2) + 'px 0 0 ' + (-size / 2) + 'px';
      els.workers.appendChild(w);
    }
  }

  /* ---------- Диспетчер ---------- */
  function dispatcherSay(text) {
    if (!els.dispatcher || !els.dispatcherBubble) return;
    els.dispatcherBubble.textContent = text;
    els.dispatcher.classList.add('talking');
    clearTimeout(dispatcherTimer);
    dispatcherTimer = setTimeout(function () {
      els.dispatcher.classList.remove('talking');
    }, 6000);
  }

  function setupDispatcher() {
    if (!els.dispatcher) return;
    // Первая реплика через 6 секунд
    setTimeout(function () {
      dispatcherSay(NG.I18N.randomPhrase('dispatcher'));
    }, 6000);
    // Затем каждые 20–40 секунд
    (function loop() {
      setTimeout(function () {
        dispatcherSay(NG.I18N.randomPhrase('dispatcher'));
        loop();
      }, 20000 + Math.random() * 20000);
    })();
  }

  /* ---------- Анимация полёта усиления к реактору ---------- */
  function flyToReactor(fromEl, icon) {
    var reactor = $('#reactor-panel');
    if (!reactor || !fromEl) return;
    var rRect = reactor.getBoundingClientRect();
    var fRect = fromEl.getBoundingClientRect();
    var fly = document.createElement('div');
    fly.className = 'fly-item';
    fly.textContent = icon || '⚡';
    fly.style.left = (fRect.left + fRect.width / 2) + 'px';
    fly.style.top = (fRect.top + fRect.height / 2) + 'px';
    document.body.appendChild(fly);
    // Принудительный reflow, чтобы transition сработал
    fly.getBoundingClientRect();
    var dx = (rRect.left + rRect.width / 2) - (fRect.left + fRect.width / 2);
    var dy = (rRect.top + rRect.height / 2) - (fRect.top + fRect.height / 2);
    fly.style.transform = 'translate(' + dx + 'px, ' + dy + 'px) scale(.25)';
    fly.style.opacity = '0';
    setTimeout(function () { fly.remove(); }, 800);
  }

  /* ---------- Публичный API ---------- */
  NG.UI = {
    init: init,
    renderAll: renderAll,
    toast: toast,
    showModal: showModal,
    hideModal: hideModal,
    showOfflineReport: showOfflineReport,
    showMilestoneModal: showMilestoneModal,
    showPrestigeModal: showPrestigeModal,
    showLeaderboard: showLeaderboard,
    spawnMeteor: spawnMeteor,
    applyPlanetTheme: applyPlanetTheme
  };
})();

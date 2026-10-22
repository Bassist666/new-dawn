/* ============================================================
   «Новый рассвет» — локализация RU/EN.
   ============================================================ */
(function () {
  'use strict';

  var DICTS = {

    /* ================= РУССКИЙ ================= */
    ru: {
      // Легенда
      legend_title: 'Новый рассвет',
      legend_text: 'Год 2147. Разведывательный зонд «Гелий-1» нашёл планету Ксанту — атмосферу, насыщенную гелием-3, и нулевую радиацию. Короткая телеметрия, долгая тишина.\n\nВы — командир первой экспедиции «Новый рассвет». Всё, что у вас есть: панель орбитальной станции, два дрона в трюме и подпись под приказом: «Человечеству нужна энергия».',
      legend_cta: 'Тапните по панели реактора, командир. Дальше всё пойдёт само',

      // HUD
      hud_energy: 'ЭНЕРГИЯ',
      hud_bonus: 'Бонус',
      hud_next_planet: 'До следующей планеты: {n} ⚡',
      hud_next_ready: 'Планета готова — новая экспедиция!',
      reactor_tap: 'Панель реактора',
      buildings_title: 'Ступени добычи',
      per_tap: 'за тап',

      // Постройки
      b0_name: 'Ручная зарядка реактора',
      b0_desc: 'Ручной привод ещё работает. Иногда — единственное, что работает.',
      b1_name: 'Дроны-сборщики',
      b1_desc: 'Маленькие, упрямые, редко падают в кратеры. Цена 10 × 1.15ⁿ.',
      b1_log: 'Дрон-01 вышел из трюма. Он не знает, что делает, но делает это усердно.',
      b2_name: 'Солнечные фермы',
      b2_desc: 'Орбитальный купол разворачивает полотно зеркал. Свет на Ксанте щедрый.',
      b2_log: 'Первый купол на орбите. Колония перестала быть туристической фотографией.',
      b3_name: 'Атмосферные конденсаторы',
      b3_desc: 'Тянут гелий-3 из верхних слоёв атмосферы. Свист на входе, топливо на выходе.',
      b3_log: 'Конденсатор №1 вышел на режим. Панель реактора впервые за смену мигает спокойно.',
      b4_name: 'Ворп-бурёнки',
      b4_desc: 'Автономные зонды бурят астероиды пояса. Возвращаются с полными трюмами и гордостью.',
      b4_log: 'Бурёнка-01 ушла в пояс. Связь держим. Она держится.',
      b5_name: 'Микрочёрная дыра в ловушке',
      b5_desc: 'Конечная ступень. Чёрная дыра в магнитной клетке испаряется — и это испарение и есть энергия.',
      b5_log: 'Она вращается. Ловушка держит. Математики на Земле прослезились.',
      buy_btn: 'Купить',
      buy_10_btn: 'Купить +10',
      tap_upgrade_btn: 'Усилить тап',
      tap_level: 'Ур.',
      tap_power: 'Сила тапа',
      lock_level: 'Ур. {n}',
      locked_at_level: 'Откроется на уровне {n}',

      // Вехи
      milestone_title: 'Сертификация отряда',
      milestone_x2: 'Отряд выведен на повышенную мощность.',
      milestone_x3_100: 'Инженеры пересобрали отряд в ночной смене. Работает лучше, чем должно.',
      milestone_x3_200: 'Сертификация невозможна — отряд уже считается отдельной цивилизацией. Повышаем.',

      // Метеорит
      meteor_1: 'Объект вошёл в атмосферу. Перехват — или сбор.',
      meteor_2: 'Сканируем: гелий-3 в чистом виде. Повезло.',
      meteor_3: 'Упущен. Диспетчер предлагает не вспоминать об этом.',
      meteor_hit: '+{n} энергии. Диспетчер делает пометку в журнале.',
      meteor_hint: 'ТАП!',

      // Rewarded-реклама
      rewarded_btn: '🎬 Реклама',
      rewarded_cooldown: 'Передача энергии ещё идёт. Подождите {s} с.',
      rewarded_title: 'Пролёт спутника «Прометей»',
      rewarded_text: 'Спутник «Прометей» передаёт энергию с орбитальной станции. Посмотрите короткий сигнал — и получите +{n} энергии.',
      rewarded_confirm: 'Смотреть рекламу',
      rewarded_reward: 'Груз принят: +{n} энергии. Спутник доволен.',
      rewarded_error: 'Связь со спутником потеряна. Попробуйте ещё раз.',
      rewarded_limit: 'Спутник «Прометей» ушёл за орбиту. Возвращайтесь после перезарядки.',

      // Rewarded: буст ×2 на время
      boost_cooldown: 'Импульс заряжается. Подождите {s} с.',
      boost_title: 'Форсаж реактора',
      boost_text: 'Колония переходит на полную мощность. Посмотрите короткий сигнал — и добыча удвоится на {m} минуты.',
      boost_confirm: 'Смотреть рекламу',
      boost_reward: 'Форсаж включён: добыча удвоена на {s} секунд.',
      boost_error: 'Связь с диспетчером потеряна. Попробуйте ещё раз.',
      boost_limit: 'Турбины форсажа перегреты. Возвращайтесь после перезарядки.',

      // Бустеры в панели покупок
      bRew_name: 'Груз «Прометей»',
      bRew_desc: 'Спутник сбрасывает контейнер с энергией прямо с орбиты. Оплата — один короткий ролик.',
      bBoost_name: 'Форсаж добычи',
      bBoost_desc: 'Удваивает добычу колонии на время. Оплата — один короткий ролик.',
      boost_income: '×2 добыча · {m} мин',
      card_ready: 'Готово',
      card_maxed: 'Лимит',
      watch_btn: 'Смотреть',

      // Оффлайн
      offline_title: 'Отчёт о возвращении из гиберснации',
      offline_text: 'Пока вы спали, колония добыла {energy} энергии. {phrase}',
      offline_btn: 'Принято, командир',
      offline_phrases: [
        'Дрон-07 дважды падал в кратер. Оба раза сам выбрался. Диспетчер доволен.',
        'Станция гудела всю смену. Диспетчер выпил третью чашку кофе и не помнит, когда начал первую.',
        'Метеорит пролетел мимо. Диспетчер не стал будить.',
        'Конденсаторы свистели так, что диспетчер надел наушники. Не помогло.',
        'Диспетчер проверил все системы. Все системы в порядке. Это подозрительно.',
        'Дроны устроили гонки вокруг купола. Диспетчер сделал вид, что не заметил.'
      ],

      // Престиж
      prestige_btn: 'Новая экспедиция',
      prestige_title: 'Эксперимент завершён',
      prestige_text1: 'Эксперимент завершён. Колония эвакуирована, данные собраны. Ксанту оставляем диктатору дронов — он справлялся.',
      prestige_text2: 'Координаты следующей цели загружены. Знания экспедиции «Новый рассвет» переносятся с нами: +{percent}% к добыче навсегда.',
      prestige_earned: 'Очки престижа: +{points}',
      prestige_confirm: 'Начать новую экспедицию',

      // Настройки
      settings_title: 'Настройки',
      settings_sound: 'Звук',
      settings_music: 'Музыка',
      settings_lang: 'Язык',
      sound_on: 'Вкл',
      sound_off: 'Выкл',
      music_on: 'Вкл',
      music_off: 'Выкл',
      close_btn: 'Закрыть',

      // Лидерборд
      leaderboard_btn: 'Рекорды экспедиций',
      leaderboard_title: 'Рекорды экспедиций',
      leaderboard_loading: 'Загружаем таблицу лидеров…',
      leaderboard_error: 'Связь с центром галактики потеряна. Попробуйте ещё раз.',
      leaderboard_empty: 'Пока пусто. Оставьте свой след, командир.',
      leaderboard_rank: 'Ваш ранг в галактике: {r} из {total}',

      // Планеты
      planet_xantha: 'Ксанта',
      planet_ervin: 'Эрвин',
      planet_taiga9: 'Тайга-9',
      planet_muur: 'Муур',

      // Диспетчер — случайные комментарии
      dispatcher: [
        'Рекомендую не тапать панель дольше необходимого, командир.',
        'Диспетчер следит за расходом энергии. И за вами. Только за расходом.',
        'Станция в порядке. Насколько это вообще возможно.',
        'Гелий-3 — это хорошо. Гелий-3 — это энергия.',
        'Диспетчер не спит. Диспетчер отдыхает с открытыми глазами.',
        'Если панель начнёт мигать быстрее — это нормально. Наверное.',
        'Дроны снова спорят, кто главный. Диспетчер не вмешивается.',
        'Купол отражает свет красиво. Диспетчер не смотрит. Почти.',
        'Воркеры у реактора работают слаженно. Подозрительно слаженно.',
        'Реактор гудит ровно. Диспетчер считает это хорошим знаком.',
        'Тап по панели — это тоже работа. Самая важная, между прочим.'
      ],

      // Dev
      dev_add: '+1e12',
      dev_meteor: 'Метеорит',
      dev_prestige: 'Престиж',
      dev_reset: 'Сброс'
    },

    /* ================= ENGLISH ================= */
    en: {
      legend_title: 'New Dawn',
      legend_text: 'Year 2147. The reconnaissance probe "Helium-1" found planet Xantha — an atmosphere rich in helium-3 and zero radiation. A short telemetry burst, then a long silence.\n\nYou are the commander of the first expedition "New Dawn". All you have: an orbital station panel, two drones in the hold, and a signature under the order: "Humanity needs energy."',
      legend_cta: 'Tap the reactor panel, commander. Everything else will take care of itself',

      hud_energy: 'ENERGY',
      hud_bonus: 'Bonus',
      hud_next_planet: 'To next planet: {n} ⚡',
      hud_next_ready: 'Next planet ready — new expedition!',
      reactor_tap: 'Reactor panel',
      buildings_title: 'Extraction stages',
      per_tap: 'per tap',

      b0_name: 'Manual reactor charging',
      b0_desc: 'The manual drive still works. Sometimes it is the only thing that works.',
      b1_name: 'Collector drones',
      b1_desc: 'Small, stubborn, rarely fall into craters. Price 10 × 1.15ⁿ.',
      b1_log: 'Drone-01 left the hold. It has no idea what it is doing, but it does it diligently.',
      b2_name: 'Solar farms',
      b2_desc: 'The orbital dome unfurls a sheet of mirrors. Light on Xantha is generous.',
      b2_log: 'First dome in orbit. The colony stopped being a tourist photo.',
      b3_name: 'Atmospheric condensers',
      b3_desc: 'They pull helium-3 from the upper atmosphere. A whistle at the intake, fuel at the output.',
      b3_log: 'Condenser #1 reached operating mode. The reactor panel blinks calmly for the first time this shift.',
      b4_name: 'Warp drills',
      b4_desc: 'Autonomous probes drill belt asteroids. They return with full holds and pride.',
      b4_log: 'Drill-01 left for the belt. We keep in touch. It holds on.',
      b5_name: 'Micro black hole in a trap',
      b5_desc: 'The final stage. A black hole in a magnetic cage evaporates — and that evaporation is energy.',
      b5_log: 'It is spinning. The trap holds. Mathematicians on Earth shed a tear.',
      buy_btn: 'Buy',
      buy_10_btn: 'Buy +10',
      tap_upgrade_btn: 'Upgrade tap',
      tap_level: 'Lv.',
      tap_power: 'Tap power',
      lock_level: 'Lv. {n}',
      locked_at_level: 'Unlocks at level {n}',

      milestone_title: 'Squad certification',
      milestone_x2: 'The squad has been boosted to increased output.',
      milestone_x3_100: 'Engineers rebuilt the squad on the night shift. It works better than it should.',
      milestone_x3_200: 'Certification impossible — the squad is already considered a separate civilization. Upgrading anyway.',

      meteor_1: 'Object entered the atmosphere. Intercept — or collect.',
      meteor_2: 'Scanning: pure helium-3. Lucky.',
      meteor_3: 'Missed. The dispatcher suggests we do not talk about it.',
      meteor_hit: '+{n} energy. The dispatcher makes a note in the log.',
      meteor_hint: 'TAP!',

      // Rewarded ads
      rewarded_btn: '🎬 Ad',
      rewarded_cooldown: 'Energy transfer in progress. Wait {s}s.',
      rewarded_title: 'Prometheus satellite flyby',
      rewarded_text: 'The "Prometheus" satellite transmits energy from the orbital station. Watch a short signal and get +{n} energy.',
      rewarded_confirm: 'Watch ad',
      rewarded_reward: 'Cargo received: +{n} energy. Satellite is pleased.',
      rewarded_error: 'Connection with satellite lost. Try again.',
      rewarded_limit: 'The "Prometheus" satellite left orbit. Come back after recharging.',

      // Rewarded: ×2 boost for a time
      boost_cooldown: 'Impulse charging. Wait {s}s.',
      boost_title: 'Reactor afterburner',
      boost_text: 'The colony switches to full power. Watch a short signal — production is doubled for {m} minutes.',
      boost_confirm: 'Watch ad',
      boost_reward: 'Afterburner engaged: production doubled for {s} seconds.',
      boost_error: 'Connection with the dispatcher lost. Try again.',
      boost_limit: 'The afterburner turbines are overheated. Come back after recharging.',

      // Boosters in the shop panel
      bRew_name: 'Prometheus drop',
      bRew_desc: 'The satellite drops an energy container straight from orbit. Payment — one short ad.',
      bBoost_name: 'Production afterburner',
      bBoost_desc: 'Doubles colony production for a while. Payment — one short ad.',
      boost_income: '×2 output · {m} min',
      card_ready: 'Ready',
      card_maxed: 'Maxed',
      watch_btn: 'Watch',

      offline_title: 'Return from hibernation report',
      offline_text: 'While you slept, the colony produced {energy} energy. {phrase}',
      offline_btn: 'Acknowledged, commander',
      offline_phrases: [
        'Drone-07 fell into a crater twice. It climbed out by itself both times. The dispatcher is pleased.',
        'The station hummed all shift. The dispatcher had a third cup of coffee and cannot remember when the first one started.',
        'A meteor flew past. The dispatcher did not wake you.',
        'The condensers whistled so loud the dispatcher put on headphones. It did not help.',
        'The dispatcher checked all systems. All systems are fine. That is suspicious.',
        'The drones raced around the dome. The dispatcher pretended not to notice.'
      ],

      prestige_btn: 'New expedition',
      prestige_title: 'Experiment complete',
      prestige_text1: 'Experiment complete. Colony evacuated, data collected. We leave Xantha to the drone dictator — it was doing fine.',
      prestige_text2: 'Coordinates of the next target loaded. The knowledge of the "New Dawn" expedition travels with us: +{percent}% output forever.',
      prestige_earned: 'Prestige points: +{points}',
      prestige_confirm: 'Start a new expedition',

      settings_title: 'Settings',
      settings_sound: 'Sound',
      settings_music: 'Music',
      settings_lang: 'Language',
      sound_on: 'On',
      sound_off: 'Off',
      music_on: 'On',
      music_off: 'Off',
      close_btn: 'Close',

      leaderboard_btn: 'Expedition records',
      leaderboard_title: 'Expedition records',
      leaderboard_loading: 'Loading the leaderboard…',
      leaderboard_error: 'Connection to the galactic core lost. Try again.',
      leaderboard_empty: 'Nothing here yet. Leave your mark, commander.',
      leaderboard_rank: 'Your galaxy rank: {r} of {total}',

      planet_xantha: 'Xantha',
      planet_ervin: 'Ervin',
      planet_taiga9: 'Taiga-9',
      planet_muur: 'Muur',

      dispatcher: [
        'I recommend not tapping the panel longer than necessary, commander.',
        'The dispatcher monitors energy consumption. And you. Only the consumption.',
        'The station is fine. As fine as it can be.',
        'Helium-3 is good. Helium-3 is energy.',
        'The dispatcher is not sleeping. The dispatcher is resting with eyes open.',
        'If the panel starts blinking faster — that is normal. Probably.',
        'The drones are arguing about who is in charge again. The dispatcher stays out of it.',
        'The dome reflects light beautifully. The dispatcher is not looking. Almost.',
        'The workers at the reactor work in sync. Suspiciously in sync.',
        'The reactor hums steadily. The dispatcher takes that as a good sign.',
        'Tapping the panel is also work. The most important work, by the way.'
      ],

      dev_add: '+1e12',
      dev_meteor: 'Meteor',
      dev_prestige: 'Prestige',
      dev_reset: 'Reset'
    }
  };

  var lang = 'ru';

  function t(key, params) {
    var s = (DICTS[lang] && DICTS[lang][key]) || DICTS.ru[key] || key;
    if (params) {
      for (var k in params) {
        if (Object.prototype.hasOwnProperty.call(params, k)) {
          s = s.split('{' + k + '}').join(params[k]);
        }
      }
    }
    return s;
  }

  function randomPhrase(key) {
    var arr = (DICTS[lang] && DICTS[lang][key]) || DICTS.ru[key] || [];
    if (!arr.length) return '';
    return arr[Math.floor(Math.random() * arr.length)];
  }

  NG.I18N = {
    get lang() { return lang; },
    setLang: function (l) { lang = l === 'en' ? 'en' : 'ru'; },
    t: t,
    randomPhrase: randomPhrase
  };
})();

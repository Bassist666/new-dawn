/* ============================================================
   «Новый рассвет» — звук. Лёгкий синтез через WebAudio,
   без аудиофайлов. Контекст создаётся лениво (по жесту).
   ============================================================ */
(function () {
  'use strict';

  var ctx = null;
  var muted = false;

  function ensure() {
    if (!ctx) {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (AC) ctx = new AC();
    }
    if (ctx && ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function tone(freq, dur, type, vol, delay, slideTo) {
    if (muted) return;
    var c = ensure();
    if (!c) return;
    var t0 = c.currentTime + (delay || 0);
    var osc = c.createOscillator();
    var g = c.createGain();
    osc.type = type || 'sine';
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol || 0.12, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g);
    g.connect(c.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }

  /* ================= Фоновая музыка — процедурный эмбиент =================
     Космическая тема в ля миноре: бас-дрон, медленные аккорды-пады
     и редкие «звёздочки». Всё синтезируется без файлов и планируется
     по времени AudioContext, поэтому тайминги не дрейфуют.                */

  var musicEnabled = true;    // настройка игрока
  var musicPlaying = false;   // фактически звучит сейчас
  var userGestured = false;   // был ли первый жест (политика автоплея)
  var musicMaster = null;     // master-gain музыки (общий фейдер)
  var musicTimer = null;      // таймер планировщика
  var musicNext = 0;          // время старта следующего такта
  var musicIdx = 0;           // номер такта в цикле

  // Прогрессия Am–F–C–G. root — бас, pad — аккордовые тоны, spark — «звёздочки».
  var MUSIC_CHORDS = [
    { root: 55.00,  pad: [220.00, 261.63, 329.63], spark: [880.00, 1046.50] },   // Am
    { root: 43.65,  pad: [174.61, 220.00, 261.63], spark: [698.46, 880.00] },    // F
    { root: 65.41,  pad: [261.63, 329.63, 392.00], spark: [1046.50, 1318.51] },  // C
    { root: 49.00,  pad: [196.00, 246.94, 293.66], spark: [783.99, 987.77] }     // G
  ];
  var MUSIC_BAR = 8;          // длительность такта, сек

  function musicNote(freq, dur, vol, when, type, attack, pan) {
    var c = ensure();
    if (!c || !musicMaster) return;
    var osc = c.createOscillator();
    var g = c.createGain();
    osc.type = type || 'sine';
    osc.frequency.setValueAtTime(freq, when);
    g.gain.setValueAtTime(0.0001, when);
    g.gain.exponentialRampToValueAtTime(vol, when + (attack || 0.5));
    g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
    osc.connect(g);
    if (pan && c.createStereoPanner) {
      var p = c.createStereoPanner();
      p.pan.value = pan;
      g.connect(p);
      p.connect(musicMaster);
    } else {
      g.connect(musicMaster);
    }
    osc.start(when);
    osc.stop(when + dur + 0.05);
  }

  // Планирует один такт: бас + пад + редкие «звёздочки».
  function scheduleChord(theTime) {
    var ch = MUSIC_CHORDS[musicIdx % MUSIC_CHORDS.length];
    musicIdx++;

    // Бас-дрон на весь такт.
    musicNote(ch.root, MUSIC_BAR + 1, 0.15, theTime, 'sine', 1.6);

    // Аккорд-пад с мягкой атакой и лёгким стерео-разбросом.
    var spread = [-0.35, 0, 0.35];
    for (var i = 0; i < ch.pad.length; i++) {
      musicNote(ch.pad[i], MUSIC_BAR + 1, 0.06, theTime, 'triangle', 2.4, spread[i]);
    }

    // «Звёздочки» — редкие звенящие ноты поверх аккорда.
    if (Math.random() < 0.6) {
      for (var s = 0; s < ch.spark.length; s++) {
        musicNote(ch.spark[s], 1.8, 0.02, theTime + 1 + Math.random() * (MUSIC_BAR - 3), 'sine', 0.6, s === 0 ? -0.5 : 0.5);
      }
    }
  }

  // Держит план нот на ~2.5 сек вперёд — музыка не рвётся и не дрейфует.
  function musicLoop() {
    if (!musicPlaying) return;
    var c = ensure();
    if (!c) return;
    while (musicNext < c.currentTime + 2.5) {
      scheduleChord(Math.max(musicNext, c.currentTime + 0.05));
      musicNext += MUSIC_BAR;
    }
    musicTimer = setTimeout(musicLoop, 300);
  }

  function startMusic() {
    var c = ensure();
    if (!c || musicPlaying) return;
    musicPlaying = true;
    if (!musicMaster) {
      musicMaster = c.createGain();
      musicMaster.gain.setValueAtTime(0.0001, c.currentTime);
      musicMaster.connect(c.destination);
    }
    // Плавный fade-in, чтобы не «бамкать» при включении.
    var now = c.currentTime;
    musicMaster.gain.cancelScheduledValues(now);
    musicMaster.gain.setValueAtTime(Math.max(musicMaster.gain.value, 0.0001), now);
    musicMaster.gain.exponentialRampToValueAtTime(0.45, now + 1.5);
    if (musicNext < now) musicNext = now + 0.05;
    musicLoop();
  }

  function stopMusic(fade) {
    if (!musicPlaying) return;
    musicPlaying = false;
    if (musicTimer) { clearTimeout(musicTimer); musicTimer = null; }
    if (musicMaster && ctx) {
      var now = ctx.currentTime;
      musicMaster.gain.cancelScheduledValues(now);
      musicMaster.gain.setValueAtTime(Math.max(musicMaster.gain.value, 0.0001), now);
      musicMaster.gain.exponentialRampToValueAtTime(0.0001, now + (fade ? 0.6 : 0.1));
    }
  }

  // Синхронизация «хочу» (настройки/мьют) с реальностью.
  // До первого жеста контекст не создаём и цикл не запускаем.
  function syncMusic() {
    if (!userGestured) return;
    if (muted || !musicEnabled) { stopMusic(true); return; }
    startMusic();
  }

  // Первый жест пользователя: политика автоплея требует его, чтобы
  // разбудить AudioContext. После первого тапа музыка подхватывается.
  function onFirstGesture() {
    userGestured = true;
    var c = ensure();
    if (!c) return;
    // Сброс плана — стартуем чистый цикл в активном контексте.
    musicPlaying = false;
    if (musicTimer) { clearTimeout(musicTimer); musicTimer = null; }
    syncMusic();
  }
  if (typeof document !== 'undefined') {
    document.addEventListener('pointerdown', function once() {
      document.removeEventListener('pointerdown', once);
      onFirstGesture();
    });
    document.addEventListener('touchend', function onceT() {
      document.removeEventListener('touchend', onceT);
      onFirstGesture();
    });
    document.addEventListener('keydown', function onceK() {
      document.removeEventListener('keydown', onceK);
      onFirstGesture();
    });
  }

  NG.Audio = {
    setMuted: function (m) {
      muted = !!m;
      syncMusic();
    },
    isMuted: function () { return muted; },

    setMusic: function (m) {
      musicEnabled = !!m;
      syncMusic();
    },
    isMusic: function () { return musicEnabled; },
    isMusicPlaying: function () { return musicPlaying; },

    unlock: function () { onFirstGesture(); },

    click: function () { tone(220, 0.06, 'square', 0.05, 0, 170); },

    deny: function () { tone(150, 0.09, 'square', 0.05, 0, 110); },

    buy: function () {
      tone(440, 0.1, 'triangle', 0.12);
      tone(660, 0.12, 'triangle', 0.1, 0.06);
    },

    meteor: function () {
      tone(880, 0.25, 'sawtooth', 0.09, 0, 220);
      tone(1320, 0.2, 'sine', 0.07, 0.05);
    },

    milestone: function () {
      tone(523, 0.12, 'triangle', 0.12);
      tone(659, 0.12, 'triangle', 0.12, 0.09);
      tone(784, 0.22, 'triangle', 0.12, 0.18);
    },

    prestige: function () {
      tone(392, 0.2, 'triangle', 0.12);
      tone(523, 0.2, 'triangle', 0.12, 0.12);
      tone(659, 0.2, 'triangle', 0.12, 0.24);
      tone(784, 0.45, 'triangle', 0.14, 0.36);
    },

    offline: function () {
      tone(330, 0.15, 'sine', 0.1);
      tone(440, 0.22, 'sine', 0.1, 0.12);
    }
  };
})();

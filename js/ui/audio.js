/* Sound and music, made in the browser with Web Audio: no sound files to download.

   Music is a small Hindustani ensemble that plays itself: a tanpura drone on Sa (C#), a bansuri
   (bamboo flute) improvising phrases in a raga, and a tabla keeping the tala. It has three moods:
     calm    — the story: raga Yaman as a slow alap. Tanpura and flute only, no rhythm.
     tense   — high-stakes scenes (the dice hall, the war, the lamp): raga Marwa in jhaptal
               (10 beats) at a walking tempo; the tabla comes in.
     battle  — fights: Marwa in drut teental (16 beats), fast, with quick taans on the flute.
   K.Sound.mood(name) changes mood; the tabla switches at its next beat and the flute's phrase
   fades out, so a battle starts at once. Menu: music on or off, music volume, sound effects. */
(function (K) {
  "use strict";
  let ctx = null, master = null, sfxBus = null, musicBus = null, noise = null, muffle = null;
  const pref = (key) => K.prefs()[key];
  const on = (key) => pref(key) !== false;
  const musicOn = () => on("sound") && on("music") && on("drone"); // "drone" is the older name of the switch
  const musicLevel = () => { const v = pref("musicVol"); return typeof v === "number" ? Math.max(0, Math.min(1, v)) : 0.7; };
  const available = () => typeof window.AudioContext === "function" || typeof window.webkitAudioContext === "function";

  function init() {
    if (ctx || !available()) return ctx;
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      master = ctx.createGain(); master.gain.value = 0.9;
      // Everything passes one low-pass filter, wide open; a fall in battle closes it (the world muffles).
      muffle = ctx.createBiquadFilter(); muffle.type = "lowpass"; muffle.frequency.value = 20000; muffle.Q.value = 0.5;
      master.connect(muffle); muffle.connect(ctx.destination);
      sfxBus = ctx.createGain(); sfxBus.gain.value = 0.8; sfxBus.connect(master);
      musicBus = ctx.createGain(); musicBus.gain.value = 0;
      // Cut the sub-bass under the music: the low tanpura string booms on small speakers otherwise.
      const hp = ctx.createBiquadFilter(); hp.type = "highpass"; hp.frequency.value = 75; hp.Q.value = 0.7;
      musicBus.connect(hp); hp.connect(master);
    } catch (e) { ctx = null; }
    return ctx;
  }
  const now = () => ctx.currentTime;
  function env(g, t, a, peak, d) { g.gain.cancelScheduledValues(t); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + d); }
  function noiseBuffer(sec) {
    const b = ctx.createBuffer(1, Math.max(1, Math.floor(ctx.sampleRate * sec)), ctx.sampleRate);
    const d = b.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return b;
  }

  // ---------- Pitch: Sa is C#, just intonation ----------
  const SA = 138.59;
  const RAGAS = {
    // Yaman: S R G M# P D N, sung in the evening. Vadi G, samvadi N.
    yaman: { notes: [1, 9 / 8, 5 / 4, 45 / 32, 3 / 2, 5 / 3, 15 / 8], rest: [0, 2, 4], home: 2 },
    // Marwa: S r G M# D N, no Pa. The flat Re and sharp Ma give a restless, dusky tension.
    marwa: { notes: [1, 16 / 15, 5 / 4, 45 / 32, 5 / 3, 15 / 8], rest: [0, 1, 4], home: 1 }
  };
  const MOODS = {
    calm: { raga: "yaman", tala: null, bpm: 0, pluck: 1.25, flute: 0.9, phrase: [3, 6], note: [0.7, 1.7], gap: [2.2, 4.5], octave: 2 },
    tense: { raga: "marwa", tala: "jhaptal", bpm: 76, pluck: 1.0, flute: 0.8, phrase: [4, 7], note: [1, 2], gap: [2, 4], octave: 2 },
    battle: { raga: "marwa", tala: "teental", bpm: 168, pluck: 0.75, flute: 0.75, phrase: [6, 12], note: [0.5, 1], gap: [2, 4], octave: 2 }
  };
  const TALAS = {
    // Theka: the bols the tabla plays for one cycle. Sam (the first beat) is accented.
    teental: ["dha", "dhin", "dhin", "dha", "dha", "dhin", "dhin", "dha", "dha", "tin", "tin", "ta", "ta", "dhin", "dhin", "dha"],
    jhaptal: ["dhi", "na", "dhi", "dhi", "na", "ti", "na", "dhi", "dhi", "na"]
  };

  // ---------- Tanpura: Pa Sa Sa Sa, plucked in turn ----------
  const STRINGS = [SA * 0.75, SA, SA, SA * 0.5];
  function pluck(freq, t, level) {
    const o1 = ctx.createOscillator(), o2 = ctx.createOscillator(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    o1.type = "sawtooth"; o2.type = "sawtooth";
    o1.frequency.value = freq; o2.frequency.value = freq * 1.003; // the jawari shimmer: two strings slightly apart
    f.type = "lowpass"; f.frequency.setValueAtTime(2200, t); f.frequency.exponentialRampToValueAtTime(420, t + 3.4); f.Q.value = 7;
    o1.connect(f); o2.connect(f); f.connect(g); g.connect(musicBus);
    env(g, t, 0.02, 0.055 * level * (freq < 100 ? 0.55 : 1), 4.4); // the low Sa string sits back
    o1.start(t); o2.start(t); o1.stop(t + 4.6); o2.stop(t + 4.6);
  }

  // ---------- Tabla ----------
  function bayan(t, acc) { // the left drum: a deep boom with a little upward glide
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = "sine"; o.frequency.setValueAtTime(78, t); o.frequency.exponentialRampToValueAtTime(102, t + 0.12); o.frequency.exponentialRampToValueAtTime(92, t + 0.5);
    o.connect(g); g.connect(musicBus); env(g, t, 0.004, 0.32 * acc, 0.5); o.start(t); o.stop(t + 0.6);
  }
  function dayan(t, acc, ring, click) { // the right drum, tuned to upper Sa: harmonic partials from the black syahi
    const f0 = SA * 2;
    [[1, 1], [2, 0.45], [3, 0.25], [4.2, 0.12]].forEach(([m, a], i) => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = "sine"; o.frequency.value = f0 * m; o.connect(g); g.connect(musicBus);
      env(g, t, 0.002, 0.13 * a * acc, ring / (1 + i * 0.7)); o.start(t); o.stop(t + ring + 0.1);
    });
    if (click) {
      const s = ctx.createBufferSource(), bp = ctx.createBiquadFilter(), g = ctx.createGain();
      s.buffer = noise; bp.type = "bandpass"; bp.frequency.value = 3200; bp.Q.value = 1.2;
      s.connect(bp); bp.connect(g); g.connect(musicBus); env(g, t, 0.001, 0.12 * acc * click, 0.03); s.start(t, Math.random() * 0.5, 0.05);
    }
  }
  function ka(t, acc) { // a flat slap on the left drum
    const s = ctx.createBufferSource(), lp = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = noise; lp.type = "lowpass"; lp.frequency.value = 900;
    s.connect(lp); lp.connect(g); g.connect(musicBus); env(g, t, 0.001, 0.22 * acc, 0.05); s.start(t, Math.random() * 0.5, 0.08);
  }
  const BOLS = {
    dha: (t, a) => { bayan(t, a); dayan(t, a, 0.32, 0.8); },
    dhin: (t, a) => { bayan(t, a * 0.9); dayan(t, a * 0.8, 0.55, 0.3); },
    dhi: (t, a) => { bayan(t, a * 0.9); dayan(t, a * 0.8, 0.5, 0.3); },
    ta: (t, a) => dayan(t, a, 0.28, 1),
    na: (t, a) => dayan(t, a, 0.3, 0.9),
    tin: (t, a) => dayan(t, a * 0.75, 0.5, 0.2),
    ti: (t, a) => dayan(t, a * 0.8, 0.12, 0.8),
    ka: (t, a) => ka(t, a)
  };

  // ---------- Bansuri: one breath per phrase, gliding (meend) from note to note ----------
  let phraseOut = null; // the phrase now sounding, so a change of mood can fade it
  function phrase(t0, notes, level) {
    const o = ctx.createOscillator(), o2 = ctx.createOscillator(), lfo = ctx.createOscillator(), vib = ctx.createGain();
    const lp = ctx.createBiquadFilter(), g = ctx.createGain(), out = ctx.createGain();
    const br = ctx.createBufferSource(), bbp = ctx.createBiquadFilter(), bg = ctx.createGain();
    o.type = "sine"; o2.type = "triangle";
    lfo.frequency.value = 5.2; vib.gain.value = 0;
    lfo.connect(vib); vib.connect(o.frequency); vib.connect(o2.frequency);
    lp.type = "lowpass"; lp.frequency.value = 2600;
    const o2g = ctx.createGain(); o2g.gain.value = 0.18;
    o.connect(lp); o2.connect(o2g); o2g.connect(lp); lp.connect(g);
    br.buffer = noise; br.loop = true; bbp.type = "bandpass"; bbp.Q.value = 2.5; bg.gain.value = 0.012 * level;
    br.connect(bbp); bbp.connect(bg); bg.connect(g);
    g.connect(out); out.connect(musicBus); out.gain.value = 1;
    let t = t0;
    const peak = 0.11 * level; // the flute leads; the tanpura sits under it
    g.gain.setValueAtTime(0.0001, t0);
    notes.forEach((n, i) => {
      const glide = i === 0 ? 0 : Math.min(0.12, n.d * 0.3);
      if (i === 0) { o.frequency.setValueAtTime(n.f, t); o2.frequency.setValueAtTime(n.f * 2, t); bbp.frequency.setValueAtTime(n.f * 3, t); g.gain.exponentialRampToValueAtTime(peak, t + 0.09); }
      else {
        o.frequency.setValueAtTime(notes[i - 1].f, t); o.frequency.exponentialRampToValueAtTime(n.f, t + glide);
        o2.frequency.setValueAtTime(notes[i - 1].f * 2, t); o2.frequency.exponentialRampToValueAtTime(n.f * 2, t + glide);
        g.gain.setValueAtTime(peak * 0.8, t); g.gain.linearRampToValueAtTime(peak * (n.accent ? 1.15 : 1), t + 0.05); // a soft tongue on each note
      }
      // Long notes bloom into vibrato.
      vib.gain.setValueAtTime(0, t + glide);
      if (n.d > 0.9) vib.gain.linearRampToValueAtTime(n.f * 0.006, t + n.d * 0.8);
      t += n.d;
    });
    g.gain.setValueAtTime(peak, t - 0.05);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
    [o, o2, lfo, br].forEach((x) => { x.start(t0); x.stop(t + 0.4); });
    phraseOut = { out, end: t + 0.4 };
    return t;
  }
  const rnd = (a, b) => a + Math.random() * (b - a);
  const pickOf = (arr) => arr[Math.floor(Math.random() * arr.length)];
  // A phrase is a short walk through the raga's notes, mostly by step, that comes to rest on
  // Sa, the vadi or a resting note. Battle phrases are fast runs (taans).
  function makePhrase(M, beat) {
    const R = RAGAS[M.raga];
    const n = R.notes.length;
    const len = Math.round(rnd(M.phrase[0], M.phrase[1]));
    let idx = n + pickOf([0, R.home, 4 % n]); // start in the middle octave
    const out = [];
    const step = beat ? beat : 0;
    for (let i = 0; i < len; i++) {
      const deg = ((idx % n) + n) % n, oct = Math.floor(idx / n);
      const f = SA * R.notes[deg] * Math.pow(2, oct - 1 + M.octave - 1);
      const d = step ? step * pickOf(M === MOODS.battle ? [0.5, 0.5, 1] : [1, 1, 2]) : rnd(M.note[0], M.note[1]);
      out.push({ f, d, accent: i === 0 });
      idx += pickOf(M === MOODS.battle ? [1, 1, -1, 2] : [1, -1, -1, 1, 2, -2, 0]);
      idx = Math.max(n - 2, Math.min(2 * n + 3, idx));
    }
    // Land on a resting note, held.
    const restDeg = pickOf(R.rest);
    const lastOct = Math.floor(idx / n);
    out.push({ f: SA * R.notes[restDeg] * Math.pow(2, lastOct - 1 + M.octave - 1), d: step ? step * 2 : rnd(1.6, 2.6) });
    return out;
  }

  // ---------- The scheduler ----------
  let timer = null, mood = "calm", S0 = null;
  // ---------- The three composed pieces ----------
  // Each stage of the game has its own piece, played from a file once when the stage begins, then
  // silence until the next stage (no looping):
  //   calm   → Vijaya (raga Bhairavi, heroic): the title, childhood, training, young adulthood, aftermath
  //   tense  → Chakravyuha (Purvi, fusion): the dice game, the exile years, high-stakes moments
  //   battle → Dharmayuddha (Bhairavi, battle anthem): the war and every fight
  // Files load only when their stage is reached. If they cannot load (the game opened from a file on
  // disk, say), the improvised ensemble above plays instead.
  const TRACKS = { calm: "music/vijaya.mp3", tense: "music/chakravyuha.mp3", battle: "music/dharmayuddha.mp3" };
  const TRACK_GAIN = { calm: 0.52, tense: 0.58, battle: 0.72 }; // under the story, a little louder in battle
  const buffers = {}, loading = {};
  let useTracks = typeof fetch === "function" && location.protocol !== "file:";
  let track = null; // { mood, src, gain }
  // A won test plays a short theme of its own kind.
  const FLOURISH = { archery: "music/win_archery.mp3", strength: "music/win_strength.mp3", stealth: "music/win_stealth.mp3", wits: "music/win_wits.mp3", war: "music/win_war.mp3" };
  function loadTrack(m) {
    if (!loading[m]) loading[m] = fetch(new URL(TRACKS[m] || FLOURISH[m.replace("win_", "")], document.baseURI).href)
      .then((r) => { if (!r.ok) throw new Error(r.status); return r.arrayBuffer(); })
      .then((ab) => new Promise((res, rej) => ctx.decodeAudioData(ab, res, rej)))
      .then((b) => (buffers[m] = b))
      .catch(() => { if (!TRACKS[m]) return null; useTracks = false; if (timer === "tracks") { timer = null; fadeTrack(); startMusic(); } return null; });
    return loading[m];
  }
  function fadeTrack() {
    if (!track) return;
    const { src, gain } = track, t = now();
    gain.gain.cancelScheduledValues(t); gain.gain.setTargetAtTime(0.0001, t, 0.45);
    try { src.stop(t + 2.5); } catch (e) { /* already stopped */ }
    track = null;
  }
  // Each piece plays once per stage (an act; the opening and childhood count as one), never again
  // until the next act, however often the mood swings back to it.
  const played = new Set();
  let playedFor = null; // a new life hears its music again
  // The same life loaded again (Continue, a save) is a new object with the same beginning: its pieces
  // are not played over again.
  const sameLife = (a, b) => !!(a && b) && a.name === b.name && a.origin === b.origin && a.pronoun === b.pronoun && (a.seen || []).slice(0, 3).join() === (b.seen || []).slice(0, 3).join();
  function playTrack(m) {
    if (K.S !== playedFor) { if (playedFor && !sameLife(playedFor, K.S)) played.clear(); playedFor = K.S; } // the opening and the first scenes share one piece
    if (track && track.mood === m) return;
    fadeTrack();
    const stage = m + ":" + Math.max(1, (K.S && K.S.act) || 1);
    if (played.has(stage)) return;
    played.add(stage);
    const want = m;
    loadTrack(m).then((b) => {
      if (!b || timer !== "tracks" || mood !== want || (track && track.mood === want)) return;
      const src = ctx.createBufferSource(), gain = ctx.createGain();
      src.buffer = b; src.loop = false;
      src.onended = () => { if (track && track.src === src) track = null; }; // the piece ends; silence until the next stage
      gain.gain.value = 0.0001; src.connect(gain); gain.connect(musicBus);
      src.start(now() + 0.05);
      gain.gain.setTargetAtTime(TRACK_GAIN[want], now() + 0.05, 0.5);
      track = { mood: want, src, gain };
      // Fetch the other pieces quietly once one is playing, so later stages start at once.
      setTimeout(() => Object.keys(TRACKS).forEach((k) => { if (useTracks) loadTrack(k); }), 4000);
    });
  }

  function startMusic() {
    if (!init() || timer || !musicOn()) return;
    if (useTracks) {
      timer = "tracks";
      musicBus.gain.cancelScheduledValues(now());
      musicBus.gain.setTargetAtTime(musicLevel() * 1.8, now(), 0.3);
      playTrack(mood);
      return;
    }
    const t = now() + 0.05;
    S0 = { pluckAt: t, pluckIdx: 0, beatAt: t + 0.2, beatIdx: 0, tala: MOODS[mood].tala, phraseAt: t + 1.5, until: t + 80 };
    musicBus.gain.cancelScheduledValues(t);
    musicBus.gain.setTargetAtTime(musicLevel() * 1.8, t, 1.2);
    timer = setInterval(tick, 60);
    tick();
  }
  function stopMusic() {
    if (timer) { if (timer !== "tracks") clearInterval(timer); timer = null; }
    fadeTrack();
    if (ctx) musicBus.gain.setTargetAtTime(0, now(), 0.4);
  }
  function tick() {
    if (!ctx || ctx.state !== "running" || ens) return; // a place's piece or a test's bed is playing
    const M = MOODS[mood], t = now(), horizon = t + 0.3;
    if (t > S0.until) return; // like the recorded pieces, the improvised ensemble plays once per stage
    // Tanpura, never stopping.
    while (S0.pluckAt < horizon) { pluck(STRINGS[S0.pluckIdx % 4], S0.pluckAt, mood === "battle" ? 0.8 : 1); S0.pluckAt += M.pluck; S0.pluckIdx++; }
    // Tabla. A new tala starts from its sam.
    if (S0.tala !== M.tala) { S0.tala = M.tala; S0.beatIdx = 0; S0.beatAt = Math.max(S0.beatAt, t + 0.05); }
    if (M.tala) {
      const theka = TALAS[M.tala], beat = 60 / M.bpm;
      while (S0.beatAt < horizon) {
        const pos = S0.beatIdx % theka.length, sam = pos === 0;
        const acc = sam ? 1.25 : 0.9;
        BOLS[theka[pos]](S0.beatAt, acc);
        // In battle, the drummer fills every fourth cycle's last beats with tirakita.
        if (mood === "battle" && Math.floor(S0.beatIdx / theka.length) % 4 === 3 && pos >= 12) { BOLS.ti(S0.beatAt + beat / 2, 0.7); BOLS.ka(S0.beatAt + beat * 0.75, 0.6); }
        S0.beatAt += beat; S0.beatIdx++;
      }
    } else S0.beatAt = Math.max(S0.beatAt, t);
    // Flute.
    if (S0.phraseAt < horizon) {
      let start = Math.max(S0.phraseAt, t + 0.05);
      const beat = M.tala ? 60 / M.bpm : 0;
      if (beat) { const k = Math.ceil((start - S0.beatAt) / beat); start = S0.beatAt + k * beat; } // begin on a beat
      const end = phrase(start, makePhrase(M, beat), M.flute);
      S0.phraseAt = end + rnd(M.gap[0], M.gap[1]);
    }
  }
  function setMood(name) {
    if (!MOODS[name] || name === mood) return;
    if (ens && ens.kind === "place") ensStop(); // a place's piece gives way to a fight or a tense scene
    mood = name;
    if (timer === "tracks") return playTrack(name);
    if (!ctx || !S0) return;
    const t = now();
    S0.until = t + 80;
    // Let the flute's phrase fall away, and come back in the new raga soon after.
    if (phraseOut && phraseOut.end > t) { phraseOut.out.gain.setTargetAtTime(0.0001, t, 0.15); }
    S0.phraseAt = t + (name === "battle" ? 0.6 : 1.4);
    if (name !== "calm") S0.pluckAt = Math.min(S0.pluckAt, t + 0.05);
  }


  // ---------- Little ensembles: music for places and for tests ----------
  // A place you arrive at plays its own short piece once (about a minute), in its own raga and with
  // its own instruments and sounds of the place; a test plays a quiet bed by kind. Both duck the
  // stage's piece while they play. Tests that are about timing keep their own beat clear.
  const SCALES = {
    yaman: [1, 9 / 8, 5 / 4, 45 / 32, 3 / 2, 5 / 3, 15 / 8], bhupali: [1, 9 / 8, 5 / 4, 3 / 2, 5 / 3], bhairav: [1, 16 / 15, 5 / 4, 4 / 3, 3 / 2, 8 / 5, 15 / 8],
    desh: [1, 9 / 8, 4 / 3, 3 / 2, 15 / 8, 16 / 9], sarang: [1, 9 / 8, 4 / 3, 3 / 2, 16 / 9], pilu: [1, 9 / 8, 6 / 5, 4 / 3, 3 / 2, 8 / 5, 15 / 8],
    multani: [1, 16 / 15, 6 / 5, 45 / 32, 3 / 2, 8 / 5, 15 / 8], malkauns: [1, 6 / 5, 4 / 3, 8 / 5, 16 / 9], darbari: [1, 9 / 8, 6 / 5, 4 / 3, 3 / 2, 8 / 5, 16 / 9],
    marwa: [1, 16 / 15, 5 / 4, 45 / 32, 5 / 3, 15 / 8]
  };
  // A plucked string (veena, rabab): a bright attack that darkens as it rings.
  function strum(f, t, level, bright) {
    const o = ctx.createOscillator(), o2 = ctx.createOscillator(), lp = ctx.createBiquadFilter(), g = ctx.createGain();
    o.type = "sawtooth"; o2.type = "triangle"; o.frequency.value = f; o2.frequency.value = f * 2.003;
    lp.type = "lowpass"; lp.frequency.setValueAtTime(bright || 3200, t); lp.frequency.exponentialRampToValueAtTime(500, t + 0.9); lp.Q.value = 3;
    o.connect(lp); o2.connect(lp); lp.connect(g); g.connect(musicBus);
    env(g, t, 0.004, 0.07 * level, 1.4); o.start(t); o2.start(t); o.stop(t + 1.5); o2.stop(t + 1.5);
  }
  // A double-reed horn (shehnai): nasal, with a quick vibrato.
  function reed(f, t, d, level) {
    const o = ctx.createOscillator(), o2 = ctx.createOscillator(), lfo = ctx.createOscillator(), lg = ctx.createGain(), bp = ctx.createBiquadFilter(), g = ctx.createGain();
    o.type = "sawtooth"; o2.type = "square"; o.frequency.value = f; o2.frequency.value = f;
    lfo.frequency.value = 6.2; lg.gain.value = f * 0.008; lfo.connect(lg); lg.connect(o.frequency); lg.connect(o2.frequency);
    bp.type = "bandpass"; bp.frequency.value = f * 3; bp.Q.value = 1.4;
    const og = ctx.createGain(); og.gain.value = 0.35; o2.connect(og);
    o.connect(bp); og.connect(bp); bp.connect(g); g.connect(musicBus);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.06 * level, t + 0.06); g.gain.setValueAtTime(0.06 * level, t + d - 0.08); g.gain.exponentialRampToValueAtTime(0.0001, t + d + 0.05);
    [o, o2, lfo].forEach((x) => { x.start(t); x.stop(t + d + 0.1); });
  }
  // Drums: a frame drum (low thump and jingles), the pakhawaj, the dhol, the nagara.
  function skin(t, f0, f1, dec, level, slap) {
    const o = ctx.createOscillator(), g = ctx.createGain(); o.type = "sine";
    o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + dec * 0.8); o.connect(g); g.connect(musicBus);
    env(g, t, 0.003, level, dec); o.start(t); o.stop(t + dec + 0.1);
    if (slap) { const s = ctx.createBufferSource(), bp = ctx.createBiquadFilter(), sg = ctx.createGain(); s.buffer = noise; bp.type = "bandpass"; bp.frequency.value = slap; bp.Q.value = 1; s.connect(bp); bp.connect(sg); sg.connect(musicBus); env(sg, t, 0.001, level * 0.35, 0.05); s.start(t, Math.random() * 0.5, 0.07); }
  }
  const DRUM = {
    frame: (t, a) => skin(t, 110, 70, 0.3, 0.16 * a, a > 1 ? 0 : 6000),
    pakhawaj: (t, a) => skin(t, 90, 60, 0.45, 0.2 * a, 1800),
    dhol: (t, a) => skin(t, 150, 62, 0.26, 0.22 * a, 2100),
    nagara: (t, a) => skin(t, 95, 42, 0.4, 0.24 * a, 0),
    heart: (t, a) => { skin(t, 64, 40, 0.16, 0.2 * a, 0); skin(t + 0.17, 60, 38, 0.16, 0.13 * a, 0); },
    tabla: (t, a) => (a > 1 ? BOLS.dha(t, 0.9) : BOLS.na(t, 0.7))
  };
  // Sounds of a place, underneath.
  function amb(kind, t) {
    if (kind === "birds") { const o = ctx.createOscillator(), g = ctx.createGain(), f = rnd(2400, 3800); o.type = "sine"; o.frequency.setValueAtTime(f, t); o.frequency.exponentialRampToValueAtTime(f * rnd(1.2, 1.6), t + 0.08); o.frequency.exponentialRampToValueAtTime(f, t + 0.16); o.connect(g); g.connect(musicBus); env(g, t, 0.005, 0.025, 0.14); o.start(t); o.stop(t + 0.2); }
    else if (kind === "insects") { const s = ctx.createBufferSource(), bp = ctx.createBiquadFilter(), g = ctx.createGain(), am = ctx.createOscillator(), ag = ctx.createGain(); s.buffer = noise; s.loop = true; bp.type = "bandpass"; bp.frequency.value = rnd(4200, 6000); bp.Q.value = 12; am.frequency.value = rnd(28, 45); ag.gain.value = 0.012; am.connect(ag); ag.connect(g.gain); s.connect(bp); bp.connect(g); g.connect(musicBus); g.gain.value = 0.012; s.start(t, Math.random()); am.start(t); s.stop(t + 2.5); am.stop(t + 2.5); }
    else if (kind === "water") { const s = ctx.createBufferSource(), lp = ctx.createBiquadFilter(), g = ctx.createGain(); s.buffer = noise; s.loop = true; lp.type = "lowpass"; lp.frequency.value = rnd(500, 800); s.connect(lp); lp.connect(g); g.connect(musicBus); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.03, t + 1.2); g.gain.exponentialRampToValueAtTime(0.0001, t + 3.6); s.start(t, Math.random()); s.stop(t + 3.7); }
    else if (kind === "bells") { const f = rnd(1600, 2300); [[1, 0.03], [2.76, 0.012]].forEach(([m, a]) => { const o = ctx.createOscillator(), g = ctx.createGain(); o.type = "sine"; o.frequency.value = f * m; o.connect(g); g.connect(musicBus); env(g, t, 0.003, a, 0.8); o.start(t); o.stop(t + 0.9); }); }
    else if (kind === "hooves") [0, 0.12, 0.26, 0.38].forEach((d) => { const s = ctx.createBufferSource(), lp = ctx.createBiquadFilter(), g = ctx.createGain(); s.buffer = noise; lp.type = "lowpass"; lp.frequency.value = 600; s.connect(lp); lp.connect(g); g.connect(musicBus); env(g, t + d, 0.002, 0.04, 0.05); s.start(t + d, Math.random() * 0.5, 0.06); });
    else if (kind === "temple") { const o = ctx.createOscillator(), g = ctx.createGain(); o.type = "sine"; o.frequency.value = 880 * rnd(0.98, 1.02); o.connect(g); g.connect(musicBus); env(g, t, 0.004, 0.03, 2.2); o.start(t); o.stop(t + 2.3); }
  }
  // Each place: raga, lead voice, drum and its pattern (1 = accent, 0.6 = soft, 0 = rest), beats per
  // minute, the sounds of the place and how often they come (seconds).
  const PLACES = {
    hastinapura: { raga: "yaman", lead: "reed", drum: "pakhawaj", pat: [1, 0, 0.6, 0, 0.6, 0.6, 0, 0.6], bpm: 92, amb: ["temple", 9] },
    indraprastha: { raga: "darbari", lead: "reed", drum: "pakhawaj", pat: [1, 0, 0, 0.6, 0, 0.6, 0, 0], bpm: 70, amb: ["temple", 11] },
    panchala: { raga: "bhairav", lead: "flute", drum: "tabla", pat: [1, 0, 0.6, 0.6, 0, 0.6, 0, 0.6], bpm: 84, amb: ["birds", 3] },
    matsya: { raga: "desh", lead: "flute", drum: "frame", pat: [1, 0, 0.6, 0, 1, 0, 0.6, 0], bpm: 96, amb: ["bells", 2.5] },
    mathura: { raga: "sarang", lead: "flute", drum: "tabla", pat: [1, 0.6, 0, 0.6, 1, 0, 0.6, 0], bpm: 100, amb: ["bells", 4] },
    dwaraka: { raga: "sarang", lead: "flute", drum: "tabla", pat: [1, 0, 0.6, 0, 0.6, 0, 0.6, 0], bpm: 88, amb: ["water", 4] },
    anga: { raga: "pilu", lead: "flute", drum: "dhol", pat: [1, 0, 0, 0.6, 0, 0.6, 0, 0], bpm: 80, amb: ["water", 3.5] },
    suta: { raga: "sarang", lead: "veena", drum: "dhol", pat: [1, 0.6, 0.6, 0, 1, 0.6, 0.6, 0], bpm: 112, amb: ["hooves", 2.2] },
    nishada: { raga: "bhupali", lead: "flute", drum: "frame", pat: [1, 0, 0.6, 0.6, 1, 0, 0.6, 0], bpm: 104, amb: ["birds", 1.8], amb2: ["insects", 5] },
    gandhara: { raga: "multani", lead: "rabab", drum: "frame", pat: [1, 0, 0, 0.6, 0.6, 0, 0.6, 0], bpm: 86, amb: ["hooves", 7] },
    kamyaka: { raga: "malkauns", lead: "flute", drum: null, amb: ["insects", 3], amb2: ["birds", 6] },
    dvaita: { raga: "malkauns", lead: "flute", drum: null, amb: ["insects", 3], amb2: ["water", 7] },
    ashram: { raga: "bhairav", lead: "veena", drum: null, amb: ["temple", 6], amb2: ["water", 6] },
    pramanakoti: { raga: "pilu", lead: "flute", drum: "tabla", pat: [1, 0, 0.6, 0, 0.6, 0, 0.6, 0.6], bpm: 90, amb: ["water", 3] },
    varnavata: { raga: "marwa", lead: "veena", drum: "frame", pat: [1, 0, 0, 0, 0.6, 0, 0, 0], bpm: 76, amb: ["insects", 4] },
    kurukshetra: { raga: "marwa", lead: "reed", drum: "nagara", pat: [1, 0, 0, 0, 0.6, 0, 0, 0], bpm: 64, amb: ["hooves", 6] }
  };
  // Tests: a quiet bed by kind. Archery and other tests of timing get a drone with no beat; the
  // rhythm test (which has its own beat) gets nothing.
  const TESTS = {
    drone: { raga: "yaman", lead: null, drum: null },
    stealth: { raga: "marwa", lead: null, drum: "heart", pat: [1, 0], bpm: 64, rise: 0.04, low: true },
    dhol: { raga: "bhairav", lead: null, drum: "dhol", pat: [1, 0, 0.6, 1, 0.6, 0, 1, 0.6], bpm: 104 },
    veena: { raga: "yaman", lead: "veena", drum: null, sparse: true },
    war: { raga: "marwa", lead: null, drum: "nagara", pat: [1, 0, 0, 0.6, 0, 0.6, 0, 0], bpm: 116 },
    // The practice ground: a calm tabla drill (dha on the strong beats, na between) over the drone.
    akhara: { raga: "bhupali", lead: null, drum: "tabla", pat: [1.2, 0, 0.7, 0.7, 1.2, 0, 0.7, 0], bpm: 84 }
  };
  const TEST_STYLE = { breath: "stealth", aim: "drone", draw: "drone", steady: "drone", sneak: "stealth", herd: "stealth", push: "dhol", notice: "veena", hands: "veena", pasha: "veena", drill: "veena", retort: "veena",
    chaupar: "veena", baghchal: "veena", moksha: "veena", rings: "war", dash: "war", race: "war", formation: "war", array: "war", akhara: "akhara", escape: "stealth", fuse: "stealth" };
  let ens = null; // { spec, until, nextDrone, nextBeat, beatIdx, nextLead, nextAmb, nextAmb2, kind, id }
  function ensStart(spec, secs, kind) {
    ensStop();
    if (!spec || !init() || ctx.state !== "running" || !musicOn()) return;
    if (!noise) noise = noiseBuffer(1);
    const t = now() + 0.1;
    ens = { spec, kind, until: t + secs, nextDrone: t, nextBeat: t + 0.4, beatIdx: 0, nextLead: t + (kind === "test" ? 3 : 2), nextAmb: t + 1, nextAmb2: t + 2.5, idx: 7, t0: t };
    // Duck the stage's piece; let the ensemble be heard.
    if (track) { track.gain.gain.cancelScheduledValues(t); track.gain.gain.setTargetAtTime(0.04, t, 0.4); }
    musicBus.gain.cancelScheduledValues(t); musicBus.gain.setTargetAtTime(musicLevel() * (kind === "test" ? 1.3 : 1.8), t, 0.3);
    ens.timer = setInterval(ensTick, 120);
  }
  function ensStop() {
    if (!ens) return;
    clearInterval(ens.timer); ens = null;
    if (track && ctx) track.gain.gain.setTargetAtTime(TRACK_GAIN[track.mood], now(), 1.2);
  }
  function ensTick() {
    if (!ens || !ctx || ctx.state !== "running") return;
    const E = ens.spec, t = now(), h = t + 0.4, scale = SCALES[E.raga] || SCALES.yaman;
    if (t > ens.until) { ensStop(); return; }
    const fade = Math.min(1, (ens.until - t) / 6); // the last seconds die away
    while (ens.nextDrone < h) { pluck(STRINGS[Math.floor(ens.nextDrone * 7) % 4], ens.nextDrone, (E.low ? 0.6 : 0.85) * fade); ens.nextDrone += 1.3; }
    if (E.drum && E.pat) {
      const beat = 60 / (E.bpm * (1 + (E.rise || 0) * (t - ens.t0) / 10));
      while (ens.nextBeat < h) { const a = E.pat[ens.beatIdx % E.pat.length]; if (a) DRUM[E.drum](ens.nextBeat, a * fade); ens.nextBeat += beat / 2; ens.beatIdx++; }
    }
    if (E.lead && ens.nextLead < h) {
      const n = scale.length, f = (k) => SA * scale[((k % n) + n) % n] * Math.pow(2, Math.floor(k / n) - (E.lead === "rabab" || E.lead === "veena" ? 0 : -1) - 1);
      if (E.lead === "flute") {
        const notes = []; let k = ens.idx;
        for (let i = 0, L = Math.round(rnd(4, 8)); i < L; i++) { notes.push({ f: f(k) * 2, d: rnd(0.45, 1.1), accent: i === 0 }); k += pickOf([1, -1, -1, 1, 2, -2]); k = Math.max(n - 2, Math.min(2 * n + 2, k)); }
        notes.push({ f: f(pickOf([n, n + 2, n + 4])) * 2, d: rnd(1.4, 2.2) }); ens.idx = k;
        const end = phrase(ens.nextLead, notes, 0.85 * fade); ens.nextLead = end + rnd(2, 4);
      } else if (E.lead === "reed") {
        let at = ens.nextLead, k = ens.idx;
        for (let i = 0, L = Math.round(rnd(4, 7)); i < L; i++) { const d = pickOf([0.4, 0.6, 0.6, 1.2]); reed(f(k) * 2, at, d, fade); at += d; k += pickOf([1, -1, 1, 2, -1]); k = Math.max(n - 1, Math.min(2 * n + 2, k)); }
        reed(f(n) * 2, at, 1.6, fade); ens.idx = k; ens.nextLead = at + 1.6 + rnd(2.5, 4.5);
      } else { // veena or rabab: plucked phrases
        let at = ens.nextLead, k = ens.idx;
        for (let i = 0, L = Math.round(rnd(E.sparse ? 2 : 4, E.sparse ? 4 : 8)); i < L; i++) { strum(f(k), at, fade, E.lead === "rabab" ? 2400 : 3400); at += pickOf(E.sparse ? [0.6, 0.9, 1.2] : [0.25, 0.25, 0.5]); k += pickOf([1, -1, 2, -2, 1]); k = Math.max(0, Math.min(2 * n, k)); }
        ens.idx = k; ens.nextLead = at + rnd(E.sparse ? 2.5 : 1.5, E.sparse ? 4 : 3);
      }
    }
    if (E.amb && ens.nextAmb < h) { amb(E.amb[0], ens.nextAmb); ens.nextAmb += E.amb[1] * rnd(0.6, 1.4); }
    if (E.amb2 && ens.nextAmb2 < h) { amb(E.amb2[0], ens.nextAmb2); ens.nextAmb2 += E.amb2[1] * rnd(0.6, 1.4); }
  }

  // ---------- Effects ----------
  const FX = {
    quill() { // a short, dry scratch of the nib
      const t = now(), s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
      s.buffer = noise; f.type = "bandpass"; f.frequency.value = 3200 + Math.random() * 2200; f.Q.value = 1.4;
      s.connect(f); f.connect(g); g.connect(sfxBus);
      env(g, t, 0.004, 0.05 + Math.random() * 0.03, 0.05);
      s.start(t, Math.random() * 0.5, 0.08);
    },
    conch() { // a long horn call that rises and wavers
      const t = now(), o = ctx.createOscillator(), o2 = ctx.createOscillator(), lfo = ctx.createOscillator(), lg = ctx.createGain(), f = ctx.createBiquadFilter(), g = ctx.createGain();
      o.type = "sawtooth"; o2.type = "triangle";
      o.frequency.setValueAtTime(205, t); o.frequency.linearRampToValueAtTime(233, t + 0.5); o.frequency.linearRampToValueAtTime(228, t + 2.2);
      o2.frequency.setValueAtTime(410, t); o2.frequency.linearRampToValueAtTime(466, t + 0.5);
      lfo.frequency.value = 5.2; lg.gain.value = 3; lfo.connect(lg); lg.connect(o.frequency);
      f.type = "bandpass"; f.frequency.value = 820; f.Q.value = 1.6;
      o.connect(f); o2.connect(f); f.connect(g); g.connect(sfxBus);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.32, t + 0.35); g.gain.setValueAtTime(0.32, t + 1.7); g.gain.exponentialRampToValueAtTime(0.0001, t + 2.6);
      [o, o2, lfo].forEach((x) => { x.start(t); x.stop(t + 2.7); });
    },
    gong() { // a bronze bell: inharmonic partials with a long decay
      const t = now();
      [[110, 0.22], [176.5, 0.12], [262, 0.09], [389, 0.05], [553, 0.03]].forEach(([fr, a], i) => {
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.type = "sine"; o.frequency.value = fr; o.connect(g); g.connect(sfxBus);
        env(g, t, 0.006, a, 3.6 - i * 0.4); o.start(t); o.stop(t + 4);
      });
    },
    hit() { // a thud
      const t = now(), s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain(), o = ctx.createOscillator(), og = ctx.createGain();
      s.buffer = noise; f.type = "lowpass"; f.frequency.value = 900; s.connect(f); f.connect(g); g.connect(sfxBus);
      env(g, t, 0.003, 0.35, 0.16); s.start(t, Math.random() * 0.5, 0.2);
      o.type = "sine"; o.frequency.setValueAtTime(120, t); o.frequency.exponentialRampToValueAtTime(48, t + 0.18); o.connect(og); og.connect(sfxBus);
      env(og, t, 0.003, 0.3, 0.2); o.start(t); o.stop(t + 0.25);
    },
    heartbeat() { // your life below a tenth (owner, 6 November): two low, soft beats
      const t = now();
      [0, 0.26].forEach((d, i) => {
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.type = "sine"; o.frequency.setValueAtTime(72, t + d); o.frequency.exponentialRampToValueAtTime(40, t + d + 0.17); o.connect(g); g.connect(sfxBus);
        env(g, t + d, 0.004, i ? 0.24 : 0.34, 0.2); o.start(t + d); o.stop(t + d + 0.3);
      });
    },
    drum() { // a dhol stroke: a low skin with a slap on top
      const t = now(), o = ctx.createOscillator(), g = ctx.createGain(), s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), sg = ctx.createGain();
      o.type = "sine"; o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(62, t + 0.22); o.connect(g); g.connect(sfxBus);
      env(g, t, 0.002, 0.34, 0.26); o.start(t); o.stop(t + 0.3);
      s.buffer = noise; f.type = "bandpass"; f.frequency.value = 2100; f.Q.value = 0.9; s.connect(f); f.connect(sg); sg.connect(sfxBus);
      env(sg, t, 0.001, 0.12, 0.05); s.start(t, Math.random() * 0.5, 0.06);
    },
    tap() { // a light hand on the drum's other head
      const t = now(), o = ctx.createOscillator(), g = ctx.createGain();
      o.type = "triangle"; o.frequency.setValueAtTime(420, t); o.frequency.exponentialRampToValueAtTime(260, t + 0.06); o.connect(g); g.connect(sfxBus);
      env(g, t, 0.001, 0.12, 0.08); o.start(t); o.stop(t + 0.12);
    },
    clang() { // hammer on hot iron
      const t = now();
      [[1230, 0.09], [1870, 0.05], [2640, 0.03]].forEach(([fr, a]) => {
        const o = ctx.createOscillator(), g = ctx.createGain(); o.type = "square"; o.frequency.value = fr; o.connect(g); g.connect(sfxBus);
        env(g, t, 0.001, a, 0.32); o.start(t); o.stop(t + 0.4);
      });
    },
    step() { // a soft footfall on a dusty road
      const t = now(), s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
      s.buffer = noise; f.type = "lowpass"; f.frequency.value = 520; s.connect(f); f.connect(g); g.connect(sfxBus);
      env(g, t, 0.004, 0.16, 0.09); s.start(t, Math.random() * 0.5, 0.1);
    },
    heal() { // two soft bells
      const t = now();
      [[880, 0], [1318, 0.09]].forEach(([fr, d]) => {
        const o = ctx.createOscillator(), g = ctx.createGain(); o.type = "sine"; o.frequency.value = fr; o.connect(g); g.connect(sfxBus);
        env(g, t + d, 0.01, 0.07, 0.9); o.start(t + d); o.stop(t + d + 1);
      });
    },
    dice() { // wooden dice on a board
      const t = now();
      for (let i = 0; i < 5; i++) {
        const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain(), d = i * 0.07 + Math.random() * 0.03;
        s.buffer = noise; f.type = "bandpass"; f.frequency.value = 1500 + Math.random() * 900; f.Q.value = 5;
        s.connect(f); f.connect(g); g.connect(sfxBus); env(g, t + d, 0.002, 0.18 / (i + 1), 0.06); s.start(t + d, Math.random(), 0.08);
      }
    },
    lamp() { // a low tone as the lamp gutters
      const t = now(), o = ctx.createOscillator(), g = ctx.createGain();
      o.type = "sine"; o.frequency.value = 69.3; o.connect(g); g.connect(sfxBus);
      env(g, t, 0.05, 0.14, 0.9); o.start(t); o.stop(t + 1);
    },
    // ---- The war, and death ----
    // The call to arms, as each day of the war opens: conches answering each other, the great nagara
    // drums rolling faster, horses and chariot wheels, a wordless roar of many voices, an elephant.
    callToArms() {
      const t = now();
      const horn = (at, base, len, vol) => {
        const o = ctx.createOscillator(), o2 = ctx.createOscillator(), lfo = ctx.createOscillator(), lg = ctx.createGain(), f = ctx.createBiquadFilter(), g = ctx.createGain();
        o.type = "sawtooth"; o2.type = "triangle";
        o.frequency.setValueAtTime(base * 0.9, at); o.frequency.linearRampToValueAtTime(base, at + 0.45); o.frequency.linearRampToValueAtTime(base * 0.98, at + len);
        o2.frequency.setValueAtTime(base * 1.8, at); o2.frequency.linearRampToValueAtTime(base * 2, at + 0.45);
        lfo.frequency.value = 4.6 + Math.random(); lg.gain.value = 3; lfo.connect(lg); lg.connect(o.frequency);
        f.type = "bandpass"; f.frequency.value = base * 4; f.Q.value = 1.5;
        o.connect(f); o2.connect(f); f.connect(g); g.connect(sfxBus);
        g.gain.setValueAtTime(0.0001, at); g.gain.exponentialRampToValueAtTime(vol, at + 0.4); g.gain.setValueAtTime(vol, at + len - 0.6); g.gain.exponentialRampToValueAtTime(0.0001, at + len);
        [o, o2, lfo].forEach((x) => { x.start(at); x.stop(at + len + 0.1); });
      };
      horn(t, 228, 2.4, 0.3); horn(t + 0.9, 205, 2.2, 0.2); horn(t + 1.5, 256, 1.8, 0.14);
      // Nagara: big kettle drums, faster and faster.
      let at = t + 0.6;
      for (let i = 0, gap = 0.42; i < 16; i++, gap *= 0.88) {
        const o = ctx.createOscillator(), g = ctx.createGain(); o.type = "sine";
        o.frequency.setValueAtTime(95, at); o.frequency.exponentialRampToValueAtTime(42, at + 0.3); o.connect(g); g.connect(sfxBus);
        env(g, at, 0.003, 0.28 + i * 0.01, 0.35); o.start(at); o.stop(at + 0.4);
        at += Math.max(0.07, gap);
      }
      // Hooves (galloping threes) and the rumble of wheels, swelling in.
      for (let k = 0; k < 14; k++) [0, 0.09, 0.19].forEach((d) => {
        const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain(), when = t + 1.2 + k * 0.33 + d;
        s.buffer = noise; f.type = "lowpass"; f.frequency.value = 380; s.connect(f); f.connect(g); g.connect(sfxBus);
        env(g, when, 0.003, 0.05 + k * 0.008, 0.07); s.start(when, Math.random() * 0.5, 0.09);
      });
      const rumble = ctx.createBufferSource(), rf = ctx.createBiquadFilter(), rg = ctx.createGain();
      rumble.buffer = noise; rumble.loop = true; rf.type = "lowpass"; rf.frequency.value = 160; rumble.connect(rf); rf.connect(rg); rg.connect(sfxBus);
      rg.gain.setValueAtTime(0.0001, t + 1); rg.gain.exponentialRampToValueAtTime(0.32, t + 3.5); rg.gain.exponentialRampToValueAtTime(0.0001, t + 6.2);
      rumble.start(t + 1); rumble.stop(t + 6.3);
      // The roar of an army: noise through two vowel-like formants, swelling and falling.
      [[520, 1.2], [1180, 1.4], [2400, 2]].forEach(([fr, q], i) => {
        const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
        s.buffer = noise; s.loop = true; f.type = "bandpass"; f.frequency.value = fr; f.Q.value = q; s.connect(f); f.connect(g); g.connect(sfxBus);
        const v = [0.22, 0.14, 0.05][i];
        g.gain.setValueAtTime(0.0001, t + 2.2); g.gain.exponentialRampToValueAtTime(v, t + 3.4); g.gain.setValueAtTime(v, t + 4.6); g.gain.exponentialRampToValueAtTime(0.0001, t + 6.4);
        s.start(t + 2.2, Math.random()); s.stop(t + 6.5);
      });
      // An elephant trumpets, somewhere in the line.
      { const o = ctx.createOscillator(), lfo = ctx.createOscillator(), lg = ctx.createGain(), f = ctx.createBiquadFilter(), g = ctx.createGain(), at2 = t + 3.1;
        o.type = "sawtooth"; o.frequency.setValueAtTime(340, at2); o.frequency.exponentialRampToValueAtTime(720, at2 + 0.35); o.frequency.exponentialRampToValueAtTime(560, at2 + 1.1);
        lfo.frequency.value = 11; lg.gain.value = 22; lfo.connect(lg); lg.connect(o.frequency);
        f.type = "bandpass"; f.frequency.value = 1300; f.Q.value = 2.4; o.connect(f); f.connect(g); g.connect(sfxBus);
        g.gain.setValueAtTime(0.0001, at2); g.gain.exponentialRampToValueAtTime(0.13, at2 + 0.12); g.gain.exponentialRampToValueAtTime(0.0001, at2 + 1.2);
        [o, lfo].forEach((x) => { x.start(at2); x.stop(at2 + 1.3); }); }
    },
    // A short drum call for fights that are not the great war.
    drumCall() { const t = now(); [0, 0.22, 0.44, 0.58, 0.72].forEach((d, i) => { const o = ctx.createOscillator(), g = ctx.createGain(); o.type = "sine"; o.frequency.setValueAtTime(140, t + d); o.frequency.exponentialRampToValueAtTime(58, t + d + 0.22); o.connect(g); g.connect(sfxBus); env(g, t + d, 0.002, i === 4 ? 0.4 : 0.26, 0.28); o.start(t + d); o.stop(t + d + 0.32); }); },
    // You fall in battle: the field muffles, a heartbeat slows, one far conch, then silence.
    fall() {
      const t = now();
      muffle.frequency.cancelScheduledValues(t); muffle.frequency.setValueAtTime(muffle.frequency.value, t); muffle.frequency.exponentialRampToValueAtTime(320, t + 1.4);
      musicBus.gain.cancelScheduledValues(t); musicBus.gain.setTargetAtTime(0.0001, t, 0.6);
      let at = t + 0.5;
      for (let i = 0, gap = 0.75; i < 6; i++, gap *= 1.28) {
        [0, 0.16].forEach((d, k) => { const o = ctx.createOscillator(), g = ctx.createGain(); o.type = "sine"; o.frequency.setValueAtTime(64, at + d); o.frequency.exponentialRampToValueAtTime(38, at + d + 0.16); o.connect(g); g.connect(sfxBus); env(g, at + d, 0.004, (k ? 0.22 : 0.34) * (1 - i * 0.12), 0.2); o.start(at + d); o.stop(at + d + 0.25); });
        at += gap;
      }
      { const o = ctx.createOscillator(), f = ctx.createBiquadFilter(), g = ctx.createGain(), at2 = t + 2.6;
        o.type = "sawtooth"; o.frequency.setValueAtTime(205, at2); o.frequency.linearRampToValueAtTime(228, at2 + 0.6); f.type = "bandpass"; f.frequency.value = 700; f.Q.value = 2.5;
        o.connect(f); f.connect(g); g.connect(sfxBus); g.gain.setValueAtTime(0.0001, at2); g.gain.exponentialRampToValueAtTime(0.06, at2 + 0.6); g.gain.exponentialRampToValueAtTime(0.0001, at2 + 2.8); o.start(at2); o.stop(at2 + 2.9); }
      // The world comes back, slowly, for the ending.
      muffle.frequency.setValueAtTime(320, t + 7); muffle.frequency.exponentialRampToValueAtTime(20000, t + 10);
    },
    // A friend falls beside you: the drums stop for a breath, one low stroke.
    friendFalls() {
      const t = now(), g0 = musicBus.gain.value;
      musicBus.gain.cancelScheduledValues(t); musicBus.gain.setTargetAtTime(0.0001, t, 0.08); musicBus.gain.setTargetAtTime(g0 || musicLevel() * 1.8, t + 1.6, 0.5);
      const o = ctx.createOscillator(), g = ctx.createGain(); o.type = "sine"; o.frequency.setValueAtTime(80, t + 0.1); o.frequency.exponentialRampToValueAtTime(40, t + 0.6); o.connect(g); g.connect(sfxBus); env(g, t + 0.1, 0.004, 0.36, 0.9); o.start(t + 0.1); o.stop(t + 1.1);
    },
    // A death away from the battlefield: one low bronze bell.
    bell() {
      const t = now();
      [[73, 0.26], [117.6, 0.14], [174.5, 0.08], [259, 0.05]].forEach(([fr, a], i) => {
        const o = ctx.createOscillator(), g = ctx.createGain(); o.type = "sine"; o.frequency.value = fr; o.connect(g); g.connect(sfxBus);
        env(g, t, 0.008, a, 5.5 - i * 0.6); o.start(t); o.stop(t + 6);
      });
    },
    // A losing sting for tests: two falling plucks.
    lose() {
      const t = now();
      [[SA * 1.5, 0], [SA * 1.335, 0.22], [SA, 0.46]].forEach(([fr, d]) => { const o = ctx.createOscillator(), f = ctx.createBiquadFilter(), g = ctx.createGain(); o.type = "triangle"; o.frequency.value = fr; f.type = "lowpass"; f.frequency.value = 1200; o.connect(f); f.connect(g); g.connect(sfxBus); env(g, t + d, 0.004, 0.13, 0.6); o.start(t + d); o.stop(t + d + 0.7); });
    },
    choose() { // a single low pluck when a choice is made
      const t = now(), o = ctx.createOscillator(), f = ctx.createBiquadFilter(), g = ctx.createGain();
      o.type = "triangle"; o.frequency.value = SA * 2; f.type = "lowpass"; f.frequency.value = 1400;
      o.connect(f); f.connect(g); g.connect(sfxBus); env(g, t, 0.005, 0.12, 0.7); o.start(t); o.stop(t + 0.8);
    }
  };

  // ---------- Moments (ui/moments.js): a short theme of its own for each kind ----------
  // friend: the flute in Yaman over a tabla, rising to a held note. astra: a far conch, temple bells,
  // a drone rising and opening into a chord. milestone: the flute in Desh and one bronze bell.
  // farewell: the flute alone, falling.
  function momentTheme(kind) {
    const t0 = now() + 0.15, Y = SCALES.yaman, D = SCALES.desh, f = (sc, k) => SA * 2 * sc[((k % sc.length) + sc.length) % sc.length] * Math.pow(2, Math.floor(k / sc.length));
    if (track) { track.gain.gain.cancelScheduledValues(t0); track.gain.gain.setTargetAtTime(0.03, t0, 0.3); const tr = track; setTimeout(() => { if (track === tr) tr.gain.gain.setTargetAtTime(TRACK_GAIN[tr.mood], now(), 1.2); }, 8000); }
    musicBus.gain.cancelScheduledValues(t0); musicBus.gain.setTargetAtTime(musicLevel() * 1.8, t0, 0.2);
    if (kind === "friend") {
      phrase(t0 + 0.3, [0, 2, 3, 4, 3, 4, 5, 7].map((k, i) => ({ f: f(Y, k), d: i === 7 ? 2.4 : [0.5, 0.4, 0.6, 0.9, 0.4, 0.5, 0.7][i], accent: i === 0 })), 1);
      // tabla: dha dhin dhin dha | dha dhin dhin dha | dha tin tin ta | ta dhin dhin dha
      const bols = ["dha", "dhin", "dhin", "dha", "dha", "dhin", "dhin", "dha", "dha", "tin", "tin", "ta", "ta", "dhin", "dhin", "dha"];
      bols.forEach((b, i) => BOLS[b](t0 + 0.3 + i * 0.36, i % 4 === 0 ? 0.9 : 0.6));
      BOLS.dha(t0 + 0.3 + 16 * 0.36, 1);
    } else if (kind === "astra") {
      FX.conch();
      [0.9, 1.6, 2.1, 2.9, 3.4].forEach((d) => amb("bells", t0 + d));
      // The drone: Sa and Pa rising out of nothing, opening into Sa-Ga-Pa-Sa.
      [[SA, 0], [SA * 1.5, 0], [SA * 1.25, 2.6], [SA * 2, 3.2]].forEach(([fr, at]) => {
        const o = ctx.createOscillator(), o2 = ctx.createOscillator(), g = ctx.createGain(), lp = ctx.createBiquadFilter();
        o.type = "sawtooth"; o2.type = "sine"; o.frequency.value = fr; o2.frequency.value = fr * 1.003;
        lp.type = "lowpass"; lp.frequency.setValueAtTime(300, t0 + at); lp.frequency.exponentialRampToValueAtTime(2400, t0 + 4.2);
        o.connect(lp); o2.connect(lp); lp.connect(g); g.connect(musicBus);
        g.gain.setValueAtTime(0.0001, t0 + at); g.gain.exponentialRampToValueAtTime(0.05, t0 + at + 1.8); g.gain.setValueAtTime(0.05, t0 + 5.6); g.gain.exponentialRampToValueAtTime(0.0001, t0 + 7.5);
        [o, o2].forEach((x) => { x.start(t0 + at); x.stop(t0 + 7.6); });
      });
    } else if (kind === "crossed") {
      // The field crossed (war_crossing.js): a far conch, then the flute in Marwa, dusk's raga, climbing
      // over slow single strokes like footsteps, and stopping short of home.
      FX.conch();
      const M = SCALES.marwa;
      phrase(t0 + 1.4, [0, 1, 2, 3, 4, 5, 4, 6].map((k, i) => ({ f: f(M, k), d: i === 7 ? 2.4 : [0.8, 0.5, 0.6, 0.8, 0.6, 0.9, 0.5][i], accent: i === 0 })), 0.85);
      [0, 1, 2, 3, 4, 5, 6].forEach((i) => BOLS[i % 2 ? "tin" : "dha"](t0 + 1.4 + i * 0.75, 0.55));
    } else if (kind === "farewell") {
      phrase(t0 + 0.2, [7, 5, 4, 3, 2, 0].map((k, i) => ({ f: f(Y, k) * 0.5, d: i === 5 ? 2.6 : 0.8 })), 0.7);
    } else if (kind === "oath") {
      // The Samshaptakas' oath: a far conch, three slow strokes of the drum, the flute in Darbari sinking to a low held Sa.
      FX.conch();
      [0.9, 1.6, 2.3].forEach((d, i) => BOLS.dha(t0 + d, i === 2 ? 1 : 0.75));
      phrase(t0 + 2.7, [4, 3, 2, 3, 1, 0].map((k, i) => ({ f: f(SCALES.darbari, k) * 0.5, d: i === 5 ? 2.2 : [0.5, 0.4, 0.6, 0.5, 0.7][i], accent: i === 0 })), 0.85);
    } else {
      FX.gong();
      phrase(t0 + 0.8, [0, 1, 2, 3, 2, 3, 4].map((k, i) => ({ f: f(D, k), d: i === 6 ? 2.2 : [0.6, 0.5, 0.7, 0.9, 0.5, 0.6][i], accent: i === 0 })), 0.9);
    }
  }

  let lastQuill = 0;
  K.Sound = {
    // A moment's own theme (ui/moments.js).
    moment(kind) { try { if (!musicOn() || !init() || ctx.state !== "running") return; if (!noise) noise = noiseBuffer(1); ensStop(); momentTheme(kind); } catch (e) { /* never break the game */ } },
    play(name) {
      if (!on("sound") || !init() || ctx.state !== "running" || !FX[name]) return;
      if (!noise) noise = noiseBuffer(1);
      if (name === "quill") { const t = performance.now(); if (t - lastQuill < 55) return; lastQuill = t; }
      try { FX[name](); } catch (e) { /* sound is never allowed to break the game */ }
    },
    mood(name) { try { setMood(name); } catch (e) { /* never break the game */ } },
    // A place's own short piece, once per arrival (not in the war, not in a tense scene).
    place(key) { try { if (mood !== "calm" || !PLACES[key]) return; ensStart(PLACES[key], 70, "place"); } catch (e) { /* never break the game */ } },
    // A quiet bed under a test, by its kind; null ends it.
    test(game) { try { if (!game) { if (ens && ens.kind === "test") ensStop(); return; } const st = TEST_STYLE[game]; if (st) ensStart(TESTS[st], 240, "test"); else if (ens) ensStop(); } catch (e) { /* never break the game */ } },
    // The music stops dead (the ring closes): silence for a while, then the stage's piece may return.
    cut(sec) { try { if (!ctx) return; ensStop(); const t = now(); musicBus.gain.cancelScheduledValues(t); musicBus.gain.setTargetAtTime(0.0001, t, 0.03); fadeTrack(); setTimeout(() => K.Sound.refresh(), (sec || 6) * 1000); } catch (e) { /* never break the game */ } },
    // A won test: its theme plays over everything, the stage's piece ducking underneath.
    flourish(kind) {
      try {
        if (!musicOn() || !init() || ctx.state !== "running") return;
        if (!useTracks || !FLOURISH[kind]) { FX.gong(); return; }
        loadTrack("win_" + kind).then((b) => {
          if (!b) { FX.gong(); return; }
          const t = now(), src = ctx.createBufferSource(), g = ctx.createGain();
          src.buffer = b; g.gain.value = 0.95; src.connect(g); g.connect(musicBus);
          musicBus.gain.cancelScheduledValues(t); musicBus.gain.setTargetAtTime(musicLevel() * 1.8, t, 0.05);
          if (track) { track.gain.gain.cancelScheduledValues(t); track.gain.gain.setTargetAtTime(0.08, t, 0.15); const tr = track; setTimeout(() => { if (track === tr) tr.gain.gain.setTargetAtTime(TRACK_GAIN[tr.mood], now(), 0.8); }, b.duration * 1000 - 800); }
          src.start(t + 0.02);
        });
      } catch (e) { /* never break the game */ }
    },
    // Called from the Menu switches and the volume slider.
    refresh() {
      if (!ctx) return;
      if (musicOn()) { if (timer) musicBus.gain.setTargetAtTime(musicLevel() * 1.8, now(), 0.2); else startMusic(); }
      else stopMusic();
    },
    supported: available,
    get currentMood() { return mood; },
    _debug: () => ({ ctx, master, musicBus, FX, init: () => { init(); if (!noise) noise = noiseBuffer(1); } }) // for the automated sound check

  };

  // Unlock on the first gesture, then start the music. Browsers let sound start only during a real
  // user action: a mouse press or key, but on touch screens only the finger lifting (touchend /
  // click), not the touch going down. So listen to all of them and keep listening until the audio
  // is really running. On iPhone, "playback" makes the music play even with the ringer switch on silent.
  const GESTURES = ["pointerdown", "pointerup", "touchend", "click", "keydown"];
  const unlock = () => {
    if (!init()) return;
    try { if (navigator.audioSession) navigator.audioSession.type = "playback"; } catch (e) { /* older browsers */ }
    if (!noise) noise = noiseBuffer(1);
    try { // a silent blip inside the gesture, which old iOS needs before it will play anything
      const b = ctx.createBuffer(1, 1, ctx.sampleRate), s = ctx.createBufferSource();
      s.buffer = b; s.connect(ctx.destination); s.start(0);
    } catch (e) { /* ignore */ }
    const done = () => {
      if (ctx.state !== "running") return;
      GESTURES.forEach((g) => document.removeEventListener(g, unlock, true));
      K.Sound.refresh();
    };
    if (ctx.state !== "running") { const r = ctx.resume(); if (r && r.then) r.then(done, () => {}); }
    done();
  };
  GESTURES.forEach((g) => document.addEventListener(g, unlock, true));
  document.addEventListener("visibilitychange", () => {
    if (!ctx) return;
    if (document.hidden) { stopMusic(); ctx.suspend(); }
    else { ctx.resume(); K.Sound.refresh(); }
  });
})(window.K = window.K || {});


"use strict";

document.addEventListener("DOMContentLoaded", () => {

  // ========================================
  // ELEMENTS AND SETTINGS
  // ========================================

  const $ = id => document.getElementById(id);

  const canvas = $("effects");
  const ctx = canvas?.getContext("2d", {
    alpha: true
  });

  const grid = $("diyaGrid");
  const diyaCount = $("diyaCount");
  const crackerCount = $("crackerCount");
  const continueBtn = $("continueBtn");
  const finalBtn = $("finalBtn");
  const replayBtn = $("replayBtn");
  const subtitle = $("subtitle");
  const greeting = $("greeting");

  const required = [
    canvas, ctx, grid, diyaCount,
    crackerCount, continueBtn,
    finalBtn, replayBtn,
    subtitle, greeting
  ];

  if (required.some(item => !item)) {
    console.error("Missing Diwali HTML elements");
    return;
  }

  const COLORS = [
    "#ffd166", "#ff6b6b", "#ff65cf",
    "#59dfff", "#9cff8b", "#ffffff",
    "#b38aff"
  ];

  const MOBILE = matchMedia("(max-width: 650px)");

  const REDUCED_MOTION = matchMedia(
    "(prefers-reduced-motion: reduce)"
  );

  const MAX_PARTICLES = MOBILE.matches ? 280 : 550;

  const rand = (a, b) =>
    a + Math.random() * (b - a);

  const color = () =>
    COLORS[Math.floor(Math.random() * COLORS.length)];

  let particles = [];
  let emitters = [];
  let rafId = 0;
  let lastTime = 0;
  let lit = 0;
  let tried = new Set();
  let timers = new Set();
  let generation = 0;

  // ========================================
  // CANVAS RESOLUTION
  // ========================================

  function resize() {
    const dpr = Math.min(
      devicePixelRatio || 1,
      MOBILE.matches ? 1.25 : 1.5
    );

    canvas.width = Math.round(innerWidth * dpr);
    canvas.height = Math.round(innerHeight * dpr);

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    ctx.clearRect(0, 0, innerWidth, innerHeight);
  }

  addEventListener("resize", resize, {
    passive: true
  });

  resize();

  // ========================================
  // TIMER MANAGEMENT
  // ========================================

  function later(fn, ms) {
    const version = generation;

    const id = setTimeout(() => {
      timers.delete(id);

      if (version === generation) {
        fn();
      }
    }, ms);

    timers.add(id);
  }

  function clearTimers() {
    generation++;

    for (const id of timers) {
      clearTimeout(id);
    }

    timers.clear();
  }

  // ========================================
  // MOBILE AUDIO ENGINE
  // ========================================

  let audio = null;
  let master = null;
  let noiseBuffer = null;

  function unlockAudio() {
    try {
      const AudioClass =
        window.AudioContext ||
        window.webkitAudioContext;

      if (!AudioClass) return null;

      if (!audio) {
        audio = new AudioClass();

        master = audio.createGain();
        master.gain.value = 0.35;
        master.connect(audio.destination);

        const length = audio.sampleRate;
        noiseBuffer = audio.createBuffer(
          1, length, audio.sampleRate
        );

        const data = noiseBuffer.getChannelData(0);

        for (let i = 0; i < length; i++) {
          data[i] = Math.random() * 2 - 1;
        }
      }

      if (audio.state === "suspended") {
        audio.resume().catch(() => {});
      }

      return audio;
    } catch (error) {
      console.warn("Audio unavailable:", error);
      return null;
    }
  }

  function tone(
    from, to, duration,
    volume = 0.1,
    type = "sine",
    delay = 0
  ) {
    const ac = audio;
    if (!ac || !master) return;

    const start = ac.currentTime + delay;
    const oscillator = ac.createOscillator();
    const gain = ac.createGain();

    oscillator.type = type;

    oscillator.frequency.setValueAtTime(
      Math.max(20, from), start
    );

    oscillator.frequency.exponentialRampToValueAtTime(
      Math.max(20, to), start + duration
    );

    gain.gain.setValueAtTime(
      Math.max(0.001, volume), start
    );

    gain.gain.exponentialRampToValueAtTime(
      0.001, start + duration
    );

    oscillator.connect(gain);
    gain.connect(master);

    oscillator.start(start);
    oscillator.stop(start + duration);
  }

  function noise(
    duration = 0.25,
    volume = 0.1,
    frequency = 2500,
    delay = 0
  ) {
    const ac = audio;
    if (!ac || !noiseBuffer || !master) return;

    const start = ac.currentTime + delay;
    const source = ac.createBufferSource();
    const filter = ac.createBiquadFilter();
    const gain = ac.createGain();

    source.buffer = noiseBuffer;

    filter.type = "lowpass";
    filter.frequency.value = frequency;

    gain.gain.setValueAtTime(
      Math.max(0.001, volume), start
    );

    gain.gain.exponentialRampToValueAtTime(
      0.001, start + duration
    );

    source.connect(filter);
    filter.connect(gain);
    gain.connect(master);

    source.start(start);
    source.stop(start + duration);
  }

  function sound(type) {
    if (!audio) return;

    switch (type) {
      case "diya":
        tone(650, 1100, 0.18, 0.07);
        tone(1100, 1500, 0.25, 0.035);
        break;

      case "rocket":
        tone(180, 1700, 0.9, 0.08, "sawtooth");
        noise(0.7, 0.045, 2200);
        break;

      case "explosion":
        noise(0.55, 0.42, 1300);
        tone(110, 35, 0.55, 0.23);
        break;

      case "chakri":
        tone(260, 900, 1.2, 0.07, "sawtooth");
        noise(1.2, 0.08, 4000);
        break;

      case "sparkler":
        for (let i = 0; i < 14; i++) {
          noise(
            0.06,
            rand(0.035, 0.075),
            5500,
            i * 0.09
          );
        }
        break;

      case "anaar":
        noise(1.6, 0.13, 5000);
        tone(700, 250, 1.5, 0.04);
        break;

      case "bomb":
        noise(0.7, 0.5, 900);
        tone(125, 30, 0.7, 0.28);
        noise(0.3, 0.13, 3500, 0.25);
        break;
    }
  }

  // ========================================
  // PARTICLE SYSTEM
  // ========================================

  function particle(
    x, y, vx, vy, shade,
    life = 60,
    size = 2,
    gravity = 0.06
  ) {
    if (particles.length >= MAX_PARTICLES) {
      return;
    }

    particles.push({
      x, y, vx, vy,
      shade,
      life,
      maxLife: life,
      size,
      gravity
    });

    startLoop();
  }

  function burst(x, y, count = 70, power = 5) {
    if (REDUCED_MOTION.matches) {
      count = Math.min(count, 15);
    }

    for (let i = 0; i < count; i++) {
      const angle =
        Math.PI * 2 * i / count;

      const speed = rand(power * 0.4, power);

      particle(
        x, y,
        Math.cos(angle) * speed,
        Math.sin(angle) * speed,
        color(),
        rand(35, 70),
        rand(1.3, 2.7)
      );
    }
  }

  function golden(x, y, count = 24) {
    for (let i = 0; i < count; i++) {
      const angle = rand(0, Math.PI * 2);
      const speed = rand(0.5, 3.5);

      particle(
        x, y,
        Math.cos(angle) * speed,
        Math.sin(angle) * speed,
        "#ffd166",
        rand(20, 45),
        rand(1, 2.5)
      );
    }
  }

  // ========================================
  // ON-DEMAND ANIMATION ENGINE
  // ========================================

  function startLoop() {
    if (rafId || document.hidden) return;

    lastTime = 0;
    rafId = requestAnimationFrame(frame);
  }

  function frame(time) {
    rafId = 0;

    if (document.hidden) {
      lastTime = 0;
      return;
    }

    const dt = lastTime
      ? Math.min((time - lastTime) / 16.667, 2)
      : 1;

    lastTime = time;

    ctx.clearRect(
      0, 0, innerWidth, innerHeight
    );

    ctx.globalCompositeOperation = "lighter";

    // Update emitters before rendering particles.
    for (let i = emitters.length - 1; i >= 0; i--) {
      if (emitters[i](dt) === false) {
        emitters.splice(i, 1);
      }
    }

    let write = 0;

    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];

      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += p.gravity * dt;
      p.vx *= Math.pow(0.993, dt);
      p.life -= dt;

      if (p.life <= 0) continue;

      ctx.globalAlpha = p.life / p.maxLife;
      ctx.fillStyle = p.shade;

      // No expensive canvas shadows.
      ctx.fillRect(
        p.x - p.size / 2,
        p.y - p.size / 2,
        p.size,
        p.size
      );

      particles[write++] = p;
    }

    particles.length = write;

    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";

    // Stop completely when nothing is animating.
    if (particles.length || emitters.length) {
      rafId = requestAnimationFrame(frame);
    } else {
      lastTime = 0;
      ctx.clearRect(
        0, 0, innerWidth, innerHeight
      );
    }
  }

  document.addEventListener(
    "visibilitychange",
    () => {
      if (document.hidden) {
        if (rafId) cancelAnimationFrame(rafId);
        rafId = 0;
        lastTime = 0;
      } else if (particles.length || emitters.length) {
        startLoop();
      }
    }
  );

  // ========================================
  // SCENE MANAGEMENT
  // ========================================

  function showScene(id) {
    document.querySelectorAll(".scene").forEach(el => {
      const active = el.id === id;

      el.classList.toggle("active", active);
      el.classList.toggle("hidden", !active);
    });
  }

  // ========================================
  // DIYA INTERACTIONS
  // ========================================

  function createDiyas() {
    grid.innerHTML = "";

    for (let i = 0; i < 7; i++) {
      const diya = document.createElement("button");

      diya.type = "button";
      diya.className = "diya";
      diya.setAttribute(
        "aria-label",
        `Light diya ${i + 1}`
      );

      diya.innerHTML = `
        <span class="flame"></span>
        <span class="wick"></span>
        <span class="bowl"></span>
      `;

      diya.addEventListener("click", () => {
        if (diya.classList.contains("lit")) return;

        unlockAudio();
        sound("diya");

        diya.classList.add("lit");
        diya.setAttribute(
          "aria-label",
          `Diya ${i + 1} lit`
        );

        lit++;
        diyaCount.textContent = lit;

        const r = diya.getBoundingClientRect();

        golden(
          r.left + r.width / 2,
          r.top + r.height * 0.4,
          22
        );

        if (lit === 7) {
          subtitle.textContent =
            "All seven diyas are glowing! ✨";

          continueBtn.classList.remove("hidden");

          burst(
            innerWidth / 2,
            innerHeight * 0.4,
            65,
            4
          );
        }
      });

      grid.appendChild(diya);
    }
  }

  // ========================================
  // FIRECRACKER EFFECTS
  // ========================================

  function rocket() {
    sound("rocket");

    const x = rand(
      innerWidth * 0.3,
      innerWidth * 0.7
    );

    let y = innerHeight + 10;
    const target = innerHeight * 0.25;

    emitters.push(dt => {
      y -= 11 * dt;

      for (let i = 0; i < 3; i++) {
        particle(
          x + rand(-3, 3),
          y + 10,
          rand(-1, 1),
          rand(1, 3),
          "#ffb347",
          22,
          2
        );
      }

      if (y <= target) {
        burst(x, y, 85, 6);
        sound("explosion");

        later(() => {
          burst(x + 35, y + 30, 45, 4);
        }, 200);

        return false;
      }

      return true;
    });

    startLoop();
  }

  function chakri(x, y) {
    sound("chakri");

    let progress = 0;

    emitters.push(dt => {
      progress += dt;

      for (let i = 0; i < 4; i++) {
        const angle =
          progress * 0.3 +
          i * Math.PI / 2;

        particle(
          x + Math.cos(angle) * 20,
          y + Math.sin(angle) * 20,
          Math.cos(angle) * rand(2, 5),
          Math.sin(angle) * rand(2, 5),
          COLORS[i],
          30,
          2
        );
      }

      return progress < 80;
    });

    startLoop();
  }

  function sparkler(x, y) {
    sound("sparkler");

    let progress = 0;

    emitters.push(dt => {
      progress += dt;

      for (let i = 0; i < 5; i++) {
        const angle = rand(0, Math.PI * 2);
        const speed = rand(1, 4);

        particle(
          x, y,
          Math.cos(angle) * speed,
          Math.sin(angle) * speed,
          "#ffe8a0",
          rand(18, 38),
          2
        );
      }

      return progress < 85;
    });

    startLoop();
  }

  function anaar(x, y) {
    sound("anaar");

    let progress = 0;

    emitters.push(dt => {
      progress += dt;

      for (let i = 0; i < 6; i++) {
        particle(
          x + rand(-6, 6),
          y,
          rand(-3.5, 3.5),
          rand(-9, -5),
          color(),
          rand(40, 65),
          2,
          0.18
        );
      }

      return progress < 90;
    });

    startLoop();
  }

  function bomb(x, y) {
    sound("bomb");

    burst(x, y, 105, 8);

    later(() => {
      burst(x - 45, y - 65, 45, 4);
      burst(x + 45, y - 65, 45, 4);
    }, 300);
  }

  // ========================================
  // FIRECRACKER BUTTONS
  // ========================================

  document.querySelectorAll(".cracker").forEach(btn => {
    btn.addEventListener("click", () => {
      unlockAudio();

      const type = btn.dataset.type;
      const r = btn.getBoundingClientRect();

      const x = r.left + r.width / 2;
      const y = r.top + r.height / 2;

      switch (type) {
        case "rocket":
          rocket();
          break;
        case "chakri":
          chakri(x, y);
          break;
        case "sparkler":
          sparkler(x, y);
          break;
        case "anaar":
          anaar(x, y);
          break;
        case "bomb":
          bomb(x, y);
          break;
      }

      btn.classList.add("used");
      tried.add(type);

      crackerCount.textContent = tried.size;

      if (tried.size === 5) {
        finalBtn.classList.remove("hidden");
      }
    });
  });

  // ========================================
  // CONTINUE AND FINAL GREETING
  // ========================================

  continueBtn.addEventListener("click", () => {
    showScene("crackerScene");
    subtitle.textContent =
      "Tap the firecrackers and enjoy the magic!";
  });

  finalBtn.addEventListener("click", () => {
    clearTimers();

    emitters = [];
    particles = [];

    showScene("finalScene");

    const name = new URLSearchParams(
      location.search
    ).get("name");

    greeting.textContent = name
      ? `Happy Diwali, ${name.slice(0, 35)}! ❤️`
      : "Happy Diwali! ❤️";

    unlockAudio();

    for (let i = 0; i < 5; i++) {
      later(() => {
        burst(
          rand(innerWidth * 0.2, innerWidth * 0.8),
          rand(innerHeight * 0.15, innerHeight * 0.5),
          65,
          5
        );

        if (i % 2 === 0) {
          sound("explosion");
        }
      }, i * 400);
    }
  });

  // ========================================
  // RESET AND REPLAY
  // ========================================

  function reset() {
    clearTimers();

    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = 0;
    }

    particles = [];
    emitters = [];
    lastTime = 0;

    ctx.clearRect(
      0, 0, innerWidth, innerHeight
    );

    lit = 0;
    tried.clear();

    diyaCount.textContent = "0";
    crackerCount.textContent = "0";

    subtitle.textContent =
      "Tap every diya to spread the light!";

    continueBtn.classList.add("hidden");
    finalBtn.classList.add("hidden");

    document.querySelectorAll(".cracker").forEach(btn => {
      btn.classList.remove("used");
    });

    createDiyas();
    showScene("diyaScene");
  }

  replayBtn.addEventListener("click", reset);

  reset();
});

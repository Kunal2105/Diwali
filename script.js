
"use strict";

document.addEventListener("DOMContentLoaded", () => {

  // ======================================
  // ELEMENTS
  // ======================================

  const $ = id => document.getElementById(id);

  const canvas = $("effects");
  const grid = $("diyaGrid");
  const diyaCount = $("diyaCount");
  const crackerCount = $("crackerCount");
  const continueBtn = $("continueBtn");
  const finalBtn = $("finalBtn");
  const replayBtn = $("replayBtn");
  const subtitle = $("subtitle");
  const greeting = $("greeting");

  const required = [
    canvas, grid, diyaCount, crackerCount,
    continueBtn, finalBtn, replayBtn,
    subtitle, greeting
  ];

  if (required.some(el => !el)) {
    console.error("Missing required HTML elements");
    return;
  }

  const ctx = canvas.getContext("2d", {
    alpha: true
  });

  if (!ctx) return;

  // ======================================
  // PERFORMANCE SETTINGS
  // ======================================

  const mobile = matchMedia("(max-width: 650px)");
  const reducedMotion = matchMedia(
    "(prefers-reduced-motion: reduce)"
  );

  const MAX_PARTICLES = mobile.matches ? 160 : 300;

  const COLORS = [
    "#ffd166", "#ff7070", "#ff74d4",
    "#5ce5ff", "#a5ff8a", "#ffffff",
    "#b58cff"
  ];

  const rand = (min, max) =>
    min + Math.random() * (max - min);

  const randomColor = () =>
    COLORS[Math.floor(Math.random() * COLORS.length)];

  let particles = [];
  let emitters = [];
  let timers = new Set();

  let raf = 0;
  let previousTime = 0;
  let generation = 0;
  let lit = 0;
  let tried = new Set();
  let currentScene = "diyaScene";

  // ======================================
  // CANVAS
  // ======================================

  function resizeCanvas() {
    const dpr = 1;

    canvas.width = Math.round(innerWidth * dpr);
    canvas.height = Math.round(innerHeight * dpr);

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  window.addEventListener("resize", resizeCanvas, {
    passive: true
  });

  resizeCanvas();

  // ======================================
  // SAFE TIMERS
  // ======================================

  function later(callback, delay) {
    const version = generation;

    const id = setTimeout(() => {
      timers.delete(id);

      if (generation === version) {
        callback();
      }
    }, delay);

    timers.add(id);
  }

  function clearTimers() {
    generation++;

    for (const id of timers) {
      clearTimeout(id);
    }

    timers.clear();
  }

  // ======================================
  // PARTICLES
  // ======================================

  function addParticle(
    x, y, vx, vy,
    color, life = 45,
    size = 2, gravity = 0.06
  ) {
    if (particles.length >= MAX_PARTICLES) {
      return;
    }

    particles.push({
      x, y, vx, vy,
      color, life,
      maxLife: life,
      size, gravity
    });

    startAnimation();
  }

  function burst(x, y, count = 40, power = 4) {
    if (reducedMotion.matches) {
      count = Math.min(count, 10);
    }

    const available = Math.max(
      0,
      MAX_PARTICLES - particles.length
    );

    count = Math.min(count, available);

    for (let i = 0; i < count; i++) {
      const angle = Math.PI * 2 * i / count;
      const speed = rand(power * 0.4, power);

      addParticle(
        x, y,
        Math.cos(angle) * speed,
        Math.sin(angle) * speed,
        randomColor(),
        rand(25, 55),
        rand(1.5, 3)
      );
    }
  }

  function goldenBurst(x, y, count = 18) {
    for (let i = 0; i < count; i++) {
      const angle = rand(0, Math.PI * 2);
      const speed = rand(0.5, 3);

      addParticle(
        x, y,
        Math.cos(angle) * speed,
        Math.sin(angle) * speed,
        "#ffd166",
        rand(18, 38),
        rand(1.5, 2.5)
      );
    }
  }

  // ======================================
  // LIGHTWEIGHT ANIMATION LOOP
  // ======================================

  function startAnimation() {
    if (raf || document.hidden) return;

    previousTime = 0;
    raf = requestAnimationFrame(animate);
  }

  function animate(timestamp) {
    raf = 0;

    if (document.hidden) return;

    const dt = previousTime
      ? Math.min((timestamp - previousTime) / 16.67, 2)
      : 1;

    previousTime = timestamp;

    ctx.clearRect(0, 0, innerWidth, innerHeight);

    // Update emitters
    for (let i = emitters.length - 1; i >= 0; i--) {
      if (emitters[i](dt) === false) {
        emitters.splice(i, 1);
      }
    }

    // Draw particles
    let write = 0;

    ctx.globalCompositeOperation = "lighter";

    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];

      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += p.gravity * dt;

      p.life -= dt;

      if (p.life <= 0) continue;

      ctx.globalAlpha = Math.max(
        0,
        p.life / p.maxLife
      );

      ctx.fillStyle = p.color;

      ctx.fillRect(
        p.x,
        p.y,
        p.size,
        p.size
      );

      particles[write++] = p;
    }

    particles.length = write;

    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";

    if (particles.length || emitters.length) {
      raf = requestAnimationFrame(animate);
    } else {
      previousTime = 0;
      ctx.clearRect(0, 0, innerWidth, innerHeight);
    }
  }

  function stopAnimation() {
    if (raf) {
      cancelAnimationFrame(raf);
      raf = 0;
    }

    particles = [];
    emitters = [];
    previousTime = 0;

    ctx.clearRect(0, 0, innerWidth, innerHeight);
  }

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      stopAnimation();
    }
  });

  // ======================================
  // SCENE MANAGEMENT
  // ======================================

  function showScene(id) {
    currentScene = id;

    document.querySelectorAll(".scene").forEach(el => {
      const active = el.id === id;

      el.classList.toggle("active", active);
      el.classList.toggle("hidden", !active);
    });
  }

  // ======================================
  // CREATE SEVEN DIYAS
  // ======================================

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

        diya.classList.add("lit");

        diya.setAttribute(
          "aria-label",
          `Diya ${i + 1} lit`
        );

        lit++;
        diyaCount.textContent = lit;

        const r = diya.getBoundingClientRect();

        goldenBurst(
          r.left + r.width / 2,
          r.top + r.height * 0.4,
          15
        );

        if (lit === 7) {
          subtitle.textContent =
            "All seven diyas are glowing! ✨";

          continueBtn.classList.remove("hidden");

          burst(
            innerWidth / 2,
            innerHeight * 0.4,
            45,
            4
          );
        }
      });

      grid.appendChild(diya);
    }
  }

  // ======================================
  // ROCKET
  // ======================================

  function launchRocket() {
    const x = rand(innerWidth * 0.3, innerWidth * 0.7);
    let y = innerHeight + 10;

    const targetY = innerHeight * 0.25;

    emitters.push(dt => {
      y -= 11 * dt;

      addParticle(
        x + rand(-3, 3),
        y + 10,
        rand(-1, 1),
        rand(1, 2),
        "#ffb347",
        20,
        2
      );

      if (y <= targetY) {
        burst(x, y, 70, 6);

        later(() => {
          burst(x + 30, y + 30, 35, 4);
        }, 220);

        return false;
      }

      return true;
    });

    startAnimation();
  }

  // ======================================
  // CHAKRI
  // ======================================

  function launchChakri(x, y) {
    let progress = 0;

    emitters.push(dt => {
      progress += dt;

      for (let i = 0; i < 3; i++) {
        const angle =
          progress * 0.3 +
          i * Math.PI * 2 / 3;

        addParticle(
          x + Math.cos(angle) * 22,
          y + Math.sin(angle) * 22,
          Math.cos(angle) * 3,
          Math.sin(angle) * 3,
          COLORS[i],
          25,
          2
        );
      }

      return progress < 65;
    });

    startAnimation();
  }

  // ======================================
  // PHULJHADI
  // ======================================

  function launchSparkler(x, y) {
    let progress = 0;

    emitters.push(dt => {
      progress += dt;

      for (let i = 0; i < 3; i++) {
        const angle = rand(0, Math.PI * 2);
        const speed = rand(1, 4);

        addParticle(
          x, y,
          Math.cos(angle) * speed,
          Math.sin(angle) * speed,
          "#ffe8a0",
          rand(15, 32),
          2
        );
      }

      return progress < 65;
    });

    startAnimation();
  }

  // ======================================
  // ANAAR
  // ======================================

  function launchAnaar(x, y) {
    let progress = 0;

    emitters.push(dt => {
      progress += dt;

      for (let i = 0; i < 4; i++) {
        addParticle(
          x + rand(-5, 5),
          y,
          rand(-3, 3),
          rand(-8, -4),
          randomColor(),
          rand(30, 50),
          2,
          0.16
        );
      }

      return progress < 65;
    });

    startAnimation();
  }

  // ======================================
  // BOMB
  // ======================================

  function launchBomb(x, y) {
    burst(x, y, 80, 7);

    later(() => {
      burst(x - 40, y - 45, 30, 4);
      burst(x + 40, y - 45, 30, 4);
    }, 250);
  }

  // ======================================
  // FIRECRACKER BUTTONS
  // ======================================

  document.querySelectorAll(".cracker").forEach(btn => {
    btn.addEventListener("click", () => {
      const type = btn.dataset.type;

      const r = btn.getBoundingClientRect();

      const x = r.left + r.width / 2;
      const y = r.top + r.height / 2;

      switch (type) {
        case "rocket":
          launchRocket();
          break;

        case "chakri":
          launchChakri(x, y);
          break;

        case "sparkler":
          launchSparkler(x, y);
          break;

        case "anaar":
          launchAnaar(x, y);
          break;

        case "bomb":
          launchBomb(x, y);
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

  // ======================================
  // CONTINUE TO FIREWORKS
  // ======================================

  continueBtn.addEventListener("click", () => {
    stopAnimation();
    clearTimers();

    showScene("crackerScene");

    subtitle.textContent =
      "Tap the firecrackers and enjoy the magic!";
  });

  // ======================================
  // FINAL GREETING
  // ======================================

  finalBtn.addEventListener("click", () => {
    clearTimers();
    stopAnimation();

    showScene("finalScene");

    const params = new URLSearchParams(location.search);
    const name = params.get("name");

    greeting.textContent = name
      ? `Happy Diwali, ${name.slice(0, 35)}! ❤️`
      : "Happy Diwali! ❤️";

    // Lightweight celebration sequence
    for (let i = 0; i < 5; i++) {
      later(() => {
        if (currentScene !== "finalScene") return;

        burst(
          rand(innerWidth * 0.2, innerWidth * 0.8),
          rand(innerHeight * 0.12, innerHeight * 0.48),
          45,
          5
        );
      }, i * 500);
    }
  });

  // ======================================
  // REPLAY
  // ======================================

  function reset() {
    clearTimers();
    stopAnimation();

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

  // ======================================
  // START
  // ======================================

  reset();

});

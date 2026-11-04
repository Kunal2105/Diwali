
"use strict";

document.addEventListener("DOMContentLoaded", () => {

  // ======================================
  // ELEMENTS
  // ======================================

  const $ = id => document.getElementById(id);

  const canvas = $("effects");
  const ctx = canvas.getContext("2d", {
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

  // ======================================
  // SETTINGS
  // ======================================

  const colors = [
    "#ffd86e",
    "#ff7777",
    "#f57bdc",
    "#69e9ff",
    "#a9ff89",
    "#ffffff",
    "#ba9aff"
  ];

  const rand = (a, b) =>
    a + Math.random() * (b - a);

  const shade = () =>
    colors[Math.floor(Math.random() * colors.length)];

  const reduced = matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  let width = innerWidth;
  let height = innerHeight;

  let particles = [];
  let emitters = [];
  let raf = 0;
  let last = 0;

  let lit = 0;
  let tried = new Set();
  let timers = new Set();
  let version = 0;
  let scene = "diyaScene";

  const cap = innerWidth < 700 ? 350 : 650;

  // ======================================
  // CANVAS SETUP
  // ======================================

  function resize() {
    width = innerWidth;
    height = innerHeight;

    const dpr = Math.min(
      devicePixelRatio || 1,
      innerWidth < 700 ? 1.25 : 1.5
    );

    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  addEventListener("resize", resize, {
    passive: true
  });

  resize();

  // ======================================
  // TIMER MANAGEMENT
  // ======================================

  function later(fn, ms) {
    const v = version;

    const id = setTimeout(() => {
      timers.delete(id);

      if (v === version) {
        fn();
      }
    }, ms);

    timers.add(id);
  }

  function cancelTimers() {
    version++;

    for (const id of timers) {
      clearTimeout(id);
    }

    timers.clear();
  }

  // ======================================
  // ANIMATION ENGINE
  // ======================================

  function start() {
    if (!raf && !document.hidden) {
      last = 0;
      raf = requestAnimationFrame(frame);
    }
  }

  function particle(
    x, y, vx, vy,
    color,
    life = 50,
    size = 2.8,
    gravity = 0.07
  ) {
    if (particles.length >= cap) return;

    particles.push({
      x, y, vx, vy,
      color,
      life,
      max: life,
      size,
      gravity
    });

    start();
  }

  function burst(
    x, y,
    count = 95,
    power = 5,
    palette = null
  ) {
    count = Math.min(
      reduced ? 20 : count,
      cap - particles.length
    );

    for (let i = 0; i < count; i++) {
      const angle =
        i * Math.PI * 2 / count +
        rand(-0.06, 0.06);

      const speed = rand(
        power * 0.45,
        power
      );

      particle(
        x,
        y,
        Math.cos(angle) * speed,
        Math.sin(angle) * speed,
        palette || shade(),
        rand(34, 74),
        rand(2, 4),
        0.045
      );
    }
  }

  function sparkle(x, y, count = 35) {
    for (let i = 0; i < count; i++) {
      const angle = rand(0, Math.PI * 2);
      const speed = rand(0.5, 4);

      particle(
        x,
        y,
        Math.cos(angle) * speed,
        Math.sin(angle) * speed,
        "#ffdb7a",
        rand(22, 47),
        rand(2, 3.5)
      );
    }
  }

  // ======================================
  // FRAME RENDERING
  // ======================================

  function frame(time) {
    raf = 0;

    if (document.hidden) return;

    const dt = last
      ? Math.min((time - last) / 16.667, 2)
      : 1;

    last = time;

    ctx.clearRect(0, 0, width, height);

    // Update active firecracker emitters
    for (let i = emitters.length - 1; i >= 0; i--) {
      if (emitters[i](dt) === false) {
        emitters.splice(i, 1);
      }
    }

    ctx.globalCompositeOperation = "lighter";

    let write = 0;

    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];

      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += p.gravity * dt;
      p.life -= dt;

      if (p.life <= 0) continue;

      ctx.globalAlpha = Math.min(
        1,
        p.life / p.max
      );

      ctx.fillStyle = p.color;

      ctx.beginPath();
      ctx.arc(
        p.x,
        p.y,
        p.size,
        0,
        Math.PI * 2
      );
      ctx.fill();

      particles[write++] = p;
    }

    particles.length = write;

    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";

    if (particles.length || emitters.length) {
      raf = requestAnimationFrame(frame);
    } else {
      last = 0;
      ctx.clearRect(0, 0, width, height);
    }
  }

  function stop() {
    if (raf) {
      cancelAnimationFrame(raf);
    }

    raf = 0;
    last = 0;
    particles = [];
    emitters = [];

    ctx.clearRect(0, 0, width, height);
  }

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      stop();
    }
  });

  // ======================================
  // SCENE MANAGEMENT
  // ======================================

  function show(id) {
    scene = id;

    document.querySelectorAll(".scene")
      .forEach(el => {
        const active = el.id === id;

        el.classList.toggle("active", active);
        el.classList.toggle("hidden", !active);
      });
  }

  // ======================================
  // CREATE SEVEN DIYAS
  // ======================================

  function makeDiyas() {
    grid.replaceChildren();

    for (let i = 0; i < 7; i++) {
      const button = document.createElement("button");

      button.type = "button";
      button.className = "diya";

      button.setAttribute(
        "aria-label",
        `Light diya ${i + 1}`
      );

      button.innerHTML = `
        <span class="flame"></span>
        <span class="wick"></span>
        <span class="bowl"></span>
      `;

      button.addEventListener("click", () => {
        if (button.classList.contains("lit")) {
          return;
        }

        button.classList.add("lit");

        button.setAttribute(
          "aria-label",
          `Diya ${i + 1} lit`
        );

        diyaCount.textContent = ++lit;

        const rect = button.getBoundingClientRect();

        sparkle(
          rect.left + rect.width / 2,
          rect.top + rect.height * 0.38,
          28
        );

        if (lit === 7) {
          subtitle.textContent =
            "All seven diyas are glowing! ✨";

          continueBtn.classList.remove("hidden");

          later(() => {
            burst(
              width / 2,
              height * 0.42,
              100,
              5
            );
          }, 160);
        }
      });

      grid.appendChild(button);
    }
  }

  // ======================================
  // ROCKET FIRECRACKER
  // ======================================

  function rocket() {
    const x = rand(width * 0.2, width * 0.8);

    let y = height + 10;
    const goal = height * 0.2;

    emitters.push(dt => {
      y -= Math.max(8, height / 90) * dt;

      for (let i = 0; i < 3; i++) {
        particle(
          x + rand(-3, 3),
          y + 8,
          rand(-1.5, 1.5),
          rand(1, 3),
          "#ffb34e",
          rand(15, 27),
          rand(2, 3)
        );
      }

      if (y <= goal) {
        burst(x, y, 140, 7);

        later(() => {
          burst(
            x + rand(-60, 60),
            y + 35,
            65,
            4
          );
        }, 220);

        return false;
      }

      return true;
    });

    start();
  }

  // ======================================
  // CHAKRI FIRECRACKER
  // ======================================

  function chakri(x, y) {
    let time = 0;

    emitters.push(dt => {
      time += dt;

      for (let i = 0; i < 6; i++) {
        const angle =
          time * 0.35 +
          i * Math.PI / 3;

        particle(
          x + Math.cos(angle) * 26,
          y + Math.sin(angle) * 26,
          Math.cos(angle) * rand(3, 6),
          Math.sin(angle) * rand(3, 6),
          colors[i],
          rand(20, 45),
          rand(2, 3)
        );
      }

      if (time > 90) {
        sparkle(x, y, 55);
        return false;
      }

      return true;
    });

    start();
  }

  // ======================================
  // PHULJHADI FIRECRACKER
  // ======================================

  function sparkler(x, y) {
    let time = 0;

    emitters.push(dt => {
      time += dt;

      for (let i = 0; i < 6; i++) {
        const angle = rand(0, Math.PI * 2);
        const speed = rand(1, 5);

        particle(
          x,
          y,
          Math.cos(angle) * speed,
          Math.sin(angle) * speed,
          "#ffe49a",
          rand(15, 40),
          rand(1.5, 3)
        );
      }

      return time < 110;
    });

    start();
  }

  // ======================================
  // ANAAR FIRECRACKER
  // ======================================

  function anaar(x, y) {
    let time = 0;

    const ground = Math.min(
      height * 0.79,
      y + 100
    );

    emitters.push(dt => {
      time += dt;

      for (let i = 0; i < 7; i++) {
        particle(
          x + rand(-8, 8),
          ground,
          rand(-4.5, 4.5),
          rand(-11, -5),
          shade(),
          rand(35, 65),
          rand(2, 3.5),
          0.2
        );
      }

      return time < 105;
    });

    start();
  }

  // ======================================
  // BOMB FIRECRACKER
  // ======================================

  function bomb(x, y) {
    burst(x, y, 155, 9);

    later(() => {
      burst(
        Math.max(55, x - 65),
        Math.max(80, y - 65),
        85,
        6
      );

      burst(
        Math.min(width - 55, x + 65),
        Math.max(80, y - 65),
        85,
        6
      );
    }, 280);
  }

  // ======================================
  // FIRECRACKER BUTTONS
  // ======================================

  const launch = {
    rocket,
    chakri,
    sparkler,
    anaar,
    bomb
  };

  document.querySelectorAll(".cracker")
    .forEach(button => {

      button.addEventListener("click", () => {
        const type = button.dataset.type;

        if (!launch[type]) return;

        const rect = button.getBoundingClientRect();

        const x = rect.left + rect.width / 2;
        const y = rect.top + rect.height / 2;

        launch[type](x, y);

        button.classList.add("used");

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
    cancelTimers();
    stop();

    show("crackerScene");
  });

  // ======================================
  // FINAL DIWALI GREETING
  // ======================================

  finalBtn.addEventListener("click", () => {
    cancelTimers();
    stop();

    show("finalScene");

    const name = new URLSearchParams(
      location.search
    ).get("name");

    greeting.textContent = name
      ? `Happy Diwali, ${name.slice(0, 35)}! ❤️`
      : "Happy Diwali! ❤️";

    // Eight colorful celebration bursts
    for (let i = 0; i < 8; i++) {
      later(() => {
        if (scene !== "finalScene") return;

        burst(
          rand(width * 0.15, width * 0.85),
          rand(height * 0.12, height * 0.65),
          105,
          rand(4, 7)
        );
      }, i * 380);
    }
  });

  // ======================================
  // REPLAY EVERYTHING
  // ======================================

  function reset() {
    cancelTimers();
    stop();

    lit = 0;
    tried.clear();

    diyaCount.textContent = "0";
    crackerCount.textContent = "0";

    subtitle.textContent =
      "Tap every diya to spread the light!";

    continueBtn.classList.add("hidden");
    finalBtn.classList.add("hidden");

    document.querySelectorAll(".cracker")
      .forEach(button => {
        button.classList.remove("used");
      });

    makeDiyas();
    show("diyaScene");
  }

  replayBtn.addEventListener("click", reset);

  // ======================================
  // INITIALIZE
  // ======================================

  reset();

});


"use strict";

document.addEventListener("DOMContentLoaded", () => {

  // ==========================================
  // 1. ELEMENTS AND INITIAL SETUP
  // ==========================================

  const $ = (id) => document.getElementById(id);

  const canvas = $("effects");
  const ctx = canvas.getContext("2d");

  const diyaGrid = $("diyaGrid");
  const diyaCount = $("diyaCount");
  const crackerCount = $("crackerCount");
  const continueBtn = $("continueBtn");
  const finalBtn = $("finalBtn");
  const replayBtn = $("replayBtn");
  const subtitle = $("subtitle");
  const greeting = $("greeting");

  const colors = [
    "#FFD700",
    "#FF6B6B",
    "#FF69B4",
    "#00E5FF",
    "#9AFF7A",
    "#FFFFFF",
    "#B388FF"
  ];

  let particles = [];
  let animations = [];
  let timers = new Set();

  let litCount = 0;
  let triedCrackers = new Set();
  let lastFrame = 0;

  let audioCtx = null;

  const random = (min, max) =>
    min + Math.random() * (max - min);

  const randomColor = () =>
    colors[Math.floor(Math.random() * colors.length)];

  // ==========================================
  // 2. CANVAS SETUP
  // ==========================================

  function resizeCanvas() {
    const dpr = Math.min(
      window.devicePixelRatio || 1,
      2
    );

    canvas.width = Math.round(
      window.innerWidth * dpr
    );

    canvas.height = Math.round(
      window.innerHeight * dpr
    );

    ctx.setTransform(
      dpr, 0, 0, dpr, 0, 0
    );
  }

  window.addEventListener("resize", resizeCanvas);
  resizeCanvas();

  // ==========================================
  // 3. TIMER MANAGEMENT
  // ==========================================

  function schedule(callback, delay) {
    const id = window.setTimeout(() => {
      timers.delete(id);
      callback();
    }, delay);

    timers.add(id);
    return id;
  }

  function clearTimers() {
    for (const id of timers) {
      clearTimeout(id);
    }

    timers.clear();
  }

  // ==========================================
  // 4. SOUND ENGINE
  // ==========================================

  function getAudio() {
    const AudioContextClass =
      window.AudioContext ||
      window.webkitAudioContext;

    if (!AudioContextClass) {
      return null;
    }

    if (!audioCtx) {
      audioCtx = new AudioContextClass();
    }

    if (audioCtx.state === "suspended") {
      audioCtx.resume().catch(() => {});
    }

    return audioCtx;
  }

  function noiseSound(
    duration = 0.2,
    volume = 0.1,
    frequency = 2000
  ) {
    const ac = getAudio();
    if (!ac) return;

    const sampleCount = Math.floor(
      ac.sampleRate * duration
    );

    const buffer = ac.createBuffer(
      1,
      sampleCount,
      ac.sampleRate
    );

    const data = buffer.getChannelData(0);

    for (let i = 0; i < sampleCount; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const source = ac.createBufferSource();
    source.buffer = buffer;

    const filter = ac.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = frequency;

    const gain = ac.createGain();
    const now = ac.currentTime;

    gain.gain.setValueAtTime(
      Math.max(0.001, volume),
      now
    );

    gain.gain.exponentialRampToValueAtTime(
      0.001,
      now + duration
    );

    source.connect(filter);
    filter.connect(gain);
    gain.connect(ac.destination);

    source.start(now);
    source.stop(now + duration);
  }

  function toneSound(
    startFreq,
    endFreq,
    duration,
    volume = 0.08,
    wave = "sine"
  ) {
    const ac = getAudio();
    if (!ac) return;

    const oscillator = ac.createOscillator();
    const gain = ac.createGain();
    const now = ac.currentTime;

    oscillator.type = wave;

    oscillator.frequency.setValueAtTime(
      startFreq,
      now
    );

    oscillator.frequency.exponentialRampToValueAtTime(
      Math.max(20, endFreq),
      now + duration
    );

    gain.gain.setValueAtTime(
      Math.max(0.001, volume),
      now
    );

    gain.gain.exponentialRampToValueAtTime(
      0.001,
      now + duration
    );

    oscillator.connect(gain);
    gain.connect(ac.destination);

    oscillator.start(now);
    oscillator.stop(now + duration);
  }

  function playDiyaSound() {
    toneSound(700, 1100, 0.18, 0.04);
    toneSound(1100, 1500, 0.25, 0.025);
  }

  function playRocketLaunch() {
    toneSound(
      180, 1600, 1.0, 0.07, "sawtooth"
    );
    noiseSound(0.7, 0.06, 2500);
  }

  function playExplosion() {
    noiseSound(0.65, 0.25, 1300);
    toneSound(120, 35, 0.6, 0.15);
  }

  function playChakriSound() {
    toneSound(
      260, 900, 1.3, 0.07, "sawtooth"
    );
    noiseSound(1.3, 0.07, 4200);
  }

  function playSparklerSound() {
    for (let i = 0; i < 14; i++) {
      schedule(() => {
        noiseSound(
          0.06,
          random(0.025, 0.07),
          6000
        );
      }, i * 110);
    }
  }

  function playAnaarSound() {
    noiseSound(1.8, 0.11, 5000);
    toneSound(700, 250, 1.7, 0.035);
  }

  function playBombSound() {
    playExplosion();

    schedule(() => {
      noiseSound(0.35, 0.13, 3500);
    }, 250);
  }

  // ==========================================
  // 5. PARTICLE SYSTEM
  // ==========================================

  function createParticle(
    x,
    y,
    vx,
    vy,
    color,
    life = 65,
    size = 2,
    gravity = 0.07
  ) {
    particles.push({
      x,
      y,
      vx,
      vy,
      color,
      life,
      maxLife: life,
      size,
      gravity
    });

    // Prevent excessive particles on mobile.
    if (particles.length > 1600) {
      particles.splice(
        0,
        particles.length - 1600
      );
    }
  }

  function burst(
    x,
    y,
    count = 80,
    power = 5
  ) {
    for (let i = 0; i < count; i++) {
      const angle =
        (Math.PI * 2 * i) / count +
        random(-0.1, 0.1);

      const speed = random(
        power * 0.4,
        power
      );

      createParticle(
        x,
        y,
        Math.cos(angle) * speed,
        Math.sin(angle) * speed,
        randomColor(),
        random(40, 90),
        random(1.5, 3),
        0.055
      );
    }
  }

  function goldenBurst(
    x,
    y,
    count = 30,
    power = 4
  ) {
    for (let i = 0; i < count; i++) {
      const angle = random(
        0,
        Math.PI * 2
      );

      const speed = random(0.5, power);

      createParticle(
        x,
        y,
        Math.cos(angle) * speed,
        Math.sin(angle) * speed,
        "#FFD166",
        random(25, 55),
        random(1, 3)
      );
    }
  }

  // ==========================================
  // 6. ANIMATION LOOP
  // ==========================================

  function animate(timestamp) {
    const dt = Math.min(
      (timestamp - lastFrame) / 16.67 || 1,
      2
    );

    lastFrame = timestamp;

    ctx.clearRect(
      0,
      0,
      window.innerWidth,
      window.innerHeight
    );

    ctx.globalCompositeOperation = "lighter";

    for (const p of particles) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;

      p.vy += p.gravity * dt;
      p.vx *= 0.993;

      p.life -= dt;

      ctx.globalAlpha = Math.max(
        0,
        p.life / p.maxLife
      );

      ctx.fillStyle = p.color;

      ctx.shadowBlur = 8;
      ctx.shadowColor = p.color;

      ctx.beginPath();
      ctx.arc(
        p.x,
        p.y,
        p.size,
        0,
        Math.PI * 2
      );
      ctx.fill();
    }

    particles = particles.filter(
      p => p.life > 0
    );

    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;

    for (const animation of [...animations]) {
      animation(dt);
    }

    ctx.globalCompositeOperation =
      "source-over";

    requestAnimationFrame(animate);
  }

  requestAnimationFrame(animate);

  // ==========================================
  // 7. SCENE MANAGEMENT
  // ==========================================

  function showScene(sceneId) {
    document.querySelectorAll(".scene")
      .forEach(scene => {
        const active = scene.id === sceneId;

        scene.classList.toggle(
          "active",
          active
        );

        scene.classList.toggle(
          "hidden",
          !active
        );
      });
  }

  // ==========================================
  // 8. INTERACTIVE DIYAS
  // ==========================================

  function createDiyas() {
    diyaGrid.innerHTML = "";

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
        if (diya.classList.contains("lit")) {
          return;
        }

        getAudio();
        playDiyaSound();

        diya.classList.add("lit");

        diya.setAttribute(
          "aria-label",
          `Diya ${i + 1} is lit`
        );

        litCount++;

        diyaCount.textContent = litCount;

        const rect =
          diya.getBoundingClientRect();

        goldenBurst(
          rect.left + rect.width / 2,
          rect.top + rect.height * 0.35,
          35,
          3
        );

        if (litCount === 7) {
          subtitle.textContent =
            "All seven diyas are glowing! ✨";

          continueBtn.classList.remove(
            "hidden"
          );

          goldenBurst(
            window.innerWidth / 2,
            window.innerHeight * 0.35,
            100,
            6
          );
        }
      });

      diyaGrid.appendChild(diya);
    }
  }

  // ==========================================
  // 9. ROCKET FIRECRACKER
  // ==========================================

  function launchRocket() {
    playRocketLaunch();

    const x = random(
      window.innerWidth * 0.25,
      window.innerWidth * 0.75
    );

    let y = window.innerHeight + 20;

    const targetY = window.innerHeight * 0.25;

    const rocketAnimation = (dt) => {
      y -= 10 * dt;

      // Rocket trail
      for (let i = 0; i < 5; i++) {
        createParticle(
          x + random(-5, 5),
          y + 12,
          random(-1, 1),
          random(1, 3),
          "#FFB347",
          25,
          2
        );
      }

      if (y <= targetY) {
        animations = animations.filter(
          a => a !== rocketAnimation
        );

        burst(x, y, 140, 7);
        playExplosion();

        schedule(() => {
          burst(
            x + 45,
            y + 35,
            65,
            4
          );
        }, 250);
      }
    };

    animations.push(rocketAnimation);
  }

  // ==========================================
  // 10. CHAKRI FIRECRACKER
  // ==========================================

  function launchChakri(x, y) {
    playChakriSound();

    let frame = 0;

    const chakriAnimation = (dt) => {
      frame += dt;

      for (let i = 0; i < 7; i++) {
        const angle =
          frame * 0.28 +
          i * Math.PI * 2 / 7;

        createParticle(
          x + Math.cos(angle) * 25,
          y + Math.sin(angle) * 25,
          Math.cos(angle) * random(3, 7),
          Math.sin(angle) * random(3, 7),
          colors[i % colors.length],
          random(25, 50),
          2
        );
      }

      if (frame > 100) {
        animations = animations.filter(
          a => a !== chakriAnimation
        );

        goldenBurst(x, y, 55, 4);
      }
    };

    animations.push(chakriAnimation);
  }

  // ==========================================
  // 11. PHULJHADI FIRECRACKER
  // ==========================================

  function launchSparkler(x, y) {
    playSparklerSound();

    let frame = 0;

    const sparklerAnimation = (dt) => {
      frame += dt;

      for (let i = 0; i < 9; i++) {
        const angle = random(
          0,
          Math.PI * 2
        );

        const speed = random(0.5, 5);

        createParticle(
          x,
          y,
          Math.cos(angle) * speed,
          Math.sin(angle) * speed,
          "#FFE9A6",
          random(15, 55),
          random(1, 2.5),
          0.09
        );
      }

      if (frame > 130) {
        animations = animations.filter(
          a => a !== sparklerAnimation
        );
      }
    };

    animations.push(sparklerAnimation);
  }

  // ==========================================
  // 12. ANAAR FIRECRACKER
  // ==========================================

  function launchAnaar(x, y) {
    playAnaarSound();

    let frame = 0;

    const anaarAnimation = (dt) => {
      frame += dt;

      for (let i = 0; i < 10; i++) {
        createParticle(
          x + random(-8, 8),
          y,
          random(-4.5, 4.5),
          random(-11, -5),
          randomColor(),
          random(45, 85),
          random(1.3, 3),
          0.18
        );
      }

      if (frame > 130) {
        animations = animations.filter(
          a => a !== anaarAnimation
        );
      }
    };

    animations.push(anaarAnimation);
  }

  // ==========================================
  // 13. BOMB FIRECRACKER
  // ==========================================

  function launchBomb(x, y) {
    playBombSound();

    burst(x, y, 180, 9);

    schedule(() => {
      burst(
        x - 75,
        y - 70,
        80,
        5
      );

      burst(
        x + 75,
        y - 70,
        80,
        5
      );
    }, 300);

    schedule(() => {
      goldenBurst(
        x,
        y - 110,
        120,
        7
      );
    }, 650);
  }

  // ==========================================
  // 14. FIRECRACKER BUTTON EVENTS
  // ==========================================

  document.querySelectorAll(".cracker")
    .forEach(button => {

      button.addEventListener("click", () => {
        // Unlock audio on mobile
        getAudio();

        const type = button.dataset.type;

        const rect =
          button.getBoundingClientRect();

        const x = rect.left + rect.width / 2;
        const y = rect.top + rect.height / 2;

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

        button.classList.add("used");

        triedCrackers.add(type);

        crackerCount.textContent =
          triedCrackers.size;

        if (triedCrackers.size === 5) {
          finalBtn.classList.remove(
            "hidden"
          );
        }
      });
    });

  // ==========================================
  // 15. CONTINUE TO FIREWORKS
  // ==========================================

  continueBtn.addEventListener("click", () => {
    getAudio();

    showScene("crackerScene");

    subtitle.textContent =
      "Tap the firecrackers and enjoy the magic!";
  });

  // ==========================================
  // 16. FINAL DIWALI SURPRISE
  // ==========================================

  finalBtn.addEventListener("click", () => {
    showScene("finalScene");

    const params = new URLSearchParams(
      window.location.search
    );

    const name = params.get("name");

    greeting.textContent = name
      ? `Happy Diwali, ${name.slice(0, 35)}! ❤️`
      : "Happy Diwali! ❤️";

    for (let i = 0; i < 6; i++) {
      schedule(() => {
        const x = random(
          window.innerWidth * 0.15,
          window.innerWidth * 0.85
        );

        const y = random(
          window.innerHeight * 0.15,
          window.innerHeight * 0.55
        );

        burst(x, y, 100, random(4, 7));

        if (i % 2 === 0) {
          playExplosion();
        }
      }, i * 450);
    }
  });

  // ==========================================
  // 17. REPLAY EVERYTHING
  // ==========================================

  function resetGame() {
    clearTimers();

    animations = [];
    particles = [];

    litCount = 0;
    triedCrackers.clear();

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

    createDiyas();
    showScene("diyaScene");
  }

  replayBtn.addEventListener("click", resetGame);

  // ==========================================
  // 18. START THE GAME
  // ==========================================

  resetGame();

});

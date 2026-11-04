
'use strict';

document.addEventListener('DOMContentLoaded', () => {
  const $ = id => document.getElementById(id);
  const canvas = $('effects');
  const ctx = canvas.getContext('2d');

  const colors = [
    '#ffd66b', '#ff7d6c', '#fa5dd8',
    '#68d8ff', '#a5ff9a', '#ffffff'
  ];

  let particles = [];
  let animations = [];
  let lit = 0;
  let tried = new Set();
  let last = 0;

  function resize() {
    const d = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = innerWidth * d;
    canvas.height = innerHeight * d;
    ctx.setTransform(d, 0, 0, d, 0, 0);
  }

  window.addEventListener('resize', resize);
  resize();

  const rand = (a, b) => a + Math.random() * (b - a);

  function particle(
    x, y, vx, vy, color,
    life = 75, size = 2, gravity = .055
  ) {
    particles.push({
      x, y, vx, vy, color,
      life, max: life, size, gravity
    });
  }

  function burst(x, y, n = 70, power = 5) {
    for (let i = 0; i < n; i++) {
      const a = Math.PI * 2 * i / n + rand(-.15, .15);
      const v = rand(power * .4, power);

      particle(
        x, y,
        Math.cos(a) * v,
        Math.sin(a) * v,
        colors[i % colors.length],
        rand(45, 90),
        rand(1, 3)
      );
    }
  }

  function gold(x, y, n = 22, power = 4) {
    for (let i = 0; i < n; i++) {
      const a = rand(0, Math.PI * 2);
      const v = rand(.5, power);

      particle(
        x, y,
        Math.cos(a) * v,
        Math.sin(a) * v,
        '#ffcc67',
        rand(20, 55),
        rand(1, 3)
      );
    }
  }

  function tick(t) {
    const dt = Math.min((t - last) / 16.67 || 1, 2);
    last = t;

    ctx.clearRect(0, 0, innerWidth, innerHeight);
    ctx.globalCompositeOperation = 'lighter';

    for (const p of particles) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += p.gravity * dt;
      p.vx *= .993;
      p.life -= dt;

      ctx.globalAlpha = Math.max(0, p.life / p.max);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }

    particles = particles.filter(p => p.life > 0);
    ctx.globalAlpha = 1;

    for (const animation of animations.slice()) {
      animation(dt, t);
    }

    ctx.globalCompositeOperation = 'source-over';
    requestAnimationFrame(tick);
  }

  requestAnimationFrame(tick);

  const grid = $('diyaGrid');

  function showScene(id) {
    document.querySelectorAll('.scene').forEach(scene => {
      scene.classList.toggle('hidden', scene.id !== id);
      scene.classList.toggle('active', scene.id === id);
    });
  }

  function reset() {
    lit = 0;
    tried.clear();
    particles = [];
    animations = [];
    grid.innerHTML = '';

    $('diyaCount').textContent = '0';
    $('crackerCount').textContent = '0';
    $('continueBtn').classList.add('hidden');
    $('finalBtn').classList.add('hidden');
    $('subtitle').textContent =
      'Tap every diya to spread the light!';

    document.querySelectorAll('.cracker').forEach(btn => {
      btn.classList.remove('used');
    });

    showScene('diyaScene');

    for (let i = 0; i < 7; i++) {
      const diya = document.createElement('button');
      diya.type = 'button';
      diya.className = 'diya';
      diya.setAttribute('aria-label', `Light diya ${i + 1}`);

      diya.innerHTML = `
        <span class="flame"></span>
        <span class="wick"></span>
        <span class="bowl"></span>
      `;

      diya.addEventListener('click', () => {
        if (diya.classList.contains('lit')) return;

        diya.classList.add('lit');
        diya.setAttribute('aria-label', `Diya ${i + 1} lit`);
        lit++;

        const r = diya.getBoundingClientRect();
        gold(
          r.left + r.width / 2,
          r.top + r.height * .35,
          36,
          3
        );

        $('diyaCount').textContent = lit;

        if (lit === 7) {
          $('subtitle').textContent =
            'All seven diyas are glowing! ✨';
          $('continueBtn').classList.remove('hidden');
        }
      });

      grid.appendChild(diya);
    }
  }

  $('continueBtn').addEventListener('click', () => {
    showScene('crackerScene');
    $('subtitle').textContent =
      'Tap the firecrackers and enjoy the magic!';
  });

  // Each firecracker has its own animation.

  function launch(type, rect) {
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;

    // ROCKET: rises and explodes in the sky.
    if (type === 'rocket') {
      let px = x;
      let py = innerHeight + 20;

      const fn = dt => {
        py -= 9 * dt;

        for (let i = 0; i < 4; i++) {
          particle(
            px + rand(-4, 4),
            py + 10,
            rand(-1, 1),
            rand(1, 3),
            '#ffba59',
            25, 2
          );
        }

        if (py < innerHeight * .25) {
          animations = animations.filter(a => a !== fn);
          burst(px, py, 130, 6);

          setTimeout(() => {
            burst(px + 60, py + 35, 70, 4);
          }, 230);
        }
      };

      animations.push(fn);
    }

    // CHAKRI: rotating circular sparks.
    if (type === 'chakri') {
      let frame = 0;

      const fn = dt => {
        frame += dt;

        for (let i = 0; i < 5; i++) {
          const a = frame * .24 + i * Math.PI * 2 / 5;

          particle(
            x + Math.cos(a) * 25,
            y + Math.sin(a) * 25,
            Math.cos(a) * rand(3, 7),
            Math.sin(a) * rand(3, 7),
            colors[i],
            rand(25, 50),
            2
          );
        }

        if (frame > 105) {
          animations = animations.filter(a => a !== fn);
        }
      };

      animations.push(fn);
    }

    // PHULJHADI: continuous golden shower.
    if (type === 'sparkler') {
      let frame = 0;

      const fn = dt => {
        frame += dt;

        for (let i = 0; i < 9; i++) {
          const a = rand(0, Math.PI * 2);
          const v = rand(.5, 5);

          particle(
            x, y,
            Math.cos(a) * v,
            Math.sin(a) * v,
            '#ffe9a6',
            rand(15, 55),
            rand(1, 2.5),
            .09
          );
        }

        if (frame > 145) {
          animations = animations.filter(a => a !== fn);
        }
      };

      animations.push(fn);
    }

    // ANAAR: colorful upward fountain.
    if (type === 'anaar') {
      let frame = 0;

      const fn = dt => {
        frame += dt;

        for (let i = 0; i < 10; i++) {
          particle(
            x + rand(-9, 9),
            y,
            rand(-4.8, 4.8),
            rand(-11, -5),
            colors[Math.floor(rand(0, colors.length))],
            rand(45, 85),
            rand(1.3, 3),
            .18
          );
        }

        if (frame > 135) {
          animations = animations.filter(a => a !== fn);
        }
      };

      animations.push(fn);
    }

    // BOMB: large explosion with secondary bursts.
    if (type === 'bomb') {
      burst(x, y, 180, 9);

      setTimeout(() => {
        burst(x - 100, y - 85, 90, 5);
        burst(x + 110, y - 65, 90, 5);
      }, 350);

      setTimeout(() => {
        gold(x, y - 140, 130, 7);
      }, 700);
    }
  }

  document.querySelectorAll('.cracker').forEach(btn => {
    btn.addEventListener('click', () => {
      launch(btn.dataset.type, btn.getBoundingClientRect());

      btn.classList.add('used');
      tried.add(btn.dataset.type);
      $('crackerCount').textContent = tried.size;

      if (tried.size === 5) {
        $('finalBtn').classList.remove('hidden');
      }
    });
  });

  $('finalBtn').addEventListener('click', () => {
    showScene('finalScene');

    $('subtitle').textContent =
      'Every celebration is brighter when shared.';

    const name = new URLSearchParams(
      window.location.search
    ).get('name');

    $('greeting').textContent = name
      ? `Happy Diwali, ${name.slice(0, 35)}! ❤️`
      : 'Happy Diwali! ❤️';

    for (let i = 0; i < 5; i++) {
      setTimeout(() => {
        burst(
          rand(80, Math.max(81, innerWidth - 80)),
          rand(80, Math.max(81, innerHeight * .55)),
          90,
          rand(3, 7)
        );
      }, i * 350);
    }
  });

  $('replayBtn').addEventListener('click', reset);

  reset();
});


'use strict';

// Diwali Surprise: animation and interaction controller.
(function () {
  function initialize() {
    const get = (id) => document.getElementById(id);

    const required = [
      'recipient',
      'cluster',
      'centerDiya',
      'finalDiyas',
      'petals',
      'beads',
      'sparkLayer',
      'thought',
      'start',
      'replay',
      'share'
    ];

    const missing = required.filter((id) => !get(id));

    if (missing.length) {
      console.error(
        'Diwali Surprise: missing HTML elements:',
        missing.join(', ')
      );
      return;
    }

    // Personalized greeting from URL
    const params = new URLSearchParams(window.location.search);
    const recipientName = params.get('name');

    if (recipientName) {
      get('recipient').textContent =
        `Happy Diwali, ${recipientName.slice(0, 40)} ❤️`;
    }

    // Create animated diya
    function makeDiya(x, y, big = false) {
      const element = document.createElement('div');

      element.className = `diya${big ? ' big' : ''}`;
      element.style.left = `${x}%`;
      element.style.top = `${y}%`;

      element.innerHTML = `
        <span class="flame"></span>
        <span class="bowl"></span>
      `;

      return element;
    }

    // Opening diya arrangement
    const diyaPositions = [
      [50, 73, true],
      [25, 87],
      [76, 87],
      [13, 58],
      [35, 50],
      [65, 50],
      [87, 58],
      [21, 31],
      [45, 24],
      [70, 26],
      [86, 37]
    ];

    diyaPositions.forEach(([x, y, big]) => {
      get('cluster').appendChild(makeDiya(x, y, !!big));
    });

    // Center diya
    get('centerDiya').appendChild(makeDiya(50, 50, true));

    // Final scene diyas
    [
      [25, 55],
      [50, 50, true],
      [75, 55]
    ].forEach(([x, y, big]) => {
      get('finalDiyas').appendChild(makeDiya(x, y, !!big));
    });

    // Generate rangoli decorations
    const petals = get('petals');
    const beads = get('beads');

    for (let i = 0; i < 24; i++) {
      const angle = (i * 15 * Math.PI) / 180;

      petals.insertAdjacentHTML(
        'beforeend',
        `<ellipse
          cx="0"
          cy="-73"
          rx="10"
          ry="19"
          transform="rotate(${i * 15})"
        />`
      );

      beads.insertAdjacentHTML(
        'beforeend',
        `<circle
          cx="${Math.sin(angle) * 97}"
          cy="${-Math.cos(angle) * 97}"
          r="5"
          fill="${i % 2 ? '#1b9b4c' : '#f43d36'}"
        />`
      );
    }

    // Scene timer management
    let timers = [];

    function later(callback, delay) {
      timers.push(window.setTimeout(callback, delay));
    }

    // Switch between scenes
    function showScene(id) {
      document.querySelectorAll('.scene').forEach((element) => {
        element.classList.toggle(
          'active',
          element.id === id
        );
      });
    }

    // Firework particle animation
    function fireworks(x, y, count = 32) {
      for (let i = 0; i < count; i++) {
        const particle = document.createElement('span');

        const angle = Math.random() * Math.PI * 2;
        const distance = 35 + Math.random() * 180;

        particle.className = 'spark';

        particle.style.left = `${x}%`;
        particle.style.top = `${y}%`;

        particle.style.setProperty(
          '--dx',
          `${Math.cos(angle) * distance}px`
        );

        particle.style.setProperty(
          '--dy',
          `${Math.sin(angle) * distance}px`
        );

        get('sparkLayer').appendChild(particle);

        window.setTimeout(() => {
          particle.remove();
        }, 1750);
      }
    }

    // Main animation sequence
    function play() {
      timers.forEach((timer) => {
        window.clearTimeout(timer);
      });

      timers = [];

      get('thought').textContent =
        'That special moment. 🥺';

      // Scene 1: Opening
      showScene('intro');
      fireworks(50, 43, 45);

      // Scene 2: Message
      later(() => {
        showScene('message');
      }, 4700);

      later(() => {
        get('thought').textContent =
          'Your smile, your laughter, your light. ❤️';

        fireworks(50, 48, 26);
      }, 7200);

      // Scene 3: Celebration
      later(() => {
        showScene('celebrate');
      }, 10800);

      later(() => {
        fireworks(25, 30, 45);
        fireworks(75, 25, 45);
      }, 12500);

      // Scene 4: Final greeting
      later(() => {
        showScene('final');
        fireworks(50, 25, 70);
      }, 16200);

      later(() => {
        fireworks(20, 35, 35);
      }, 18500);

      later(() => {
        fireworks(80, 35, 35);
      }, 20000);
    }

    // Start button
    get('start').addEventListener('click', play);

    // Replay button
    get('replay').addEventListener('click', play);

    // Share greeting
    get('share').addEventListener('click', async () => {
      const url = new URL(window.location.href);

      url.searchParams.set(
        'name',
        recipientName || 'Someone Special'
      );

      try {
        if (navigator.share) {
          await navigator.share({
            title: 'A Diwali surprise for you',
            url: url.href
          });
        } else if (
          navigator.clipboard &&
          window.isSecureContext
        ) {
          await navigator.clipboard.writeText(url.href);

          get('share').textContent = 'Link copied! ✓';
        } else {
          window.prompt('Copy this link:', url.href);
        }
      } catch (error) {
        if (error.name !== 'AbortError') {
          console.error('Sharing failed:', error);
        }
      }
    });

    // Interactive diyas
    document.querySelectorAll('#cluster .diya')
      .forEach((element) => {
        element.addEventListener('click', () => {
          fireworks(
            parseFloat(element.style.left),
            43,
            18
          );
        });
      });

    // Automatically start animation
    play();
  }

  // Wait until HTML is loaded
  if (document.readyState === 'loading') {
    document.addEventListener(
      'DOMContentLoaded',
      initialize,
      { once: true }
    );
  } else {
    initialize();
  }
})();

(() => {
  const TOTAL_FRAMES = 68;
  const FRAME_PATH = (index) =>
    `frames/ezgif-frame-${String(index).padStart(3, '0')}.jpg`;

  const canvas = document.getElementById('hero-canvas');
  const ctx = canvas.getContext('2d');

  const loader = document.getElementById('loader');
  const loaderBar = document.getElementById('loader-bar');
  const loaderText = document.getElementById('loader-text');

  const frameNumEl = document.getElementById('frame-num');
  const progressFill = document.getElementById('progress-fill');
  const progressPct = document.getElementById('progress-pct');
  const scrollPrompt = document.getElementById('scroll-prompt');
  const autoplayBtn = document.getElementById('autoplay-btn');
  const chapterPills = document.querySelectorAll('.pill');
  const storySections = document.querySelectorAll('.story-section');

  const images = new Array(TOTAL_FRAMES);
  let loadedCount = 0;

  // Smooth interpolation state
  let targetFrame = 0; // 0 to TOTAL_FRAMES - 1
  let currentFrame = 0;
  let lastRenderedIndex = -1;
  let isAutoPlaying = false;

  // Resize canvas with devicePixelRatio support
  function resizeCanvas() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    lastRenderedIndex = -1; // Force redraw
    renderFrame(Math.round(currentFrame));
  }

  // Draw image with 'object-fit: cover' math
  function renderFrame(index) {
    const clampedIndex = Math.max(0, Math.min(TOTAL_FRAMES - 1, index));
    const img = images[clampedIndex];
    if (!img || !img.complete || img.naturalWidth === 0) return;

    const cw = canvas.width;
    const ch = canvas.height;
    const iw = img.naturalWidth;
    const ih = img.naturalHeight;

    const scale = Math.max(cw / iw, ch / ih);
    const drawW = iw * scale;
    const drawH = ih * scale;
    const drawX = (cw - drawW) * 0.5;
    const drawY = (ch - drawH) * 0.5;

    ctx.clearRect(0, 0, cw, ch);
    ctx.drawImage(img, drawX, drawY, drawW, drawH);
  }

  // Compute scroll fraction [0..1]
  function getScrollFraction() {
    const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
    if (maxScroll <= 0) return 0;
    return Math.max(0, Math.min(1, window.scrollY / maxScroll));
  }

  // Update UI overlays based on progress
  function updateUI(fraction, frameIdx) {
    const displayFrame = frameIdx + 1;
    frameNumEl.textContent = String(displayFrame).padStart(3, '0');

    const pct = Math.round(fraction * 100);
    progressFill.style.height = `${pct}%`;
    progressPct.textContent = `${pct}%`;

    if (fraction > 0.03) {
      scrollPrompt.classList.add('fade-out');
    } else {
      scrollPrompt.classList.remove('fade-out');
    }

    // Story sections visibility
    storySections.forEach((section) => {
      const start = parseFloat(section.dataset.start);
      const end = parseFloat(section.dataset.end);
      if (fraction >= start && fraction <= end) {
        section.classList.add('visible');
      } else {
        section.classList.remove('visible');
      }
    });

    // Update active chapter pill
    let activeChapterIdx = 0;
    if (displayFrame >= 52) activeChapterIdx = 3;
    else if (displayFrame >= 37) activeChapterIdx = 2;
    else if (displayFrame >= 22) activeChapterIdx = 1;

    chapterPills.forEach((pill, i) => {
      pill.classList.toggle('active', i === activeChapterIdx);
    });
  }

  // Main animation loop with smooth damping
  function tick() {
    if (isAutoPlaying) {
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
      let nextScroll = window.scrollY + maxScroll * 0.0022;
      if (nextScroll >= maxScroll) {
        nextScroll = 0;
      }
      window.scrollTo(0, nextScroll);
    }

    const fraction = getScrollFraction();
    targetFrame = fraction * (TOTAL_FRAMES - 1);

    // Smooth lerp towards target frame
    currentFrame += (targetFrame - currentFrame) * 0.14;

    const roundedFrame = Math.round(currentFrame);
    if (roundedFrame !== lastRenderedIndex) {
      renderFrame(roundedFrame);
      lastRenderedIndex = roundedFrame;
    }

    updateUI(fraction, roundedFrame);
    requestAnimationFrame(tick);
  }

  // Preload all 68 frames
  function preloadFrames() {
    return new Promise((resolve) => {
      for (let i = 1; i <= TOTAL_FRAMES; i++) {
        const img = new Image();
        img.src = FRAME_PATH(i);
        img.onload = img.onerror = () => {
          loadedCount++;
          const pct = Math.round((loadedCount / TOTAL_FRAMES) * 100);
          loaderBar.style.width = `${pct}%`;
          loaderText.textContent = `LOADING FRAMES ${loadedCount} / ${TOTAL_FRAMES}`;

          if (i === 1) {
            resizeCanvas();
          }

          if (loadedCount === TOTAL_FRAMES) {
            resolve();
          }
        };
        images[i - 1] = img;
      }
    });
  }

  // Interactive chapter navigation
  chapterPills.forEach((pill) => {
    pill.addEventListener('click', () => {
      isAutoPlaying = false;
      autoplayBtn.classList.remove('playing');
      const targetFrameNum = parseInt(pill.dataset.frame, 10) - 1;
      const fraction = targetFrameNum / (TOTAL_FRAMES - 1);
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
      window.scrollTo({
        top: fraction * maxScroll,
        behavior: 'smooth',
      });
    });
  });

  // Auto-play toggle
  autoplayBtn.addEventListener('click', () => {
    isAutoPlaying = !isAutoPlaying;
    autoplayBtn.classList.toggle('playing', isAutoPlaying);
  });

  // Stop autoplay on manual wheel/touch
  window.addEventListener(
    'wheel',
    () => {
      if (isAutoPlaying) {
        isAutoPlaying = false;
        autoplayBtn.classList.remove('playing');
      }
    },
    { passive: true }
  );

  window.addEventListener('resize', resizeCanvas);

  // Start
  preloadFrames().then(() => {
    resizeCanvas();
    setTimeout(() => {
      loader.classList.add('hidden');
    }, 250);
    requestAnimationFrame(tick);
  });
})();


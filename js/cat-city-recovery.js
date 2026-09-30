(() => {
  const canvas = document.querySelector('.city-canvas');
  const photo = canvas.querySelector('.city-photo');
  const gray = canvas.querySelector('.city-photo-gray');
  const color = canvas.querySelector('.city-photo-color');
  const divider = canvas.querySelector('.city-divider');
  const before = canvas.querySelector('.city-before');
  const after = canvas.querySelector('.city-after');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let photoUrl;
  function fitCanvas() {
    canvas.style.setProperty('--canvas-scale', Math.min(innerWidth / 1920, innerHeight / 1080));
  }
  fitCanvas();
  window.addEventListener('resize', fitCanvas);
  const wait = ms => new Promise(resolve => setTimeout(resolve, reducedMotion ? 0 : ms));
  // Same stamp approach as Mission Complete: commit final styles, then cancel WAAPI.
  async function animate(element, frames, duration, easing = 'ease-out') {
    if (!reducedMotion) {
      const animation = element.animate(frames, { duration, easing, fill: 'both' });
      await animation.finished;
      Object.assign(element.style, frames[frames.length - 1]);
      animation.cancel();
    } else Object.assign(element.style, frames[frames.length - 1]);
  }
  async function loadPhoto() {
    const files = await window.CatProofStore.read().catch(() => []);
    // Try uploaded images only, in random order; never substitute a placeholder.
    while (files.length) {
      const file = files.splice(Math.floor(Math.random() * files.length), 1)[0];
      const url = URL.createObjectURL(file);
      gray.src = color.src = url;
      try {
        await Promise.all([gray.decode(), color.decode()]);
        photoUrl = url;
        gray.hidden = color.hidden = false;
        return true;
      } catch { URL.revokeObjectURL(url); }
    }
    gray.removeAttribute('src');
    color.removeAttribute('src');
    before.hidden = after.hidden = divider.hidden = true;
    return false;
  }
  function countStats() {
    const counters = [...canvas.querySelectorAll('[data-count]')];
    const progress = canvas.querySelector('.city-progress');
    const fill = progress.firstElementChild;
    const start = performance.now();
    return new Promise(resolve => {
      function update(now) {
        const fraction = reducedMotion ? 1 : Math.min((now - start) / 900, 1);
        const eased = 1 - Math.pow(1 - fraction, 3);
        counters.forEach(node => { node.textContent = String(Math.round(Number(node.dataset.count) * eased)); });
        fill.style.transform = `scaleX(${eased})`;
        progress.setAttribute('aria-valuenow', String(Math.round(67 * eased)));
        if (fraction < 1) requestAnimationFrame(update);
        else resolve();
      }
      requestAnimationFrame(update);
    });
  }
  async function enter() {
    const [hasPhoto] = await Promise.all([
      loadPhoto(),
      document.fonts.load('47px "ATP Tobeloved"'),
      Promise.allSettled([...canvas.querySelectorAll('img[src]')].map(image => image.decode())),
    ]);
    await animate(canvas.querySelector('.city-title'), [
      { opacity: 0, transform: 'scale(1.28) rotate(-2deg)' },
      { opacity: 1, transform: 'scale(1) rotate(0deg)' },
    ], 350);
    await wait(100);
    photo.style.opacity = '1';
    if (hasPhoto) {
      await wait(100);
      // Both animations share the timeline start, duration and easing.
      // The source images stay full-size; only the color clip boundary moves.
      await Promise.all([
        animate(color, [{ clipPath: 'inset(0 100% 0 0)' }, { clipPath: 'inset(0 0% 0 0)' }], 1800, 'ease-in-out'),
        animate(divider, [{ transform: 'translateX(0px)' }, { transform: 'translateX(1021.5682px)' }], 1800, 'ease-in-out'),
      ]);
      before.setAttribute('aria-hidden', 'true');
      after.removeAttribute('aria-hidden');
      await Promise.all([
        animate(before, [{ opacity: 1 }, { opacity: 0 }], 150),
        animate(after, [{ opacity: 0 }, { opacity: 1 }], 150),
      ]);
      await wait(80);
      await animate(divider, [{ opacity: 1 }, { opacity: 0 }], 150);
    }
    await countStats();
  }
  window.addEventListener('pagehide', event => {
    if (!event.persisted && photoUrl) URL.revokeObjectURL(photoUrl);
  });
  enter();
})();

// Discovery presentation only: the scanner owns hit testing, state, counter, and slots.
export function mountFeedback(canvas, crew) {
  const result = canvas.querySelector('.scanner-result');
  const label = canvas.querySelector('.scanner-found-label');
  const photo = result.querySelector('.scanner-result-photo');
  const title = result.querySelector('.scanner-result-title');
  const description = result.querySelector('.scanner-result-description');
  const number = result.querySelector('.scanner-result-number');
  const background = canvas.querySelector('.scanner-photo-dark');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const pending = [];
  const seen = new Set();
  const animations = new Set();
  let lifetime = new AbortController();
  let presenting = false;
  let labelAnimation;
  result.style.setProperty('--trace-label-image', `url("${new URL(crew.assets.traceLabel, document.baseURI).href}")`);

  const delay = (ms, signal) => new Promise((resolve, reject) => {
    if (signal.aborted) { reject(new DOMException('Aborted', 'AbortError')); return; }
    const abort = () => { clearTimeout(timer); reject(new DOMException('Aborted', 'AbortError')); };
    const timer = setTimeout(() => { signal.removeEventListener('abort', abort); resolve(); }, ms);
    signal.addEventListener('abort', abort, { once: true });
  });
  async function animate(element, frames, options) {
    const motion = element.animate(frames, { ...options, fill: 'both' });
    animations.add(motion);
    try { await motion.finished; }
    finally { animations.delete(motion); motion.cancel(); }
  }
  async function present(discovery, signal) {
    await discovery.blinkFinished;
    if (signal.aborted) throw new DOMException("Aborted", "AbortError");
    const category = crew.categories.find(item => item.id === discovery.categoryId);
    const copy = category.feedback;
    result.dataset.categoryId = category.id;
    result.dataset.cropX = String(discovery.position.x);
    result.dataset.cropY = String(discovery.position.y);
    result.setAttribute('aria-label', `TRACE ${copy.number} — ${copy.title}. ${copy.description}`);
    number.textContent = `TRACE ${copy.number}`;
    title.textContent = copy.title;
    description.textContent = copy.description;
    const width = crew.hotspotReferenceSize.width * 287.5 / discovery.cropDiameter;
    const height = width * background.naturalHeight / background.naturalWidth;
    // Keep edge discoveries inside the photograph rather than exposing an empty crop.
    const cropX = Math.max(287.5 - width, Math.min(0, 287.5 / 2 - discovery.position.x / 100 * width));
    const cropY = Math.max(270.1 - height, Math.min(0, 270.1 / 2 - discovery.position.y / 100 * height));
    Object.assign(photo.style, {
      backgroundImage: `url("${crew.assets.background}")`,
      backgroundSize: `${width}px ${height}px`,
      backgroundPosition: `${cropX}px ${cropY}px`,
    });
    result.hidden = false;
    const distance = canvas.clientHeight - result.offsetTop + 24;
    result.dataset.phase = 'entering';
    await animate(result, [
      { transform: `translateY(${distance}px)`, opacity: 0 },
      { transform: 'translateY(0)', opacity: 1 },
    ], { duration: reducedMotion.matches ? 0 : 500, easing: 'cubic-bezier(.2,1.25,.4,1)' });
    result.dataset.phase = 'holding';
    await delay(discovery.isComplete ? 3500 : 1000, signal);
    result.dataset.phase = 'exiting';
    await animate(result, [
      { transform: 'translateY(0)', opacity: 1 },
      { transform: `translateY(${distance}px)`, opacity: 0 },
    ], { duration: reducedMotion.matches ? 0 : 400, easing: 'ease-in' });
    result.hidden = true;
    result.dataset.phase = 'hidden';
    // The real exit animation has finished; then allow the character response to finish
    // before showing the next queued card. The count is a snapshot of scanner state.
    await delay(200, signal);
    if (signal.aborted) throw new DOMException('Aborted', 'AbortError');
    const reactions = [];
    canvas.dispatchEvent(new CustomEvent('scanner:feedback-exited', {
      detail: { categoryId: discovery.categoryId, discoveryCount: discovery.discoveryCount,
        waitUntil: promise => reactions.push(Promise.resolve(promise)) },
    }));
    await Promise.all(reactions);
    if (!signal.aborted) canvas.dispatchEvent(new CustomEvent('scanner:feedback-complete', {
      detail: { categoryId: discovery.categoryId, discoveryCount: discovery.discoveryCount, isComplete: discovery.isComplete },
    }));
  }
  async function drain() {
    if (presenting || lifetime.signal.aborted) return;
    presenting = true;
    const signal = lifetime.signal;
    try {
      while (pending.length && !signal.aborted) await present(pending.shift(), signal);
    } catch (error) {
      if (error.name !== 'AbortError') console.error('TRACE feedback:', error);
    } finally {
      result.hidden = true;
      presenting = false;
    }
  }
  function flash() {
    labelAnimation?.cancel();
    // Snapshot the actual displayed scanner position. Further mouse moves never update this label.
    const style = getComputedStyle(canvas);
    label.style.left = `${parseFloat(style.getPropertyValue('--scan-x')) + 43.97}px`;
    label.style.top = `${parseFloat(style.getPropertyValue('--scan-y')) + 64.28}px`;
    label.hidden = false;
    const frames = reducedMotion.matches ? [
      { opacity: 1, offset: 0 }, { opacity: 1, offset: 6 / 7 }, { opacity: 0, offset: 1 },
    ] : [
      { opacity: 1, offset: 0, easing: 'steps(1,end)' },
      { opacity: 0, offset: 1 / 21, easing: 'steps(1,end)' },
      { opacity: 1, offset: 2 / 21, easing: 'steps(1,end)' },
      { opacity: 0, offset: 3 / 21, easing: 'steps(1,end)' },
      { opacity: 1, offset: 4 / 21, easing: 'steps(1,end)' },
      { opacity: 0, offset: 5 / 21, easing: 'steps(1,end)' },
      { opacity: 1, offset: 6 / 21 },
      { opacity: 1, offset: 6 / 7 },
      { opacity: 0, offset: 1 },
    ];
    const motion = label.animate(frames, { duration: 1400, fill: 'forwards' });
    labelAnimation = motion;
    motion.finished.then(() => {
      if (labelAnimation !== motion) return;
      label.hidden = true;
      motion.cancel();
      labelAnimation = undefined;
    }).catch(error => { if (error.name !== 'AbortError') console.error(error); });
    // Gate the first card on the animation's actual blink phase, not a guessed timer.
    return new Promise(resolve => {
      const check = () => {
        if (lifetime.signal.aborted || motion.playState === 'idle' || Number(motion.currentTime) >= 400) {
          resolve();
          return;
        }
        requestAnimationFrame(check);
      };
      check();
    });
  }
  canvas.addEventListener('scanner:trace-discovered', ({ detail }) => {
    if (lifetime.signal.aborted || seen.has(detail.categoryId)) return;
    const category = crew.categories.find(item => item.id === detail.categoryId);
    if (!category?.feedback) return;
    seen.add(category.id);
    pending.push({ categoryId: category.id, position: { ...detail.position }, cropDiameter: detail.cropDiameter, discoveryCount: detail.discoveryCount, isComplete: detail.isComplete, blinkFinished: flash() });
    drain();
  });
  window.addEventListener('pagehide', () => {
    lifetime.abort();
    pending.length = 0;
    animations.forEach(motion => motion.cancel());
    labelAnimation?.cancel();
    label.hidden = true;
    result.hidden = true;
  });
  window.addEventListener('pageshow', event => {
    if (event.persisted) lifetime = new AbortController();
  });
}

// Starts only after the scanner's final queued card and character reaction finish.
export function mountCompletion(canvas, crew) {
  const screen = canvas.querySelector('.scanner-complete');
  const button = screen.querySelector('.scanner-complete-button');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const motions = new Set();
  const lifetime = new AbortController();
  let started = false;
  let navigating = false;
  button.href = `${canvas.dataset.crew}-mission-action.html`;

  function pause(ms) {
    return new Promise((resolve, reject) => {
      const signal = lifetime.signal;
      if (signal.aborted) { reject(new DOMException('Aborted', 'AbortError')); return; }
      const abort = () => { clearTimeout(timer); reject(new DOMException('Aborted', 'AbortError')); };
      const timer = setTimeout(() => { signal.removeEventListener('abort', abort); resolve(); }, ms);
      signal.addEventListener('abort', abort, { once: true });
    });
  }
  async function animate(element, frames, duration, easing = 'ease-out') {
    if (lifetime.signal.aborted) throw new DOMException('Aborted', 'AbortError');
    const animation = element.animate(frames, { duration: reducedMotion.matches ? 0 : duration, easing, fill: 'both' });
    motions.add(animation);
    try {
      await animation.finished;
      element.style.opacity = String(frames[frames.length - 1].opacity);
    } finally {
      animation.cancel();
      motions.delete(animation);
    }
  }
  async function type(line) {
    const copy = line.querySelector('.scanner-complete-ghost').textContent;
    const text = line.querySelector('.scanner-complete-typed');
    if (reducedMotion.matches) { text.textContent = copy; return; }
    for (const character of Array.from(copy)) {
      if (lifetime.signal.aborted) throw new DOMException('Aborted', 'AbortError');
      text.textContent += character;
      await pause(35);
    }
  }
  async function enter() {
    // feedback-complete is emitted only after the final dialogue fade-in and reaction finish.
    screen.dataset.phase = 'final-dialogue';
    await pause(1000);
    screen.dataset.phase = 'game-fade';
    await animate(canvas.querySelector('.scanner-game'), [{ opacity: 1 }, { opacity: 0 }], 500);
    screen.hidden = false;
    canvas.dispatchEvent(new CustomEvent('scanner:completion-start'));
    screen.dataset.phase = 'overlay';
    await animate(screen.querySelector('.scanner-complete-shade'), [{ opacity: 0 }, { opacity: 1 }], 350);
    screen.dataset.phase = 'all-traces';
    await animate(screen.querySelector('.scanner-complete-all'), [
      { opacity: 0, transform: 'translateY(-25px)' }, { opacity: 1, transform: 'translateY(0)' },
    ], 400);
    screen.dataset.phase = 'found';
    await animate(screen.querySelector('.scanner-complete-found'), [
      { opacity: 0, transform: 'scale(1.35)' }, { opacity: 1, transform: 'scale(.92)', offset: .65 },
      { opacity: 1, transform: 'scale(1)' },
    ], 450);
    const lines = screen.querySelectorAll('.scanner-complete-line');
    screen.dataset.phase = 'line-one';
    await type(lines[0]);
    await pause(reducedMotion.matches ? 0 : 150);
    screen.dataset.phase = 'line-two';
    await type(lines[1]);
    screen.dataset.phase = 'button';
    await animate(button, [
      { opacity: 0, transform: 'translateY(15px)' }, { opacity: 1, transform: 'translateY(0)' },
    ], 350);
    button.removeAttribute('aria-disabled');
    button.removeAttribute('tabindex');
    screen.dataset.phase = 'ready';
  }
  canvas.addEventListener('scanner:feedback-complete', ({ detail }) => {
    if (started || lifetime.signal.aborted || !detail.isComplete || !canvas.scannerState?.isComplete) return;
    started = true;
    enter().catch(error => { if (error.name !== 'AbortError') console.error('Scanner completion:', error); });
  });
  button.addEventListener('click', event => {
    if (button.getAttribute('aria-disabled') === 'true' || navigating) { event.preventDefault(); return; }
    navigating = true;
    button.setAttribute('aria-disabled', 'true');
  });
  window.addEventListener('pagehide', () => {
    lifetime.abort();
    motions.forEach(motion => motion.cancel());
  });
  window.addEventListener('pageshow', event => {
    if (event.persisted && started) location.reload();
  });
}

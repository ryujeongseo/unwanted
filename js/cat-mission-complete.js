(() => {
  const canvas = document.querySelector('.complete-canvas');
  const cards = [...canvas.querySelectorAll('.reward-card')];
  const dialogue = canvas.querySelector('.dash-dialogue');
  const copy = canvas.querySelector('.dash-copy');
  const city = canvas.querySelector('.city-entrance');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  function fitCanvas() {
    canvas.style.setProperty('--canvas-scale', Math.min(innerWidth / 1920, innerHeight / 1080));
  }
  fitCanvas();
  window.addEventListener('resize', fitCanvas);

  async function animate(element, frames, duration) {
    const last = frames[frames.length - 1];
    if (!reducedMotion) {
      const animation = element.animate(frames, { duration, easing: 'ease-out', fill: 'both' });
      await animation.finished;
      Object.assign(element.style, last);
      animation.cancel();
    } else {
      Object.assign(element.style, last);
    }
  }

  // Reuse the dialogue page's per-letter HTML spans and 40ms reveal interval.
  function prepareTyping() {
    const letters = [];
    const originals = [...copy.querySelectorAll('p')].map((paragraph) => [paragraph, paragraph.textContent]);
    copy.setAttribute('aria-label', originals.map(([, text]) => text).join(' '));
    originals.forEach(([paragraph, text]) => {
      paragraph.setAttribute('aria-hidden', 'true');
      paragraph.replaceChildren(...Array.from(text, (letter) => {
        const span = document.createElement('span');
        span.textContent = letter;
        span.style.opacity = '0';
        letters.push(span);
        return span;
      }));
    });
    return async () => {
      for (let i = 0; i < letters.length; i++) {
        if (i && !reducedMotion) await wait(40);
        letters[i].style.opacity = '1';
      }
      originals.forEach(([paragraph, text]) => { paragraph.textContent = text; });
    };
  }

  async function playSequence() {
    const typeDialogue = prepareTyping();
    await Promise.allSettled([
      document.fonts.load('24px "KMU80TTFHaeongSans"'),
      ...[...canvas.querySelectorAll('img')].map((image) => image.decode()),
    ]);
    if (!reducedMotion) await wait(350);
    for (let i = 0; i < cards.length; i++) {
      const card = cards[i];
      // The absolutely positioned images give their wrapper no intrinsic size.
      // Use their shared visual center without changing any layout dimensions.
      const faces = [...card.querySelectorAll('.card-disabled, .card-active')];
      card.style.transformOrigin = `${Math.max(...faces.map((face) => face.offsetWidth)) / 2}px ${Math.max(...faces.map((face) => face.offsetHeight)) / 2}px`;
      await Promise.all([
        animate(card.querySelector('.card-disabled'), [{ opacity: 1 }, { opacity: 0 }], 300),
        animate(card.querySelector('.card-active'), [{ opacity: 0 }, { opacity: 1 }], 300),
        animate(card, [
          { transform: 'scale(1)' },
          { transform: 'scale(1.04)' },
          { transform: 'scale(1)' },
        ], 350),
      ]);
      await animate(card.querySelector('.card-stamp'), [
        { opacity: 0, transform: 'scale(1.25) rotate(-3deg)' },
        { opacity: 1, transform: 'scale(1) rotate(0deg)' },
      ], 280);
      if (i < cards.length - 1 && !reducedMotion) await wait(350);
    }
    dialogue.hidden = false;
    await animate(dialogue, [{ opacity: 0 }, { opacity: 1 }], 300);
    await typeDialogue();
    city.hidden = false;
    await animate(city, [
      { opacity: 0, transform: 'translateY(5px)' },
      { opacity: 1, transform: 'translateY(0)' },
    ], 300);
    city.inert = false;
  }

  playSequence();
})();

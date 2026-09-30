(() => {
  const canvas = document.querySelector('.intro-canvas');
  function fitIntroCanvas() {
    const scale = Math.min(window.innerWidth / 1920, window.innerHeight / 1080);
    canvas.style.setProperty('--canvas-scale', scale);
  }
  fitIntroCanvas();
  window.addEventListener('resize', fitIntroCanvas);

  const entranceElements = [...canvas.querySelectorAll(
    '.intro__logo-image, .intro__pigeon-image, .intro__rat-image, .intro__cat-image, ' +
    '.intro__detected, .intro__slogan-crop img, .intro__click-to-enter, .intro__hotspot--enter'
  )];
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  let cycle = 0;
  let timer;
  let finishWait;
  let fades = [];
  const wait = (ms) => new Promise(resolve => {
    finishWait = resolve;
    timer = setTimeout(resolve, ms);
  });

  function stopReplay() {
    cycle++;
    clearTimeout(timer);
    finishWait?.();
    fades.forEach(animation => animation.cancel());
    fades = [];
  }

  async function replayIntro() {
    stopReplay();
    if (reducedMotion.matches) return;
    const token = cycle;
    // Rewind the original CSS animations, including their original delays.
    const animations = entranceElements.flatMap(element => element.getAnimations())
      .filter(animation => animation instanceof CSSAnimation);
    const entrances = animations.filter(animation =>
      animation.effect.getTiming().iterations !== Infinity);
    if (!entrances.length) return;
    try {
      while (token === cycle) {
        await Promise.all(entrances.map(animation => animation.finished));
        if (token !== cycle) return;
        await wait(7000);
        if (token !== cycle) return;
        fades = entranceElements.map(element => element.animate([
          { opacity: getComputedStyle(element).opacity },
          { opacity: 0 },
        ], { duration: 250, easing: 'ease-out', fill: 'forwards' }));
        await Promise.all(fades.map(animation => animation.finished));
        if (token !== cycle) return;
        await wait(250);
        if (token !== cycle) return;
        animations.forEach(animation => { animation.currentTime = 0; animation.play(); });
        fades.forEach(animation => animation.cancel());
        fades = [];
      }
    } catch (error) {
      // Navigation or a motion-preference change can cancel pending animations.
      if (error.name !== 'AbortError') throw error;
    }
  }

  replayIntro();
  window.addEventListener('pagehide', stopReplay);
  window.addEventListener('pageshow', event => { if (event.persisted) replayIntro(); });
  reducedMotion.addEventListener('change', replayIntro);
})();

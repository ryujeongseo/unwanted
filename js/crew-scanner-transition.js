(() => {
  const button = document.querySelector('.guide-start-button');
  if (!button) return;
  // The existing crew-specific route IS the project's selected-crew state.
  const crewId = location.pathname.split('/').pop().split('-')[0];
  const crew = window.CrewScannerConfig.crews[crewId];
  let busy = false;
  let prepared;
  async function prepare() {
    const response = await fetch('crew-scanner.html');
    if (!response.ok) throw new Error(`Scanner page: HTTP ${response.status}`);
    const html = new DOMParser().parseFromString(await response.text(), 'text/html');
    const canvas = document.importNode(html.querySelector('.scanner-canvas'), true);
    canvas.style.visibility = 'hidden';
    document.body.append(canvas);
    try { return { canvas, scanner: await window.CrewScanner.prepare(canvas, crewId) }; }
    catch (error) { canvas.remove(); throw error; }
  }
  if (!crew?.ready) {
    button.title = `${crew?.name || crewId} CREW SCANNER 에셋이 아직 준비되지 않았습니다.`;
    button.setAttribute('aria-disabled', 'true');
    button.addEventListener('click', event => event.preventDefault());
    return;
  }
  button.href = `crew-scanner.html?crew=${crewId}`;
  button.addEventListener('pointerenter', () => { prepared ||= prepare(); prepared.catch(() => { prepared = undefined; }); }, { once: true });
  button.addEventListener('click', async event => {
    event.preventDefault();
    if (busy) return;
    busy = true;
    button.setAttribute('aria-disabled', 'true');
    button.classList.add('scanner-pressed');
    const bounds = button.getBoundingClientRect();
    const x = bounds.left + bounds.width / 2;
    const y = bounds.top + bounds.height / 2;
    const radius = Math.max(...[[0,0], [innerWidth,0], [0,innerHeight], [innerWidth,innerHeight]].map(([cx,cy]) => Math.hypot(cx-x, cy-y))) + 2;
    const circle = r => `circle(${r}px at ${x}px ${y}px)`;
    const overlay = document.createElement('div');
    overlay.className = 'scanner-wipe';
    overlay.style.background = crew.color;
    overlay.style.clipPath = circle(0);
    document.body.append(overlay);
    const guide = document.querySelector('.guide-canvas');
    guide.inert = true;
    try {
      const ready = prepared ||= prepare();
      ready.catch(() => {});
      await new Promise(resolve => setTimeout(resolve, 100));
      await overlay.animate([{ clipPath: circle(0) }, { clipPath: circle(radius) }], { duration: 550, easing: 'ease-in-out', fill: 'forwards' }).finished;
      const { canvas, scanner } = await ready;
      overlay.style.clipPath = circle(radius);
      guide.hidden = true;
      canvas.style.visibility = 'visible';
      history.pushState({ scanner: true }, '', button.href);
      document.title = 'UNWANTED — CREW SCANNER';
      await overlay.animate([{ clipPath: circle(radius) }, { clipPath: circle(0) }], { duration: 450, easing: 'ease-in-out', fill: 'forwards' }).finished;
      overlay.remove();
      await scanner.start();
    } catch (error) {
      console.error('CREW SCANNER 전환 실패:', error);
      overlay.remove();
      guide.hidden = false;
      guide.inert = false;
      button.classList.remove('scanner-pressed');
      button.removeAttribute('aria-disabled');
      prepared = undefined;
      busy = false;
    }
  });
  window.addEventListener('popstate', () => location.reload());
  window.addEventListener('pageshow', event => { if (event.persisted) location.reload(); });
})();

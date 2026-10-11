(() => {
  const config = window.CrewScannerConfig;
  const development = ['localhost', '127.0.0.1', '[::1]', ''].includes(location.hostname);
  const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

  // Shared by direct entry and the guide's transition.
  window.CrewScanner = {
    async prepare(canvas, crewId) {
      const crew = config.crews[crewId];
      if (!crew?.ready) throw new Error(`${crew?.name || crewId}: scanner assets are not available`);
      canvas.dataset.crew = crewId;
      canvas.querySelector('.scanner-back').href = `${crewId}-mission-guide.html`;
      canvas.style.setProperty('--crew-color', crew.color);
      canvas.style.setProperty('--scan-radius', `${config.scannerRadius}px`);
      canvas.classList.add('scanner-loading-active');
      canvas.querySelectorAll('[data-asset]').forEach(img => { img.src = crew.assets[img.dataset.asset]; });
      const fit = () => canvas.style.setProperty('--canvas-scale', Math.min(innerWidth / 1920, innerHeight / 1080));
      fit();
      window.addEventListener('resize', fit);
      await Promise.all([...canvas.querySelectorAll('img')].map(async img => {
        try { await img.decode(); }
        catch (error) { throw new Error(`Scanner image failed: ${img.currentSrc || img.src}`, { cause: error }); }
      }));
      await Promise.all([document.fonts.load('41px "ATP Tobeloved"'), document.fonts.load('18px "Haeong Sans"')]);
      if (crew.categories.some(category => category.feedback)) {
        const { mountFeedback } = await import('./crew-scanner-feedback.js');
        mountFeedback(canvas, crew);
      }
      if (crew.assets.completeButton) {
        const { mountCompletion } = await import('./crew-scanner-complete.js');
        mountCompletion(canvas, crew);
      }
      const foundIds = new Set();
      const foundOrder = [];
      const discoveries = [];
      const panel = canvas.querySelector('.scanner-panel');
      const counter = panel.querySelector('.scanner-count');
      const slots = [...panel.querySelectorAll('.scanner-slot')];
      let counterPop;
      const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
      const isTaggy = crewId === 'pigeon';
      const dialogueText = canvas.querySelector('.scanner-bubble p');
      let dialogueAnimation;
      let dialogueVersion = 0;
      let entranceStarted = false;
      if (isTaggy) dialogueText.textContent = crew.dialogue[foundOrder.length];

      const enterTaggy = () => {
        if (!isTaggy || entranceStarted) return;
        entranceStarted = true;
        if (reducedMotion.matches) return;
        // All transforms are local to the UI; canvas scaling and Figma coordinates stay intact.
        const sequence = [
          ['.scanner-title', { transform: 'translateY(-35px) scale(1.08)', opacity: 0 }, 350, 0, 'cubic-bezier(0.2, 1.4, 0.4, 1)'],
          ['.scanner-label', { transform: 'translateX(-45px)', opacity: 0 }, 250, 200, 'ease-out'],
          ['.scanner-character', { transform: 'translateX(-120px)', opacity: 0 }, 450, 300, 'ease-out'],
          ['.scanner-bubble', { transform: 'scale(.9)', opacity: 0 }, 300, 550, 'ease-out'],
          ['.scanner-panel', { transform: 'translateY(-10px)', opacity: 0 }, 250, 700, 'ease-out'],
        ];
        sequence.forEach(([selector, initial, duration, delay, easing]) => {
          const entrance = canvas.querySelector(selector).animate([
            initial, { transform: 'translate(0, 0) scale(1)', opacity: 1 },
          ], { duration, delay, easing, fill: 'both' });
          // Remove completed animation effects so discovery animations never replay the entrance.
          entrance.finished.then(() => entrance.cancel()).catch(error => {
            if (error.name !== 'AbortError') console.error(error);
          });
        });
      };

      const updateTaggyDialogue = async (discoveryCount = foundOrder.length) => {
        if (!isTaggy) return;
        // Use the same discovery state as the counter, never the number of mouse clicks.
        const message = crew.dialogue[discoveryCount];
        const version = ++dialogueVersion;
        const opacity = getComputedStyle(dialogueText).opacity;
        dialogueAnimation?.cancel();
        if (reducedMotion.matches) {
          dialogueText.textContent = message;
          dialogueText.style.opacity = '1';
          dialogueAnimation = undefined;
          return;
        }
        try {
          const fadeOut = dialogueText.animate([{ opacity }, { opacity: 0 }],
            { duration: 100, easing: 'ease-out', fill: 'forwards' });
          dialogueAnimation = fadeOut;
          await fadeOut.finished;
          if (version !== dialogueVersion) return;
          dialogueText.textContent = message;
          dialogueText.style.opacity = '0';
          fadeOut.cancel();
          const fadeIn = dialogueText.animate([{ opacity: 0 }, { opacity: 1 }],
            { duration: 150, easing: 'ease-out', fill: 'forwards' });
          dialogueAnimation = fadeIn;
          await fadeIn.finished;
          if (version !== dialogueVersion) return;
          dialogueText.style.opacity = '1';
          fadeIn.cancel();
          dialogueAnimation = undefined;
        } catch (error) {
          // A newer category discovery cancels the old transition and owns the latest line.
          if (error.name !== 'AbortError') console.error(error);
        }
      };
      let reactionAnimation;
      canvas.addEventListener('scanner:feedback-exited', ({ detail }) => {
        if (!isTaggy) return;
        const react = async () => {
          if (!reducedMotion.matches) {
            reactionAnimation = canvas.querySelector('.scanner-character').animate([
              { transform: 'translateY(0)' },
              { transform: 'translateY(-8px)', offset: .45 },
              { transform: 'translateY(0)' },
            ], { duration: 300, easing: 'ease-out' });
          }
          try {
            await Promise.all([updateTaggyDialogue(detail.discoveryCount), reactionAnimation?.finished]);
          } catch (error) {
            if (error.name !== 'AbortError') console.error(error);
          } finally {
            reactionAnimation?.cancel();
            reactionAnimation = undefined;
          }
        };
        detail.waitUntil(react());
      });
      window.addEventListener('pagehide', () => {
        reactionAnimation?.cancel();
        dialogueVersion++;
        dialogueAnimation?.cancel();
      });
      const game = canvas.querySelector('.scanner-game');
      const photo = canvas.querySelector('.scanner-photo-dark');
      let active = false;
      let frame = 0;
      canvas.addEventListener('scanner:completion-start', () => {
        active = false;
        cancelAnimationFrame(frame);
        frame = 0;
        canvas.classList.remove('scanner-exploring');
        game.hidden = true;
      });
      let point = { x: 1138, y: 610 };
      const localPoint = event => {
        const bounds = canvas.getBoundingClientRect();
        return { x: (event.clientX - bounds.left) * 1920 / bounds.width, y: (event.clientY - bounds.top) * 1080 / bounds.height };
      };
      const onPhoto = event => !event.target.closest('.scanner-ui') && event.target.closest('.scanner-game');
      const renderPointer = () => {
        frame = 0;
        canvas.style.setProperty('--scan-x', `${point.x}px`);
        canvas.style.setProperty('--scan-y', `${point.y}px`);
      };
      const hidePointer = () => canvas.classList.remove('scanner-exploring');
      game.addEventListener('pointermove', event => {
        if (!active || !onPhoto(event)) { hidePointer(); return; }
        point = localPoint(event);
        canvas.classList.add('scanner-exploring');
        if (!frame) frame = requestAnimationFrame(renderPointer);
      });
      game.addEventListener('pointerleave', hidePointer);
      window.addEventListener('blur', hidePointer);
      // Use the same cover geometry for centers, hit radii, and inverse crop coordinates.
      const photoGeometry = () => {
        const scale = Math.max(1920 / photo.naturalWidth, 1080 / photo.naturalHeight);
        return { scale, width: photo.naturalWidth * scale, height: photo.naturalHeight * scale,
          left: (1920 - photo.naturalWidth * scale) / 2,
          top: (1080 - photo.naturalHeight * scale) / 2 };
      };
      const mapHotspot = hotspot => {
        const image = photoGeometry();
        return {
          x: hotspot.x / 100 * image.width + image.left,
          y: hotspot.y / 100 * image.height + image.top,
          radius: hotspot.radius * image.width / crew.hotspotReferenceSize.width,
        };
      };
      const toPhotoPoint = click => {
        const image = photoGeometry();
        return { x: (click.x - image.left) / image.width * 100,
          y: (click.y - image.top) / image.height * 100 };
      };
      const regions = crew.categories.flatMap(category =>
        category.hotspots.map(hotspot => ({ category, hotspot })));
      const hitTest = click => {
        let closest;
        for (const region of regions) {
          const spot = mapHotspot(region.hotspot);
          const distance = Math.hypot(click.x - spot.x, click.y - spot.y);
          // Overlapping generous circles resolve to the nearest object center.
          // Keep found categories in this comparison to avoid collecting a neighbor by re-clicking.
          if (distance <= spot.radius && (!closest || distance < closest.distance)) {
            closest = { ...region, distance };
          }
        }
        return closest;
      };
      const collectTrace = (category, discovery) => {
        const slot = slots[foundOrder.length - 1];
        const crop = discovery.position;
        const diameter = discovery.cropDiameter;
        const size = slot.clientWidth;
        const imageWidth = crew.hotspotReferenceSize.width * size / diameter;
        const imageHeight = imageWidth * photo.naturalHeight / photo.naturalWidth;
        const thumbnail = document.createElement('div');
        thumbnail.className = 'scanner-slot-image';
        // Same crew photo as the scanner; center a configurable square photo crop.
        Object.assign(thumbnail.style, {
          backgroundImage: `url("${crew.assets.background}")`,
          backgroundSize: `${imageWidth}px ${imageHeight}px`,
          backgroundPosition: `${size / 2 - crop.x / 100 * imageWidth}px ${size / 2 - crop.y / 100 * imageHeight}px`,
        });
        slot.dataset.traceId = category.id;
        slot.dataset.hotspotId = discovery.hotspotId;
        slot.dataset.cropX = String(crop.x);
        slot.dataset.cropY = String(crop.y);
        slot.setAttribute('aria-label', category.name);
        slot.append(thumbnail);
        counter.textContent = String(foundOrder.length).padStart(2, '0');
        panel.setAttribute('aria-label', `TRACE FOUND ${counter.textContent} / 03 — ${foundOrder.map(id => crew.categories.find(item => item.id === id).name).join(', ')}`);
        const question = slot.querySelector('.scanner-slot-question');
        if (reducedMotion.matches) { question.hidden = true; return; }
        counterPop?.cancel();
        counterPop = counter.animate([
          { transform: 'scale(1)' }, { transform: 'scale(1.16)', offset: .45 }, { transform: 'scale(1)' },
        ], { duration: 200, easing: 'ease-out' });
        // The PNG's embedded question is covered by the black slot backing;
        // this identical cropped copy can fade without touching the dotted border.
        const fade = question.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 100, fill: 'forwards' });
        fade.finished.then(() => { question.hidden = true; fade.cancel(); });
        thumbnail.animate([
          { transform: 'scale(.8)', opacity: 0 }, { transform: 'scale(1)', opacity: 1 },
        ], { duration: 250, easing: 'ease-out' });
      };
      const discoverTrace = (category, hotspot, click) => {
        if (foundIds.has(category.id) || foundOrder.length >= slots.length) return false;
        const position = toPhotoPoint(click);
        const baseDiameter = hotspot.cropDiameter || category.cropDiameter;
        // Center exactly on the click, widening the crop if necessary to retain the nearby object.
        const deltaX = Math.abs(position.x - hotspot.x) / 100 * crew.hotspotReferenceSize.width;
        const deltaY = Math.abs(position.y - hotspot.y) / 100 * crew.hotspotReferenceSize.width * photo.naturalHeight / photo.naturalWidth;
        const discovery = { categoryId: category.id, hotspotId: hotspot.id, position,
          cropDiameter: Math.max(baseDiameter, 2 * Math.max(deltaX, deltaY) + baseDiameter) };
        foundIds.add(category.id);
        foundOrder.push(category.id);
        discoveries.push(discovery);
        collectTrace(category, discovery);
        if (!category.feedback) updateTaggyDialogue();
        canvas.dispatchEvent(new CustomEvent('scanner:trace-discovered', {
          detail: { id: category.id, crewId, ...discovery, discoveryCount: foundOrder.length, isComplete: foundIds.size === crew.categories.length },
        }));
        return true;
      };
      game.addEventListener('click', event => {
        if (!active || !onPhoto(event) || !canvas.classList.contains('scanner-exploring')) return;
        const click = localPoint(event);
        if (Math.hypot(click.x - point.x, click.y - point.y) > config.scannerRadius) return;
        const region = hitTest(click);
        if (region) discoverTrace(region.category, region.hotspot, click);
      });
      const debug = development && (config.debug || new URLSearchParams(location.search).get('scannerDebug') === '1');
      if (debug) {
        const debugLayer = canvas.querySelector('.scanner-debug');
        const categoryFilter = new URLSearchParams(location.search).get('scannerDebugCategory');
        const summary = document.createElement('div');
        summary.className = 'scanner-debug-summary';
        crew.categories.forEach(category => {
          const line = document.createElement('div');
          line.style.color = category.debugColor;
          line.textContent = `${category.name}: ${category.hotspots.length} hotspots`;
          summary.append(line);
          category.hotspots.forEach((hotspot, index) => {
            const spot = mapHotspot(hotspot);
            const marker = document.createElement('div');
            marker.className = 'scanner-debug-hotspot';
            marker.dataset.categoryId = category.id;
            marker.dataset.hotspotId = hotspot.id;
            marker.style.setProperty('--hotspot-color', category.debugColor);
            Object.assign(marker.style, { left: `${spot.x}px`, top: `${spot.y}px`, width: `${spot.radius * 2}px`, height: `${spot.radius * 2}px` });
            const label = document.createElement('span');
            label.textContent = `${category.name} ${index + 1}/${category.hotspots.length}\n${hotspot.x}%, ${hotspot.y}% · r=${hotspot.radius}`;
            marker.title = hotspot.label;
            marker.hidden = Boolean(categoryFilter && categoryFilter !== category.id);
            if (spot.y + spot.radius + 40 > 1080) label.style.top = '0';
            if (spot.x < 130) label.style.transform = 'none';
            else if (spot.x > 1790) label.style.transform = 'translateX(-100%)';
            marker.append(label);
            debugLayer.append(marker);
          });
        });
        debugLayer.append(summary);
      }
      canvas.scannerState = { crewId, foundIds, foundOrder, discoveries, mapHotspot, toPhotoPoint, hitTest,
        get isComplete() { return foundIds.size === crew.categories.length; } };
      return {
        async start() {
          canvas.classList.add('scanner-loading-running');
          await wait(1800);
          canvas.querySelector('[role="progressbar"]').setAttribute('aria-valuenow', '100');
          game.hidden = false;
          game.style.opacity = '0';
          canvas.classList.remove('scanner-loading-active');
          enterTaggy();
          if (isTaggy) active = true; // Exploration works throughout the entrance sequence.
          const loading = canvas.querySelector('.scanner-loading');
          const fadeOut = loading.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 300, fill: 'forwards' });
          const fadeIn = game.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 300, fill: 'forwards' });
          await Promise.all([fadeIn.finished, fadeOut.finished]);
          loading.hidden = true;
          game.style.opacity = '1';
          fadeIn.cancel(); fadeOut.cancel();
          canvas.classList.remove('scanner-loading-running');
          active = true;
        },
      };
    },
  };
  const canvas = document.querySelector('.scanner-canvas');
  if (canvas) {
    const crewId = new URLSearchParams(location.search).get('crew') || canvas.dataset.crew;
    if (!config.crews[crewId]?.ready) {
      location.replace(`${config.crews[crewId] ? crewId : 'pigeon'}-mission-guide.html`);
      return;
    }
    window.CrewScanner.prepare(canvas, crewId).then(scanner => scanner.start()).catch(error => console.error(error));
  }
})();

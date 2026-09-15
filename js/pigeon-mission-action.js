(() => {
  const canvas = document.querySelector('.action-canvas');
  const timer = canvas.querySelector('.action-timer');
  const deadline = Date.now() + 30 * 60 * 1000;
  const checks = [...canvas.querySelectorAll('.checklist-box input')];
  const complete = canvas.querySelector('.complete-button');
  const completeImage = complete.querySelector('img');
  const count = complete.querySelector('.complete-count');
  const input = canvas.querySelector('#proof-files');
  const trigger = canvas.querySelector('.upload-trigger');
  const previews = [...canvas.querySelectorAll('.proof-preview')];
  const message = canvas.querySelector('.upload-message');
  const proofUrls = [];
  const assetRoot = 'assets/images/pigeon-mission-action/';
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let emphasis;
  let addingFiles = false;

  function fitCanvas() {
    canvas.style.setProperty('--canvas-scale', Math.min(innerWidth / 1920, innerHeight / 1080));
  }
  fitCanvas();
  window.addEventListener('resize', fitCanvas);

  function updateTimer() {
    const remaining = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
    timer.textContent = `${String(Math.floor(remaining / 60)).padStart(2, '0')}:${String(remaining % 60).padStart(2, '0')}`;
    timer.dateTime = `PT${remaining}S`;
    if (remaining === 0) clearInterval(timerInterval);
  }
  const timerInterval = setInterval(updateTimer, 250);
  updateTimer();
  document.addEventListener('visibilitychange', updateTimer);
  window.addEventListener('pageshow', updateTimer);

  // Load the alternate artwork before the first completed checklist.
  const activeArtwork = new Image();
  activeArtwork.src = `${assetRoot}pigeon-mission-action-complete-active.png`;
  function updateChecklist() {
    const checked = checks.filter((box) => box.checked).length;
    const wasDisabled = complete.disabled;
    complete.disabled = checked !== 3;
    count.textContent = `${checked}/3`;
    complete.setAttribute('aria-label', `COMPLETE CHECKLIST ${checked}/3`);
    completeImage.src = `${assetRoot}pigeon-mission-action-complete-${checked === 3 ? 'active' : 'disabled'}.png`;
    emphasis?.cancel();
    if (checked === 3 && wasDisabled && !reducedMotion) {
      emphasis = complete.animate([
        { transform: 'scale(1)' },
        { transform: 'scale(1.03)' },
        { transform: 'scale(1)' },
      ], { duration: 280, easing: 'ease-out' });
    }
  }
  checks.forEach((box) => box.addEventListener('change', updateChecklist));
  window.addEventListener('pageshow', updateChecklist);
  updateChecklist();
  complete.addEventListener('click', () => {
    if (checks.every((box) => box.checked)) window.location.assign('pigeon-mission-complete.html');
  });

  trigger.addEventListener('click', () => input.click());
  input.addEventListener('change', async () => {
    if (addingFiles) return;
    addingFiles = true;
    trigger.disabled = true;
    const files = [...input.files];
    input.value = '';
    for (const file of files) {
      if (proofUrls.length === 3) break;
      if (!file.type.startsWith('image/')) continue;
      const url = URL.createObjectURL(file);
      const image = new Image();
      image.src = url;
      try {
        await image.decode();
      } catch {
        URL.revokeObjectURL(url);
        continue;
      }
      image.className = 'proof-photo';
      image.alt = file.name;
      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'proof-remove';
      remove.textContent = '×';
      remove.setAttribute('aria-label', `${file.name} 삭제`);
      remove.addEventListener('click', () => {
        const index = proofUrls.indexOf(url);
        if (index === -1) return;
        proofUrls.splice(index, 1);
        URL.revokeObjectURL(url);
        image.remove();
        remove.remove();
        // Move each remaining photo and its button together; keep slot artwork intact.
        const remaining = previews.flatMap((preview) => {
          const photo = preview.querySelector('.proof-photo');
          return photo ? [[photo, preview.querySelector('.proof-remove')]] : [];
        });
        remaining.forEach(([photo, button], slot) => previews[slot].append(photo, button));
        trigger.disabled = addingFiles || proofUrls.length === 3;
        message.textContent = `인증 이미지 ${proofUrls.length}/3장 선택됨`;
        if (!addingFiles) trigger.focus({ preventScroll: true });
      });
      previews[proofUrls.length].append(image, remove);
      proofUrls.push(url);
    }
    addingFiles = false;
    trigger.disabled = proofUrls.length === 3;
    message.textContent = `인증 이미지 ${proofUrls.length}/3장 선택됨`;
  });
  window.addEventListener('pagehide', (event) => {
    if (!event.persisted) proofUrls.forEach((url) => URL.revokeObjectURL(url));
  });
})();

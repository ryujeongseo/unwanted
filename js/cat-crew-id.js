(() => {
  const canvas = document.querySelector('.id-canvas');
  const video = canvas.querySelector('.id-video');
  const photo = canvas.querySelector('.id-captured');
  const capture = canvas.querySelector('.id-capture');
  const next = canvas.querySelector('.id-next');
  const status = canvas.querySelector('.id-status');
  let stream;
  let generation = 0;
  let captured = false;
  let connecting = false;

  function fitCanvas() {
    canvas.style.setProperty('--canvas-scale', Math.min(innerWidth / 1920, innerHeight / 1080));
  }
  fitCanvas();
  window.addEventListener('resize', fitCanvas);

  function ready() {
    return stream?.getVideoTracks().some(track => track.readyState === 'live') && video.readyState >= 2 && video.videoWidth > 0;
  }
  function updateCapture() { capture.disabled = !captured && !ready(); }
  video.addEventListener('loadeddata', updateCapture);
  video.addEventListener('canplay', updateCapture);

  async function connectCamera() {
    const token = ++generation;
    connecting = true;
    capture.disabled = true;
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error('Camera unavailable');
      const incoming = await navigator.mediaDevices.getUserMedia({ audio: false, video: { facingMode: { ideal: 'user' } } });
      if (token !== generation) {
        incoming.getTracks().forEach(track => track.stop());
        return;
      }
      stream = incoming;
      stream.getVideoTracks().forEach(track => track.addEventListener('ended', () => {
        updateCapture();
        status.textContent = '카메라 연결이 종료되었습니다.';
      }));
      video.srcObject = stream;
      await video.play();
      if (token !== generation) return;
      updateCapture();
      status.textContent = '카메라가 준비되었습니다.';
    } catch {
      if (token !== generation) return;
      stream?.getTracks().forEach(track => track.stop());
      stream = null;
      video.srcObject = null;
      capture.disabled = !captured;
      status.textContent = '카메라를 사용할 수 없습니다.';
    } finally {
      if (token === generation) connecting = false;
    }
  }

  capture.addEventListener('click', async () => {
    if (captured) {
      captured = false;
      next.disabled = true;
      photo.hidden = true;
      photo.removeAttribute('src');
      video.hidden = false;
      capture.setAttribute('aria-label', '사진 촬영');
      status.textContent = '다시 촬영할 수 있습니다.';
      updateCapture();
      if (!ready() && !connecting) await connectCamera();
      return;
    }
    if (!ready()) return;
    const shot = document.createElement('canvas');
    // Match object-fit: cover's centered square crop, then bake the preview mirror in.
    const side = Math.min(video.videoWidth, video.videoHeight);
    shot.width = shot.height = side;
    const context = shot.getContext('2d');
    if (!context) return;
    try {
      context.translate(side, 0);
      context.scale(-1, 1);
      context.drawImage(video, (video.videoWidth - side) / 2, (video.videoHeight - side) / 2, side, side, 0, 0, side, side);
      photo.src = shot.toDataURL('image/png');
      photo.hidden = false;
      video.hidden = true;
      captured = true;
      next.disabled = false;
      capture.setAttribute('aria-label', '다시 촬영하기: 카메라 미리보기로 돌아가기');
      status.textContent = '촬영되었습니다.';
    } catch { status.textContent = '촬영하지 못했습니다. 다시 시도해 주세요.'; }
  });
  next.addEventListener('click', async () => {
    if (!captured || next.disabled || !photo.src) return;
    // Open during the click gesture so async PNG encoding does not trigger popup blocking.
    const result = window.open('', '_blank');
    if (!result) {
      status.textContent = '결과 창을 열 수 없습니다. 팝업 허용 후 다시 시도해 주세요.';
      return;
    }
    result.opener = null;
    const filename = 'UNWANTED-CAT-CREW-ID.png';
    result.document.title = filename;
    const snapshot = new Image();
    snapshot.src = photo.src; // Keep this capture even if the user retakes while encoding.
    const frame = canvas.querySelector('.id-card');
    try {
      await Promise.all([snapshot.decode(), frame.decode()]);
      const output = document.createElement('canvas');
      output.width = frame.naturalWidth;
      output.height = frame.naturalHeight;
      const context = output.getContext('2d');
      if (!context) throw new Error('Canvas unavailable');

      // Account for the frame's object-fit: contain and the page's exhibition scaling.
      // Measure the original layout for PNG output; presentation rotation is screen-only.
      const presentation = frame.closest('.id-card-presentation');
      presentation.style.rotate = 'none';
      const bounds = frame.getBoundingClientRect();
      const area = canvas.querySelector('.id-camera-area').getBoundingClientRect();
      presentation.style.removeProperty('rotate');
      const fit = Math.min(bounds.width / output.width, bounds.height / output.height);
      const frameLeft = bounds.left + (bounds.width - output.width * fit) / 2;
      const frameTop = bounds.top + (bounds.height - output.height * fit) / 2;
      const x = (area.left - frameLeft) / fit;
      const y = (area.top - frameTop) / fit;
      const width = area.width / fit;
      const height = area.height / fit;
      const cover = Math.max(width / snapshot.naturalWidth, height / snapshot.naturalHeight);
      const cropWidth = width / cover;
      const cropHeight = height / cover;
      // Capture already contains the mirror; do not flip it a second time.
      context.drawImage(snapshot,
        (snapshot.naturalWidth - cropWidth) / 2, (snapshot.naturalHeight - cropHeight) / 2,
        cropWidth, cropHeight, x, y, width, height);
      context.drawImage(frame, 0, 0, output.width, output.height);
      const blob = await new Promise(resolve => output.toBlob(resolve, 'image/png'));
      if (!blob) throw new Error('PNG encoding failed');
      if (result.closed) return;

      // The result window owns the URL so leaving the camera page does not invalidate it.
      const url = result.URL.createObjectURL(blob);
      const link = result.document.createElement('a');
      link.href = url;
      link.download = filename;
      link.title = filename + ' 저장';
      const image = result.document.createElement('img');
      image.src = url;
      image.alt = filename;
      image.style.cssText = `display:block;width:auto;height:auto;max-width:min(70vw, ${output.width * 0.7}px);max-height:70vh;object-fit:contain`;
      link.append(image);
      result.document.body.style.cssText = 'margin:0;height:100vh;display:flex;align-items:center;justify-content:center;background:#111';
      result.document.body.replaceChildren(link);
      result.addEventListener('pagehide', event => {
        if (!event.persisted) result.URL.revokeObjectURL(url);
      });
      status.textContent = '완성된 Crew ID를 새 창에 열었습니다. 이미지를 클릭하면 PNG로 저장됩니다.';
    } catch {
      if (!result.closed) result.close();
      status.textContent = 'Crew ID 이미지를 만들지 못했습니다. 다시 시도해 주세요.';
    }
  });

  async function stampTitle() {
    const title = canvas.querySelector('.id-title');
    await title.decode().catch(() => {});
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
      title.style.opacity = '1';
      return;
    }
    const animation = title.animate([
      { offset: 0, opacity: 0, transform: 'translateX(0) scale(1.06) rotate(-1deg)' },
      { offset: 0.4, opacity: 1, transform: 'translateX(0) scale(0.99) rotate(0.3deg)' },
      { offset: 0.62, opacity: 1, transform: 'translateX(0) scale(1) rotate(0deg)' },
      { offset: 0.7, opacity: 1, transform: 'translateX(-2px) scale(1) rotate(0deg)' },
      { offset: 0.78, opacity: 1, transform: 'translateX(2px) scale(1) rotate(0deg)' },
      { offset: 0.86, opacity: 1, transform: 'translateX(0) scale(1) rotate(0deg)' },
      { offset: 1, opacity: 1, transform: 'translateX(0) scale(1) rotate(0deg)' },
    ], { duration: 450, easing: 'ease-out', fill: 'both' });
    await animation.finished;
    title.style.opacity = '1';
    animation.cancel();
  }
  window.addEventListener('pagehide', () => {
    generation++;
    connecting = false;
    stream?.getTracks().forEach(track => track.stop());
    stream = null;
    video.srcObject = null;
  });
  window.addEventListener('pageshow', event => {
    if (event.persisted && !captured) connectCamera();
  });
  stampTitle();
  connectCamera();
})();

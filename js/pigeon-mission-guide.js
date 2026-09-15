(() => {
  const canvas = document.querySelector(".guide-canvas");
  const stages = [...canvas.querySelectorAll(".guide-stage")];
  const start = canvas.querySelector(".guide-start");

  function fitCanvas() {
    canvas.style.setProperty("--canvas-scale", Math.min(innerWidth / 1920, innerHeight / 1080));
  }
  fitCanvas();
  window.addEventListener("resize", fitCanvas);

  function animateValues(stage) {
    const counts = [...stage.querySelectorAll("[data-count]")];
    const fills = [...stage.querySelectorAll(".guide-fill")];
    if (!counts.length && !fills.length) return;
    let began;
    function update(now) {
      if (began === undefined) began = now;
      const progress = Math.max(0, Math.min((now - began) / 800, 1));
      const eased = 1 - Math.pow(1 - progress, 3);
      counts.forEach((count) => { count.textContent = String(Math.round(Number(count.dataset.count) * eased)); });
      fills.forEach((fill) => { fill.style.transform = `scaleX(${eased})`; });
      if (progress < 1) requestAnimationFrame(update);
    }
    requestAnimationFrame(update);
  }

  async function enterPage() {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    stages.forEach((stage) => { stage.style.opacity = "0"; });
    canvas.querySelectorAll("[data-count]").forEach((count) => { count.textContent = "0"; });
    canvas.querySelectorAll(".guide-fill").forEach((fill) => { fill.style.transform = "scaleX(0)"; });
    start.inert = true;
    await Promise.allSettled([
      document.fonts.load('40px "ATP Tobeloved"'),
      ...[...canvas.querySelectorAll("img")].map((img) => img.decode()),
    ]);
    for (const stage of stages) {
      const entrance = stage.animate([
        { opacity: 0, transform: "translateY(8px)" },
        { opacity: 1, transform: "translateY(0)" },
      ], { duration: 350, easing: "ease-out", fill: "both" });
      await entrance.finished;
      stage.style.opacity = "1";
      entrance.cancel();
      animateValues(stage);
    }
    start.inert = false;
  }

  enterPage();
})();

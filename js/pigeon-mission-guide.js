(() => {
  const canvas = document.querySelector(".guide-canvas");
  const stages = [...canvas.querySelectorAll(".guide-stage")];
  const start = canvas.querySelector(".guide-start");

  function fitCanvas() {
    canvas.style.setProperty("--canvas-scale", Math.min(innerWidth / 1920, innerHeight / 1080));
  }
  fitCanvas();
  window.addEventListener("resize", fitCanvas);

  const objective = canvas.querySelector(".objective-values");
  const target = Number(objective.dataset.target);
  const current = Number(objective.dataset.current);
  const ratio = target > 0 ? Math.max(0, Math.min(current / target, 1)) : 0;
  function updateObjective(eased) {
    objective.querySelector(".objective-target").textContent = Math.round(target * eased);
    objective.querySelector(".objective-count").textContent = Math.round(current * eased);
    objective.querySelector(".objective-percent").textContent = `${Math.floor(ratio * 100 * eased)}%`;
    objective.querySelector(".objective-remaining").textContent = Math.round(target - current * eased);
    const fill = objective.querySelector(".objective-fill");
    const badge = objective.querySelector(".objective-percent-label");
    const track = objective.querySelector(".objective-track");
    fill.style.transform = `scaleX(${ratio * eased})`;
    const endpoint = fill.offsetLeft + parseFloat(getComputedStyle(fill).width) * ratio * eased;
    const badgeWidth = parseFloat(getComputedStyle(badge).width);
    badge.style.left = `${Math.max(0, Math.min(endpoint - badgeWidth / 2, parseFloat(getComputedStyle(track).width) - badgeWidth))}px`;
    track.setAttribute("aria-valuenow", String(ratio * 100 * eased));
  }
  updateObjective(1);

  function animateValues(stage) {
    const counts = [...stage.querySelectorAll("[data-count]")];
    const fills = [...stage.querySelectorAll(".guide-fill")];
    const hasObjective = stage.contains(objective);
    if (!counts.length && !fills.length && !hasObjective) return;
    let began;
    function update(now) {
      if (began === undefined) began = now;
      const progress = Math.max(0, Math.min((now - began) / 800, 1));
      const eased = 1 - Math.pow(1 - progress, 3);
      if (hasObjective) updateObjective(eased);
      counts.forEach((count) => { count.textContent = String(Math.round(Number(count.dataset.count) * eased)); });
      fills.forEach((fill) => { fill.style.transform = `scaleX(${eased})`; });
      if (progress < 1) requestAnimationFrame(update);
    }
    requestAnimationFrame(update);
  }

  async function enterPage() {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    updateObjective(0);
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

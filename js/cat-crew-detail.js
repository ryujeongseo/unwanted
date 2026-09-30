(() => {
  const canvas = document.querySelector(".detail-canvas");
  const count = canvas.querySelector(".recovery-count");
  const fill = canvas.querySelector(".recovery-fill");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function fitCanvas() {
    canvas.style.setProperty("--canvas-scale", Math.min(innerWidth / 1920, innerHeight / 1080));
  }
  fitCanvas();
  window.addEventListener("resize", fitCanvas);

  async function enterPage() {
    if (reducedMotion) return;
    const entrances = [...canvas.querySelectorAll(".detail-entrance")];
    entrances.forEach((element) => { element.style.opacity = "0"; });
    const join = canvas.querySelector(".detail-join");
    join.inert = true;
    count.textContent = "0";
    fill.style.transform = "scaleX(0)";
    await Promise.all([
      document.fonts.load('58.84px "ATP Tobeloved"'),
      ...[...canvas.querySelectorAll("img")].map((img) => img.decode().catch(() => {})),
    ]);

    const order = [".detail-character", ".detail-crew-file", ".detail-mission", ".detail-reward", ".detail-recovery", ".detail-join"];
    for (const selector of order) {
      const element = canvas.querySelector(selector);
      const entrance = element.animate([
        { opacity: 0, transform: "translateY(8px)" },
        { opacity: 1, transform: "translateY(0)" },
      ], { duration: 350, easing: "ease-out", fill: "both" });
      await entrance.finished;
      element.style.opacity = "1";
      entrance.cancel();
      if (selector === ".detail-recovery") animateRecovery();
    }
    join.inert = false;
  }

  function animateRecovery() {
    let start;
    function update(now) {
      if (start === undefined) start = now;
      const progress = Math.max(0, Math.min((now - start) / 1200, 1));
      const eased = 1 - Math.pow(1 - progress, 3);
      count.textContent = String(Math.round(42 * eased));
      fill.style.transform = `scaleX(${eased})`;
      if (progress < 1) requestAnimationFrame(update);
    }
    requestAnimationFrame(update);
  }

  enterPage();
})();

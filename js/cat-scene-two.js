(() => {
  const scene = document.querySelector(".scene-two");
  const copy = scene.querySelector(".scene-two-copy");
  const next = scene.querySelector(".scene-two-next");
  const character = scene.querySelector(".scene-two-character");
  const box = scene.querySelector(".scene-two-box");
  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  let state = "scene-one";
  const sceneThreeLines = ["밤이 되면", "낮에는 안 보이던 것들이 보여."];

  function reactToDialogue() {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    // Individual transform properties leave the entrance transform untouched.
    character.animate([
      { translate: "0 0", rotate: "0deg" },
      { translate: "3px 0", rotate: "0.4deg" },
      { translate: "-1px 0", rotate: "-0.15deg" },
      { translate: "0 0", rotate: "0deg" },
    ], { duration: 400, easing: "ease-in-out", fill: "none", iterations: 1 });
  }

  function showNext() {
    next.hidden = false;
  }

  async function enterSceneThree() {
    state = "scene-three-entering";
    next.hidden = true;
    const fadeOuts = [character, box].map((element) =>
      element.animate([{ opacity: 1 }, { opacity: 0 }], {
        duration: 200,
        easing: "ease-out",
        fill: "forwards",
      }),
    );
    await Promise.all(fadeOuts.map((animation) => animation.finished));
    copy.replaceChildren();
    character.src =
      "assets/images/cat-dialogue-01/cat-scene-03-character.png";
    const dialogueImage = box.querySelector("img");
    dialogueImage.src =
      "assets/images/cat-dialogue-01/cat-scene-01-dialogue.png";
    // A failed image must not leave Scene 3 trapped behind the fade-out.
    await Promise.allSettled([character.decode(), dialogueImage.decode()]);
    scene.setAttribute("aria-label", "DASH Scene 3");
    character.style.opacity = "0";
    box.style.opacity = "0";
    fadeOuts.forEach((animation) => animation.cancel());
    await revealScene();
    state = "scene-three-typing";
    await typeLines(sceneThreeLines);
    state = "scene-three-complete";
    showNext();
  }

  async function revealScene() {
    // Clear the previous entrance fills so the character stays hidden during the box fade.
    character.getAnimations().forEach((animation) => animation.cancel());
    box.getAnimations().forEach((animation) => animation.cancel());
    character.style.opacity = "0";
    box.style.opacity = "0";
    await box.animate([{ opacity: 0 }, { opacity: 1 }], {
      duration: 400,
      easing: "ease-out",
      fill: "forwards",
    }).finished;
    await character.animate(
      [
        { opacity: 0, transform: "translateY(10px)" },
        { opacity: 1, transform: "translateY(0)" },
      ],
      { duration: 500, easing: "ease-out", fill: "forwards" },
    ).finished;
  }

  async function typeLines(lines) {
    copy.replaceChildren();
    copy.setAttribute("aria-label", lines.join(" "));
    const letters = [];
    for (const line of lines) {
      const paragraph = document.createElement("p");
      paragraph.setAttribute("aria-hidden", "true");
      for (const letter of Array.from(line)) {
        const span = document.createElement("span");
        span.textContent = letter;
        span.style.opacity = "0";
        paragraph.append(span);
        letters.push(span);
      }
      copy.append(paragraph);
    }
    for (let i = 0; i < letters.length; i++) {
      if (i) await wait(40);
      letters[i].style.opacity = "1";
    }
  }

  async function enterSceneTwo() {
    if (state !== "scene-one") return;
    state = "entering";
    canvas.classList.add("show-scene-two");
    scene.hidden = false;
    // Reuse Scene 1's typography without altering its timing or styles.
    const typography = getComputedStyle(
      document.querySelector(".dialogue-copy"),
    );
    for (const property of [
      "font-family",
      "font-size",
      "font-weight",
      "line-height",
      "color",
    ]) {
      copy.style.setProperty(property, typography.getPropertyValue(property));
    }
    await revealScene();
    await typeLines([
      "뭐, 상관없어. 네가 잠든 뒤에도",
      "난 매일 이 골목을 돌아.",
    ]);
    state = "first-complete";
    showNext();
  }

  document
    .querySelector(".dialogue-next")
    .addEventListener("click", enterSceneTwo);
  document.querySelectorAll(".choice-entrance .choice").forEach((choice) => {
    choice.addEventListener("click", enterSceneTwo);
  });
  next.addEventListener("click", async () => {
    if (state === "scene-three-complete") {
      state = "scene-three-second-typing";
      next.hidden = true;
      const fade = copy.animate([{ opacity: 1 }, { opacity: 0 }], {
        duration: 180,
        easing: "ease-out",
        fill: "forwards",
      });
      await fade.finished;
      copy.replaceChildren();
      fade.cancel();
      reactToDialogue();
      await typeLines(["네가 지나쳤던 도시,", "내가 다니는 길로 한번 볼래?"]);
      state = "scene-three-detail";
      const detail = scene.querySelector(".scene-three-choice-entrance");
      detail.inert = true;
      detail.hidden = false;
      await detail.animate([
        { opacity: 0, transform: "scale(0.96)" },
        { opacity: 1, transform: "scale(1)" },
      ], { duration: 300, easing: "ease-out", fill: "both" }).finished;
      detail.inert = false;
      return;
    }
    if (state === "second-complete") {
      await enterSceneThree();
      return;
    }
    if (state !== "first-complete") return;
    state = "second-typing";
    next.hidden = true;
    const fade = copy.animate([{ opacity: 1 }, { opacity: 0 }], {
      duration: 180,
      easing: "ease-out",
      fill: "forwards",
    });
    await fade.finished;
    copy.replaceChildren();
    fade.cancel();
    reactToDialogue();
    await typeLines(["너한텐 그냥 길이지만,", "누군가한텐 삶의 터전이거든."]);
    state = "second-complete";
    showNext();
  });
})();

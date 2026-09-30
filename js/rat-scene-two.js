(() => {
  const scene = document.querySelector(".scene-two");
  const copy = scene.querySelector(".scene-two-copy");
  const next = scene.querySelector(".scene-two-next");
  const character = scene.querySelector(".scene-two-character");
  const box = scene.querySelector(".scene-two-box");
  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  let state = "scene-one";
  const sceneThreeLines = [
    "난 사람들이 버리고 간 걸 봐.",
    "아무도 신경 쓰지 않는 골목의 흔적까지.",
  ];

  function reactToDialogue() {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    // Individual transform properties leave the entrance transform untouched.
    character.animate([
      { translate: "0 0" },
      { translate: "0 -4px" },
      { translate: "0 1px" },
      { translate: "0 0" },
    ], { duration: 350, easing: "ease-in-out", fill: "none", iterations: 1 });
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
    character.src = "assets/images/rat-dialogue-01/rat-scene-03-character.png";
    const dialogueImage = box.querySelector("img");
    dialogueImage.src =
      "assets/images/rat-dialogue-01/rat-scene-01-dialogue.png";
    await Promise.all([character.decode(), dialogueImage.decode()]);
    scene.setAttribute("aria-label", "BEAT Scene 3");
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
    await typeLines(["이게 쌓이면", "결국 우리 같은 애들이 모여."]);
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
      await typeLines(["이번엔 그냥 지나치지 말자."]);
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
    await typeLines(["근데 이상하지?", "나중엔 우리가 문제래."]);
    state = "second-complete";
    showNext();
  });
})();

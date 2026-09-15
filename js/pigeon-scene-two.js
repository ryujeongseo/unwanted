(() => {
  const scene = document.querySelector(".scene-two");
  const copy = scene.querySelector(".scene-two-copy");
  const next = scene.querySelector(".scene-two-next");
  const character = scene.querySelector(".scene-two-character");
  const box = scene.querySelector(".scene-two-box");
  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  let state = "scene-one";
  const sceneThreeLines = [
    "사람들은 보고 싶은 것만 봐.",
    "그래서 난 사람들이 지나친",
    "도시의 흔적을 기록해.",
  ];

  function showNext() {
    const lastLine = copy.lastElementChild;
    lastLine.removeAttribute("aria-hidden");
    lastLine.append(next);
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
      "assets/images/pigeon-dialogue-01/pigeon-scene-03-character.png";
    const dialogueImage = box.querySelector("img");
    dialogueImage.src =
      "assets/images/pigeon-dialogue-01/pigeon-scene-03-dialogue.png";
    await Promise.all([character.decode(), dialogueImage.decode()]);
    scene.setAttribute("aria-label", "TAGGY Scene 3");
    const fadeIns = [character, box].map((element) =>
      element.animate([{ opacity: 0 }, { opacity: 1 }], {
        duration: 350,
        easing: "ease-out",
        fill: "forwards",
      }),
    );
    fadeOuts.forEach((animation) => animation.cancel());
    await Promise.all(fadeIns.map((animation) => animation.finished));
    state = "scene-three-typing";
    await typeLines(sceneThreeLines);
    state = "scene-three-complete";
    showNext();
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
    await Promise.all(
      [character, box].map(
        (element) =>
          element.animate(
            [
              { opacity: 0, transform: "translateY(8px)" },
              { opacity: 1, transform: "translateY(0)" },
            ],
            { duration: 350, easing: "ease-out", fill: "both" },
          ).finished,
      ),
    );
    await typeLines(["근데 웃긴 건 알아?", "우리가 원래 여기 온 게 아니야."]);
    state = "first-complete";
    showNext();
  }

  document.querySelectorAll(".choice").forEach((choice) => {
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
      await typeLines([
        "UNWANTED는",
        "그런 존재들의 진짜 역할을",
        "다시 보여주는 크루야.",
      ]);
      state = "scene-three-detail";
      const detail = scene.querySelector(".scene-three-choice-entrance");
      detail.inert = true;
      detail.hidden = false;
      await detail.animate(
        [
          { opacity: 0, transform: "translateY(8px)" },
          { opacity: 1, transform: "translateY(0)" },
        ],
        { duration: 350, easing: "ease-out", fill: "both" },
      ).finished;
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
    await typeLines(["인간이 데려왔고,", "인간이 만든 도시에 남은 거지."]);
    state = "second-complete";
    showNext();
  });
})();

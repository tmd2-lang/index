/* The cards rise in order and fan out as the stack enters view. */
const problemMotion = matchMedia("(prefers-reduced-motion: no-preference)");
const problemDesktop = matchMedia("(min-width: 761px) and (min-height: 540px)");
const problemCards = document.querySelector(".problem__cards");
const problemSection = problemCards.closest(".problem");
const snapshots = [...problemCards.children];
let problemFrame = 0;

const clampProgress = (value) => Math.max(0, Math.min(1, value));

function drawDesktopScene() {
  const { top, height } = problemSection.getBoundingClientRect();
  const stageHeight = problemCards.parentElement.offsetHeight;
  const progress = clampProgress(-top / (height - stageHeight));
  problemSection.style.setProperty("--intro-opacity", 1 - clampProgress((progress - 0.28) / 0.2));
  const handoff = clampProgress((progress - 0.84) / 0.12);
  problemSection.style.setProperty("--handoff-opacity", handoff > 0 ? 1 : 0);
  problemSection.style.setProperty("--text-wipe", `${handoff * 120}%`);

  snapshots.forEach((card, index) => {
    const entry = clampProgress((progress - 0.07 - index * 0.059) / 0.29);
    const exit = clampProgress((progress - 0.49 - index * 0.056) / 0.24);
    const remaining = (1 - entry) ** 2;
    const fromCenter = index - (snapshots.length - 1) / 2;
    const rise = stageHeight * (0.82 * remaining - 0.85 * exit ** 2);
    card.style.setProperty("--x", `${fromCenter * (-69 * remaining + 34 * exit)}px`);
    card.style.setProperty("--y", `${rise}px`);
    card.style.setProperty("--angle", `${fromCenter * (-13 * remaining + 9 * exit)}deg`);
    card.style.setProperty("--visibility", entry > 0 ? 1 : 0);
  });
}

function drawProblemCards() {
  problemFrame = 0;
  const desktop = problemMotion.matches && problemDesktop.matches;
  problemSection.classList.toggle("is-animated", desktop);
  if (!problemMotion.matches) {
    for (const card of snapshots) {
      card.style.removeProperty("--x");
      card.style.removeProperty("--y");
      card.style.removeProperty("--angle");
      card.style.removeProperty("--visibility");
    }
    return;
  }

  if (desktop) {
    drawDesktopScene();
    return;
  }

  const { top, width } = problemCards.getBoundingClientRect();
  const distance = innerHeight - top;
  const travel = 110;
  const stagger = 32;

  snapshots.forEach((card, index) => {
    const rowOffset = Math.floor(index / 2) * card.offsetHeight * 0.68;
    const step = Math.max(0, Math.min(1, (distance - rowOffset - index * stagger) / travel));
    const remaining = (1 - step) ** 2;
    const centerOffset = index - (snapshots.length - 1) / 2;

    card.style.setProperty("--x", `${-centerOffset * width * 0.05 * remaining}px`);
    card.style.setProperty("--y", `${100 * remaining}px`);
    card.style.setProperty("--angle", `${-centerOffset * 11 * remaining}deg`);
    card.style.setProperty("--visibility", Math.min(1, step * 4));
  });
}

function queueProblemFrame() {
  if (!problemFrame) {
    problemFrame = requestAnimationFrame(drawProblemCards);
  }
}

addEventListener("scroll", queueProblemFrame, { passive: true });
addEventListener("resize", queueProblemFrame);
problemMotion.addEventListener("change", queueProblemFrame);
drawProblemCards();

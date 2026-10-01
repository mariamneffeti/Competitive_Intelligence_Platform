const samples = {
  high: {
    company: "Northstar",
    headline: "Northstar launches a new analytics tier",
    confidence: 0.93,
    category: "Product launch",
    severity: "Medium",
    summary: "A new analytics tier may expand Northstar's offering for larger customers.",
  },
  mid: {
    company: "Pioneer",
    headline: "Pioneer hires a VP of enterprise sales",
    confidence: 0.80,
    category: "Hiring signal",
    severity: "Moderate",
    summary: "The senior sales hire may signal investment in enterprise growth, but does not confirm a broader strategy on its own.",
  },
  low: {
    company: "Meridian",
    headline: "Meridian announces a regional partnership",
    confidence: 0.68,
    category: "Partnership",
    severity: "Needs review",
    summary: "The announcement is brief; the market impact and partnership scope are unclear.",
  },
};

const runButton = document.querySelector("#run-demo");
const runLabel = document.querySelector("#run-label");
const selector = document.querySelector("#signal-select");
const thresholdInput = document.querySelector("#threshold-input");
const thresholdValue = document.querySelector("#threshold-value");
const gateCaption = document.querySelector("#gate-caption");
const tier2State = document.querySelector("#tier2-state");
const result = document.querySelector("#demo-result");
const steps = [...document.querySelectorAll(".pipe-step")];
const branchTrack = document.querySelector(".branch-track");

function currentThreshold() {
  return Number(thresholdInput.value);
}

function updateThreshold() {
  const threshold = currentThreshold().toFixed(2);
  thresholdValue.textContent = threshold;
  gateCaption.textContent = `threshold ${threshold}`;
}

function renderSample(sample, threshold) {
  const escalated = sample.confidence < threshold;
  const premiumCalls = escalated ? "Tier 2 is called for this sample." : "No Tier 2 call is made for this sample.";
  const tradeoff = escalated
    ? "Raising the threshold sends more borderline signals for deeper review, which can preserve nuance but uses more premium analysis."
    : "Lowering the threshold accepts more Tier 1 results, reducing premium calls while increasing the chance that a subtle signal is missed.";
  const route = escalated ? "Escalated to Tier 2" : "Accepted by Tier 1";
  result.innerHTML = `<div class="result-symbol">${escalated ? "↗" : "✓"}</div>
    <div><p class="eyebrow">${sample.company.toUpperCase()} · ${sample.category.toUpperCase()} · ${sample.severity.toUpperCase()}</p>
    <h3>${sample.headline}</h3><p><strong>Tier 1 confidence: ${sample.confidence.toFixed(2)}</strong> · Policy threshold: ${threshold.toFixed(2)}. ${premiumCalls} ${tradeoff}</p></div>
    <span class="result-badge ${escalated ? "escalate" : "accept"}">${route.toUpperCase()}</span>`;
  branchTrack.classList.toggle("is-escalated", escalated);
  branchTrack.classList.toggle("is-accepted", !escalated);
  tier2State.textContent = escalated ? "ran · deeper review" : "skipped · accepted at Tier 1";
  tier2State.classList.toggle("state-skipped", !escalated);
}

thresholdInput.addEventListener("input", updateThreshold);
updateThreshold();

runButton.addEventListener("click", () => {
  runButton.disabled = true;
  runLabel.textContent = "Running sample…";
  branchTrack.classList.remove("is-escalated", "is-accepted");
  tier2State.textContent = "waiting for gate";
  tier2State.classList.remove("state-skipped");
  steps.forEach((step) => step.classList.remove("active", "done", "skipped"));
  let index = 0;
  const sample = samples[selector.value];
  const threshold = currentThreshold();
  const escalated = sample.confidence < threshold;
  const runOrder = escalated ? [0, 1, 2, 3, 4, 5] : [0, 1, 2, 3, 5];
  steps[runOrder[index]].classList.add("active");

  const timer = window.setInterval(() => {
    const completedStep = runOrder[index];
    steps[completedStep].classList.remove("active");
    steps[completedStep].classList.add("done");
    if (completedStep === 3) {
      if (escalated) {
        tier2State.textContent = "running · deeper review";
      } else {
        steps[4].classList.add("skipped");
        tier2State.textContent = "skipped · accepted at Tier 1";
        tier2State.classList.add("state-skipped");
      }
    }
    index += 1;
    if (index === runOrder.length) {
      window.clearInterval(timer);
      renderSample(sample, threshold);
      runButton.disabled = false;
      runLabel.textContent = "Run sample flow";
      return;
    }
    steps[runOrder[index]].classList.add("active");
  }, 320);
});

document.querySelector("#year").textContent = new Date().getFullYear();

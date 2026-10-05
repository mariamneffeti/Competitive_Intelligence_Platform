const samples = {
  high: { company: "Northstar", headline: "Northstar launches a new analytics tier", confidence: 0.93, category: "Product launch", severity: "Medium", summary: "A new analytics tier may expand Northstar's offering for larger customers." },
  mid: { company: "Pioneer", headline: "Pioneer hires a VP of enterprise sales", confidence: 0.80, category: "Hiring signal", severity: "Moderate", summary: "The senior sales hire may signal investment in enterprise growth, but does not confirm a broader strategy on its own." },
  low: { company: "Meridian", headline: "Meridian announces a regional partnership", confidence: 0.68, category: "Partnership", severity: "Needs review", summary: "The announcement is brief; the market impact and partnership scope are unclear." },
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
const API_URL = (document.querySelector('meta[name="demo-api-url"]')?.content || "/api/run").trim();

function currentThreshold() { return Number(thresholdInput.value); }

function updateThreshold() {
  const threshold = currentThreshold().toFixed(2);
  thresholdValue.textContent = threshold;
  gateCaption.textContent = `threshold ${threshold}`;
}

function setSteps(route) {
  const escalated = route === "escalated";
  const order = escalated ? [0, 1, 2, 3, 4, 5] : [0, 1, 2, 3, 5];
  steps.forEach((step) => step.classList.remove("active", "done", "skipped"));
  order.forEach((index) => steps[index].classList.add("done"));
  if (!escalated) steps[4].classList.add("skipped");
  branchTrack.classList.toggle("is-escalated", escalated);
  branchTrack.classList.toggle("is-accepted", !escalated);
  tier2State.textContent = escalated ? "ran · deeper review" : "skipped · accepted at Tier 1";
  tier2State.classList.toggle("state-skipped", !escalated);
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
}

function unwrapResponse(payload) {
  // n8n webhook responses can be returned directly or inside an item/body wrapper.
  let value = payload;
  for (let depth = 0; depth < 4; depth += 1) {
    if (Array.isArray(value)) value = value[0];
    if (value && typeof value === "object" && value.json && typeof value.json === "object") value = value.json;
    else if (value && typeof value === "object" && value.body && typeof value.body === "object") value = value.body;
    else break;
  }
  return value;
}

function renderResult(payload, sample, threshold, source, fallbackMessage = "") {
  const signal = payload.signal || {};
  const tier1 = payload.tier1 || payload.analysis || {};
  const confidence = Number(payload.confidence ?? tier1.confidence);
  const selectedThreshold = Number(payload.threshold ?? threshold);
  const route = payload.route === "accepted" ? "accepted" : payload.route === "escalated" ? "escalated" : (confidence < selectedThreshold ? "escalated" : "accepted");
  const escalated = route === "escalated";
  const headline = signal.title || signal.headline || payload.headline || sample.headline;
  const company = signal.company || payload.company || sample.company;
  const category = tier1.category || payload.category || sample.category;
  const severity = tier1.severity || payload.severity || sample.severity;
  const summary = tier1.summary || payload.summary || sample.summary;
  const tier2 = payload.tier2 || {};
  const tier2Summary = tier2.summary ? `<p class="live-summary"><strong>Deeper review:</strong> ${escapeHtml(tier2.summary)}</p>` : "";
  const runId = payload.run_id || payload.request_id;
  const mode = source === "fallback" ? "LOCAL FALLBACK" : payload.mode === "mock" ? "API MOCK" : "LIVE n8n";
  const fallbackNote = source === "fallback" ? `<p class="fallback-note">Backend unavailable; showing local mock data. ${escapeHtml(fallbackMessage)}</p>` : "";
  const symbol = escalated ? "↗" : "✓";
  result.innerHTML = `<div class="result-symbol">${symbol}</div>
    <div><p class="eyebrow">${escapeHtml(company.toUpperCase())} · ${escapeHtml(String(category).toUpperCase())} · ${escapeHtml(String(severity).toUpperCase())}</p>
    <h3>${escapeHtml(headline)}</h3><p><strong>Tier 1 confidence: ${confidence.toFixed(2)}</strong> · Policy threshold: ${selectedThreshold.toFixed(2)}. ${escalated ? "Escalated for deeper review." : "Accepted by Tier 1."} ${escapeHtml(summary)}</p>${tier2Summary}${fallbackNote}${runId ? `<p class="run-id">Run ID: ${escapeHtml(runId)}</p>` : ""}</div>
    <span class="result-badge ${escalated ? "escalate" : "accept"}">${mode} · ${escalated ? "ESCALATED" : "ACCEPTED"}</span>`;
  setSteps(route);
}

async function runDemo() {
  runButton.disabled = true;
  runLabel.textContent = "Running live demo…";
  branchTrack.classList.remove("is-escalated", "is-accepted");
  tier2State.textContent = "waiting for result";
  tier2State.classList.remove("state-skipped");
  steps.forEach((step) => step.classList.remove("active", "done", "skipped"));
  steps[0].classList.add("active");
  const sampleId = selector.value;
  const sample = samples[sampleId];
  const threshold = currentThreshold();

  if (!API_URL) {
    renderResult({ ...sample, route: sample.confidence < threshold ? "escalated" : "accepted", threshold }, sample, threshold, "fallback", "Set the demo-api-url value in index.html.");
    runButton.disabled = false;
    runLabel.textContent = "Run demo";
    return;
  }

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ sample_id: sampleId, threshold }),
      signal: AbortSignal.timeout(65000),
    });
    if (!response.ok) throw new Error(`Demo API returned ${response.status}`);
    const rawPayload = await response.json();
    const payload = unwrapResponse(rawPayload);
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) throw new Error("Backend response was not a result object");
    if (!Number.isFinite(Number(payload.confidence ?? payload.tier1?.confidence))) throw new Error("Backend response is missing Tier 1 confidence");
    if (!["accepted", "escalated"].includes(payload.route)) throw new Error("Backend response is missing a valid route");
    renderResult(payload, sample, threshold, "api");
  } catch (error) {
    // Local fixtures are only used when the backend cannot return a usable result.
    const fallbackError = error.name === "AbortError" || error.name === "TimeoutError"
      ? "The request timed out."
      : error.message === "Failed to fetch"
        ? "Check the API URL, CORS origin, and network connection."
        : error.message;
    renderResult({ ...sample, route: sample.confidence < threshold ? "escalated" : "accepted", threshold }, sample, threshold, "fallback", fallbackError);
  } finally {
    runButton.disabled = false;
    runLabel.textContent = "Run demo";
  }
}

thresholdInput.addEventListener("input", updateThreshold);
runButton.addEventListener("click", runDemo);
updateThreshold();
document.querySelector("#year").textContent = new Date().getFullYear();

// ---------------------------------------------------------------------------
// Balanced (round-robin) allocation across the three study arms.
//
// Each visitor increments a shared counter and is sent to arm (count % 3),
// so the three LimeSurvey orders fill evenly instead of drifting apart the
// way plain Math.random() does. If the counter service is unreachable we
// fall back to a random arm so a participant is never left stranded.
// ---------------------------------------------------------------------------

// The three study arms (LimeSurvey orders 1/2/3).
const links = [
    "https://xai-uni-ulm.limesurvey.net/900001?lang=en&newtest=Y",
    "https://xai-uni-ulm.limesurvey.net/900002?lang=en&newtest=Y",
    "https://xai-uni-ulm.limesurvey.net/900003?lang=en&newtest=Y"
];

// Shared counter endpoint (abacus — a maintained CountAPI-compatible service;
// returns {"value": N}). The namespace/key isolate this study's tally; change
// the key if you re-run the study and want a fresh count.
const COUNTER_NAMESPACE = "plan-explanations-semantic-roles";
const COUNTER_KEY = "arm-allocation-2025";
const COUNTER_URL =
    `https://abacus.jasoncameron.dev/hit/${COUNTER_NAMESPACE}/${COUNTER_KEY}`;

// Don't make participants wait on a slow/dead counter.
const COUNTER_TIMEOUT_MS = 2500;

function randomIndex() {
    return Math.floor(Math.random() * links.length);
}

async function chooseArmIndex() {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), COUNTER_TIMEOUT_MS);
    try {
        const res = await fetch(COUNTER_URL, { signal: controller.signal });
        if (!res.ok) throw new Error(`counter HTTP ${res.status}`);
        const data = await res.json();
        // CountAPI returns the *new* value; map it round-robin onto the arms.
        if (typeof data.value === "number") {
            return (data.value - 1 + links.length) % links.length;
        }
        throw new Error("counter returned no value");
    } catch (err) {
        // Service down, blocked, or timed out — degrade gracefully to random.
        return randomIndex();
    } finally {
        clearTimeout(timer);
    }
}

document.addEventListener("DOMContentLoaded", async function () {
    const linkElement = document.getElementById("link");
    const index = await chooseArmIndex();
    const target = links[index];

    // Set the visible link too, so it works even if the redirect is blocked.
    if (linkElement) linkElement.href = target;

    window.location.href = target;
});

const authShell = document.getElementById("auth-shell");
const appShell = document.getElementById("app-shell");
const authMessage = document.getElementById("auth-message");
const userEmail = document.getElementById("user-email");
const caseSelect = document.getElementById("case-select");
const toast = document.getElementById("toast");
const timelineEl = document.getElementById("timeline");

const API = {
  login: "/auth/login",
  signup: "/auth/signup",
  reset: "/auth/password-reset",
  createCase: "/cases/create",
  listCases: "/cases/list",
  transcribe: "/transcribe-audio-api",
  generate: "/sketch/generate",
  refine: "/refine/add",
  timeline: (caseId) => `/cases/${encodeURIComponent(caseId)}/timeline`,
};

let recordedBlob = null;
let mediaRecorder = null;
let selectedCaseId = "";

function showToast(text) {
  if (!toast) return;
  toast.textContent = text;
  toast.classList.remove("hidden", "show");
  // Retrigger animation.
  void toast.offsetWidth;
  toast.classList.add("show");

  setTimeout(() => {
    toast.classList.remove("show");
    toast.classList.add("hidden");
  }, 2400);
}

function setBusy(buttonId, busy, busyText = "Working...") {
  const btn = document.getElementById(buttonId);
  if (!btn) return;
  if (!btn.dataset.originalText) {
    btn.dataset.originalText = btn.textContent || "";
  }

  btn.disabled = busy;
  btn.classList.toggle("busy", busy);
  btn.textContent = busy ? busyText : btn.dataset.originalText;
}

function setAuthMessage(text, isError = false) {
  authMessage.textContent = text;
  authMessage.classList.toggle("status-error", isError);
  authMessage.classList.toggle("status-ok", !isError && !!text);
}

function setGenerateStatus(text, isError = false) {
  const el = document.getElementById("generate-status");
  el.textContent = text;
  el.classList.toggle("status-error", isError);
  el.classList.toggle("status-ok", !isError && !!text);
}

function setVoiceStatus(text, isError = false) {
  const el = document.getElementById("voice-status");
  el.textContent = text;
  el.classList.toggle("status-error", isError);
  el.classList.toggle("status-ok", !isError && !!text);
}

function setCaseStatus(text, isError = false) {
  const el = document.getElementById("case-status");
  el.textContent = text;
  el.classList.toggle("status-error", isError);
  el.classList.toggle("status-ok", !isError && !!text);
}

function setRefineStatus(text, isError = false) {
  const el = document.getElementById("refine-status");
  el.textContent = text;
  el.classList.toggle("status-error", isError);
  el.classList.toggle("status-ok", !isError && !!text);
}

function getToken() {
  return localStorage.getItem("access_token") || "";
}

function setSession(user, token) {
  localStorage.setItem("access_token", token);
  localStorage.setItem("user_email", user?.email || "");
  showApp();
}

function clearSession() {
  localStorage.removeItem("access_token");
  localStorage.removeItem("user_email");
}

function authHeaders() {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function apiJson(url, options = {}) {
  const resp = await fetch(url, options);
  const data = await resp.json().catch(() => ({}));
  return { resp, data };
}

function showAuth() {
  authShell.classList.remove("shell-animate");
  void authShell.offsetWidth;
  authShell.classList.add("shell-animate");
  authShell.classList.remove("hidden");
  appShell.classList.add("hidden");
}

function showApp() {
  userEmail.textContent = localStorage.getItem("user_email") || "";
  authShell.classList.add("hidden");
  appShell.classList.remove("shell-animate");
  void appShell.offsetWidth;
  appShell.classList.add("shell-animate");
  appShell.classList.remove("hidden");
  loadCases();
}

function switchTab(tab) {
  for (const id of ["login", "signup", "reset"]) {
    document.getElementById(`tab-${id}`).classList.remove("active");
    document.getElementById(`${id}-form`).classList.remove("active");
  }
  document.getElementById(`tab-${tab}`).classList.add("active");
  document.getElementById(`${tab}-form`).classList.add("active");
}

async function checkSession() {
  const token = getToken();
  if (!token) {
    showAuth();
    return;
  }

  const { resp } = await fetch(API.listCases, { headers: authHeaders() });
  if (resp.status === 401) {
    clearSession();
    showAuth();
    return;
  }
  showApp();
}

async function loadCases() {
  const { resp, data } = await apiJson(API.listCases, { headers: authHeaders() });
  if (resp.status >= 400 || !data.success) {
    setCaseStatus(data.error || `Failed to load cases (${resp.status})`, true);
    return;
  }

  const rows = data.cases || [];
  caseSelect.innerHTML = "";
  const first = document.createElement("option");
  first.value = "";
  first.textContent = rows.length ? "Select case" : "No cases yet";
  caseSelect.appendChild(first);

  for (const item of rows) {
    const option = document.createElement("option");
    option.value = item.case_id;
    option.textContent = `${item.title || "Untitled"} (${item.case_id})`;
    caseSelect.appendChild(option);
  }

  if (selectedCaseId) {
    caseSelect.value = selectedCaseId;
    await loadTimeline(selectedCaseId);
  } else {
    renderTimeline([]);
  }
}

function formatTimestamp(value) {
  if (!value) return "";
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return value;
  return dt.toLocaleString();
}

function renderTimeline(events) {
  if (!timelineEl) return;
  timelineEl.innerHTML = "";

  if (!events || !events.length) {
    const empty = document.createElement("div");
    empty.className = "timeline-empty";
    empty.textContent = "No timeline entries yet. Generate a base sketch or add a refinement.";
    timelineEl.appendChild(empty);
    return;
  }

  for (const item of events) {
    const block = document.createElement("article");
    block.className = "timeline-item";

    const top = document.createElement("div");
    top.className = "title";
    const title = document.createElement("strong");
    const when = document.createElement("span");

    if (item.event_type === "sketch") {
      const version = item.payload?.version ?? "?";
      title.textContent = `Sketch version ${version}`;
      when.textContent = formatTimestamp(item.created_at || item.payload?.created_at);
      const body = document.createElement("p");
      body.textContent = item.payload?.image_url || "Sketch generated";
      top.appendChild(title);
      top.appendChild(when);
      block.appendChild(top);
      block.appendChild(body);

      if (item.payload?.signed_image_url) {
        const thumb = document.createElement("img");
        thumb.className = "timeline-thumb";
        thumb.alt = `Sketch v${version}`;
        thumb.src = item.payload.signed_image_url;
        block.appendChild(thumb);
      }

      timelineEl.appendChild(block);
      continue;
    }

    title.textContent = `Refinement (${item.payload?.attribute_type || "general"})`;
    when.textContent = formatTimestamp(item.created_at || item.payload?.created_at);
    const body = document.createElement("p");
    body.textContent = item.payload?.description || "Refinement applied";
    top.appendChild(title);
    top.appendChild(when);
    block.appendChild(top);
    block.appendChild(body);
    timelineEl.appendChild(block);
  }
}

async function loadTimeline(caseId) {
  if (!caseId) {
    renderTimeline([]);
    return;
  }

  const { resp, data } = await apiJson(API.timeline(caseId), { headers: authHeaders() });
  if (resp.status >= 400 || !data.success) {
    setCaseStatus(data.error || `Failed to load timeline (${resp.status})`, true);
    return;
  }
  renderTimeline(data.timeline || []);
}

async function submitLogin(event) {
  event.preventDefault();
  const email = document.getElementById("login-email").value.trim();
  const password = document.getElementById("login-password").value;

  setBusy("login-btn", true, "Signing in...");

  const { resp, data } = await apiJson(API.login, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  setBusy("login-btn", false);

  if (resp.status >= 400 || !data.success) {
    setAuthMessage(data.error || `Login failed (${resp.status})`, true);
    showToast("Login failed");
    return;
  }

  setSession(data.user || {}, data.access_token || "");
  setAuthMessage("");
  showToast("Welcome back");
}

async function submitSignup(event) {
  event.preventDefault();
  const email = document.getElementById("signup-email").value.trim();
  const password = document.getElementById("signup-password").value;

  setBusy("signup-btn", true, "Creating...");

  const { resp, data } = await apiJson(API.signup, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  setBusy("signup-btn", false);

  if (resp.status >= 400 || !data.success) {
    setAuthMessage(data.error || `Signup failed (${resp.status})`, true);
    showToast("Signup failed");
    return;
  }
  setAuthMessage("Signup successful. Login now.");
  showToast("Account created");
  switchTab("login");
}

async function submitReset(event) {
  event.preventDefault();
  const email = document.getElementById("reset-email").value.trim();

  setBusy("reset-btn", true, "Sending...");

  const { resp, data } = await apiJson(API.reset, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });

  setBusy("reset-btn", false);

  if (resp.status >= 400 || !data.success) {
    setAuthMessage(data.error || `Reset failed (${resp.status})`, true);
    showToast("Reset failed");
    return;
  }
  setAuthMessage(data.message || "Reset link sent.");
  showToast("Reset email sent");
}

async function createCase() {
  const title = document.getElementById("case-title").value.trim();
  const description = document.getElementById("case-description").value.trim();

  setBusy("create-case-btn", true, "Creating...");

  const { resp, data } = await apiJson(API.createCase, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ title, description }),
  });

  setBusy("create-case-btn", false);

  if (resp.status >= 400 || !data.success) {
    setCaseStatus(data.error || `Create case failed (${resp.status})`, true);
    showToast("Case creation failed");
    return;
  }

  selectedCaseId = data.case?.case_id || "";
  await loadCases();
  if (selectedCaseId) {
    caseSelect.value = selectedCaseId;
  }
  await loadTimeline(selectedCaseId);
  setCaseStatus(`Case created: ${selectedCaseId}`);
  showToast("Case created");
}

async function startRecording() {
  if (!navigator.mediaDevices?.getUserMedia) {
    setVoiceStatus("Microphone access is not supported in this browser.", true);
    showToast("Microphone unavailable");
    return;
  }

  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const chunks = [];
  mediaRecorder = new MediaRecorder(stream);

  mediaRecorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };

  mediaRecorder.onstop = () => {
    recordedBlob = new Blob(chunks, { type: "audio/wav" });
    setVoiceStatus("Recording captured. Click Transcribe.");
    stream.getTracks().forEach((t) => t.stop());
  };

  mediaRecorder.start();
  setVoiceStatus("Recording...");
  showToast("Recording started");
}

function stopRecording() {
  if (mediaRecorder && mediaRecorder.state !== "inactive") {
    mediaRecorder.stop();
    showToast("Recording stopped");
  }
}

async function transcribeAudio() {
  if (!recordedBlob) {
    setVoiceStatus("Record audio first.", true);
    showToast("No audio to transcribe");
    return;
  }

  setBusy("transcribe-btn", true, "Transcribing...");

  const formData = new FormData();
  formData.append("audio", recordedBlob, "recording.wav");

  const { resp, data } = await apiJson(API.transcribe, {
    method: "POST",
    headers: { ...authHeaders() },
    body: formData,
  });

  setBusy("transcribe-btn", false);

  if (resp.status >= 400 || !data.success) {
    setVoiceStatus(data.error || `Transcription failed (${resp.status})`, true);
    showToast("Transcription failed");
    return;
  }

  const description = document.getElementById("description-input");
  description.value = data.text || "";
  setVoiceStatus("Transcription complete.");
  showToast("Transcription complete");
}

async function generateSketch() {
  selectedCaseId = caseSelect.value;
  const description = document.getElementById("description-input").value.trim();
  if (!selectedCaseId) {
    setGenerateStatus("Select or create a case first.", true);
    showToast("Select a case");
    return;
  }
  if (!description) {
    setGenerateStatus("Enter description first.", true);
    showToast("Description is required");
    return;
  }

  setBusy("generate-btn", true, "Generating...");

  const payload = {
    case_id: selectedCaseId,
    description,
    width: 512,
    height: 512,
    steps: 20,
    guidance: 7.5,
  };

  const { resp, data } = await apiJson(API.generate, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(payload),
  });

  setBusy("generate-btn", false);

  if (resp.status >= 400 || !data.success) {
    setGenerateStatus(data.error || `Generation failed (${resp.status})`, true);
    showToast("Generation failed");
    return;
  }

  const image = document.getElementById("result-image");
  image.src = data.signed_image_url || `data:image/png;base64,${data.sketch || data.portrait || ""}`;
  image.classList.remove("hidden");

  document.getElementById("result-meta").textContent = JSON.stringify(
    {
      case_id: selectedCaseId,
      storage_path: data.storage_path || data.saved_image_path,
      signed_image_url: data.signed_image_url || "",
      sketch_record: data.sketch_record || null,
      model: data.model,
      provider: data.provider,
    },
    null,
    2
  );

  setGenerateStatus("Sketch generated successfully.");
  setRefineStatus("");
  await loadTimeline(selectedCaseId);
  showToast("Sketch generated");
}

async function refineSketch() {
  selectedCaseId = caseSelect.value;
  const description = document.getElementById("description-input").value.trim();
  const refinement = document.getElementById("refinement-note").value.trim();
  const attributeType = document.getElementById("attribute-type").value;

  if (!selectedCaseId) {
    setRefineStatus("Select or create a case first.", true);
    showToast("Select a case");
    return;
  }
  if (!description) {
    setRefineStatus("Base description is required.", true);
    showToast("Add base description");
    return;
  }
  if (!refinement) {
    setRefineStatus("Refinement note is required.", true);
    showToast("Add refinement note");
    return;
  }

  setBusy("refine-btn", true, "Refining...");
  const payload = {
    case_id: selectedCaseId,
    description,
    refinement,
    attribute_type: attributeType,
  };

  const { resp, data } = await apiJson(API.refine, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(payload),
  });
  setBusy("refine-btn", false);

  if (resp.status >= 400 || !data.success) {
    setRefineStatus(data.error || `Refinement failed (${resp.status})`, true);
    showToast("Refinement failed");
    return;
  }

  const image = document.getElementById("result-image");
  image.src = data.signed_image_url || `data:image/png;base64,${data.sketch || data.portrait || ""}`;
  image.classList.remove("hidden");

  document.getElementById("result-meta").textContent = JSON.stringify(
    {
      case_id: selectedCaseId,
      refinement_record: data.refinement_record || null,
      sketch_record: data.sketch_record || null,
      storage_path: data.storage_path || data.saved_image_path,
      signed_image_url: data.signed_image_url || "",
      model: data.model,
      provider: data.provider,
    },
    null,
    2
  );

  setRefineStatus("Refinement applied and version updated.");
  document.getElementById("refinement-note").value = "";
  await loadTimeline(selectedCaseId);
  showToast("Refinement applied");
}

function bindEvents() {
  document.getElementById("tab-login").onclick = () => switchTab("login");
  document.getElementById("tab-signup").onclick = () => switchTab("signup");
  document.getElementById("tab-reset").onclick = () => switchTab("reset");

  document.getElementById("login-form").addEventListener("submit", submitLogin);
  document.getElementById("signup-form").addEventListener("submit", submitSignup);
  document.getElementById("reset-form").addEventListener("submit", submitReset);

  document.getElementById("logout-btn").onclick = () => {
    clearSession();
    showAuth();
    showToast("Signed out");
  };

  document.getElementById("refresh-cases-btn").onclick = loadCases;
  document.getElementById("create-case-btn").onclick = createCase;
  caseSelect.onchange = () => {
    selectedCaseId = caseSelect.value;
    loadTimeline(selectedCaseId);
  };

  document.getElementById("record-btn").onclick = startRecording;
  document.getElementById("stop-btn").onclick = stopRecording;
  document.getElementById("transcribe-btn").onclick = transcribeAudio;
  document.getElementById("generate-btn").onclick = generateSketch;
  document.getElementById("refine-btn").onclick = refineSketch;
}

bindEvents();
checkSession();

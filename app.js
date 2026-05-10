// FMES Hallway Assistant - app.js
// v2 — Fully backend-driven, async

document.addEventListener("DOMContentLoaded", () => {
  // ----- DOM ELEMENTS -----
  const views = {
    home: document.getElementById("view-home"),
    newRequest: document.getElementById("view-new-request"),
    myRequests: document.getElementById("view-my-requests"),
    requestDetail: document.getElementById("view-request-detail"),
    adminDashboard: document.getElementById("view-admin-dashboard"),
    adminArchive: document.getElementById("view-admin-archive"),
    adminSettings: document.getElementById("view-admin-settings"),
  };

  const sidebar = document.getElementById("sidebar");
  const header = document.getElementById("app-header");
  const banner = document.getElementById("out-of-building-banner");
  const scheduleText = document.getElementById("schedule-text");
  const adminScheduleText = document.getElementById("admin-schedule-text");

  const btnNewRequest = document.getElementById("btn-new-request");
  const btnMyRequests = document.getElementById("btn-my-requests");
  const btnCancelRequest = document.getElementById("btn-cancel-request");
  const btnBackToList = document.getElementById("btn-back-to-list");

  const myRequestsList = document.getElementById("my-requests-list");
  const adminRequestsList = document.getElementById("admin-requests-list");
  const adminArchiveList = document.getElementById("admin-archive-list");

  const toggleOutOfBuilding = document.getElementById("toggle-out-of-building");
  const btnSaveSchedule = document.getElementById("btn-save-schedule");
  const adminLogoutBtn = document.getElementById("admin-logout-btn");

  const adminLoginOverlay = document.getElementById("admin-login-overlay");
  const adminPasswordInput = document.getElementById("admin-password-input");
  const adminLoginConfirm = document.getElementById("admin-login-confirm");
  const adminLoginCancel = document.getElementById("admin-login-cancel");
  const adminLoginError = document.getElementById("admin-login-error");

  const headerMenuIcon = document.getElementById("header-menu-icon");

  const requestForm = document.getElementById("request-form");
  const teacherNameInput = document.getElementById("teacher-name");
  const chatThread = document.getElementById("chat-thread");
  const chatForm = document.getElementById("chat-form");
  const chatInput = document.getElementById("chat-input");

  const detailTeacher = document.getElementById("detail-teacher");
  const detailLocation = document.getElementById("detail-location");
  const detailType = document.getElementById("detail-type");
  const detailStatus = document.getElementById("detail-status");
  const detailSubmitted = document.getElementById("detail-submitted");
  const detailPhotoWrapper = document.getElementById("detail-photo-wrapper");
  const detailPhoto = document.getElementById("detail-photo");

  // ----- FORM SUBMISSIONS -----
requestForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const teacherName = getCurrentTeacherName();
  const location = document.getElementById("location").value;
  const requestType = document.getElementById("request-type").value;
  const description = document.getElementById("description").value;

  const requestId = await apiAddRequest({
    teacherName,
    location,
    requestType,
    description,
    photoDataUrl: null
  });

  await renderMyRequests();
  switchView("myRequests");
});

chatForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!chatInput.value.trim()) return;
  await apiAddChatMessage({
    requestId: currentRequestId,
    sender: "teacher",
    text: chatInput.value.trim()
  });
  chatInput.value = "";
  renderChatThread(currentRequestId);
});
  
  // ----- STATE -----
  let isAdmin = false;
  let headerTapCount = 0;
  let headerTapTimer = null;
  let currentUserName = "";
  let currentRequestId = null;

  const ADMIN_PASSWORD_HASH = simpleHash("912HallBoss!!"); // simple, non-cryptographic

  // ----- UTILITIES -----
  function simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i);
      hash |= 0;
    }
    return hash;
  }

  function nowTimestamp() {
    return new Date().toISOString();
  }

  function formatTimestamp(ts) {
    if (!ts) return "";
    return new Date(ts).toLocaleString();
  }

  function switchView(viewKey) {
    Object.values(views).forEach(v => {
      v.classList.remove("active-view");
      v.style.display = "none";
    });
    const target = views[viewKey];
    if (target) {
      target.style.display = "block";
      target.classList.add("active-view");
    }
  }

  function getCurrentTeacherName() {
    return currentUserName || teacherNameInput.value.trim();
  }

  function saveTeacherNameIfNeeded() {
    const name = teacherNameInput.value.trim();
    if (name && name !== currentUserName) {
      currentUserName = name;
      localStorage.setItem("fmes_teacher_name", name);
    }
  }

  function ensureTeacherNameLoaded() {
    const stored = localStorage.getItem("fmes_teacher_name");
    if (stored) {
      currentUserName = stored;
      teacherNameInput.value = stored;
    }
  }

  function loadSchedule() {
    const stored = localStorage.getItem("fmes_schedule");
    if (stored) {
      scheduleText.textContent = stored;
      adminScheduleText.value = stored;
    } else {
      adminScheduleText.value = scheduleText.textContent.trim();
    }
  }

  function saveSchedule() {
    const text = adminScheduleText.value;
    localStorage.setItem("fmes_schedule", text);
    scheduleText.textContent = text;
  }

  function loadBannerState() {
    const stored = localStorage.getItem("fmes_banner_on");
    const isOn = stored === "true";
    toggleOutOfBuilding.checked = isOn;
    banner.style.display = isOn ? "block" : "none";
  }

  function saveBannerState() {
    const isOn = toggleOutOfBuilding.checked;
    localStorage.setItem("fmes_banner_on", String(isOn));
    banner.style.display = isOn ? "block" : "none";
  }

  function generateRequestId() {
    return "req_" + Date.now() + "_" + Math.floor(Math.random() * 100000);
  }

  // ----- REQUESTS -----
  async function renderMyRequests() {
    const teacherName = getCurrentTeacherName();
    const requests = await apiGetRequestsForTeacher(teacherName);

    myRequestsList.innerHTML = "";

    const now = Date.now();
    const visible = requests.filter(r => {
      if (r.status === "Completed" && r.completedAt) {
        const completedTime = new Date(r.completedAt).getTime();
        const diffHours = (now - completedTime) / (1000 * 60 * 60);
        return diffHours <= 48;
      }
      return r.status !== "Archived";
    });

    if (visible.length === 0) {
      myRequestsList.innerHTML = `<p class="subtitle">No active or recent requests yet.</p>`;
      return;
    }

    visible.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    visible.forEach(req => {
      const item = document.createElement("div");
      item.className = "list-item";
      item.dataset.requestId = req.request_id;

      const title = document.createElement("div");
      title.className = "title";
      title.textContent = `${req.room} – ${req.category}`;

      const subtitle = document.createElement("div");
      subtitle.className = "subtitle";
      subtitle.textContent = formatTimestamp(req.createdAt);

      const badge = document.createElement("span");
      badge.className = "badge";
      badge.textContent = req.status || "New";

      item.appendChild(title);
      item.appendChild(subtitle);
      item.appendChild(badge);

      item.addEventListener("click", () => openRequestDetail(req.request_id, false));
      myRequestsList.appendChild(item);
    });
  }

  async function renderAdminRequests() {
    const requests = await callBackend({ action: "getAllRequests" });

    adminRequestsList.innerHTML = "";

    const visible = requests.filter(r => r.status !== "Archived");

    if (visible.length === 0) {
      adminRequestsList.innerHTML = `<p class="subtitle">No requests yet.</p>`;
      return;
    }

    visible
      .sort((a, b) => new Date(b.updated_at || b.created_at) - new Date(a.updated_at || a.created_at))
      .forEach(req => {
        const item = document.createElement("div");
        item.className = "list-item";
        item.dataset.requestId = req.id;

        const title = document.createElement("div");
        title.className = "title";
        title.textContent =  ${req.room} – ${req.category}`;
       
        const subtitle = document.createElement("div");
        subtitle.className = "subtitle";
        subtitle.textContent = `${req.teacher_id} • ${formatTimestamp(req.created_at)}`;

        const badge = document.createElement("span");
        badge.className = "badge";
        badge.textContent = req.status;

        item.appendChild(title);
        item.appendChild(subtitle);
        item.appendChild(badge);

        item.addEventListener("click", () => openRequestDetail(req.request_id, false)
        adminRequestsList.appendChild(item);
      });
  }

  async function renderAdminArchive() {
    const requests = await callBackend({ action: "getAllRequests" });
    adminArchiveList.innerHTML = "";

    const archived = requests.filter(r => r.status === "Archived");

    if (archived.length === 0) {
      adminArchiveList.innerHTML = `<p class="subtitle">No archived requests yet.</p>`;
      return;
    }

    archived
      .sort((a, b) => new Date(b.updated_at || b.created_at) - new Date(a.updated_at || a.created_at))
      .forEach(req => {
        const item = document.createElement("div");
        item.className = "list-item";
        item.dataset.requestId = req.request_id;

        const title = document.createElement("div");
        title.className = "title";
        title.textContent =
  `${req.location} – ${req.requestType}`;

        const subtitle = document.createElement("div");
        subtitle.className = "subtitle";
        subtitle.textContent = `${req.teacher_id} • Completed: ${formatTimestamp(req.updated_at)}`;

        item.appendChild(title);
        item.appendChild(subtitle);

        adminArchiveList.appendChild(item);
      });
  }

  async function openRequestDetail(requestId, adminMode = false) {

  currentRequestId = requestId;

  const requests =
  await apiGetRequestsForTeacher(getCurrentTeacherName());

  const req = requests.find(r =>
  String(r.request_id) === String(requestId)
);

  if (!req) {
    alert("Request not found.");
    return;
  }

  detailTeacher.textContent =
    req.teacher_id || req.teacherName || "";

  detailLocation.textContent =
    req.room || req.location || "";

  detailType.textContent =
    req.category || req.requestType || "";

  detailStatus.textContent =
    req.status || "";

  detailSubmitted.textContent =
    formatTimestamp(req.created_at || req.createdAt);

  await renderChatThread(requestId);

  switchView("requestDetail");
}
// ----- BUTTONS / EVENT LISTENERS -----
btnNewRequest.addEventListener("click", () => {
    saveTeacherNameIfNeeded();
    switchView("newRequest");
});

btnMyRequests.addEventListener("click", () => {
    saveTeacherNameIfNeeded();
    renderMyRequests();
    switchView("myRequests");
});

btnCancelRequest.addEventListener("click", () => {
    switchView("home");
});

btnBackToList.addEventListener("click", () => {
    switchView(isAdmin ? "adminDashboard" : "myRequests");
});

  chatForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!chatInput.value.trim()) return;
    await apiAddChatMessage({
        requestId: currentRequestId,
        sender: "teacher",
        text: chatInput.value.trim()
    });
    chatInput.value = "";
    renderChatThread(currentRequestId);
});

// ----- INITIALIZATION -----
  ensureTeacherNameLoaded();
  loadSchedule();
  loadBannerState();
  switchView("home");
});

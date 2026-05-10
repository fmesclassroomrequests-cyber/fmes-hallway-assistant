// FMES Hallway Assistant - app.js
// v1 — Core behavior, localStorage-based

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

  // ----- STATE -----
  let isAdmin = false;
  let headerTapCount = 0;
  let headerTapTimer = null;
  let currentUserName = "";
  let currentRequestId = null;

  const ADMIN_PASSWORD_HASH = simpleHash("912HallBoss!!"); // not cryptographically strong, but fine for this use

  // ----- STORAGE KEYS -----
  const STORAGE_KEYS = {
    teacherName: "fmes_teacher_name",
    schedule: "fmes_schedule",
    bannerOn: "fmes_banner_on",
    requests: "fmes_requests",
  };

  // ----- UTILITIES -----
  function simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i);
      hash |= 0;
    }
    return hash;
  }

   async function loadRequests() {
    const teacherName = getCurrentTeacherName();
    return await apiGetRequestsForTeacher(teacherName);
  }

  function saveRequests(requests) {
    localStorage.setItem(STORAGE_KEYS.requests, JSON.stringify(requests));
  }

  function nowTimestamp() {
    return new Date().toISOString();
  }

  function formatTimestamp(ts) {
    if (!ts) return "";
    const d = new Date(ts);
    return d.toLocaleString();
  }

  function switchView(viewKey) {
    Object.values(views).forEach(v => v.classList.remove("active-view"));
    Object.values(views).forEach(v => (v.style.display = "none"));

    const target = views[viewKey];
    if (target) {
      target.style.display = "block";
      target.classList.add("active-view");
    }
  }

  function ensureTeacherNameLoaded() {
    const stored = localStorage.getItem(STORAGE_KEYS.teacherName);
    if (stored) {
      currentUserName = stored;
      if (teacherNameInput) teacherNameInput.value = stored;
    }
  }

  function saveTeacherNameIfNeeded() {
    const name = teacherNameInput.value.trim();
    if (name && name !== currentUserName) {
      currentUserName = name;
      localStorage.setItem(STORAGE_KEYS.teacherName, name);
    }
  }

  function loadSchedule() {
    const stored = localStorage.getItem(STORAGE_KEYS.schedule);
    if (stored) {
      scheduleText.textContent = stored;
      adminScheduleText.value = stored;
    } else {
      const defaultSchedule = scheduleText.textContent.trim();
      adminScheduleText.value = defaultSchedule;
    }
  }

  function saveSchedule() {
    const text = adminScheduleText.value;
    localStorage.setItem(STORAGE_KEYS.schedule, text);
    scheduleText.textContent = text;
  }

  function loadBannerState() {
    const stored = localStorage.getItem(STORAGE_KEYS.bannerOn);
    const isOn = stored === "true";
    toggleOutOfBuilding.checked = isOn;
    banner.style.display = isOn ? "block" : "none";
  }

  function saveBannerState() {
    const isOn = toggleOutOfBuilding.checked;
    localStorage.setItem(STORAGE_KEYS.bannerOn, String(isOn));
    banner.style.display = isOn ? "block" : "none";
  }

  function generateRequestId() {
    return "req_" + Date.now() + "_" + Math.floor(Math.random() * 100000);
  }

  function getCurrentTeacherName() {
    return currentUserName || teacherNameInput.value.trim();
  }

  // ----- REQUEST RENDERING -----
async function renderMyRequests() {
  const teacherName = getCurrentTeacherName();

  // FIX: extract the array from the backend response
  const response = await loadRequests();
  const requests = response.data || [];

  const normalized = requests.map(r => ({
    id: r.request_id,
    teacherName: r.teacher_id,
    location: r.room,
    requestType: r.category,
    description: r.description,
    status: r.status,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    priority: r.priority,
    hasPhotos: r.has_photos
}));
  
  const now = Date.now();
  myRequestsList.innerHTML = "";

  const mine = requests.filter(r => r.teacherName === teacherName);
  const visible = mine.filter(r => {
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
    item.dataset.requestId = req.id;

    const title = document.createElement("div");
    title.className = "title";
    title.textContent = `${req.location} – ${req.requestType}`;

    const subtitle = document.createElement("div");
    subtitle.className = "subtitle";
    subtitle.textContent = formatTimestamp(req.createdAt);

    const badge = document.createElement("span");
    badge.className = "badge";
    badge.textContent = req.status || "New";

    item.appendChild(title);
    item.appendChild(subtitle);
    item.appendChild(badge);

    item.addEventListener("click", () => openRequestDetail(req.id, false));
    myRequestsList.appendChild(item);
  });
}


  function renderAdminRequests() {
    const requests = loadRequests();
    adminRequestsList.innerHTML = "";

    if (requests.length === 0) {
      adminRequestsList.innerHTML = `<p class="subtitle">No requests yet.</p>`;
      return;
    }

    requests
      .filter(r => r.status !== "Archived")
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .forEach(req => {
        const item = document.createElement("div");
        item.className = "list-item";
        item.dataset.requestId = req.id;

        const title = document.createElement("div");
        title.className = "title";
        title.textContent = `${req.location} – ${req.requestType}`;

        const subtitle = document.createElement("div");
        subtitle.className = "subtitle";
        subtitle.textContent = `${req.teacherName} • ${formatTimestamp(req.createdAt)}`;

        const badge = document.createElement("span");
        badge.className = "badge";
        badge.textContent = req.status || "New";

        item.appendChild(title);
        item.appendChild(subtitle);
        item.appendChild(badge);

        item.addEventListener("click", () => openRequestDetail(req.id, true));

        adminRequestsList.appendChild(item);
      });
  }

  function renderAdminArchive() {
    const requests = loadRequests();
    adminArchiveList.innerHTML = "";

    const archived = requests.filter(r => r.status === "Archived");

    if (archived.length === 0) {
      adminArchiveList.innerHTML = `<p class="subtitle">No archived requests yet.</p>`;
      return;
    }

    archived
      .sort((a, b) => new Date(b.completedAt || b.createdAt) - new Date(a.completedAt || a.createdAt))
      .forEach(req => {
        const item = document.createElement("div");
        item.className = "list-item";
        item.dataset.requestId = req.id;

        const title = document.createElement("div");
        title.className = "title";
        title.textContent = `${req.location} – ${req.requestType}`;

        const subtitle = document.createElement("div");
        subtitle.className = "subtitle";
        subtitle.textContent = `${req.teacherName} • Completed: ${formatTimestamp(req.completedAt)}`;

        item.appendChild(title);
        item.appendChild(subtitle);

        adminArchiveList.appendChild(item);
      });
  }

  // ----- REQUEST DETAIL + CHAT -----
  function openRequestDetail(requestId, fromAdmin) {
    const requests = loadRequests();
    const req = requests.find(r => r.id === requestId);
    if (!req) return;

    currentRequestId = requestId;

    detailTeacher.textContent = req.teacherName;
    detailLocation.textContent = req.location;
    detailType.textContent = req.requestType;
    detailStatus.textContent = req.status || "New";
    detailSubmitted.textContent = formatTimestamp(req.createdAt);

    if (req.photoDataUrl) {
      detailPhotoWrapper.style.display = "block";
      detailPhoto.src = req.photoDataUrl;
    } else {
      detailPhotoWrapper.style.display = "none";
    }

    renderChatThread(req);

    switchView("requestDetail");

    btnBackToList.onclick = () => {
      if (fromAdmin && isAdmin) {
        switchView("adminDashboard");
      } else {
        switchView("myRequests");
      }
    };
  }

  function renderChatThread(req) {
    chatThread.innerHTML = "";
    const messages = req.messages || [];

    messages.forEach(msg => {
      const bubble = document.createElement("div");
      const ts = document.createElement("div");

      const isOwner = msg.sender === "custodian";

      bubble.className = isOwner ? "bubble-right" : "bubble-left";
      bubble.textContent = msg.text;

      ts.className = isOwner ? "timestamp-right" : "timestamp-left";
      ts.textContent = formatTimestamp(msg.timestamp);

      chatThread.appendChild(bubble);
      chatThread.appendChild(ts);
    });

    chatThread.scrollTop = chatThread.scrollHeight;
  }

  function addChatMessage(text) {
    if (!currentRequestId) return;
    const trimmed = text.trim();
    if (!trimmed) return;

    const requests = loadRequests();
    const idx = requests.findIndex(r => r.id === currentRequestId);
    if (idx === -1) return;

    const req = requests[idx];
    if (!req.messages) req.messages = [];

    const sender = isAdmin ? "custodian" : "teacher";

    req.messages.push({
      sender,
      text: trimmed,
      timestamp: nowTimestamp(),
    });

    requests[idx] = req;
    saveRequests(requests);
    renderChatThread(req);
  }

  // ----- ADMIN STATUS UPDATES -----
  function updateRequestStatus(requestId, newStatus) {
    const requests = loadRequests();
    const idx = requests.findIndex(r => r.id === requestId);
    if (idx === -1) return;

    const req = requests[idx];
    req.status = newStatus;

    if (newStatus === "Completed") {
      req.completedAt = nowTimestamp();
    }

    // Auto-archive if completed > 48h (handled on render), but we can also
    // run a cleanup pass here later if needed.

    requests[idx] = req;
    saveRequests(requests);

    renderAdminRequests();
    renderMyRequests();
  }

  // ----- ADMIN UNLOCK -----
  function showAdminLogin() {
    adminPasswordInput.value = "";
    adminLoginError.style.display = "none";
    adminLoginOverlay.style.display = "flex";
    adminPasswordInput.focus();
  }

  function hideAdminLogin() {
    adminLoginOverlay.style.display = "none";
  }

  function handleAdminLogin() {
    const entered = adminPasswordInput.value;
    const hash = simpleHash(entered);

    if (hash === ADMIN_PASSWORD_HASH) {
      isAdmin = true;
      hideAdminLogin();
      sidebar.style.display = "block";
      switchView("adminDashboard");
      renderAdminRequests();
      renderAdminArchive();
    } else {
      adminLoginError.style.display = "block";
    }
  }

  function handleAdminLogout() {
    isAdmin = false;
    sidebar.style.display = "none";
    switchView("home");
  }

  function handleHeaderTap() {
    headerTapCount++;
    if (!headerTapTimer) {
      headerTapTimer = setTimeout(() => {
        headerTapCount = 0;
        headerTapTimer = null;
      }, 3000);
    }

    if (headerTapCount >= 5) {
      headerTapCount = 0;
      clearTimeout(headerTapTimer);
      headerTapTimer = null;
      showAdminLogin();
    }
  }

  // ----- EVENT LISTENERS -----
  header.addEventListener("click", handleHeaderTap);

  headerMenuIcon.addEventListener("click", () => {
    if (!isAdmin) return;
    const isVisible = sidebar.style.display === "block";
    sidebar.style.display = isVisible ? "none" : "block";
  });

  btnNewRequest.addEventListener("click", () => {
    switchView("newRequest");
  });

   btnMyRequests.addEventListener("click", async () => {
    saveTeacherNameIfNeeded();
    await renderMyRequests();
    switchView("myRequests");
  });

  btnCancelRequest.addEventListener("click", () => {
    switchView("home");
  });

  requestForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    saveTeacherNameIfNeeded();

    const teacherName = getCurrentTeacherName();
    const location = document.getElementById("location").value.trim();
    const requestType = document.getElementById("request-type").value;
    const description = document.getElementById("description").value.trim();
    const photoInput = document.getElementById("photo");

    if (!teacherName || !location || !requestType) return;

    const newReq = {
      id: generateRequestId(),
      teacherName,
      location,
      requestType,
      description,
      status: "New",
      createdAt: nowTimestamp(),
      completedAt: null,
      messages: [],
      photoDataUrl: null,
    };

    const requests = loadRequests();

        const finishSave = async () => {
      await apiAddRequest({
        teacherName,
        location,
        requestType,
        description,
        photoDataUrl: newReq.photoDataUrl,
      });

      requestForm.reset();
      teacherNameInput.value = teacherName;
      switchView("home");
    };

    if (photoInput.files && photoInput.files[0]) {
      const file = photoInput.files[0];
      const reader = new FileReader();
     reader.onload = async () => {
      newReq.photoDataUrl = reader.result;
      await finishSave();
    };

      reader.readAsDataURL(file);
    } else {
      await finishSave();
    }
  });

  toggleOutOfBuilding.addEventListener("change", saveBannerState);
  btnSaveSchedule.addEventListener("click", saveSchedule);
  adminLogoutBtn.addEventListener("click", handleAdminLogout);

  adminLoginConfirm.addEventListener("click", handleAdminLogin);
  adminLoginCancel.addEventListener("click", hideAdminLogin);
  adminPasswordInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAdminLogin();
    }
  });

  chatForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const text = chatInput.value;
    addChatMessage(text);
    chatInput.value = "";
  });

  // ----- INITIALIZATION -----
  ensureTeacherNameLoaded();
  loadSchedule();
  loadBannerState();
  switchView("home");
});

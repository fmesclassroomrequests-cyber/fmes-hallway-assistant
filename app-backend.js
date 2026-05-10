// FMES Hallway Assistant - app-backend.js
// Backend API helpers for Google Apps Script web app

const WEB_APP_URL = "https://script.google.com/macros/s/AKfycby9xK3F8NNVPTqjmqCG10m8kMQH0KDmSfHsaFEtLi8yjJVWU3tMZbSAe4S-5WDcfrlanQ/exec";

async function callBackend(payload) {
  const res = await fetch(WEB_APP_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const json = await res.json();
  if (!json.success) {
    console.error("Backend error:", json.error);
    throw new Error(json.error || "Backend error");
  }
  return json.data;
}

// ----- REQUESTS -----

async function apiGetRequestsForTeacher(teacherName) {
  if (!teacherName) return [];

  const data = await callBackend({
    action: "getRequestsForTeacher",
    teacher_id: teacherName,
  });

  return data.map(r => ({
    id: String(r.request_id),
    teacherName: r.teacher_id,
    location: r.room,
    requestType: r.category,
    description: r.description,
    status: r.status,
    createdAt: r.created_at,
    completedAt: r.status === "Completed" ? r.updated_at : null,
    // chat + photos loaded separately if needed
  }));
}

async function apiAddRequest({ teacherName, location, requestType, description, photoDataUrl }) {
  const result = await callBackend({
    action: "addRequest",
    teacher_id: teacherName,
    room: location,
    category: requestType,
    description,
    priority: "Normal",
    has_photos: !!photoDataUrl,
  });

  const requestId = result.request_id;

  if (photoDataUrl) {
    await callBackend({
      action: "savePhoto",
      request_id: requestId,
      url: photoDataUrl,
    });
  }

  return requestId;
}

async function apiUpdateRequestStatus(requestId, newStatus) {
  await callBackend({
    action: "updateRequestStatus",
    request_id: requestId,
    status: newStatus,
  });
}

// ----- CHAT -----

async function apiGetChatForRequest(requestId) {
  const data = await callBackend({
    action: "getChatForRequest",
    request_id: requestId,
  });

  return data.map(m => ({
    sender: m.sender === "custodian" ? "custodian" : "teacher",
    text: m.message,
    timestamp: m.timestamp,
  }));
}

async function apiAddChatMessage({ requestId, sender, text }) {
  await callBackend({
    action: "addChatMessage",
    request_id: requestId,
    sender,
    message: text,
  });
}

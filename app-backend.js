// FMES Hallway Assistant - app-backend.js
// Backend API helpers for Google Apps Script web app

const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbx7CnuEGTTKe0-jL2yWEanrIFHzIX9BfmCq-4qUQpQtEY85N0Q21dDTS7C5J-CGrffbTg/exec";

async function callBackend(payload) {

  try {

    const formData = new URLSearchParams();

    formData.append(
      "payload",
      JSON.stringify(payload)
    );

    const res = await fetch(WEB_APP_URL, {
      method: "POST",
      body: formData
    });

    const text = await res.text();

    console.log("RAW BACKEND RESPONSE:", text);

    const json = JSON.parse(text);

    if (!json.success) {
      console.error("Backend error:", json.error);
      throw new Error(json.error || "Backend error");
    }

    return json.data;

  } catch (err) {

    console.error("callBackend failed:", err);

    throw err;
  }
}

// ----- REQUESTS -----

async function apiGetRequestsForTeacher(teacherName) {
  if (!teacherName) return [];

  const data = await callBackend({
    action: "getRequestsForTeacher",
    teacher_id: teacherName,
  });

  return data.map(r => ({
  id: String(r.request_id || ""),
  teacherName: r.teacher_id || "Unknown Teacher",
  location: r.room || "Unknown Room",
  requestType: r.category || "General Request",
  description: r.description || "",
  status: r.status || "New",
  createdAt: r.created_at || null,
  completedAt:
    r.status === "Completed"
      ? r.updated_at || null
      : null,
}));
}

async function apiGetAllRequests() {
  const data = await callBackend({
    action: "getAllRequests"
  });

  return data.map(r => ({
    id: String(r.request_id || ""),
    teacherName: r.teacher_id || "Unknown Teacher",
    location: r.room || "Unknown Room",
    requestType: r.category || "General Request",
    description: r.description || "",
    status: r.status || "New",
    createdAt: r.created_at || null,
    completedAt:
      r.status === "Completed"
        ? r.updated_at || null
        : null,
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

async function apiGetBannerState() {
  return await callBackend({
    action: "getBannerState"
  });
}

async function apiSetBannerState(enabled, text) {
  return await callBackend({
    action: "setBannerState",
    enabled,
    text
  });
}

async function apiGetSchedule() {
  return await callBackend({
    action: "getSchedule"
  });
}

async function apiSetSchedule(text) {
  return await callBackend({
    action: "setSchedule",
    text
  });
}

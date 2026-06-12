const STORAGE_KEYS = {
  apiBase: "groupTest.apiBase",
  token: "groupTest.token",
  pusherKey: "groupTest.pusherKey",
  pusherCluster: "groupTest.pusherCluster",
};

const state = {
  apiBase: localStorage.getItem(STORAGE_KEYS.apiBase) || "http://localhost:3000",
  token: localStorage.getItem(STORAGE_KEYS.token) || "",
  pusherKey: localStorage.getItem(STORAGE_KEYS.pusherKey) || "",
  pusherCluster: localStorage.getItem(STORAGE_KEYS.pusherCluster) || "eu",
  groups: [],
  selectedGroup: null,
  messages: [],
  messagePageSize: 50,
  nextMessagesFrom: 0,
  hasMoreMessages: true,
  isLoadingMessages: false,
  replyTarget: null,
  me: null,
  pusher: null,
  activeChannelName: null,
};

const elements = {
  configForm: document.querySelector("#configForm"),
  apiBaseInput: document.querySelector("#apiBaseInput"),
  tokenInput: document.querySelector("#tokenInput"),
  pusherKeyInput: document.querySelector("#pusherKeyInput"),
  pusherClusterInput: document.querySelector("#pusherClusterInput"),
  refreshGroupsButton: document.querySelector("#refreshGroupsButton"),
  groupsList: document.querySelector("#groupsList"),
  emptyState: document.querySelector("#emptyState"),
  chatState: document.querySelector("#chatState"),
  selectedProject: document.querySelector("#selectedProject"),
  selectedGroupName: document.querySelector("#selectedGroupName"),
  selectedGroupMeta: document.querySelector("#selectedGroupMeta"),
  editGroupForm: document.querySelector("#editGroupForm"),
  groupNameInput: document.querySelector("#groupNameInput"),
  githubLinkInput: document.querySelector("#githubLinkInput"),
  refreshMessagesButton: document.querySelector("#refreshMessagesButton"),
  messagesList: document.querySelector("#messagesList"),
  sendMessageForm: document.querySelector("#sendMessageForm"),
  replyTarget: document.querySelector("#replyTarget"),
  messageInput: document.querySelector("#messageInput"),
  clearLogButton: document.querySelector("#clearLogButton"),
  logOutput: document.querySelector("#logOutput"),
};

function boot() {
  elements.apiBaseInput.value = state.apiBase;
  elements.tokenInput.value = state.token;
  elements.pusherKeyInput.value = state.pusherKey;
  elements.pusherClusterInput.value = state.pusherCluster;
  bindEvents();
  renderGroups();
  log("Pret. Colle un access_token JWT puis charge les groupes.");
}

function bindEvents() {
  elements.configForm.addEventListener("submit", (event) => {
    event.preventDefault();
    state.apiBase = elements.apiBaseInput.value.replace(/\/$/, "");
    state.token = elements.tokenInput.value.trim();
    state.pusherKey = elements.pusherKeyInput.value.trim();
    state.pusherCluster = elements.pusherClusterInput.value.trim() || "eu";
    localStorage.setItem(STORAGE_KEYS.apiBase, state.apiBase);
    localStorage.setItem(STORAGE_KEYS.token, state.token);
    localStorage.setItem(STORAGE_KEYS.pusherKey, state.pusherKey);
    localStorage.setItem(STORAGE_KEYS.pusherCluster, state.pusherCluster);
    disconnectRealtime();
    log("Configuration sauvegardee.");
    loadGroups();
  });

  elements.refreshGroupsButton.addEventListener("click", loadGroups);
  elements.refreshMessagesButton.addEventListener("click", () =>
    loadMessages({ reset: true }),
  );

  elements.messagesList.addEventListener("scroll", () => {
    if (elements.messagesList.scrollTop < 80) {
      loadMessages();
    }
  });

  elements.editGroupForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!state.selectedGroup) return;

    const payload = {
      groupName: elements.groupNameInput.value.trim(),
      githubLink: elements.githubLinkInput.value.trim() || undefined,
    };

    const updatedGroup = await api(
      `/groups/${state.selectedGroup.id}`,
      "PATCH",
      payload,
    );

    state.selectedGroup = updatedGroup;
    state.groups = state.groups.map((group) =>
      group.id === updatedGroup.id ? updatedGroup : group,
    );
    renderGroups();
    renderSelectedGroup();
  });

  elements.sendMessageForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!state.selectedGroup) return;

    const content = elements.messageInput.value.trim();
    if (!content) return;

    const replyPath = state.replyTarget
      ? `/groups/${state.selectedGroup.id}/message/${state.replyTarget.id}`
      : `/groups/${state.selectedGroup.id}/message`;
    const message = await api(replyPath, "POST", { content });
    elements.messageInput.value = "";
    clearReplyTarget();
    upsertMessage(message);
  });

  elements.clearLogButton.addEventListener("click", () => {
    elements.logOutput.textContent = "";
  });
}

async function loadGroups() {
  state.me = await api("/me");
  const groups = await api("/groups");
  state.groups = Array.isArray(groups) ? groups : [];
  if (
    state.selectedGroup &&
    !state.groups.some((group) => group.id === state.selectedGroup.id)
  ) {
    state.selectedGroup = null;
  }
  renderGroups();
}

async function selectGroup(groupId) {
  const group = await api(`/groups/${groupId}`);
  state.selectedGroup = group;
  resetMessagesState();
  renderGroups();
  renderSelectedGroup();
  await loadMessages({ reset: true });
  subscribeToGroup(groupId);
}

async function loadMessages({ reset = false } = {}) {
  if (!state.selectedGroup) return;
  if (state.isLoadingMessages) return;
  if (!reset && !state.hasMoreMessages) return;

  if (reset) resetMessagesState();

  state.isLoadingMessages = true;
  const previousScrollHeight = elements.messagesList.scrollHeight;
  const previousScrollTop = elements.messagesList.scrollTop;
  renderMessages(state.messages, { keepScroll: true });

  const from = state.nextMessagesFrom;
  const to = from + state.messagePageSize;
  const messages = await api(
    `/groups/${state.selectedGroup.id}/messages?from=${from}&to=${to}`,
  );
  const nextMessages = Array.isArray(messages) ? messages : [];

  state.hasMoreMessages = nextMessages.length === state.messagePageSize;
  state.nextMessagesFrom += nextMessages.length;
  state.messages = mergeMessages(state.messages, nextMessages);
  state.isLoadingMessages = false;
  renderMessages(state.messages, {
    scrollToBottom: reset,
    preserveScrollFromTop: !reset,
    previousScrollHeight,
    previousScrollTop,
  });
}

async function api(path, method = "GET", body) {
  if (!state.token) {
    log("Token manquant.", "error");
    throw new Error("Missing token");
  }

  const options = {
    method,
    headers: {
      Authorization: `Bearer ${state.token}`,
    },
  };

  if (body) {
    options.headers["Content-Type"] = "application/json";
    options.body = JSON.stringify(body);
  }

  const url = `${state.apiBase}${path}`;
  log(`${method} ${url}`);

  const response = await fetch(url, options);
  const text = await response.text();
  const data = parseJson(text);

  if (!response.ok) {
    log(formatResponse(response.status, data || text), "error");
    throw new Error(`Request failed with status ${response.status}`);
  }

  log(formatResponse(response.status, data || text));
  return data;
}

function renderGroups() {
  elements.groupsList.innerHTML = "";

  if (state.groups.length === 0) {
    elements.groupsList.innerHTML =
      '<p class="muted">Aucun groupe charge pour le moment.</p>';
    return;
  }

  for (const group of state.groups) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "group-card";
    if (group.id === state.selectedGroup?.id) button.classList.add("active");
    button.innerHTML = `
      <strong>${escapeHtml(group.groupName)}</strong>
      <span class="muted">${escapeHtml(group.projectName || "Projet inconnu")}</span>
      <span class="tag-row">
        <span class="tag">team ${escapeHtml(group.id)}</span>
        <span class="tag">${group.usersId?.length || 0} membres</span>
      </span>
    `;
    button.addEventListener("click", () => selectGroup(group.id));
    elements.groupsList.appendChild(button);
  }
}

function renderSelectedGroup() {
  if (!state.selectedGroup) {
    elements.emptyState.classList.remove("hidden");
    elements.chatState.classList.add("hidden");
    return;
  }

  const group = state.selectedGroup;
  elements.emptyState.classList.add("hidden");
  elements.chatState.classList.remove("hidden");
  elements.selectedProject.textContent = group.projectName || "Projet inconnu";
  elements.selectedGroupName.textContent = group.groupName;
  elements.selectedGroupMeta.textContent = [
    `team ${group.id}`,
    group.groupCampus ? `campus ${group.groupCampus}` : null,
    `${group.usersId?.length || 0} membres`,
  ]
    .filter(Boolean)
    .join(" | ");
  elements.groupNameInput.value = group.groupName || "";
  elements.githubLinkInput.value = group.githubLink || "";
}

function renderMessages(
  messages,
  {
    scrollToBottom = false,
    keepScroll = false,
    preserveScrollFromTop = false,
    previousScrollHeight = 0,
    previousScrollTop = 0,
  } = {},
) {
  const currentScrollTop = elements.messagesList.scrollTop;
  elements.messagesList.innerHTML = "";

  if (messages.length === 0) {
    elements.messagesList.innerHTML =
      state.isLoadingMessages
        ? '<p class="muted">Chargement des messages...</p>'
        : '<p class="muted">Aucun message dans ce groupe.</p>';
    return;
  }

  if (!state.hasMoreMessages) {
    const start = document.createElement("p");
    start.className = "messages-status muted";
    start.textContent = "Debut de la conversation.";
    elements.messagesList.appendChild(start);
  }

  if (state.isLoadingMessages) {
    const loading = document.createElement("p");
    loading.className = "messages-status muted";
    loading.textContent = "Chargement...";
    elements.messagesList.appendChild(loading);
  }

  for (const message of messages) {
    const article = document.createElement("article");
    article.className = "message";
    const authorName = message.user?.name || message.sender;
    const authorImage = message.user?.ftPfpUrl || message.user?.rdmPfp || "";
    const canEdit = message.sender === state.me?.id;
    article.innerHTML = `
      <div class="message-top">
        <div class="message-author">
          ${renderAvatar(authorImage, authorName)}
          <div>
            <strong>${escapeHtml(authorName)}</strong>
            <span>${escapeHtml(message.user?.id || message.sender)}</span>
          </div>
        </div>
        <div class="message-meta">
          <span>${formatDate(message.sendTime)}</span>
          ${message.updatedAt && message.updatedAt !== message.sendTime ? "<span>modifie</span>" : ""}
          <button class="message-reply-button" type="button" data-message-id="${escapeHtml(message.id)}">Repondre</button>
          ${
            canEdit
              ? `
                <button class="message-edit-button" type="button" data-message-id="${escapeHtml(message.id)}">Modifier</button>
                <button class="message-delete-button" type="button" data-message-id="${escapeHtml(message.id)}">Supprimer</button>
              `
              : ""
          }
        </div>
      </div>
      ${renderReplyPreview(message.replyTo)}
      <div class="message-content">${escapeHtml(message.content)}</div>
      ${renderFileList(message.filesUrl)}
    `;

    const replyButton = article.querySelector(".message-reply-button");
    replyButton?.addEventListener("click", () => setReplyTarget(message));

    const editButton = article.querySelector(".message-edit-button");
    editButton?.addEventListener("click", () =>
      renderEditMessage(article, message),
    );

    const deleteButton = article.querySelector(".message-delete-button");
    deleteButton?.addEventListener("click", () => deleteMessage(message));

    elements.messagesList.appendChild(article);
  }

  if (scrollToBottom) {
    elements.messagesList.scrollTop = elements.messagesList.scrollHeight;
  } else if (preserveScrollFromTop) {
    elements.messagesList.scrollTop =
      elements.messagesList.scrollHeight -
      previousScrollHeight +
      previousScrollTop;
  } else if (keepScroll) {
    elements.messagesList.scrollTop = currentScrollTop;
  }
}

function renderEditMessage(article, message) {
  article.innerHTML = `
    <form class="message-edit-form">
      <textarea name="content" rows="4" maxlength="1000" required>${escapeHtml(message.content)}</textarea>
      <label>
        Fichiers
        <textarea name="filesUrl" rows="3" placeholder="/files/example.png">${escapeHtml((message.filesUrl || []).join("\n"))}</textarea>
      </label>
      <div class="message-edit-actions">
        <button type="submit">Enregistrer</button>
        <button type="button" data-cancel>Annuler</button>
      </div>
    </form>
  `;

  const form = article.querySelector(".message-edit-form");
  const textarea = form.querySelector("textarea");
  textarea.focus();
  textarea.setSelectionRange(textarea.value.length, textarea.value.length);

  form
    .querySelector("[data-cancel]")
    .addEventListener("click", () => loadMessages({ reset: true }));
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const content = textarea.value.trim();
    if (!content) return;
    const filesUrl = parseFilesUrl(form.elements.filesUrl.value);

    const updatedMessage = await api(
      `/groups/${state.selectedGroup.id}/messages/${message.id}`,
      "PATCH",
      { content, filesUrl },
    );
    upsertMessage(updatedMessage);
  });
}

async function deleteMessage(message) {
  if (!state.selectedGroup) return;
  if (!window.confirm("Supprimer ce message ?")) return;

  const deletedMessage = await api(
    `/groups/${state.selectedGroup.id}/messages/${message.id}`,
    "DELETE",
  );
  removeMessage(deletedMessage || message);
}

function setReplyTarget(message) {
  state.replyTarget = message;
  renderReplyTarget();
  elements.messageInput.focus();
}

function clearReplyTarget() {
  state.replyTarget = null;
  renderReplyTarget();
}

function renderReplyTarget() {
  if (!state.replyTarget) {
    elements.replyTarget.classList.add("hidden");
    elements.replyTarget.innerHTML = "";
    return;
  }

  const authorName = state.replyTarget.user?.name || state.replyTarget.sender;
  elements.replyTarget.classList.remove("hidden");
  elements.replyTarget.innerHTML = `
    <div>
      <strong>Reponse a ${escapeHtml(authorName)}</strong>
      <span>${escapeHtml(truncate(state.replyTarget.content, 20))}</span>
    </div>
    <button type="button">Annuler</button>
  `;
  elements.replyTarget
    .querySelector("button")
    .addEventListener("click", clearReplyTarget);
}

function connectRealtime() {
  if (state.pusher) return state.pusher;

  if (!state.pusherKey) {
    log("Pusher key manquante, temps reel desactive.", "error");
    return null;
  }

  if (!window.Pusher) {
    log("Pusher JS n'est pas charge.", "error");
    return null;
  }

  state.pusher = new window.Pusher(state.pusherKey, {
    cluster: state.pusherCluster,
    channelAuthorization: {
      endpoint: `${state.apiBase}/pusher/auth`,
      headers: {
        Authorization: `Bearer ${state.token}`,
      },
    },
  });

  state.pusher.connection.bind("connected", () => {
    log("Pusher connecte.");
  });

  state.pusher.connection.bind("error", (error) => {
    log(`Erreur Pusher: ${JSON.stringify(error)}`, "error");
  });

  return state.pusher;
}

function subscribeToGroup(groupId) {
  const pusher = connectRealtime();
  if (!pusher) return;

  const channelName = `private-group-${groupId}`;
  if (state.activeChannelName === channelName) return;

  if (state.activeChannelName) {
    pusher.unsubscribe(state.activeChannelName);
    log(`Pusher unsubscribe ${state.activeChannelName}`);
  }

  state.activeChannelName = channelName;
  const channel = pusher.subscribe(channelName);

  channel.bind("pusher:subscription_succeeded", () => {
    log(`Pusher subscribe ${channelName}`);
  });

  channel.bind("pusher:subscription_error", (error) => {
    log(`Pusher auth refusee: ${JSON.stringify(error)}`, "error");
  });

  channel.bind("message-created", (message) => {
    log("Pusher event message-created");
    upsertMessage(normalizeRealtimePayload(message));
  });

  channel.bind("message-updated", (message) => {
    log("Pusher event message-updated");
    upsertMessage(normalizeRealtimePayload(message));
  });

  channel.bind("message-delete", (message) => {
    log("Pusher event message-delete");
    removeMessage(normalizeRealtimePayload(message));
  });

  channel.bind("message-deleted", (message) => {
    log("Pusher event message-deleted");
    removeMessage(normalizeRealtimePayload(message));
  });
}

function disconnectRealtime() {
  if (!state.pusher) return;
  state.pusher.disconnect();
  state.pusher = null;
  state.activeChannelName = null;
}

function upsertMessage(message) {
  message = normalizeRealtimePayload(message);
  if (!message?.id) return;

  const shouldStickToBottom = isNearMessagesBottom();
  const alreadyLoaded = state.messages.some((item) => item.id === message.id);
  const latestLoadedAt = state.messages.at(-1)?.sendTime;

  if (
    !alreadyLoaded &&
    latestLoadedAt &&
    new Date(message.sendTime) > new Date(latestLoadedAt)
  ) {
    state.nextMessagesFrom += 1;
  }

  state.messages = updateReplyReferences(
    mergeMessages(state.messages, [message]),
    message,
  );

  if (state.replyTarget?.id === message.id) {
    state.replyTarget = { ...state.replyTarget, ...message };
    renderReplyTarget();
  }

  renderMessages(state.messages, { scrollToBottom: shouldStickToBottom });
}

function removeMessage(message) {
  message = normalizeRealtimePayload(message);
  if (!message?.id) return;

  const shouldStickToBottom = isNearMessagesBottom();
  state.messages = removeReplyReferences(
    state.messages.filter((item) => item.id !== message.id),
    message.id,
  );

  if (state.replyTarget?.id === message.id) {
    clearReplyTarget();
  }

  renderMessages(state.messages, { scrollToBottom: shouldStickToBottom });
}

function normalizeRealtimePayload(payload) {
  if (typeof payload !== "string") return payload;
  return parseJson(payload) || payload;
}

function resetMessagesState() {
  state.messages = [];
  state.nextMessagesFrom = 0;
  state.hasMoreMessages = true;
  state.isLoadingMessages = false;
  clearReplyTarget();
}

function mergeMessages(currentMessages, nextMessages) {
  const byId = new Map();

  for (const message of currentMessages) {
    byId.set(message.id, message);
  }

  for (const message of nextMessages) {
    if (message?.id) byId.set(message.id, message);
  }

  return [...byId.values()].sort(
    (a, b) => new Date(a.sendTime) - new Date(b.sendTime),
  );
}

function updateReplyReferences(messages, updatedMessage) {
  if (!updatedMessage?.id) return messages;

  return messages.map((message) => {
    if (message.replyTo?.id !== updatedMessage.id) return message;

    return {
      ...message,
      replyTo: {
        ...message.replyTo,
        content: updatedMessage.content,
      },
    };
  });
}

function removeReplyReferences(messages, deletedMessageId) {
  return messages.map((message) => {
    if (message.replyTo?.id !== deletedMessageId) return message;

    return {
      ...message,
      replyTo: null,
    };
  });
}

function isNearMessagesBottom() {
  const remaining =
    elements.messagesList.scrollHeight -
    elements.messagesList.scrollTop -
    elements.messagesList.clientHeight;
  return remaining < 120;
}

function log(message, type = "info") {
  const line = `[${new Date().toLocaleTimeString()}] ${message}`;
  elements.logOutput.textContent += `${line}\n`;
  elements.logOutput.scrollTop = elements.logOutput.scrollHeight;
  if (type === "error") console.error(message);
}

function parseJson(text) {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function formatResponse(status, data) {
  const payload = typeof data === "string" ? data : JSON.stringify(data, null, 2);
  return `HTTP ${status}\n${payload}`;
}

function formatDate(value) {
  if (!value) return "";
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "short",
    timeStyle: "medium",
  }).format(new Date(value));
}

function truncate(value, maxLength) {
  const text = String(value ?? "").trim();
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength)}...`;
}

function renderReplyPreview(replyTo) {
  if (!replyTo?.content) return "";
  return `
    <div class="reply-preview">
      <span>${escapeHtml(truncate(replyTo.content, 20))}</span>
    </div>
  `;
}

function renderFileList(filesUrl) {
  if (!Array.isArray(filesUrl) || filesUrl.length === 0) return "";

  return `
    <div class="message-files">
      ${filesUrl
        .map((fileUrl) => `<span>${escapeHtml(fileUrl)}</span>`)
        .join("")}
    </div>
  `;
}

function parseFilesUrl(value) {
  return String(value || "")
    .split(/[,\n]/)
    .map((fileUrl) => fileUrl.trim())
    .filter(Boolean);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function renderAvatar(src, name) {
  if (src) {
    return `<img class="avatar" src="${escapeHtml(src)}" alt="${escapeHtml(name)}" />`;
  }

  return `<span class="avatar avatar-fallback">${escapeHtml(getInitials(name))}</span>`;
}

function getInitials(name) {
  const parts = String(name || "?")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("");
}

boot();

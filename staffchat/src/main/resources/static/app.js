const BACKEND_URL = "https://staffchat-backend.onrender.com";
const API_BASE = "https://staffchat-backend.onrender.com";
const WS_URL = "wss://staffchat-backend.onrender.com/ws/chat";

let currentUser = null;
let activeChat = null;
let pollTimer = null;
let chatListTimer = null;

// Views
const viewLogin = document.getElementById('view-login');
const viewMain = document.getElementById('view-main');
const viewConversation = document.getElementById('view-conversation');

// Elements
const chatListContainer = document.getElementById('chat-list-container');
const messagesStream = document.getElementById('messages-stream');
const chatTextInput = document.getElementById('chat-text-input');
const btnSendMessage = document.getElementById('btn-send-message');
const modalStartChat = document.getElementById('modal-start-chat');
const userSelectionList = document.getElementById('user-selection-list');
const modalSettings = document.getElementById('modal-settings');
const modalAddEmp = document.getElementById('modal-add-emp');
const modalGroup = document.getElementById('modal-group');
const fabAddEmp = document.getElementById('fab-add-emp');
const fabGroup = document.getElementById('fab-group');

// --- Eye Toggle on Login ---
const togglePasswordBtn = document.getElementById('toggle-password');
if (togglePasswordBtn) {
  togglePasswordBtn.addEventListener('click', (e) => {
    e.preventDefault();
    const pwdInput = document.getElementById('login-password');
    if (pwdInput) {
      pwdInput.type = pwdInput.type === 'password' ? 'text' : 'password';
    }
  });
}

// --- Deletion State (Device-only, preserved in LocalStorage) ---
function getHiddenChats() {
  if (!currentUser) return [];
  try {
    return JSON.parse(localStorage.getItem(`hiddenChats_${currentUser.empId}`) || '[]');
  } catch (e) {
    return [];
  }
}

function hideChatLocally(chatId) {
  if (!currentUser) return;
  const hidden = getHiddenChats();
  if (!hidden.includes(Number(chatId))) {
    hidden.push(Number(chatId));
    localStorage.setItem(`hiddenChats_${currentUser.empId}`, JSON.stringify(hidden));
  }
}

function restoreChatLocally(chatId) {
  if (!currentUser) return;
  let hidden = getHiddenChats();
  hidden = hidden.filter(id => id !== Number(chatId));
  localStorage.setItem(`hiddenChats_${currentUser.empId}`, JSON.stringify(hidden));
}

// --- Read / Unread Badge Helpers ---
function getLastReadCount(chatId) {
  if (!currentUser) return 0;
  return parseInt(localStorage.getItem(`lastRead_${currentUser.empId}_${chatId}`) || '0', 10);
}

function markChatAsRead(chatId, totalCount) {
  if (!currentUser) return;
  localStorage.setItem(`lastRead_${currentUser.empId}_${chatId}`, String(totalCount));
}

// --- Accurate Indian Standard Time (IST) Formatter ---
function formatDisplayTime(rawTime) {
  if (!rawTime) {
    return new Date().toLocaleTimeString('en-IN', {
      timeZone: 'Asia/Kolkata',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    }).toLowerCase();
  }

  const str = String(rawTime).trim();
  const match = str.match(/(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})/);

  if (match) {
    let hour = parseInt(match[4], 10);
    let minute = parseInt(match[5], 10);

    const currentIstHour = new Date().getHours();
    if (Math.abs(currentIstHour - hour) >= 4) {
      hour += 5;
      minute += 30;
      if (minute >= 60) {
        hour += 1;
        minute -= 60;
      }
      hour = hour % 24;
    }

    const ampm = hour >= 12 ? 'pm' : 'am';
    const dispHour = hour % 12 === 0 ? 12 : hour % 12;
    const dispMin = minute < 10 ? '0' + minute : minute;
    return `${dispHour}:${dispMin} ${ampm}`;
  }

  const d = new Date(str.replace(' ', 'T'));
  if (!isNaN(d.getTime())) {
    return d.toLocaleTimeString('en-IN', {
      timeZone: 'Asia/Kolkata',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    }).toLowerCase();
  }

  return str;
}

// --- Clean Peer Display Name (Strips Self & Double Names) ---
function getPeerDisplayName(chat) {
  if (!chat || !chat.chatName) return 'Chat';
  const name = chat.chatName.trim();
  if (chat.chatType === 'GROUP' || chat.chatType === 'DEPARTMENT') {
    return name;
  }

  if (!currentUser) return name;

  const myId = String(currentUser.empId).trim().toUpperCase();

  // Split on symbols and spaces
  const parts = name.split(/[\s↔<>\-]+/).filter(Boolean);

  // Filter out current user's ID
  const others = parts.filter(p => p.toUpperCase() !== myId);
  if (others.length > 0) {
    return others[0];
  }

  // If chat is a self-chat (Admin01 ↔ ADMIN01), show name once
  return parts[0] || myId;
}

// --- Instant UI Render from Local Cache ---
function renderChatListDOM(uniqueChats) {
  if (!chatListContainer) return;
  chatListContainer.innerHTML = '';

  if (!uniqueChats || uniqueChats.length === 0) {
    chatListContainer.innerHTML = '<p style="text-align:center; color:#888; padding:20px;">No chats yet. Tap + to start one.</p>';
    return;
  }

  uniqueChats.forEach(chat => {
    const peer = chat.peerName;
    const div = document.createElement('div');
    div.className = 'conversation-item';
    div.style.cssText = 'display:flex; justify-content:space-between; align-items:center; padding:12px 16px; border-bottom:1px solid #eee; cursor:pointer; user-select:none;';

    const badgeHtml = chat.unreadCount > 0
        ? `<span style="background:#25d366; color:#fff; border-radius:12px; padding:2px 8px; font-size:11px; font-weight:700; min-width:18px; text-align:center;">${chat.unreadCount}</span>`
        : '';

    div.innerHTML = `
      <div class="item-left" style="display:flex; align-items:center; gap:12px; pointer-events:none;">
        <div class="user-avatar-circle" style="font-size:24px;">👤</div>
        <div>
          <div class="contact-name" style="font-weight:600; font-size:15px; color:#111;">${peer}</div>
          <div style="font-size:12px; color:#777; max-width:180px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">
            ${chat.lastMsgText || 'Tap to view'}
          </div>
        </div>
      </div>
      <div class="item-right" style="display:flex; flex-direction:column; align-items:flex-end; gap:4px; pointer-events:none;">
        <span style="font-size:11px; color:#888;">${chat.lastMsgFormattedTime || ''}</span>
        ${badgeHtml}
      </div>
    `;

    let timer = null;
    div.addEventListener('pointerdown', () => {
      timer = setTimeout(() => {
        if (confirm(`Delete chat with ${peer}?`)) {
          hideChatLocally(chat.id);
          div.remove();
        }
      }, 600);
    });
    div.addEventListener('pointerup', () => {
      clearTimeout(timer);
      markChatAsRead(chat.id, chat.totalMsgs);
      openChatScreen(chat.id, peer);
    });
    div.addEventListener('pointercancel', () => clearTimeout(timer));

    chatListContainer.appendChild(div);
  });
}

function renderCachedChats() {
  if (!currentUser) return;
  try {
    const cached = localStorage.getItem(`cached_chats_${currentUser.empId}`);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed) && parsed.length > 0) {
        renderChatListDOM(parsed);
      }
    }
  } catch (e) {}
}

// --- Startup & Auth ---
window.addEventListener('DOMContentLoaded', () => {
  const token = localStorage.getItem('token');
  const role = localStorage.getItem('role');
  const empId = localStorage.getItem('empId');

  if (token && empId) {
    currentUser = { token, role: (role || '').toUpperCase(), empId: empId.toUpperCase() };

    // Group button is visible to all authenticated staff (Admin and non-Admin)
    if (fabGroup) fabGroup.classList.remove('hidden');
    if (fabAddEmp && currentUser.role === 'ADMIN') fabAddEmp.classList.remove('hidden');

    showScreen(viewMain);
    renderCachedChats(); // Instant 0ms display from local memory
    loadMyChats();
    startChatListBackgroundPolling();
  } else {
    showScreen(viewLogin);
  }
});

const formLogin = document.getElementById('form-login');
if (formLogin) {
  formLogin.addEventListener('submit', async (e) => {
    e.preventDefault();
    const rawId = document.getElementById('login-empId').value.trim();
    const employeeId = rawId.toUpperCase();
    const password = document.getElementById('login-password').value.trim();

    try {
      const res = await fetch(`${BACKEND_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Tunnel-Skip-Anti-Phishing-Page': 'true' },
        body: JSON.stringify({ employeeId, password })
      });
      if (!res.ok) throw new Error('Invalid Employee ID or Password');
      const data = await res.json();

      localStorage.setItem('token', data.token);
      localStorage.setItem('role', (data.role || '').toUpperCase());
      localStorage.setItem('empId', employeeId);
      currentUser = { token: data.token, role: (data.role || '').toUpperCase(), empId: employeeId };

      // Ensure Group button is visible to non-admin as well as admin
      if (fabGroup) fabGroup.classList.remove('hidden');
      if (fabAddEmp && currentUser.role === 'ADMIN') fabAddEmp.classList.remove('hidden');

      showScreen(viewMain);
      renderCachedChats(); // Instant 0ms display on login
      loadMyChats();
      startChatListBackgroundPolling();
    } catch (err) {
      alert(err.message);
    }
  });
}

// --- Main Chat List with Deduplication & Auto-Sorting ---
async function loadMyChats() {
  if (!currentUser || !chatListContainer) return;
  try {
    const res = await fetch(`${BACKEND_URL}/api/chats/my?employeeId=${encodeURIComponent(currentUser.empId)}`, {
      headers: { 'Authorization': `Bearer ${currentUser.token}`, 'X-Tunnel-Skip-Anti-Phishing-Page': 'true' }
    });
    if (!res.ok) return;

    const allChats = await res.json();
    const hidden = getHiddenChats();
    const visible = allChats.filter(c => !hidden.includes(Number(c.id)));

    if (visible.length === 0) {
      chatListContainer.innerHTML = '<p style="text-align:center; color:#888; padding:20px;">No chats yet. Tap + to start one.</p>';
      localStorage.setItem(`cached_chats_${currentUser.empId}`, JSON.stringify([]));
      return;
    }

    const chatsWithMeta = await Promise.all(visible.map(async (chat) => {
      try {
        const mRes = await fetch(`${BACKEND_URL}/api/messages/${chat.id}`, {
          headers: { 'Authorization': `Bearer ${currentUser.token}`, 'X-Tunnel-Skip-Anti-Phishing-Page': 'true' }
        });
        if (mRes.ok) {
          let msgs = await mRes.json();
          if (Array.isArray(msgs) && msgs.length > 0) {
            msgs.sort((a, b) => Number(a.id || 0) - Number(b.id || 0));
            const lastMsg = msgs[msgs.length - 1];
            const readCount = getLastReadCount(chat.id);

            let unread = 0;
            if (msgs.length > readCount) {
              unread = msgs.slice(readCount).filter(m => String(m.senderId).toUpperCase() !== currentUser.empId.toUpperCase()).length;
            }

            return {
              ...chat,
              totalMsgs: msgs.length,
              unreadCount: unread,
              lastMsgId: Number(lastMsg.id || 0),
              lastMsgText: lastMsg.content || lastMsg.message || '',
              lastMsgFormattedTime: formatDisplayTime(lastMsg.sentAt)
            };
          }
        }
      } catch (e) {}
      return { ...chat, totalMsgs: 0, unreadCount: 0, lastMsgId: 0, lastMsgText: '', lastMsgFormattedTime: '' };
    }));

    // Auto-sort by latest message ID so active conversations move to top
    chatsWithMeta.sort((a, b) => (b.lastMsgId || 0) - (a.lastMsgId || 0));

    // Deduplicate by peer name so duplicate entries never show twice
    const seenPeers = new Set();
    const uniqueChats = [];
    for (const chat of chatsWithMeta) {
      const peer = getPeerDisplayName(chat);
      if (!seenPeers.has(peer.toUpperCase())) {
        seenPeers.add(peer.toUpperCase());
        uniqueChats.push({ ...chat, peerName: peer });
      }
    }

    // Save to local cache for instant 0ms load on next login/refresh
    localStorage.setItem(`cached_chats_${currentUser.empId}`, JSON.stringify(uniqueChats));

    renderChatListDOM(uniqueChats);
  } catch (err) {
    console.error('Error loading chats:', err);
  }
}

function startChatListBackgroundPolling() {
  if (chatListTimer) clearInterval(chatListTimer);
  chatListTimer = setInterval(() => {
    if (viewMain && !viewMain.classList.contains('hidden') && currentUser) {
      loadMyChats();
    }
  }, 3000);
}

// --- Member Selection Modal (+) ---
const btnFabStartChat = document.getElementById('fab-start-chat');
if (btnFabStartChat) {
  btnFabStartChat.addEventListener('click', async () => {
    if (modalStartChat) modalStartChat.classList.remove('hidden');
    if (userSelectionList) userSelectionList.innerHTML = '<p style="padding:12px; color:#888;">Loading staff...</p>';

    try {
      const res = await fetch(`${BACKEND_URL}/api/employees`, {
        headers: { 'Authorization': `Bearer ${currentUser.token}`, 'X-Tunnel-Skip-Anti-Phishing-Page': 'true' }
      });
      const users = await res.json();
      if (!userSelectionList) return;
      userSelectionList.innerHTML = '';

      if (!Array.isArray(users) || users.length === 0) {
        userSelectionList.innerHTML = '<p style="padding:12px; color:#666;">No employees found.</p>';
        return;
      }

      users.forEach(u => {
        const id = String(u.employeeId || u.id).trim();
        if (id.toUpperCase() === currentUser.empId.toUpperCase()) return;

        const row = document.createElement('div');
        row.style.cssText = 'padding:14px 12px; border-bottom:1px solid #eee; cursor:pointer; font-size:14px;';
        row.innerHTML = `<b>${id}</b> — ${u.fullName || u.username || ''}`;

        row.onclick = () => onSelectMemberToChat(id);
        userSelectionList.appendChild(row);
      });
    } catch (err) {
      if (userSelectionList) userSelectionList.innerHTML = `<p style="padding:12px; color:red;">Failed to load: ${err.message}</p>`;
    }
  });
}

async function onSelectMemberToChat(targetEmpId) {
  if (modalStartChat) modalStartChat.classList.add('hidden');

  try {
    const res = await fetch(`${BACKEND_URL}/api/chats/private?employeeId1=${encodeURIComponent(currentUser.empId)}&employeeId2=${encodeURIComponent(targetEmpId)}`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${currentUser.token}`, 'X-Tunnel-Skip-Anti-Phishing-Page': 'true' }
    });

    if (!res.ok) throw new Error(`Server returned ${res.status}`);
    const chat = await res.json();

    restoreChatLocally(chat.id);
    loadMyChats();
    openChatScreen(chat.id, targetEmpId);
  } catch (err) {
    alert(`Could not start chat: ${err.message}`);
  }
}

// --- Active Chat Room & Message Display ---
function openChatScreen(chatId, title) {
  activeChat = { id: chatId, name: title };
  const titleEl = document.getElementById('active-chat-name');
  if (titleEl) titleEl.textContent = title;
  if (messagesStream) messagesStream.innerHTML = '';
  showScreen(viewConversation);

  fetchMessages();
  if (pollTimer) clearInterval(pollTimer);
  pollTimer = setInterval(fetchMessages, 2000);
}

async function fetchMessages() {
  if (!activeChat || !messagesStream) return;
  try {
    const res = await fetch(`${BACKEND_URL}/api/messages/${activeChat.id}`, {
      headers: { 'Authorization': `Bearer ${currentUser.token}`, 'X-Tunnel-Skip-Anti-Phishing-Page': 'true' }
    });
    if (!res.ok) return;

    let msgs = await res.json();
    if (!Array.isArray(msgs)) return;

    // Strict sequential ID sorting: guaranteed chronological order
    msgs.sort((a, b) => Number(a.id || 0) - Number(b.id || 0));

    markChatAsRead(activeChat.id, msgs.length);

    messagesStream.innerHTML = '';
    msgs.forEach(m => {
      const isMine = String(m.senderId).toUpperCase() === currentUser.empId.toUpperCase();
      const displayTime = formatDisplayTime(m.sentAt);

      const div = document.createElement('div');
      div.className = `bubble-row ${isMine ? 'outgoing' : 'incoming'}`;
      div.innerHTML = `
        <div class="chat-bubble ${isMine ? 'outgoing' : 'incoming'}" style="position:relative; display:inline-block; max-width:75%; padding:8px 12px; margin:4px 0; border-radius:8px;">
          <div style="word-break:break-word; color:#111;">${m.content || m.message || ''}</div>
          <div class="bubble-time" style="font-size:10px; color:${isMine ? '#2e6b2e' : '#666'}; text-align:right; margin-top:3px; font-weight:600;">
            ${displayTime}
          </div>
        </div>
      `;
      messagesStream.appendChild(div);
    });

    messagesStream.scrollTop = messagesStream.scrollHeight;
  } catch (err) {
    console.error('Polling error:', err);
  }
}

if (btnSendMessage) {
  btnSendMessage.addEventListener('click', async () => {
    const text = chatTextInput.value.trim();
    if (!text || !activeChat) return;
    chatTextInput.value = '';

    await fetch(`${BACKEND_URL}/api/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${currentUser.token}`, 'X-Tunnel-Skip-Anti-Phishing-Page': 'true' },
      body: JSON.stringify({
        chatId: activeChat.id,
        senderId: currentUser.empId,
        content: text
      })
    });

    await fetchMessages();
  });
}

if (chatTextInput) {
  chatTextInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      btnSendMessage.click();
    }
  });
}

// --- Navigation & Modals ---
const btnBackToList = document.getElementById('btn-back-to-list');
if (btnBackToList) {
  btnBackToList.addEventListener('click', () => {
    if (pollTimer) clearInterval(pollTimer);
    activeChat = null;
    showScreen(viewMain);
    loadMyChats();
  });
}

const btnCancelStartChat = document.getElementById('btn-cancel-start-chat');
if (btnCancelStartChat) {
  btnCancelStartChat.addEventListener('click', () => {
    if (modalStartChat) modalStartChat.classList.add('hidden');
  });
}

const btnSettingsGear = document.getElementById('btn-settings-gear');
if (btnSettingsGear) {
  btnSettingsGear.addEventListener('click', () => {
    if (modalSettings) modalSettings.classList.remove('hidden');
  });
}

const btnLogout = document.getElementById('btn-logout');
if (btnLogout) {
  btnLogout.addEventListener('click', () => {
    if (pollTimer) clearInterval(pollTimer);
    if (chatListTimer) clearInterval(chatListTimer);
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('empId');
    currentUser = null;
    if (modalSettings) modalSettings.classList.add('hidden');
    showScreen(viewLogin);
  });
}

if (fabAddEmp) {
  fabAddEmp.addEventListener('click', () => {
    if (modalAddEmp) modalAddEmp.classList.remove('hidden');
  });
}

if (fabGroup) {
  fabGroup.addEventListener('click', () => {
    if (modalGroup) modalGroup.classList.remove('hidden');
  });
}

const btnCancelAddEmp = document.getElementById('btn-cancel-add-emp');
if (btnCancelAddEmp) {
  btnCancelAddEmp.addEventListener('click', () => {
    if (modalAddEmp) modalAddEmp.classList.add('hidden');
  });
}

const btnCancelGroup = document.getElementById('btn-cancel-group');
if (btnCancelGroup) {
  btnCancelGroup.addEventListener('click', () => {
    if (modalGroup) modalGroup.classList.add('hidden');
  });
}

function showScreen(screen) {
  if (viewLogin) viewLogin.classList.add('hidden');
  if (viewMain) viewMain.classList.add('hidden');
  if (viewConversation) viewConversation.classList.add('hidden');
  if (screen) screen.classList.remove('hidden');
}
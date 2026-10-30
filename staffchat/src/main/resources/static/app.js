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

// --- Read / Unread Tracking (Persistent by Highest Message ID & Read Count) ---
function getLastReadMsgId(chatId) {
  if (!currentUser) return null;
  const val = localStorage.getItem(`lastReadMsgId_${currentUser.empId}_${chatId}`);
  return val !== null ? parseInt(val, 10) : null;
}

function markChatAsRead(chatId, highestMsgId) {
  if (!currentUser) return;
  if (highestMsgId !== undefined && highestMsgId !== null) {
    localStorage.setItem(`lastReadMsgId_${currentUser.empId}_${chatId}`, String(highestMsgId));
  }
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
  const parts = name.split(/[\s↔<>\-]+/).filter(Boolean);
  const others = parts.filter(p => p.toUpperCase() !== myId);
  if (others.length > 0) {
    return others[0];
  }
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
      markChatAsRead(chat.id, chat.lastMsgId);
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

    // Group button visible for all authenticated staff
    if (fabGroup) fabGroup.classList.remove('hidden');
    if (fabAddEmp && currentUser.role === 'ADMIN') fabAddEmp.classList.remove('hidden');

    showScreen(viewMain);
    renderCachedChats();
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

      if (fabGroup) fabGroup.classList.remove('hidden');
      if (fabAddEmp && currentUser.role === 'ADMIN') fabAddEmp.classList.remove('hidden');

      showScreen(viewMain);
      renderCachedChats();
      loadMyChats();
      startChatListBackgroundPolling();
    } catch (err) {
      alert(err.message);
    }
  });
}

// --- Main Chat List with Accurate Unread Resolution ---
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
            const lastMsgId = Number(lastMsg.id || 0);

            let lastReadId = getLastReadMsgId(chat.id);

            // On first discovery, assume past history is already seen (no phantom badge)
            if (lastReadId === null) {
              markChatAsRead(chat.id, lastMsgId);
              lastReadId = lastMsgId;
            }

            // Only count incoming messages newer than last seen message ID
            let unread = 0;
            if (lastReadId !== null) {
              unread = msgs.filter(m =>
                  Number(m.id || 0) > lastReadId &&
                  String(m.senderId).toUpperCase() !== currentUser.empId.toUpperCase()
              ).length;
            }

            return {
              ...chat,
              totalMsgs: msgs.length,
              unreadCount: unread,
              lastMsgId: lastMsgId,
              lastMsgText: lastMsg.content || lastMsg.message || '',
              lastMsgFormattedTime: formatDisplayTime(lastMsg.sentAt)
            };
          }
        }
      } catch (e) {}
      return { ...chat, totalMsgs: 0, unreadCount: 0, lastMsgId: 0, lastMsgText: '', lastMsgFormattedTime: '' };
    }));

    // Auto-sort by latest message ID
    chatsWithMeta.sort((a, b) => (b.lastMsgId || 0) - (a.lastMsgId || 0));

    // Deduplicate by peer name
    const seenPeers = new Set();
    const uniqueChats = [];
    for (const chat of chatsWithMeta) {
      const peer = getPeerDisplayName(chat);
      if (!seenPeers.has(peer.toUpperCase())) {
        seenPeers.add(peer.toUpperCase());
        uniqueChats.push({ ...chat, peerName: peer });
      }
    }

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

// --- Multi-Step Group Creation Flow (Name -> Checkbox Selection with Self Default) ---
if (fabGroup) {
  fabGroup.addEventListener('click', () => {
    if (!modalGroup) return;
    modalGroup.classList.remove('hidden');

    // Step 1: Input Group Name
    modalGroup.innerHTML = `
      <div style="background:#fff; border-radius:12px; padding:20px; width:90%; max-width:400px; margin:40px auto; box-shadow:0 4px 16px rgba(0,0,0,0.2);">
        <h3 style="margin-top:0; font-size:17px; font-weight:700;">Create New Group</h3>
        <input type="text" id="grp-name-input" placeholder="Enter group name..." style="width:100%; padding:10px; border:1px solid #ccc; border-radius:6px; box-sizing:border-box; margin-bottom:16px; font-size:14px;" />
        <div style="display:flex; justify-content:flex-end; gap:10px;">
          <button id="grp-btn-cancel" style="padding:8px 16px; border:none; background:#eee; border-radius:6px; cursor:pointer;">Cancel</button>
          <button id="grp-btn-next" style="padding:8px 16px; border:none; background:#008069; color:#fff; border-radius:6px; font-weight:600; cursor:pointer;">Next</button>
        </div>
      </div>
    `;

    document.getElementById('grp-btn-cancel').onclick = () => modalGroup.classList.add('hidden');
    document.getElementById('grp-btn-next').onclick = () => {
      const gName = document.getElementById('grp-name-input').value.trim();
      if (!gName) {
        alert('Please enter a group name');
        return;
      }
      openGroupMemberSelection(gName);
    };
  });
}

async function openGroupMemberSelection(groupName) {
  if (!modalGroup) return;

  // Step 2: Native Android style member selection dialog
  modalGroup.innerHTML = `
    <div style="background:#fff; border-radius:14px; padding:24px 20px 16px 20px; width:88%; max-width:380px; margin:60px auto; box-shadow:0 8px 30px rgba(0,0,0,0.3); display:flex; flex-direction:column; font-family:sans-serif;">
      <h3 style="margin:0 0 18px 0; font-size:17px; font-weight:700; color:#111;">Add members to ${groupName}</h3>
      
      <div id="grp-members-container" style="overflow-y:auto; max-height:280px; margin-bottom:20px; display:flex; flex-direction:column; gap:4px;">
        <p style="color:#888; font-size:14px; text-align:center; padding:10px 0;">Loading members...</p>
      </div>

      <div style="display:flex; justify-content:flex-end; align-items:center; gap:20px; padding-top:8px;">
        <button id="grp-member-cancel" style="border:none; background:transparent; color:#008069; font-weight:700; font-size:13px; letter-spacing:0.5px; cursor:pointer; padding:6px 8px;">CANCEL</button>
        <button id="grp-member-create" style="border:none; background:transparent; color:#008069; font-weight:700; font-size:13px; letter-spacing:0.5px; cursor:pointer; padding:6px 8px;">CREATE</button>
      </div>
    </div>
  `;

  document.getElementById('grp-member-cancel').onclick = () => modalGroup.classList.add('hidden');

  const membersBox = document.getElementById('grp-members-container');

  try {
    const res = await fetch(`${BACKEND_URL}/api/employees`, {
      headers: { 'Authorization': `Bearer ${currentUser.token}`, 'X-Tunnel-Skip-Anti-Phishing-Page': 'true' }
    });
    const users = await res.json();
    membersBox.innerHTML = '';

    const selectedMembers = new Set([currentUser.empId.toUpperCase()]);

    if (Array.isArray(users)) {
      users.forEach(u => {
        const id = String(u.employeeId || u.id || '').trim().toUpperCase();
        if (!id) return;

        const isSelf = id === currentUser.empId.toUpperCase();
        const displayName = u.fullName || u.name || u.username || (isSelf ? 'Hospital Admin' : '');
        const labelText = displayName ? `${id} — ${displayName}` : id;

        const row = document.createElement('label');
        row.style.cssText = 'display:flex; align-items:center; gap:16px; padding:10px 4px; cursor:pointer; user-select:none;';

        const chk = document.createElement('input');
        chk.type = 'checkbox';
        chk.value = id;
        chk.style.cssText = 'width:18px; height:18px; accent-color:#008069; cursor:pointer;';

        if (isSelf) {
          chk.checked = true;
          chk.disabled = true; // Creator is pre-checked by default
        } else {
          chk.onchange = (e) => {
            if (e.target.checked) selectedMembers.add(id);
            else selectedMembers.delete(id);
          };
        }

        const span = document.createElement('span');
        span.style.cssText = 'font-size:14px; color:#222; font-weight:500;';
        span.textContent = labelText;

        row.appendChild(chk);
        row.appendChild(span);
        membersBox.appendChild(row);
      });
    }

    document.getElementById('grp-member-create').onclick = async () => {
      const memberList = Array.from(selectedMembers);
      try {
        const createRes = await fetch(`${BACKEND_URL}/api/chats/group`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${currentUser.token}`,
            'X-Tunnel-Skip-Anti-Phishing-Page': 'true'
          },
          body: JSON.stringify({
            groupName: groupName,
            creatorId: currentUser.empId,
            memberIds: memberList
          })
        });

        if (!createRes.ok) throw new Error(`Server returned ${createRes.status}`);
        const newGroup = await createRes.json();

        modalGroup.classList.add('hidden');
        loadMyChats();
        openChatScreen(newGroup.id, groupName);
      } catch (err) {
        alert(`Failed to create group: ${err.message}`);
      }
    };

  } catch (err) {
    membersBox.innerHTML = `<p style="color:red; font-size:13px; text-align:center;">Failed to load employees: ${err.message}</p>`;
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

    msgs.sort((a, b) => Number(a.id || 0) - Number(b.id || 0));

    if (msgs.length > 0) {
      const highestId = Number(msgs[msgs.length - 1].id || 0);
      markChatAsRead(activeChat.id, highestId);
    }

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

const btnCancelAddEmp = document.getElementById('btn-cancel-add-emp');
if (btnCancelAddEmp) {
  btnCancelAddEmp.addEventListener('click', () => {
    if (modalAddEmp) modalAddEmp.classList.add('hidden');
  });
}

function showScreen(screen) {
  if (viewLogin) viewLogin.classList.add('hidden');
  if (viewMain) viewMain.classList.add('hidden');
  if (viewConversation) viewConversation.classList.add('hidden');
  if (screen) screen.classList.remove('hidden');
}
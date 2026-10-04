const socket = io();

// --- Elements ---
const form       = document.getElementById('msg-form');
const nicknameIn = document.getElementById('nickname');
const gradeIn    = document.getElementById('grade');
const sectionIn  = document.getElementById('section');
const messageIn  = document.getElementById('message');
const charCount  = document.getElementById('char-count');
const container  = document.getElementById('messages-container');
const emptyState = document.getElementById('empty-state');
const tabs       = document.querySelectorAll('.tab');

let currentChannel = 'General';

// --- Character Counter ---
messageIn.addEventListener('input', () => {
  charCount.textContent = `${messageIn.value.length}/500`;
});

// --- Channel Tabs ---
tabs.forEach(tab => {
  tab.addEventListener('click', () => {
    tabs.forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    currentChannel = tab.dataset.channel;
    container.innerHTML = '<p id="empty-state">Loading...</p>';
    socket.emit('join-channel', currentChannel);
  });
});

// --- Send Message ---
form.addEventListener('submit', (e) => {
  e.preventDefault();
  const text = messageIn.value.trim();
  if (!text) return;

  socket.emit('send-message', {
    nickname: nicknameIn.value.trim(),
    grade:    gradeIn.value,
    section:  sectionIn.value,
    channel:  currentChannel,
    message:  text
  });

  messageIn.value = '';
  charCount.textContent = '0/500';
});

// --- Render a single message ---
function renderMessage(msg) {
  // Hide empty state
  const empty = document.getElementById('empty-state');
  if (empty) empty.remove();

  const card = document.createElement('div');
  card.className = 'msg-card';

  const time = new Date(msg.timestamp).toLocaleString();
  const nick = msg.nickname || 'Anonymous';
  const grade = msg.grade && msg.grade !== 'N/A' ? msg.grade : '';
  const section = msg.section && msg.section !== 'N/A' ? msg.section : '';

  let tags = '';
  if (grade) tags += `<span class="msg-tag">${grade}</span>`;
  if (section) tags += `<span class="msg-tag">Sec ${section}</span>`;

  card.innerHTML = `
    <div class="msg-header">
      <span class="msg-nickname">${escapeHtml(nick)}</span>
      ${tags}
      <span class="msg-time">${time}</span>
    </div>
    <div class="msg-body">${escapeHtml(msg.message)}</div>
  `;

  // Newest on top
  container.prepend(card);
}

// --- Socket Listeners ---
socket.on('load-messages', (messages) => {
  container.innerHTML = '';
  if (messages.length === 0) {
    container.innerHTML = '<p id="empty-state">No messages yet. Be the first!</p>';
    return;
  }
  // Messages come newest-first from server, reverse for prepend
  messages.reverse().forEach(msg => renderMessage(msg));
});

socket.on('new-message', (msg) => {
  if (msg.channel === currentChannel) {
    renderMessage(msg);
  }
});

// --- Security: escape HTML ---
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// --- Join default channel on load ---
socket.emit('join-channel', currentChannel);
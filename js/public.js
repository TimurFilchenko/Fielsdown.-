/* =============================================================================
   PUBLIC.JS — Общество Fielsdown
   Отображает: всех пользователей, все доски, все публикации
   Работает как центр социальной сети — без бэкенда, на localStorage.
   ============================================================================= */

// === Константы ===
const USERS_KEY = 'fielsdown_users_v1';
const BOARDS_KEY = 'fielsdown_boards_v1';
const POSTS_KEY = 'fielsdown_posts_v2';
const DEFAULT_AVATAR = 'https://static.cdninstagram.com/rsrc.php/v3/yo/r/qhYsMwhQJy-.png';

// === Вспомогательные функции ===

function safeGet(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now - date;
  const diffHours = diffMs / (1000 * 60 * 60);
  
  if (diffHours < 1) return 'только что';
  if (diffHours < 24) return 'сегодня';
  if (diffHours < 48) return 'вчера';
  return date.toLocaleDateString('ru-RU', { day: '2-digit', month: 'short' });
}

// === Отображение пользователей ===
function renderUsers() {
  const users = safeGet(USERS_KEY) || {};
  const userList = Object.values(users);
  
  if (userList.length === 0) {
    return '<div class="section"><p style="color:#666;text-align:center;padding:40px;">Пользователей пока нет.</p></div>';
  }

  // Сортировка: новые выше
  userList.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const html = userList.map(user => `
    <div class="user-card">
      <a href="/profile.html?user=${encodeURIComponent(user.username)}" style="text-decoration:none;color:inherit;display:flex;align-items:center;">
        <img src="${user.avatar || DEFAULT_AVATAR}" class="user-avatar" onerror="this.src='${DEFAULT_AVATAR}'">
        <strong>b/${user.username}</strong>
      </a>
      <div style="font-size:13px;color:#666;margin-top:6px;">
        Зарегистрирован: ${formatDate(user.createdAt)}
      </div>
    </div>
  `).join('');

  return `
    <div class="section">
      <h2>Все пользователи (${userList.length})</h2>
      <div class="grid" style="grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));">
        ${html}
      </div>
    </div>
  `;
}

// === Отображение досок ===
function renderBoards() {
  const boards = safeGet(BOARDS_KEY) || [];
  
  if (boards.length === 0) {
    return '<div class="section"><p style="color:#666;text-align:center;padding:40px;">Досок пока нет.</p></div>';
  }

  boards.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const html = boards.map(board => `
    <div class="board-card">
      <a href="/board.html?b=${encodeURIComponent(board.name)}" style="text-decoration:none;color:inherit;font-weight:bold;font-size:18px;">
        <span class="board-prefix">b/</span>${board.name}
      </a>
      <p style="margin:8px 0;color:#666;">${board.description || 'Без описания.'}</p>
      <div style="font-size:13px;color:#666;">
        by b/${board.creator || 'anonymous'} • ${formatDate(board.createdAt)}
      </div>
    </div>
  `).join('');

  return `
    <div class="section">
      <h2>Все доски (${boards.length})</h2>
      <div class="grid" style="grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));">
        ${html}
      </div>
    </div>
  `;
}

// === Отображение постов ===
function renderPosts() {
  const posts = safeGet(POSTS_KEY) || [];
  
  if (posts.length === 0) {
    return '<div class="section"><p style="color:#666;text-align:center;padding:40px;">Публикаций пока нет.</p></div>';
  }

  // Сортировка: новые выше
  const sortedPosts = [...posts].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const html = sortedPosts.map(post => `
    <div class="post-card">
      <div style="display:flex;align-items:center;margin-bottom:10px;">
        <a href="/profile.html?user=${encodeURIComponent(post.author)}" style="text-decoration:none;color:inherit;">
          <img src="${post.avatar || DEFAULT_AVATAR}" class="user-avatar" onerror="this.src='${DEFAULT_AVATAR}'">
          <strong>b/${post.author || 'anonymous'}</strong>
        </a>
      </div>
      <div class="post-content">${post.content || ''}</div>
      ${post.mediaUrl ? (
        post.mediaType?.startsWith('image/') ?
          `<img src="${post.mediaUrl}" style="max-width:100%;border-radius:8px;margin-top:10px;">` :
        post.mediaType?.startsWith('video/') ?
          `<video controls style="width:100%;border-radius:8px;margin-top:10px;"><source src="${post.mediaUrl}" type="${post.mediaType}"></video>` :
        ''
      ) : ''}
      <div class="post-meta">
        в доске <a href="/board.html?b=${encodeURIComponent(post.board)}" style="color:#0077ff;">b/${post.board}</a> • ${formatDate(post.createdAt)}
      </div>
    </div>
  `).join('');

  return `
    <div class="section">
      <h2>Последние публикации (${posts.length})</h2>
      <div class="grid" style="grid-template-columns: 1fr;">
        ${html}
      </div>
    </div>
  `;
}

// === Инициализация ===
document.addEventListener('DOMContentLoaded', () => {
  const content = document.getElementById('content');
  const tabs = document.querySelectorAll('.tab');

  let currentTab = 'users';
  content.innerHTML = renderUsers();

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      currentTab = tab.getAttribute('data-tab');

      if (currentTab === 'users') {
        content.innerHTML = renderUsers();
      } else if (currentTab === 'boards') {
        content.innerHTML = renderBoards();
      } else if (currentTab === 'posts') {
        content.innerHTML = renderPosts();
      }
    });
  });
});

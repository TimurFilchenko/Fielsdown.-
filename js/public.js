/* =============================================================================
   PUBLIC.JS — Глобальное общество Fielsdown
   Подключается ко всем страницам. Добавляет блок "Общество" внизу.
   Показывает: всех пользователей, все доски — в одном месте.
   ============================================================================= */

(function () {
  // Не запускаем на страницах регистрации/входа
  const currentPath = window.location.pathname;
  if (currentPath.includes('register.html') || currentPath.includes('login.html')) {
    return;
  }

  // Ждём полной загрузки DOM
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPublicSection);
  } else {
    initPublicSection();
  }

  function initPublicSection() {
    // Создаём контейнер для общества
    const publicSection = document.createElement('div');
    publicSection.id = 'fielsdown-public-section';
    publicSection.style.cssText = `
      margin-top: 60px;
      padding: 30px 0;
      border-top: 1px solid #e0e0e0;
      background: #fafafa;
    `;

    publicSection.innerHTML = `
      <div class="container" style="max-width: 1000px; margin: 0 auto; padding: 0 20px;">
        <h2 style="font-size: 24px; color: #0077ff; margin-bottom: 24px; text-align: center;">
          🌍 Общество Fielsdown
        </h2>
        <div style="display: flex; gap: 30px; flex-wrap: wrap;">
          <!-- Пользователи -->
          <div style="flex: 1; min-width: 300px;">
            <h3 style="font-size: 18px; margin-bottom: 16px; color: #121212;">Пользователи</h3>
            <div id="public-users-list" style="display: grid; gap: 12px;"></div>
          </div>
          <!-- Доски -->
          <div style="flex: 1; min-width: 300px;">
            <h3 style="font-size: 18px; margin-bottom: 16px; color: #121212;">Доски сообщества</h3>
            <div id="public-boards-list" style="display: grid; gap: 12px;"></div>
          </div>
        </div>
      </div>
    `;

    // Вставляем перед </body>
    document.body.appendChild(publicSection);

    // Загружаем данные
    loadPublicData();
  }

  // === Загрузка данных ===
  function loadPublicData() {
    loadUsers();
    loadBoards();
  }

  function safeGet(key) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  const DEFAULT_AVATAR = 'https://static.cdninstagram.com/rsrc.php/v3/yo/r/qhYsMwhQJy-.png';

  function formatDate(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const diffHours = (Date.now() - date) / (1000 * 60 * 60);
    if (diffHours < 24) return 'сегодня';
    if (diffHours < 48) return 'вчера';
    return date.toLocaleDateString('ru-RU', { day: '2-digit', month: 'short' });
  }

  // === Пользователи ===
  function loadUsers() {
    const users = safeGet('fielsdown_users_v1') || {};
    const userList = Object.values(users);
    const container = document.getElementById('public-users-list');

    if (userList.length === 0) {
      container.innerHTML = '<p style="color:#666;font-style:italic;">Пока нет пользователей.</p>';
      return;
    }

    // Сортировка: новые выше
    userList.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    const html = userList.map(user => `
      <div style="
        display: flex;
        align-items: center;
        padding: 10px;
        background: white;
        border: 1px solid #e0e0e0;
        border-radius: 8px;
      ">
        <a href="/profile.html?user=${encodeURIComponent(user.username)}" style="text-decoration:none;">
          <img 
            src="${user.avatar || DEFAULT_AVATAR}" 
            style="width:32px;height:32px;border-radius:50%;object-fit:cover;"
            onerror="this.src='${DEFAULT_AVATAR}'"
          >
        </a>
        <div style="margin-left:12px;">
          <div style="font-weight:600;color:#0077ff;font-size:15px;">
            b/${user.username}
          </div>
          <div style="font-size:12px;color:#666;">${formatDate(user.createdAt)}</div>
        </div>
      </div>
    `).join('');

    container.innerHTML = html;
  }

  // === Доски ===
  function loadBoards() {
    const boards = safeGet('fielsdown_boards_v1') || [];
    const container = document.getElementById('public-boards-list');

    if (boards.length === 0) {
      container.innerHTML = '<p style="color:#666;font-style:italic;">Пока нет досок.</p>';
      return;
    }

    boards.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    const html = boards.map(board => `
      <div style="
        padding: 12px;
        background: white;
        border: 1px solid #e0e0e0;
        border-radius: 8px;
      ">
        <a 
          href="/board.html?b=${encodeURIComponent(board.name)}" 
          style="text-decoration:none;font-weight:bold;color:#0077ff;font-size:16px;"
        >
          b/${board.name}
        </a>
        <p style="margin:8px 0 6px 0;color:#121212;font-size:14px;">${board.description || 'Без описания.'}</p>
        <div style="font-size:12px;color:#666;">
          by b/${board.creator || 'anonymous'} • ${formatDate(board.createdAt)}
        </div>
      </div>
    `).join('');

    container.innerHTML = html;
  }
})();

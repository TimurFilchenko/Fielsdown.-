
/* =============================================================================
   MAIN.JS — ПОЛНАЯ ВЕРСИЯ
   Управление главной страницей, аватаркой, досками
   ============================================================================= */

// === Константы ===
const BOARDS_STORAGE_KEY = 'fielsdown_boards_v1';
const SESSION_KEY = 'fielsdown_session_v1';
const DEFAULT_AVATAR = 'https://static.cdninstagram.com/rsrc.php/v3/yo/r/qhYsMwhQJy-.png';

// === Вспомогательные функции ===

/**
 * Безопасное получение досок из localStorage
 * @returns {Array}
 */
function getBoardsFromStorage() {
  try {
    const data = localStorage.getItem(BOARDS_STORAGE_KEY);
    if (!data) return [];
    return JSON.parse(data);
  } catch (error) {
    console.error('Ошибка при загрузке досок:', error);
    return [];
  }
}

/**
 * Безопасное получение сессии
 * @returns {Object|null}
 */
function getSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw);
    return (session && typeof session === 'object' && session.isLoggedIn) ? session : null;
  } catch (error) {
    console.error('Ошибка при загрузке сессии:', error);
    localStorage.removeItem(SESSION_KEY); // Очистка повреждённой сессии
    return null;
  }
}

/**
 * Форматирование даты для отображения
 * @param {string} isoString
 * @returns {string}
 */
function formatDateForDisplay(isoString) {
  if (!isoString) return '—';
  const date = new Date(isoString);
  const now = new Date();
  const diffInHours = (now - date) / (1000 * 60 * 60);
  
  if (diffInHours < 1) return 'только что';
  if (diffInHours < 24) return `сегодня`;
  if (diffInHours < 48) return `вчера`;
  
  return date.toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: 'short'
  });
}

/**
 * Обновление блока авторизации в шапке
 */
function updateAuthSection() {
  const authSection = document.getElementById('auth-section');
  if (!authSection) return;

  const session = getSession();

  if (session && session.isLoggedIn) {
    const avatarUrl = session.avatar || DEFAULT_AVATAR;
    const username = session.username || 'user';

    authSection.innerHTML = `
      <div class="user-menu" onclick="window.location.href='/profile.html'" style="
        display: flex;
        align-items: center;
        gap: 12px;
        cursor: pointer;
      ">
        <img 
          src="${avatarUrl}" 
          alt="Аватар ${username}" 
          class="user-avatar"
          style="
            width: 36px;
            height: 36px;
            border-radius: 50%;
            object-fit: cover;
            border: 2px solid #e0e0e0;
            background: #f5f5f5;
            transition: all 0.24s cubic-bezier(0.33, 0, 0.67, 0.33);
          "
          onerror="this.src='${DEFAULT_AVATAR}'"
        >
        <span class="user-nick" style="
          font-weight: 600;
          color: #121212;
          font-size: 15px;
        ">b/${username}</span>
      </div>
    `;
  } else {
    authSection.innerHTML = `
      <div class="auth-actions" style="display: flex; gap: 12px;">
        <a href="/register.html" class="btn btn-secondary" style="
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 8px 16px;
          border-radius: 8px;
          font-weight: 600;
          font-size: 14px;
          text-decoration: none;
          cursor: pointer;
          border: 1px solid #e0e0e0;
          background: #fafafa;
          color: #121212;
          transition: all 0.24s cubic-bezier(0.33, 0, 0.67, 0.33);
        ">Регистрация</a>
        <a href="/login.html" class="btn btn-secondary" style="
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 8px 16px;
          border-radius: 8px;
          font-weight: 600;
          font-size: 14px;
          text-decoration: none;
          cursor: pointer;
          border: 1px solid #e0e0e0;
          background: #fafafa;
          color: #121212;
          transition: all 0.24s cubic-bezier(0.33, 0, 0.67, 0.33);
        ">Вход</a>
      </div>
    `;
  }
}

/**
 * Отображение досок на главной странице
 */
function renderBoardsOnIndex() {
  const container = document.getElementById('boards-container');
  if (!container) return;

  const boards = getBoardsFromStorage();
  const session = getSession();
  const currentUsername = session?.username || null;

  // Если есть сохранённые доски — заменяем контейнер
  if (boards.length > 0) {
    // Сортировка: новые выше
    const sortedBoards = [...boards].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    let html = '';

    sortedBoards.forEach(board => {
      const isOwner = currentUsername && board.creator === currentUsername;
      const isNew = (Date.now() - new Date(board.createdAt)) < 24 * 60 * 60 * 1000;

      html += `
        <div class="board-card" style="
          background: #fafafa;
          border: 1px solid #e0e0e0;
          border-radius: 12px;
          padding: 16px;
          transition: all 0.24s cubic-bezier(0.33, 0, 0.67, 0.33);
          text-decoration: none;
          display: block;
        ">
          <a href="/board.html?b=${encodeURIComponent(board.name)}" class="board-link" style="
            display: block;
            font-size: 18px;
            font-weight: 700;
            margin-bottom: 6px;
            color: #121212;
            text-decoration: none;
          ">
            <span class="board-prefix" style="color: #0077ff; font-weight: 800;">b/</span>${board.name}
            ${isNew ? '<span style="background: #ff6b6b; color: white; font-size: 11px; padding: 2px 6px; border-radius: 10px; margin-left: 8px;">НОВАЯ</span>' : ''}
            ${isOwner ? '<span style="background: #4caf50; color: white; font-size: 11px; padding: 2px 6px; border-radius: 10px; margin-left: 8px;">МОЯ</span>' : ''}
          </a>
          <p class="board-desc" style="
            font-size: 14px;
            color: #666666;
            line-height: 1.5;
          ">${board.description || 'Без описания.'}</p>
          <div style="
            display: flex;
            justify-content: space-between;
            font-size: 12px;
            color: #999999;
            margin-top: 8px;
          ">
            <span>by ${board.creator}</span>
            <span>${formatDateForDisplay(board.createdAt)}</span>
          </div>
        </div>
      `;
    });

    // Кнопка создания
    html += `
      <a href="/thread.html?mode=create-board" class="board-card board-create" style="
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        color: #999999;
        font-weight: 600;
        font-size: 18px;
        text-decoration: none;
        background: #fafafa;
        border: 1px solid #e0e0e0;
        border-radius: 12px;
        padding: 16px;
      ">
        <span class="plus-sign" style="
          font-size: 32px;
          font-weight: bold;
          margin-bottom: 8px;
          color: #0077ff;
          transition: all 0.24s cubic-bezier(0.33, 0, 0.67, 0.33);
        ">+</span>
        <span>Создать доску</span>
      </a>
    `;

    container.innerHTML = html;
  }
  // Если нет — остаются статичные доски из HTML
}

// === Инициализация при загрузке страницы ===
document.addEventListener('DOMContentLoaded', function () {
  // Определяем, находимся ли мы на index.html
  const isIndexPage = window.location.pathname === '/' || 
                     window.location.pathname === '/index.html' ||
                     window.location.pathname === '/fielsdown/';

  if (isIndexPage) {
    updateAuthSection();
    renderBoardsOnIndex();
  }
});

// === Экспорт функций для отладки (опционально) ===
window.Fielsdown = {
  getBoardsFromStorage,
  getSession,
  updateAuthSection,
  renderBoardsOnIndex
};

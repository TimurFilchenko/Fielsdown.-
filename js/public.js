/* =============================================================================
   PUBLIC.JS — Интеграция с "Досками сообщества" на index.html
   Находит #boards-container и заполняет его всеми досками из localStorage.
   ============================================================================= */

(function () {
  // Работает ТОЛЬКО на главной странице
  const isIndexPage = window.location.pathname === '/' || 
                      window.location.pathname === '/index.html' ||
                      window.location.pathname === '/fielsdown/';
  
  if (!isIndexPage) return;

  // Ждём полной загрузки страницы
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPublicBoards);
  } else {
    initPublicBoards();
  }

  function initPublicBoards() {
    // Находим контейнер "Доски сообщества"
    const boardsContainer = document.getElementById('boards-container');
    if (!boardsContainer) {
      console.warn('Контейнер #boards-container не найден на index.html');
      return;
    }

    // Получаем доски из localStorage
    let boards = [];
    try {
      const raw = localStorage.getItem('fielsdown_boards_v1');
      boards = raw ? JSON.parse(raw) : [];
    } catch (e) {
      console.error('Ошибка загрузки досок:', e);
      return;
    }

    // Если досок нет — оставляем статичные (как в HTML)
    if (boards.length === 0) return;

    // Сортируем: новые выше
    boards.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    // Генерируем HTML в том же формате, что и в index.html
    let html = '';
    boards.forEach(board => {
      html += `
        <div class="board-card">
          <a href="/board.html?b=${encodeURIComponent(board.name)}" class="board-link">
            <span class="board-prefix">b/</span>${board.name}
          </a>
          <p class="board-desc">${board.description || 'Без описания.'}</p>
        </div>
      `;
    });

    // Добавляем кнопку создания (как в оригинале)
    html += `
      <a href="/thread.html?mode=create-board" class="board-card board-create">
        <span class="plus-sign">+</span>
        <span>Создать доску</span>
      </a>
    `;

    // Заменяем содержимое контейнера
    boardsContainer.innerHTML = html;
  }
})();

/* =============================================================================
   COMMENTS.JS — Расширенная система комментариев для board.html
   Поддержка: ответы, изображения, видео, галерея телефона
   ============================================================================= */

// === Константы ===
const COMMENTS_STORAGE_KEY = 'fielsdown_comments_v2'; // v2 — поддержка медиа
const SESSION_KEY = 'fielsdown_session_v1';
const DEFAULT_AVATAR = 'https://static.cdninstagram.com/rsrc.php/v3/yo/r/qhYsMwhQJy-.png';

// === Вспомогательные функции ===

/**
 * Получает сессию пользователя
 */
function getCommentSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

/**
 * Получает все комментарии для доски
 */
function getCommentsForBoard(boardName) {
  try {
    const raw = localStorage.getItem(COMMENTS_STORAGE_KEY);
    const all = raw ? JSON.parse(raw) : [];
    return all.filter(c => c.board === boardName);
  } catch (e) {
    return [];
  }
}

/**
 * Сохраняет комментарий
 */
function saveCommentToStorage(comment) {
  try {
    const all = JSON.parse(localStorage.getItem(COMMENTS_STORAGE_KEY) || '[]');
    all.push(comment);
    localStorage.setItem(COMMENTS_STORAGE_KEY, JSON.stringify(all));
  } catch (e) {
    throw new Error('Не удалось сохранить комментарий');
  }
}

/**
 * Конвертирует File в Data URL (base64)
 */
function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Проверяет, является ли URL изображением
 */
function isImage(type) {
  return type.startsWith('image/');
}

/**
 * Проверяет, является ли URL видео
 */
function isVideo(type) {
  return type.startsWith('video/');
}

/**
 * Форматирует дату
 */
function formatCommentTime(dateStr) {
  const date = new Date(dateStr);
  return date.toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}

// === Генерация HTML для комментария ===
function renderCommentElement(comment, isReply = false) {
  const session = getCommentSession();
  const isAuthor = session && session.username === comment.author;
  
  let mediaHtml = '';
  if (comment.mediaUrl) {
    if (isImage(comment.mediaType)) {
      mediaHtml = `<img src="${comment.mediaUrl}" class="comment-media" alt="Изображение">`;
    } else if (isVideo(comment.mediaType)) {
      mediaHtml = `
        <video controls class="comment-media">
          <source src="${comment.mediaUrl}" type="${comment.mediaType}">
          Ваш браузер не поддерживает видео.
        </video>
      `;
    }
  }

  const indent = isReply ? 'reply-indent' : '';
  
  return `
    <div class="comment ${indent}" data-id="${comment.id}">
      <div class="comment-header">
        <span class="comment-author">b/${comment.author || 'anonymous'}</span>
        <span class="comment-time">${formatCommentTime(comment.createdAt)}</span>
        <button class="reply-btn" data-id="${comment.id}">ответить</button>
      </div>
      <div class="comment-content">${comment.content || ''}</div>
      ${mediaHtml}
      <div class="reply-form-container" id="reply-form-${comment.id}" style="display:none;"></div>
    </div>
  `;
}

// === Инициализация системы комментариев ===
function initCommentsSystem(boardName) {
  if (!boardName) return;

  // Встроенные стили (как <style> в HTML)
  const style = document.createElement('style');
  style.textContent = `
    .comments-section { margin-top: 32px; }
    .comments-header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 20px;
      font-weight: 700;
      font-size: 18px;
      color: #0077ff;
    }
    .comment {
      background: #fafafa;
      border-radius: 12px;
      padding: 16px;
      margin-bottom: 16px;
      border: 1px solid #e0e0e0;
    }
    .reply-indent {
      margin-left: 24px;
      border-left: 2px solid #0077ff;
      padding-left: 16px;
    }
    .comment-header {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 8px;
    }
    .comment-author {
      font-weight: 600;
      color: #0077ff;
    }
    .comment-time {
      color: #999;
      font-size: 13px;
    }
    .reply-btn {
      background: #e0e0e0;
      border: none;
      border-radius: 4px;
      padding: 4px 8px;
      font-size: 12px;
      cursor: pointer;
      margin-left: auto;
    }
    .reply-btn:hover {
      background: #d0d0d0;
    }
    .comment-media {
      max-width: 100%;
      border-radius: 8px;
      margin-top: 12px;
    }
    video.comment-media {
      width: 100%;
      border-radius: 8px;
    }
    .comment-form {
      background: #f5f5f5;
      border-radius: 12px;
      padding: 20px;
      margin: 24px 0;
    }
    .form-group {
      margin-bottom: 16px;
    }
    .form-control {
      width: 100%;
      padding: 12px;
      border: 1px solid #ddd;
      border-radius: 8px;
      font-size: 15px;
    }
    textarea.form-control {
      min-height: 100px;
      resize: vertical;
    }
    .media-preview {
      margin-top: 12px;
      max-width: 100%;
      border-radius: 8px;
    }
    .btn {
      padding: 10px 20px;
      background: #0077ff;
      color: white;
      border: none;
      border-radius: 8px;
      font-weight: 600;
      cursor: pointer;
    }
    .btn:hover {
      background: #005fcc;
    }
    .error { color: #e53935; font-size: 14px; margin-top: 8px; }
  `;
  document.head.appendChild(style);

  // Контейнер для комментариев (если ещё не создан)
  let commentsContainer = document.getElementById('comments-container');
  if (!commentsContainer) {
    commentsContainer = document.createElement('div');
    commentsContainer.id = 'comments-container';
    const section = document.createElement('div');
    section.className = 'comments-section';
    section.innerHTML = `
      <div class="comments-header">комментарий Комментарии</div>
      <div class="comment-form" id="main-comment-form">
        <div class="form-group">
          <textarea class="form-control" id="main-comment-content" placeholder="Напишите комментарий..."></textarea>
          <div class="error" id="main-comment-error"></div>
        </div>
        <div class="form-group">
          <input type="file" id="main-media-input" accept="image/*,video/*" style="display:none;">
          <button type="button" class="btn" id="attach-media-btn">📎 Прикрепить фото/видео</button>
          <div id="media-preview"></div>
        </div>
        <button type="button" class="btn" id="submit-main-comment">Оставить комментарий</button>
      </div>
    `;
    section.appendChild(commentsContainer);
    document.querySelector('.container')?.appendChild(section) || document.body.appendChild(section);
  }

  // Загрузка комментариев
  function loadComments() {
    const comments = getCommentsForBoard(boardName);
    const topLevel = comments.filter(c => !c.parentId);
    let html = '';

    if (topLevel.length === 0) {
      commentsContainer.innerHTML = '<div class="no-comments" style="color:#999;padding:20px 0;">Пока нет комментариев.</div>';
    } else {
      topLevel.forEach(top => {
        html += renderCommentElement(top);
        const replies = comments.filter(c => c.parentId === top.id);
        replies.forEach(reply => {
          html += renderCommentElement(reply, true);
        });
      });
      commentsContainer.innerHTML = html;
    }

    // Навешиваем обработчики ответов
    document.querySelectorAll('.reply-btn').forEach(btn => {
      btn.addEventListener('click', function () {
        const commentId = this.getAttribute('data-id');
        const formContainer = document.getElementById(`reply-form-${commentId}`);
        if (formContainer.style.display === 'block') {
          formContainer.style.display = 'none';
          return;
        }

        formContainer.style.display = 'block';
        formContainer.innerHTML = `
          <div class="comment-form" style="margin-top:16px;">
            <div class="form-group">
              <textarea class="form-control" placeholder="Ваш ответ..." id="reply-text-${commentId}"></textarea>
              <div class="error" id="reply-error-${commentId}"></div>
            </div>
            <button class="btn" onclick="submitReply('${commentId}')">Ответить</button>
          </div>
        `;
      });
    });
  }

  // Обработчик основной формы
  document.getElementById('attach-media-btn')?.addEventListener('click', () => {
    document.getElementById('main-media-input').click();
  });

  let mainMediaData = null;
  document.getElementById('main-media-input')?.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    const preview = document.getElementById('media-preview');
    if (!file) {
      mainMediaData = null;
      preview.innerHTML = '';
      return;
    }

    if (!isImage(file.type) && !isVideo(file.type)) {
      alert('Поддерживаются только изображения и видео.');
      return;
    }

    try {
      const dataUrl = await fileToDataUrl(file);
      mainMediaData = { url: dataUrl, type: file.type };
      if (isImage(file.type)) {
        preview.innerHTML = `<img src="${dataUrl}" class="media-preview">`;
      } else {
        preview.innerHTML = `<video controls class="media-preview"><source src="${dataUrl}" type="${file.type}"></video>`;
      }
    } catch (err) {
      alert('Не удалось загрузить файл.');
    }
  });

  document.getElementById('submit-main-comment')?.addEventListener('click', async () => {
    const content = document.getElementById('main-comment-content')?.value.trim() || '';
    const errorEl = document.getElementById('main-comment-error');

    if (!content && !mainMediaData) {
      errorEl.textContent = 'Добавьте текст или медиа.';
      return;
    }

    errorEl.textContent = '';

    const session = getCommentSession();
    const author = session?.username || 'anonymous';

    const newComment = {
      id: Date.now().toString(36),
      board: boardName,
      author: author,
      content: content,
      parentId: null,
      createdAt: new Date().toISOString(),
      mediaUrl: mainMediaData?.url || null,
      mediaType: mainMediaData?.type || null
    };

    try {
      saveCommentToStorage(newComment);
      mainMediaData = null;
      document.getElementById('main-comment-content').value = '';
      document.getElementById('media-preview').innerHTML = '';
      loadComments();
    } catch (err) {
      errorEl.textContent = 'Ошибка отправки.';
    }
  });

  // Глобальная функция для ответов (доступна из HTML)
  window.submitReply = async function (parentId) {
    const content = document.getElementById(`reply-text-${parentId}`)?.value.trim();
    const errorEl = document.getElementById(`reply-error-${parentId}`);

    if (!content) {
      errorEl.textContent = 'Текст ответа не может быть пустым.';
      return;
    }

    errorEl.textContent = '';

    const session = getCommentSession();
    const author = session?.username || 'anonymous';

    const newComment = {
      id: Date.now().toString(36),
      board: boardName,
      author: author,
      content: content,
      parentId: parentId,
      createdAt: new Date().toISOString()
    };

    try {
      saveCommentToStorage(newComment);
      loadComments();
    } catch (err) {
      errorEl.textContent = 'Ошибка отправки.';
    }
  };

  // Загружаем комментарии
  loadComments();
}

// === Экспорт для использования в board.html ===
window.FielsdownComments = {
  init: initCommentsSystem
};

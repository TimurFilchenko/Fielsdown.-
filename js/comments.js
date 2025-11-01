/* =============================================================================
   COMMENTS.JS — Полная система комментариев для Fielsdown
   Автор: пользователь Fielsdown
   Цель: бесконечные ответы, медиа, упоминания, профили — всё в одном файле.
   ============================================================================= */

// === Константы ===
const COMMENTS_STORAGE_KEY = 'fielsdown_comments_v3';
const SESSION_KEY = 'fielsdown_session_v1';
const DEFAULT_AVATAR = 'https://static.cdninstagram.com/rsrc.php/v3/yo/r/qhYsMwhQJy-.png';

// === Вспомогательные функции ===

function getSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

function getCommentsForBoard(boardName) {
  try {
    const raw = localStorage.getItem(COMMENTS_STORAGE_KEY);
    const all = raw ? JSON.parse(raw) : [];
    return all.filter(c => c.board === boardName);
  } catch (e) {
    return [];
  }
}

function saveComment(comment) {
  try {
    const all = JSON.parse(localStorage.getItem(COMMENTS_STORAGE_KEY) || '[]');
    all.push(comment);
    localStorage.setItem(COMMENTS_STORAGE_KEY, JSON.stringify(all));
  } catch (e) {
    throw new Error('Не удалось сохранить комментарий');
  }
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function isImage(type) { return type.startsWith('image/'); }
function isVideo(type) { return type.startsWith('video/'); }

function formatTime(dateStr) {
  const date = new Date(dateStr);
  return date.toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}

// === Генерация HTML комментария ===
function renderComment(comment, isReply = false) {
  const indentClass = isReply ? 'comment-reply' : '';
  const mediaHtml = comment.mediaUrl ? (
    isImage(comment.mediaType) ?
      `<img src="${comment.mediaUrl}" class="comment-media">` :
    isVideo(comment.mediaType) ?
      `<video controls class="comment-media"><source src="${comment.mediaUrl}" type="${comment.mediaType}"></video>` :
    ''
  ) : '';

  return `
    <div class="comment ${indentClass}" data-id="${comment.id}">
      <div class="comment-header">
        <img src="${comment.avatar || DEFAULT_AVATAR}" class="comment-avatar">
        <span class="comment-author">b/${comment.author || 'anonymous'}</span>
        <span class="comment-time">${formatTime(comment.createdAt)}</span>
        <button class="reply-btn" data-id="${comment.id}">ответить</button>
      </div>
      <div class="comment-content" data-text="${comment.content || ''}">${comment.content || ''}</div>
      ${mediaHtml}
      <div class="reply-form" id="reply-form-${comment.id}"></div>
    </div>
  `;
}

// === Парсинг упоминаний ===
function parseMentions(text) {
  return text.replace(/@([bB]\/[a-zA-Z0-9_]+)/g, (match, username) => {
    const clean = username.replace(/^b\//i, '');
    return `<a href="/profile.html?user=${encodeURIComponent(clean)}" class="comment-mention">@${username}</a>`;
  });
}

// === Инициализация ===
function initComments(boardName) {
  if (!boardName) return;

  // === ВСТРОЕННЫЕ СТИЛИ ===
  if (!document.getElementById('fielsdown-comments-styles')) {
    const style = document.createElement('style');
    style.id = 'fielsdown-comments-styles';
    style.textContent = `
      .comments-section { margin: 32px 0; }
      .comments-header {
        font-size: 18px;
        font-weight: 700;
        color: #0077ff;
        margin-bottom: 20px;
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .comment {
        background: #fafafa;
        border: 1px solid #e0e0e0;
        border-radius: 12px;
        padding: 16px;
        margin-bottom: 16px;
      }
      .comment-reply {
        margin-left: 24px;
        border-left: 2px solid #0077ff;
        padding-left: 16px;
      }
      .comment-header {
        display: flex;
        align-items: center;
        gap: 10px;
        margin-bottom: 10px;
      }
      .comment-avatar {
        width: 32px;
        height: 32px;
        border-radius: 50%;
        object-fit: cover;
        background: #f5f5f5;
      }
      .comment-author {
        font-weight: 600;
        color: #0077ff;
      }
      .comment-time {
        color: #999;
        font-size: 13px;
        margin-left: auto;
      }
      .reply-btn {
        background: #e0e0e0;
        border: none;
        border-radius: 4px;
        padding: 4px 8px;
        font-size: 12px;
        cursor: pointer;
      }
      .reply-btn:hover { background: #d0d0d0; }
      .comment-content {
        line-height: 1.5;
        white-space: pre-wrap;
      }
      .comment-mention {
        color: #0077ff !important;
        text-decoration: none;
        font-weight: 600;
        border-bottom: 1px dotted #0077ff;
      }
      .comment-mention:hover {
        background: rgba(0,119,255,0.08);
        border-radius: 2px;
      }
      .comment-media {
        max-width: 100%;
        border-radius: 8px;
        margin-top: 12px;
      }
      video.comment-media { width: 100%; }
      .comment-form {
        background: #f5f5f5;
        border-radius: 12px;
        padding: 20px;
        margin: 24px 0;
      }
      .form-group { margin-bottom: 16px; }
      .form-control {
        width: 100%;
        padding: 12px;
        border: 1px solid #ddd;
        border-radius: 8px;
        font-size: 15px;
      }
      textarea.form-control { min-height: 100px; resize: vertical; }
      .btn {
        padding: 10px 20px;
        background: #0077ff;
        color: white;
        border: none;
        border-radius: 8px;
        font-weight: 600;
        cursor: pointer;
      }
      .btn:hover { background: #005fcc; }
      .error { color: #e53935; font-size: 14px; margin-top: 8px; }
      #attach-media-btn {
        background: #666;
        font-size: 14px;
        padding: 8px 16px;
      }
      #attach-media-btn:hover { background: #555; }
    `;
    document.head.appendChild(style);
  }

  // === КОНТЕЙНЕР ===
  let container = document.getElementById('comments-root');
  if (!container) {
    container = document.createElement('div');
    container.id = 'comments-root';
    const section = document.createElement('div');
    section.className = 'comments-section';
    section.innerHTML = `
      <div class="comments-header">комментарий Комментарии</div>
      <div class="comment-form">
        <div class="form-group">
          <textarea class="form-control" id="main-comment" placeholder="Напишите комментарий..."></textarea>
          <div class="error" id="main-error"></div>
        </div>
        <div class="form-group">
          <input type="file" id="main-media" accept="image/*,video/*" style="display:none;">
          <button type="button" class="btn" id="attach-media-btn">📎 Прикрепить фото/видео</button>
          <div id="media-preview"></div>
        </div>
        <button class="btn" id="submit-main">Оставить комментарий</button>
      </div>
      <div id="comments-list"></div>
    `;
    document.querySelector('.container')?.appendChild(section) || document.body.appendChild(section);
    container = document.getElementById('comments-list');
  }

  // === ЗАГРУЗКА КОММЕНТАРИЕВ ===
  function loadComments() {
    const comments = getCommentsForBoard(boardName);
    const topLevel = comments.filter(c => !c.parentId);
    let html = '';

    if (topLevel.length === 0) {
      container.innerHTML = '<div style="color:#999;padding:20px 0;">Пока нет комментариев.</div>';
    } else {
      const renderReplies = (parentId) => {
        return comments
          .filter(c => c.parentId === parentId)
          .map(reply => renderComment(reply, true) + renderReplies(reply.id))
          .join('');
      };

      html = topLevel
        .map(top => renderComment(top) + renderReplies(top.id))
        .join('');

      container.innerHTML = html;

      // Парсим упоминания
      document.querySelectorAll('.comment-content').forEach(el => {
        if (!el.dataset.parsed) {
          el.innerHTML = parseMentions(el.dataset.text || el.textContent);
          el.dataset.parsed = 'true';
        }
      });
    }
  }

  // === МЕДИА ===
  let mainMedia = null;
  document.getElementById('attach-media-btn')?.addEventListener('click', () => {
    document.getElementById('main-media').click();
  });

  document.getElementById('main-media')?.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    const preview = document.getElementById('media-preview');
    if (!file) {
      mainMedia = null;
      preview.innerHTML = '';
      return;
    }

    if (!isImage(file.type) && !isVideo(file.type)) {
      alert('Только фото и видео.');
      return;
    }

    try {
      const url = await fileToDataUrl(file);
      mainMedia = { url, type: file.type };
      preview.innerHTML = isImage(file.type) ?
        `<img src="${url}" class="comment-media">` :
        `<video controls class="comment-media"><source src="${url}" type="${file.type}"></video>`;
    } catch (err) {
      alert('Ошибка загрузки.');
    }
  });

  // === ОТПРАВКА ===
  document.getElementById('submit-main')?.addEventListener('click', () => {
    const text = document.getElementById('main-comment')?.value.trim() || '';
    const error = document.getElementById('main-error');

    if (!text && !mainMedia) {
      error.textContent = 'Добавьте текст или медиа.';
      return;
    }

    error.textContent = '';
    const session = getSession();
    const author = session?.username || 'anonymous';
    const avatar = session?.avatar || DEFAULT_AVATAR;

    const comment = {
      id: Date.now().toString(36),
      board: boardName,
      author,
      avatar,
      content: text,
      parentId: null,
      createdAt: new Date().toISOString(),
      mediaUrl: mainMedia?.url || null,
      mediaType: mainMedia?.type || null
    };

    try {
      saveComment(comment);
      mainMedia = null;
      document.getElementById('main-comment').value = '';
      document.getElementById('media-preview').innerHTML = '';
      loadComments();
    } catch (err) {
      error.textContent = 'Ошибка отправки.';
    }
  });

  // === ОТВЕТЫ ===
  window.submitReply = async function(parentId) {
    const text = document.getElementById(`reply-text-${parentId}`)?.value.trim();
    const error = document.getElementById(`reply-error-${parentId}`);

    if (!text) {
      error.textContent = 'Текст не может быть пустым.';
      return;
    }

    error.textContent = '';
    const session = getSession();
    const author = session?.username || 'anonymous';
    const avatar = session?.avatar || DEFAULT_AVATAR;

    const comment = {
      id: Date.now().toString(36),
      board: boardName,
      author,
      avatar,
      content: text,
      parentId: parentId,
      createdAt: new Date().toISOString()
    };

    try {
      saveComment(comment);
      loadComments();
    } catch (err) {
      error.textContent = 'Ошибка отправки.';
    }
  };

  // === КЛИК ПО "ОТВЕТИТЬ" ===
  document.addEventListener('click', function(e) {
    if (e.target.classList.contains('reply-btn')) {
      const id = e.target.getAttribute('data-id');
      const form = document.getElementById(`reply-form-${id}`);
      if (form.innerHTML) {
        form.innerHTML = '';
        return;
      }

      const author = e.target.closest('.comment').querySelector('.comment-author').textContent.trim();
      form.innerHTML = `
        <div class="comment-form" style="margin-top:16px;">
          <div class="form-group">
            <textarea class="form-control" placeholder="Ваш ответ..." id="reply-text-${id}">@${author} </textarea>
            <div class="error" id="reply-error-${id}"></div>
          </div>
          <button class="btn" onclick="submitReply('${id}')">Ответить</button>
        </div>
      `;
      document.getElementById(`reply-text-${id}`).focus();
    }
  });

  // === ЗАПУСК ===
  loadComments();
}

// === ЭКСПОРТ ===
window.FielsdownComments = {
  init: initComments
};

// =============================================================================
// БЛОКИРОВКА КОММЕНТАРИЕВ ДЛЯ НЕЗАРЕГИСТРИРОВАННЫХ
// =============================================================================

(function () {
  const originalInit = window.FielsdownComments.init;
  window.FielsdownComments.init = function (boardName) {
    // Проверяем сессию
    const session = (() => {
      try {
        const raw = localStorage.getItem('fielsdown_session_v1');
        return raw ? JSON.parse(raw) : null;
      } catch (e) {
        return null;
      }
    })();

    if (!session || !session.isLoggedIn) {
      // Создаём контейнер, но без формы
      let container = document.getElementById('comments-root');
      if (!container) {
        container = document.createElement('div');
        container.id = 'comments-root';
        const section = document.createElement('div');
        section.className = 'comments-section';
        section.innerHTML = `
          <div class="comments-header">комментарий Комментарии</div>
          <div style="background:#fafafa; border:1px solid #e0e0e0; border-radius:12px; padding:20px; margin:24px 0; color:#e53935;">
            🔒 Только зарегистрированные пользователи могут оставлять комментарии.<br>
            <a href="/register.html" style="color:#0077ff; font-weight:600;">Зарегистрируйтесь</a> или <a href="/login.html" style="color:#0077ff; font-weight:600;">войдите</a> в аккаунт.
          </div>
          <div id="comments-list"></div>
        `;
        document.querySelector('.container')?.appendChild(section) || document.body.appendChild(section);
      }
      return;
    }

    // Если залогинен — запускаем обычную логику
    return originalInit.call(this, boardName);
  };
})();

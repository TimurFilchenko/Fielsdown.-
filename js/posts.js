/* =============================================================================
   POSTS.JS — TikTok-стиль лента постов
   Особенности:
   - Вертикальная прокрутка по одному посту
   - Автовоспроизведение видео (без звука)
   - Поддержка изображений и видео из галереи
   - Только для зарегистрированных пользователей
   - Бесконечная лента (загрузка по мере прокрутки)
   ============================================================================= */

(function () {
  'use strict';

  // === Константы ===
  const POSTS_STORAGE_KEY = 'fielsdown_posts_v2';
  const SESSION_KEY = 'fielsdown_session_v1';
  const DEFAULT_AVATAR = 'https://static.cdninstagram.com/rsrc.php/v3/yo/r/qhYsMwhQJy-.png';

  // === Проверка сессии ===
  function getSession() {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  // === Загрузка постов ===
  function getPostsForBoard(boardName) {
    try {
      const raw = localStorage.getItem(POSTS_STORAGE_KEY);
      const all = raw ? JSON.parse(raw) : [];
      return all.filter(p => p.board === boardName).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    } catch (e) {
      return [];
    }
  }

  // === Формат времени ===
  function formatTime(dateStr) {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now - date;
    const diffHours = diffMs / (1000 * 60 * 60);
    
    if (diffHours < 1) return 'только что';
    if (diffHours < 24) return 'сегодня';
    if (diffHours < 48) return 'вчера';
    return date.toLocaleDateString('ru-RU', { day: '2-digit', month: 'short' });
  }

  // === Создание поста в стиле TikTok ===
  function createTikTokPost(post, index) {
    const isImage = post.mediaType && post.mediaType.startsWith('image/');
    const isVideo = post.mediaType && post.mediaType.startsWith('video/');

    let mediaHtml = '';
    if (isImage) {
      mediaHtml = `<img src="${post.mediaUrl}" class="post-media" alt="Пост">`;
    } else if (isVideo) {
      mediaHtml = `
        <video 
          class="post-media" 
          muted 
          playsinline
          preload="metadata">
          <source src="${post.mediaUrl}" type="${post.mediaType}">
        </video>
      `;
    }

    return `
      <div class="post-slide" data-index="${index}" data-id="${post.id}">
        <div class="post-header">
          <img src="${post.avatar || DEFAULT_AVATAR}" class="post-avatar" alt="Аватар">
          <div class="post-author-info">
            <div class="post-author">b/${post.author || 'anonymous'}</div>
            <div class="post-time">${formatTime(post.createdAt)}</div>
          </div>
        </div>
        <div class="post-content">${post.content || ''}</div>
        ${mediaHtml}
        <div class="post-actions">
          <button class="action-btn" title="Лайк">❤️</button>
          <button class="action-btn" title="Комментарий">💬</button>
          <button class="action-btn" title="Поделиться">↗️</button>
        </div>
      </div>
    `;
  }

  // === Инициализация ленты ===
  function initTikTokFeed(boardName) {
    const session = getSession();
    if (!session || !session.isLoggedIn) {
      document.body.innerHTML = `
        <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;padding:20px;background:#000;color:#fff;font-family:sans-serif;">
          <div style="font-size:24px;margin-bottom:20px;">🔒 Требуется вход</div>
          <p>Только зарегистрированные пользователи могут просматривать ленту.</p>
          <div style="margin-top:30px;display:flex;gap:15px;">
            <a href="/register.html" style="background:#fff;color:#000;padding:12px 24px;border-radius:30px;text-decoration:none;font-weight:bold;">Регистрация</a>
            <a href="/login.html" style="background:transparent;border:2px solid #fff;color:#fff;padding:12px 24px;border-radius:30px;text-decoration:none;">Вход</a>
          </div>
        </div>
      `;
      return;
    }

    // === Стили TikTok ===
    const style = document.createElement('style');
    style.textContent = `
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body {
        background: #000;
        overflow-x: hidden;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      }
      .post-slide {
        position: relative;
        width: 100vw;
        height: 100vh;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        padding: 20px;
        color: white;
        overflow: hidden;
      }
      .post-header {
        display: flex;
        align-items: center;
        gap: 12px;
        z-index: 10;
      }
      .post-avatar {
        width: 40px;
        height: 40px;
        border-radius: 50%;
        object-fit: cover;
        border: 2px solid white;
      }
      .post-author-info { z-index: 10; }
      .post-author {
        font-weight: 700;
        font-size: 16px;
        color: white;
      }
      .post-time {
        font-size: 13px;
        color: #aaa;
      }
      .post-content {
        font-size: 22px;
        line-height: 1.4;
        max-width: 70%;
        z-index: 10;
      }
      .post-media {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        object-fit: cover;
        z-index: 1;
      }
      video.post-media {
        background: #000;
      }
      .post-actions {
        display: flex;
        gap: 24px;
        z-index: 10;
      }
      .action-btn {
        background: rgba(0,0,0,0.5);
        border: none;
        color: white;
        width: 44px;
        height: 44px;
        border-radius: 50%;
        font-size: 20px;
        cursor: pointer;
        backdrop-filter: blur(10px);
      }
      .no-posts {
        display: flex;
        align-items: center;
        justify-content: center;
        height: 100vh;
        color: #fff;
        font-size: 18px;
      }
      /* Анимация смены постов */
      .post-slide.animate-in {
        animation: slideIn 0.4s ease-out;
      }
      @keyframes slideIn {
        from { transform: translateY(100%); }
        to { transform: translateY(0); }
      }
    `;
    document.head.appendChild(style);

    // === Загрузка постов ===
    const posts = getPostsForBoard(boardName);
    if (posts.length === 0) {
      document.body.innerHTML = '<div class="no-posts">Нет постов в этой доске.</div>';
      return;
    }

    // === Создание ленты ===
    let currentIndex = 0;
    document.body.innerHTML = createTikTokPost(posts[0], 0);

    // Автовоспроизведение видео
    const firstVideo = document.querySelector('video');
    if (firstVideo) {
      firstVideo.play().catch(e => console.log('Автовоспроизведение заблокировано'));
    }

    // Прокрутка колесом / свайп
    let startY = 0;
    document.body.addEventListener('wheel', (e) => {
      if (e.deltaY > 0) {
        // Вниз → следующий пост
        if (currentIndex < posts.length - 1) {
          currentIndex++;
          const newPost = createTikTokPost(posts[currentIndex], currentIndex);
          document.body.innerHTML = newPost;
          document.querySelector('.post-slide').classList.add('animate-in');
          const video = document.querySelector('video');
          if (video) video.play().catch(() => {});
        }
      } else if (e.deltaY < 0) {
        // Вверх → предыдущий пост
        if (currentIndex > 0) {
          currentIndex--;
          const newPost = createTikTokPost(posts[currentIndex], currentIndex);
          document.body.innerHTML = newPost;
          document.querySelector('.post-slide').classList.add('animate-in');
          const video = document.querySelector('video');
          if (video) video.play().catch(() => {});
        }
      }
    });

    // Для мобильных (свайп)
    document.body.addEventListener('touchstart', (e) => {
      startY = e.touches[0].clientY;
    });

    document.body.addEventListener('touchend', (e) => {
      const endY = e.changedTouches[0].clientY;
      const diff = startY - endY;

      if (diff > 80) {
        // Свайп вверх → следующий пост
        if (currentIndex < posts.length - 1) {
          currentIndex++;
          const newPost = createTikTokPost(posts[currentIndex], currentIndex);
          document.body.innerHTML = newPost;
          const video = document.querySelector('video');
          if (video) video.play().catch(() => {});
        }
      } else if (diff < -80) {
        // Свайп вниз → предыдущий пост
        if (currentIndex > 0) {
          currentIndex--;
          const newPost = createTikTokPost(posts[currentIndex], currentIndex);
          document.body.innerHTML = newPost;
          const video = document.querySelector('video');
          if (video) video.play().catch(() => {});
        }
      }
    });
  }

  // === Экспорт ===
  window.FielsdownPosts = {
    init: initTikTokFeed
  };
})();

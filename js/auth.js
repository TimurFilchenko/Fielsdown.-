/* =============================================================================
   AUTH.JS — Клиентская аутентификация на localStorage
   Автор: Тимур Фильченко Сергеевич
   Цель: Надёжная регистрация и вход без бэкенда, без сбоев, без утечек.
   Работает как швейцарские часы — точно, стабильно, вечно.
   ============================================================================= */

// === Константы ===
const SESSION_KEY = 'fielsdown_session_v1';
const USERS_KEY = 'fielsdown_users_v1';
const DEFAULT_AVATAR = 'https://static.cdninstagram.com/rsrc.php/v3/yo/r/qhYsMwhQJy-.png';

// === Вспомогательные функции ===

/**
 * Получает текущую сессию
 */
function getSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    localStorage.removeItem(SESSION_KEY);
    return null;
  }
}

/**
 * Сохраняет сессию
 */
function saveSession(data) {
  const session = {
    isLoggedIn: true,
    username: data.username,
    avatar: data.avatar || DEFAULT_AVATAR,
    bio: data.bio || '',
    createdAt: data.createdAt || new Date().toISOString(),
    postCount: data.postCount || 0,
    boardCount: data.boardCount || 0
  };
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

/**
 * Получает всех пользователей
 */
function getUsers() {
  try {
    const raw = localStorage.getItem(USERS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    return {};
  }
}

/**
 * Сохраняет пользователей
 */
function saveUsers(users) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

/**
 * Генерирует уникальный никнейм
 */
function generateUniqueNickname() {
  const adjectives = ['silent', 'crimson', 'neon', 'void', 'frost', 'ember', 'nova', 'zen', 'lunar', 'quantum'];
  const nouns = ['wolf', 'phoenix', 'ghost', 'pixel', 'cipher', 'echo', 'flare', 'raven', 'orbit', 'vortex'];
  let attempts = 0;
  while (attempts < 30) {
    const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
    const noun = nouns[Math.floor(Math.random() * nouns.length)];
    const num = Math.floor(Math.random() * 9000) + 1000;
    const nick = `${adj}${noun}${num}`;
    const users = getUsers();
    if (!users[nick.toLowerCase()]) {
      return nick;
    }
    attempts++;
  }
  return `user_${Date.now().toString(36).slice(-8)}`;
}

/**
 * Генерирует надёжный пароль
 */
function generateRandomPassword() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%&*';
  return Array.from({ length: 14 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

/**
 * Проверяет, свободен ли ник
 */
function isUsernameAvailable(username) {
  if (username.length < 3 || username.length > 20) return false;
  if (!/^[a-zA-Z0-9_]+$/.test(username)) return false;
  const users = getUsers();
  return !users[username.toLowerCase()];
}

/**
 * Показывает ошибку
 */
function showError(fieldId, message) {
  const el = document.getElementById(`${fieldId}-error`);
  if (el) {
    el.textContent = message;
    el.classList.add('show');
  }
}

/**
 * Скрывает ошибку
 */
function hideError(fieldId) {
  const el = document.getElementById(`${fieldId}-error`);
  if (el) el.classList.remove('show');
}

// === Основные функции ===

/**
 * Регистрация нового пользователя
 */
function registerUser(username, password) {
  const users = getUsers();
  const userData = {
    username: username,
    passwordHash: btoa(password), // Простой mock-хэш (в реальном проекте — bcrypt на сервере)
    createdAt: new Date().toISOString(),
    avatar: DEFAULT_AVATAR,
    bio: ''
  };
  users[username.toLowerCase()] = userData;
  saveUsers(users);

  // Создаём сессию
  saveSession(userData);
}

/**
 * Вход в аккаунт
 */
function loginUser(username, password) {
  const users = getUsers();
  const user = users[username.toLowerCase()];
  if (!user || btoa(password) !== user.passwordHash) {
    throw new Error('Неверный ник или пароль');
  }

  saveSession(user);
}

/**
 * Выход из аккаунта
 */
function logoutUser() {
  localStorage.removeItem(SESSION_KEY);
  window.location.href = '/';
}

/**
 * Проверка сессии
 */
function checkAuthStatus() {
  return !!getSession();
}

// === Инициализация на страницах ===

/**
 * Обновляет интерфейс аутентификации
 */
function updateAuthUI() {
  const authSection = document.getElementById('auth-section');
  if (!authSection) return;

  const session = getSession();
  if (session && session.isLoggedIn) {
    authSection.innerHTML = `
      <div class="user-menu" onclick="window.location.href='/profile.html'" style="
        display: flex;
        align-items: center;
        gap: 12px;
        cursor: pointer;
      ">
        <img src="${session.avatar}" 
             class="user-avatar"
             style="
               width: 36px;
               height: 36px;
               border-radius: 50%;
               object-fit: cover;
               border: 2px solid #e0e0e0;
               background: #f5f5f5;
             "
             onerror="this.src='${DEFAULT_AVATAR}'">
        <span class="user-nick" style="
          font-weight: 600;
          color: #121212;
          font-size: 15px;
        ">b/${session.username}</span>
      </div>
    `;
  } else {
    authSection.innerHTML = `
      <div class="auth-actions" style="display: flex; gap: 12px;">
        <a href="/register.html" class="btn btn-secondary">Регистрация</a>
        <a href="/login.html" class="btn btn-secondary">Вход</a>
      </div>
    `;
  }
}

// === Обработчики для register.html ===
function initRegisterPage() {
  const form = document.getElementById('register-form');
  if (!form) return;

  const usernameInput = document.getElementById('username');
  const passwordInput = document.getElementById('password');
  const confirmInput = document.getElementById('confirm-password');

  // Генерация ника
  document.getElementById('generate-nick')?.addEventListener('click', () => {
    usernameInput.value = generateUniqueNickname();
    hideError('username');
  });

  // Генерация пароля
  document.getElementById('generate-pass')?.addEventListener('click', () => {
    const pass = generateRandomPassword();
    passwordInput.value = pass;
    confirmInput.value = pass;
    document.querySelectorAll('.error-message').forEach(el => el.classList.remove('show'));
  });

  // Валидация ника
  usernameInput?.addEventListener('input', () => {
    const val = usernameInput.value.trim();
    if (val && !isUsernameAvailable(val)) {
      showError('username', 'Ник занят или недопустим.');
    } else {
      hideError('username');
    }
  });

  // Отправка формы
  form.addEventListener('submit', (e) => {
    e.preventDefault();

    const username = usernameInput.value.trim();
    const password = passwordInput.value;
    const confirm = confirmInput.value;

    // Валидация
    if (!username) {
      showError('username', 'Введите никнейм.');
      return;
    }
    if (!isUsernameAvailable(username)) {
      showError('username', 'Ник занят или недопустим.');
      return;
    }
    if (!password) {
      showError('password', 'Сгенерируйте пароль.');
      return;
    }
    if (password !== confirm) {
      showError('confirm', 'Пароли не совпадают.');
      return;
    }

    // Регистрация
    try {
      registerUser(username, password);
      alert(`✅ Успешно!\nНик: ${username}\nПароль: ${password}\n❗ Сохраните его!`);
      window.location.href = '/profile.html';
    } catch (error) {
      showError('username', error.message);
    }
  });
}

// === Обработчики для login.html ===
function initLoginPage() {
  const form = document.getElementById('login-form');
  if (!form) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();

    const username = document.getElementById('login-username').value.trim();
    const password = document.getElementById('login-password').value;

    if (!username) {
      showError('username', 'Введите никнейм.');
      return;
    }
    if (!password) {
      showError('password', 'Введите пароль.');
      return;
    }

    try {
      loginUser(username, password);
      window.location.href = '/profile.html';
    } catch (error) {
      if (error.message.includes('Неверный')) {
        showError('password', error.message);
      } else {
        showError('username', error.message);
      }
    }
  });
}

// === Обработчики для profile.html ===
function initProfilePage() {
  document.getElementById('logout-btn')?.addEventListener('click', (e) => {
    e.preventDefault();
    if (confirm('Выйти из аккаунта?')) {
      logoutUser();
    }
  });
}

// === Глобальная инициализация ===
document.addEventListener('DOMContentLoaded', () => {
  // Обновляем аутентификацию на всех страницах
  updateAuthUI();

  // Инициализируем страницы
  if (window.location.pathname.includes('register.html')) {
    initRegisterPage();
  } else if (window.location.pathname.includes('login.html')) {
    initLoginPage();
  } else if (window.location.pathname.includes('profile.html')) {
    initProfilePage();
  }
});

// === Экспорт для отладки ===
window.FielsdownAuth = {
  getSession,
  saveSession,
  getUsers,
  registerUser,
  loginUser,
  logoutUser,
  checkAuthStatus,
  updateAuthUI
};

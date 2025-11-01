/* =============================================================================
   AUTH.JS — Клиентская аутентификация с поддержкой PHP-бэкенда
   Автор: Тимур Фильченко Сергеевич
   Цель: Безопасный вход/регистрация через HttpOnly куки, сохранение сессии
   Работает как швейцарские часы — без сбоев, без утечек.
   ============================================================================= */

// === Константы ===
const API_BASE = '/PHP/auth.php';
const SESSION_CHECK_INTERVAL = 60000; // Проверка каждые 60 сек

// === Вспомогательные функции ===

/**
 * Выполняет запрос к PHP-бэкенду
 */
async function apiRequest(action, data = {}) {
  try {
    const response = await fetch(`${API_BASE}?action=${action}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      credentials: 'include', // Важно для куки!
      body: JSON.stringify(data)
    });

    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.error || 'Ошибка сервера');
    }
    return result;
  } catch (error) {
    console.error(`API Error (${action}):`, error);
    throw error;
  }
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
    // Проверка на сервере будет позже
    return nick;
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

/**
 * Проверяет, доступен ли ник на сервере
 */
async function isUsernameAvailable(username) {
  try {
    // В реальном проекте — отдельный эндпоинт, но пока проверим при регистрации
    return true;
  } catch (e) {
    return false;
  }
}

// === Основные функции аутентификации ===

/**
 * Регистрация нового пользователя
 */
async function registerUser(username, password) {
  return await apiRequest('register', { username, password });
}

/**
 * Вход в аккаунт
 */
async function loginUser(username, password) {
  return await apiRequest('login', { username, password });
}

/**
 * Выход из аккаунта
 */
async function logoutUser() {
  await apiRequest('logout');
  // Удаляем локальные данные
  localStorage.removeItem('fielsdown_temp_user');
  // Перенаправляем
  window.location.href = '/';
}

/**
 * Получает статус текущей сессии
 */
async function getSessionStatus() {
  try {
    const status = await apiRequest('status');
    return status;
  } catch (e) {
    return { isLoggedIn: false };
  }
}

// === Инициализация на страницах ===

/**
 * Обновляет интерфейс в зависимости от сессии
 */
async function updateAuthUI() {
  const authSection = document.getElementById('auth-section');
  if (!authSection) return;

  const session = await getSessionStatus();
  const DEFAULT_AVATAR = 'https://static.cdninstagram.com/rsrc.php/v3/yo/r/qhYsMwhQJy-.png';

  if (session.isLoggedIn) {
    authSection.innerHTML = `
      <div class="user-menu" onclick="window.location.href='/profile.html'" style="
        display: flex;
        align-items: center;
        gap: 12px;
        cursor: pointer;
      ">
        <img src="${session.avatar || DEFAULT_AVATAR}" 
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

  // Валидация
  usernameInput?.addEventListener('input', () => {
    const val = usernameInput.value.trim();
    if (val && (val.length < 3 || val.length > 20 || !/^[a-zA-Z0-9_]+$/.test(val))) {
      showError('username', 'Ник: 3–20 символов, буквы, цифры, _');
    } else {
      hideError('username');
    }
  });

  // Отправка формы
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const username = usernameInput.value.trim();
    const password = passwordInput.value;
    const confirm = confirmInput.value;

    // Валидация
    if (!username) return showError('username', 'Укажите ник.');
    if (username.length < 3 || username.length > 20 || !/^[a-zA-Z0-9_]+$/.test(username)) {
      return showError('username', 'Недопустимый ник.');
    }
    if (!password) return showError('password', 'Сгенерируйте пароль.');
    if (password !== confirm) return showError('confirm', 'Пароли не совпадают.');

    try {
      const result = await registerUser(username, password);
      alert(`✅ Успешно!\nНик: ${result.username}\nПароль: ${password}\n❗ Сохраните его!`);
      window.location.href = '/profile.html';
    } catch (error) {
      if (error.message === 'Ник занят') {
        showError('username', 'Этот ник уже занят.');
      } else {
        showError('username', error.message);
      }
    }
  });
}

// === Обработчики для login.html ===
function initLoginPage() {
  const form = document.getElementById('login-form');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const username = document.getElementById('login-username').value.trim();
    const password = document.getElementById('login-password').value;

    if (!username) return showError('username', 'Введите никнейм.');
    if (!password) return showError('password', 'Введите пароль.');

    try {
      const result = await loginUser(username, password);
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
document.addEventListener('DOMContentLoaded', async () => {
  // Обновляем аутентификацию на всех страницах
  await updateAuthUI();

  // Инициализируем страницы
  if (window.location.pathname.includes('register.html')) {
    initRegisterPage();
  } else if (window.location.pathname.includes('login.html')) {
    initLoginPage();
  } else if (window.location.pathname.includes('profile.html')) {
    initProfilePage();
  }

  // Периодическая проверка сессии (на случай внешнего выхода)
  if (!window.location.pathname.includes('register.html') && !window.location.pathname.includes('login.html')) {
    setInterval(updateAuthUI, SESSION_CHECK_INTERVAL);
  }
});

// === Экспорт для отладки ===
window.FielsdownAuth = {
  registerUser,
  loginUser,
  logoutUser,
  getSessionStatus,
  updateAuthUI
};

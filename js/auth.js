// auth.js — надёжная клиентская "сессия" (до появления бэкенда)

// === Вспомогательные функции ===

function generateUniqueNickname() {
  const adjectives = ['silent', 'crimson', 'neon', 'void', 'frost', 'ember', 'nova', 'zen', 'lunar', 'quantum'];
  const nouns = ['wolf', 'phoenix', 'ghost', 'pixel', 'cipher', 'echo', 'flare', 'raven', 'orbit', 'vortex'];
  let attempts = 0;
  while (attempts < 30) {
    const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
    const noun = nouns[Math.floor(Math.random() * nouns.length)];
    const num = Math.floor(Math.random() * 9000) + 1000;
    const nick = `${adj}${noun}${num}`;
    if (!isUsernameTaken(nick)) return nick;
    attempts++;
  }
  return `user_${Date.now().toString(36).slice(-8)}`;
}

function generateRandomPassword() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%&*';
  return Array.from({ length: 14 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

function isUsernameTaken(username) {
  const taken = ['admin', 'mod', 'system', 'fiels', 'root', 'test', 'user', 'anon', 'deleted'];
  return taken.includes(username.toLowerCase());
}

// === СИСТЕМА СЕССИИ ===

const SESSION_KEY = 'fielsdown_session_v1';

function saveSession(userData) {
  // Сохраняем ВСЁ, что нужно для восстановления профиля
  const session = {
    isLoggedIn: true,
    username: userData.username,
    avatar: userData.avatar || '/public/avatars/default.png',
    createdAt: userData.createdAt || new Date().toISOString(),
    postCount: 0,
    boardCount: 0,
    // ⚠️ Пароль НЕ сохраняем — только при регистрации показываем один раз
  };
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

function getSession() {
  const raw = localStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    const session = JSON.parse(raw);
    if (session && session.isLoggedIn && session.username) {
      return session;
    }
  } catch (e) {
    console.warn('Session corrupted, clearing...');
    clearSession();
  }
  return null;
}

function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}

function isUserLoggedIn() {
  return !!getSession();
}

// === DOM-логика ===

document.addEventListener('DOMContentLoaded', () => {
  // Если уже залогинен — редирект с главной или register
  if (isUserLoggedIn() && window.location.pathname.includes('register.html')) {
    alert('Вы уже зарегистрированы!');
    window.location.href = '/profile.html';
    return;
  }

  const registerForm = document.getElementById('register-form');
  if (!registerForm) return;

  const usernameInput = document.getElementById('username');
  const passwordInput = document.getElementById('password');
  const confirmInput = document.getElementById('confirm-password');

  // Генерация ника
  document.getElementById('generate-nick')?.addEventListener('click', () => {
    usernameInput.value = generateUniqueNickname();
    document.getElementById('username-error').textContent = '';
  });

  // Генерация пароля
  document.getElementById('generate-pass')?.addEventListener('click', () => {
    const pass = generateRandomPassword();
    passwordInput.value = pass;
    confirmInput.value = pass;
    document.querySelectorAll('.error-message').forEach(el => el.textContent = '');
  });

  // Валидация ника в реальном времени
  usernameInput?.addEventListener('input', () => {
    const val = usernameInput.value.trim();
    const errorEl = document.getElementById('username-error');
    if (val && (val.length < 3 || val.length > 20 || !/^[a-zA-Z0-9_]+$/.test(val))) {
      errorEl.textContent = 'Ник: 3–20 символов, буквы, цифры, _';
    } else if (val && isUsernameTaken(val)) {
      errorEl.textContent = 'Этот ник занят.';
    } else {
      errorEl.textContent = '';
    }
  });

  // Отправка формы
  registerForm.addEventListener('submit', (e) => {
    e.preventDefault();

    // Очистка ошибок
    document.querySelectorAll('.error-message').forEach(el => el.textContent = '');

    const username = usernameInput.value.trim();
    const password = passwordInput.value;
    const confirm = confirmInput.value;

    // Валидация
    if (!username) return showError('username', 'Укажите ник.');
    if (username.length < 3 || username.length > 20 || !/^[a-zA-Z0-9_]+$/.test(username)) {
      return showError('username', 'Недопустимый ник.');
    }
    if (isUsernameTaken(username)) return showError('username', 'Ник занят.');
    if (!password) return showError('password', 'Сгенерируйте пароль.');
    if (password !== confirm) return showError('confirm', 'Пароли не совпадают.');

    // === СОХРАНЕНИЕ СЕССИИ ===
    saveSession({
      username: username,
      createdAt: new Date().toISOString()
    });

    // Показ пароля один раз (в реальности — скопировать и забыть)
    alert(`✅ Успешно!\nВаш ник: ${username}\nВаш пароль: ${password}\n\n❗ Сохраните его!`);

    // Редирект
    window.location.href = '/profile.html';
  });
});

// Вспомогательная функция ошибок
function showError(field, msg) {
  const el = document.getElementById(`${field}-error`);
  if (el) el.textContent = msg;
}

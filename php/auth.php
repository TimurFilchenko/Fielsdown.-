<?php
/**
 * =============================================================================
 * AUTH.PHP — Система аутентификации для Fielsdown
 * Автор: Тимур Фильченко Сергеевич
 * Цель: Безопасная регистрация и вход через HttpOnly куки
 * Работает как швейцарские часы — надёжно, точно, без ошибок.
 * =============================================================================
 */

// Настройки
header("Content-Type: application/json; charset=utf-8");
header("Access-Control-Allow-Origin: " . ($_SERVER['HTTP_ORIGIN'] ?? '*'));
header("Access-Control-Allow-Credentials: true");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

// Обработка preflight OPTIONS
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

// Путь к файлу пользователей (в реальном проекте — БД)
$usersFile = __DIR__ . '/../data/users.json';

// Убедимся, что папка data существует
if (!file_exists(dirname($usersFile))) {
    mkdir(dirname($usersFile), 0755, true);
}

// Чтение пользователей
function readUsers($file) {
    if (!file_exists($file)) {
        return [];
    }
    $raw = file_get_contents($file);
    $users = json_decode($raw, true);
    return is_array($users) ? $users : [];
}

// Запись пользователей
function writeUsers($file, $users) {
    $json = json_encode($users, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    file_put_contents($file, $json);
}

// Хэширование пароля
function hashPassword($password) {
    return password_hash($password, PASSWORD_ARGON2ID, [
        'memory_cost' => 65536, // 64 МБ
        'time_cost'   => 4,
        'threads'     => 3
    ]);
}

// Проверка пароля
function verifyPassword($password, $hash) {
    return password_verify($password, $hash);
}

// Генерация безопасного ID сессии
function generateSessionId() {
    return bin2hex(random_bytes(32));
}

// Установка куки сессии
function setAuthCookie($username) {
    $sessionId = generateSessionId();
    $expires = time() + 30 * 24 * 60 * 60; // 30 дней

    // Сохраняем сессию на сервере
    $sessionsFile = __DIR__ . '/../data/sessions.json';
    $sessions = file_exists($sessionsFile) ? json_decode(file_get_contents($sessionsFile), true) : [];
    $sessions[$sessionId] = [
        'username' => $username,
        'created' => time(),
        'expires' => $expires
    ];
    file_put_contents($sessionsFile, json_encode($sessions, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT));

    // Устанавливаем HttpOnly куку
    setcookie('fielsdown_session', $sessionId, [
        'expires' => $expires,
        'path' => '/',
        'domain' => '',
        'secure' => false, // true в продакшене с HTTPS
        'httponly' => true,
        'samesite' => 'Strict'
    ]);
}

// Получение текущего пользователя из куки
function getCurrentUser() {
    if (!isset($_COOKIE['fielsdown_session'])) {
        return null;
    }

    $sessionId = $_COOKIE['fielsdown_session'];
    $sessionsFile = __DIR__ . '/../data/sessions.json';
    if (!file_exists($sessionsFile)) {
        return null;
    }

    $sessions = json_decode(file_get_contents($sessionsFile), true);
    if (!isset($sessions[$sessionId]) || $sessions[$sessionId]['expires'] < time()) {
        // Удаляем просроченную сессию
        unset($sessions[$sessionId]);
        file_put_contents($sessionsFile, json_encode($sessions, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT));
        return null;
    }

    return $sessions[$sessionId]['username'];
}

// Очистка старых сессий (раз в 10 запросов)
function cleanupOldSessions() {
    if (rand(1, 10) !== 1) return;

    $sessionsFile = __DIR__ . '/../data/sessions.json';
    if (!file_exists($sessionsFile)) return;

    $sessions = json_decode(file_get_contents($sessionsFile), true);
    $now = time();
    $cleaned = array_filter($sessions, function($session) use ($now) {
        return $session['expires'] > $now;
    });

    if (count($cleaned) !== count($sessions)) {
        file_put_contents($sessionsFile, json_encode($cleaned, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT));
    }
}

// Основная логика
try {
    cleanupOldSessions();

    $action = $_GET['action'] ?? '';
    $input = json_decode(file_get_contents('php://input'), true) ?: $_POST;

    if ($action === 'register') {
        // === РЕГИСТРАЦИЯ ===
        $username = trim($input['username'] ?? '');
        $password = $input['password'] ?? '';

        if (!$username || !$password) {
            throw new Exception('Укажите ник и пароль');
        }

        if (strlen($username) < 3 || strlen($username) > 20) {
            throw new Exception('Ник: 3–20 символов');
        }

        if (!preg_match('/^[a-zA-Z0-9_]+$/', $username)) {
            throw new Exception('Только латиница, цифры, _');
        }

        $users = readUsers($usersFile);
        foreach ($users as $user) {
            if (strtolower($user['username']) === strtolower($username)) {
                throw new Exception('Ник занят');
            }
        }

        $hashedPassword = hashPassword($password);
        $newUser = [
            'id' => bin2hex(random_bytes(16)),
            'username' => $username,
            'password' => $hashedPassword,
            'created_at' => date('c'),
            'avatar' => 'https://static.cdninstagram.com/rsrc.php/v3/yo/r/qhYsMwhQJy-.png',
            'bio' => ''
        ];

        $users[] = $newUser;
        writeUsers($usersFile, $users);

        // Автоматический вход после регистрации
        setAuthCookie($username);

        echo json_encode([
            'success' => true,
            'username' => $username,
            'message' => 'Аккаунт создан и вы вошли в систему'
        ]);
        exit;

    } elseif ($action === 'login') {
        // === ВХОД ===
        $username = trim($input['username'] ?? '');
        $password = $input['password'] ?? '';

        if (!$username || !$password) {
            throw new Exception('Укажите ник и пароль');
        }

        $users = readUsers($usersFile);
        $user = null;
        foreach ($users as $u) {
            if ($u['username'] === $username) {
                $user = $u;
                break;
            }
        }

        if (!$user || !verifyPassword($password, $user['password'])) {
            throw new Exception('Неверный ник или пароль');
        }

        setAuthCookie($username);

        echo json_encode([
            'success' => true,
            'username' => $username,
            'avatar' => $user['avatar'],
            'bio' => $user['bio']
        ]);
        exit;

    } elseif ($action === 'logout') {
        // === ВЫХОД ===
        if (isset($_COOKIE['fielsdown_session'])) {
            $sessionsFile = __DIR__ . '/../data/sessions.json';
            if (file_exists($sessionsFile)) {
                $sessions = json_decode(file_get_contents($sessionsFile), true);
                unset($sessions[$_COOKIE['fielsdown_session']]);
                file_put_contents($sessionsFile, json_encode($sessions, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT));
            }
            setcookie('fielsdown_session', '', time() - 3600, '/');
        }

        echo json_encode(['success' => true]);
        exit;

    } elseif ($action === 'status') {
        // === СТАТУС СЕССИИ ===
        $username = getCurrentUser();
        if ($username) {
            $users = readUsers($usersFile);
            foreach ($users as $user) {
                if ($user['username'] === $username) {
                    echo json_encode([
                        'isLoggedIn' => true,
                        'username' => $username,
                        'avatar' => $user['avatar'],
                        'bio' => $user['bio']
                    ]);
                    exit;
                }
            }
        }
        echo json_encode(['isLoggedIn' => false]);
        exit;

    } else {
        throw new Exception('Неизвестное действие');
    }

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['error' => $e->getMessage()]);
}
?>

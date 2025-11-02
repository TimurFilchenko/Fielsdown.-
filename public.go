package main

import (
	"encoding/json"
	"html/template"
	"log"
	"net/http"
	"sync"
	"time"

	"github.com/gorilla/mux"
)

// Board — структура доски
type Board struct {
	ID          int    `json:"id"`
	Name        string `json:"name"`
	Description string `json:"description"`
	Creator     string `json:"creator"`
	CreatedAt   string `json:"created_at"`
}

// In-memory storage
var (
	boards = []Board{}
	mutex  = sync.RWMutex{}
	nextID = 1
)

// createBoard — создаёт доску
func createBoard(w http.ResponseWriter, r *http.Request) {
	var input struct {
		Name        string `json:"name"`
		Description string `json:"description"`
		Creator     string `json:"creator"`
	}

	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		http.Error(w, "Неверный JSON", http.StatusBadRequest)
		return
	}

	if input.Name == "" {
		http.Error(w, "Укажите название", http.StatusBadRequest)
		return
	}

	mutex.RLock()
	for _, b := range boards {
		if b.Name == input.Name {
			mutex.RUnlock()
			http.Error(w, "Доска уже существует", http.StatusConflict)
			return
		}
	}
	mutex.RUnlock()

	mutex.Lock()
	board := Board{
		ID:          nextID,
		Name:        input.Name,
		Description: input.Description,
		Creator:     input.Creator,
		CreatedAt:   time.Now().Format("02.01.2006"),
	}
	boards = append(boards, board)
	nextID++
	mutex.Unlock()

	// Перенаправляем на board.html
	http.Redirect(w, r, "/board.html?b="+input.Name, http.StatusSeeOther)
}

// getIndex — отдаёт index.html с досками
func getIndex(w http.ResponseWriter, r *http.Request) {
	mutex.RLock()
	boardData := make([]map[string]interface{}, len(boards))
	for i, b := range boards {
		boardData[i] = map[string]interface{}{
			"Name":        b.Name,
			"Description": b.Description,
			"Creator":     b.Creator,
			"CreatedAt":   b.CreatedAt,
		}
	}
	mutex.RUnlock()

	tmpl := `
<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Fielsdown — Fandom Community</title>
  <link rel="stylesheet" href="/css/globals.css" />
  <link rel="icon" href="/public/favicon.ico" />
  <style>
    .boards-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 20px; margin-bottom: 40px; }
    .board-card { background: #fafafa; border: 1px solid #e0e0e0; border-radius: 12px; padding: 16px; }
    .board-link { display: block; font-size: 18px; font-weight: 700; margin-bottom: 6px; color: #121212; text-decoration: none; }
    .board-prefix { color: #0077ff; font-weight: 800; }
    .board-desc { font-size: 14px; color: #666; line-height: 1.5; }
    .board-create { display: flex; flex-direction: column; align-items: center; justify-content: center; color: #999; font-weight: 600; font-size: 18px; text-decoration: none; background: #fafafa; border: 1px solid #e0e0e0; border-radius: 12px; padding: 16px; }
    .plus-sign { font-size: 32px; font-weight: bold; margin-bottom: 8px; color: #0077ff; }
  </style>
</head>
<body>
  <header class="topbar">
    <div class="container">
      <h1 class="logo">Fielsdown</h1>
      <nav class="tabs"><a href="/" class="tab active">Посты</a></nav>
      <div class="auth-section" id="auth-section">
        <!-- Сессия будет обновляться через JS -->
      </div>
    </div>
  </header>

  <main class="container">
    <div class="boards-list">
      <h2>Доски сообщества</h2>
      <div class="boards-grid" id="boards-container">
        {{range .Boards}}
        <div class="board-card">
          <a href="/board.html?b={{.Name}}" class="board-link">
            <span class="board-prefix">b/</span>{{.Name}}
          </a>
          <p class="board-desc">{{.Description}}</p>
        </div>
        {{end}}
        <a href="/thread.html" class="board-card board-create">
          <span class="plus-sign">+</span>
          <span>Создать доску</span>
        </a>
      </div>
    </div>
  </main>

  <footer class="footer">
    <div class="container">
      <p>Fielsdown © 2025 — Fandom Community без цензуры и шаблонов.</p>
    </div>
  </footer>

  <script>
    // Сохраняем старую логику сессии из auth.js
    function getSession() {
      try {
        const raw = localStorage.getItem('fielsdown_session_v1');
        return raw ? JSON.parse(raw) : null;
      } catch (e) {
        return null;
      }
    }

    function updateAuthUI() {
      const authSection = document.getElementById('auth-section');
      if (!authSection) return;

      const session = getSession();
      const DEFAULT_AVATAR = 'https://static.cdninstagram.com/rsrc.php/v3/yo/r/qhYsMwhQJy-.png';

      if (session && session.isLoggedIn) {
        authSection.innerHTML = 
          '<div class="user-menu" onclick="window.location.href=\\'/profile.html\\'" style="display:flex;align-items:center;gap:12px;cursor:pointer;">' +
          '<img src="' + (session.avatar || DEFAULT_AVATAR) + '" style="width:36px;height:36px;border-radius:50%;object-fit:cover;border:2px solid #e0e0e0;background:#f5f5f5;" onerror="this.src=\\'' + DEFAULT_AVATAR + '\\'">' +
          '<span class="user-nick" style="font-weight:600;color:#121212;font-size:15px;">b/' + session.username + '</span>' +
          '</div>';
      } else {
        authSection.innerHTML = 
          '<a href="/register.html" class="btn btn-secondary">Регистрация</a>' +
          '<a href="/login.html" class="btn btn-secondary">Вход</a>';
      }
    }

    document.addEventListener('DOMContentLoaded', updateAuthUI);
  </script>
</body>
</html>
`

	data := struct {
		Boards []map[string]interface{}
	}{
		Boards: boardData,
	}

	t, _ := template.New("index").Parse(tmpl)
	t.Execute(w, data)
}

// corsMiddleware
func corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next.ServeHTTP(w, r)
	})
}

func main() {
	r := mux.NewRouter()

	// API
	r.HandleFunc("/api/boards", createBoard).Methods("POST")

	// Страницы
	r.HandleFunc("/", getIndex).Methods("GET")
	r.PathPrefix("/").Handler(http.FileServer(http.Dir("./")))

	handler := corsMiddleware(r)

	log.Println("Сервер запущен на :8080")
	log.Fatal(http.ListenAndServe(":8080", handler))
}

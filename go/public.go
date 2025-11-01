package main

import (
	"encoding/json"
	"log"
	"net/http"
	"sync"
	"time"

	"github.com/gorilla/mux"
)

// Board — структура доски (как в all.sql)
type Board struct {
	ID          int    `json:"id"`
	Name        string `json:"name"`
	Title       string `json:"title"`
	Description string `json:"description"`
	Creator     string `json:"creator"`
	CreatedAt   string `json:"created_at"`
}

// In-memory storage (на Replit можно использовать файл или SQLite)
var (
	boards = []Board{}
	mutex  = sync.RWMutex{}
	nextID = 1
)

// getAllBoards — отдаёт все доски
func getAllBoards(w http.ResponseWriter, r *http.Request) {
	mutex.RLock()
	defer mutex.RUnlock()

	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Access-Control-Allow-Origin", "*")
	json.NewEncoder(w).Encode(boards)
}

// createBoard — создаёт новую доску
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

	if input.Name == "" || input.Creator == "" {
		http.Error(w, "Укажите название и автора", http.StatusBadRequest)
		return
	}

	// Проверка уникальности
	mutex.RLock()
	for _, b := range boards {
		if b.Name == input.Name {
			mutex.RUnlock()
			http.Error(w, "Доска уже существует", http.StatusConflict)
			return
		}
	}
	mutex.RUnlock()

	// Создание доски
	mutex.Lock()
	board := Board{
		ID:          nextID,
		Name:        input.Name,
		Title:       input.Name,
		Description: input.Description,
		Creator:     input.Creator,
		CreatedAt:   time.Now().Format(time.RFC3339),
	}
	boards = append(boards, board)
	nextID++
	mutex.Unlock()

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(board)
}

// corsMiddleware — обработка CORS для Replit
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

	// API эндпоинты
	r.HandleFunc("/api/boards", getAllBoards).Methods("GET")
	r.HandleFunc("/api/boards", createBoard).Methods("POST")

	// Обслуживание статики (твои HTML/CSS/JS файлы)
	r.PathPrefix("/").Handler(http.FileServer(http.Dir("./")))

	// Применяем CORS
	handler := corsMiddleware(r)

	log.Println("Сервер запущен на http://localhost:8080")
	log.Fatal(http.ListenAndServe(":8080", handler))
}

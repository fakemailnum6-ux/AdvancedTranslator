СТРОГАЯ АРХИТЕКТУРНАЯ СПЕЦИФИКАЦИЯ (САС)

Проект: Advanced CAT-Tool (Machine Translation Environment)

Версия документа: 9.0.0 (Ultimate Enterprise Architecture & Production Ready)

1. ТЕХНОЛОГИЧЕСКИЙ СТЕК (МАНДАТОРНЫЙ)

Любые отклонения от стека ЗАПРЕЩЕНЫ.

Среда (Desktop): Tauri v1.5+ (Rust-оболочка для минимального потребления RAM).

Бэкенд: Python 3.11+, FastAPI, Uvicorn.

База данных: SQLite3 (Глобальная БД + Локальные БД). Обязательное использование расширения FTS5 с паттерном External Content.

Сегментация текста (NLP): spaCy (или pysbd) для точного разбиения абзацев на предложения.

Поиск (Lorebook/Termbase): Алгоритм Ахо-Корасик (pyahocorasick) и rapidfuzz.

Фронтенд: React 18, TypeScript 5, Zustand v4+ (Global State), flexlayout-react v0.2+.

Виртуализация UI (Обязательно): react-window или react-virtuoso (для рендера только видимых сегментов).

Редактор: Slate.js + slate-history (с жестким лимитом истории).

Работа с EPUB: ebooklib (Python) или встроенная библиотека zipfile + BeautifulSoup4.

2. АРХИТЕКТУРА БАЗ ДАННЫХ, ПРОЕКТОВ И TM

Введена строгая изоляция моделей, индексы и оптимистичные блокировки.

2.1. Глобальная БД (global.sqlite)

Таблица Projects (Модель проекта)

id (TEXT, UUID, PK)

name (TEXT)

path (TEXT) - Абсолютный путь к папке проекта на диске.

source_lang (TEXT), target_lang (TEXT)

created_at (TIMESTAMP), last_opened (TIMESTAMP)

Система Translation Memory (FTS5 External Content Pattern)
Оптимальная структура для 100k+ записей без деградации производительности.

Таблица tm_units (Хранилище данных):

id (INTEGER, PK, AUTOINCREMENT)

source_text (TEXT), target_text (TEXT)

source_lang (TEXT), target_lang (TEXT)

created_at (TIMESTAMP)

project_id (TEXT, UUID)

Виртуальная таблица tm_fts (Поисковый индекс):

CREATE VIRTUAL TABLE tm_fts USING fts5(source_text, content='tm_units', content_rowid='id');

Триггеры (INSERT, UPDATE, DELETE) на tm_units для синхронизации tm_fts.

Таблица Termbase (Терминологическая база)

id (PK), term (TEXT), translation (TEXT), definition (TEXT), context (TEXT).

2.2. Локальная БД проекта (project.sqlite)

Таблица Segments (Рабочая таблица)

id (PK), chapter_id (FK)

segment_index (INT)

source_text (TEXT) - Содержит inline-плейсхолдеры (Пример: He said <1>Hello</1>).

target_text (TEXT)

inline_tags (JSON) - Хранит только маппинг. Пример: {"1": {"prefix": "<b>", "suffix": "</b>"}}.

status (TEXT) - Enum: NEW, TRANSLATED, EDITED, APPROVED, LOCKED.

locked_by (TEXT)

comment (TEXT)

version (INTEGER, DEFAULT 1) - Версия сегмента для оптимистичной блокировки.

updated_at (TIMESTAMP)

Обязательные индексы:

CREATE INDEX idx_segments_chapter ON Segments(chapter_id);

CREATE INDEX idx_segments_index ON Segments(segment_index);

Таблица Jobs (Персистентная очередь)

id (UUID, PK), task_type (TEXT), payload (JSON), status (Enum), error_log (TEXT).

3. СТРОГИЕ REST API КОНТРАКТЫ

3.1. Управление проектами

POST /api/projects/import-epub -> Создает запись, инициализирует БД проекта.

POST /api/projects/open -> Переключает контекст активной БД.

POST /api/projects/export-epub -> Собирает и возвращает .epub.

3.2. Работа с сегментами (Пагинация & Optimistic UI)

GET /api/chapters/{chapter_id}/segments?offset=0&limit=50

Фронтенд обязан использовать react-window и подгружать сегменты чанками (Infinite Loader), держа в DOM не более 30-80 сегментов.

PUT /api/segments/{segment_id}

Payload: {"target_text": "...", "status": "EDITED", "version": 5, "inline_tags": {...}}.

Optimistic Locking: Если payload.version != db.version, бэкенд возвращает 409 Conflict. Фронтенд предлагает пользователю принять изменения или оставить свои.

4. СЛОЙ АБСТРАКЦИИ (MT & LLM PROVIDERS)

Жестко запрещено хардкодить API-вызовы (OpenRouter, DeepL) прямо в логике Batch Translation. Используется паттерн Provider Registry.

Интерфейс TranslationProvider:

from abc import ABC, abstractmethod

class MTProvider(ABC):
    @abstractmethod
    async def translate(self, texts: list[str], source_lang: str, target_lang: str, context: dict) -> list[str]:
        pass


Структура директорий:

/backend/providers/
  ├── __init__.py      # Registry (Фабрика провайдеров)
  ├── deepl_mt.py      # Реализация MTProvider для DeepL
  ├── openai_mt.py     # Реализация MTProvider для OpenAI/OpenRouter
  └── google_mt.py     # Реализация MTProvider для Google Translate (Scraping/Free API)


5. ПАЙПЛАЙН ИМПОРТА И СЕГМЕНТАЦИИ (NLP & TAGS)

Шаг 1 (Блоки): BeautifulSoup извлекает блочные элементы (<p>, <div>).

Шаг 2 (Сегментация): spaCy разбивает абзацы на предложения.

Шаг 3 (Инлайн-теги): Исходный текст сохраняет маркеры тегов внутри строки для защиты позиций (например, He opened the <1>door</1>). Словарь с расшифровкой <1> -> <b> записывается в inline_tags JSON. Это исключает смещение позиций при редактировании.

Шаг 4: Предложения записываются в Segments.

6. ВСТРОЕННАЯ WORKER-СИСТЕМА И ТМ PIPELINE

При вызове POST /api/jobs/translate-chapter, Worker выполняет строгий каскадный пайплайн (Cascade Translation Pipeline):

Этап 1: Exact TM Match (100%)

Выборка target_text из tm_units где source_text == segment.source_text.

Статус: TRANSLATED. Участие MT не требуется.

Этап 2: Fuzzy TM Match (≥ 85%)

Запрос к tm_fts. Если rapidfuzz подтверждает сходство > 85%, сегмент заполняется с пометкой (Penalty). Статус: TRANSLATED или DRAFT.

Этап 3: Machine Translation (MT)

Оставшиеся NEW сегменты батчатся и отправляются в выбранный MTProvider.

Ответ записывается со статусом TRANSLATED (или спец. статусом AI_TRANSLATED).

Механизм восстановления: Worker раз в 1 секунду опрашивает Jobs. При краше задача возобновляется.

7. ФРОНТЕНД: РЕДАКТОР, ИСТОРИЯ И QA

7.1. Виртуализация и Автосохранение

Virtualization: react-window рендерит только видимые строки. Огромные документы (5000+ сегментов) потребляют минимум RAM.

Debounced API Call: Хук useDebounce (2000мс). Передает version для контроля коллизий.

7.2. Slate.js: Undo/Redo & Inline Tags

Ограничение памяти: history_depth = 100.

Inline Tags UX: Теги <1> рендерятся как неизменяемые void узлы Slate.js. Переводчик может их перемещать (Ctrl+X / Ctrl+V), но не может сломать их внутреннюю структуру. При экспорте бэкенд восстанавливает HTML из JSON по этим меткам.

7.3. Инструменты QA (Quality Assurance)

Кнопка [Run QA] запускает валидацию:

Missing Tags: Тег из source (<1>) отсутствует в target.

Double Spaces/Punctuation: Ошибки пунктуации.

Numbers Mismatch: Проверка соответствия цифр.

Untranslated Terms: Сверка с Termbase.

7.4. Панель TM и Конкордансный поиск

Concordance Search: Выделение слова -> Ctrl+K -> Запрос к tm_fts -> Подсветка истории переводов этого слова в боковой панели.

8. РЕЗЮМЕ UX ФИЧЕЙ

Терминология: Подсветка Termbase в тексте (пунктир).

Блокировка: LOCKED (предотвращает редактирование).

Workspace: Сохранение планировки FlexLayout в layout.json.

Навигация: Миникарта, шорткаты Enter (след. сегмент), Ctrl+Enter (Confirm + Save to TM).

Фокус-мод: Ctrl+Shift+F (скрывает боковые панели).

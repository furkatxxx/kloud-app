# Авито — Плейбук размещения объявлений (ASIC-майнеры)

## Проверенные методики работы с формой Авито

Этот файл содержит рабочие решения для типичных проблем при создании/редактировании объявлений на Авито через браузерную автоматизацию. **Не перебирай варианты — сразу используй то, что работает.**

---

## 1. Выпадающие списки (combobox): Алгоритм, Монеты, Страна, Производитель

**Проблема:** Клик через `find()` + `form_input()` визуально выбирает значение, но hidden input остаётся пустым.

**Рабочее решение:**
1. Кликнуть на поле (координаты из скриншота)
2. Набрать текст для фильтрации (например "SHA" для SHA-256, "Bit" для Bitcoin)
3. Кликнуть на нужный вариант в отфильтрованном списке
4. Кликнуть вне списка, чтобы закрыть dropdown

**Проверка:** Значение хранится в `<select>` с классом `styles-module-innerSelect-YVQGd`, а НЕ в `params[...]` hidden input. Проверять так:
```javascript
const selects = document.querySelectorAll('select.styles-module-innerSelect-YVQGd');
for (const sel of selects) {
    console.log(sel.name, sel.value, sel.options[sel.selectedIndex]?.textContent);
}
```

**Маппинг полей (select name → что это):**
- `params[185096][]` — Алгоритм майнинга (SHA-256 = 3341300)
- `params[185098][]` — Добываемые монеты (Bitcoin BTC = нужно найти value)
- `params[161296]` — Страна
- `params[191602]` — Единица хешрейта (TH/s = 3357556)

---

## 2. Ввод числовых значений (Хешрейт, Энергопотребление, Цена)

**Проблема:** `type()` может отправить символы в поисковую строку. `form_input()` обрезает. `Ctrl+A` выделяет всю страницу вместо текста в поле.

**⚠️ ЕДИНСТВЕННЫЙ РАБОЧИЙ МЕТОД — nativeInputValueSetter через JS:**
```javascript
const input = document.querySelector('input[data-marker="params[191601]/input"]');
const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
nativeInputValueSetter.call(input, '235');
input.dispatchEvent(new Event('input', { bubbles: true }));
input.dispatchEvent(new Event('change', { bubbles: true }));
```

**НИКОГДА не использовать:** `type()` для числовых полей, `Cmd+A` / `Ctrl+A` — они выделяют всю страницу.

**Маппинг числовых полей (data-marker):**
- `params[191601]/input` — Значение хешрейта
- `params[185099]/input` — Энергопотребление (Вт)
- `price` — Цена (data-marker: `price`)

---

## 3. Радио-кнопки (Тип охлаждения, Состояние Б/у)

**Рабочее решение:** Просто кликнуть по тексту варианта (координаты из скриншота). Работает надёжно.

- Тип охлаждения: "Воздушный" — кликнуть по тексту
- Состояние: "Б/у" — кликнуть по кнопке

---

## 4. Описание объявления (Draft.js contenteditable div)

**Проблема:** Это НЕ обычный textarea/input, а Draft.js редактор (`public-DraftEditor-content` contenteditable div). Draft.js управляет собственным EditorState. При сохранении формы отправляется внутренний стейт Draft.js, а НЕ DOM-содержимое поля.

**⚠️ ЕДИНСТВЕННЫЙ РАБОЧИЙ МЕТОД — Синтетический ClipboardEvent paste:**

Шаг 1: Кликнуть в поле описания, Cmd+A, Backspace (удалить всё через клавиатуру — Draft.js увидит)
Шаг 2: Вставить новый текст через синтетический paste event:

```javascript
const newDesc = 'Текст описания...';
const editor = document.querySelector('[contenteditable="true"]');
editor.focus();

// Создать синтетический paste event с DataTransfer
const dt = new DataTransfer();
dt.setData('text/plain', newDesc);
const pasteEvent = new ClipboardEvent('paste', {
  bubbles: true,
  cancelable: true,
  clipboardData: dt
});
editor.dispatchEvent(pasteEvent);
```

**ВАЖНО:** При замене текста — сначала очистить поле через клавиатуру (click → Cmd+A → Backspace), потом вставить paste. Если сразу paste с выделением через JS `selectNodeContents()` — текст может добавиться к существующему вместо замены.

**НИКОГДА не использовать:**
- `execCommand('insertText')` — визуально меняет DOM, но Draft.js НЕ обновляет свой EditorState → при сохранении отправляется старый текст
- `editor.innerHTML = '...'` — React/Draft.js не видит
- `editor.textContent = '...'` — та же проблема
- `type()` с длинным текстом — может вызвать "Detached while handling command"
- `form_input()` — не работает с contenteditable

---

## 4.1. Заголовок объявления (React controlled input)

**Рабочий метод для точечной замены текста в заголовке:**
```javascript
const titleInput = document.getElementById('title');
const currentValue = titleInput.value;
const pos = currentValue.indexOf('старый текст');
titleInput.focus();
titleInput.setSelectionRange(pos, pos + 'старый текст'.length);
// Затем через MCP type() отправить новый текст — реальные keyboard events обновят React state
```

**⚠️ Ограничение Авито:** Сервер нормализует регистр в заголовках. "ГТД" превращается в "гтд" (lowercase). "НДС" остаётся uppercase (известная аббревиатура для Авито). Это серверное поведение, обойти невозможно.

---

## 5. Модель устройства (Antminer T21 / S21+)

**Рабочее решение:** Использовать `find()` для поиска конкретной модели в списке:
```
find("Antminer S21+", tabId)
```
Затем кликнуть по найденному ref.

---

## 6. Загрузка фото

### ⚠️ ГЛАВНОЕ ПРАВИЛО: ТОЛЬКО ЧИСТЫЕ ФОТО

**Источник фото может быть ЛЮБОЙ** (CDN Bitmain, другие сайты, предоставленные пользователем). Главное — фото должны быть **чистыми**.

### Требования к чистоте фото (обязательно для ВСЕХ объявлений):
- ❌ Нет водяных знаков
- ❌ Нет логотипов сторонних сайтов/магазинов
- ❌ Нет текста поверх изображения
- ❌ Нет рамок, баннеров, цен на фото
- ❌ Нет посторонних элементов (стрелки, иконки, надписи)
- ✅ Только изображение самого устройства (ASIC-майнера)

### Если чистого фото нет — ПОЧИСТИТЬ перед загрузкой:
- Обрезать (crop) области с водяными знаками/логотипами
- Закрасить/замазать текст поверх изображения
- Использовать инструменты обработки (sips, ImageMagick, ffmpeg и т.д.)
- **Не загружать грязное фото** — лучше потратить время на чистку

### Приоритет источников фото:
1. **Фото от пользователя** — если Фуркат предоставил, использовать их
2. **Официальный сайт Bitmain** (`shop.bitmain.com` / CDN) — обычно чистые
3. **Любой другой источник** — но ОБЯЗАТЕЛЬНО проверить на чистоту и почистить при необходимости

### Проверенные URL фото по моделям:

**Antminer S21+ 235TH/s:**
- `https://assets-www.bitmain.com.cn/shop-image-storage-s3/product/2024/06/28/13/4c2af89a-8fec-42b1-9ff1-905375e027ee_540.jpg`

### Рабочий метод загрузки: fetch + DataTransfer через JS

Если URL фото разрешает CORS с avito.ru (например CDN Bitmain) — загрузка через fetch + DataTransfer:

```javascript
(async () => {
  try {
    const response = await fetch('URL_ФОТО_С_CDN_BITMAIN');
    const blob = await response.blob();
    const file = new File([blob], 'antminer_photo.jpg', {type: 'image/jpeg'});
    const dt = new DataTransfer();
    dt.items.add(file);
    const input = document.querySelector('input[type="file"]');
    input.files = dt.files;
    input.dispatchEvent(new Event('change', { bubbles: true }));
    return 'SUCCESS! File size: ' + blob.size + ' bytes';
  } catch(e) {
    return 'Error: ' + e.message;
  }
})();
```

**ВАЖНО:** `await` нельзя использовать вне `async` функции в JS tool — всегда оборачивать в `(async () => { ... })()`.

### НЕ работающие подходы (НИКОГДА не пробовать!):
- ❌ `canvas.toDataURL()` с cross-origin картинками → SecurityError (tainted canvas)
- ❌ `upload_image` MCP tool → "Unable to access message history to retrieve image"
- ❌ `fetch` с других доменов (oneminers.com, mirbeznala.ru и пр.) → CORS block
- ❌ base64 через чат — слишком длинные строки, обрезаются
- ❌ Фото с водяными знаками, логотипами, текстом — ЗАПРЕЩЕНЫ

---

## 7. Порядок заполнения формы (оптимальный)

1. Заголовок (ввод текста)
2. Категория (авто-определение)
3. Страна → Производитель → Модель (выпадающие списки)
4. Хешрейт: единица (TH/s) → значение (число)
5. Алгоритм (SHA-256) — combobox с фильтрацией
6. Охлаждение (Воздушный) — радио-кнопка
7. Монеты (Bitcoin BTC) — combobox с фильтрацией
8. Энергопотребление (число, Вт)
9. Состояние (Б/у) — кнопка
10. Описание (contenteditable)
11. Фото (загрузка)
12. Скролл вниз: Гарантия, Документация, Срок эксплуатации, Чистота, Прошивка, Неисправности
13. Доступность, Цена, НДС, Закрывающие документы
14. Адрес
15. Условия работы
16. Публикация

---

## 8. Шаблоны описаний (актуальные, из audit-fixes.md)

Описания обновлены 22.02.2026. Ключевые отличия от старых версий:
- Убрано слово "аптайм" (не понятно покупателям)
- Добавлен блок "ТЕХНИЧЕСКИЕ ХАРАКТЕРИСТИКИ"
- Указан "договор поставки" и "доставка транспортными компаниями"
- Добавлено "счёт-фактура, УПД"
- SEO-хвост в конце: "Асик майнер ASIC Bitmain криптооборудование для майнинга"

### Актуальные описания хранятся в `/Users/furkatabduzalilov/Desktop/KLOUD/audit-fixes.md`

Ключевые параметры:
| Модель | Цена | Кол-во | Энергопотребление |
|--------|------|--------|-------------------|
| T21 190TH/s | 120 000 руб. | 30 шт | 3 610 Вт |
| T21 180TH/s | 130 000 руб. | 75 шт | 3 276 Вт |
| S21+ 235TH/s | 160 000 руб. | 50 шт | 3 150 Вт |

---

## 9. Опубликованные объявления

| Модель | ID | Цена | Кол-во | Статус | Описание обновлено |
|--------|-----|------|--------|--------|--------------------|
| T21 190TH/s | 7973842400 | 120 000 ₽ | 30 шт | ✅ Опубликовано | 22.02.2026 |
| T21 180TH/s | 7973669917 | 130 000 ₽ | 75 шт | ✅ Опубликовано | 22.02.2026 |
| S21+ 235TH/s | 7973018296 | 160 000 ₽ | 50 шт | ✅ Опубликовано | 22.02.2026 |

---

## 10. Критические правила (НЕ НАРУШАТЬ)

1. **Числовые поля → ТОЛЬКО через nativeInputValueSetter (JS)**. Никогда не использовать `type()`, `Cmd+A`, `form_input()`.
2. **Описание (Draft.js contenteditable) → ТОЛЬКО через ClipboardEvent paste**. Алгоритм: click → Cmd+A → Backspace → JS paste event. Никогда не использовать `execCommand('insertText')` — Draft.js его игнорирует при сохранении!
3. **Фото → ТОЛЬКО чистые** (без водяных знаков, логотипов, текста). Источник — любой, но если фото грязное — почистить перед загрузкой.
4. **Загрузка фото → через fetch + DataTransfer (JS)**. Если CORS блокирует — скачать фото локально и загрузить другим способом. Никогда не использовать `upload_image`, `canvas.toDataURL` с cross-origin.
5. **Не упоминать тариф хостинга и слово "аптайм"** в описаниях объявлений.
6. **Цена = базовая + 10 000 ₽** за единицу (наценка).
7. **Авито нормализует регистр в заголовках**: "ГТД" → "гтд" (серверное ограничение, не обходится).
8. **После сохранения — ВСЕГДА проверять описание на живой странице**. Редирект на cpxpromo ≠ гарантия сохранения описания (Draft.js может игнорировать execCommand).

## 11. Самопроверка объявлений (JS-скрипт)

Запускать на живой странице объявления для верификации:
```javascript
const h1 = document.querySelector('h1')?.textContent || '';
const price = document.querySelector('[itemprop="price"]')?.getAttribute('content') || '';
const descBlock = document.querySelector('[itemprop="description"]');
const desc = descBlock ? descBlock.textContent : '';
JSON.stringify({
  title: h1, price: price, descLength: desc.length,
  descFirst200: desc.substring(0, 200),
  checks: {
    no_aptime: !desc.includes('аптайм'),
    has_NDS: desc.includes('НДС'),
    has_GTD: desc.includes('ГТД'),
    has_beznal: desc.includes('безналичн'),
    has_jurLico: desc.includes('юридическ'),
    has_dogovorPostavki: desc.includes('договор поставки'),
    has_techChar: desc.includes('ТЕХНИЧЕСКИЕ ХАРАКТЕРИСТИКИ')
  }
});
```


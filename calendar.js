// calendar.js - Повноцінний календар з підтяжкою подій із Google Таблиць
// + Перегляд конкретного дня з деталями та категоріями
const monthNames = ['Січень', 'Лютий', 'Березень', 'Квітень', 'Травень', 'Червень', 'Липень', 'Серпень', 'Вересень', 'Жовтень', 'Листопад', 'Грудень'];
const weekDays = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Нд'];

// Категорії івентів — label та колір
// Синхронізовано з Google Таблицею (колонка Категорія)
const eventCategories = {
    tournament: { label: '🏆 Турнір', color: '#ffd700' },
    holiday: { label: '🎉 Свято', color: '#ff007b' },
    birthday: { label: '🎂 Свято', color: '#ff007b' },
    meeting: { label: '⚖️ СУД', color: '#00b0ff' },
    stream: { label: '🎮 Стрім', color: '#a259ff' },
    event: { label: '🎮 Стрім', color: '#a259ff' },
    announcement: { label: '📌 Інше', color: '#ff9800' },
    other: { label: '📌 Інше', color: '#ff9800' },
};

let currentView = new Date();
let serverEventsData = []; // Сюди зберігатимуться події з бекенду
let selectedDate = null;   // Поточно вибраний день

// ──────────────────────────────────────────────────
// ДОПОМІЖНА: отримати підпис категорії
// ──────────────────────────────────────────────────
function getCategoryInfo(type) {
    return eventCategories[type] || eventCategories['other'];
}

// ──────────────────────────────────────────────────
// ПАНЕЛЬ ДНЯ — вбудована у sidebar
// ──────────────────────────────────────────────────
function renderDayPanel(dateStr) {
    const panel = document.getElementById('dayPanelCard');
    if (!panel) return;

    const [year, month, day] = dateStr.split('-').map(Number);
    const label = `${day} ${monthNames[month - 1]} ${year}`;

    // Всі івенти цього дня
    const dayEvents = serverEventsData.filter(e => e.date && e.date.startsWith(dateStr));

    if (dayEvents.length === 0) {
        panel.innerHTML = `
            <div class="day-panel-header">
                <span class="label-pill">ДЕНЬ</span>
                <strong class="day-panel-date">${label}</strong>
            </div>
            <p class="day-panel-empty">Подій не заплановано</p>
        `;
    } else {
        let eventsHtml = dayEvents.map(ev => {
            const cat = getCategoryInfo(ev.type);
            return `
                <div class="day-event-item" style="border-left-color: ${cat.color};">
                    <span class="day-event-cat" style="color: ${cat.color};">${cat.label}</span>
                    <strong class="day-event-title">${ev.title || 'Без назви'}</strong>
                    ${ev.time ? `<span class="day-event-time">🕐 ${ev.time}</span>` : ''}
                    ${ev.desc ? `<p class="day-event-desc">${ev.desc}</p>` : ''}
                </div>
            `;
        }).join('');

        panel.innerHTML = `
            <div class="day-panel-header">
                <span class="label-pill">ДЕНЬ</span>
                <strong class="day-panel-date">${label}</strong>
            </div>
            <div class="day-events-list">${eventsHtml}</div>
        `;
    }

    panel.style.display = 'block';
}

// ──────────────────────────────────────────────────
// TOOLTIP
// ──────────────────────────────────────────────────
let tooltipEl = null;

function showTooltip(events, dateStr, x, y) {
    hideTooltip();
    const [yr, mo, da] = dateStr.split('-').map(Number);
    const dateLabel = `${da} ${monthNames[mo - 1]} ${yr}`;

    tooltipEl = document.createElement('div');
    tooltipEl.className = 'event-dot-tooltip';

    let html = `<div class="tooltip-date">${dateLabel}</div>`;
    events.forEach(ev => {
        const cat = getCategoryInfo(ev.type);
        html += `
            <div class="tooltip-event">
                <span class="tooltip-event-cat" style="color:${cat.color}">${cat.label}</span>
                <span class="tooltip-event-title">${ev.title || 'Без назви'}</span>
                ${ev.time ? `<span class="tooltip-event-time">🕐 ${ev.time}</span>` : ''}
            </div>`;
    });
    tooltipEl.innerHTML = html;
    document.body.appendChild(tooltipEl);
    positionTooltip(x, y);
}

function positionTooltip(x, y) {
    if (!tooltipEl) return;
    const tw = tooltipEl.offsetWidth;
    const th = tooltipEl.offsetHeight;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    let left = x + 12;
    let top = y + 12;
    if (left + tw > vw - 8) left = x - tw - 12;
    if (top + th > vh - 8) top = y - th - 12;
    tooltipEl.style.left = left + 'px';
    tooltipEl.style.top = top + 'px';
}


function hideTooltip() {
    if (tooltipEl) { tooltipEl.remove(); tooltipEl = null; }
}

// ──────────────────────────────────────────────────
// 5 НАЙБЛИЖЧИХ ПОДІЙ
// ──────────────────────────────────────────────────
function renderUpcomingEvents() {
    const container = document.getElementById('upcomingEventsList');
    if (!container) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Фільтруємо майбутні + сьогоднішні, сортуємо за датою
    const upcoming = serverEventsData
        .filter(ev => {
            if (!ev.date) return false;
            const d = new Date(ev.date);
            return d >= today;
        })
        .sort((a, b) => new Date(a.date) - new Date(b.date))
        .slice(0, 5);

    if (upcoming.length === 0) {
        container.innerHTML = '<p style="color:var(--text-muted); text-align:center; padding:40px 0;">Найближчих подій немає</p>';
        return;
    }

    container.innerHTML = upcoming.map(ev => {
        const cat = getCategoryInfo(ev.type);
        const [yr, mo, da] = ev.date.split('-').map(Number);
        const dateLabel = `${da} ${monthNames[mo - 1]} ${yr}`;

        // Скільки днів залишилось
        const evDate = new Date(ev.date);
        evDate.setHours(0, 0, 0, 0);
        const diff = Math.round((evDate - today) / 86400000);
        const diffLabel = diff === 0 ? 'Сьогодні' : diff === 1 ? 'Завтра' : `За ${diff} дн.`;

        return `
        <div class="upcoming-event-card">
            <div class="upcoming-event-left">
                <span class="upcoming-event-dot" style="background:${cat.color}; box-shadow:0 0 10px ${cat.color};"></span>
            </div>
            <div class="upcoming-event-body">
                <div class="upcoming-event-top">
                    <span class="upcoming-event-cat" style="color:${cat.color}">${cat.label}</span>
                    <span class="upcoming-event-diff">${diffLabel}</span>
                </div>
                <div class="upcoming-event-title">${ev.title || 'Без назви'}</div>
                <div class="upcoming-event-meta">
                    📅 ${dateLabel}${ev.time ? ' &nbsp;🕐 ' + ev.time : ''}
                </div>
                ${ev.desc ? `<div class="upcoming-event-desc">${ev.desc}</div>` : ''}
            </div>
        </div>`;
    }).join('');
}

// ──────────────────────────────────────────────────
// ОСНОВНА ФУНКЦІЯ МАЛЮВАННЯ КАЛЕНДАРЯ
// ──────────────────────────────────────────────────
window.renderCalendar = function (serverEvents) {
    if (serverEvents) serverEventsData = serverEvents;

    const grid = document.getElementById('calendarGrid');
    const miniGrid = document.getElementById('miniCalendarGrid');
    const monthYearLabel = document.getElementById('monthYearLabel');
    const miniMonthLabel = document.getElementById('miniMonthLabel');
    const miniYearLabel = document.getElementById('miniYearLabel');

    if (!miniGrid) return;

    const year = currentView.getFullYear();
    const month = currentView.getMonth();

    if (monthYearLabel) monthYearLabel.textContent = `${monthNames[month]} ${year}`;
    if (miniMonthLabel) miniMonthLabel.textContent = monthNames[month];
    if (miniYearLabel) miniYearLabel.textContent = year;

    function createCells(container, isMini) {
        container.innerHTML = '';

        weekDays.forEach(day => {
            const d = document.createElement('div');
            d.className = 'calendar-cell calendar-cell-heading';
            d.textContent = isMini ? day.charAt(0) : day;
            container.appendChild(d);
        });

        const firstDay = new Date(year, month, 1).getDay();
        const offset = (firstDay + 6) % 7;
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const totalCells = 42;
        const today = new Date();

        for (let i = 0; i < totalCells; i++) {
            const cell = document.createElement('div');
            cell.className = 'calendar-cell';

            if (i >= offset && i < offset + daysInMonth) {
                const dayNum = i - offset + 1;
                const dayStr = dayNum < 10 ? '0' + dayNum : String(dayNum);
                const monthStr = (month + 1) < 10 ? '0' + (month + 1) : String(month + 1);
                const dateStr = `${year}-${monthStr}-${dayStr}`;

                const numSpan = document.createElement('span');
                numSpan.className = 'cell-day-num';
                numSpan.textContent = dayNum;
                cell.appendChild(numSpan);

                if (year === today.getFullYear() && month === today.getMonth() && dayNum === today.getDate()) {
                    cell.classList.add('calendar-cell-today');
                }

                const dayEvents = serverEventsData.filter(e => e.date && e.date.startsWith(dateStr));
                if (dayEvents.length > 0) {
                    cell.classList.add('has-events');

                    if (!isMini) {
                        const dotsWrap = document.createElement('div');
                        dotsWrap.className = 'cell-dots';
                        dayEvents.slice(0, 3).forEach(ev => {
                            const dot = document.createElement('span');
                            dot.className = 'event-dot';
                            const cat = getCategoryInfo(ev.type);
                            dot.style.background = cat.color;
                            dot.style.boxShadow = `0 0 6px ${cat.color}`;

                            // Tooltip при наведенні на крапку
                            dot.addEventListener('mouseenter', (e) => {
                                showTooltip(dayEvents, dateStr, e.clientX, e.clientY);
                            });
                            dot.addEventListener('mousemove', (e) => {
                                positionTooltip(e.clientX, e.clientY);
                            });
                            dot.addEventListener('mouseleave', hideTooltip);

                            dotsWrap.appendChild(dot);
                        });
                        cell.appendChild(dotsWrap);
                    } else {
                        const dot = document.createElement('div');
                        dot.className = 'event-dot';
                        const cat = getCategoryInfo(dayEvents[0].type);
                        dot.style.background = cat.color;
                        dot.style.boxShadow = `0 0 5px ${cat.color}`;
                        cell.appendChild(dot);
                    }
                }

            } else {
                cell.style.opacity = '0.15';
            }

            container.appendChild(cell);
        }
    }

    if (grid) createCells(grid, false);
    createCells(miniGrid, true);
    renderUpcomingEvents();
};

// ──────────────────────────────────────────────────
// ІНІЦІАЛІЗАЦІЯ ПІСЛЯ DOMContentLoaded
// ──────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    // Навігація місяців
    document.getElementById('prevMonth')?.addEventListener('click', () => {
        currentView.setMonth(currentView.getMonth() - 1);
        window.renderCalendar();
    });
    document.getElementById('nextMonth')?.addEventListener('click', () => {
        currentView.setMonth(currentView.getMonth() + 1);
        window.renderCalendar();
    });
    document.getElementById('miniPrevMonth')?.addEventListener('click', () => {
        currentView.setMonth(currentView.getMonth() - 1);
        window.renderCalendar();
    });
    document.getElementById('miniNextMonth')?.addEventListener('click', () => {
        currentView.setMonth(currentView.getMonth() + 1);
        window.renderCalendar();
    });
    document.getElementById('todayButton')?.addEventListener('click', () => {
        currentView = new Date();
        window.renderCalendar();
    });

    // Малюємо одразу
    window.renderCalendar();
    renderUpcomingEvents();
});
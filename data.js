// data.js - База даних SLAY
// Номінації 2026 завантажуються автоматично з Google Таблиці (аркуш "Номінації")
const siteData = {
    config: {
        siteTitle: 'SLAY МОГО СЕРВЕРА',
        siteSubtitle: 'ЩОРІЧНА ПРЕМІЯ',
        discordUrl: 'https://discord.gg/ksnG7Dbs3f',
        constitutionDocUrl: 'https://docs.google.com/document/d/e/2PACX-1vSJo1YtcyGpmbSflYi34DHToE7lwthT1sRd21MVtFUMuDKAOM6wiJR173q_HkHNVevtZi0eOu_DJmhK/pub',
        scriptUrl: 'https://script.google.com/macros/s/AKfycbz37SRQCw0Jyhd5W4YFwm29b9DG_4z32QdJEqGIt9TM_hlzZJ0YTGxzk7KszZAbzmpf/exec'
    },
    years: {
        '2026': {
            status: 'active',
            startDate: '2026-05-20T12:00:00',
            endDate: '2026-07-17T20:00:00',
            subtitle: 'Голосуй за найгучніші номінації!',
            // Заповнюється автоматично з Google Таблиці (аркуш "Номінації")
            nominations: []
        },
        '2025': {
            status: 'archived',
            subtitle: 'Архівні результати премії 2025 року',
            nominations: [
                { id: 'kolaba', title: '🛋️ Колаба Года', winner: { name: 'СКВАД РОМАНА' } },
                { id: 'zavoz', title: '🚗 Завоз Года', winner: { name: 'Подкаст' } },
                { id: 'genshin', title: '⚔️ Геншен-плейер года', winner: { name: 'Юра' } },
                { id: 'meme25', title: '😂 Людина-мем года', winner: { name: 'Жіб' } },
                { id: 'conflict', title: '💥 Конфлікт года', winner: { name: 'Юля' } },
                { id: 'otkat', title: '↩️ Откат года', winner: { name: 'Муви Олеся' } },
                { id: 'game25', title: '🎮 Игра года', winner: { name: 'Геншин' } },
                { id: 'afk', title: '💤 Людина-АФК года', winner: { name: 'Роман Мендела' } },
                { id: 'active', title: '⚡ Чел-актив года', winner: { name: 'Олесь' } },
                { id: 'glow', title: '✨ Глов-ап года', winner: { name: 'Стас' } },
                { id: 'proriv', title: '🚀 Прорив года', winner: { name: 'Богдан / Матвій' } },
                { id: 'kenty', title: '💑 Кенти/Пара года', winner: { name: 'Сява + Олесь' } },
                { id: 'gayvens', title: '🕹️ Гейвенс Кинг Года', winner: { name: 'Олесь' } },
                { id: 'pidar', title: '🤡 Підар Кинг Года', winner: { name: 'Роман Штень' } },
                { id: 'singer', title: '🎤 Співак Года', winner: { name: 'Роман Штень' } },
                { id: 'multi', title: '🎲 Мультиплеер ігра года', winner: { name: 'Peak' } },
                { id: 'krash', title: '😍 Людина-краш года', winner: { name: 'Стас' } },
                { id: 'gay', title: '🏳️‍🌈 Гей — Года', winner: { name: 'Олесь' } },
                { id: 'dama', title: '👑 Дама Года', winner: { name: 'Женя' } }
            ]
        }
    }
};

// ===================================================================
// ЗАВАНТАЖЕННЯ ПЕРЕМОЖЦІВ З АРКУШУ "РЕЗУЛЬТАТИ" GOOGLE ТАБЛИЦІ
// ===================================================================
async function loadWinnersFromSheet() {
    try {
        const url = siteData.config.scriptUrl + '?action=getResults';
        const response = await fetch(url);
        const data = await response.json();
        if (data.status === 'success' && Array.isArray(data.results)) {
            const nominations = siteData.years['2026'].nominations;
            data.results.forEach((pair, index) => {
                if (nominations[index] && pair[0]) {
                    nominations[index].winnerId = pair[0];
                    nominations[index].winnerVotes = pair[1];
                }
            });
            console.log('Переможці завантажені з Google Таблиці');
        }
    } catch (e) {
        console.log('Результати з таблиці недоступні, використовуємо локальні winnerId');
    }
}

loadWinnersFromSheet();

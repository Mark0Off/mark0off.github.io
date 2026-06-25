// app.js - Мозок сайту. Роутинг, Слайдер, LocalStorage та Fetch
const app = {
    currentView: 'home',
    currentYear: '2026',
    globalData: null,

    // State для голосування
    nomIndex: 0,
    candIndex: 0,
    userVotes: JSON.parse(localStorage.getItem('slayVotes2026')) || {},

    init() {
        this.renderNav();
        this.navigate('home');
        this.fetchServerData();
    },

    renderNav() {
        const nav = document.getElementById('mainNav');
        if (!nav) return;
        nav.innerHTML = '';
        ['2025', '2026', 'Конституція'].forEach(item => {
            const btn = document.createElement('button');
            btn.className = 'year-button';
            btn.textContent = item;
            btn.onclick = () => {
                if (item === 'Конституція') this.navigate('constitution');
                else { this.currentYear = item; this.navigate('year'); }
            };
            nav.appendChild(btn);
        });
    },

    navigate(viewId) {
        this.currentView = viewId;
        document.querySelectorAll('.view-section').forEach(el => el.classList.remove('active'));
        document.getElementById(`view-${viewId}`).classList.add('active');

        // Знімаємо тему якщо виходимо з секції року
        if (viewId !== 'year') {
            document.body.classList.remove('theme-2026', 'theme-2025');
        }

        if (viewId === 'year') this.renderYearContent();

        if (viewId === 'constitution') {
            const frame = document.getElementById('constitutionFrame');
            const placeholder = document.getElementById('constitutionPlaceholder');
            if (frame) {
                const url = siteData.config.constitutionDocUrl || '';
                const isPlaceholder = !url || url === 'https://example.com';
                if (isPlaceholder) {
                    frame.style.display = 'none';
                    if (placeholder) placeholder.style.display = 'flex';
                } else {
                    // Вставляємо URL як є — не модифікуємо
                    if (frame.getAttribute('src') !== url) frame.setAttribute('src', url);
                    frame.style.display = 'block';
                    if (placeholder) placeholder.style.display = 'none';
                }
            }
        }
    },

    fetchServerData() {
        if (!siteData.config.scriptUrl) return;
        fetch(siteData.config.scriptUrl)
            .then(r => r.json())
            .then(res => {
                if (res.status === 'success') {
                    this.globalData = res;

                    // Підвантажуємо номінації з таблиці якщо є
                    if (res.nominations && res.nominations.length > 0) {
                        siteData.years['2026'].nominations = res.nominations;
                        console.log('✅ Номінації завантажено з таблиці:', res.nominations.length);
                    }

                    // Переможці з таблиці
                    if (res.winners) {
                        const noms = siteData.years['2026'].nominations;
                        noms.forEach(nom => {
                            const w = res.winners[nom.id] || res.winners[nom.title];
                            if (w) nom.winnerId = w;
                        });
                    }

                    if (window.renderCalendar && res.calendar) window.renderCalendar(res.calendar);
                    if (this.currentView === 'year') this.renderYearContent();
                }
            }).catch(e => console.log('Скрипт ще не готовий або помилка CORS.'));
    },

    renderYearContent() {
        const yearData = siteData.years[this.currentYear];
        if (!yearData) return;

        // Тема 2026 — лише для 2026, 2025 без теми
        document.body.classList.remove('theme-2026', 'theme-2025');
        if (this.currentYear === '2026') {
            document.body.classList.add('theme-2026');
        }

        const votingUi = document.getElementById('votingInterface');
        const submitUi = document.getElementById('submitInterface');
        const closedUi = document.getElementById('yearFormClosed');

        // ── 1. ВЕЙТЕР (LOADER) ПОКИ ДАНІ З ТАБЛИЦІ ЗАВАНТАЖУЮТЬСЯ ─────────
        if (this.currentYear === '2026' && (!yearData.nominations || yearData.nominations.length === 0)) {
            votingUi.style.display = 'none';
            submitUi.style.display = 'none';
            closedUi.style.display = 'block';
            closedUi.innerHTML = `
                <div style="padding: 60px; text-align: center;">
                    <div class="app-icon" style="margin: 0 auto 24px; width: 80px; height: 80px; animation: floatIcon 3s ease-in-out infinite;">
                        <div class="app-icon-inner" style="width: 56px; height: 56px; animation: spinCore 6s linear infinite reverse;">
                            <div class="app-icon-core" style="width: 24px; height: 24px; animation: spinCore 3s linear infinite; display: flex; align-items: center; justify-content: center;">
                                <div class="app-icon-stop" style="width: 5px; height: 5px; background: #fff; border-radius: 1px;"></div>
                            </div>
                        </div>
                    </div>
                    <h2 style="color: #fff; font-size: 1.5rem; margin-bottom: 12px; font-weight: 900; letter-spacing: 0.05em;">ЗАВАНТАЖЕННЯ ДАНИХ...</h2>
                    <p style="color: var(--text-muted);">Зачекайте будь ласка, прогрузка даних з сервера...</p>
                </div>
            `;
            return;
        }

        const now = new Date();
        const isEnded = yearData.endDate && now >= new Date(yearData.endDate);
        const isStarted = !yearData.startDate || now >= new Date(yearData.startDate);

        // ── ДО ПОЧАТКУ голосування ───────────────────────────────────────
        if (yearData.status === 'active' && !isStarted) {
            votingUi.style.display = 'none';
            submitUi.style.display = 'none';
            closedUi.style.display = 'block';
            closedUi.innerHTML = this.renderComingSoon(yearData);
            return;
        }

        // Архів (2025 і будь-який archived рік)
        if (yearData.status === 'archived') {
            votingUi.style.display = 'none';
            submitUi.style.display = 'none';
            closedUi.style.display = 'block';
            closedUi.innerHTML = this.renderArchivedYear(yearData);
            return;
        }

        if (yearData.status === 'active' && !isEnded) {
            closedUi.style.display = 'none';
            submitUi.style.display = 'none';
            votingUi.style.display = 'block';
            this.nomIndex = 0;
            this.candIndex = 0;
            this.renderNominationSlider();
            this.initSliderEvents();
        } else {
            votingUi.style.display = 'none';
            submitUi.style.display = 'none';
            closedUi.style.display = 'block';

            const serverWinners = this.globalData?.winners || {};
            const allWinnersHtml = this.renderAllWinners(yearData, serverWinners);

            // Збираємо великі картки переможців
            const bigCards = [];
            yearData.nominations?.forEach((nom, idx) => {
                let wName = serverWinners[nom.id] || serverWinners[nom.title] || nom.winnerId;
                let wCand = nom.candidates.find(c => c.id === wName || c.name === wName) || nom.candidates[0];
                if (!wCand) return;

                const num = String(idx + 1).padStart(2, '0');
                const isEmoji = !wCand.avatar || !wCand.avatar.startsWith('http');
                const isVideo = nom.type === 'video';

                let avatarHtml;
                if (isVideo || isEmoji) {
                    const letter = (wCand.name || '?').slice(0, 2).toUpperCase();
                    avatarHtml = `<div class="bc-avatar-letter">${letter}</div>`;
                } else {
                    avatarHtml = `<img class="bc-avatar-img" src="${wCand.avatar}" alt="${wCand.name}">`;
                }

                bigCards.push(`
                    <div class="bc-card">
                        <div class="bc-num">${num}</div>
                        <div class="bc-avatar">${avatarHtml}</div>
                        <div class="bc-name">${wCand.name.toUpperCase()}</div>
                        <div class="bc-category">${nom.title.replace(/^\S+\s*/, '')}</div>
                        <div class="bc-winner-label">Переможець</div>
                    </div>`);
            });

            const total = bigCards.length;
            const perPage = 3;
            let slideIdx = 0;

            const SVG_L = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M15 18L9 12L15 6" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
            const SVG_R = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M9 6L15 12L9 18" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

            const getSlice = (idx) => {
                const out = [];
                for (let i = 0; i < perPage; i++) out.push(bigCards[(idx * perPage + i) % total]);
                return out.join('');
            };

            const pages = Math.ceil(total / perPage);

            closedUi.innerHTML = `
                <div class="bc-header">
                    <span class="bc-label">ПЕРЕМОЖЦІ SLAY ${this.currentYear}</span>
                </div>
                <div class="bc-slider-wrap">
                    <button class="bc-arrow bc-arrow-left" id="bcPrev">${SVG_L}</button>
                    <div class="bc-track" id="bcTrack">${getSlice(0)}</div>
                    <button class="bc-arrow bc-arrow-right" id="bcNext">${SVG_R}</button>
                </div>
                ${allWinnersHtml}`;

            const track = document.getElementById('bcTrack');
            const btnPrev = document.getElementById('bcPrev');
            const btnNext = document.getElementById('bcNext');

            const goTo = (i) => {
                slideIdx = ((i % pages) + pages) % pages;
                track.classList.add('bc-fade');
                setTimeout(() => {
                    track.innerHTML = getSlice(slideIdx);
                    track.classList.remove('bc-fade');
                }, 220);
            };

            btnPrev?.addEventListener('click', () => { clearInterval(this._sliderTimer); goTo(slideIdx - 1); this._sliderTimer = setInterval(() => goTo(slideIdx + 1), 10000); });
            btnNext?.addEventListener('click', () => { clearInterval(this._sliderTimer); goTo(slideIdx + 1); this._sliderTimer = setInterval(() => goTo(slideIdx + 1), 10000); });

            if (this._sliderTimer) clearInterval(this._sliderTimer);
            this._sliderTimer = setInterval(() => goTo(slideIdx + 1), 10000);
        }
    },

    // ── Архівна сторінка (2025 та ін.) ─────────────────────────────────
    renderArchivedYear(yearData) {
        const year = this.currentYear;
        const noms = yearData.nominations || [];

        if (!noms.length) {
            return `<div style="padding:60px;text-align:center;color:var(--text-muted)">
                <div style="font-size:3rem;margin-bottom:20px">🏆</div>
                <h2 style="color:#fff;font-size:2rem;margin-bottom:12px">SLAY ${year}</h2>
                <p>Архів цього року в розробці</p>
            </div>`;
        }

        const cards = noms.map((nom, i) => {
            const winner = nom.winner || nom.candidates?.[0];
            if (!winner) return '';
            const num = String(i + 1).padStart(2, '0');
            const isEmoji = !winner.avatar || !winner.avatar.startsWith('http');
            const avatarHtml = isEmoji
                ? `<div class="arch-avatar-letter">${(winner.name || '?').slice(0, 2).toUpperCase()}</div>`
                : `<img class="arch-avatar-img" src="${winner.avatar}" alt="${winner.name}">`;
            return `
                <div class="arch-card">
                    <div class="arch-num">${num}</div>
                    <div class="arch-avatar">${avatarHtml}</div>
                    <div class="arch-nom">${nom.title}</div>
                    <div class="arch-name">${winner.name}</div>
                    <div class="arch-label">Переможець</div>
                </div>`;
        }).join('');

        return `
            <div class="arch-header">
                <span class="arch-year-label">SLAY ${year} — АРХІВ</span>
            </div>
            <div class="arch-grid">${cards}</div>`;
    },

    // ── Екран "Скоро починається" ────────────────────────────────────────
    renderComingSoon(yearData) {
        const start = new Date(yearData.startDate);
        const dateStr = start.toLocaleDateString('uk-UA', { day: 'numeric', month: 'long', year: 'numeric' });
        const timeStr = start.toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' });

        const nomCards = yearData.nominations.map(nom => `
            <div class="cs-nom-card">
                <span class="cs-nom-emoji">${nom.title.match(/\p{Emoji}/u)?.[0] || '🏆'}</span>
                <span class="cs-nom-title">${nom.title.replace(/^\p{Emoji}\s*/u, '')}</span>
                <span class="cs-nom-count">${nom.candidates.length} учасників</span>
            </div>`).join('');

        return `
            <div class="coming-soon-screen">
                <div class="cs-badge">НЕЗАБАРОМ</div>
                <h2 class="cs-title">ГОЛОСУВАННЯ ВІДКРИЄТЬСЯ</h2>
                <div class="cs-date">📅 ${dateStr} о ${timeStr}</div>
                <p class="cs-desc">Ознайомтесь з номінаціями — голосування відкриється за розкладом</p>
                <div class="cs-noms-grid">${nomCards}</div>
            </div>`;
    },

    // ── Повний список переможців внизу (після слайдера) ──────────────────
    renderAllWinners(yearData, serverWinners) {
        const rows = yearData.nominations.map(nom => {
            let wName = serverWinners[nom.id] || serverWinners[nom.title] || nom.winnerId;
            let wCand = nom.candidates.find(c => c.id === wName || c.name === wName) || nom.candidates[0];
            if (!wCand) return '';

            const isVideo = nom.type === 'video';
            const isEmoji = !wCand.avatar || !wCand.avatar.startsWith('http');
            let mediaHtml;
            if (isVideo) {
                // Відео — валідація посилання для безпечного відкриття в новому вікні
                let watchUrl = wCand.videoUrl;
                // Більш надійний регулярний вираз для всіх типів YT посилань
                const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=|shorts\/)([^#\&\?]*).*/;
                const match = (wCand.videoUrl || '').match(regExp);
                if (match && match[2].length === 11) {
                    watchUrl = `https://www.youtube.com/watch?v=${match[2]}`;
                }
                const videoLink = wCand.videoUrl
                    ? `<a class="aw-video-link" href="${watchUrl}" target="_blank">▶ Переглянути відео</a>`
                    : '';
                mediaHtml = `<div class="aw-media aw-emoji">🎬${videoLink}</div>`;
            } else if (isEmoji) {
                mediaHtml = `<div class="aw-media aw-emoji">${wCand.avatar || '🏆'}</div>`;
            } else {
                mediaHtml = `<div class="aw-media aw-photo"><img src="${wCand.avatar}" alt="${wCand.name}"></div>`;
            }

            const votes = nom.winnerVotes ? `<span class="aw-votes">${nom.winnerVotes} голосів</span>` : '';
            return `
                <div class="aw-row">
                    ${mediaHtml}
                    <div class="aw-info">
                        <span class="aw-nom-title">${nom.title}</span>
                        <span class="aw-winner-name">${wCand.name}</span>
                        ${wCand.username ? `<span class="aw-user">${wCand.username}</span>` : ''}
                        ${votes}
                    </div>
                </div>`;
        }).join('');

        return `<div class="all-winners-section">
            <h3 class="aw-heading">УСІ ПЕРЕМОЖЦІ</h3>
            <div class="aw-list">${rows}</div>
        </div>`;
    },

    renderNominationSlider() {
        const yearData = siteData.years[this.currentYear];

        if (this.nomIndex >= yearData.nominations.length) {
            document.getElementById('votingInterface').style.display = 'none';
            document.getElementById('submitInterface').style.display = 'block';
            this.checkMissingVotes();
            return;
        }

        const nom = yearData.nominations[this.nomIndex];
        const cand = nom.candidates[this.candIndex];

        document.getElementById('votingInterface').style.display = 'block';
        document.getElementById('submitInterface').style.display = 'none';

        // Анімація зміни номінації/кандидата
        const candCard = document.getElementById('candCardDisplay');
        if (candCard) {
            candCard.style.animation = 'none';
            candCard.offsetHeight; // reflow
            candCard.style.animation = 'candSlideIn 0.32s cubic-bezier(0.22,1,0.36,1) both';
        }

        document.getElementById('nomCounter').textContent = `НОМІНАЦІЯ ${this.nomIndex + 1} / ${yearData.nominations.length}`;
        document.getElementById('nomTitleDisplay').textContent = nom.title;
        document.getElementById('nomDescDisplay').textContent = nom.desc || 'Оберіть кращого кандидата.';

        const mediaContainer = document.getElementById('candMediaDisplay');
        mediaContainer.className = 'cand-media';

        if (nom.type === 'video') {
            if (cand.videoUrl) {
                // ── 2. ФІКС ПОМИЛКИ EMBED YOUTUBE (ERROR 153) ─────────────────
                // Автоматично витягуємо ID відео та створюємо правильний embed-URL
                let embedUrl = cand.videoUrl;
                // Регулярний вираз, що перетравлює Shorts, youtu.be, мобільні та звичайні посилання
                const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=|shorts\/)([^#\&\?]*).*/;
                const match = (cand.videoUrl || '').match(regExp);

                if (match && match[2].length === 11) {
                    embedUrl = `https://www.youtube.com/embed/${match[2]}`;
                }

                mediaContainer.classList.add('is-video');
                // 👇 ДОДАНА ПОЛІТИКА REFERRER ДЛЯ YOUTUBE IFRAME
                mediaContainer.innerHTML = `<iframe
                    src="${embedUrl}?rel=0&modestbranding=1"
                    frameborder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowfullscreen
                    referrerpolicy="strict-origin-when-cross-origin"
                    style="width:100%;height:100%;border:none;display:block;border-radius:16px;">
                </iframe>`;
            } else {
                mediaContainer.classList.add('is-emoji');
                mediaContainer.innerHTML = `<div class="cand-video-preview">🎬</div>`;
            }
        } else if (cand.card) {
            // Посвідчення переможця
            mediaContainer.classList.add('is-cert');
            const c = cand.card;
            const photoHtml = (cand.avatar && cand.avatar.startsWith('http'))
                ? `<img src="${cand.avatar}" class="cert-photo-img" alt="${cand.name}">`
                : `<div class="cert-photo-placeholder">${cand.avatar || '👤'}</div>`;
            mediaContainer.innerHTML = `
                <div class="cert-card">
                    <div class="cert-top">
                        <div class="cert-flag">🇺🇦 UKRAINE</div>
                        <div class="cert-ministry">Міністерство гемерів України</div>
                        <div class="cert-num">Посвідчення № ${c.certNum || '0000'}</div>
                    </div>
                    <div class="cert-title-block">
                        <div class="cert-logo-row">
                            <span class="cert-logo-text">Pidors</span>
                            <span class="cert-official">ОФІЦІЙНО ПІДТВЕРДЖЕНО</span>
                        </div>
                        <div class="cert-main-title">ПРОФЕСІЙНИЙ<br>ГРАВЕЦЬ</div>
                    </div>
                    <div class="cert-body">
                        <div class="cert-photo">${photoHtml}</div>
                        <div class="cert-fields">
                            <div class="cert-nom-title">${nom.title}</div>
                            <div class="cert-row"><span class="cert-icon">👤</span><span class="cert-label">Прізвище:</span><span class="cert-val">${c.surname || ''}</span></div>
                            <div class="cert-row"><span class="cert-icon">📛</span><span class="cert-label">Ім'я:</span><span class="cert-val">${c.name || ''}</span></div>
                            <div class="cert-row"><span class="cert-icon">🎮</span><span class="cert-label">Нікнейм:</span><span class="cert-val">${c.nickname || cand.username || ''}</span></div>
                            <div class="cert-row"><span class="cert-icon">📅</span><span class="cert-label">Дата нар.:</span><span class="cert-val">${c.dob || ''}</span></div>
                            <div class="cert-row"><span class="cert-icon">⭐</span><span class="cert-label">Рівень:</span><span class="cert-val cert-level">${c.level || 'PRO'}</span></div>
                        </div>
                    </div>
                </div>`;
        } else if (cand.avatar && cand.avatar.startsWith('http')) {
            mediaContainer.classList.add('is-photo');
            mediaContainer.innerHTML = `<img src="${cand.avatar}">`;
        } else {
            mediaContainer.classList.add('is-emoji');
            mediaContainer.innerHTML = cand.avatar || '👤';
        }

        document.getElementById('candNameDisplay').textContent = cand.name;
        document.getElementById('candUserDisplay').textContent = cand.username;
        document.getElementById('candDescDisplay').textContent = cand.desc || '';

        const dots = document.getElementById('candDotsContainer');
        dots.innerHTML = '';
        nom.candidates.forEach((_, i) => {
            let d = document.createElement('div');
            d.className = `c-dot ${i === this.candIndex ? 'active' : ''}`;
            d.onclick = () => { this.candIndex = i; this.renderNominationSlider(); };
            dots.appendChild(d);
        });

        this.updateVoteUI(nom, cand);
    },

    updateVoteUI(nom, cand) {
        const voteBtn = document.getElementById('btnVoteAction');
        const statusText = document.getElementById('voteStatusText');
        const currentVote = this.userVotes[nom.id];

        voteBtn.style.background = '';
        voteBtn.style.color = '';
        voteBtn.style.border = '';
        voteBtn.className = 'btn-vote-main';
        voteBtn.onclick = null;

        if (currentVote === cand.name) {
            voteBtn.textContent = '❌ СКАСУВАТИ ВИБІР';
            voteBtn.classList.add('voted');
            voteBtn.style.background = 'rgba(255, 60, 0, 0.1)';
            voteBtn.style.border = '1px solid #ff3c00';
            voteBtn.style.color = '#ff3c00';

            statusText.style.display = 'block';
            statusText.style.color = '#00e676';
            statusText.textContent = '✓ Збережено локально';

            voteBtn.onclick = () => {
                delete this.userVotes[nom.id];
                localStorage.setItem('slayVotes2026', JSON.stringify(this.userVotes));
                this.updateVoteUI(nom, cand);
            };

        } else if (currentVote) {
            voteBtn.textContent = '🔄 ПЕРЕОБРАТИ НА ЦЬОГО';

            statusText.style.display = 'block';
            statusText.style.color = '#ff9800';
            statusText.textContent = `Зараз обрано: ${currentVote}`;

            voteBtn.onclick = () => {
                this.userVotes[nom.id] = cand.id;
                localStorage.setItem('slayVotes2026', JSON.stringify(this.userVotes));
                this.updateVoteUI(nom, cand);
                voteBtn.textContent = '✓ ПЕРЕОБРАНО';
                voteBtn.style.background = '#00e676';
                voteBtn.style.color = '#000';
                setTimeout(() => { this.nomIndex++; this.candIndex = 0; this.renderNominationSlider(); }, 600);
            };

        } else {
            voteBtn.textContent = 'ОБРАТИ КАНДИДАТА';
            statusText.style.display = 'none';

            voteBtn.onclick = () => {
                this.userVotes[nom.id] = cand.id;
                localStorage.setItem('slayVotes2026', JSON.stringify(this.userVotes));
                this.updateVoteUI(nom, cand);
                voteBtn.textContent = '✓ ЗБЕРЕЖЕНО';
                voteBtn.style.background = '#00e676';
                voteBtn.style.color = '#000';
                setTimeout(() => { this.nomIndex++; this.candIndex = 0; this.renderNominationSlider(); }, 600);
            };
        }
    },

    initSliderEvents() {
        document.getElementById('btnPrevNom').onclick = () => {
            if (this.nomIndex > 0) {
                this.nomIndex--; this.candIndex = 0;
                this._slideDir = 'left';
                this.renderNominationSlider();
            }
        };
        document.getElementById('btnNextNom').onclick = () => {
            this.nomIndex++; this.candIndex = 0;
            this._slideDir = 'right';
            this.renderNominationSlider();
        };

        document.getElementById('btnPrevCand').onclick = () => {
            const cands = siteData.years[this.currentYear].nominations[this.nomIndex].candidates;
            this.candIndex = this.candIndex > 0 ? this.candIndex - 1 : cands.length - 1;
            this.renderNominationSlider();
        };
        document.getElementById('btnNextCand').onclick = () => {
            const cands = siteData.years[this.currentYear].nominations[this.nomIndex].candidates;
            this.candIndex = this.candIndex < cands.length - 1 ? this.candIndex + 1 : 0;
            this.renderNominationSlider();
        };

        document.getElementById('slayCustomForm').onsubmit = (e) => {
            e.preventDefault();
            const missing = this.checkMissingVotes();
            if (missing > 0) return;

            const form = e.target;
            const btn = document.getElementById('submitVoteBtn');
            btn.textContent = 'ВІДПРАВКА...';
            btn.style.opacity = '0.7';

            const formData = new URLSearchParams();
            formData.append('discord_user', form.discord_user.value);
            formData.append('ticket_code', form.ticket_code.value);
            Object.keys(this.userVotes).forEach(nomId => {
                formData.append(nomId, this.userVotes[nomId]);
            });
            console.log('Відправляємо:', Object.fromEntries(formData));

            fetch(siteData.config.scriptUrl, {
                method: 'POST',
                body: formData
            })
                .then(r => r.json())
                .then(data => {
                    if (data.status === 'success') {
                        document.getElementById('successOverlay').style.display = 'flex';
                        localStorage.removeItem('slayVotes2026');
                    } else {
                        throw new Error(data.message);
                    }
                }).catch(err => {
                    btn.textContent = 'ВІДПРАВИТИ ВСІ ГОЛОСИ';
                    btn.style.opacity = '1';
                    const stat = document.getElementById('formStatus');
                    stat.style.display = 'block';
                    stat.style.color = '#ff3c00';
                    stat.textContent = `❌ ${err.message || 'Помилка сервера'}`;
                });
        };
    },

    checkMissingVotes() {
        const noms = siteData.years[this.currentYear].nominations;
        let missingNames = [];
        noms.forEach(n => {
            if (!this.userVotes[n.id]) missingNames.push(n.title);
        });

        const alertBox = document.getElementById('missingVotesList');
        if (missingNames.length > 0) {
            alertBox.style.display = 'block';
            alertBox.innerHTML = `⚠️ Ви не обрали кандидатів у ${missingNames.length} номінаціях!<br><small>Поверніться назад за допомогою стрілок у верхньому меню.</small>`;
        } else {
            alertBox.style.display = 'none';
        }
        return missingNames.length;
    }
};

window.onload = () => app.init();
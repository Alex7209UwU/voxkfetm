class KfetManager {
    constructor() {
        this.members = [];
        this.weekData = {};
        this.currentWeek = this.getWeekKey(new Date());
        this.theme = 'violet';
        this.darkMode = false;
        this.currentSlot = null;
        this.currentTask = null;
        this.currentUser = '';
        this.currentEditingWeekNote = null;

        this.init();
    }

    init() {
        this.loadData();
        this.setupEvents();
        this.render();
        setTimeout(() => {
            const l = document.getElementById('loader');
            if (l) { l.classList.remove('active'); l.classList.add('hidden'); }
        }, 250);
    }

    loadData() {
        const saved = localStorage.getItem('kfet');
        if (saved) {
            try {
                const data = JSON.parse(saved);
                this.members = data.members || [];
                this.weekData = data.weekData || {};
                this.theme = data.theme || 'violet';
                this.darkMode = data.darkMode || false;
                this.currentUser = data.currentUser || '';
            } catch (e) {
                console.error('Erreur lors de la lecture des données:', e);
                this.resetDefaults();
            }
        } else {
            this.resetDefaults();
        }
        this.applyTheme();
    }

    resetDefaults() {
        this.members = ['Alice', 'Bob', 'Charlie', 'David', 'Eve'];
        this.weekData = {};
        this.theme = 'violet';
        this.darkMode = false;
        this.currentUser = '';
    }

    saveData() {
        try {
            localStorage.setItem('kfet', JSON.stringify({
                members: this.members,
                weekData: this.weekData,
                theme: this.theme,
                darkMode: this.darkMode,
                currentUser: this.currentUser
            }));
            this.updateStorageInfo();
        } catch (e) {
            this.toast('Erreur lors de la sauvegarde', 'error');
        }
    }

    setupEvents() {
        // Navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                this.switchPage(item.dataset.page);
            });
        });

        // Planning
        document.getElementById('prevWeek').addEventListener('click', () => this.prevWeek());
        document.getElementById('nextWeek').addEventListener('click', () => this.nextWeek());
        document.getElementById('todayBtn').addEventListener('click', () => this.goToday());
        document.getElementById('savBtn').addEventListener('click', () => {
            this.saveData();
            this.toast('Sauvegardé ✓', 'success');
        });
        document.getElementById('resetBtn').addEventListener('click', () => this.resetWeek());
        document.getElementById('exportPdfBtn').addEventListener('click', () => this.exportPDF());
        document.getElementById('exportImgBtn').addEventListener('click', () => this.exportImage());
        document.getElementById('printBtn').addEventListener('click', () => window.print());

        const notesBoxEl = document.getElementById('notesBox');
        if (notesBoxEl) {
            notesBoxEl.addEventListener('change', (e) => {
                const key = this.currentWeek;
                if (!this.weekData[key]) this.weekData[key] = {};
                this.weekData[key].notes = e.target.value;
                this.saveData();
            });
        }

        // Thème
        document.getElementById('themeBtn').addEventListener('click', () => this.toggleDarkMode());
        document.querySelectorAll('.theme-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.selectTheme(e.target.dataset.theme));
        });

        // Membres
        document.getElementById('addMemberBtn').addEventListener('click', () => this.addMember());
        document.getElementById('memberInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.addMember();
        });
        document.getElementById('setMeBtn').addEventListener('click', () => this.setCurrentUser());
        document.getElementById('currentUserInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.setCurrentUser();
        });

        // Modales
        document.querySelectorAll('.modal-close').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const modalId = e.target.dataset.close;
                document.getElementById(modalId).classList.remove('active');
                document.getElementById(modalId).classList.add('hidden');
            });
        });

        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.classList.remove('active');
                    modal.classList.add('hidden');
                }
            });
        });

        // Note modal: 'Se définir' quick-set current user as author and modal buttons
        const noteSetBtn = document.getElementById('noteSetMeBtn');
        if (noteSetBtn) {
            noteSetBtn.addEventListener('click', () => {
                if (!this.currentUser) { this.toast('Définissez votre nom dans Paramètres', 'warning'); return; }
                const s = document.getElementById('noteAuthorSelect');
                if (s) s.value = this.currentUser;
                const sp = document.getElementById('notePageAuthorSelect');
                if (sp) sp.value = this.currentUser;
            });
        }

        // Mobile menu: toggle sidebar on small screens
        const mobileBtn = document.getElementById('mobileMenuBtn');
        const sidebar = document.querySelector('.sidebar');
        if (mobileBtn && sidebar) {
            mobileBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                sidebar.classList.toggle('open');
            });
        }

        // Close sidebar when tapping main content on mobile
        const mainEl = document.querySelector('.main');
        if (mainEl) {
            mainEl.addEventListener('click', () => {
                if (window.innerWidth <= 768 && sidebar) sidebar.classList.remove('open');
            });
        }

        // Close sidebar when switching pages (for mobile UX)
        window.addEventListener('resize', () => {
            if (window.innerWidth > 768 && sidebar) sidebar.classList.remove('open');
        });

        const noteSaveBtn = document.getElementById('noteSaveBtn');
        if (noteSaveBtn) {
            noteSaveBtn.addEventListener('click', () => this.saveSlotNote());
        }

        const noteDeleteBtn = document.getElementById('noteDeleteBtn');
        if (noteDeleteBtn) {
            noteDeleteBtn.addEventListener('click', () => {
                if (confirm('Supprimer cette note ?')) this.deleteSlotNote();
            });
        }

        const noteCancelBtn = document.getElementById('noteCancelBtn');
        if (noteCancelBtn) {
            noteCancelBtn.addEventListener('click', () => {
                const modal = document.getElementById('noteModal');
                modal.classList.remove('active'); modal.classList.add('hidden');
            });
        }

        // Notes page controls
        const notePageAuthor = document.getElementById('notePageAuthorSelect');
        if (notePageAuthor) {
            notePageAuthor.innerHTML = `<option value=""></option>` + this.members.map(m => `<option value="${m}">${m}</option>`).join('');
            if (this.currentUser && !this.members.includes(this.currentUser)) notePageAuthor.insertAdjacentHTML('afterbegin', `<option value="${this.currentUser}">${this.currentUser} (Me)</option>`);
        }
        const notePageSetBtn = document.getElementById('notePageSetMeBtn');
        if (notePageSetBtn) notePageSetBtn.addEventListener('click', () => {
            if (!this.currentUser) { this.toast('Définissez votre nom dans Paramètres', 'warning'); return; }
            const s = document.getElementById('notePageAuthorSelect'); if (s) s.value = this.currentUser;
        });

        const notePageSendBtn = document.getElementById('notePageSendBtn');
        if (notePageSendBtn) notePageSendBtn.addEventListener('click', () => this.sendNoteFromPage());
        const notePageClearBtn = document.getElementById('notePageClearBtn');
        if (notePageClearBtn) notePageClearBtn.addEventListener('click', () => {
            if (this.currentEditingWeekNote !== null) {
                this.currentEditingWeekNote = null;
                const btn = document.getElementById('notePageSendBtn'); if (btn) btn.textContent = '✅ Envoyer';
                this.toast('Édition annulée', 'info');
            }
            document.getElementById('notePageTextarea').value = '';
        });
        

        // Settings
        document.getElementById('exportJsonBtn').addEventListener('click', () => this.exportJSON());
        document.getElementById('importJsonBtn').addEventListener('click', () => {
            document.getElementById('fileInput').click();
        });
        document.getElementById('fileInput').addEventListener('change', (e) => this.importJSON(e));
        document.getElementById('clearBtn').addEventListener('click', () => this.clearAll());

        // FAQ
        document.querySelectorAll('.faq-toggle').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const item = e.target.closest('.faq-item');
                item.classList.toggle('open');
            });
        });
    }

    switchPage(page) {
        document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
        document.getElementById(page + '-page').classList.add('active');

        document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
        document.querySelector(`[data-page="${page}"]`).classList.add('active');

        if (page === 'stats') {
            setTimeout(() => this.renderStats(), 100);
        } else if (page === 'notes') {
            setTimeout(() => this.renderNotesHistory(), 50);
            setTimeout(() => this.populateNotesPageAuthor(), 50);
        } else if (page === 'history') {
            this.renderHistory();
        } else if (page === 'settings') {
            this.renderSettings();
        }

        // Close sidebar on mobile when switching pages
        const sidebar = document.querySelector('.sidebar');
        if (sidebar && window.innerWidth <= 768) sidebar.classList.remove('open');
    }

    getWeekKey(date) {
        const d = new Date(date);
        d.setDate(d.getDate() - d.getDay() + 1);
        return this.formatDate(d);
    }

    getMonday(date) {
        const d = new Date(date);
        d.setDate(d.getDate() - d.getDay() + 1);
        return d;
    }

    getMonthName(month) {
        const months = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
        return months[month];
    }

    formatDate(date) {
        const d = new Date(date);
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
    }

    prevWeek() {
        const d = new Date(this.currentWeek);
        d.setDate(d.getDate() - 7);
        this.currentWeek = this.getWeekKey(d);
        this.render();
    }

    nextWeek() {
        const d = new Date(this.currentWeek);
        d.setDate(d.getDate() + 7);
        this.currentWeek = this.getWeekKey(d);
        this.render();
    }

    goToday() {
        this.currentWeek = this.getWeekKey(new Date());
        this.render();
    }

    render() {
        this.updateWeekLabel();
        this.renderPlanning();
        this.renderNotesHistory();
    }

    updateWeekLabel() {
        const monday = this.getMonday(new Date(this.currentWeek));
        const friday = new Date(monday);
        friday.setDate(friday.getDate() + 4);
        const label = `Semaine du ${monday.getDate()} au ${friday.getDate()} ${this.getMonthName(friday.getMonth())}`;
        document.getElementById('weekDisplay').textContent = label;
    }

    renderPlanning() {
        const key = this.currentWeek;
        if (!this.weekData[key]) this.weekData[key] = {};

        const monday = this.getMonday(new Date(key));
        const grid = document.getElementById('planningGrid');
        grid.innerHTML = '';

        const days = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi'];
        const slots = [
            { name: 'Matin', time: '9h50 - 10h10' },
            { name: 'Après-midi', time: '15h20 - 15h40' }
        ];

        for (let i = 0; i < 5; i++) {
            const date = new Date(monday);
            date.setDate(date.getDate() + i);
            const dateKey = this.formatDate(date);

            const card = document.createElement('div');
            card.className = 'day-card';

            let html = `
                <div class="day-header">
                    <div class="day-name">${days[i]}</div>
                    <div class="day-date">${date.getDate()} ${this.getMonthName(date.getMonth())}</div>
                </div>
            `;

            for (const slot of slots) {
                const slotKey = `${dateKey}_${slot.name}`;
                const slotData = this.weekData[key][slotKey] || { members: [], tasks: {}, note: '' };

                let tasks = {};
                if (slot.name === 'Après-midi') {
                    tasks['Comptes'] = true;
                    tasks['Poubelles'] = true;
                    if (days[i] === 'Mardi') tasks['Nettoyage'] = true;
                }

                const present = (slotData.members || []).filter(m => m.present).length;
                const total = (slotData.members || []).length;

                let taskHtml = '';
                if (Object.keys(tasks).length > 0) {
                    taskHtml = '<div class="tasks">';
                    for (const taskName of Object.keys(tasks)) {
                        const assigned = slotData.tasks?.[taskName];
                        taskHtml += `
                            <div class="task ${assigned ? 'assigned' : ''}" onclick="app.openTaskModal('${slotKey}', '${taskName.replace(/'/g, "\\'")}')">
                                <span class="task-name">${taskName}</span>
                                ${assigned ? `<span class="task-member">${assigned}</span>` : ''}
                                ${assigned ? `<button class="btn-remove" onclick="event.stopPropagation(); app.removeTask('${slotKey}', '${taskName.replace(/'/g, "\\'")}')">✕</button>` : ''}
                            </div>
                        `;
                    }
                    taskHtml += '</div>';
                }

                html += `
                    <div class="slot">
                        <div class="slot-header">
                            <span class="slot-time">${slot.name}</span>
                            <span class="slot-time">${slot.time}</span>
                            ${total > 0 ? `<span class="slot-counter">${present}/${total}</span>` : ''}
                            <button class="note-btn" title="Se rajouter" onclick="event.stopPropagation(); app.addMeToSlot('${slotKey}')">👤</button>
                        </div>
                        <div class="members">
                            ${(slotData.members || []).map(m => `
                                <div class="member ${m.present ? 'present' : 'absent'}">
                                    <input type="checkbox" ${m.present ? 'checked' : ''} onchange="app.toggleMember('${slotKey}', '${m.name.replace(/'/g, "\\'")}')">
                                    <span class="member-name">${m.name}</span>
                                    <button class="btn-remove" onclick="app.removeMember('${slotKey}', '${m.name.replace(/'/g, "\\'")}')">✕</button>
                                </div>
                            `).join('')}
                        </div>
                        <button class="btn-add-member" onclick="app.openMemberModal('${slotKey}')">+ Ajouter</button>
                        ${taskHtml}
                    </div>
                `;
            }

            card.innerHTML = html;
            grid.appendChild(card);
        }

        const notesBoxEl = document.getElementById('notesBox');
        if (notesBoxEl) notesBoxEl.value = this.weekData[key].notes || '';
        this.renderNotesHistory();
    }

    openMemberModal(slotKey) {
        this.currentSlot = slotKey;
        const key = this.currentWeek;
        if (!this.weekData[key][slotKey]) {
            this.weekData[key][slotKey] = { members: [], tasks: {}, note: '' };
        }
        const slotData = this.weekData[key][slotKey];
        const slotName = slotKey.split('_')[1];

        document.getElementById('modalTitle').textContent = `Ajouter un Membre - ${slotName}`;

        const list = document.getElementById('modalList');

        // Existing members in slot
        const existingHtml = (slotData.members || []).map(m => `
            <div class="modal-item">
                <input type="checkbox" ${m.present ? 'checked' : ''} onchange="app.toggleMember('${slotKey}', '${m.name.replace(/'/g, "\\'")}')">
                <span>${m.name}</span>
                <button class="btn-remove" style="margin-left: auto;" onclick="event.stopPropagation(); app.removeMember('${slotKey}', '${m.name.replace(/'/g, "\\'")}')">✕</button>
            </div>
        `).join('') || '<p style="color:var(--text-light);">Aucun membre</p>';

        // Suggestions from global members (not already in slot)
        const suggestions = this.members.filter(m => !(slotData.members || []).some(sm => sm.name === m));
        const suggestionsHtml = suggestions.map(m => `
            <div class="modal-item" style="cursor:pointer;" onclick="app.addMemberToSlot('${slotKey}', '${m.replace(/'/g, "\\'")}')">
                <span>➕ ${m}</span>
            </div>
        `).join('') || '<p style="color:var(--text-light);">Aucun membre disponible</p>';

        list.innerHTML = `<div><strong>Membres (dans ce créneau)</strong>${existingHtml}</div><hr style="margin:8px 0;" /><div><strong>Suggestions</strong>${suggestionsHtml}</div>`;

        const input = document.getElementById('modalSearch');
        input.value = '';
        input.oninput = (e) => {
            const q = e.target.value.trim().toLowerCase();
            const filtered = this.members.filter(m => m.toLowerCase().includes(q) && !(slotData.members || []).some(sm => sm.name === m));
            const filteredHtml = filtered.map(m => `
                <div class="modal-item" style="cursor:pointer;" onclick="app.addMemberToSlot('${slotKey}', '${m.replace(/'/g, "\\'")}')">
                    <span>➕ ${m}</span>
                </div>
            `).join('') || '<p style="color:var(--text-light);">Aucun membre trouvé</p>';
            // replace suggestions area
            const parts = list.innerHTML.split('<hr');
            list.innerHTML = parts[0] + '<hr style="margin:8px 0;" />' + `<div><strong>Suggestions</strong>${filteredHtml}</div>`;
        };

        input.onkeypress = (e) => {
            if (e.key === 'Enter') {
                const name = input.value.trim();
                if (name && !slotData.members?.some(m => m.name === name)) {
                    if (!slotData.members) slotData.members = [];
                    slotData.members.push({ name, present: true });
                    this.saveData();
                    this.renderPlanning();
                    this.openMemberModal(slotKey);
                }
                input.value = '';
            }
        };

        const modal = document.getElementById('memberModal');
        modal.classList.add('active');
        modal.classList.remove('hidden');
    }

    addMemberToSlot(slotKey, name) {
        const key = this.currentWeek;
        if (!this.weekData[key][slotKey]) this.weekData[key][slotKey] = { members: [], tasks: {}, note: '' };
        const slotData = this.weekData[key][slotKey];
        if (!slotData.members.some(m => m.name === name)) {
            slotData.members.push({ name, present: true });
            this.saveData();
            this.renderPlanning();
            this.openMemberModal(slotKey);
            this.toast(`${name} ajouté au créneau ✓`, 'success');
        } else {
            this.toast('Membre déjà présent', 'warning');
        }
    }

    removeMember(slotKey, name) {
        const key = this.currentWeek;
        if (this.weekData[key][slotKey]) {
            this.weekData[key][slotKey].members = (this.weekData[key][slotKey].members || []).filter(m => m.name !== name);
            this.saveData();
            this.renderPlanning();
        }
    }

    toggleMember(slotKey, name) {
        const key = this.currentWeek;
        if (this.weekData[key][slotKey]) {
            const member = this.weekData[key][slotKey].members.find(m => m.name === name);
            if (member) {
                member.present = !member.present;
                this.saveData();
                this.renderPlanning();
            }
        }
    }

    openTaskModal(slotKey, taskName) {
        this.currentTask = { slotKey, taskName };
        const key = this.currentWeek;
        const slotData = this.weekData[key][slotKey];

        document.getElementById('taskTitle').textContent = `Assigner: ${taskName}`;

        const list = document.getElementById('taskList');
        let html = `<div class="task-option remove" onclick="app.removeTask('${slotKey}', '${taskName.replace(/'/g, "\\'")}')">❌ Aucun</div>`;

        if (slotData.members?.length > 0) {
            html += slotData.members.map(m => `
                <div class="task-option" onclick="app.assignTask('${slotKey}', '${taskName.replace(/'/g, "\\'")}', '${m.name.replace(/'/g, "\\'")}')">${m.name}</div>
            `).join('');
        }

        list.innerHTML = html;
        
        const modal = document.getElementById('taskModal');
        modal.classList.add('active');
        modal.classList.remove('hidden');
    }

    assignTask(slotKey, taskName, memberName) {
        const key = this.currentWeek;
        if (!this.weekData[key][slotKey].tasks) this.weekData[key][slotKey].tasks = {};
        this.weekData[key][slotKey].tasks[taskName] = memberName;
        this.saveData();
        this.renderPlanning();
        
        const modal = document.getElementById('taskModal');
        modal.classList.remove('active');
        modal.classList.add('hidden');
        
        this.toast(`${taskName} → ${memberName}`, 'success');
    }

    editSlotNote(slotKey) {
        this.currentNoteSlot = slotKey;
        const key = this.currentWeek;
        if (!this.weekData[key][slotKey]) this.weekData[key][slotKey] = { members: [], tasks: {}, note: '' };
        const noteObj = this.weekData[key][slotKey].note;
        const noteText = (typeof noteObj === 'string') ? noteObj : (noteObj?.text || '');
        const noteAuthor = (typeof noteObj === 'string') ? '' : (noteObj?.author || '');

        // Populate textarea and author select
        document.getElementById('noteTextarea').value = noteText;
        const select = document.getElementById('noteAuthorSelect');
        if (select) {
            select.innerHTML = `<option value=""></option>` + this.members.map(m => `<option value="${m}">${m}</option>`).join('');
            if (this.currentUser && !this.members.includes(this.currentUser)) {
                select.insertAdjacentHTML('afterbegin', `<option value="${this.currentUser}">${this.currentUser} (Me)</option>`);
            }
            select.value = noteAuthor || (this.currentUser || '');
        }

        const delBtn = document.getElementById('noteDeleteBtn');
        if (delBtn) delBtn.style.display = noteText ? '' : 'none';

        const datePart = slotKey.split('_')[0];
        const slotPart = slotKey.split('_')[1];
        document.getElementById('noteModalTitle').textContent = `Note - ${slotPart} (${datePart})`;
        const modal = document.getElementById('noteModal');
        modal.classList.add('active'); modal.classList.remove('hidden');
        // focus textarea
        setTimeout(() => document.getElementById('noteTextarea').focus(), 50);
    }

    saveSlotNote() {
        const key = this.currentWeek;
        const slotKey = this.currentNoteSlot;
        const text = document.getElementById('noteTextarea').value.trim();
        const authorSelect = document.getElementById('noteAuthorSelect');
        const author = (authorSelect && authorSelect.value) ? authorSelect.value : (this.currentUser || '');
        if (!this.weekData[key][slotKey]) this.weekData[key][slotKey] = { members: [], tasks: {}, note: '' };
        if (!text) {
            this.toast('La note est vide', 'warning');
            return;
        }
        // Ensure author is in members list
        if (author && !this.members.includes(author)) {
            this.members.push(author);
        }
        this.weekData[key][slotKey].note = { text: text, author: author, time: new Date().toISOString() };
        this.saveData();
        this.renderPlanning();
        document.getElementById('noteModal').classList.remove('active'); document.getElementById('noteModal').classList.add('hidden');
        this.toast(`${author ? author + ': ' : ''}Note envoyée ✓`, 'success');
    }

    deleteSlotNote() {
        const key = this.currentWeek;
        const slotKey = this.currentNoteSlot;
        if (!slotKey || !this.weekData[key] || !this.weekData[key][slotKey] || !this.weekData[key][slotKey].note) {
            this.toast('Aucune note à supprimer', 'warning');
            return;
        }
        // Remove the note property
        delete this.weekData[key][slotKey].note;
        // If the slot is now empty (no members, no tasks, no note), remove the slot entry
        const slot = this.weekData[key][slotKey];
        if ((!slot.members || slot.members.length === 0) && (!slot.tasks || Object.keys(slot.tasks).length === 0) && !slot.note) {
            delete this.weekData[key][slotKey];
        }
        this.saveData();
        this.renderPlanning();
        document.getElementById('noteModal').classList.remove('active'); document.getElementById('noteModal').classList.add('hidden');
        this.toast('Note supprimée ✓', 'success');
    }

    deleteNoteFromSlot(slotKey) {
        // support deleting both weekNotes (week_0) and slot notes
        const key = this.currentWeek;
        if (!slotKey || !this.weekData[key]) { this.toast('Aucune note à supprimer', 'warning'); return; }
        if (slotKey.startsWith('week_')) {
            const idx = parseInt(slotKey.split('_')[1], 10);
            if (!Array.isArray(this.weekData[key].weekNotes) || !this.weekData[key].weekNotes[idx]) { this.toast('Aucune note à supprimer', 'warning'); return; }
            if (!confirm('Supprimer cette note ?')) return;
            this.weekData[key].weekNotes.splice(idx, 1);
            if (this.weekData[key].weekNotes.length === 0) delete this.weekData[key].weekNotes;
            this.saveData();
            this.renderNotesHistory();
            this.toast('Note supprimée ✓', 'success');
            return;
        }

        if (!this.weekData[key][slotKey] || !this.weekData[key][slotKey].note) { this.toast('Aucune note à supprimer', 'warning'); return; }
        if (!confirm('Supprimer cette note ?')) return;
        delete this.weekData[key][slotKey].note;
        const slot = this.weekData[key][slotKey];
        if ((!slot.members || slot.members.length === 0) && (!slot.tasks || Object.keys(slot.tasks).length === 0) && !slot.note) {
            delete this.weekData[key][slotKey];
        }
        this.saveData();
        this.renderPlanning();
        this.renderNotesHistory();
        this.toast('Note supprimée ✓', 'success');
    }

    removeTask(slotKey, taskName) {
        const key = this.currentWeek;
        if (this.weekData[key][slotKey].tasks) {
            delete this.weekData[key][slotKey].tasks[taskName];
            this.saveData();
            this.renderPlanning();
            
            const modal = document.getElementById('taskModal');
            modal.classList.remove('active');
            modal.classList.add('hidden');
        }
    }

    resetWeek() {
        if (confirm('Réinitialiser cette semaine ?')) {
            this.weekData[this.currentWeek] = {};
            this.saveData();
            this.renderPlanning();
            this.toast('Réinitialisé ✓', 'success');
        }
    }

    renderStats() {
        let present = 0, total = 0, tasks = 0;
        const stats = {};

        this.members.forEach(m => stats[m] = { p: 0, a: 0, t: 0 });

        Object.values(this.weekData).forEach(week => {
            Object.entries(week).forEach(([key, slot]) => {
                if (key === 'notes' || !slot.members) return;
                slot.members.forEach(m => {
                    if (stats[m.name]) {
                        stats[m.name].t++;
                        if (m.present) { stats[m.name].p++; present++; } else stats[m.name].a++;
                    }
                });
                total++;
                Object.values(slot.tasks || {}).forEach(t => { if (t) tasks++; });
            });
        });

        const rate = total > 0 ? Math.round(present / total * 100) : 0;
        document.getElementById('totalPresent').textContent = present;
        document.getElementById('totalRate').textContent = rate + '%';
        document.getElementById('totalAbsent').textContent = total - present;
        document.getElementById('totalTasks').textContent = tasks;

        const grid = document.getElementById('membersGrid');
        grid.innerHTML = Object.entries(stats)
            .filter(([_, s]) => s.t > 0)
            .sort((a, b) => b[1].p - a[1].p)
            .map(([m, s]) => `
                <div class="member-card">
                    <h3>${m}</h3>
                    <div class="member-stat"><span>Présent:</span> <strong>${s.p}/${s.t}</strong></div>
                    <div class="member-stat"><span>Taux:</span> <strong>${Math.round(s.p/s.t*100)}%</strong></div>
                </div>
            `).join('');

        this.renderChart(stats);
    }

    renderChart(stats) {
        const members = Object.keys(stats).filter(m => stats[m].t > 0);
        const data = members.map(m => stats[m].p);

        if (members.length === 0) return;

        if (window.chart) window.chart.destroy();

        const canvas = document.getElementById('membersChart');
        const color = getComputedStyle(document.documentElement).getPropertyValue('--color-primary').trim();

        window.chart = new Chart(canvas, {
            type: 'bar',
            data: {
                labels: members,
                datasets: [{
                    label: 'Présences',
                    data: data,
                    backgroundColor: color,
                    borderRadius: 6,
                    borderSkipped: false
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: { legend: { display: false } },
                scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } }
            }
        });
    }

    renderHistory() {
        const list = document.getElementById('historyList');
        const weeks = Object.keys(this.weekData).sort().reverse();

        if (weeks.length === 0) {
            list.innerHTML = '<p style="text-align: center; color: var(--text-light);">Aucun historique</p>';
            return;
        }

        list.innerHTML = weeks.map(weekKey => {
            const monday = this.getMonday(new Date(weekKey));
            const friday = new Date(monday);
            friday.setDate(friday.getDate() + 4);

            let p = 0, t = 0;
            Object.values(this.weekData[weekKey]).forEach(slot => {
                if (!slot.members) return;
                slot.members.forEach(m => {
                    t++;
                    if (m.present) p++;
                });
            });

            return `
                <div class="history-item" onclick="app.loadWeek('${weekKey}')">
                    <div class="history-week">Semaine du ${monday.getDate()} au ${friday.getDate()} ${this.getMonthName(friday.getMonth())}</div>
                    <div class="history-stats">
                        <span>👤 ${p}/${t}</span>
                        <span>📊 ${t > 0 ? Math.round(p/t*100) : 0}%</span>
                    </div>
                </div>
            `;
        }).join('');
    }

    renderNotesHistory() {
        const container = document.getElementById('notesTimeline');
        const key = this.currentWeek;
        const entries = [];

        // collect week notes first (week-level notes stored in weekNotes)
        if (this.weekData[key] && Array.isArray(this.weekData[key].weekNotes)) {
            this.weekData[key].weekNotes.forEach((note, idx) => {
                const text = note.text || '';
                const author = note.author || '';
                const time = note.time ? new Date(note.time).toLocaleString('fr-FR') : '';
                entries.push({ slotKey: `week_${idx}`, date: 'Semaine', slot: 'Général', text, author, time, weekNote: true, weekIndex: idx });
            });
        }

        if (this.weekData[key]) {
            Object.entries(this.weekData[key]).forEach(([slotKey, slot]) => {
                if (!slot || !slot.note) return;
                if (slotKey === 'weekNotes') return;
                const datePart = slotKey.split('_')[0];
                const slotPart = slotKey.split('_')[1];
                const noteObj = slot.note;
                const text = (typeof noteObj === 'string') ? noteObj : (noteObj?.text || '');
                const author = (typeof noteObj === 'string') ? '' : (noteObj?.author || '');
                const time = (typeof noteObj === 'string') ? '' : (noteObj?.time ? new Date(noteObj.time).toLocaleString('fr-FR') : '');
                entries.push({ slotKey, date: datePart, slot: slotPart, text, author, time });
            });
        }

        // If Planning page is active, show a short message with a link to Notes page
        const planningActive = document.getElementById('planning-page')?.classList.contains('active');
        if (planningActive) {
            if (!container) return;
            container.innerHTML = `<p style="color:var(--text-secondary);">Pour consulter et gérer les notes, rendez-vous dans l'onglet <strong>Notes</strong> &nbsp;<button class="btn" onclick="app.switchPage('notes')">Voir les notes</button></p>`;
            return;
        }

        if (entries.length === 0) { container.innerHTML = '<p style="color:var(--text-light);">Aucune note cette semaine</p>'; return; }

        const renderEntry = (e) => `
            <div class="note-entry">
                <div class="note-date">${e.date} — ${e.slot} ${e.author ? `<strong>(${e.author})</strong>` : ''} ${e.time ? `<span style="font-size:12px; color:var(--text-light);">(${e.time})</span>` : ''}</div>
                <div class="note-text">${e.text}</div>
                <div class="note-actions">
                    <button class="btn" onclick="app._noteEntryEdit('${e.slotKey.replace(/'/g, "\\'")}')">✏️</button>
                    <button class="btn btn-danger" onclick="app._noteEntryDelete('${e.slotKey.replace(/'/g, "\\'")}')">🗑️</button>
                </div>
            </div>
        `;

        container.innerHTML = entries.map(renderEntry).join('');

        // Also update notes page list if present
        const pageList = document.getElementById('notesPageList');
        if (pageList) {
            pageList.innerHTML = entries.map(renderEntry).join('');
        }
    }

    populateNotesPageAuthor() {
        const sel = document.getElementById('notePageAuthorSelect');
        if (!sel) return;
        sel.innerHTML = `<option value=""></option>` + this.members.map(m => `<option value="${m}">${m}</option>`).join('');
        if (this.currentUser && !this.members.includes(this.currentUser)) sel.insertAdjacentHTML('afterbegin', `<option value="${this.currentUser}">${this.currentUser} (Me)</option>`);
    }

    loadWeek(weekKey) {
        this.currentWeek = weekKey;
        this.render();
        this.switchPage('planning');
    }

    // Send a note from the Notes page
    sendNoteFromPage() {
        const day = document.getElementById('noteDaySelect').value;
        const slot = document.getElementById('noteSlotSelect').value;
        const text = document.getElementById('notePageTextarea').value.trim();
        if (!this.weekData[this.currentWeek]) this.weekData[this.currentWeek] = {};
        const authorSelect = document.getElementById('notePageAuthorSelect');
        const author = (authorSelect && authorSelect.value) ? authorSelect.value : (this.currentUser || '');
        if (!text) { this.toast('La note est vide', 'warning'); return; }

        // Determine slotKey
        let slotKey;
        if (day === 'week' || slot === 'general') {
            // update existing week note if editing
            if (!this.weekData[this.currentWeek].weekNotes) this.weekData[this.currentWeek].weekNotes = [];
            if (this.currentEditingWeekNote !== null && this.weekData[this.currentWeek].weekNotes[this.currentEditingWeekNote]) {
                this.weekData[this.currentWeek].weekNotes[this.currentEditingWeekNote] = { text, author, time: new Date().toISOString() };
                this.currentEditingWeekNote = null;
                const btn = document.getElementById('notePageSendBtn'); if (btn) btn.textContent = '✅ Envoyer';
                this.saveData();
                this.renderNotesHistory();
                this.toast('Note mise à jour ✓', 'success');
                document.getElementById('notePageTextarea').value = '';
                return;
            }

            // save as weekly note under key 'weekNotes'
            this.weekData[this.currentWeek].weekNotes.push({ text, author, time: new Date().toISOString() });
            this.saveData();
            this.renderNotesHistory();
            this.toast(`${author ? author + ': ' : ''}Note régionale envoyée ✓`, 'success');
            document.getElementById('notePageTextarea').value = '';
            return;
        } else {
            // day + slot -> date string for the selected day in current week
            const monday = this.getMonday(new Date(this.currentWeek));
            const idx = ['Lundi','Mardi','Mercredi','Jeudi','Vendredi'].indexOf(day);
            const date = new Date(monday);
            date.setDate(date.getDate() + idx);
            slotKey = `${this.formatDate(date)}_${slot}`;
        }

        if (!this.weekData[this.currentWeek][slotKey]) this.weekData[this.currentWeek][slotKey] = { members: [], tasks: {}, note: '' };
        // Ensure author in members list
        if (author && !this.members.includes(author)) this.members.push(author);
        this.weekData[this.currentWeek][slotKey].note = { text, author, time: new Date().toISOString() };
        this.saveData();
        this.render();
        this.renderNotesHistory();
        this.toast(`${author ? author + ': ' : ''}Note envoyée ✓`, 'success');
        document.getElementById('notePageTextarea').value = '';
    }

    _noteEntryEdit(slotKey) {
        // allow editing of week notes directly on the notes page, or open modal for slot notes
        if (slotKey.startsWith('week_')) {
            const idx = parseInt(slotKey.split('_')[1], 10);
            const note = this.weekData[this.currentWeek].weekNotes[idx];
            if (!note) return;
            document.getElementById('noteDaySelect').value = 'week';
            document.getElementById('noteSlotSelect').value = 'general';
            document.getElementById('notePageTextarea').value = note.text || '';
            const sel = document.getElementById('notePageAuthorSelect'); if (sel) sel.value = note.author || '';
            this.currentEditingWeekNote = idx;
            const btn = document.getElementById('notePageSendBtn'); if (btn) btn.textContent = '🔄 Mettre à jour';
            // scroll to top of notes page if visible
            const notesPage = document.getElementById('notes-page'); if (notesPage && notesPage.classList.contains('active')) notesPage.scrollIntoView({ behavior: 'smooth' });
        } else {
            this.editSlotNote(slotKey);
        }
    }

    _noteEntryDelete(slotKey) {
        this.deleteNoteFromSlot(slotKey);
    }

    renderSettings() {
        const container = document.getElementById('tagsContainer');
        container.innerHTML = this.members.map(m => `
            <div class="tag">
                <span>${m}</span>
                <button class="tag-remove" onclick="app.removeMemberFromList('${m.replace(/'/g, "\\'")}')">✕</button>
            </div>
        `).join('');

        document.querySelectorAll('.theme-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.theme === this.theme);
        });

        // Current user display
        const input = document.getElementById('currentUserInput');
        const tag = document.getElementById('currentUserTag');
        if (input) input.value = this.currentUser || '';
        if (tag) tag.textContent = this.currentUser ? `Connecté : ${this.currentUser}` : '';

        // Keep note page author select up to date
        const np = document.getElementById('notePageAuthorSelect');
        if (np) np.innerHTML = `<option value=""></option>` + this.members.map(m => `<option value="${m}">${m}</option>`).join('');
        if (this.currentUser && np && !Array.from(np.options).some(o => o.value === this.currentUser)) np.insertAdjacentHTML('afterbegin', `<option value="${this.currentUser}">${this.currentUser} (Me)</option>`);

        // Also update modal selects
        const modalSelect = document.getElementById('noteAuthorSelect');
        if (modalSelect) modalSelect.innerHTML = `<option value=""></option>` + this.members.map(m => `<option value="${m}">${m}</option>`).join('');

        this.updateStorageInfo();
    }

    addMember() {
        const input = document.getElementById('memberInput');
        const name = input.value.trim();
        if (!name || this.members.includes(name)) {
            this.toast('Nom invalide ou existant', 'error');
            return;
        }
        this.members.push(name);
        input.value = '';
        this.saveData();
        this.renderSettings();
        this.toast(`${name} ajouté ✓`, 'success');
    }

    setCurrentUser() {
        const input = document.getElementById('currentUserInput');
        const name = input.value.trim();
        if (!name) {
            this.toast('Entrez un nom', 'error');
            return;
        }
        this.currentUser = name;
        // Add to global members list if missing
        if (!this.members.includes(name)) this.members.push(name);
        this.saveData();
        this.renderSettings();
        this.toast(`${name} défini comme vous ✓`, 'success');
    }

    addMeToSlot(slotKey) {
        if (!this.currentUser) {
            this.toast('Définissez d\'abord votre nom dans Paramètres', 'warning');
            this.switchPage('settings');
            return;
        }
        this.addMemberToSlot(slotKey, this.currentUser);
    }

    removeMemberFromList(name) {
        this.members = this.members.filter(m => m !== name);
        this.saveData();
        this.renderSettings();
        this.toast(`${name} supprimé ✓`, 'success');
    }

    selectTheme(theme) {
        this.theme = theme;
        document.body.className = `theme-${theme}`;
        if (this.darkMode) document.body.classList.add('dark');
        this.saveData();
        this.renderSettings();
    }

    toggleDarkMode() {
        this.darkMode = !this.darkMode;
        document.body.classList.toggle('dark');
        this.saveData();
    }

    applyTheme() {
        document.body.className = `theme-${this.theme}`;
        if (this.darkMode) document.body.classList.add('dark');
    }

    exportPDF() {
        this.toast('Génération du PDF...', 'info');
        const element = document.getElementById('planningGrid');
        const opt = {
            margin: 5,
            filename: `planning-${this.currentWeek}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2 },
            jsPDF: { orientation: 'landscape', format: 'a4' }
        };
        html2pdf().set(opt).from(element).save().then(() => {
            this.toast('PDF téléchargé ✓', 'success');
        }).catch(() => {
            this.toast('Erreur lors de l\'export', 'error');
        });
    }

    exportImage() {
        this.toast('Génération de l\'image...', 'info');
        const element = document.getElementById('planningGrid');
        html2canvas(element, { scale: 2, backgroundColor: '#ffffff' }).then(canvas => {
            const link = document.createElement('a');
            link.href = canvas.toDataURL('image/png');
            link.download = `planning-${this.currentWeek}.png`;
            link.click();
            this.toast('Image téléchargée ✓', 'success');
        }).catch(() => {
            this.toast('Erreur lors de l\'export', 'error');
        });
    }

    exportJSON() {
        const data = {
            members: this.members,
            weekData: this.weekData,
            date: new Date().toISOString()
        };
        const link = document.createElement('a');
        link.href = 'data:application/json,' + encodeURIComponent(JSON.stringify(data, null, 2));
        link.download = `kfet-${Date.now()}.json`;
        link.click();
        this.toast('Export JSON ✓', 'success');
    }

    importJSON(e) {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (evt) => {
            try {
                const data = JSON.parse(evt.target.result);
                this.members = data.members || [];
                this.weekData = data.weekData || {};
                this.saveData();
                this.render();
                this.renderSettings();
                this.toast('Import JSON ✓', 'success');
            } catch {
                this.toast('Erreur lors de l\'import', 'error');
            }
        };
        reader.readAsText(file);
        e.target.value = '';
    }

    clearAll() {
        if (confirm('Supprimer TOUTES les données ?')) {
            localStorage.clear();
            location.reload();
        }
    }

    updateStorageInfo() {
        const data = localStorage.getItem('kfet');
        const size = data ? (new Blob([data]).size / 1024).toFixed(2) : '0';
        document.getElementById('storageInfo').textContent = size + ' KB';
        document.getElementById('lastSave').textContent = new Date().toLocaleTimeString('fr-FR');
    }

    toast(msg, type = 'info') {
        const container = document.getElementById('toastContainer');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        const icons = { success: '✓', error: '✕', info: 'ℹ', warning: '⚠' };
        toast.innerHTML = `<span class="toast-icon">${icons[type]}</span><span class="toast-message">${msg}</span>`;
        container.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
    }
}

let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new KfetManager();
});
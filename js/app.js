// ========================================
// CONFIGURATION
// ========================================
const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
const DAYS_FR = {
    monday: 'Lundi',
    tuesday: 'Mardi',
    wednesday: 'Mercredi',
    thursday: 'Jeudi',
    friday: 'Vendredi'
};

const SHIFTS = {
    morning: { name: 'Matin', icon: '🌅', hours: '06h - 12h' },
    afternoon: { name: 'Après-midi', icon: '🌆', hours: '12h - 18h' }
};

const TASKS = [
    { id: 'accounts', name: 'Faire les comptes', icon: '💰' },
    { id: 'trash', name: 'Sortir les poubelles', icon: '🗑️' },
    { id: 'cleaning', name: 'Nettoyage', icon: '🧹' }
];

// ========================================
// DONNÉES
// ========================================
let data = loadData();

function loadData() {
    const saved = localStorage.getItem('kfet_data');
    if (saved) {
        return JSON.parse(saved);
    }
    return createEmptyWeek();
}

function saveData() {
    localStorage.setItem('kfet_data', JSON.stringify(data));
}

function createEmptyWeek() {
    const week = {};
    DAYS.forEach(day => {
        week[day] = {
            morning: { members: [], tasks: {} },
            afternoon: { members: [], tasks: {} }
        };
    });
    return week;
}

// ========================================
// INITIALISATION
// ========================================
document.addEventListener('DOMContentLoaded', () => {
    loadTheme();
    renderPlanning();
    renderWeekOverview();
});

// ========================================
// RENDU DU PLANNING
// ========================================
function renderPlanning() {
    const container = document.getElementById('planningContainer');
    let html = '';

    DAYS.forEach(day => {
        html += `
            <div class="day-card">
                <div class="day-header">${DAYS_FR[day]}</div>
                <div class="day-content">
                    ${renderShift(day, 'morning')}
                    ${renderShift(day, 'afternoon')}
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
}

function renderShift(day, shift) {
    const shiftData = data[day][shift];
    const shiftInfo = SHIFTS[shift];
    const presentCount = shiftData.members.filter(m => m.present).length;
    const totalCount = shiftData.members.length;

    let membersHtml = '';
    if (shiftData.members.length === 0) {
        membersHtml = '<div class="empty-members">Aucun membre inscrit</div>';
    } else {
        membersHtml = '<div class="members-list">';
        shiftData.members.forEach((member, index) => {
            membersHtml += `
                <div class="member-item ${member.present ? 'present' : 'absent'}">
                    <input type="checkbox" class="member-checkbox" 
                           ${member.present ? 'checked' : ''} 
                           onchange="toggleMember('${day}', '${shift}', ${index})">
                    <span class="member-name">${member.name}</span>
                    <span class="member-badge ${member.present ? 'present' : 'absent'}">
                        ${member.present ? '✓' : '✗'}
                    </span>
                    <button class="member-delete" onclick="deleteMember('${day}', '${shift}', ${index})">×</button>
                </div>
            `;
        });
        membersHtml += '</div>';
    }

    let tasksHtml = '<div class="tasks-section">';
    tasksHtml += '<div class="tasks-title">📋 Tâches du créneau</div>';
    tasksHtml += '<div class="tasks-list">';
    
    TASKS.forEach(task => {
        const assignee = shiftData.tasks[task.id] || null;
        tasksHtml += `
            <div class="task-item ${assignee ? 'assigned' : ''}">
                <div class="task-info">
                    <span class="task-icon">${task.icon}</span>
                    <div>
                        <span class="task-name">${task.name}</span>
                        ${assignee ? `<div class="task-assignee">✓ ${assignee}</div>` : ''}
                    </div>
                </div>
                <div class="task-actions">
                    ${assignee 
                        ? `<button class="task-btn unassign" onclick="unassignTask('${day}', '${shift}', '${task.id}')">Retirer</button>`
                        : `<button class="task-btn assign" onclick="openTaskModal('${day}', '${shift}', '${task.id}')">S'inscrire</button>`
                    }
                </div>
            </div>
        `;
    });
    
    tasksHtml += '</div></div>';

    return `
        <div class="shift-card">
            <div class="shift-header">
                <div class="shift-title">
                    <span class="shift-icon">${shiftInfo.icon}</span>
                    <div class="shift-info">
                        <h4>${shiftInfo.name}</h4>
                        <span>${shiftInfo.hours}</span>
                    </div>
                </div>
                <span class="shift-count">${presentCount}/${totalCount}</span>
            </div>
            
            <div class="add-form">
                <input type="text" id="input-${day}-${shift}" placeholder="Ajouter quelqu'un..." 
                       onkeypress="if(event.key==='Enter') addMember('${day}', '${shift}')">
                <button onclick="addMember('${day}', '${shift}')">+</button>
            </div>
            
            ${membersHtml}
            ${tasksHtml}
        </div>
    `;
}

function renderWeekOverview() {
    const container = document.getElementById('weekOverview');
    let html = '';

    DAYS.forEach(day => {
        const morning = data[day].morning;
        const afternoon = data[day].afternoon;
        
        const morningPresent = morning.members.filter(m => m.present).length;
        const morningTotal = morning.members.length;
        const afternoonPresent = afternoon.members.filter(m => m.present).length;
        const afternoonTotal = afternoon.members.length;

        html += `
            <div class="week-day-card">
                <h4>${DAYS_FR[day]}</h4>
                <div class="stats">
                    🌅 ${morningPresent}/${morningTotal} | 🌆 ${afternoonPresent}/${afternoonTotal}
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
}

// ========================================
// GESTION DES MEMBRES
// ========================================
function addMember(day, shift) {
    const input = document.getElementById(`input-${day}-${shift}`);
    const name = input.value.trim();
    
    if (!name) {
        showToast('Entrez un nom', 'warning');
        return;
    }
    
    if (name.length > 30) {
        showToast('Nom trop long (max 30 caractères)', 'error');
        return;
    }
    
    // Vérifie si le membre existe déjà
    const exists = data[day][shift].members.some(m => 
        m.name.toLowerCase() === name.toLowerCase()
    );
    
    if (exists) {
        showToast('Ce membre est déjà inscrit', 'warning');
        return;
    }
    
    data[day][shift].members.push({ name, present: true });
    saveData();
    input.value = '';
    
    renderPlanning();
    renderWeekOverview();
    showToast(`✓ ${name} ajouté`);
}

function deleteMember(day, shift, index) {
    const member = data[day][shift].members[index];
    data[day][shift].members.splice(index, 1);
    
    // Retire aussi des tâches si assigné
    TASKS.forEach(task => {
        if (data[day][shift].tasks[task.id] === member.name) {
            delete data[day][shift].tasks[task.id];
        }
    });
    
    saveData();
    renderPlanning();
    renderWeekOverview();
    showToast('Membre supprimé');
}

function toggleMember(day, shift, index) {
    data[day][shift].members[index].present = !data[day][shift].members[index].present;
    saveData();
    renderPlanning();
    renderWeekOverview();
}

// ========================================
// GESTION DES TÂCHES
// ========================================
function openTaskModal(day, shift, taskId) {
    const task = TASKS.find(t => t.id === taskId);
    const members = data[day][shift].members;
    
    if (members.length === 0) {
        showToast('Aucun membre disponible', 'warning');
        return;
    }
    
    let content = `
        <p style="margin-bottom: 16px; color: var(--text-secondary);">
            Qui s'occupe de : <strong>${task.icon} ${task.name}</strong> ?
        </p>
        <div class="modal-options">
    `;
    
    members.forEach(member => {
        content += `
            <button class="modal-option" onclick="assignTask('${day}', '${shift}', '${taskId}', '${member.name}')">
                ${member.name}
            </button>
        `;
    });
    
    content += '</div>';
    
    openModal(task.name, content);
}

function assignTask(day, shift, taskId, memberName) {
    data[day][shift].tasks[taskId] = memberName;
    saveData();
    closeModal();
    renderPlanning();
    showToast(`✓ ${memberName} assigné`);
}

function unassignTask(day, shift, taskId) {
    delete data[day][shift].tasks[taskId];
    saveData();
    renderPlanning();
    showToast('Tâche retirée');
}

// ========================================
// NAVIGATION
// ========================================
function showSection(sectionId) {
    // Cache toutes les sections
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    
    // Affiche la section demandée
    document.getElementById(`section-${sectionId}`).classList.add('active');
    
    // Met à jour la navigation
    document.querySelectorAll('.nav-item, .mobile-nav button').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.section === sectionId) {
            btn.classList.add('active');
        }
    });
    
    // Ferme le menu mobile
    closeMenu();
    
    // Charge le contenu spécifique
    if (sectionId === 'stats') loadStats();
    if (sectionId === 'history') loadHistory();
}

function toggleMenu() {
    document.getElementById('sidebar').classList.toggle('show');
}

function closeMenu() {
    document.getElementById('sidebar').classList.remove('show');
}

// ========================================
// THÈME
// ========================================
function toggleTheme() {
    document.body.classList.toggle('dark');
    const isDark = document.body.classList.contains('dark');
    localStorage.setItem('kfet_theme', isDark ? 'dark' : 'light');
    
    document.getElementById('themeIcon').textContent = isDark ? '☀️' : '🌙';
    document.getElementById('darkModeCheck').checked = isDark;
}

function loadTheme() {
    const theme = localStorage.getItem('kfet_theme');
    if (theme === 'dark') {
        document.body.classList.add('dark');
        document.getElementById('themeIcon').textContent = '☀️';
        document.getElementById('darkModeCheck').checked = true;
    }
}

// ========================================
// MODAL
// ========================================
function openModal(title, content, footerHtml = '') {
    document.getElementById('modalTitle').textContent = title;
    document.getElementById('modalBody').innerHTML = content;
    document.getElementById('modalFooter').innerHTML = footerHtml || `
        <button class="btn btn-secondary" onclick="closeModal()">Fermer</button>
    `;
    document.getElementById('modal').classList.add('show');
}

function closeModal() {
    document.getElementById('modal').classList.remove('show');
}

// Ferme modal en cliquant à l'extérieur
document.addEventListener('click', (e) => {
    if (e.target.id === 'modal') closeModal();
});

// ========================================
// TOAST NOTIFICATION
// ========================================
function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast show ${type}`;
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// ========================================
// STATISTIQUES
// ========================================
function loadStats() {
    const statsGrid = document.getElementById('statsGrid');
    const statsDetails = document.getElementById('statsDetails');
    
    let totalMembers = 0;
    let totalPresent = 0;
    let totalTasks = 0;
    let assignedTasks = 0;
    const memberStats = {};
    
    DAYS.forEach(day => {
        ['morning', 'afternoon'].forEach(shift => {
            const shiftData = data[day][shift];
            
            shiftData.members.forEach(m => {
                totalMembers++;
                if (m.present) totalPresent++;
                
                if (!memberStats[m.name]) {
                    memberStats[m.name] = { present: 0, total: 0 };
                }
                memberStats[m.name].total++;
                if (m.present) memberStats[m.name].present++;
            });
            
            TASKS.forEach(task => {
                totalTasks++;
                if (shiftData.tasks[task.id]) assignedTasks++;
            });
        });
    });
    
    const presenceRate = totalMembers > 0 ? Math.round((totalPresent / totalMembers) * 100) : 0;
    const taskRate = totalTasks > 0 ? Math.round((assignedTasks / totalTasks) * 100) : 0;
    
    statsGrid.innerHTML = `
        <div class="stat-card">
            <div class="stat-value">${totalPresent}/${totalMembers}</div>
            <div class="stat-label">Présences</div>
        </div>
        <div class="stat-card">
            <div class="stat-value">${presenceRate}%</div>
            <div class="stat-label">Taux de présence</div>
        </div>
        <div class="stat-card">
            <div class="stat-value">${assignedTasks}/${totalTasks}</div>
            <div class="stat-label">Tâches assignées</div>
        </div>
        <div class="stat-card">
            <div class="stat-value">${taskRate}%</div>
            <div class="stat-label">Tâches complétées</div>
        </div>
    `;
    
    let detailsHtml = '<h3>Présence par membre</h3>';
    
    const sortedMembers = Object.entries(memberStats).sort((a, b) => {
        return (b[1].present / b[1].total) - (a[1].present / a[1].total);
    });
    
    if (sortedMembers.length === 0) {
        detailsHtml += '<p style="color: var(--text-muted); padding: 20px 0;">Aucune donnée disponible</p>';
    } else {
        sortedMembers.forEach(([name, stats]) => {
            const percent = Math.round((stats.present / stats.total) * 100);
            detailsHtml += `
                <div class="stat-row">
                    <span class="stat-name">${name}</span>
                    <div class="stat-bar">
                        <div class="stat-fill" style="width: ${percent}%"></div>
                    </div>
                    <span class="stat-percent">${percent}%</span>
                </div>
            `;
        });
    }
    
    statsDetails.innerHTML = detailsHtml;
}

// ========================================
// HISTORIQUE
// ========================================
function loadHistory() {
    const container = document.getElementById('historyContainer');
    const history = JSON.parse(localStorage.getItem('kfet_history') || '[]');
    
    if (history.length === 0) {
        container.innerHTML = '<div class="history-empty">Aucun historique sauvegardé</div>';
        return;
    }
    
    let html = '<div class="history-list">';
    
    history.reverse().forEach((item, index) => {
        const date = new Date(item.date);
        const dateStr = date.toLocaleDateString('fr-FR', { 
            day: 'numeric', 
            month: 'long', 
            year: 'numeric' 
        });
        
        html += `
            <div class="history-item">
                <div class="history-info">
                    <h4>Semaine du ${dateStr}</h4>
                    <p>Sauvegardé le ${new Date(item.savedAt).toLocaleString('fr-FR')}</p>
                </div>
                <div class="history-actions">
                    <button class="btn btn-small btn-primary" onclick="viewHistory(${history.length - 1 - index})">Voir</button>
                    <button class="btn btn-small btn-danger" onclick="deleteHistory(${history.length - 1 - index})">×</button>
                </div>
            </div>
        `;
    });
    
    html += '</div>';
    container.innerHTML = html;
}

function saveToHistory() {
    const history = JSON.parse(localStorage.getItem('kfet_history') || '[]');
    
    history.push({
        date: new Date().toISOString(),
        savedAt: new Date().toISOString(),
        data: JSON.parse(JSON.stringify(data))
    });
    
    // Garde max 20 semaines
    while (history.length > 20) {
        history.shift();
    }
    
    localStorage.setItem('kfet_history', JSON.stringify(history));
    showToast('✓ Semaine sauvegardée');
}

function viewHistory(index) {
    const history = JSON.parse(localStorage.getItem('kfet_history') || '[]');
    const item = history[index];
    
    if (!item) return;
    
    openModal('Détails de la semaine', `
        <p style="margin-bottom: 16px;">Sauvegardé le ${new Date(item.savedAt).toLocaleString('fr-FR')}</p>
        <button class="btn btn-success" onclick="restoreHistory(${index})" style="width: 100%;">
            Restaurer cette semaine
        </button>
    `);
}

function restoreHistory(index) {
    const history = JSON.parse(localStorage.getItem('kfet_history') || '[]');
    const item = history[index];
    
    if (!item) return;
    
    data = JSON.parse(JSON.stringify(item.data));
    saveData();
    closeModal();
    renderPlanning();
    renderWeekOverview();
    showSection('planning');
    showToast('✓ Semaine restaurée');
}

function deleteHistory(index) {
    if (!confirm('Supprimer cette sauvegarde ?')) return;
    
    const history = JSON.parse(localStorage.getItem('kfet_history') || '[]');
    history.splice(index, 1);
    localStorage.setItem('kfet_history', JSON.stringify(history));
    loadHistory();
    showToast('Sauvegarde supprimée');
}

// ========================================
// RÉINITIALISATION
// ========================================
function resetWeek() {
    if (!confirm('⚠️ Réinitialiser toute la semaine ?\nCette action est irréversible.')) return;
    
    data = createEmptyWeek();
    saveData();
    renderPlanning();
    renderWeekOverview();
    showToast('Semaine réinitialisée');
}

// ========================================
// EXPORT
// ========================================
function exportCSV() {
    let csv = 'PLANNING KFET\n';
    csv += `Exporté le ${new Date().toLocaleString('fr-FR')}\n\n`;
    
    DAYS.forEach(day => {
        csv += `\n${DAYS_FR[day].toUpperCase()}\n`;
        csv += '─'.repeat(40) + '\n';
        
        ['morning', 'afternoon'].forEach(shift => {
            const shiftData = data[day][shift];
            const shiftInfo = SHIFTS[shift];
            
            csv += `\n${shiftInfo.icon} ${shiftInfo.name} (${shiftInfo.hours})\n`;
            csv += 'Membres:\n';
            
            if (shiftData.members.length === 0) {
                csv += '  Aucun membre\n';
            } else {
                shiftData.members.forEach(m => {
                    csv += `  ${m.present ? '✓' : '✗'} ${m.name}\n`;
                });
            }
            
            csv += 'Tâches:\n';
            TASKS.forEach(task => {
                const assignee = shiftData.tasks[task.id];
                csv += `  ${task.icon} ${task.name}: ${assignee || 'Non assigné'}\n`;
            });
        });
    });
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `kfet-planning-${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    
    showToast('✓ Export téléchargé');
}

function printPage() {
    window.print();
    showToast('Impression lancée');
}

// ========================================
// IMPORT/EXPORT DONNÉES COMPLÈTES
// ========================================
function exportAllData() {
    const allData = {
        data: data,
        history: JSON.parse(localStorage.getItem('kfet_history') || '[]'),
        exportedAt: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(allData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `kfet-backup-${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    
    showToast('✓ Backup téléchargé');
}

function importData(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const imported = JSON.parse(e.target.result);
            
            if (!confirm('Importer ces données ? Cela remplacera les données actuelles.')) return;
            
            if (imported.data) {
                data = imported.data;
                saveData();
            }
            
            if (imported.history) {
                localStorage.setItem('kfet_history', JSON.stringify(imported.history));
            }
            
            renderPlanning();
            renderWeekOverview();
            showToast('✓ Données importées');
            
        } catch (err) {
            showToast('Fichier invalide', 'error');
        }
    };
    reader.readAsText(file);
    
    // Reset input
    event.target.value = '';
}

function clearAllData() {
    if (!confirm('⚠️ SUPPRIMER TOUTES LES DONNÉES ?\nCette action est IRRÉVERSIBLE !')) return;
    if (!confirm('Êtes-vous vraiment sûr ?')) return;
    
    localStorage.removeItem('kfet_data');
    localStorage.removeItem('kfet_history');
    
    data = createEmptyWeek();
    renderPlanning();
    renderWeekOverview();
    showToast('Données supprimées');
}
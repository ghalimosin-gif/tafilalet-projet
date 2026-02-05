/**
 * Admin Dashboard JavaScript
 */

let currentUser = null;
let allMissions = [];
let allUsers = [];

document.addEventListener('DOMContentLoaded', async () => {
    // Check authentication
    currentUser = await checkAuth();
    
    if (!currentUser || currentUser.role !== 'admin') {
        window.location.href = '/login.html';
        return;
    }
    
    // Set user name
    document.getElementById('userFullName').textContent = currentUser.fullName;
    
    // Load initial data
    loadDashboard();
    
    // Set up form handlers
    document.getElementById('editMissionForm').addEventListener('submit', handleEditMission);
    document.getElementById('addUserForm').addEventListener('submit', handleAddUser);

    // If URL contains a hash, open that tab on load
    const currentHash = window.location.hash.replace('#','');
    if (currentHash) {
        const navItem = document.querySelector(`.sidebar-nav .nav-item[href="#${currentHash}"]`);
        showTab(currentHash, navItem);
    }
});

// Also handle hash changes when links are clicked or history changes
window.addEventListener('hashchange', () => {
    const newHash = window.location.hash.replace('#','');
    const navItem = document.querySelector(`.sidebar-nav .nav-item[href="#${newHash}"]`);
    if (newHash) showTab(newHash, navItem);
});

// Attach programmatic listeners for key interactive buttons to ensure handlers work
(function attachButtonListeners(){
    // Export CSV button
    const exportBtn = document.getElementById('exportCsvBtn');
    if (exportBtn) exportBtn.addEventListener('click', (e) => { e.preventDefault(); exportMissions(); });

    // Logout button
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) logoutBtn.addEventListener('click', (e) => { e.preventDefault(); logout(); });

    // Nav items (CSP-safe: non-inline handlers)
    document.querySelectorAll('.sidebar-nav .nav-item').forEach(nav => {
        nav.addEventListener('click', (e) => {
            e.preventDefault();
            const tab = nav.getAttribute('href').replace('#', '');
            showTab(tab, nav);
            history.pushState(null, '', `#${tab}`);
        });
    });

    // Add User button and modal close behavior
    const addUserBtn = document.getElementById('addUserBtn');
    if (addUserBtn) addUserBtn.addEventListener('click', (e) => { e.preventDefault(); showAddUserModal(); });

    const addUserModal = document.getElementById('addUserModal');
    if (addUserModal) {
        // Close when clicking overlay
        addUserModal.addEventListener('click', (e) => {
            if (e.target === addUserModal) closeAddUserModal();
        });

        // Close for any close buttons inside the modal (data-action)
        const closeBtns = addUserModal.querySelectorAll('[data-action="close-add-user"], .btn-close');
        closeBtns.forEach(btn => btn.addEventListener('click', (e) => { e.preventDefault(); closeAddUserModal(); }));
    }

    // Edit mission modal behavior
    const editModal = document.getElementById('editMissionModal');
    if (editModal) {
        editModal.addEventListener('click', (e) => {
            if (e.target === editModal) closeEditMissionModal();
        });
        const closeBtns = editModal.querySelectorAll('[data-action="close-edit"], .btn-close');
        closeBtns.forEach(btn => btn.addEventListener('click', (e) => { e.preventDefault(); closeEditMissionModal(); }));
    }

    // Missions table delegation for Edit/Delete
    const missionsTable = document.getElementById('missionsTable');
    if (missionsTable) {
        missionsTable.addEventListener('click', (e) => {
            const editBtn = e.target.closest('.btn-edit');
            if (editBtn) { editMission(editBtn.dataset.id); return; }

            const delBtn = e.target.closest('.btn-delete');
            if (delBtn) { deleteMission(delBtn.dataset.id); return; }
        });
    }

    // Users table delegation for Toggle/Reset
    const usersTable = document.getElementById('usersTable');
    if (usersTable) {
        usersTable.addEventListener('click', (e) => {
            const toggleBtn = e.target.closest('.btn-toggle');
            if (toggleBtn) { toggleUserStatus(toggleBtn.dataset.id, toggleBtn.dataset.active === 'true'); return; }

            const resetBtn = e.target.closest('.btn-reset');
            if (resetBtn) { resetPassword(resetBtn.dataset.id, resetBtn.dataset.username); return; }
        });
    }

    // Filters
    const missionSearch = document.getElementById('missionSearch');
    if (missionSearch) missionSearch.addEventListener('input', filterMissions);

    const startDate = document.getElementById('startDate');
    if (startDate) startDate.addEventListener('change', filterMissions);

    const endDate = document.getElementById('endDate');
    if (endDate) endDate.addEventListener('change', filterMissions);

    const serviceFilter = document.getElementById('serviceFilter');
    if (serviceFilter) serviceFilter.addEventListener('change', filterMissions);
})();

// Tab navigation
function showTab(tabName, el) {
    // Hide all tabs
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });

    // Remove active class from all nav items
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });

    // Show selected tab
    const tabEl = document.getElementById(tabName + 'Tab');
    if (tabEl) tabEl.classList.add('active');

    // Add active class to clicked nav item, support passed element or fallback
    if (el && el.classList) {
        el.classList.add('active');
    } else {
        const navItem = document.querySelector(`.sidebar-nav .nav-item[href="#${tabName}"]`);
        if (navItem) navItem.classList.add('active');
    }

    // Load data for the tab
    if (tabName === 'dashboard') {
        loadDashboard();
    } else if (tabName === 'missions') {
        loadMissionsTable();
    } else if (tabName === 'users') {
        loadUsersTable();
    }
}

// Load dashboard data
async function loadDashboard() {
    try {
        const response = await fetch('/api/stats');

        if (!response.ok) {
            throw new Error("API Error: " + response.status);
        }

        const stats = await response.json();

        console.log("Stats:", stats); // باش نشوفو شنو جا من API

        // Safe defaults
        const recentMissions = stats.recentMissions || [];
        const missionsByService = stats.missionsByService || [];

        // Update stats
        document.getElementById('totalMissions').textContent = stats.totalMissions || 0;
        document.getElementById('totalDrivers').textContent = stats.totalDrivers || 0;
        document.getElementById('todayMissions').textContent = stats.todayMissions || 0;

        // Update recent missions
        const recentContainer = document.getElementById('recentMissions');

        if (recentMissions.length === 0) {
            recentContainer.innerHTML =
                '<div class="empty-state">Aucune mission récente</div>';
        } else {
            recentContainer.innerHTML = recentMissions.map(mission => `
                <div class="recent-mission-item">
                    <div class="recent-mission-title">
                        ${mission.vehicle_registration} - ${mission.service_type}
                    </div>
                    <div class="recent-mission-info">
                        ${mission.driver_name || ''} • ${formatDate(mission.mission_date)}
                    </div>
                </div>
            `).join('');
        }

        // Update service stats
        const serviceContainer = document.getElementById('serviceStats');

        if (missionsByService.length === 0) {
            serviceContainer.innerHTML =
                '<div class="empty-state">Aucune donnée</div>';
        } else {
            serviceContainer.innerHTML = missionsByService.map(service => `
                <div class="service-stat-item">
                    <span class="service-name">${service.service_type}</span>
                    <span class="service-count">${service.count}</span>
                </div>
            `).join('');
        }

    } catch (error) {
        console.error('Load dashboard error:', error);
    }
}


// Load missions table
async function loadMissionsTable() {
    const container = document.getElementById('missionsTable');
    container.innerHTML = '<div class="loading">Chargement...</div>';
    
    try {
        const response = await fetch('/api/missions');
        allMissions = await response.json();
        
        renderMissionsTable(allMissions);
    } catch (error) {
        console.error('Load missions error:', error);
        container.innerHTML = '<div class="error-message">Erreur lors du chargement</div>';
    }
}

// Render missions table
function renderMissionsTable(missions) {
    const container = document.getElementById('missionsTable');
    
    if (missions.length === 0) {
        container.innerHTML = '<div class="empty-state">Aucune mission trouvée</div>';
        return;
    }
    
    container.innerHTML = `
        <table>
            <thead>
                <tr>
                    <th>Date</th>
                    <th>Heure</th>
                    <th>Chauffeur</th>
                    <th>Service</th>
                    <th>Véhicule</th>
                    <th>Immatriculation</th>
                    <th>Trajet</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                ${missions.map(mission => `
                    <tr>
                        <td>${formatDate(mission.mission_date)}</td>
                        <td>${mission.mission_time}</td>
                        <td>${mission.driver_name}</td>
                        <td><span class="service-badge">${mission.service_type}</span></td>
                        <td>${mission.vehicle_model}</td>
                        <td>${mission.vehicle_registration}</td>
                        <td>
                            <small>${mission.departure_location} → ${mission.arrival_location}</small>
                        </td>
                        <td>
                            <div class="table-actions">
                                <button type="button" class="btn-icon btn-edit" data-id="${mission.id}" title="Modifier">
                                    <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                    </svg>
                                </button>
                                <button type="button" class="btn-icon danger btn-delete" data-id="${mission.id}" title="Supprimer">
                                    <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <polyline points="3 6 5 6 21 6"></polyline>
                                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                    </svg>
                                </button>
                            </div>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

// Filter missions
function filterMissions() {
    const search = document.getElementById('missionSearch').value.toLowerCase();
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;
    const serviceType = document.getElementById('serviceFilter').value;
    
    let filtered = allMissions.filter(mission => {
        const matchesSearch = !search || 
            mission.vehicle_registration.toLowerCase().includes(search) ||
            mission.vehicle_model.toLowerCase().includes(search) ||
            mission.driver_name.toLowerCase().includes(search) ||
            mission.departure_location.toLowerCase().includes(search) ||
            mission.arrival_location.toLowerCase().includes(search);
        
        const matchesStartDate = !startDate || mission.mission_date >= startDate;
        const matchesEndDate = !endDate || mission.mission_date <= endDate;
        const matchesService = !serviceType || mission.service_type === serviceType;
        
        return matchesSearch && matchesStartDate && matchesEndDate && matchesService;
    });
    
    renderMissionsTable(filtered);
}

// Edit mission
async function editMission(id) {
    try {
        const response = await fetch(`/api/missions/${id}`);
        const mission = await response.json();
        
        document.getElementById('editMissionId').value = mission.id;
        document.getElementById('editMissionDate').value = mission.mission_date;
        document.getElementById('editMissionTime').value = mission.mission_time;
        document.getElementById('editServiceType').value = mission.service_type;
        document.getElementById('editVehicleRegistration').value = mission.vehicle_registration;
        document.getElementById('editVehicleModel').value = mission.vehicle_model;
        document.getElementById('editDepartureLocation').value = mission.departure_location;
        document.getElementById('editArrivalLocation').value = mission.arrival_location;
        document.getElementById('editObservations').value = mission.observations || '';
        
        document.getElementById('editMissionModal').classList.add('active');
    } catch (error) {
        console.error('Edit mission error:', error);
        alert('Erreur lors du chargement de la mission');
    }
}

// Handle edit mission
async function handleEditMission(e) {
    e.preventDefault();
    
    const id = document.getElementById('editMissionId').value;
    const formData = {
        missionDate: document.getElementById('editMissionDate').value,
        missionTime: document.getElementById('editMissionTime').value,
        serviceType: document.getElementById('editServiceType').value,
        vehicleRegistration: document.getElementById('editVehicleRegistration').value,
        vehicleModel: document.getElementById('editVehicleModel').value,
        departureLocation: document.getElementById('editDepartureLocation').value,
        arrivalLocation: document.getElementById('editArrivalLocation').value,
        observations: document.getElementById('editObservations').value
    };
    
    try {
        const response = await fetch(`/api/missions/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });
        
        if (response.ok) {
            closeEditMissionModal();
            loadMissionsTable();
            alert('Mission mise à jour avec succès');
        } else {
            const data = await response.json();
            alert(data.error || 'Erreur lors de la mise à jour');
        }
    } catch (error) {
        console.error('Update mission error:', error);
        alert('Erreur de connexion');
    }
}

// Close edit mission modal
function closeEditMissionModal() {
    document.getElementById('editMissionModal').classList.remove('active');
}

// Delete mission
async function deleteMission(id) {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette mission ?')) {
        return;
    }
    
    try {
        const response = await fetch(`/api/missions/${id}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            loadMissionsTable();
            loadDashboard(); // Refresh stats
            alert('Mission supprimée avec succès');
        } else {
            const data = await response.json();
            alert(data.error || 'Erreur lors de la suppression');
        }
    } catch (error) {
        console.error('Delete mission error:', error);
        alert('Erreur de connexion');
    }
}

// Export missions
async function exportMissions() {
    try {
        window.location.href = '/api/missions/export/csv';
    } catch (error) {
        console.error('Export error:', error);
        alert('Erreur lors de l\'export');
    }
}

// Load users table
async function loadUsersTable() {
    const container = document.getElementById('usersTable');
    container.innerHTML = '<div class="loading">Chargement...</div>';
    
    try {
        const response = await fetch('/api/users');
        allUsers = await response.json();
        
        if (allUsers.length === 0) {
            container.innerHTML = '<div class="empty-state">Aucun utilisateur</div>';
            return;
        }
        
        container.innerHTML = `
            <table>
                <thead>
                    <tr>
                        <th>Nom d'utilisateur</th>
                        <th>Nom complet</th>
                        <th>Rôle</th>
                        <th>Statut</th>
                        <th>Date de création</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${allUsers.map(user => `
                        <tr>
                            <td>${user.username}</td>
                            <td>${user.full_name}</td>
                            <td>${user.role === 'admin' ? 'Administrateur' : 'Chauffeur'}</td>
                            <td>
                                <span class="status-badge ${user.is_active ? 'active' : 'inactive'}">
                                    ${user.is_active ? 'Actif' : 'Inactif'}
                                </span>
                            </td>
                            <td>${formatDate(user.created_at.split(' ')[0])}</td>
                            <td>
                                <div class="table-actions">
                                    <button type="button" class="btn-icon btn-toggle" data-id="${user.id}" data-active="${user.is_active}" title="${user.is_active ? 'Désactiver' : 'Activer'}">
                                        <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                            <circle cx="12" cy="12" r="10"></circle>
                                            <line x1="15" y1="9" x2="9" y2="15"></line>
                                            <line x1="9" y1="9" x2="15" y2="15"></line>
                                        </svg>
                                    </button>
                                    <button type="button" class="btn-icon btn-reset" data-id="${user.id}" data-username="${user.username}" title="Réinitialiser MdP">
                                        <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                                            <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                                        </svg>
                                    </button>
                                </div>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    } catch (error) {
        console.error('Load users error:', error);
        container.innerHTML = '<div class="error-message">Erreur lors du chargement</div>';
    }
}

// Show add user modal
function showAddUserModal() {
    document.getElementById('addUserModal').classList.add('active');
}

// Close add user modal
function closeAddUserModal() {
    document.getElementById('addUserModal').classList.remove('active');
    document.getElementById('addUserForm').reset();
}

// Handle add user
async function handleAddUser(e) {
    e.preventDefault();
    
    const formData = {
        username: document.getElementById('newUsername').value,
        password: document.getElementById('newPassword').value,
        fullName: document.getElementById('newFullName').value,
        role: document.getElementById('newRole').value
    };
    
    try {
        const response = await fetch('/api/users', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });
        
        if (response.ok) {
            closeAddUserModal();
            loadUsersTable();
            alert('Utilisateur créé avec succès');
        } else {
            const data = await response.json();
            alert(data.error || 'Erreur lors de la création');
        }
    } catch (error) {
        console.error('Add user error:', error);
        alert('Erreur de connexion');
    }
}

// Toggle user status
async function toggleUserStatus(userId, currentStatus) {
    console.log('=== TOGGLE USER STATUS ===');
    console.log('userId:', userId, 'type:', typeof userId);
    console.log('currentStatus (from button):', currentStatus, 'type:', typeof currentStatus);
    
    // Convert userId to number for comparison
    const numericUserId = parseInt(userId, 10);
    
    // Find the user in the allUsers array
    const user = allUsers.find(u => u.id === numericUserId);
    
    // Validate that user was found
    if (!user) {
        console.error('User not found in allUsers array. userId:', userId, 'allUsers:', allUsers);
        alert('Erreur: Utilisateur non trouvé');
        return;
    }
    
    console.log('User found:', user);
    console.log('user.is_active (from database):', user.is_active, 'type:', typeof user.is_active);
    
    // IMPORTANT: Use the user.is_active from the database, not currentStatus from button
    // because currentStatus might be stale or incorrectly converted
    const isCurrentlyActive = user.is_active === true || user.is_active === 1;
    
    // Calculate the NEW status (opposite of current)
    const newStatus = !isCurrentlyActive;
    
    console.log('isCurrentlyActive (actual from DB):', isCurrentlyActive);
    console.log('newStatus (will send to API):', newStatus);
    
    // Create confirmation message based on CURRENT status
    const confirmMessage = isCurrentlyActive
        ? `Voulez-vous vraiment DÉSACTIVER l'utilisateur ${user.full_name} ?`
        : `Voulez-vous vraiment ACTIVER l'utilisateur ${user.full_name} ?`;
    
    console.log('Confirmation message:', confirmMessage);
    
    if (!confirm(confirmMessage)) {
        console.log('User cancelled the action');
        return;
    }
    
    try {
        const requestBody = {
            fullName: user.full_name,
            role: user.role,
            isActive: newStatus
        };
        
        console.log('Sending to API:', requestBody);
        
        const response = await fetch(`/api/users/${userId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });
        
        console.log('API Response status:', response.status);
        
        if (response.ok) {
            const responseData = await response.json();
            console.log('API Response data:', responseData);
            
            loadUsersTable();
            
            // Show the correct message based on what action was performed
            const actionMessage = newStatus ? 'activé' : 'désactivé';
            alert(`Utilisateur ${actionMessage} avec succès`);
        } else {
            const data = await response.json();
            console.error('API Error:', data);
            alert(data.error || 'Erreur lors de la mise à jour');
        }
    } catch (error) {
        console.error('Toggle status error:', error);
        alert('Erreur de connexion');
    }
}

// Reset password
async function resetPassword(userId, username) {
    const newPassword = prompt(`Nouveau mot de passe pour ${username}:`);
    
    if (!newPassword || newPassword.length < 6) {
        alert('Le mot de passe doit contenir au moins 6 caractères');
        return;
    }
    
    try {
        const response = await fetch(`/api/users/${userId}/change-password`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ newPassword })
        });
        
        if (response.ok) {
            alert('Mot de passe réinitialisé avec succès');
        } else {
            const data = await response.json();
            alert(data.error || 'Erreur lors de la réinitialisation');
        }
    } catch (error) {
        console.error('Reset password error:', error);
        alert('Erreur de connexion');
    }
}

// Format date for display
function formatDate(dateString) {
    const date = new Date(dateString + 'T00:00:00');
    return date.toLocaleDateString('fr-FR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

// Expose commonly-used functions on window for inline handlers and older browsers
window.showTab = showTab;
window.exportMissions = exportMissions;
window.editMission = editMission;
window.deleteMission = deleteMission;
window.showAddUserModal = showAddUserModal;
window.closeAddUserModal = closeAddUserModal;
window.resetPassword = resetPassword;
window.toggleUserStatus = toggleUserStatus;

// Show runtime JS errors in a visible banner to aid debugging
window.addEventListener('error', (e) => {
    console.error('Runtime error captured:', e.error || e.message || e);
    let banner = document.getElementById('runtimeErrorBanner');
    if (!banner) {
        banner = document.createElement('div');
        banner.id = 'runtimeErrorBanner';
        banner.style.position = 'fixed';
        banner.style.bottom = '1rem';
        banner.style.left = '1rem';
        banner.style.padding = '0.75rem 1rem';
        banner.style.background = '#fee2e2';
        banner.style.color = '#991b1b';
        banner.style.borderRadius = '6px';
        banner.style.zIndex = 2000;
        document.body.appendChild(banner);
    }
    banner.textContent = `Error: ${e.error ? e.error.message : e.message}`;
});

window.addEventListener('unhandledrejection', (e) => {
    console.error('Unhandled rejection:', e.reason);
    const banner = document.getElementById('runtimeErrorBanner') || document.createElement('div');
    banner.id = 'runtimeErrorBanner';
    banner.textContent = `Promise rejection: ${e.reason && e.reason.message ? e.reason.message : e.reason}`;
    if (!document.getElementById('runtimeErrorBanner')) {
        banner.style.position = 'fixed';
        banner.style.bottom = '1rem';
        banner.style.left = '1rem';
        banner.style.padding = '0.75rem 1rem';
        banner.style.background = '#fee2e2';
        banner.style.color = '#991b1b';
        banner.style.borderRadius = '6px';
        banner.style.zIndex = 2000;
        document.body.appendChild(banner);
    }
});

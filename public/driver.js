/**
 * Driver Dashboard JavaScript
 */

let currentUser = null;

document.addEventListener('DOMContentLoaded', async () => {
    // Check authentication
    currentUser = await checkAuth();
    
    if (!currentUser || currentUser.role !== 'driver') {
        window.location.href = '/login.html';
        return;
    }
    
    // Set user name
    document.getElementById('userFullName').textContent = currentUser.fullName;
    
    // Set default date and time
    const today = new Date().toISOString().split('T')[0];
    const now = new Date().toTimeString().slice(0, 5);
    document.getElementById('missionDate').value = today;
    document.getElementById('missionTime').value = now;
    
    // Load missions
    loadMissions();
    
    // Set up form submission
    const missionForm = document.getElementById('missionForm');
    if (missionForm) missionForm.addEventListener('submit', handleMissionSubmit);

    // Attach UI buttons (CSP-safe handlers)
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) logoutBtn.addEventListener('click', (e) => { e.preventDefault(); logout(); });

    const newMissionBtn = document.getElementById('newMissionBtn');
    if (newMissionBtn) newMissionBtn.addEventListener('click', (e) => { e.preventDefault(); showNewMissionForm(); });

    // Modal close buttons
    const closeBtns = document.querySelectorAll('[data-action="close-new-mission"], .btn-close');
    closeBtns.forEach(btn => btn.addEventListener('click', (e) => { e.preventDefault(); hideNewMissionForm(); }));

    // Search input
    const searchInput = document.getElementById('searchInput');
    if (searchInput) searchInput.addEventListener('input', () => searchMissions());

    // Service type change handler
    const serviceTypeSelect = document.getElementById('serviceType');
    if (serviceTypeSelect) {
        serviceTypeSelect.addEventListener('change', handleServiceTypeChange);
    }
});

// Handle service type change to update labels dynamically
function handleServiceTypeChange() {
    const serviceType = document.getElementById('serviceType').value;
    const labelVehicleRegistration = document.getElementById('labelVehicleRegistration');
    const labelVehicleModel = document.getElementById('labelVehicleModel');
    const vehicleRegistrationInput = document.getElementById('vehicleRegistration');
    const vehicleModelInput = document.getElementById('vehicleModel');
    
    if (serviceType === 'Ambulance') {
        // Change labels for Ambulance
        labelVehicleRegistration.textContent = 'Numéro de téléphone du patient';
        labelVehicleModel.textContent = 'Nom du patient';
        vehicleRegistrationInput.placeholder = 'Ex: 0612345678';
        vehicleModelInput.placeholder = 'Ex: Mohammed Ali';
    } else {
        // Default labels for vehicle
        labelVehicleRegistration.textContent = 'Immatriculation du véhicule';
        labelVehicleModel.textContent = 'Modèle du véhicule';
        vehicleRegistrationInput.placeholder = 'Ex: 12345-A-67';
        vehicleModelInput.placeholder = 'Ex: Renault Clio';
    }
}

// Show new mission form
function showNewMissionForm() {
    document.getElementById('missionFormContainer').style.display = 'block';
    document.getElementById('missionFormContainer').scrollIntoView({ behavior: 'smooth' });
}

// Hide new mission form
function hideNewMissionForm() {
    document.getElementById('missionFormContainer').style.display = 'none';
    document.getElementById('missionForm').reset();
    
    // Reset date and time to now
    const today = new Date().toISOString().split('T')[0];
    const now = new Date().toTimeString().slice(0, 5);
    document.getElementById('missionDate').value = today;
    document.getElementById('missionTime').value = now;
    
    // Reset labels to default
    document.getElementById('labelVehicleRegistration').textContent = 'Immatriculation du véhicule';
    document.getElementById('labelVehicleModel').textContent = 'Modèle du véhicule';
    document.getElementById('vehicleRegistration').placeholder = 'Ex: 12345-A-67';
    document.getElementById('vehicleModel').placeholder = 'Ex: Renault Clio';
    
    // Clear messages
    document.getElementById('formError').style.display = 'none';
    document.getElementById('formSuccess').style.display = 'none';
}

// Handle mission form submission
async function handleMissionSubmit(e) {
    e.preventDefault();
    
    // Helper function to get value or "none" if empty
    const getValueOrNone = (id) => {
        const value = document.getElementById(id).value.trim();
        return value || 'none';
    };
    
    const formData = {
        missionDate: getValueOrNone('missionDate'),
        missionTime: getValueOrNone('missionTime'),
        serviceType: document.getElementById('serviceType').value, // This one is required
        vehicleRegistration: getValueOrNone('vehicleRegistration'),
        vehicleModel: getValueOrNone('vehicleModel'),
        departureLocation: getValueOrNone('departureLocation'),
        arrivalLocation: getValueOrNone('arrivalLocation'),
        observations: getValueOrNone('observations')
    };
    
    // Validate that service type is selected
    if (!formData.serviceType) {
        const formError = document.getElementById('formError');
        formError.textContent = 'Veuillez sélectionner un type de service';
        formError.style.display = 'block';
        return;
    }
    
    const formError = document.getElementById('formError');
    const formSuccess = document.getElementById('formSuccess');
    
    formError.style.display = 'none';
    formSuccess.style.display = 'none';
    
    try {
        const response = await fetch('/api/missions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });
        
        const data = await response.json();
        
        if (response.ok) {
            formSuccess.textContent = 'Mission enregistrée avec succès!';
            formSuccess.style.display = 'block';
            
            // Reset form
            document.getElementById('missionForm').reset();
            
            // Reset date and time
            const today = new Date().toISOString().split('T')[0];
            const now = new Date().toTimeString().slice(0, 5);
            document.getElementById('missionDate').value = today;
            document.getElementById('missionTime').value = now;
            
            // Reset labels
            document.getElementById('labelVehicleRegistration').textContent = 'Immatriculation du véhicule';
            document.getElementById('labelVehicleModel').textContent = 'Modèle du véhicule';
            document.getElementById('vehicleRegistration').placeholder = 'Ex: 12345-A-67';
            document.getElementById('vehicleModel').placeholder = 'Ex: Renault Clio';
            
            // Reload missions
            loadMissions();
            
            // Hide form after 2 seconds
            setTimeout(() => {
                hideNewMissionForm();
            }, 2000);
        } else {
            // If validation errors are returned, join them to show a helpful message
            const errMsg = (data && data.errors && data.errors.length)
                ? data.errors.map(e => e.msg).join('; ')
                : (data.error || 'Erreur lors de l\'enregistrement');
            formError.textContent = errMsg;
            formError.style.display = 'block';
        }
    } catch (error) {
        console.error('Submit error:', error);
        formError.textContent = 'Erreur de connexion. Veuillez réessayer.';
        formError.style.display = 'block';
    }
}

// Load missions
async function loadMissions(searchTerm = '') {
    const container = document.getElementById('missionsContainer');
    container.innerHTML = '<div class="loading">Chargement des missions...</div>';
    
    try {
        const url = searchTerm ? `/api/missions?search=${encodeURIComponent(searchTerm)}` : '/api/missions';
        const response = await fetch(url);
        const missions = await response.json();
        
        if (missions.length === 0) {
            container.innerHTML = '<div class="empty-state">Aucune mission trouvée</div>';
            return;
        }
        
        container.innerHTML = missions.map(mission => {
            // Determine if this is an ambulance mission to adjust display
            const isAmbulance = mission.service_type === 'Ambulance';
            const registrationLabel = isAmbulance ? 'Tél. Patient' : mission.vehicle_registration;
            const modelLabel = isAmbulance ? 'Patient' : mission.vehicle_model;
            
            return `
            <div class="mission-item">
                <div class="mission-header">
                    <div>
                        <div class="mission-title">
                            ${registrationLabel !== 'none' ? registrationLabel : 'N/A'} - ${modelLabel !== 'none' ? modelLabel : 'N/A'}
                        </div>
                        <div class="mission-meta">
                            ${mission.mission_date !== 'none' ? formatDate(mission.mission_date) : 'N/A'} à ${mission.mission_time !== 'none' ? mission.mission_time : 'N/A'}${mission.driver_name ? ' • ' + mission.driver_name : ''}
                        </div>
                    </div>
                    <span class="service-badge">${mission.service_type}</span>
                </div>
                
                <div class="mission-details">
                    <div class="detail-item">
                        <div class="detail-label">Départ</div>
                        <div class="detail-value">${mission.departure_location !== 'none' ? mission.departure_location : 'N/A'}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Arrivée</div>
                        <div class="detail-value">${mission.arrival_location !== 'none' ? mission.arrival_location : 'N/A'}</div>
                    </div>
                </div>
                
                ${mission.observations && mission.observations !== 'none' ? `
                    <div class="mission-observations">
                        <div class="detail-label">Observations</div>
                        <p>${mission.observations}</p>
                    </div>
                ` : ''}
            </div>
        `}).join('');
    } catch (error) {
        console.error('Load missions error:', error);
        container.innerHTML = '<div class="error-message">Erreur lors du chargement des missions</div>';
    }
}

// Search missions
function searchMissions() {
    const searchTerm = document.getElementById('searchInput').value;
    loadMissions(searchTerm);
}

// Format date for display
function formatDate(dateString) {
    if (dateString === 'none') return 'N/A';
    const date = new Date(dateString + 'T00:00:00');
    return date.toLocaleDateString('fr-FR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

// Expose functions to window so inline handlers work reliably
window.showNewMissionForm = showNewMissionForm;
window.hideNewMissionForm = hideNewMissionForm;
window.handleMissionSubmit = handleMissionSubmit;
window.loadMissions = loadMissions;
window.searchMissions = searchMissions;
window.handleServiceTypeChange = handleServiceTypeChange;

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

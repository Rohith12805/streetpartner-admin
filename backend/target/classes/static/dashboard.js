import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

const firebaseConfig = {
    apiKey: "AIzaSyCb8NaJUQk128aT3Ayl2mZsPwmUUNm_y3k",
    authDomain: "streetpartner-admin.firebaseapp.com",
    projectId: "streetpartner-admin",
    storageBucket: "streetpartner-admin.firebasestorage.app",
    messagingSenderId: "601907972037",
    appId: "1:601907972037:web:12fb87911ef1d50c0bedac"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

let authToken = null;
let map;
let markers = {};

// Initialize Map
function initMap() {
    map = L.map('map', { zoomControl: false }).setView([20.5937, 78.9629], 5); // Default center India
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 19
    }).addTo(map);

    L.control.zoom({ position: 'bottomright' }).addTo(map);
}

// Fetch Emergencies from Spring Boot API
async function fetchEmergencies() {
    if (!authToken) return;

    try {
        const response = await fetch('http://localhost:8081/api/emergencies', {
            headers: {
                'Authorization': 'Bearer ' + authToken
            }
        });

        if (response.ok) {
            const emergencies = await response.json();
            updateMap(emergencies);
        } else if (response.status === 401) {
            console.error("Unauthorized");
            window.location.href = 'index.html';
        }
    } catch (error) {
        console.error("Error fetching emergencies:", error);
    }
}

// Update Map Markers
function updateMap(emergencies) {
    const currentIds = new Set(emergencies.map(e => e.id));

    // Remove markers that are no longer active
    Object.keys(markers).forEach(id => {
        if (!currentIds.has(id)) {
            map.removeLayer(markers[id]);
            delete markers[id];
        }
    });

    // Add or update markers
    emergencies.forEach(emergency => {
        const { id, lat, lng } = emergency;
        if (!lat || !lng) return;

        if (markers[id]) {
            // Update position
            markers[id].setLatLng([lat, lng]);
        } else {
            // Create new marker
            const customIcon = L.divIcon({
                className: 'custom-div-icon',
                html: "<div class='marker-pin'></div>",
                iconSize: [24, 24],
                iconAnchor: [12, 12]
            });

            const marker = L.marker([lat, lng], { icon: customIcon }).addTo(map);
            marker.on('click', () => showDetails(emergency));
            markers[id] = marker;
            
            // Pan to new emergency if it just popped up
            map.flyTo([lat, lng], 14, { duration: 1.5 });
        }
    });
}

// UI Interaction
let currentEmergency = null;

function showDetails(emergency) {
    currentEmergency = emergency;
    document.getElementById('detailName').innerText = emergency.userName || 'Unknown';
    document.getElementById('detailPhone').innerText = emergency.mobileNumber || 'N/A';
    document.getElementById('detailBlood').innerText = emergency.bloodGroup || 'N/A';
    document.getElementById('detailLink').innerText = emergency.liveLocationLink || 'N/A';
    
    document.getElementById('sidebar').classList.add('active');
}

document.getElementById('closeSidebar').addEventListener('click', () => {
    document.getElementById('sidebar').classList.remove('active');
});

document.getElementById('copyBtn').addEventListener('click', () => {
    if (!currentEmergency) return;
    
    const text = EMERGENCY SOS!
Name: 
Phone: 
Blood Group: 
Live Tracking: ;

    navigator.clipboard.writeText(text).then(() => {
        const toast = document.getElementById('toast');
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 3000);
    });
});

document.getElementById('logoutBtn').addEventListener('click', () => {
    signOut(auth);
});

// Auth Listener
onAuthStateChanged(auth, async (user) => {
    if (user) {
        authToken = await user.getIdToken();
        initMap();
        
        // Initial fetch
        fetchEmergencies();
        
        // Poll every 3 seconds for live tracking!
        setInterval(fetchEmergencies, 3000);
    } else {
        window.location.href = 'index.html';
    }
});

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc, collection, onSnapshot, query, orderBy } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Consolidated Firebase project: streetpartner
// Houses: emergencies, road_qualities, allowed_admins, area_safety_cells (with reviews & sosCount), sos_sessions
const firebaseConfig = {
    apiKey: "AIzaSyAtHdm7HlLgeNrMiFI2IYhXWLwv0WOUrAo",
    authDomain: "streetpartner.firebaseapp.com",
    projectId: "streetpartner",
    storageBucket: "streetpartner.firebasestorage.app",
    messagingSenderId: "36523415965",
    appId: "1:36523415965:web:6ad9e28eb654ddbc547774"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

let authToken = null;
let adminEmail = null;
let map;
let markers = {};
let currentTab = 'active'; 
let currentActivePoller = null;
let selectedEmergencyUnsubscribe = null;
let selectedEmergencyId = null;
let currentRoadMarker = null;
let currentRoadLat = null;
let currentRoadLng = null;

// Area Safety Index state
let safetyGridLayers = [];
let allSafetyCellsCache = new Map();
let activeSafetyCellId = '';
let activeReviewsUnsubscribe = null;

function updateSliderBadges() {
    ['rateLighting', 'ratePopulation', 'rateCrime', 'rateServices'].forEach(id => {
        const input = document.getElementById(id);
        const badge = document.getElementById(id + 'Badge');
        if (input && badge) {
            badge.innerText = `${input.value} / 10`;
            const min = parseFloat(input.min) || 1;
            const max = parseFloat(input.max) || 10;
            const val = parseFloat(input.value) || min;
            const pct = ((val - min) / (max - min)) * 100;
            input.style.background = `linear-gradient(to right, #2A73E1 0%, #2A73E1 ${pct}%, #e2e8f0 ${pct}%, #e2e8f0 100%)`;
        }
    });
}

let currentRoadData = null;

function showRoadDisplayView(data) {
    const dispView = document.getElementById('roadDisplayView');
    const editView = document.getElementById('roadEditView');
    if (dispView) dispView.style.display = 'block';
    if (editView) editView.style.display = 'none';

    if (data && (data.lighting !== undefined || data.population !== undefined || data.crime !== undefined || data.services !== undefined)) {
        currentRoadData = data;
        const unratedBox = document.getElementById('roadUnratedBox');
        const ratedBox = document.getElementById('roadRatedBox');
        if (unratedBox) unratedBox.style.display = 'none';
        if (ratedBox) ratedBox.style.display = 'block';

        const lighting = Number(data.lighting) || 0;
        const pop = Number(data.population) || 0;
        const crime = Number(data.crime) || 0;
        const serv = Number(data.services) || 0;

        const dispL = document.getElementById('dispLighting');
        const barL = document.getElementById('barLighting');
        if (dispL) dispL.innerText = `${lighting} / 10`;
        if (barL) barL.style.width = `${Math.min(100, Math.max(0, (lighting / 10) * 100))}%`;

        const dispP = document.getElementById('dispPopulation');
        const barP = document.getElementById('barPopulation');
        if (dispP) dispP.innerText = `${pop} / 10`;
        if (barP) barP.style.width = `${Math.min(100, Math.max(0, (pop / 10) * 100))}%`;

        const dispC = document.getElementById('dispCrime');
        const barC = document.getElementById('barCrime');
        if (dispC) dispC.innerText = `${crime} / 10`;
        if (barC) barC.style.width = `${Math.min(100, Math.max(0, (crime / 10) * 100))}%`;

        const dispS = document.getElementById('dispServices');
        const barS = document.getElementById('barServices');
        if (dispS) dispS.innerText = `${serv} / 10`;
        if (barS) barS.style.width = `${Math.min(100, Math.max(0, (serv / 10) * 100))}%`;

        const lastUp = data.timestamp ? new Date(data.timestamp).toLocaleString() : '';
        const lastUpEl = document.getElementById('roadLastUpdated');
        if (lastUpEl) lastUpEl.innerText = lastUp ? `Updated: ${lastUp}` : '';

        const ratedByEl = document.getElementById('roadRatedBy');
        if (ratedByEl) ratedByEl.innerText = data.adminEmail ? `Evaluated by: ${data.adminEmail}` : '';
    } else {
        currentRoadData = null;
        const unratedBox = document.getElementById('roadUnratedBox');
        const ratedBox = document.getElementById('roadRatedBox');
        if (unratedBox) unratedBox.style.display = 'block';
        if (ratedBox) ratedBox.style.display = 'none';
    }
}

function showRoadEditView(isModifying) {
    const dispView = document.getElementById('roadDisplayView');
    const editView = document.getElementById('roadEditView');
    if (dispView) dispView.style.display = 'none';
    if (editView) editView.style.display = 'block';

    const titleEl = document.getElementById('editViewTitle');
    if (isModifying && currentRoadData) {
        if (titleEl) titleEl.innerText = 'Modify Road Rating (1-10)';
        const l = document.getElementById('rateLighting');
        const p = document.getElementById('ratePopulation');
        const c = document.getElementById('rateCrime');
        const s = document.getElementById('rateServices');
        if (l) l.value = currentRoadData.lighting || 5;
        if (p) p.value = currentRoadData.population || 5;
        if (c) c.value = currentRoadData.crime || 5;
        if (s) s.value = currentRoadData.services || 5;
    } else {
        if (titleEl) titleEl.innerText = 'Rate Road (1-10)';
        const l = document.getElementById('rateLighting');
        const p = document.getElementById('ratePopulation');
        const c = document.getElementById('rateCrime');
        const s = document.getElementById('rateServices');
        if (l) l.value = 5;
        if (p) p.value = 5;
        if (c) c.value = 5;
        if (s) s.value = 5;
    }
    updateSliderBadges();
}

function initUI() {
    const toggleBtn = document.getElementById('sidebarToggleBtn');
    if (toggleBtn) {
        toggleBtn.addEventListener('click', () => {
            const sb = document.getElementById('sidebar');
            if (sb) {
                sb.classList.toggle('collapsed');
                if (map) {
                    setTimeout(() => map.invalidateSize(), 260);
                }
            }
        });
    }

    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
            
            const tab = btn.getAttribute('data-tab');
            btn.classList.add('active');
            document.getElementById(`tab-${tab}`).classList.add('active');
            
            currentTab = tab;
            handleTabChange();
        });
    });

    document.getElementById('logoutBtn').addEventListener('click', () => signOut(auth));

    ['rateLighting', 'ratePopulation', 'rateCrime', 'rateServices'].forEach(id => {
        const input = document.getElementById(id);
        if (input) {
            input.addEventListener('input', updateSliderBadges);
        }
    });
    updateSliderBadges();

    const startRatingBtn = document.getElementById('startRatingBtn');
    if (startRatingBtn) startRatingBtn.addEventListener('click', () => showRoadEditView(false));

    const modifyRatingBtn = document.getElementById('modifyRatingBtn');
    if (modifyRatingBtn) modifyRatingBtn.addEventListener('click', () => showRoadEditView(true));

    const cancelRatingEditBtn = document.getElementById('cancelRatingEditBtn');
    if (cancelRatingEditBtn) cancelRatingEditBtn.addEventListener('click', () => showRoadDisplayView(currentRoadData));

    const closeRoadPanelBtn = document.getElementById('closeRoadPanelBtn');
    if (closeRoadPanelBtn) {
        closeRoadPanelBtn.addEventListener('click', () => {
            const container = document.getElementById('ratingFormContainer');
            if (container) container.style.display = 'none';
            if (currentRoadMarker) map.removeLayer(currentRoadMarker);
        });
    }

    document.getElementById('ratingForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const docId = document.getElementById('selectedRoadId').innerText;
        if (!docId) return;

        const effectiveLat = currentRoadLat ?? currentRoadData?.latitude ?? currentRoadData?.lat ?? null;
        const effectiveLng = currentRoadLng ?? currentRoadData?.longitude ?? currentRoadData?.lng ?? null;

        const data = {
            lighting: parseInt(document.getElementById('rateLighting').value, 10),
            population: parseInt(document.getElementById('ratePopulation').value, 10),
            crime: parseInt(document.getElementById('rateCrime').value, 10),
            services: parseInt(document.getElementById('rateServices').value, 10),
            latitude: effectiveLat,
            longitude: effectiveLng,
            lat: effectiveLat,
            lng: effectiveLng,
            timestamp: new Date().toISOString(),
            adminEmail: adminEmail,
            coordinates: (effectiveLat != null && effectiveLng != null) ? `${effectiveLat},${effectiveLng}` : docId
        };

        try {
            await setDoc(doc(db, "road_qualities", docId), data);
            alert("Road rating saved successfully!");
            showRoadDisplayView(data);
        } catch (error) {
            console.error("Error saving road rating:", error);
            alert("Failed to save rating: " + (error.message || error));
        }
    });
}

function initMap() {
    map = L.map('map', { zoomControl: false }).setView([16.48, 80.61], 14);
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 19
    }).addTo(map);

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    map.on('click', async (e) => {
        if (currentTab !== 'roads') return;
        
        const lat = e.latlng.lat;
        const lng = e.latlng.lng;
        
        try {
            const res = await fetch(`http://router.project-osrm.org/nearest/v1/driving/${lng},${lat}`);
            const data = await res.json();
            
            if (data.code === 'Ok' && data.waypoints.length > 0) {
                const waypoint = data.waypoints[0];
                const snappedLat = waypoint.location[1];
                const snappedLng = waypoint.location[0];
                currentRoadLat = snappedLat;
                currentRoadLng = snappedLng;
                
                let edgeId = `coord_${snappedLat.toFixed(5)}_${snappedLng.toFixed(5)}`;
                if (waypoint.nodes && waypoint.nodes.length >= 2) {
                    const sortedNodes = waypoint.nodes.slice(0, 2).sort((a,b) => a-b);
                    edgeId = `edge_${sortedNodes[0]}_${sortedNodes[1]}`;
                }
                
                if (currentRoadMarker) map.removeLayer(currentRoadMarker);
                const customIcon = L.divIcon({
                    className: 'custom-div-icon',
                    html: "<div class='marker-pin road'></div>",
                    iconSize: [24, 24],
                    iconAnchor: [12, 12]
                });
                currentRoadMarker = L.marker([snappedLat, snappedLng], { icon: customIcon }).addTo(map);
                
                document.getElementById('ratingFormContainer').style.display = 'block';
                document.getElementById('selectedRoadId').innerText = edgeId;

                const docRef = doc(db, "road_qualities", edgeId);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    showRoadDisplayView(docSnap.data());
                } else {
                    showRoadDisplayView(null);
                }
            }
        } catch (error) {
            console.error("OSRM error:", error);
        }
    });

    // Panning & zooming map handlers for Area Safety Index
    map.on('move', () => {
        if (currentTab === 'stats') {
            updateActiveCellFromMapCenter();
        }
    });

    map.on('moveend', () => {
        if (currentTab === 'stats') {
            renderSafetyGrid();
            updateActiveCellFromMapCenter();
        }
    });

    map.on('zoomend', () => {
        if (currentTab === 'stats') {
            renderSafetyGrid();
            updateActiveCellFromMapCenter();
        }
    });
}

// ==========================================
// DATE & TIME FORMATTING HELPER
// ==========================================
function formatEmergencyTime(timestamp) {
    if (!timestamp) return 'Unknown';
    let date;
    if (typeof timestamp === 'string') {
        date = new Date(timestamp);
    } else if (typeof timestamp === 'number') {
        date = new Date(timestamp < 10000000000 ? timestamp * 1000 : timestamp);
    } else if (timestamp.seconds !== undefined) {
        date = new Date(timestamp.seconds * 1000);
    } else if (timestamp._seconds !== undefined) {
        date = new Date(timestamp._seconds * 1000);
    } else if (timestamp.toDate && typeof timestamp.toDate === 'function') {
        date = timestamp.toDate();
    } else {
        date = new Date(timestamp);
    }

    if (isNaN(date.getTime())) return 'Unknown';

    const dateStr = date.toLocaleDateString(undefined, {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
    });
    const timeStr = date.toLocaleTimeString(undefined, {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
    });
    return `${dateStr} • ${timeStr}`;
}

// ==========================================
// AREA SAFETY INDEX LOGIC
// ==========================================

function getSafetyColor(averageRating) {
    if (averageRating === null || averageRating === undefined || averageRating === 0) {
        return '#9E9E9E'; // Subtle grey
    }
    if (averageRating >= 4.0) return '#28A745'; // Very Safe - Green
    if (averageRating >= 3.0) return '#8BC34A'; // Moderately Safe - Light Green
    if (averageRating >= 2.0) return '#FFA000'; // Use Caution - Amber
    if (averageRating >= 1.0) return '#FF5722'; // High Caution - Deep Orange
    return '#E53935'; // Unsafe - Red
}

function getSafetyLabel(averageRating) {
    if (averageRating === null || averageRating === undefined || averageRating === 0) {
        return 'No Data';
    }
    if (averageRating >= 4.0) return 'Very Safe';
    if (averageRating >= 3.0) return 'Moderately Safe';
    if (averageRating >= 2.0) return 'Use Caution';
    return 'Unsafe';
}

function subscribeToSafetyCells() {
    onSnapshot(collection(db, "area_safety_cells"), (snapshot) => {
        allSafetyCellsCache.clear();
        snapshot.forEach(docSnap => {
            allSafetyCellsCache.set(docSnap.id, { id: docSnap.id, ...docSnap.data() });
        });
        
        if (currentTab === 'stats') {
            renderSafetyGrid();
            updateActiveCellFromMapCenter();
        }
    }, (err) => {
        console.error("Error subscribing to area_safety_cells:", err);
    });
}

function clearSafetyGrid() {
    safetyGridLayers.forEach(l => map.removeLayer(l));
    safetyGridLayers = [];
}

function renderSafetyGrid() {
    const zoom = map.getZoom();
    const zoomNotice = document.getElementById('safetyZoomNotice');
    const zoomDisplay = document.getElementById('currentZoomLevel');
    if (zoomDisplay) zoomDisplay.innerText = zoom;

    // RULE: Don't show any color on any boxes if zoom covers more than loaded (< 13)
    if (zoom < 13) {
        clearSafetyGrid();
        if (zoomNotice) zoomNotice.style.display = 'block';
        return;
    }

    if (zoomNotice) zoomNotice.style.display = 'none';

    const center = map.getCenter();
    const cLat = Number(Number(center.lat + 0.0).toFixed(2));
    const cLng = Number(Number(center.lng + 0.0).toFixed(2));

    clearSafetyGrid();

    // Load 7 boxes radius in all directions (-7 to +7 = 15x15 grid)
    for (let dy = -7; dy <= 7; dy++) {
        for (let dx = -7; dx <= 7; dx++) {
            const bLat = Number((cLat + dy * 0.01).toFixed(2));
            const bLng = Number((cLng + dx * 0.01).toFixed(2));
            const normLat = (bLat === 0 ? 0 : bLat).toFixed(2);
            const normLng = (bLng === 0 ? 0 : bLng).toFixed(2);
            const cellId = `cell_${normLat}_${normLng}`;
            const isActive = (dy === 0 && dx === 0);

            const cellData = allSafetyCellsCache.get(cellId);
            const hasData = cellData && cellData.totalRatings > 0;
            const avgRating = cellData ? cellData.averageRating : 0;
            const color = getSafetyColor(avgRating);

            const bounds = [
                [bLat - 0.005, bLng - 0.005],
                [bLat + 0.005, bLng + 0.005]
            ];

            let rect;
            if (isActive) {
                // Highlight the active center cell under the static pointer
                rect = L.rectangle(bounds, {
                    color: '#2A73E1',
                    weight: 3,
                    fillColor: hasData ? color : '#2A73E1',
                    fillOpacity: hasData ? 0.35 : 0.15
                }).addTo(map);
            } else if (hasData) {
                // Cell with community ratings
                rect = L.rectangle(bounds, {
                    color: color,
                    weight: 1.5,
                    fillColor: color,
                    fillOpacity: 0.25
                }).addTo(map);
            } else {
                // Neutral cell in 7-box radius
                rect = L.rectangle(bounds, {
                    color: 'rgba(160, 160, 160, 0.35)',
                    weight: 1,
                    fillColor: 'transparent',
                    fillOpacity: 0.02
                }).addTo(map);
            }

            safetyGridLayers.push(rect);
        }
    }
}

function updateActiveCellFromMapCenter() {
    const center = map.getCenter();
    const cLat = Number(Number(center.lat + 0.0).toFixed(2));
    const cLng = Number(Number(center.lng + 0.0).toFixed(2));
    const normLat = (cLat === 0 ? 0 : cLat).toFixed(2);
    const normLng = (cLng === 0 ? 0 : cLng).toFixed(2);
    const cellId = `cell_${normLat}_${normLng}`;

    if (cellId === activeSafetyCellId) return;
    activeSafetyCellId = cellId;

    const cellData = allSafetyCellsCache.get(cellId);
    renderActiveCellDetails(normLat, normLng, cellData);
    subscribeToCellReviews(cellId);
}

function renderActiveCellDetails(latStr, lngStr, cellData) {
    const statusBadge = document.getElementById('safetyStatusBadge');
    const cellIdDisplay = document.getElementById('activeCellIdDisplay');
    const sosBadge = document.getElementById('activeCellSosBadge');
    const ratingStars = document.getElementById('activeCellRatingStars');
    const ratingCount = document.getElementById('activeCellRatingCount');
    const issuesList = document.getElementById('activeCellIssuesList');
    const coordsDisplay = document.getElementById('activeCellCoords');

    if (!statusBadge) return;

    const avgRating = cellData?.averageRating || 0;
    const totalRatings = cellData?.totalRatings || 0;
    const sosCount = cellData?.sosCount || 0;
    const label = getSafetyLabel(avgRating);
    const color = getSafetyColor(avgRating);

    statusBadge.innerText = label;
    statusBadge.style.background = totalRatings > 0 ? color : '#e0e0e0';
    statusBadge.style.color = totalRatings > 0 ? '#ffffff' : '#555555';

    cellIdDisplay.innerText = `Cell: ${latStr}, ${lngStr}`;
    coordsDisplay.innerText = `${latStr}, ${lngStr}`;

    // SOS badge (reflects merged sosCount)
    sosBadge.innerText = `${sosCount} SOS`;
    sosBadge.style.background = sosCount > 0 ? '#E53935' : '#2A73E1';

    // Community Ratings
    if (totalRatings > 0) {
        ratingStars.innerText = `★ ${avgRating.toFixed(1)}`;
        ratingStars.style.color = '#FFA000';
        ratingCount.innerText = `(${totalRatings} community ${totalRatings === 1 ? 'rating' : 'ratings'})`;
    } else {
        ratingStars.innerText = `★ 0.0`;
        ratingStars.style.color = '#9E9E9E';
        ratingCount.innerText = `(No community ratings yet)`;
    }

    // Issues
    issuesList.innerHTML = '';
    const issueCounts = cellData?.issueCounts || {};
    const issueKeys = Object.keys(issueCounts).filter(k => issueCounts[k] > 0);
    
    if (issueKeys.length === 0) {
        issuesList.innerHTML = '<span style="font-size: 12px; color: #999;">No issues reported for this area.</span>';
    } else {
        issueKeys.forEach(issueKey => {
            const span = document.createElement('span');
            span.className = 'issue-tag reported';
            const cleanName = issueKey.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
            span.innerText = `${cleanName} (${issueCounts[issueKey]})`;
            issuesList.appendChild(span);
        });
    }
}

function subscribeToCellReviews(cellId) {
    if (activeReviewsUnsubscribe) {
        activeReviewsUnsubscribe();
        activeReviewsUnsubscribe = null;
    }

    const reviewsContainer = document.getElementById('cellReviewsList');
    const countBadge = document.getElementById('reviewsCountBadge');
    if (!reviewsContainer) return;

    reviewsContainer.innerHTML = '<p style="color: #888; font-size: 13px;">Loading reviews...</p>';

    const reviewsRef = collection(db, "area_safety_cells", cellId, "reviews");
    const q = query(reviewsRef, orderBy("timestamp", "desc"));

    activeReviewsUnsubscribe = onSnapshot(q, (snapshot) => {
        reviewsContainer.innerHTML = '';
        if (countBadge) countBadge.innerText = `${snapshot.size} ${snapshot.size === 1 ? 'review' : 'reviews'}`;

        if (snapshot.empty) {
            reviewsContainer.innerHTML = '<p style="color: #888; font-size: 13px;">No community reviews yet for this cell.</p>';
            return;
        }

        snapshot.forEach(docSnap => {
            const data = docSnap.data();
            const div = document.createElement('div');
            div.className = 'review-item';

            let dateStr = 'Recently';
            if (data.timestamp?.toDate) {
                dateStr = data.timestamp.toDate().toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
            }

            let issuesHtml = '';
            if (data.issues && data.issues.length > 0) {
                issuesHtml = `<div class="review-issues">${data.issues.map(i => `<span class="issue-tag">${i.replace(/_/g, ' ')}</span>`).join('')}</div>`;
            }

            div.innerHTML = `
                <div class="review-header">
                    <span class="review-rating">★ ${(data.rating || 0).toFixed(1)}</span>
                    <span class="review-date">${dateStr}</span>
                </div>
                ${issuesHtml}
                <div class="review-text">${data.experienceText || 'No comments left.'}</div>
            `;
            reviewsContainer.appendChild(div);
        });
    }, (err) => {
        console.error("Error streaming reviews:", err);
        reviewsContainer.innerHTML = '<p style="color: #888; font-size: 13px;">No community reviews yet.</p>';
    });
}

// ==========================================
// TAB CHANGE HANDLER
// ==========================================

function handleTabChange() {
    Object.values(markers).forEach(m => map.removeLayer(m));
    markers = {};
    if (currentRoadMarker) map.removeLayer(currentRoadMarker);

    clearSafetyGrid();
    if (activeReviewsUnsubscribe) {
        activeReviewsUnsubscribe();
        activeReviewsUnsubscribe = null;
    }
    
    if (selectedEmergencyUnsubscribe) {
        selectedEmergencyUnsubscribe();
        selectedEmergencyUnsubscribe = null;
    }
    selectedEmergencyId = null;

    document.getElementById('ratingFormContainer').style.display = 'none';
    const centerPointer = document.getElementById('staticCenterPointer');
    if (centerPointer) centerPointer.style.display = 'none';

    if (currentActivePoller) {
        clearInterval(currentActivePoller);
        currentActivePoller = null;
    }

    if (currentTab === 'active') {
        fetchActiveEmergencies();
    } else if (currentTab === 'history') {
        fetchHistory();
    } else if (currentTab === 'stats') {
        if (centerPointer) centerPointer.style.display = 'block';
        renderSafetyGrid();
        updateActiveCellFromMapCenter();
    }
}

async function fetchActiveEmergencies() {
    if (!authToken) return;
    try {
        const response = await fetch('http://localhost:8081/api/emergencies', {
            headers: { 'Authorization': 'Bearer ' + authToken }
        });
        if (response.ok) {
            const data = await response.json();
            renderList(data, 'activeList', true);
            updateMapMarkers(data);
        }
    } catch (e) {}
}

async function fetchHistory() {
    if (!authToken) return;
    try {
        const response = await fetch('http://localhost:8081/api/emergencies/history', {
            headers: { 'Authorization': 'Bearer ' + authToken }
        });
        if (response.ok) {
            const data = await response.json();
            renderList(data, 'historyList', false);
            updateMapMarkers(data); 
        }
    } catch (e) {}
}

window.acceptEmergency = async (id) => {
    if (!authToken) return;
    try {
        const response = await fetch(`http://localhost:8081/api/emergencies/${id}/accept`, {
            method: 'POST',
            headers: { 'Authorization': 'Bearer ' + authToken }
        });
        if (response.ok) {
            if (selectedEmergencyUnsubscribe) {
                selectedEmergencyUnsubscribe();
                selectedEmergencyUnsubscribe = null;
            }
            selectedEmergencyId = null;
            fetchActiveEmergencies();
        }
    } catch (e) { console.error(e); }
};

window.copyEmergencyDetails = (name, phone, blood, link) => {
    const text = `EMERGENCY SOS!\nName: ${name}\nPhone: ${phone}\nBlood Group: ${blood}\nLive Tracking: ${link}`;
    navigator.clipboard.writeText(text).then(() => {
        alert("Details copied to clipboard!");
    });
};

function renderList(items, containerId, isActiveTab) {
    const container = document.getElementById(containerId);
    
    const currentlyExpanded = container.querySelector('.list-item.expanded')?.getAttribute('data-id');

    container.innerHTML = '';
    
    if (items.length === 0) {
        container.innerHTML = '<p style="color: #777; font-size: 14px;">No records found.</p>';
        return;
    }

    items.forEach(item => {
        const div = document.createElement('div');
        div.className = 'list-item';
        div.setAttribute('data-id', item.id);
        if (currentlyExpanded === item.id) div.classList.add('expanded', 'selected');
        
        const safeName = (item.userName || 'Unknown').replace(/'/g, "\\'");
        const safePhone = (item.mobileNumber || 'N/A').replace(/'/g, "\\'");
        const safeBlood = (item.bloodGroup || 'O+').replace(/'/g, "\\'");
        const safeLink = (item.liveLocationLink || 'N/A').replace(/'/g, "\\'");
        // Determine correct chronological trigger and resolved times
        const rawTrigger = item.triggeredAt || item.createdAt || item.timestamp;
        const rawResolved = item.resolvedAt || item.handledAt;

        let triggerDate = rawTrigger ? new Date(rawTrigger) : null;
        let resolvedDate = rawResolved ? new Date(rawResolved) : null;

        // Consistency guarantee: If legacy location pings overwrote timestamp after handledAt, correct chronology
        if (triggerDate && resolvedDate && resolvedDate < triggerDate) {
            const earlier = resolvedDate;
            const later = triggerDate;
            triggerDate = earlier;
            resolvedDate = later;
        }

        const triggeredTime = triggerDate ? formatEmergencyTime(triggerDate) : 'Unknown';

        const isLive = item.isActive === true;
        let statusBadgeHtml = '';
        if (isLive) {
            statusBadgeHtml = `<span class="live-badge" style="background: #dc3545; color: white; padding: 2px 8px; border-radius: 12px; font-size: 11px; font-weight: bold; margin-left: 6px;">● LIVE</span>`;
        } else if (!isActiveTab) {
            statusBadgeHtml = `<span class="live-badge" style="background: #28a745; color: white; padding: 2px 8px; border-radius: 12px; font-size: 11px; font-weight: bold; margin-left: 6px;">RESOLVED</span>`;
        }

        let handledTimeHtml = '';
        if (!isActiveTab && resolvedDate) {
            const handledTime = formatEmergencyTime(resolvedDate);
            const statusLabel = isLive ? 'Accepted:' : 'Resolved:';
            handledTimeHtml = `<div class="detail-text" style="color: ${isLive ? '#dc3545' : '#28a745'}; font-size: 12px; margin-bottom: 6px;"><b>${statusLabel}</b> ${handledTime}</div>`;
        }

        let html = `
            <div class="list-item-header">
                <div style="display: flex; align-items: center;">
                    <div class="list-item-name">${item.userName || 'Unknown User'}</div>
                    ${statusBadgeHtml}
                </div>
                <div class="blood-badge">${item.bloodGroup || 'O+'}</div>
            </div>
            <div class="detail-text" style="color: var(--primary); font-weight: 600; font-size: 12px; margin-bottom: 4px;">
                🕒 <b>Triggered:</b> ${triggeredTime}
            </div>
            <div class="detail-text">Phone: ${item.mobileNumber || 'N/A'}</div>
            
            <div class="list-item-details">
                ${handledTimeHtml}
                <div class="detail-text" style="margin-bottom: 8px;"><b>Live Link:</b> <a href="${item.liveLocationLink}" target="_blank">View Route</a></div>
                <div style="display: flex; gap: 8px;">
                    ${isActiveTab ? `<button class="accept-btn" onclick="event.stopPropagation(); acceptEmergency('${item.id}')">Accept SOS</button>` : ''}
                    <button class="accept-btn" style="background: var(--surface); color: var(--on-surface); border: 1px solid var(--outline);" onclick="event.stopPropagation(); copyEmergencyDetails('${safeName}', '${safePhone}', '${safeBlood}', '${safeLink}')">Copy Details</button>
                </div>
            </div>
        `;
        div.innerHTML = html;
        
        div.addEventListener('click', () => {
            const isAlreadyExpanded = div.classList.contains('expanded');
            
            // Clean up any ongoing live location listener
            if (selectedEmergencyUnsubscribe) {
                selectedEmergencyUnsubscribe();
                selectedEmergencyUnsubscribe = null;
            }
            selectedEmergencyId = null;

            document.querySelectorAll('.list-item').forEach(i => i.classList.remove('expanded', 'selected'));

            if (!isAlreadyExpanded) {
                div.classList.add('expanded', 'selected');
                selectedEmergencyId = item.id;

                // Center on initial static snapshot location
                const initialLat = item.lat || item.latitude;
                const initialLng = item.lng || item.longitude;
                if (initialLat && initialLng) {
                    map.flyTo([initialLat, initialLng], 16, { duration: 1.0 });
                }

                // If emergency is active (both Active and History tabs), start live stream
                if (item.isActive === true) {
                    console.log("Subscribing to live location for selected emergency:", item.id);
                    selectedEmergencyUnsubscribe = onSnapshot(doc(db, "emergencies", item.id), (docSnap) => {
                        if (!docSnap.exists()) return;
                        const data = docSnap.data();
                        const currentLat = data.lat !== undefined ? data.lat : data.latitude;
                        const currentLng = data.lng !== undefined ? data.lng : data.longitude;
                        const isStillActive = data.isActive !== undefined ? data.isActive : data.active;

                        if (currentLat && currentLng) {
                            if (markers[item.id]) {
                                markers[item.id].setLatLng([currentLat, currentLng]);
                            } else {
                                const customIcon = L.divIcon({
                                    className: 'custom-div-icon',
                                    html: `<div class='marker-pin'></div>`,
                                    iconSize: [24, 24],
                                    iconAnchor: [12, 12]
                                });
                                markers[item.id] = L.marker([currentLat, currentLng], { icon: customIcon }).addTo(map);
                            }
                            map.panTo([currentLat, currentLng], { animate: true });
                        }

                        if (!isStillActive) {
                            console.log("Selected emergency became inactive.");
                            if (selectedEmergencyUnsubscribe) {
                                selectedEmergencyUnsubscribe();
                                selectedEmergencyUnsubscribe = null;
                            }
                            const badge = div.querySelector('.live-badge');
                            if (badge) {
                                badge.textContent = 'STOPPED';
                                badge.style.background = '#6c757d';
                            }
                            if (markers[item.id]) {
                                const greyIcon = L.divIcon({
                                    className: 'custom-div-icon',
                                    html: `<div class='marker-pin history'></div>`,
                                    iconSize: [24, 24],
                                    iconAnchor: [12, 12]
                                });
                                markers[item.id].setIcon(greyIcon);
                            }
                        }
                    }, (err) => {
                        console.error("Live emergency tracking error:", err);
                    });
                }
            }
        });

        container.appendChild(div);
    });
}

function updateMapMarkers(items) {
    const currentIds = new Set(items.map(i => i.id));

    Object.keys(markers).forEach(id => {
        if (!currentIds.has(id)) {
            map.removeLayer(markers[id]);
            delete markers[id];
        }
    });

    items.forEach(item => {
        const id = item.id;
        const lat = item.lat || item.latitude;
        const lng = item.lng || item.longitude;
        const isLive = item.isActive === true;

        if (!lat || !lng) return;

        if (markers[id]) {
            markers[id].setLatLng([lat, lng]);
        } else {
            const customIcon = L.divIcon({
                className: 'custom-div-icon',
                html: `<div class='marker-pin ${isLive ? '' : 'history'}'></div>`,
                iconSize: [24, 24],
                iconAnchor: [12, 12]
            });

            const marker = L.marker([lat, lng], { icon: customIcon }).addTo(map);
            marker.on('click', () => {
                const listItem = document.querySelector(`.list-item[data-id='${id}']`);
                if (listItem) listItem.click();
            });
            markers[id] = marker;
        }
    });
}

onAuthStateChanged(auth, async (user) => {
    if (user) {
        authToken = await user.getIdToken();
        adminEmail = user.email;
        document.getElementById('adminEmailDisplay').innerText = adminEmail;
        
        initUI();
        initMap();
        subscribeToSafetyCells();
        handleTabChange();
    } else {
        window.location.href = 'index.html';
    }
});

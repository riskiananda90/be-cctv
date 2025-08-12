        let map;
        let cctvData = [];
        let markers = [];
        let currentUser = null;
        let editingCctvId = null;
        let authToken = localStorage.getItem('authToken');

        // API Configuration
        const API_BASE = 'http://localhost:3000/api';

        // Initialize the application
        document.addEventListener('DOMContentLoaded', function() {
            initMap();
            checkAuthStatus();
            loadCCTVData();
            setupEventListeners();
        });

        // API Helper Functions
        async function apiRequest(url, options = {}) {
            const defaultHeaders = {
                'Content-Type': 'application/json',
            };

            if (authToken) {
                defaultHeaders.Authorization = `Bearer ${authToken}`;
            }

            const config = {
                ...options,
                headers: {
                    ...defaultHeaders,
                    ...options.headers,
                },
            };

            try {
                const response = await fetch(`${API_BASE}${url}`, config);
                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.error || 'API request failed');
                }

                return data;
            } catch (error) {
                console.error('API Error:', error);
                throw error;
            }
        }

        // Auth Functions
        async function login(email, password) {
            try {
                showLoading(true);
                const data = await apiRequest('/auth/login', {
                    method: 'POST',
                    body: JSON.stringify({ email, password }),
                });

                authToken = data.token;
                localStorage.setItem('authToken', authToken);
                currentUser = data.user;
                
                updateAuthUI();
                closeLoginModal();
                await loadCCTVData();
                showNotification('Login berhasil!', 'success');
            } catch (error) {
                showNotification('Login gagal: ' + error.message, 'error');
            } finally {
                showLoading(false);
            }
        }

        function logout() {
            authToken = null;
            currentUser = null;
            localStorage.removeItem('authToken');
            document.getElementById('addCctvBtn').style.display = 'none';
            updateAuthUI();
            loadCCTVData();
            showNotification('Logout berhasil', 'info');
        }

        // Modal Functions
        function showRegisterModal() {
            document.getElementById('registerModal').style.display = 'block';
            document.getElementById('registerForm').reset();
        }

        function closeRegisterModal() {
            document.getElementById('registerModal').style.display = 'none';
        }

        async function register(name, email, password, confirmPassword) {
            if (password !== confirmPassword) {
                showNotification('Password dan konfirmasi password tidak cocok', 'error');
                return;
            }

            try {
                showLoading(true);
                const data = await apiRequest('/auth/register', {
                    method: 'POST',
                    body: JSON.stringify({ name, email, password }),
                });

                showNotification('Pendaftaran berhasil! Silakan login.', 'success');
                closeRegisterModal();
                showLoginModal();
            } catch (error) {
                showNotification('Pendaftaran gagal: ' + error.message, 'error');
            } finally {
                showLoading(false);
            }
        }

        function checkAuthStatus() {
            if (authToken) {
                // Validate token by making a request
                apiRequest('/cameras')
                    .then(() => {
                        // Token is valid, get user info from token
                        try {
                            const payload = JSON.parse(atob(authToken.split('.')[1]));
                            currentUser = { 
                                id: payload.id, 
                                role: payload.role,
                                name: payload.role === 'admin' ? 'Administrator' : 'User'
                            };
                            updateAuthUI();
                            if (currentUser.role === 'admin') {
                                document.getElementById('addCctvBtn').style.display = 'block';
                            }
                        } catch (e) {
                            logout();
                        }
                    })
                    .catch(() => {
                        logout();
                    });
            }
        }

        // CCTV Data Functions
        async function loadCCTVData() {
            try {
                if (!authToken) {
                    cctvData = [];
                    renderCctvList();
                    addMarkersToMap();
                    return;
                }

                showLoading(true);
                const response = await apiRequest('/cameras');
                cctvData = response.data.map(camera => ({
                    id: camera._id,
                    name: camera.name,
                    location: camera.location,
                    lat: camera.latitude,
                    lng: camera.longitude,
                    status: camera.status,
                    streamUrl: camera.streamUrl,
                    description: camera.description,
                }));

                renderCctvList();
                addMarkersToMap();
            } catch (error) {
                console.error('Failed to load CCTV data:', error);
                showNotification('Gagal memuat data CCTV', 'error');
            } finally {
                showLoading(false);
            }
        }

        async function saveCctv() {
            try {
                const formData = {
                    name: document.getElementById('cctvName').value,
                    location: document.getElementById('cctvLocation').value,
                    latitude: parseFloat(document.getElementById('cctvLat').value),
                    longitude: parseFloat(document.getElementById('cctvLng').value),
                    streamUrl: document.getElementById('cctvStream').value,
                    status: document.getElementById('cctvStatus').value,
                    description: document.getElementById('cctvDescription').value,
                };

                showLoading(true);

                if (editingCctvId) {
                    // Update existing CCTV
                    await apiRequest(`/cameras/${editingCctvId}`, {
                        method: 'PUT',
                        body: JSON.stringify(formData),
                    });
                    showNotification('CCTV berhasil diperbarui!', 'success');
                } else {
                    // Add new CCTV
                    await apiRequest('/cameras', {
                        method: 'POST',
                        body: JSON.stringify(formData),
                    });
                    showNotification('CCTV berhasil ditambahkan!', 'success');
                }

                await loadCCTVData();
                closeCctvModal();
            } catch (error) {
                showNotification('Gagal menyimpan CCTV: ' + error.message, 'error');
            } finally {
                showLoading(false);
            }
        }

        async function deleteCctv(id) {
            if (!confirm('Apakah Anda yakin ingin menghapus CCTV ini?')) {
                return;
            }

            try {
                showLoading(true);
                await apiRequest(`/cameras/${id}`, {
                    method: 'DELETE',
                });

                await loadCCTVData();
                showNotification('CCTV berhasil dihapus!', 'success');
            } catch (error) {
                showNotification('Gagal menghapus CCTV: ' + error.message, 'error');
            } finally {
                showLoading(false);
            }
        }

        // Initialize Leaflet map
        function initMap() {
            // Center on Banda Aceh
            map = L.map('map').setView([5.5483, 95.3238], 13);

            // Add tile layer
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© OpenStreetMap contributors'
            }).addTo(map);

            // Handle map clicks for adding new CCTV (admin only)
            map.on('click', function(e) {
                if (currentUser && currentUser.role === 'admin') {
                    document.getElementById('cctvLat').value = e.latlng.lat.toFixed(6);
                    document.getElementById('cctvLng').value = e.latlng.lng.toFixed(6);
                }
            });
        }

        // Add markers to map
        function addMarkersToMap() {
            // Clear existing markers
            markers.forEach(marker => map.removeLayer(marker));
            markers = [];

            cctvData.forEach(cctv => {
                const iconColor = cctv.status === 'online' ? 'green' : 'red';
                
                const customIcon = L.divIcon({
                    className: 'custom-marker',
                    html: `<div style="background: ${iconColor}; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 10px rgba(0,0,0,0.3);"></div>`,
                    iconSize: [20, 20],
                    iconAnchor: [10, 10]
                });

                const marker = L.marker([cctv.lat, cctv.lng], { icon: customIcon }).addTo(map);

                const popupContent = `
                    <div class="custom-popup">
                        <h3>${cctv.name}</h3>
                        <p><strong>Lokasi:</strong> ${cctv.location}</p>
                        <p><strong>Status:</strong> <span style="color: ${iconColor}; font-weight: bold;">${cctv.status.toUpperCase()}</span></p>
                        ${cctv.status === 'online' && cctv.streamUrl ? 
                            `<button class="watch-btn" onclick="playVideo('${cctv.id}')">🔴 Tonton Live</button>` : 
                            '<p style="color: red;">Stream tidak tersedia</p>'
                        }
                    </div>
                `;

                marker.bindPopup(popupContent);
                marker.on('click', () => selectCctv(cctv.id));
                
                markers.push(marker);
            });
        }

        // Render CCTV list in sidebar
        function renderCctvList() {
            const listContainer = document.getElementById('cctvList');
            
            if (!authToken) {
                listContainer.innerHTML = '<div style="text-align: center; padding: 20px; color: #666;">Silakan login untuk melihat daftar CCTV</div>';
                return;
            }

            const searchQuery = document.getElementById('searchInput').value.toLowerCase();
            
            let filteredData = cctvData;
            if (searchQuery) {
                filteredData = cctvData.filter(cctv => 
                    cctv.name.toLowerCase().includes(searchQuery) ||
                    cctv.location.toLowerCase().includes(searchQuery)
                );
            }

            listContainer.innerHTML = filteredData.map(cctv => `
                <div class="cctv-item" onclick="selectCctv('${cctv.id}')" id="cctv-item-${cctv.id}">
                    <div class="cctv-name">${cctv.name}</div>
                    <div class="cctv-location">${cctv.location}</div>
                    <span class="cctv-status status-${cctv.status}">
                        ${cctv.status}
                        ${cctv.status === 'online' && cctv.streamUrl ? '<span class="stream-indicator stream-live"></span>' : ''}
                    </span>
                    ${currentUser && currentUser.role === 'admin' ? `
                        <div class="admin-controls" style="display: block;">
                            <button class="edit-btn" onclick="event.stopPropagation(); editCctv('${cctv.id}')">Edit</button>
                            <button class="delete-btn" onclick="event.stopPropagation(); deleteCctv('${cctv.id}')">Hapus</button>
                        </div>
                    ` : ''}
                </div>
            `).join('');
        }

        // Select CCTV
        function selectCctv(id) {
            // Remove active class from all items
            document.querySelectorAll('.cctv-item').forEach(item => {
                item.classList.remove('active');
            });

            // Add active class to selected item
            const selectedItem = document.getElementById(`cctv-item-${id}`);
            if (selectedItem) {
                selectedItem.classList.add('active');
            }

            // Center map on selected CCTV
            const cctv = cctvData.find(c => c.id === id);
            if (cctv) {
                map.setView([cctv.lat, cctv.lng], 16);
                
                // Open popup for the marker
                const marker = markers.find(m => 
                    m.getLatLng().lat === cctv.lat && m.getLatLng().lng === cctv.lng
                );
                if (marker) {
                    marker.openPopup();
                }
            }
        }

    function switchToRegister() {
        closeLoginModal();
        showRegisterModal();
    }

    function switchToLogin() {
        closeRegisterModal();
        showLoginModal();
    }

        // Modal Functions
        function showLoginModal() {
            document.getElementById('loginModal').style.display = 'block';
        }

        function closeLoginModal() {
            document.getElementById('loginModal').style.display = 'none';
        }

        function showRegisterModal() {
            document.getElementById('registerModal').style.display = 'block';
        }

        function closeRegisterModal() {
            document.getElementById('registerModal').style.display = 'none';
        }

        function showAddCctvModal() {
            if (!currentUser || currentUser.role !== 'admin') {
                showNotification('Akses ditolak! Hanya admin yang dapat menambah CCTV.', 'error');
                return;
            }

            editingCctvId = null;
            document.getElementById('modalTitle').textContent = 'Tambah CCTV Baru';
            document.getElementById('cctvForm').reset();
            document.getElementById('cctvModal').style.display = 'block';
        }

        function editCctv(id) {
            if (!currentUser || currentUser.role !== 'admin') {
                showNotification('Akses ditolak! Hanya admin yang dapat mengedit CCTV.', 'error');
                return;
            }

            const cctv = cctvData.find(c => c.id === id);
            if (!cctv) return;

            editingCctvId = id;
            document.getElementById('modalTitle').textContent = 'Edit CCTV';
            document.getElementById('cctvName').value = cctv.name;
            document.getElementById('cctvLocation').value = cctv.location;
            document.getElementById('cctvLat').value = cctv.lat;
            document.getElementById('cctvLng').value = cctv.lng;
            document.getElementById('cctvStream').value = cctv.streamUrl || '';
            document.getElementById('cctvDescription').value = cctv.description || '';
            document.getElementById('cctvStatus').value = cctv.status;
            document.getElementById('cctvModal').style.display = 'block';
        }

        function closeCctvModal() {
            document.getElementById('cctvModal').style.display = 'none';
            editingCctvId = null;
        }

        function updateAuthUI() {
            const authButtons = document.getElementById('authButtons');
            const loggedInUser = document.getElementById('loggedInUser');

            if (currentUser) {
                authButtons.style.display = 'none';
                loggedInUser.style.display = 'block';
                document.getElementById('userName').textContent = currentUser.name;
                document.getElementById('userRole').textContent = currentUser.role.toUpperCase();
            } else {
                authButtons.style.display = 'flex';
                loggedInUser.style.display = 'none';
            }
        }

        // Video player functions
        function playVideo(id) {
            const cctv = cctvData.find(c => c.id === id);
            if (!cctv || !cctv.streamUrl) {
                showNotification('Stream tidak tersedia untuk CCTV ini.', 'error');
                return;
            }

            document.getElementById('videoTitle').textContent = `🔴 Live Stream - ${cctv.name}`;
            document.getElementById('videoModal').style.display = 'block';

            const video = document.getElementById('videoPlayer');
            
            // Reset video element
            video.pause();
            video.src = '';
            
            // Check if HLS is supported
            if (Hls.isSupported()) {
                // Destroy existing HLS instance if any
                if (video.hlsInstance) {
                    video.hlsInstance.destroy();
                }
                
                const hls = new Hls({
                    debug: false,
                    enableWorker: true,
                    lowLatencyMode: true,
                    backBufferLength: 90
                });
                
                hls.loadSource(cctv.streamUrl);
                hls.attachMedia(video);
                
                hls.on(Hls.Events.MANIFEST_PARSED, function() {
                    console.log('Stream manifest loaded for:', cctv.name);
                    video.play().catch(e => {
                        console.log('Autoplay prevented:', e);
                        showNotification('Klik tombol play untuk memulai stream', 'info');
                    });
                });

                hls.on(Hls.Events.ERROR, function(event, data) {
                    console.error('HLS Error:', data);
                    if (data.fatal) {
                        showNotification('Gagal memuat stream. Mencoba reconnect...', 'error');
                        setTimeout(() => {
                            hls.loadSource(cctv.streamUrl);
                        }, 3000);
                    }
                });
                
                // Store hls instance for cleanup
                video.hlsInstance = hls;
            } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
                // Native HLS support (Safari)
                video.src = cctv.streamUrl;
                video.addEventListener('loadedmetadata', function() {
                    video.play().catch(e => {
                        console.log('Autoplay prevented:', e);
                        showNotification('Klik tombol play untuk memulai stream', 'info');
                    });
                });
            } else {
                showNotification('Browser Anda tidak mendukung streaming HLS.', 'error');
            }
        }

        function closeVideoModal() {
            const video = document.getElementById('videoPlayer');
            
            // Cleanup HLS instance
            if (video.hlsInstance) {
                video.hlsInstance.destroy();
                video.hlsInstance = null;
            }
            
            video.pause();
            video.src = '';
            document.getElementById('videoModal').style.display = 'none';
        }

        // Search functionality
        function searchCCTV() {
            renderCctvList();
        }

        // Loading functions
        function showLoading(show) {
            document.getElementById('loadingModal').style.display = show ? 'block' : 'none';
        }

        // Event Listeners
        // Event Listeners
        function setupEventListeners() {
            // Login form
            document.getElementById('loginForm').addEventListener('submit', async function(e) {
                e.preventDefault();
                const email = document.getElementById('loginEmail').value;
                const password = document.getElementById('loginPassword').value;
                await login(email, password);
            });

            // Register form
            document.getElementById('registerForm').addEventListener('submit', async function(e) {
                e.preventDefault();
                const name = document.getElementById('registerName').value;
                const email = document.getElementById('registerEmail').value;
                const password = document.getElementById('registerPassword').value;
                const confirmPassword = document.getElementById('registerConfirmPassword').value;
                await register(name, email, password, confirmPassword);
            });

            // CCTV form
            document.getElementById('cctvForm').addEventListener('submit', function(e) {
                e.preventDefault();
                saveCctv();
            });

            // Search input
            document.getElementById('searchInput').addEventListener('input', searchCCTV);

            // Close modals when clicking outside
            document.getElementById('cctvModal').addEventListener('click', function(e) {
                if (e.target === this) closeCctvModal();
            });

            document.getElementById('videoModal').addEventListener('click', function(e) {
                if (e.target === this) closeVideoModal();
            });

            document.getElementById('loginModal').addEventListener('click', function(e) {
                if (e.target === this) closeLoginModal();
            });

            document.getElementById('registerModal').addEventListener('click', function(e) {
                if (e.target === this) closeRegisterModal();
            });

    // Keyboard shortcuts
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            closeCctvModal();
            closeVideoModal();
            closeLoginModal();
            closeRegisterModal();
        }
    });
}
        // Filter functionality
        function toggleFilter() {
            const filterMenu = document.createElement('div');
            filterMenu.style.cssText = `
                position: absolute;
                top: 60px;
                right: 20px;
                background: white;
                padding: 20px;
                border-radius: 15px;
                box-shadow: 0 10px 30px rgba(0,0,0,0.2);
                z-index: 1500;
                min-width: 200px;
            `;
            
            filterMenu.innerHTML = `
                <h4 style="margin-bottom: 15px;">Filter CCTV</h4>
                <div style="margin-bottom: 10px;">
                    <label style="display: block; margin-bottom: 5px;">Status:</label>
                    <select id="statusFilter" style="width: 100%; padding: 5px; border-radius: 5px;">
                        <option value="all">Semua</option>
                        <option value="online">Online</option>
                        <option value="offline">Offline</option>
                    </select>
                </div>
                <div style="margin-bottom: 15px;">
                    <label style="display: block; margin-bottom: 5px;">Kecamatan:</label>
                    <select id="locationFilter" style="width: 100%; padding: 5px; border-radius: 5px;">
                        <option value="all">Semua</option>
                        <option value="BAITURRAHMAN">Baiturrahman</option>
                        <option value="KUTA ALAM">Kuta Alam</option>
                    </select>
                </div>
                <div style="display: flex; gap: 10px;">
                    <button onclick="applyFilters()" style="flex: 1; padding: 8px; background: #667eea; color: white; border: none; border-radius: 5px; cursor: pointer;">Terapkan</button>
                    <button onclick="clearFilters()" style="flex: 1; padding: 8px; background: #6c757d; color: white; border: none; border-radius: 5px; cursor: pointer;">Reset</button>
                </div>
            `;

            // Remove existing filter menu
            const existing = document.querySelector('.filter-menu');
            if (existing) {
                existing.remove();
                return;
            }

            filterMenu.className = 'filter-menu';
            document.querySelector('.search-container').appendChild(filterMenu);

            // Close when clicking outside
            setTimeout(() => {
                document.addEventListener('click', function closeFilter(e) {
                    if (!filterMenu.contains(e.target) && !e.target.classList.contains('filter-btn')) {
                        filterMenu.remove();
                        document.removeEventListener('click', closeFilter);
                    }
                });
            }, 100);
        }

        // Filter functions
        function applyFilters() {
            const statusFilter = document.getElementById('statusFilter').value;
            const locationFilter = document.getElementById('locationFilter').value;
            const searchQuery = document.getElementById('searchInput').value.toLowerCase();

            let filteredData = cctvData.filter(cctv => {
                const matchSearch = !searchQuery || 
                    cctv.name.toLowerCase().includes(searchQuery) ||
                    cctv.location.toLowerCase().includes(searchQuery);
                
                const matchStatus = statusFilter === 'all' || cctv.status === statusFilter;
                const matchLocation = locationFilter === 'all' || 
                    cctv.location.toUpperCase().includes(locationFilter);

                return matchSearch && matchStatus && matchLocation;
            });

            renderFilteredList(filteredData);
            updateMapMarkers(filteredData);
            
            document.querySelector('.filter-menu').remove();
        }

        function clearFilters() {
            document.getElementById('searchInput').value = '';
            renderCctvList();
            addMarkersToMap();
            document.querySelector('.filter-menu').remove();
        }

        function renderFilteredList(data) {
            const listContainer = document.getElementById('cctvList');
            
            listContainer.innerHTML = data.map(cctv => `
                <div class="cctv-item" onclick="selectCctv('${cctv.id}')" id="cctv-item-${cctv.id}">
                    <div class="cctv-name">${cctv.name}</div>
                    <div class="cctv-location">${cctv.location}</div>
                    <span class="cctv-status status-${cctv.status}">
                        ${cctv.status}
                        ${cctv.status === 'online' && cctv.streamUrl ? '<span class="stream-indicator stream-live"></span>' : ''}
                    </span>
                    ${currentUser && currentUser.role === 'admin' ? `
                        <div class="admin-controls" style="display: block;">
                            <button class="edit-btn" onclick="event.stopPropagation(); editCctv('${cctv.id}')">Edit</button>
                            <button class="delete-btn" onclick="event.stopPropagation(); deleteCctv('${cctv.id}')">Hapus</button>
                        </div>
                    ` : ''}
                </div>
            `).join('');

            // Show count
            const countInfo = document.createElement('div');
            countInfo.style.cssText = 'padding: 10px; font-size: 0.85rem; color: #666; text-align: center;';
            countInfo.textContent = `Menampilkan ${data.length} dari ${cctvData.length} CCTV`;
            listContainer.insertBefore(countInfo, listContainer.firstChild);
        }

        function updateMapMarkers(filteredData) {
            // Hide all markers first
            markers.forEach(marker => map.removeLayer(marker));
            
            // Show only filtered markers
            const filteredMarkers = [];
            filteredData.forEach(cctv => {
                const iconColor = cctv.status === 'online' ? 'green' : 'red';
                
                const customIcon = L.divIcon({
                    className: 'custom-marker',
                    html: `<div style="background: ${iconColor}; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 10px rgba(0,0,0,0.3);"></div>`,
                    iconSize: [20, 20],
                    iconAnchor: [10, 10]
                });

                const marker = L.marker([cctv.lat, cctv.lng], { icon: customIcon }).addTo(map);

                const popupContent = `
                    <div class="custom-popup">
                        <h3>${cctv.name}</h3>
                        <p><strong>Lokasi:</strong> ${cctv.location}</p>
                        <p><strong>Status:</strong> <span style="color: ${iconColor}; font-weight: bold;">${cctv.status.toUpperCase()}</span></p>
                        ${cctv.status === 'online' && cctv.streamUrl ? 
                            `<button class="watch-btn" onclick="playVideo('${cctv.id}')">🔴 Tonton Live</button>` : 
                            '<p style="color: red;">Stream tidak tersedia</p>'
                        }
                    </div>
                `;

                marker.bindPopup(popupContent);
                marker.on('click', () => selectCctv(cctv.id));
                
                filteredMarkers.push(marker);
            });

            markers = filteredMarkers;
        }

        // Notification system
        function showNotification(message, type = 'info') {
            // Create notification element
            const notification = document.createElement('div');
            notification.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                background: ${type === 'success' ? '#28a745' : type === 'error' ? '#dc3545' : '#17a2b8'};
                color: white;
                padding: 15px 20px;
                border-radius: 10px;
                box-shadow: 0 4px 15px rgba(0,0,0,0.2);
                z-index: 3000;
                font-weight: bold;
                animation: slideInRight 0.3s ease;
                max-width: 300px;
            `;
            notification.textContent = message;

            // Add animation keyframes
            if (!document.querySelector('#notification-styles')) {
                const style = document.createElement('style');
                style.id = 'notification-styles';
                style.textContent = `
                    @keyframes slideInRight {
                        from { transform: translateX(100%); opacity: 0; }
                        to { transform: translateX(0); opacity: 1; }
                    }
                    @keyframes slideOutRight {
                        from { transform: translateX(0); opacity: 1; }
                        to { transform: translateX(100%); opacity: 0; }
                    }
                `;
                document.head.appendChild(style);
            }

            document.body.appendChild(notification);

            // Auto remove after 4 seconds
            setTimeout(() => {
                notification.style.animation = 'slideOutRight 0.3s ease';
                setTimeout(() => {
                    if (document.body.contains(notification)) {
                        document.body.removeChild(notification);
                    }
                }, 300);
            }, 4000);
        }

        // Map controls enhancement
        function addMapControls() {
            // Add custom zoom control
            const zoomToAllButton = L.control({position: 'topleft'});
            zoomToAllButton.onAdd = function(map) {
                const div = L.DomUtil.create('div', 'leaflet-bar leaflet-control leaflet-control-custom');
                div.innerHTML = '🏠';
                div.style.backgroundColor = 'white';
                div.style.width = '30px';
                div.style.height = '30px';
                div.style.lineHeight = '30px';
                div.style.textAlign = 'center';
                div.style.cursor = 'pointer';
                div.title = 'Zoom ke semua CCTV';
                
                div.onclick = function() {
                    if (cctvData.length > 0) {
                        const group = new L.featureGroup(markers);
                        map.fitBounds(group.getBounds().pad(0.1));
                    }
                };
                
                return div;
            };
            zoomToAllButton.addTo(map);
        }

        // Initialize map controls after map is ready
        setTimeout(addMapControls, 1000);

        // Stream status checker
        async function checkStreamStatus() {
            if (!authToken || !currentUser || currentUser.role !== 'admin') return;

            cctvData.forEach(async (cctv, index) => {
                if (cctv.streamUrl) {
                    try {
                        const response = await fetch(cctv.streamUrl, { method: 'HEAD' });
                        const newStatus = response.ok ? 'online' : 'offline';
                        
                        if (cctvData[index].status !== newStatus) {
                            cctvData[index].status = newStatus;
                            
                            // Update in database
                            await apiRequest(`/cameras/${cctv.id}`, {
                                method: 'PUT',
                                body: JSON.stringify({
                                    ...cctv,
                                    latitude: cctv.lat,
                                    longitude: cctv.lng,
                                    status: newStatus
                                }),
                            });
                        }
                    } catch (error) {
                        console.log(`Stream check failed for ${cctv.name}:`, error);
                        // Keep current status on error
                    }
                }
            });
            
            renderCctvList();
            addMarkersToMap();
        }

        // Check stream status every 5 minutes (only for admin)
        setInterval(checkStreamStatus, 300000);

        // Welcome message
        setTimeout(() => {
            if (!authToken) {
                showNotification('🏙️ Selamat datang di Sistem CCTV Monitoring Banda Aceh! Silakan login untuk mengakses.', 'info');
            } else {
                showNotification('🏙️ Selamat datang kembali di Sistem CCTV Monitoring Banda Aceh!', 'info');
            }
        }, 1000);

        // Performance monitoring
        function logPerformance() {
            console.log('🎯 CCTV Monitoring System loaded successfully');
            console.log(`📊 Total CCTV: ${cctvData.length}`);
            console.log(`✅ Online CCTV: ${cctvData.filter(c => c.status === 'online').length}`);
            console.log(`❌ Offline CCTV: ${cctvData.filter(c => c.status === 'offline').length}`);
            console.log('🔗 Database integration active');
        }

        setTimeout(logPerformance, 2000);
// Get active channel IDs
function getActiveChannelIds() {
    if (customChannels.length > 0) {
        return customChannels;
    }
    return DEFAULT_CHANNEL_IDS;
}

// Default Channel IDs
const DEFAULT_CHANNEL_IDS = [
    'UCN6hQCg6tIs5x6CoYLwXlhQ',
    'UCMmiGP6imlrwLP3oy34wbxA',
    'UCdur25RCItdfoXA89ORWSkw',
    'UCGLqLYzjWYuPTUhC9QireWg',
    'UClvucpj2qZ3OUM2not9YVpA',
    'UCwbUIqOxivtwVkSA8Cm87aA',
    'UCYTe2pbx_83PMClEm7JZQCA',
    'UChGiPYEm5gLRwFmKPVrk-_Q',
    'UCOKKttQBUqmenmwur2a57Jg',
    'UCSvnSxC5f1W8ogXMC38IbzA'
];

// Global variables
let apiKey = '';
let allVideos = [];
let channelNames = {};
let favorites = JSON.parse(localStorage.getItem('favorites')) || [];
let watchLater = JSON.parse(localStorage.getItem('watchLater')) || [];
let customChannels = JSON.parse(localStorage.getItem('customChannels')) || [];
let lastVideoCount = parseInt(localStorage.getItem('lastVideoCount')) || 0;

// Initialize the app
document.addEventListener('DOMContentLoaded', function() {
    // Check if API key is saved
    const savedApiKey = localStorage.getItem('youtubeApiKey');
    if (savedApiKey) {
        apiKey = savedApiKey;
        showMainContent();
        loadAllVideos();
    }
    
    // Load dark mode preference
    const darkMode = localStorage.getItem('darkMode') === 'true';
    if (darkMode) {
        document.body.classList.add('dark-mode');
        updateDarkModeButton();
    }
});

// Save API Key
function saveApiKey() {
    const input = document.getElementById('apiKeyInput');
    const key = input.value.trim();
    
    if (!key) {
        alert('الرجاء إدخال مفتاح API');
        return;
    }
    
    apiKey = key;
    localStorage.setItem('youtubeApiKey', key);
    showMainContent();
    loadAllVideos();
}

// Reset API Key
function resetApiKey() {
    if (confirm('هل أنت متأكد من تغيير مفتاح API؟')) {
        localStorage.removeItem('youtubeApiKey');
        apiKey = '';
        allVideos = [];
        channelNames = {};
        document.getElementById('apiSetup').style.display = 'block';
        document.getElementById('mainContent').style.display = 'none';
        document.getElementById('apiKeyInput').value = '';
    }
}

// Show main content
function showMainContent() {
    document.getElementById('apiSetup').style.display = 'none';
    document.getElementById('mainContent').style.display = 'block';
}

// Load all videos from all channels
async function loadAllVideos() {
    showLoading(true);
    hideError();
    allVideos = [];
    channelNames = {};
    
    try {
        // Load videos from each channel
        const channelIds = getActiveChannelIds();
        const promises = channelIds.map(channelId => loadChannelVideos(channelId));
        await Promise.all(promises);
        
        // Sort videos by publish date (newest first)
        allVideos.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
        
        // Populate channel filter
        populateChannelFilter();
        
        // Display videos
        displayVideos(allVideos);
        
        // Update stats
        updateStats(allVideos.length);
        
        // Check for new videos
        checkForNewVideos();
        
        showLoading(false);
    } catch (error) {
        console.error('Error loading videos:', error);
        showError('حدث خطأ أثناء تحميل الفيديوهات. تأكد من صحة مفتاح API.');
        showLoading(false);
    }
}

// Load videos from a specific channel
async function loadChannelVideos(channelId) {
    try {
        // First, get channel details
        const channelUrl = `https://www.googleapis.com/youtube/v3/channels?part=snippet&id=${channelId}&key=${apiKey}`;
        const channelResponse = await fetch(channelUrl);
        const channelData = await channelResponse.json();
        
        if (channelData.error) {
            throw new Error(channelData.error.message);
        }
        
        if (channelData.items && channelData.items.length > 0) {
            const channelTitle = channelData.items[0].snippet.title;
            channelNames[channelId] = channelTitle;
        }
        
        // Then, get channel videos (increased to 50)
        const searchUrl = `https://www.googleapis.com/youtube/v3/search?key=${apiKey}&channelId=${channelId}&part=snippet,id&order=date&maxResults=50&type=video`;
        const searchResponse = await fetch(searchUrl);
        const searchData = await searchResponse.json();
        
        if (searchData.error) {
            throw new Error(searchData.error.message);
        }
        
        if (searchData.items) {
            // Get video details including duration
            const videoIds = searchData.items.map(item => item.id.videoId).join(',');
            const detailsUrl = `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails,statistics&id=${videoIds}&key=${apiKey}`;
            const detailsResponse = await fetch(detailsUrl);
            const detailsData = await detailsResponse.json();
            
            if (detailsData.items) {
                detailsData.items.forEach(video => {
                    allVideos.push({
                        id: video.id,
                        title: video.snippet.title,
                        description: video.snippet.description,
                        thumbnail: video.snippet.thumbnails.high.url,
                        channelId: video.snippet.channelId,
                        channelTitle: video.snippet.channelTitle,
                        publishedAt: video.snippet.publishedAt,
                        duration: formatDuration(video.contentDetails.duration),
                        viewCount: formatNumber(video.statistics.viewCount),
                        likeCount: formatNumber(video.statistics.likeCount)
                    });
                });
            }
        }
    } catch (error) {
        console.error(`Error loading videos for channel ${channelId}:`, error);
    }
}

// Format ISO 8601 duration to readable format
function formatDuration(duration) {
    const match = duration.match(/PT(\d+H)?(\d+M)?(\d+S)?/);
    const hours = (match[1] || '').replace('H', '');
    const minutes = (match[2] || '').replace('M', '');
    const seconds = (match[3] || '').replace('S', '');
    
    let formatted = '';
    if (hours) formatted += hours + ':';
    formatted += (minutes || '0').padStart(2, '0') + ':';
    formatted += (seconds || '0').padStart(2, '0');
    
    return formatted;
}

// Format numbers (views, likes)
function formatNumber(num) {
    if (!num) return '0';
    const number = parseInt(num);
    if (number >= 1000000) {
        return (number / 1000000).toFixed(1) + 'M';
    } else if (number >= 1000) {
        return (number / 1000).toFixed(1) + 'K';
    }
    return number.toString();
}

// Format date to relative time
function formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'اليوم';
    if (diffDays === 1) return 'أمس';
    if (diffDays < 7) return `منذ ${diffDays} أيام`;
    if (diffDays < 30) return `منذ ${Math.floor(diffDays / 7)} أسابيع`;
    if (diffDays < 365) return `منذ ${Math.floor(diffDays / 30)} أشهر`;
    return `منذ ${Math.floor(diffDays / 365)} سنة`;
}

// Populate channel filter dropdown
function populateChannelFilter() {
    const select = document.getElementById('channelFilter');
    select.innerHTML = '<option value="all">جميع القنوات</option>';
    
    const uniqueChannels = {};
    allVideos.forEach(video => {
        if (!uniqueChannels[video.channelId]) {
            uniqueChannels[video.channelId] = video.channelTitle;
        }
    });
    
    Object.entries(uniqueChannels).forEach(([id, title]) => {
        const option = document.createElement('option');
        option.value = id;
        option.textContent = title;
        select.appendChild(option);
    });
}



// Create video card element
function createVideoCard(video) {
    const card = document.createElement('div');
    card.className = 'video-card';
    
    card.innerHTML = `
        <div class="video-thumbnail" onclick="openVideoOptions('${video.id}')">
            <img src="${video.thumbnail}" alt="${video.title}">
            <div class="play-overlay">
                <i class="fas fa-play"></i>
            </div>
            <div class="video-duration">${video.duration}</div>
        </div>
        <div class="video-details">
            <h3 class="video-title">${video.title}</h3>
            <div class="channel-name">
                <i class="fas fa-user-circle"></i>
                <span>${video.channelTitle}</span>
            </div>
            <div class="video-meta">
                <span><i class="fas fa-eye"></i> ${video.viewCount}</span>
                <span><i class="fas fa-thumbs-up"></i> ${video.likeCount}</span>
                <span><i class="fas fa-clock"></i> ${formatDate(video.publishedAt)}</span>
            </div>
            <div class="video-actions">
                <button onclick="event.stopPropagation(); toggleFavorite('${video.id}')" class="action-btn fav-btn ${favorites.includes(video.id) ? 'active' : ''}" id="fav-${video.id}">
                    <i class="fas fa-heart"></i>
                </button>
                <button onclick="event.stopPropagation(); toggleWatchLater('${video.id}')" class="action-btn watch-btn ${watchLater.includes(video.id) ? 'active' : ''}" id="watch-${video.id}">
                    <i class="fas fa-clock"></i>
                </button>
                <button onclick="event.stopPropagation(); shareVideo('${video.id}')" class="action-btn share-btn">
                    <i class="fas fa-share-alt"></i>
                </button>
                <button onclick="event.stopPropagation(); openVideoOnYouTube('${video.id}')" class="action-btn youtube-btn">
                    <i class="fab fa-youtube"></i>
                </button>
            </div>
        </div>
    `;
    
    return card;
}

// Open video options modal
function openVideoOptions(videoId) {
    const video = allVideos.find(v => v.id === videoId);
    if (!video) return;
    
    const modal = document.getElementById('videoModal');
    const container = document.getElementById('videoContainer');
    const info = document.getElementById('videoInfo');
    
    // Show options
    container.innerHTML = `
        <div class="video-options">
            <h2><i class="fas fa-video"></i> كيف تريد مشاهدة الفيديو؟</h2>
            <div class="options-grid">
                <button onclick="openVideoOnYouTube('${video.id}')" class="option-card youtube-option">
                    <i class="fab fa-youtube"></i>
                    <h3>شاهد على YouTube</h3>
                    <p>يفتح في نافذة جديدة<br>(موصى به - يعمل دائمًا)</p>
                </button>
                <button onclick="openVideoEmbed('${video.id}')" class="option-card embed-option">
                    <i class="fas fa-play-circle"></i>
                    <h3>شغّل هنا</h3>
                    <p>التشغيل داخل الموقع<br>(قد لا يعمل مع بعض الفيديوهات)</p>
                </button>
            </div>
            <div class="option-note">
                <i class="fas fa-info-circle"></i>
                <p>بعض القنوات تمنع التشغيل المدمج. إذا واجهت خطأ 153، اختر "شاهد على YouTube"</p>
            </div>
        </div>
    `;
    
    // Display video info
    info.innerHTML = `
        <h2>${video.title}</h2>
        <div class="channel-name" style="margin-bottom: 15px; font-size: 1.1rem;">
            <i class="fas fa-user-circle"></i>
            <span>${video.channelTitle}</span>
        </div>
        <div class="video-meta" style="margin-bottom: 15px; font-size: 1rem;">
            <span><i class="fas fa-eye"></i> ${video.viewCount} مشاهدة</span>
            <span><i class="fas fa-thumbs-up"></i> ${video.likeCount}</span>
            <span><i class="fas fa-clock"></i> ${formatDate(video.publishedAt)}</span>
        </div>
        <p style="white-space: pre-wrap;">${video.description || 'لا يوجد وصف'}</p>
    `;
    
    modal.style.display = 'block';
    document.body.style.overflow = 'hidden';
}

// Open video on YouTube directly
function openVideoOnYouTube(videoId) {
    window.open(`https://www.youtube.com/watch?v=${videoId}`, '_blank');
    closeVideo();
}

// Open video in embedded player
function openVideoEmbed(videoId) {
    const video = allVideos.find(v => v.id === videoId);
    if (!video) return;
    
    const modal = document.getElementById('videoModal');
    const container = document.getElementById('videoContainer');
    const info = document.getElementById('videoInfo');
    
    // Create YouTube iframe
    container.innerHTML = `
        <iframe 
            id="youtubePlayer"
            src="https://www.youtube-nocookie.com/embed/${video.id}?autoplay=1&rel=0" 
            frameborder="0" 
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
            allowfullscreen>
        </iframe>
        <div class="embed-fallback">
            <p><i class="fas fa-info-circle"></i> إذا واجهت مشكلة في التشغيل (خطأ 153):</p>
            <button onclick="openVideoOnYouTube('${video.id}')" class="btn-primary">
                <i class="fab fa-youtube"></i> افتح على YouTube
            </button>
        </div>
    `;
    
    // Update video info
    info.innerHTML = `
        <h2>${video.title}</h2>
        <div class="channel-name" style="margin-bottom: 15px; font-size: 1.1rem;">
            <i class="fas fa-user-circle"></i>
            <span>${video.channelTitle}</span>
        </div>
        <div class="video-meta" style="margin-bottom: 15px; font-size: 1rem;">
            <span><i class="fas fa-eye"></i> ${video.viewCount} مشاهدة</span>
            <span><i class="fas fa-thumbs-up"></i> ${video.likeCount}</span>
            <span><i class="fas fa-clock"></i> ${formatDate(video.publishedAt)}</span>
        </div>
        <p style="white-space: pre-wrap;">${video.description || 'لا يوجد وصف'}</p>
    `;
}

// Close video modal
function closeVideo() {
    const modal = document.getElementById('videoModal');
    const container = document.getElementById('videoContainer');
    
    container.innerHTML = '';
    modal.style.display = 'none';
    document.body.style.overflow = 'auto';
}



// Close modal with Escape key
document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') {
        closeVideo();
        closeChannelManager();
    }
});

// Infinite Scroll
let currentDisplayCount = 20;
let filteredVideosCache = [];

function displayVideos(videos) {
    filteredVideosCache = videos;
    currentDisplayCount = 20;
    renderVideos();
    
    // Setup infinite scroll
    setupInfiniteScroll();
}

function renderVideos() {
    const grid = document.getElementById('videosGrid');
    const videosToShow = filteredVideosCache.slice(0, currentDisplayCount);
    
    if (videosToShow.length === 0) {
        grid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: var(--text-light); padding: 40px;">لا توجد فيديوهات لعرضها</p>';
        return;
    }
    
    grid.innerHTML = '';
    videosToShow.forEach(video => {
        const card = createVideoCard(video);
        grid.appendChild(card);
    });
    
    // Add load more button if there are more videos
    if (currentDisplayCount < filteredVideosCache.length) {
        const loadMoreBtn = document.createElement('div');
        loadMoreBtn.className = 'load-more-container';
        loadMoreBtn.style.gridColumn = '1 / -1';
        loadMoreBtn.innerHTML = `
            <button onclick="loadMoreVideos()" class="btn-primary load-more-btn">
                <i class="fas fa-chevron-down"></i> تحميل المزيد (${filteredVideosCache.length - currentDisplayCount} متبقي)
            </button>
        `;
        grid.appendChild(loadMoreBtn);
    }
}

function loadMoreVideos() {
    currentDisplayCount += 20;
    renderVideos();
}

function setupInfiniteScroll() {
    // Remove old listener if exists
    window.removeEventListener('scroll', handleScroll);
    // Add new listener
    window.addEventListener('scroll', handleScroll);
}

function handleScroll() {
    if (currentDisplayCount >= filteredVideosCache.length) return;
    
    const scrollPosition = window.innerHeight + window.scrollY;
    const pageHeight = document.documentElement.scrollHeight;
    
    // Load more when user is 80% down the page
    if (scrollPosition >= pageHeight * 0.8) {
        currentDisplayCount += 20;
        renderVideos();
    }
}

// Filter videos by channel
function filterByChannel() {
    const view = document.getElementById('viewFilter').value;
    const filtered = getFilteredVideos(view);
    applyAllFilters(filtered);
}

// Search videos
function searchVideos() {
    const view = document.getElementById('viewFilter').value;
    const filtered = getFilteredVideos(view);
    applyAllFilters(filtered);
}

// Update statistics
function updateStats(count) {
    document.getElementById('videoCount').textContent = count;
    updateStatsDisplay();
}

// Show loading indicator
function showLoading(show) {
    const loading = document.getElementById('loading');
    loading.style.display = show ? 'block' : 'none';
}

// Show error message
function showError(message) {
    const errorDiv = document.getElementById('errorMessage');
    const errorText = document.getElementById('errorText');
    errorText.textContent = message;
    errorDiv.style.display = 'block';
}

// Hide error message
function hideError() {
    const errorDiv = document.getElementById('errorMessage');
    errorDiv.style.display = 'none';
}

// Toggle Dark Mode
function toggleDarkMode() {
    document.body.classList.toggle('dark-mode');
    const isDark = document.body.classList.contains('dark-mode');
    localStorage.setItem('darkMode', isDark);
    updateDarkModeButton();
}

function updateDarkModeButton() {
    const btn = document.getElementById('darkModeToggle');
    if (!btn) return;
    
    const isDark = document.body.classList.contains('dark-mode');
    if (isDark) {
        btn.innerHTML = '<i class="fas fa-sun"></i> الوضع النهاري';
    } else {
        btn.innerHTML = '<i class="fas fa-moon"></i> الوضع الليلي';
    }
}

// Toggle Favorite
function toggleFavorite(videoId) {
    const index = favorites.indexOf(videoId);
    if (index > -1) {
        favorites.splice(index, 1);
    } else {
        favorites.push(videoId);
    }
    localStorage.setItem('favorites', JSON.stringify(favorites));
    
    // Update button
    const btn = document.getElementById(`fav-${videoId}`);
    if (btn) {
        btn.classList.toggle('active');
    }
    
    updateStatsDisplay();
}

// Toggle Watch Later
function toggleWatchLater(videoId) {
    const index = watchLater.indexOf(videoId);
    if (index > -1) {
        watchLater.splice(index, 1);
    } else {
        watchLater.push(videoId);
    }
    localStorage.setItem('watchLater', JSON.stringify(watchLater));
    
    // Update button
    const btn = document.getElementById(`watch-${videoId}`);
    if (btn) {
        btn.classList.toggle('active');
    }
    
    updateStatsDisplay();
}

// Share Video
function shareVideo(videoId) {
    const video = allVideos.find(v => v.id === videoId);
    if (!video) return;
    
    const url = `https://www.youtube.com/watch?v=${videoId}`;
    const text = `شاهد: ${video.title}`;
    
    // Check if Web Share API is available
    if (navigator.share) {
        navigator.share({
            title: video.title,
            text: text,
            url: url
        }).catch(() => {
            copyToClipboard(url);
        });
    } else {
        copyToClipboard(url);
    }
}

function copyToClipboard(text) {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
    
    alert('تم نسخ الرابط!');
}

// Refresh Videos
function refreshVideos() {
    const btn = event.target.closest('button');
    const icon = btn.querySelector('i');
    icon.classList.add('fa-spin');
    
    loadAllVideos().then(() => {
        icon.classList.remove('fa-spin');
    });
}

// Change View (All, Favorites, Watch Later)
function changeView() {
    const view = document.getElementById('viewFilter').value;
    let filtered = [];
    
    if (view === 'favorites') {
        filtered = allVideos.filter(v => favorites.includes(v.id));
    } else if (view === 'watchLater') {
        filtered = allVideos.filter(v => watchLater.includes(v.id));
    } else {
        filtered = allVideos;
    }
    
    applyAllFilters(filtered);
}

// Sort Videos
function sortVideos() {
    const sortBy = document.getElementById('sortFilter').value;
    const view = document.getElementById('viewFilter').value;
    
    let filtered = getFilteredVideos(view);
    
    if (sortBy === 'views') {
        filtered.sort((a, b) => parseFormattedNumber(b.viewCount) - parseFormattedNumber(a.viewCount));
    } else if (sortBy === 'likes') {
        filtered.sort((a, b) => parseFormattedNumber(b.likeCount) - parseFormattedNumber(a.likeCount));
    } else {
        filtered.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
    }
    
    applyAllFilters(filtered);
}

// Filter by Duration
function filterByDuration() {
    const view = document.getElementById('viewFilter').value;
    let filtered = getFilteredVideos(view);
    
    applyAllFilters(filtered);
}

function getFilteredVideos(view) {
    if (view === 'favorites') {
        return allVideos.filter(v => favorites.includes(v.id));
    } else if (view === 'watchLater') {
        return allVideos.filter(v => watchLater.includes(v.id));
    } else {
        return [...allVideos];
    }
}

function applyAllFilters(videos) {
    let filtered = [...videos];
    
    // Apply channel filter
    const channelId = document.getElementById('channelFilter').value;
    if (channelId !== 'all') {
        filtered = filtered.filter(v => v.channelId === channelId);
    }
    
    // Apply search filter
    const searchTerm = document.getElementById('searchInput').value.trim().toLowerCase();
    if (searchTerm) {
        filtered = filtered.filter(v => 
            v.title.toLowerCase().includes(searchTerm) ||
            v.channelTitle.toLowerCase().includes(searchTerm) ||
            v.description.toLowerCase().includes(searchTerm)
        );
    }
    
    // Apply duration filter
    const duration = document.getElementById('durationFilter').value;
    if (duration !== 'all') {
        filtered = filtered.filter(v => {
            const mins = parseDurationToMinutes(v.duration);
            if (duration === 'short') return mins < 4;
            if (duration === 'medium') return mins >= 4 && mins <= 20;
            if (duration === 'long') return mins > 20;
            return true;
        });
    }
    
    // Apply sort
    const sortBy = document.getElementById('sortFilter').value;
    if (sortBy === 'views') {
        filtered.sort((a, b) => parseFormattedNumber(b.viewCount) - parseFormattedNumber(a.viewCount));
    } else if (sortBy === 'likes') {
        filtered.sort((a, b) => parseFormattedNumber(b.likeCount) - parseFormattedNumber(a.likeCount));
    } else {
        filtered.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
    }
    
    displayVideos(filtered);
    updateStats(filtered.length);
}

function parseDurationToMinutes(duration) {
    const parts = duration.split(':');
    if (parts.length === 3) {
        return parseInt(parts[0]) * 60 + parseInt(parts[1]);
    } else if (parts.length === 2) {
        return parseInt(parts[0]);
    }
    return 0;
}

function parseFormattedNumber(str) {
    if (str.includes('M')) {
        return parseFloat(str) * 1000000;
    } else if (str.includes('K')) {
        return parseFloat(str) * 1000;
    }
    return parseInt(str) || 0;
}

function updateStatsDisplay() {
    document.getElementById('favCount').textContent = favorites.length;
    document.getElementById('watchLaterCount').textContent = watchLater.length;
    document.getElementById('channelCount').textContent = getActiveChannelIds().length;
}

// Channel Manager Functions
function openChannelManager() {
    const modal = document.getElementById('channelModal');
    modal.style.display = 'block';
    document.body.style.overflow = 'hidden';
    loadChannelsList();
}

function closeChannelManager() {
    const modal = document.getElementById('channelModal');
    modal.style.display = 'none';
    document.body.style.overflow = 'auto';
}

function loadChannelsList() {
    const channelIds = getActiveChannelIds();
    const container = document.getElementById('channelsList');
    document.getElementById('totalChannels').textContent = channelIds.length;
    
    container.innerHTML = '';
    
    channelIds.forEach(channelId => {
        const channelName = channelNames[channelId] || channelId;
        const isCustom = customChannels.includes(channelId);
        
        const item = document.createElement('div');
        item.className = 'channel-item';
        item.innerHTML = `
            <div class="channel-info">
                <i class="fab fa-youtube"></i>
                <div class="channel-details">
                    <h4>${channelName}</h4>
                    <p>${channelId}</p>
                </div>
            </div>
            ${isCustom ? `
            <div class="channel-actions">
                <button onclick="removeChannel('${channelId}')">
                    <i class="fas fa-trash"></i> حذف
                </button>
            </div>
            ` : '<span style="color: var(--text-light); font-size: 0.85rem;">قناة افتراضية</span>'}
        `;
        container.appendChild(item);
    });
}

function addChannel() {
    const input = document.getElementById('newChannelId');
    const channelId = input.value.trim();
    
    if (!channelId) {
        alert('الرجاء إدخال Channel ID');
        return;
    }
    
    if (customChannels.includes(channelId)) {
        alert('القناة موجودة بالفعل!');
        return;
    }
    
    // Add to custom channels
    customChannels.push(channelId);
    localStorage.setItem('customChannels', JSON.stringify(customChannels));
    
    input.value = '';
    loadChannelsList();
    
    // Reload videos
    alert('تم إضافة القناة! سيتم تحديث الفيديوهات...');
    closeChannelManager();
    loadAllVideos();
}

function removeChannel(channelId) {
    if (!confirm('هل أنت متأكد من حذف هذه القناة؟')) return;
    
    const index = customChannels.indexOf(channelId);
    if (index > -1) {
        customChannels.splice(index, 1);
        localStorage.setItem('customChannels', JSON.stringify(customChannels));
        loadChannelsList();
        
        // Reload videos
        alert('تم حذف القناة! سيتم تحديث الفيديوهات...');
        closeChannelManager();
        loadAllVideos();
    }
}

// Check for new videos
function checkForNewVideos() {
    const currentCount = allVideos.length;
    
    if (lastVideoCount > 0 && currentCount > lastVideoCount) {
        const newCount = currentCount - lastVideoCount;
        showNewVideosAlert(newCount);
    }
    
    lastVideoCount = currentCount;
    localStorage.setItem('lastVideoCount', currentCount);
}

function showNewVideosAlert(count) {
    const alert = document.getElementById('newVideosAlert');
    const text = document.getElementById('newVideosText');
    
    text.textContent = `يوجد ${count} فيديو جديد!`;
    alert.style.display = 'block';
    
    // Auto hide after 5 seconds
    setTimeout(() => {
        dismissNewVideos();
    }, 5000);
}

function dismissNewVideos() {
    const alert = document.getElementById('newVideosAlert');
    alert.style.display = 'none';
}

// Close modals when clicking outside
window.onclick = function(event) {
    const videoModal = document.getElementById('videoModal');
    const channelModal = document.getElementById('channelModal');
    
    if (event.target === videoModal) {
        closeVideo();
    }
    if (event.target === channelModal) {
        closeChannelManager();
    }
}

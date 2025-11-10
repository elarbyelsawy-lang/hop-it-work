// YouTube Channel IDs - Default Channels
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

// Global variables - تعريف واحد فقط لكل متغير
let apiKey = '';
let allVideos = [];
let displayedVideos = [];
let channelNames = {};
let CHANNEL_IDS = [...DEFAULT_CHANNEL_IDS];
let favorites = [];
let watchLater = [];
let myLibrary = []; // NEW: Personal library
let lastVideosHash = '';
let videosPerPage = 24;
let currentPage = 1;
let currentQuickWatchVideo = null; // NEW: Currently previewed video
let apiKeyProvided = false; // NEW: Track if API key is provided

// ✅ تم إزالة التعريفات المكررة

// Initialize the app
document.addEventListener('DOMContentLoaded', function() {
    // Load saved data from localStorage
    loadSavedData();
    
    // Load My Library
    loadMyLibrary();
    
    // Check if API key is saved
    const savedApiKey = localStorage.getItem('youtubeApiKey');
    if (savedApiKey) {
        apiKey = savedApiKey;
        apiKeyProvided = true;
        showMainContent();
        loadAllVideos(false);
    } else {
        // Show API setup or allow skip
        document.getElementById('apiSetup').style.display = 'block';
    }

    // Setup infinite scroll
    setupInfiniteScroll();
    
    // Check for new videos every 5 minutes (if API key exists)
    setInterval(() => {
        if (apiKeyProvided) {
            checkForNewVideos();
        }
    }, 5 * 60 * 1000);
});

// Load saved data from localStorage
function loadSavedData() {
    // Load theme
    const theme = localStorage.getItem('theme') || 'light';
    if (theme === 'dark') {
        document.body.classList.add('dark-mode');
        document.getElementById('themeIcon').className = 'fas fa-sun';
    }
    
    // Load custom channels
    const savedChannels = localStorage.getItem('customChannels');
    if (savedChannels) {
        CHANNEL_IDS = JSON.parse(savedChannels);
    }
    
    // Load favorites
    const savedFavorites = localStorage.getItem('favorites');
    if (savedFavorites) {
        favorites = JSON.parse(savedFavorites);
    }
    
    // Load watch later
    const savedWatchLater = localStorage.getItem('watchLater');
    if (savedWatchLater) {
        watchLater = JSON.parse(savedWatchLater);
    }
    
    // Load cached videos
    const cachedVideos = localStorage.getItem('cachedVideos');
    const cacheTime = localStorage.getItem('cacheTime');
    if (cachedVideos && cacheTime) {
        const timeDiff = Date.now() - parseInt(cacheTime);
        // Use cache if less than 30 minutes old
        if (timeDiff < 30 * 60 * 1000) {
            allVideos = JSON.parse(cachedVideos);
        }
    }
    
    updateBadges();
}

// Save data to localStorage
function saveToLocalStorage(key, data) {
    try {
        localStorage.setItem(key, JSON.stringify(data));
    } catch (e) {
        console.error('Error saving to localStorage:', e);
    }
}

// Toggle Theme
function toggleTheme() {
    const body = document.body;
    const icon = document.getElementById('themeIcon');
    
    if (body.classList.contains('dark-mode')) {
        body.classList.remove('dark-mode');
        icon.className = 'fas fa-moon';
        localStorage.setItem('theme', 'light');
    } else {
        body.classList.add('dark-mode');
        icon.className = 'fas fa-sun';
        localStorage.setItem('theme', 'dark');
    }
}

// Save API Key
function saveApiKey() {
    const input = document.getElementById('apiKeyInput');
    const key = input.value.trim();
    
    if (!key) {
        alert('الرجاء إدخال مفتاح API');
        return;
    }
    
    apiKey = key;
    apiKeyProvided = true;
    localStorage.setItem('youtubeApiKey', key);
    showMainContent();
    loadAllVideos(false);
}

// Skip API Setup (Use SmartPlay only)
function skipApiSetup() {
    apiKeyProvided = false;
    showMainContent();
    showSuccessMessage('يمكنك الآن استخدام SmartPlay بدون API Key!');
    
    // Hide channel-related controls
    const channelControls = document.getElementById('channelControls');
    const channelVideosSection = document.getElementById('channelVideosSection');
    if (channelControls) channelControls.style.display = 'none';
    if (channelVideosSection) channelVideosSection.style.display = 'none';
}

// Reset API Key
function resetApiKey() {
    if (confirm('هل أنت متأكد من تغيير مفتاح API؟')) {
        localStorage.removeItem('youtubeApiKey');
        apiKey = '';
        apiKeyProvided = false;
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
    
    // If no API key, hide channel sections
    if (!apiKeyProvided) {
        const channelControls = document.getElementById('channelControls');
        const channelVideosSection = document.getElementById('channelVideosSection');
        const changeApiBtn = document.getElementById('changeApiBtn');
        if (channelControls) channelControls.style.display = 'none';
        if (channelVideosSection) channelVideosSection.style.display = 'none';
        if (changeApiBtn) changeApiBtn.textContent = 'إضافة API Key';
    }
}

// Toggle Channel Section
function toggleChannelSection() {
    const content = document.getElementById('controlsContent');
    const icon = document.getElementById('toggleIcon');
    const section = document.getElementById('channelVideosSection');
    
    if (content.style.display === 'none') {
        content.style.display = 'flex';
        section.style.display = 'block';
        icon.className = 'fas fa-chevron-down';
    } else {
        content.style.display = 'none';
        section.style.display = 'none';
        icon.className = 'fas fa-chevron-up';
    }
}

// Load all videos from all channels
async function loadAllVideos(showNotification = false) {
    if (!apiKeyProvided) {
        showError('يجب إدخال API Key أولاً لعرض فيديوهات القنوات');
        return;
    }
    
    showLoading(true);
    hideError();
    allVideos = [];
    channelNames = {};
    
    try {
        // Load videos from each channel
        const promises = CHANNEL_IDS.map(channelId => loadChannelVideos(channelId));
        await Promise.all(promises);
        
        // Sort videos by publish date (newest first)
        allVideos.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
        
        // Cache videos
        saveToLocalStorage('cachedVideos', allVideos);
        localStorage.setItem('cacheTime', Date.now().toString());
        
        // Populate channel filter
        populateChannelFilter();
        
        // Display videos
        currentPage = 1;
        applyFilters();
        
        // Update channel statistics
        updateChannelStats();
        
        showLoading(false);
        
        if (showNotification) {
            showSuccessMessage('تم تحديث الفيديوهات بنجاح!');
        }
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
        
        // Then, get channel videos
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
                        duration: video.contentDetails.duration,
                        durationSeconds: parseDuration(video.contentDetails.duration),
                        durationFormatted: formatDuration(video.contentDetails.duration),
                        viewCount: parseInt(video.statistics.viewCount || 0),
                        likeCount: parseInt(video.statistics.likeCount || 0),
                        viewCountFormatted: formatNumber(video.statistics.viewCount),
                        likeCountFormatted: formatNumber(video.statistics.likeCount)
                    });
                });
            }
        }
    } catch (error) {
        console.error(`Error loading videos for channel ${channelId}:`, error);
    }
}

// Parse ISO 8601 duration to seconds
function parseDuration(duration) {
    const match = duration.match(/PT(\d+H)?(\d+M)?(\d+S)?/);
    const hours = parseInt((match[1] || '0').replace('H', '')) || 0;
    const minutes = parseInt((match[2] || '0').replace('M', '')) || 0;
    const seconds = parseInt((match[3] || '0').replace('S', '')) || 0;
    return hours * 3600 + minutes * 60 + seconds;
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
    if (!select) return;
    
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

// Apply all filters and sorting
function applyFilters() {
    const searchInput = document.getElementById('searchInput');
    const channelFilter = document.getElementById('channelFilter');
    const sortFilter = document.getElementById('sortFilter');
    const durationFilter = document.getElementById('durationFilter');
    
    if (!searchInput || !channelFilter || !sortFilter || !durationFilter) return;
    
    const searchTerm = searchInput.value.trim().toLowerCase();
    const channelId = channelFilter.value;
    const sortBy = sortFilter.value;
    const durationFilterValue = durationFilter.value;
    
    let filtered = [...allVideos];
    
    // Apply channel filter
    if (channelId !== 'all') {
        filtered = filtered.filter(video => video.channelId === channelId);
    }
    
    // Apply search filter
    if (searchTerm) {
        filtered = filtered.filter(video => 
            video.title.toLowerCase().includes(searchTerm) ||
            video.channelTitle.toLowerCase().includes(searchTerm) ||
            video.description.toLowerCase().includes(searchTerm)
        );
    }
    
    // Apply duration filter
    if (durationFilterValue !== 'all') {
        filtered = filtered.filter(video => {
            const seconds = video.durationSeconds;
            if (durationFilterValue === 'short') return seconds < 300; // < 5 minutes
            if (durationFilterValue === 'medium') return seconds >= 300 && seconds <= 1200; // 5-20 minutes
            if (durationFilterValue === 'long') return seconds > 1200; // > 20 minutes
            return true;
        });
    }
    
    // Apply sorting
    filtered.sort((a, b) => {
        switch (sortBy) {
            case 'views':
                return b.viewCount - a.viewCount;
            case 'likes':
                return b.likeCount - a.likeCount;
            case 'duration-short':
                return a.durationSeconds - b.durationSeconds;
            case 'duration-long':
                return b.durationSeconds - a.durationSeconds;
            case 'date':
            default:
                return new Date(b.publishedAt) - new Date(a.publishedAt);
        }
    });
    
    displayedVideos = filtered;
    currentPage = 1;
    displayVideos();
    updateStats();
}

// Display videos in grid with pagination
function displayVideos() {
    const grid = document.getElementById('videosGrid');
    if (!grid) return;
    
    const startIndex = 0;
    const endIndex = currentPage * videosPerPage;
    const videosToShow = displayedVideos.slice(startIndex, endIndex);
    
    grid.innerHTML = '';
    
    if (videosToShow.length === 0) {
        grid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: var(--text-light); padding: 40px;">لا توجد فيديوهات لعرضها</p>';
        const loadMoreContainer = document.getElementById('loadMoreContainer');
        if (loadMoreContainer) loadMoreContainer.style.display = 'none';
        return;
    }
    
    videosToShow.forEach(video => {
        const card = createVideoCard(video);
        grid.appendChild(card);
    });
    
    // Show/hide load more button
    const loadMoreBtn = document.getElementById('loadMoreContainer');
    if (loadMoreBtn) {
        if (endIndex < displayedVideos.length) {
            loadMoreBtn.style.display = 'block';
        } else {
            loadMoreBtn.style.display = 'none';
        }
    }
}

// Load more videos
function loadMoreVideos() {
    currentPage++;
    displayVideos();
}

// Setup infinite scroll
function setupInfiniteScroll() {
    window.addEventListener('scroll', () => {
        if ((window.innerHeight + window.scrollY) >= document.body.offsetHeight - 500) {
            const loadMoreBtn = document.getElementById('loadMoreContainer');
            if (loadMoreBtn && loadMoreBtn.style.display !== 'none') {
                loadMoreVideos();
            }
        }
    });
}

// Create video card element
function createVideoCard(video) {
    const card = document.createElement('div');
    card.className = 'video-card';
    
    // Add favorite/watch-later classes
    if (favorites.includes(video.id)) {
        card.classList.add('favorite');
    }
    if (watchLater.includes(video.id)) {
        card.classList.add('watch-later');
    }
    
    card.innerHTML = `
        <div class="video-thumbnail" onclick="openVideoOptions('${video.id}')">
            <img src="${video.thumbnail}" alt="${video.title}">
            <div class="play-overlay">
                <i class="fas fa-play"></i>
            </div>
            <div class="video-duration">${video.durationFormatted}</div>
            <div class="video-quick-actions">
                <button class="quick-action-btn ${favorites.includes(video.id) ? 'active' : ''}" 
                        onclick="event.stopPropagation(); toggleFavorite('${video.id}')" 
                        title="المفضلة">
                    <i class="fas fa-heart"></i>
                </button>
                <button class="quick-action-btn ${watchLater.includes(video.id) ? 'active' : ''}" 
                        onclick="event.stopPropagation(); toggleWatchLater('${video.id}')" 
                        title="شاهد لاحقاً">
                    <i class="fas fa-bookmark"></i>
                </button>
                <button class="quick-action-btn" 
                        onclick="event.stopPropagation(); shareVideo('${video.id}')" 
                        title="مشاركة">
                    <i class="fas fa-share-alt"></i>
                </button>
            </div>
        </div>
        <div class="video-details">
            <h3 class="video-title">${video.title}</h3>
            <div class="channel-name">
                <i class="fas fa-user-circle"></i>
                <span>${video.channelTitle}</span>
            </div>
            <div class="video-meta">
                <span><i class="fas fa-eye"></i> ${video.viewCountFormatted}</span>
                <span><i class="fas fa-thumbs-up"></i> ${video.likeCountFormatted}</span>
                <span><i class="fas fa-clock"></i> ${formatDate(video.publishedAt)}</span>
            </div>
            <div class="video-actions">
                <button onclick="event.stopPropagation(); openVideoOnYouTube('${video.id}')" class="action-btn youtube-btn">
                    <i class="fab fa-youtube"></i> YouTube
                </button>
                <button onclick="event.stopPropagation(); openVideoEmbed('${video.id}')" class="action-btn embed-btn">
                    <i class="fas fa-play-circle"></i> شغل هنا
                </button>
            </div>
        </div>
    `;
    
    return card;
}

// Toggle Favorite
function toggleFavorite(videoId) {
    const index = favorites.indexOf(videoId);
    if (index > -1) {
        favorites.splice(index, 1);
        showSuccessMessage('تمت إزالة الفيديو من المفضلة');
    } else {
        favorites.push(videoId);
        showSuccessMessage('تمت إضافة الفيديو إلى المفضلة');
    }
    saveToLocalStorage('favorites', favorites);
    updateBadges();
    applyFilters(); // Refresh display
}

// Toggle Watch Later
function toggleWatchLater(videoId) {
    const index = watchLater.indexOf(videoId);
    if (index > -1) {
        watchLater.splice(index, 1);
        showSuccessMessage('تمت إزالة الفيديو من قائمة شاهد لاحقاً');
    } else {
        watchLater.push(videoId);
        showSuccessMessage('تمت إضافة الفيديو إلى قائمة شاهد لاحقاً');
    }
    saveToLocalStorage('watchLater', watchLater);
    updateBadges();
    applyFilters(); // Refresh display
}

// Show Favorites
function showFavorites() {
    if (favorites.length === 0) {
        alert('لا توجد فيديوهات في المفضلة');
        return;
    }
    
    displayedVideos = allVideos.filter(video => favorites.includes(video.id));
    currentPage = 1;
    displayVideos();
    updateStats();
    
    // Reset filters
    const searchInput = document.getElementById('searchInput');
    const channelFilter = document.getElementById('channelFilter');
    const sortFilter = document.getElementById('sortFilter');
    const durationFilter = document.getElementById('durationFilter');
    
    if (searchInput) searchInput.value = '';
    if (channelFilter) channelFilter.value = 'all';
    if (sortFilter) sortFilter.value = 'date';
    if (durationFilter) durationFilter.value = 'all';
    
    showSuccessMessage(`عرض ${displayedVideos.length} فيديو من المفضلة`);
}

// Show Watch Later
function showWatchLater() {
    if (watchLater.length === 0) {
        alert('لا توجد فيديوهات في قائمة شاهد لاحقاً');
        return;
    }
    
    displayedVideos = allVideos.filter(video => watchLater.includes(video.id));
    currentPage = 1;
    displayVideos();
    updateStats();
    
    // Reset filters
    const searchInput = document.getElementById('searchInput');
    const channelFilter = document.getElementById('channelFilter');
    const sortFilter = document.getElementById('sortFilter');
    const durationFilter = document.getElementById('durationFilter');
    
    if (searchInput) searchInput.value = '';
    if (channelFilter) channelFilter.value = 'all';
    if (sortFilter) sortFilter.value = 'date';
    if (durationFilter) durationFilter.value = 'all';
    
    showSuccessMessage(`عرض ${displayedVideos.length} فيديو من قائمة شاهد لاحقاً`);
}

// Share Video
function shareVideo(videoId) {
    const video = allVideos.find(v => v.id === videoId) || myLibrary.find(v => v.id === videoId);
    if (!video) return;
    
    const url = `https://www.youtube.com/watch?v=${video.id}`;
    const text = `شاهد: ${video.title}`;
    
    // Create share modal
    const modal = document.getElementById('videoModal');
    const container = document.getElementById('videoContainer');
    
    container.innerHTML = `
        <div class="video-options">
            <h2><i class="fas fa-share-alt"></i> مشاركة الفيديو</h2>
            <div class="share-options">
                <div class="share-option facebook" onclick="shareToFacebook('${url}')">
                    <i class="fab fa-facebook"></i>
                    <span>Facebook</span>
                </div>
                <div class="share-option twitter" onclick="shareToTwitter('${url}', '${encodeURIComponent(text)}')">
                    <i class="fab fa-twitter"></i>
                    <span>Twitter</span>
                </div>
                <div class="share-option whatsapp" onclick="shareToWhatsApp('${url}', '${encodeURIComponent(text)}')">
                    <i class="fab fa-whatsapp"></i>
                    <span>WhatsApp</span>
                </div>
                <div class="share-option telegram" onclick="shareToTelegram('${url}', '${encodeURIComponent(text)}')">
                    <i class="fab fa-telegram"></i>
                    <span>Telegram</span>
                </div>
                <div class="share-option copy" onclick="copyToClipboard('${url}')">
                    <i class="fas fa-copy"></i>
                    <span>نسخ الرابط</span>
                </div>
            </div>
        </div>
    `;
    
    document.getElementById('videoInfo').innerHTML = '';
    modal.style.display = 'block';
    document.body.style.overflow = 'hidden';
}

// Share to Facebook
function shareToFacebook(url) {
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, '_blank');
}

// Share to Twitter
function shareToTwitter(url, text) {
    window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${text}`, '_blank');
}

// Share to WhatsApp
function shareToWhatsApp(url, text) {
    window.open(`https://wa.me/?text=${text}%20${encodeURIComponent(url)}`, '_blank');
}

// Share to Telegram
function shareToTelegram(url, text) {
    window.open(`https://t.me/share/url?url=${encodeURIComponent(url)}&text=${text}`, '_blank');
}

// Copy to Clipboard
function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        showSuccessMessage('تم نسخ الرابط إلى الحافظة');
        closeVideo();
    }).catch(err => {
        console.error('Failed to copy:', err);
        alert('فشل نسخ الرابط');
    });
}

// Update Badges
function updateBadges() {
    const favoritesBadge = document.getElementById('favoritesBadge');
    const watchLaterBadge = document.getElementById('watchLaterBadge');
    const favoritesCount = document.getElementById('favoritesCount');
    const watchLaterCount = document.getElementById('watchLaterCount');
    
    if (favoritesBadge) favoritesBadge.textContent = favorites.length;
    if (watchLaterBadge) watchLaterBadge.textContent = watchLater.length;
    if (favoritesCount) favoritesCount.textContent = favorites.length;
    if (watchLaterCount) watchLaterCount.textContent = watchLater.length;
}

// Update Statistics
function updateStats() {
    const totalVideos = document.getElementById('totalVideos');
    const displayedVideosEl = document.getElementById('displayedVideos');
    const channelCount = document.getElementById('channelCount');
    
    if (totalVideos) totalVideos.textContent = allVideos.length;
    if (displayedVideosEl) displayedVideosEl.textContent = displayedVideos.length;
    if (channelCount) channelCount.textContent = Object.keys(channelNames).length;
}

// Update Channel Statistics
function updateChannelStats() {
    const statsGrid = document.getElementById('channelStatsGrid');
    if (!statsGrid) return;
    
    statsGrid.innerHTML = '';
    
    const channelCounts = {};
    allVideos.forEach(video => {
        channelCounts[video.channelId] = (channelCounts[video.channelId] || 0) + 1;
    });
    
    Object.entries(channelCounts)
        .sort((a, b) => b[1] - a[1])
        .forEach(([channelId, count]) => {
            const item = document.createElement('div');
            item.className = 'channel-stat-item';
            item.innerHTML = `
                <span class="channel-stat-name">${channelNames[channelId] || channelId}</span>
                <span class="channel-stat-count">${count}</span>
            `;
            item.onclick = () => {
                const channelFilter = document.getElementById('channelFilter');
                if (channelFilter) {
                    channelFilter.value = channelId;
                    applyFilters();
                }
            };
            statsGrid.appendChild(item);
        });
}

// Open video options modal
function openVideoOptions(videoId) {
    const video = allVideos.find(v => v.id === videoId) || myLibrary.find(v => v.id === videoId);
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
            <span>${video.channelTitle || 'غير متوفر'}</span>
        </div>
        <div class="video-meta" style="margin-bottom: 15px; font-size: 1rem;">
            ${video.viewCountFormatted ? `<span><i class="fas fa-eye"></i> ${video.viewCountFormatted} مشاهدة</span>` : ''}
            ${video.likeCountFormatted ? `<span><i class="fas fa-thumbs-up"></i> ${video.likeCountFormatted}</span>` : ''}
            ${video.publishedAt ? `<span><i class="fas fa-clock"></i> ${formatDate(video.publishedAt)}</span>` : ''}
            ${video.durationFormatted ? `<span><i class="fas fa-stopwatch"></i> ${video.durationFormatted}</span>` : ''}
        </div>
        ${video.description ? `<p style="white-space: pre-wrap;">${video.description}</p>` : '<p>لا يوجد وصف</p>'}
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
    const video = allVideos.find(v => v.id === videoId) || myLibrary.find(v => v.id === videoId);
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
            <span>${video.channelTitle || 'غير متوفر'}</span>
        </div>
        <div class="video-meta" style="margin-bottom: 15px; font-size: 1rem;">
            ${video.viewCountFormatted ? `<span><i class="fas fa-eye"></i> ${video.viewCountFormatted} مشاهدة</span>` : ''}
            ${video.likeCountFormatted ? `<span><i class="fas fa-thumbs-up"></i> ${video.likeCountFormatted}</span>` : ''}
            ${video.publishedAt ? `<span><i class="fas fa-clock"></i> ${formatDate(video.publishedAt)}</span>` : ''}
            ${video.durationFormatted ? `<span><i class="fas fa-stopwatch"></i> ${video.durationFormatted}</span>` : ''}
        </div>
        ${video.description ? `<p style="white-space: pre-wrap;">${video.description}</p>` : '<p>لا يوجد وصف</p>'}
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

// Close modal when clicking outside
window.onclick = function(event) {
    const videoModal = document.getElementById('videoModal');
    const channelModal = document.getElementById('channelManagerModal');
    
    if (event.target === videoModal) {
        closeVideo();
    }
    if (event.target === channelModal) {
        closeChannelManager();
    }
}

// Close modal with Escape key
document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') {
        closeVideo();
        closeChannelManager();
    }
});

// Show Channel Manager
function showChannelManager() {
    const modal = document.getElementById('channelManagerModal');
    const channelList = document.getElementById('channelList');
    
    // Populate channel list
    channelList.innerHTML = '';
    CHANNEL_IDS.forEach(channelId => {
        const item = document.createElement('div');
        item.className = 'channel-item';
        item.innerHTML = `
            <div class="channel-item-info">
                <div class="channel-item-name">${channelNames[channelId] || 'جاري التحميل...'}</div>
                <div class="channel-item-id">${channelId}</div>
            </div>
            <div class="channel-item-actions">
                <button class="channel-remove-btn" onclick="removeChannel('${channelId}')">
                    <i class="fas fa-trash"></i> حذف
                </button>
            </div>
        `;
        channelList.appendChild(item);
    });
    
    modal.style.display = 'block';
    document.body.style.overflow = 'hidden';
}

// Close Channel Manager
function closeChannelManager() {
    const modal = document.getElementById('channelManagerModal');
    modal.style.display = 'none';
    document.body.style.overflow = 'auto';
}

// Add Channel
function addChannel() {
    const input = document.getElementById('newChannelId');
    const channelId = input.value.trim();
    
    if (!channelId) {
        alert('الرجاء إدخال معرف القناة');
        return;
    }
    
    if (CHANNEL_IDS.includes(channelId)) {
        alert('هذه القناة موجودة بالفعل');
        return;
    }
    
    CHANNEL_IDS.push(channelId);
    saveToLocalStorage('customChannels', CHANNEL_IDS);
    
    input.value = '';
    showChannelManager(); // Refresh list
    showSuccessMessage('تمت إضافة القناة بنجاح. قم بتحديث الفيديوهات لعرض محتوى القناة الجديدة.');
}

// Remove Channel
function removeChannel(channelId) {
    if (!confirm('هل أنت متأكد من حذف هذه القناة؟')) {
        return;
    }
    
    const index = CHANNEL_IDS.indexOf(channelId);
    if (index > -1) {
        CHANNEL_IDS.splice(index, 1);
        saveToLocalStorage('customChannels', CHANNEL_IDS);
        
        // Remove videos from this channel
        allVideos = allVideos.filter(video => video.channelId !== channelId);
        saveToLocalStorage('cachedVideos', allVideos);
        
        showChannelManager(); // Refresh list
        applyFilters(); // Refresh display
        updateChannelStats();
        
        showSuccessMessage('تم حذف القناة بنجاح');
    }
}

// Reset Channels to Default
function resetChannels() {
    if (!confirm('هل أنت متأكد من استعادة القنوات الافتراضية؟ سيتم حذف جميع القنوات المخصصة.')) {
        return;
    }
    
    CHANNEL_IDS = [...DEFAULT_CHANNEL_IDS];
    saveToLocalStorage('customChannels', CHANNEL_IDS);
    
    closeChannelManager();
    loadAllVideos(true);
    showSuccessMessage('تم استعادة القنوات الافتراضية بنجاح');
}

// Check for New Videos
async function checkForNewVideos() {
    if (!apiKey || allVideos.length === 0) return;
    
    try {
        const latestVideo = allVideos[0];
        const latestDate = new Date(latestVideo.publishedAt);
        
        // Check first channel for new videos
        const channelId = CHANNEL_IDS[0];
        const searchUrl = `https://www.googleapis.com/youtube/v3/search?key=${apiKey}&channelId=${channelId}&part=snippet,id&order=date&maxResults=5&type=video&publishedAfter=${latestDate.toISOString()}`;
        
        const response = await fetch(searchUrl);
        const data = await response.json();
        
        if (data.items && data.items.length > 0) {
            // Found new videos
            const newVideosCount = data.items.length;
            showNotification(`تم نشر ${newVideosCount} فيديو جديد!`, 'جاري تحديث القائمة...');
            loadAllVideos(false);
        }
    } catch (error) {
        console.error('Error checking for new videos:', error);
    }
}

// Show Notification
function showNotification(title, body) {
    const container = document.getElementById('notificationContainer');
    
    const notification = document.createElement('div');
    notification.className = 'notification new-video';
    notification.innerHTML = `
        <div class="notification-icon">
            <i class="fas fa-bell"></i>
        </div>
        <div class="notification-content">
            <div class="notification-title">${title}</div>
            <div class="notification-body">${body}</div>
        </div>
        <button class="notification-close" onclick="this.parentElement.remove()">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    container.appendChild(notification);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        notification.remove();
    }, 5000);
}

// Show loading indicator
function showLoading(show) {
    const loading = document.getElementById('loading');
    if (loading) loading.style.display = show ? 'block' : 'none';
}

// Show error message
function showError(message) {
    const errorDiv = document.getElementById('errorMessage');
    const errorText = document.getElementById('errorText');
    if (errorText) errorText.textContent = message;
    if (errorDiv) errorDiv.style.display = 'block';
    
    setTimeout(() => {
        if (errorDiv) errorDiv.style.display = 'none';
    }, 5000);
}

// Hide error message
function hideError() {
    const errorDiv = document.getElementById('errorMessage');
    if (errorDiv) errorDiv.style.display = 'none';
}

// Show success message
function showSuccessMessage(message) {
    const successDiv = document.getElementById('successMessage');
    const successText = document.getElementById('successText');
    if (successText) successText.textContent = message;
    if (successDiv) successDiv.style.display = 'block';
    
    setTimeout(() => {
        if (successDiv) successDiv.style.display = 'none';
    }, 3000);
}

// ============================================
// 🚀 SmartPlay Features - المميزات الجديدة
// ============================================

// Load My Library from localStorage
function loadMyLibrary() {
    const saved = localStorage.getItem('myLibrary');
    if (saved) {
        myLibrary = JSON.parse(saved);
        updateLibraryBadge();
        displayLibrary();
    }
}

// Update Library Badge
function updateLibraryBadge() {
    const libraryBadge = document.getElementById('libraryBadge');
    if (libraryBadge) libraryBadge.textContent = myLibrary.length;
}

// Switch SmartPlay Tabs
function switchSmartPlayTab(tabName) {
    // Remove active class from all tabs
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    
    // Add active class to selected tab
    event.target.classList.add('active');
    const tabContent = document.getElementById(tabName + '-tab');
    if (tabContent) tabContent.classList.add('active');
    
    // Load content based on tab
    if (tabName === 'my-library') {
        displayLibrary();
    } else if (tabName === 'trending') {
        loadTrending();
    }
}

// Extract Video ID from YouTube URL
function extractVideoId(url) {
    const patterns = [
        /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|m\.youtube\.com\/watch\?v=)([^&\n?#]+)/,
        /^([a-zA-Z0-9_-]{11})$/ // Direct video ID
    ];
    
    for (let pattern of patterns) {
        const match = url.match(pattern);
        if (match) return match[1];
    }
    return null;
}

// Handle Paste Event
function handlePaste() {
    // Auto-detect video link after paste
    setTimeout(() => {
        const input = document.getElementById('quickWatchUrl');
        const url = input.value.trim();
        if (url && extractVideoId(url)) {
            // Optional: show preview hint
            console.log('Video URL detected:', url);
        }
    }, 100);
}

// Extract from Clipboard
async function extractFromClipboard() {
    try {
        const text = await navigator.clipboard.readText();
        const input = document.getElementById('quickWatchUrl');
        input.value = text;
        showSuccessMessage('تم اللصق من الحافظة');
    } catch (err) {
        console.error('Failed to read clipboard:', err);
        alert('فشل قراءة الحافظة. الرجاء اللصق يدوياً.');
    }
}

// Show Video Options (Advanced)
function showVideoOptions() {
    alert('الخيارات المتقدمة قيد التطوير...');
    // يمكن إضافة خيارات مثل: جودة التشغيل، السرعة، الترجمة، إلخ
}

// Quick Watch - Main Function
async function quickWatch() {
    const input = document.getElementById('quickWatchUrl');
    const url = input.value.trim();
    
    if (!url) {
        alert('الرجاء إدخال رابط الفيديو');
        return;
    }
    
    const videoId = extractVideoId(url);
    if (!videoId) {
        alert('رابط غير صحيح! يرجى إدخال رابط فيديو يوتيوب صحيح');
        return;
    }
    
    // If no API key, play directly
    if (!apiKeyProvided) {
        playVideoDirectly(videoId);
        return;
    }
    
    // Get video details with API
    showSuccessMessage('جاري تحميل معلومات الفيديو...');
    
    try {
        const response = await fetch(
            `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails,statistics&id=${videoId}&key=${apiKey}`
        );
        const data = await response.json();
        
        if (data.items && data.items.length > 0) {
            const video = data.items[0];
            currentQuickWatchVideo = {
                id: video.id,
                title: video.snippet.title,
                description: video.snippet.description,
                thumbnail: video.snippet.thumbnails.high.url,
                channelId: video.snippet.channelId,
                channelTitle: video.snippet.channelTitle,
                publishedAt: video.snippet.publishedAt,
                durationFormatted: formatDuration(video.contentDetails.duration),
                viewCountFormatted: formatNumber(video.statistics.viewCount),
                likeCountFormatted: formatNumber(video.statistics.likeCount)
            };
            
            showQuickWatchPreview(currentQuickWatchVideo);
        } else {
            playVideoDirectly(videoId);
        }
    } catch (error) {
        console.error('Error fetching video:', error);
        playVideoDirectly(videoId);
    }
}

// Play Video Directly (without API)
function playVideoDirectly(videoId) {
    const modal = document.getElementById('videoModal');
    const container = document.getElementById('videoContainer');
    const info = document.getElementById('videoInfo');
    
    container.innerHTML = `
        <iframe 
            src="https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0" 
            frameborder="0" 
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
            allowfullscreen>
        </iframe>
    `;
    
    info.innerHTML = `
        <div style="text-align: center; padding: 20px;">
            <p><i class="fas fa-info-circle"></i> يتم التشغيل مباشرة بدون معلومات إضافية</p>
            <a href="https://www.youtube.com/watch?v=${videoId}" target="_blank" class="btn-primary">
                <i class="fab fa-youtube"></i> فتح على YouTube
            </a>
        </div>
    `;
    
    modal.style.display = 'block';
    document.body.style.overflow = 'hidden';
}

// Show Quick Watch Preview
function showQuickWatchPreview(video) {
    const preview = document.getElementById('quickWatchPreview');
    
    preview.innerHTML = `
        <div class="preview-video">
            <div class="preview-thumbnail" onclick="playQuickWatchVideo()">
                <img src="${video.thumbnail}" alt="${video.title}">
                <div class="preview-play-overlay">
                    <i class="fas fa-play"></i>
                </div>
            </div>
            <div class="preview-info">
                <h3 class="preview-title">${video.title}</h3>
                <p class="preview-channel">
                    <i class="fas fa-user-circle"></i> ${video.channelTitle}
                </p>
                <div class="preview-stats">
                    <span><i class="fas fa-eye"></i> ${video.viewCountFormatted}</span>
                    <span><i class="fas fa-thumbs-up"></i> ${video.likeCountFormatted}</span>
                    <span><i class="fas fa-clock"></i> ${video.durationFormatted}</span>
                </div>
                <div class="preview-actions">
                    <button onclick="playQuickWatchVideo()" class="btn-primary">
                        <i class="fas fa-play"></i> تشغيل الآن
                    </button>
                    <button onclick="addToLibraryFromPreview()" class="btn-save">
                        <i class="fas fa-bookmark"></i> حفظ في المكتبة
                    </button>
                    <button onclick="addQuickWatchToFavorites()" class="btn-secondary">
                        <i class="fas fa-heart"></i> إضافة للمفضلة
                    </button>
                    <button onclick="addChannelFromQuickWatch()" class="btn-secondary">
                        <i class="fas fa-plus-circle"></i> إضافة القناة
                    </button>
                </div>
            </div>
        </div>
    `;
    
    preview.style.display = 'block';
}

// Play Quick Watch Video
function playQuickWatchVideo() {
    if (currentQuickWatchVideo) {
        openVideoEmbed(currentQuickWatchVideo.id);
    }
}

// Add to Library from Preview
function addToLibraryFromPreview() {
    if (currentQuickWatchVideo) {
        addToLibrary(currentQuickWatchVideo);
    }
}

// Add Quick Watch to Favorites
function addQuickWatchToFavorites() {
    if (currentQuickWatchVideo) {
        if (!favorites.includes(currentQuickWatchVideo.id)) {
            favorites.push(currentQuickWatchVideo.id);
            saveToLocalStorage('favorites', favorites);
            updateBadges();
            showSuccessMessage('تمت إضافة الفيديو للمفضلة!');
        } else {
            showSuccessMessage('الفيديو موجود بالفعل في المفضلة');
        }
    }
}

// Add Channel from Quick Watch
function addChannelFromQuickWatch() {
    if (currentQuickWatchVideo && currentQuickWatchVideo.channelId) {
        if (confirm(`هل تريد إضافة قناة "${currentQuickWatchVideo.channelTitle}" إلى قائمة القنوات المتابعة؟`)) {
            if (!CHANNEL_IDS.includes(currentQuickWatchVideo.channelId)) {
                CHANNEL_IDS.push(currentQuickWatchVideo.channelId);
                saveToLocalStorage('customChannels', CHANNEL_IDS);
                showSuccessMessage('تمت إضافة القناة! قم بتحديث الفيديوهات لعرض محتوى القناة.');
            } else {
                showSuccessMessage('القناة موجودة بالفعل في قائمتك');
            }
        }
    }
}

// Add to Library
function addToLibrary(video) {
    // Check if already in library
    if (myLibrary.some(v => v.id === video.id)) {
        showSuccessMessage('هذا الفيديو موجود بالفعل في المكتبة');
        return;
    }
    
    myLibrary.unshift(video);
    saveToLocalStorage('myLibrary', myLibrary);
    updateLibraryBadge();
    showSuccessMessage('تمت إضافة الفيديو إلى مكتبتي الشخصية!');
}

// Save to Library (from URL input)
async function saveToLibrary() {
    const input = document.getElementById('quickWatchUrl');
    const url = input.value.trim();
    
    if (!url) {
        alert('الرجاء إدخال رابط الفيديو');
        return;
    }
    
    const videoId = extractVideoId(url);
    if (!videoId) {
        alert('رابط غير صحيح!');
        return;
    }
    
    if (!apiKeyProvided) {
        // Save without details
        const basicVideo = {
            id: videoId,
            title: 'فيديو من YouTube',
            thumbnail: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
            channelTitle: 'غير متوفر'
        };
        addToLibrary(basicVideo);
        return;
    }
    
    // Get video details with API
    try {
        const response = await fetch(
            `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails,statistics&id=${videoId}&key=${apiKey}`
        );
        const data = await response.json();
        
        if (data.items && data.items.length > 0) {
            const video = data.items[0];
            const videoData = {
                id: video.id,
                title: video.snippet.title,
                description: video.snippet.description,
                thumbnail: video.snippet.thumbnails.high.url,
                channelId: video.snippet.channelId,
                channelTitle: video.snippet.channelTitle,
                publishedAt: video.snippet.publishedAt,
                durationFormatted: formatDuration(video.contentDetails.duration),
                viewCountFormatted: formatNumber(video.statistics.viewCount),
                likeCountFormatted: formatNumber(video.statistics.likeCount)
            };
            addToLibrary(videoData);
        }
    } catch (error) {
        console.error('Error saving to library:', error);
        // Fallback: save with basic info
        const basicVideo = {
            id: videoId,
            title: 'فيديو من YouTube',
            thumbnail: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
            channelTitle: 'غير متوفر'
        };
        addToLibrary(basicVideo);
    }
}

// Display Library
function displayLibrary() {
    const grid = document.getElementById('libraryGrid');
    if (!grid) return;
    
    grid.innerHTML = '';
    
    if (myLibrary.length === 0) {
        grid.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-book-open"></i>
                <p>مكتبتك فارغة! احفظ الفيديوهات المفضلة هنا</p>
            </div>
        `;
        return;
    }
    
    myLibrary.forEach(video => {
        const card = document.createElement('div');
        card.className = 'library-card';
        card.innerHTML = `
            <div class="library-thumbnail" onclick="openVideoEmbed('${video.id}')">
                <img src="${video.thumbnail}" alt="${video.title}">
                <div class="play-overlay">
                    <i class="fas fa-play"></i>
                </div>
            </div>
            <div class="library-info">
                <h4>${video.title}</h4>
                <p>${video.channelTitle || 'غير متوفر'}</p>
                <div class="library-actions">
                    <button onclick="openVideoOnYouTube('${video.id}')" class="btn-icon" title="فتح على YouTube">
                        <i class="fab fa-youtube"></i>
                    </button>
                    <button onclick="removeFromLibrary('${video.id}')" class="btn-icon" title="حذف من المكتبة">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
        grid.appendChild(card);
    });
}

// Remove from Library
function removeFromLibrary(videoId) {
    if (confirm('هل تريد حذف هذا الفيديو من المكتبة؟')) {
        myLibrary = myLibrary.filter(v => v.id !== videoId);
        saveToLocalStorage('myLibrary', myLibrary);
        updateLibraryBadge();
        displayLibrary();
        showSuccessMessage('تم حذف الفيديو من المكتبة');
    }
}

// Clear Library
function clearLibrary() {
    if (myLibrary.length === 0) {
        alert('المكتبة فارغة بالفعل');
        return;
    }
    
    if (confirm(`هل تريد حذف جميع الفيديوهات (${myLibrary.length}) من المكتبة؟`)) {
        myLibrary = [];
        saveToLocalStorage('myLibrary', myLibrary);
        updateLibraryBadge();
        displayLibrary();
        showSuccessMessage('تم مسح المكتبة بنجاح');
    }
}

// Smart Search
async function smartSearch() {
    const input = document.getElementById('smartSearchInput');
    const query = input.value.trim();
    
    if (!query) {
        alert('الرجاء إدخال كلمة بحث');
        return;
    }
    
    if (!apiKeyProvided) {
        alert('يجب إضافة API Key لاستخدام البحث الذكي');
        return;
    }
    
    const order = document.getElementById('searchOrder').value;
    const duration = document.getElementById('searchDuration').value;
    const resultsDiv = document.getElementById('searchResults');
    
    resultsDiv.innerHTML = '<div class="loading-state"><div class="spinner"></div><p>جاري البحث...</p></div>';
    
    try {
        let searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&type=video&maxResults=20&order=${order}&key=${apiKey}`;
        
        if (duration !== 'any') {
            searchUrl += `&videoDuration=${duration}`;
        }
        
        const response = await fetch(searchUrl);
        const data = await response.json();
        
        if (data.items && data.items.length > 0) {
            displaySearchResults(data.items);
        } else {
            resultsDiv.innerHTML = '<div class="empty-state"><i class="fas fa-search"></i><p>لم يتم العثور على نتائج</p></div>';
        }
    } catch (error) {
        console.error('Search error:', error);
        resultsDiv.innerHTML = '<div class="empty-state"><i class="fas fa-exclamation-triangle"></i><p>حدث خطأ أثناء البحث</p></div>';
    }
}

// Display Search Results
function displaySearchResults(items) {
    const resultsDiv = document.getElementById('searchResults');
    resultsDiv.innerHTML = '';
    
    items.forEach(item => {
        const videoId = item.id.videoId;
        const card = document.createElement('div');
        card.className = 'search-result-card';
        card.innerHTML = `
            <div class="search-thumbnail" onclick="openVideoEmbed('${videoId}')">
                <img src="${item.snippet.thumbnails.medium.url}" alt="${item.snippet.title}">
                <div class="play-overlay">
                    <i class="fas fa-play"></i>
                </div>
            </div>
            <div class="search-info">
                <h4>${item.snippet.title}</h4>
                <p class="search-channel"><i class="fas fa-user-circle"></i> ${item.snippet.channelTitle}</p>
                <p class="search-description">${item.snippet.description.substring(0, 100)}...</p>
                <div class="search-actions">
                    <button onclick="openVideoOnYouTube('${videoId}')" class="btn-icon" title="YouTube">
                        <i class="fab fa-youtube"></i>
                    </button>
                    <button onclick="saveSearchResultToLibrary('${videoId}')" class="btn-icon" title="حفظ">
                        <i class="fas fa-bookmark"></i>
                    </button>
                </div>
            </div>
        `;
        resultsDiv.appendChild(card);
    });
}

// Save Search Result to Library
async function saveSearchResultToLibrary(videoId) {
    if (!apiKeyProvided) {
        const basicVideo = {
            id: videoId,
            title: 'فيديو من YouTube',
            thumbnail: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
            channelTitle: 'غير متوفر'
        };
        addToLibrary(basicVideo);
        return;
    }
    
    try {
        const response = await fetch(
            `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails,statistics&id=${videoId}&key=${apiKey}`
        );
        const data = await response.json();
        
        if (data.items && data.items.length > 0) {
            const video = data.items[0];
            const videoData = {
                id: video.id,
                title: video.snippet.title,
                description: video.snippet.description,
                thumbnail: video.snippet.thumbnails.high.url,
                channelId: video.snippet.channelId,
                channelTitle: video.snippet.channelTitle,
                publishedAt: video.snippet.publishedAt,
                durationFormatted: formatDuration(video.contentDetails.duration),
                viewCountFormatted: formatNumber(video.statistics.viewCount),
                likeCountFormatted: formatNumber(video.statistics.likeCount)
            };
            addToLibrary(videoData);
        }
    } catch (error) {
        console.error('Error saving search result:', error);
        const basicVideo = {
            id: videoId,
            title: 'فيديو من YouTube',
            thumbnail: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
            channelTitle: 'غير متوفر'
        };
        addToLibrary(basicVideo);
    }
}

// Load Trending Videos
async function loadTrending() {
    if (!apiKeyProvided) {
        const grid = document.getElementById('trendingGrid');
        grid.innerHTML = '<div class="empty-state"><i class="fas fa-key"></i><p>يجب إضافة API Key لعرض الفيديوهات الرائجة</p></div>';
        return;
    }
    
    const region = document.getElementById('trendingRegion').value;
    const grid = document.getElementById('trendingGrid');
    
    grid.innerHTML = '<div class="loading-state"><div class="spinner"></div><p>جاري تحميل الفيديوهات الرائجة...</p></div>';
    
    try {
        let url = `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails,statistics&chart=mostPopular&maxResults=20&key=${apiKey}`;
        
        if (region) {
            url += `&regionCode=${region}`;
        }
        
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.items && data.items.length > 0) {
            displayTrendingResults(data.items);
        } else {
            grid.innerHTML = '<div class="empty-state"><i class="fas fa-fire"></i><p>لم يتم العثور على فيديوهات رائجة</p></div>';
        }
    } catch (error) {
        console.error('Trending error:', error);
        grid.innerHTML = '<div class="empty-state"><i class="fas fa-exclamation-triangle"></i><p>حدث خطأ أثناء تحميل الفيديوهات الرائجة</p></div>';
    }
}

// Display Trending Results
function displayTrendingResults(items) {
    const grid = document.getElementById('trendingGrid');
    grid.innerHTML = '';
    
    items.forEach(video => {
        const card = document.createElement('div');
        card.className = 'trending-card';
        card.innerHTML = `
            <div class="trending-thumbnail" onclick="openVideoEmbed('${video.id}')">
                <img src="${video.snippet.thumbnails.medium.url}" alt="${video.snippet.title}">
                <div class="play-overlay">
                    <i class="fas fa-play"></i>
                </div>
                <div class="trending-rank"><i class="fas fa-fire"></i></div>
            </div>
            <div class="trending-info">
                <h4>${video.snippet.title}</h4>
                <p class="trending-channel"><i class="fas fa-user-circle"></i> ${video.snippet.channelTitle}</p>
                <div class="trending-stats">
                    <span><i class="fas fa-eye"></i> ${formatNumber(video.statistics.viewCount)}</span>
                    <span><i class="fas fa-thumbs-up"></i> ${formatNumber(video.statistics.likeCount)}</span>
                </div>
                <div class="trending-actions">
                    <button onclick="openVideoOnYouTube('${video.id}')" class="btn-icon" title="YouTube">
                        <i class="fab fa-youtube"></i>
                    </button>
                    <button onclick="saveTrendingToLibrary('${video.id}')" class="btn-icon" title="حفظ">
                        <i class="fas fa-bookmark"></i>
                    </button>
                </div>
            </div>
        `;
        grid.appendChild(card);
    });
}

// Save Trending to Library
async function saveTrendingToLibrary(videoId) {
    try {
        const response = await fetch(
            `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails,statistics&id=${videoId}&key=${apiKey}`
        );
        const data = await response.json();
        
        if (data.items && data.items.length > 0) {
            const video = data.items[0];
            const videoData = {
                id: video.id,
                title: video.snippet.title,
                description: video.snippet.description,
                thumbnail: video.snippet.thumbnails.high.url,
                channelId: video.snippet.channelId,
                channelTitle: video.snippet.channelTitle,
                publishedAt: video.snippet.publishedAt,
                durationFormatted: formatDuration(video.contentDetails.duration),
                viewCountFormatted: formatNumber(video.statistics.viewCount),
                likeCountFormatted: formatNumber(video.statistics.likeCount)
            };
            addToLibrary(videoData);
        }
    } catch (error) {
        console.error('Error saving trending video:', error);
        showError('حدث خطأ أثناء حفظ الفيديو');
    }
}

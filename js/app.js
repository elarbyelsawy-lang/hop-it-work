// YouTube Channel IDs
const CHANNEL_IDS = [
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

// Initialize the app
document.addEventListener('DOMContentLoaded', function() {
    // Check if API key is saved
    const savedApiKey = localStorage.getItem('youtubeApiKey');
    if (savedApiKey) {
        apiKey = savedApiKey;
        showMainContent();
        loadAllVideos();
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
        const promises = CHANNEL_IDS.map(channelId => loadChannelVideos(channelId));
        await Promise.all(promises);
        
        // Sort videos by publish date (newest first)
        allVideos.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
        
        // Populate channel filter
        populateChannelFilter();
        
        // Display videos
        displayVideos(allVideos);
        
        // Update stats
        updateStats(allVideos.length);
        
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
        
        // Then, get channel videos
        const searchUrl = `https://www.googleapis.com/youtube/v3/search?key=${apiKey}&channelId=${channelId}&part=snippet,id&order=date&maxResults=20&type=video`;
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

// Display videos in grid
function displayVideos(videos) {
    const grid = document.getElementById('videosGrid');
    grid.innerHTML = '';
    
    if (videos.length === 0) {
        grid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: var(--text-light); padding: 40px;">لا توجد فيديوهات لعرضها</p>';
        return;
    }
    
    videos.forEach(video => {
        const card = createVideoCard(video);
        grid.appendChild(card);
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
                <button onclick="event.stopPropagation(); openVideoOnYouTube('${video.id}')" class="action-btn youtube-btn">
                    <i class="fab fa-youtube"></i> شاهد على YouTube
                </button>
                <button onclick="event.stopPropagation(); openVideoEmbed('${video.id}')" class="action-btn embed-btn">
                    <i class="fas fa-play-circle"></i> شغل هنا
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

// Close modal when clicking outside
window.onclick = function(event) {
    const modal = document.getElementById('videoModal');
    if (event.target === modal) {
        closeVideo();
    }
}

// Close modal with Escape key
document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') {
        closeVideo();
    }
});

// Filter videos by channel
function filterByChannel() {
    const select = document.getElementById('channelFilter');
    const channelId = select.value;
    
    let filtered = allVideos;
    if (channelId !== 'all') {
        filtered = allVideos.filter(video => video.channelId === channelId);
    }
    
    const searchTerm = document.getElementById('searchInput').value.trim();
    if (searchTerm) {
        filtered = filtered.filter(video => 
            video.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            video.channelTitle.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }
    
    displayVideos(filtered);
    updateStats(filtered.length);
}

// Search videos
function searchVideos() {
    const searchTerm = document.getElementById('searchInput').value.trim().toLowerCase();
    const channelId = document.getElementById('channelFilter').value;
    
    let filtered = allVideos;
    
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
    
    displayVideos(filtered);
    updateStats(filtered.length);
}

// Update statistics
function updateStats(count) {
    document.getElementById('videoCount').textContent = count;
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

// Constants
const API_KEY = 'AIzaSyDjlqZizGi2tNR7N4E_ErNjV_QrnrQszuk';
const MAX_RESULTS = 12;

// DOM Elements
const searchForm = document.querySelector('.search-form');
const searchInput = document.querySelector('.search-input');
const videosContainer = document.querySelector('.videos-container');
const categoryButtons = document.querySelectorAll('.category');
const menuButton = document.querySelector('.menu-icon');
const sidebar = document.querySelector('.sidebar');
const mainContent = document.querySelector('.main-content');
const moreMenuBtn = document.getElementById('moreMenuBtn');
const moreMenu = document.getElementById('moreMenu');

let nextPageToken = null;
let isLoading = false;
let lastQuery = '';
let lastType = 'video';

// Toggle 3-dots menu
if (moreMenuBtn && moreMenu) {
    moreMenuBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        moreMenu.classList.toggle('show');
    });
    // Hide menu when clicking outside
    document.addEventListener('click', (e) => {
        if (moreMenu.classList.contains('show')) {
            moreMenu.classList.remove('show');
        }
    });
    // Prevent menu from closing when clicking inside
    moreMenu.addEventListener('click', (e) => {
        e.stopPropagation();
    });
}

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    // Toggle sidebar on menu button click
    if (menuButton && sidebar && mainContent) {
        menuButton.addEventListener('click', () => {
            sidebar.classList.toggle('active');
            mainContent.classList.toggle('sidebar-active');
        });
    }

    // Fetch trending videos when the page first loads
    fetchTrendingVideos();

    // Search form submission
    if (searchForm) {
        searchForm.addEventListener('submit', (e) => {
            e.preventDefault();
            if (searchInput && searchInput.value.trim()) {
                nextPageToken = null; // Reset for new search
                searchVideos(searchInput.value.trim());
            }
        });
    }

    // Category buttons
    categoryButtons.forEach((button) => {
        button.addEventListener('click', () => {
            // Remove active class from all buttons
            categoryButtons.forEach((btn) => btn.classList.remove('active'));

            // Add active class to clicked button
            button.classList.add('active');

            // Search for videos in that category
            nextPageToken = null; // Reset for new search
            if (button.textContent !== 'All') {
                searchVideos(button.textContent || '', 'video');
            } else {
                fetchTrendingVideos();
            }
        });
    });
});

// Infinite scroll
window.addEventListener('scroll', async () => {
    if (isLoading || !nextPageToken) return;
    if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 400) {
        isLoading = true;
        if (lastQuery) {
            await searchVideos(lastQuery, lastType, true);
        } else {
            await fetchTrendingVideos(true);
        }
        isLoading = false;
    }
});

// Fetch trending videos
async function fetchTrendingVideos(append = false) {
    try {
        let url = `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails,statistics&chart=mostPopular&regionCode=US&maxResults=${MAX_RESULTS}&key=${API_KEY}`;
        if (nextPageToken && append) url += `&pageToken=${nextPageToken}`;
        const response = await fetch(url);
        if (!response.ok) throw new Error('Network response was not ok');
        const data = await response.json();
        nextPageToken = data.nextPageToken || null;
        lastQuery = '';
        lastType = 'video';
        displayVideos(data.items, append);
    } catch (error) {
        console.error('Error fetching trending videos:', error);
        displayErrorMessage();
    }
}

// Search for videos
async function searchVideos(query, type = 'video', append = false) {
    try {
        let url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&type=${type}&maxResults=${MAX_RESULTS}&key=${API_KEY}`;
        if (nextPageToken && append) url += `&pageToken=${nextPageToken}`;
        const response = await fetch(url);
        if (!response.ok) throw new Error('Network response was not ok');
        const data = await response.json();
        nextPageToken = data.nextPageToken || null;
        lastQuery = query;
        lastType = type;
        displayVideos(data.items, append);
    } catch (error) {
        console.error('Error searching videos:', error);
        displayErrorMessage();
    }
}

// Display videos in the container
function displayVideos(videos, append = false) {
    if (!videosContainer) return;
    if (!append) videosContainer.innerHTML = '';
    videos.forEach(async (video) => {
        const videoId = video.id?.videoId || video.id;
        const channelId = video.snippet.channelId;
        const channelLogoUrl = await fetchChannelLogo(channelId);
        const videoElement = createVideoElement(video, videoId, channelLogoUrl);
        videosContainer.appendChild(videoElement);
    });
}

// Fetch channel logo
async function fetchChannelLogo(channelId) {
    try {
        const response = await fetch(`https://www.googleapis.com/youtube/v3/channels?part=snippet&id=${channelId}&key=${API_KEY}`);
        if (!response.ok) return '';
        const data = await response.json();
        return data.items?.[0]?.snippet?.thumbnails?.default?.url || '';
    } catch {
        return '';
    }
}

// Modal for video player
let videoModal = null;
let videoModalContent = null;

function createVideoModal(videoId) {
    if (!videoModal) {
        videoModal = document.createElement('div');
        videoModal.className = 'video-modal';
        videoModal.innerHTML = `
            <div class="video-modal-content">
                <span class="video-modal-close">&times;</span>
                <div class="video-modal-iframe"></div>
            </div>
        `;
        document.body.appendChild(videoModal);
        videoModalContent = videoModal.querySelector('.video-modal-iframe');
        videoModal.querySelector('.video-modal-close').onclick = closeVideoModal;
        videoModal.onclick = function(e) {
            if (e.target === videoModal) closeVideoModal();
        };
    }
    videoModalContent.innerHTML = `<iframe width="100%" height="400" src="https://www.youtube.com/embed/${videoId}?autoplay=1" frameborder="0" allowfullscreen allow="autoplay; encrypted-media"></iframe>`;
    videoModal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

function closeVideoModal() {
    if (videoModal) {
        videoModal.style.display = 'none';
        videoModalContent.innerHTML = '';
        document.body.style.overflow = '';
    }
}

function createVideoElement(video, videoId, channelLogoUrl) {
    const div = document.createElement('div');
    div.className = 'video-card';
    div.innerHTML = `
        <div class="video-card-link" style="cursor:pointer">
            <img src="${video.snippet.thumbnails.medium.url}" alt="${video.snippet.title}" class="thumbnail">
            <div class="video-info">
                <div class="video-channel-row">
                    <img src="${channelLogoUrl}" alt="Channel Logo" class="channel-logo">
                    <div class="video-meta">
                        <h3 class="video-title">${video.snippet.title}</h3>
                        <p class="channel-name">${video.snippet.channelTitle}</p>
                        <p class="video-stats">${video.statistics?.viewCount ? formatViews(video.statistics.viewCount) + ' views • ' : ''}${formatDate(video.snippet.publishedAt)}</p>
                    </div>
                </div>
            </div>
        </div>
    `;
    div.querySelector('.video-card-link').onclick = () => {
        window.location.href = `video.html?id=${videoId}`;
    };
    return div;
}

function formatViews(views) {
    views = Number(views);
    if (views >= 1e6) return (views / 1e6).toFixed(1).replace(/\.0$/, '') + 'M';
    if (views >= 1e3) return (views / 1e3).toFixed(1).replace(/\.0$/, '') + 'K';
    return views;
}

// Format date
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

// Display error message
function displayErrorMessage() {
    if (!videosContainer) return;
    videosContainer.innerHTML = `
        <div class="error-message">
            <p>An error occurred while fetching videos. Please try again later.</p>
        </div>
    `;
}

// Shorts Sidebar Button Logic
const sidebarShortsBtn = document.querySelector('.sidebar-item span') && Array.from(document.querySelectorAll('.sidebar-item')).find(item => item.textContent.trim() === 'Shorts');

if (sidebarShortsBtn) {
    sidebarShortsBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        // Remove active from all sidebar items
        document.querySelectorAll('.sidebar-item').forEach(item => item.classList.remove('active'));
        sidebarShortsBtn.classList.add('active');
        nextPageToken = null;
        await fetchShortsVideos();
    });
}

// Fetch Shorts Videos (simulate by searching for "shorts" and filtering by duration)
async function fetchShortsVideos(append = false) {
    try {
        let url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=shorts&type=video&maxResults=${MAX_RESULTS}&key=${API_KEY}`;
        if (nextPageToken && append) url += `&pageToken=${nextPageToken}`;
        url += '&videoDuration=short'; // Only videos <4min, best we can do with API
        const response = await fetch(url);
        if (!response.ok) throw new Error('Network response was not ok');
        const data = await response.json();
        nextPageToken = data.nextPageToken || null;
        lastQuery = 'shorts';
        lastType = 'video';
        displayVideos(data.items, append);
    } catch (error) {
        console.error('Error fetching shorts videos:', error);
        displayErrorMessage();
    }
}

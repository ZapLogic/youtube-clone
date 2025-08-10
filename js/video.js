// js/video.js
// YouTube Video Page Logic
const API_KEY = 'AIzaSyDjlqZizGi2tNR7N4E_ErNjV_QrnrQszuk';

// Get video ID from URL
function getVideoId() {
    const params = new URLSearchParams(window.location.search);
    return params.get('id');
}

const videoId = getVideoId();
if (!videoId) {
    document.getElementById('video-title').textContent = 'Video not found.';
    throw new Error('No video ID');
}

// DOM Elements
const playerDiv = document.getElementById('player');
const titleEl = document.getElementById('video-title');
const viewsEl = document.getElementById('video-views');
const dateEl = document.getElementById('video-date');
const likeCountEl = document.getElementById('like-count');
const channelIconEl = document.getElementById('channel-icon');
const channelNameEl = document.getElementById('channel-name');
const subscriberCountEl = document.getElementById('subscriber-count');
const descriptionEl = document.getElementById('video-description');
const showMoreBtn = document.getElementById('show-more-btn');
const commentCountEl = document.getElementById('comment-count');
const commentsListEl = document.getElementById('comments-list');

// Header logic for video.html (copied from app.js for full header functionality)
const moreMenuBtn = document.getElementById('moreMenuBtn');
const moreMenu = document.getElementById('moreMenu');
const searchForm = document.querySelector('.search-form');
const searchInput = document.querySelector('.search-input');

if (moreMenuBtn && moreMenu) {
    moreMenuBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        moreMenu.classList.toggle('show');
    });
    document.addEventListener('click', (e) => {
        if (moreMenu.classList.contains('show')) {
            moreMenu.classList.remove('show');
        }
    });
    moreMenu.addEventListener('click', (e) => {
        e.stopPropagation();
    });
}

if (searchForm) {
    searchForm.addEventListener('submit', (e) => {
        e.preventDefault();
        if (searchInput && searchInput.value.trim()) {
            window.location.href = `index.html?q=${encodeURIComponent(searchInput.value.trim())}`;
        }
    });
}

// Load YouTube Player
function loadPlayer() {
    playerDiv.innerHTML = `<iframe width="100%" height="400" src="https://www.youtube.com/embed/${videoId}?autoplay=1" frameborder="0" allowfullscreen allow="autoplay; encrypted-media"></iframe>`;
}

// Fetch video details
async function fetchVideoDetails() {
    const url = `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics,contentDetails&id=${videoId}&key=${API_KEY}`;
    const res = await fetch(url);
    const data = await res.json();
    if (!data.items || !data.items.length) return;
    const video = data.items[0];
    titleEl.textContent = video.snippet.title;
    viewsEl.textContent = formatViews(video.statistics.viewCount) + ' views';
    dateEl.textContent = formatDate(video.snippet.publishedAt);
    likeCountEl.textContent = formatViews(video.statistics.likeCount || 0);
    setDescription(video.snippet.description);
    fetchChannelDetails(video.snippet.channelId);
}

// Show more/less logic for description
function setDescription(desc) {
    const maxLength = 250;
    if (desc.length > maxLength) {
        descriptionEl.textContent = desc.slice(0, maxLength) + '...';
        showMoreBtn.style.display = 'inline-block';
        let expanded = false;
        showMoreBtn.textContent = 'Show more';
        showMoreBtn.onclick = function() {
            expanded = !expanded;
            if (expanded) {
                descriptionEl.textContent = desc;
                showMoreBtn.textContent = 'Show less';
            } else {
                descriptionEl.textContent = desc.slice(0, maxLength) + '...';
                showMoreBtn.textContent = 'Show more';
            }
        };
    } else {
        descriptionEl.textContent = desc;
        showMoreBtn.style.display = 'none';
    }
}

// Fetch channel details
async function fetchChannelDetails(channelId) {
    const url = `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&id=${channelId}&key=${API_KEY}`;
    const res = await fetch(url);
    const data = await res.json();
    if (!data.items || !data.items.length) return;
    const channel = data.items[0];
    channelIconEl.src = channel.snippet.thumbnails.default.url;
    channelNameEl.textContent = channel.snippet.title;
    subscriberCountEl.textContent = formatViews(channel.statistics.subscriberCount) + ' subscribers';
}

// Fetch comments
async function fetchComments() {
    const url = `https://www.googleapis.com/youtube/v3/commentThreads?part=snippet&videoId=${videoId}&maxResults=10&key=${API_KEY}`;
    const res = await fetch(url);
    const data = await res.json();
    commentCountEl.textContent = data.pageInfo.totalResults || 0;
    commentsListEl.innerHTML = '';
    if (data.items) {
        data.items.forEach(item => {
            const c = item.snippet.topLevelComment.snippet;
            const div = document.createElement('div');
            div.className = 'comment';
            div.innerHTML = `
                <div class="comment-header">
                    <img src="${c.authorProfileImageUrl}" class="comment-avatar" alt="avatar">
                    <span class="comment-author">${c.authorDisplayName}</span>
                    <span class="comment-date">${formatDate(c.publishedAt)}</span>
                </div>
                <div class="comment-text">${c.textDisplay}</div>
            `;
            commentsListEl.appendChild(div);
        });
    }
}

let recommendedNextPageToken = null;
let recommendedLoading = false;

// Fetch recommended videos (Up next)
async function fetchRecommendedVideos(append = false) {
    if (recommendedLoading) return;
    recommendedLoading = true;
    let url = `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics&chart=mostPopular&regionCode=US&maxResults=10&key=${API_KEY}`;
    if (recommendedNextPageToken) url += `&pageToken=${recommendedNextPageToken}`;
    const res = await fetch(url);
    const data = await res.json();
    recommendedNextPageToken = data.nextPageToken || null;
    if (!data.items) return;
    // Remove the current video from recommendations if present
    const filtered = data.items.filter(v => v.id !== videoId);
    renderRecommendedVideos(filtered, append);
    recommendedLoading = false;
}

function renderRecommendedVideos(videos, append = false) {
    const container = document.getElementById('recommended-list');
    if (!container) return;
    if (!append) container.innerHTML = '';
    videos.forEach(video => {
        const div = document.createElement('div');
        div.className = 'recommended-video-card';
        div.innerHTML = `
            <div class="recommended-thumb-row" style="display:flex;gap:10px;cursor:pointer">
                <img src="${video.snippet.thumbnails.medium.url}" alt="${video.snippet.title}" class="recommended-thumb" style="width:168px;height:94px;border-radius:8px;object-fit:cover;">
                <div class="recommended-info" style="flex:1;min-width:0;">
                    <h4 class="recommended-title" style="font-size:15px;font-weight:500;margin-bottom:4px;line-height:1.3;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;">${video.snippet.title}</h4>
                    <div class="recommended-channel" style="font-size:13px;color:#606060;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${video.snippet.channelTitle}</div>
                    <div class="recommended-meta" style="font-size:12px;color:#909090;">${formatViews(video.statistics.viewCount)} views</div>
                </div>
            </div>
        `;
        div.onclick = () => {
            window.location.href = `video.html?id=${video.id}`;
        };
        container.appendChild(div);
    });
}

// Infinite scroll for recommended videos
const recommendedList = document.getElementById('recommended-list');
if (recommendedList) {
    recommendedList.addEventListener('scroll', async function () {
        if (recommendedList.scrollTop + recommendedList.clientHeight >= recommendedList.scrollHeight - 100) {
            if (recommendedNextPageToken) {
                await fetchRecommendedVideos(true);
            }
        }
    });
}

// Also support infinite scroll on window if sidebar is not scrollable
window.addEventListener('scroll', async function () {
    const sidebar = document.querySelector('.recommended-videos');
    if (!sidebar) return;
    const rect = sidebar.getBoundingClientRect();
    if (rect.bottom < window.innerHeight + 200 && recommendedNextPageToken) {
        await fetchRecommendedVideos(true);
    }
});

function formatViews(views) {
    views = Number(views);
    if (views >= 1e6) return (views / 1e6).toFixed(1).replace(/\.0$/, '') + 'M';
    if (views >= 1e3) return (views / 1e3).toFixed(1).replace(/\.0$/, '') + 'K';
    return views;
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

// Init
loadPlayer();
fetchVideoDetails();
fetchComments();
fetchRecommendedVideos();

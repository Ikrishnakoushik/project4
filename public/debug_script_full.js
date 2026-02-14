
// Apply Theme from LocalStorage immediately
(function () {
    const savedAccent = localStorage.getItem('prism-theme-accent');
    const savedHover = localStorage.getItem('prism-theme-hover');
    if (savedAccent) {
        document.documentElement.style.setProperty('--accent', savedAccent);
        // Also update primary for compatibility
        document.documentElement.style.setProperty('--primary', savedAccent);
    }
    if (savedHover) {
        document.documentElement.style.setProperty('--accent-hover', savedHover);
    }
})();

// --- Reader Mode Logic ---
function openReader(title, author, time, content) {
    const overlay = document.getElementById('reader-overlay');
    document.getElementById('reader-title').innerText = title || "Prism Post";
    document.getElementById('reader-author').innerText = author;
    document.getElementById('reader-time').innerText = time;

    // Format content with paragraphs
    const formatted = content.split('\n').filter(p => p.trim() !== '').map(p => `<p>${p}</p>`).join('');
    document.getElementById('reader-body').innerHTML = formatted;

    overlay.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeReader() {
    document.getElementById('reader-overlay').classList.remove('active');
    document.body.style.overflow = 'auto';
}

// Mock window/document for node check
if (typeof window === 'undefined') {
    global.window = { location: { hostname: 'localhost', protocol: 'http:', origin: 'http://localhost:3000' } };
    global.document = {
        getElementById: () => ({ addEventListener: () => { }, classList: { add: () => { }, remove: () => { } }, style: {} }),
        addEventListener: () => { },
        querySelector: () => ({ innerText: '' }),
        body: { style: {}, setAttribute: () => { } },
        documentElement: { style: { setProperty: () => { } } }
    };
    global.localStorage = { getItem: () => { } };
    global.navigator = { clipboard: { writeText: () => Promise.resolve() } };
    global.alert = console.log;
}

document.getElementById('reader-overlay').addEventListener('click', (e) => {
    if (e.target.id === 'reader-overlay') closeReader();
});

// --- Core Logic ---
// Force localhost API if opening via file://
const API_URL = (window.location.hostname === 'localhost' || window.location.protocol === 'file:')
    ? 'http://localhost:3000/api'
    : '/api';

let allPosts = [];

async function fetchTopSpreaders() {
    try {
        const list = document.getElementById('spreaders-list');
        if (!list) return;

        const res = await fetch(`${API_URL}/users/top`);
        if (!res.ok) throw new Error('Failed to fetch spreaders');

        const users = await res.json();

        if (users.length === 0) {
            list.innerHTML = '<div style="color: #94a3b8; font-size: 0.9rem;">No spreaders found yet.</div>';
            return;
        }

        list.innerHTML = users.map(user => {
            const initial = user.username ? user.username.charAt(0).toUpperCase() : 'U';
            const avatar = user.profilePicture
                ? `<img src="${user.profilePicture}" class="avatar-sm" style="object-fit: cover;">`
                : `<div class="avatar-sm" style="font-size: 0.8rem;">${initial}</div>`;

            const role = user.role ? (user.role.charAt(0).toUpperCase() + user.role.slice(1)) : 'Reader';

            return `
                    <div class="spreader-item">
                        ${avatar}
                        <div class="spreader-info">
                            <span class="spreader-name">${user.displayName || user.username}</span>
                            <span class="spreader-role">${role}</span>
                        </div>
                        <a href="profile.html?user=${user._id}" class="follow-btn" style="text-decoration: none;">View</a>
                    </div>`;
        }).join('');

    } catch (err) {
        console.error("Failed to load spreaders:", err);
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    // Dark mode init
    if (localStorage.getItem('theme') === 'dark') {
        document.body.setAttribute('data-theme', 'dark');
    }
    fetchPosts();
    fetchTopSpreaders(); // Fetch sidebar users
    updateAuthLink();
});

async function fetchPosts() {
    console.log('fetchPosts called');
    const container = document.getElementById('feed-container');
    // Try to find the loading text paragraph to update it
    const loadingText = container.querySelector('p');
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000); // Increased timeout

    try {
        if (loadingText) loadingText.innerText = `Connecting to ${API_URL}...`;
        console.log(`Fetching from: ${API_URL}/posts`);

        const res = await fetch(`${API_URL}/posts`, { signal: controller.signal });
        clearTimeout(timeoutId);
        console.log('Fetch response received', res.status);

        if (loadingText) loadingText.innerText = 'Receiving data from server...';

        if (!res.ok) {
            throw new Error(`Server responded with status ${res.status}`);
        }

        const posts = await res.json();

        if (loadingText) loadingText.innerText = `Processing ${posts.length} posts...`;

        allPosts = posts;
        renderPosts(posts);
    } catch (err) {
        console.error(err);

        let errorMsg = err.message;
        if (err.name === 'AbortError') errorMsg = "Connection timed out. Server is not responding.";

        container.innerHTML = `
                    <div style="text-align: center; color: var(--error); padding: 20px; background: #fff1f2; border: 1px solid #fecdd3; border-radius: 12px;">
                        <i class="fas fa-exclamation-triangle fa-2x" style="margin-bottom: 10px;"></i><br>
                        <strong>Failed to load feed.</strong><br>
                        <span style="font-size: 0.9em; opacity: 0.8;">${errorMsg}</span><br>
                        
                         <div style="text-align: left; background: rgba(0,0,0,0.05); padding: 10px; border-radius: 8px; font-family: monospace; font-size: 0.8rem; margin: 15px 0;">
                            <strong>Debug Info:</strong><br>
                            URL: ${API_URL}/posts<br>
                            Protocol: ${window.location.protocol}<br>
                            Hostname: ${window.location.hostname}
                        </div>

                        <button onclick="fetchPosts()" class="btn btn-primary" style="margin-top: 15px; padding: 8px 16px; font-size: 0.9em;">Retry</button>
                    </div>`;
    }
}

function renderPosts(posts) {
    try {
        const container = document.getElementById('feed-container');

        if (!posts || posts.length === 0) {
            container.innerHTML = `
                        <div style="text-align: center; padding: 40px; color: #94a3b8;">
                            <p>No spreads found. Be the first to spread something!</p>
                        </div>`;
            return;
        }

        container.innerHTML = posts.map(post => {
            // Post Author Details
            const authorName = post.user?.username || post.username || 'User';
            const initial = authorName.charAt(0).toUpperCase();
            const dateStr = post.createdAt ? new Date(post.createdAt).toLocaleDateString() : 'Just now';
            const likesCount = post.likes ? post.likes.length : 0;
            const commentsCount = post.comments ? post.comments.length : 0;
            const authorId = post.user?._id || '#';

            // Post Avatar logic
            const postAvatar = post.user?.profilePicture
                ? `<img src="${post.user.profilePicture}" class="avatar-sm" style="object-fit: cover;">`
                : `<div class="avatar-sm">${initial}</div>`;

            // Build Post Content HTML
            let postContentHTML = '';

            // Title
            if (post.title) {
                postContentHTML += `<h3 style="margin-bottom: 10px; font-size: 1.2rem;">${post.title}</h3>`;
            }

            // Image
            if (post.image) {
                postContentHTML += `
                    <div style="width: 100%; margin-bottom: 15px; border-radius: 12px; overflow: hidden;">
                        <img src="${post.image}" alt="Post Image" style="width: 100%; height: auto; display: block;">
                    </div>`;
            }

            // Text Content Logic
            let fullContent = linkify(post.content || '');
            // Basic formatting for preview (converts newlines to <br>)
            let formattedFull = fullContent.replace(/\n/g, '<br>');

            let displayContent = formattedFull;
            // Read Button Logic
            let readActionBtn = '';
            const isLong = fullContent.length > 800; // Threshold for "Long Article"

            if (isLong) {
                // Full Reader Mode for very long content
                const safeTitle = (post.title || 'Post').replace(/'/g, "&apos;");
                const safeAuthor = (authorName).replace(/'/g, "&apos;");
                const safeTime = (dateStr).replace(/'/g, "&apos;");

                readActionBtn = `
                        <div class="action-btn read-btn" 
                             onclick="openReaderFromId('${post._id}', '${safeTitle}', '${safeAuthor}', '${safeTime}')"
                             style="margin-left: auto; color: var(--accent); font-weight: 600; background: rgba(99, 102, 241, 0.1); padding: 5px 15px; border-radius: 20px;">
                            <i class="fas fa-book-open" style="margin-right: 5px;"></i> Read Story
                        </div>
                        <div id="content-store-${post._id}" style="display:none;">${LinkifyAndFormat(post.content)}</div>
                    `;
            } else if (fullContent.length > 300) {
                // Medium length: Use inline expand (keep as text link in content)
                const displayContent = formattedFull.substring(0, 300) + '...';
                postContentHTML += `<div style="margin-bottom: 15px; line-height: 1.7; color: #334155;">
                        <span class="post-text-body">${displayContent}</span>
                        <span class="read-more-btn" onclick="toggleReadMore(this)"
                            data-full="${encodeURIComponent(formattedFull)}"
                            data-short="${encodeURIComponent(displayContent)}"
                            style="color: var(--accent); cursor: pointer; font-weight: 600; margin-left: 5px; font-size: 0.9rem;">Read More</span>
                    </div>`;
            } else {
                // Short content
                postContentHTML += `<div style="margin-bottom: 15px; line-height: 1.7; color: #334155;">
                        <span class="post-text-body">${formattedFull}</span>
                    </div>`;
            }

            // If isLong, we skipped adding content block above to avoid duplication? 
            // Wait, logic above was adding postContentHTML. 
            // Let's rewrite strictly:

            if (isLong) {
                // Show teaser text for long posts too? Yes, usually good.
                // Let's show the first 300 chars then the button is in action bar.
                const displayTeaser = formattedFull.substring(0, 300) + '...';
                postContentHTML += `<div style="margin-bottom: 15px; line-height: 1.7; color: #334155;">
                        <span class="post-text-body">${displayTeaser}</span>
                     </div>`;
            }

            // Video Embed
            if (post.videoUrl) {
                const videoId = getYouTubeID(post.videoUrl);
                if (videoId) {
                    postContentHTML += `
                        <div style="position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden; border-radius: 12px; margin-bottom: 15px;">
                            <iframe style="position: absolute; top: 0; left: 0; width: 100%; height: 100%;" 
                                src="https://www.youtube.com/embed/${videoId}" frameborder="0" allowfullscreen>
                            </iframe>
                        </div>`;
                }
            }

            // Attachment
            if (post.attachment) {
                const fileName = post.attachment.split('/').pop().replace(/^\d+-/, '');
                postContentHTML += `
                    <a href="${post.attachment}" download class="attachment-btn" style="
                        display: inline-flex; align-items: center; gap: 8px; 
                        background: #f1f5f9; padding: 10px 16px; border-radius: 8px; 
                        text-decoration: none; color: var(--text-main); font-weight: 600; margin-bottom: 15px;">
                        <i class="fas fa-file-download" style="color: var(--accent);"></i> Download: ${fileName}
                    </a>`;
            }

            // Comments HTML
            const commentsList = (post.comments || []).map(c => {
                const cName = c.user?.username || c.username || 'User';
                const cInitial = cName.charAt(0).toUpperCase();
                const cUserId = c.user?._id || c.user || '#';
                const cProfilePic = c.user?.profilePicture;

                const commentAvatar = cProfilePic
                    ? `<img src="${cProfilePic}" style="width: 32px; height: 32px; border-radius: 50%; object-fit: cover; flex-shrink: 0;">`
                    : `<div style="width: 32px; height: 32px; border-radius: 50%; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 0.8rem; flex-shrink: 0;">${cInitial}</div>`;

                return `
                    <div style="display: flex; gap: 10px; margin-bottom: 12px; border-bottom: 1px solid #f1f5f9; padding-bottom: 8px;">
                        ${commentAvatar}
                        <div>
                            <div style="font-size: 0.9rem;">
                                <a href="profile.html?user=${cUserId}" style="text-decoration: none; color: var(--primary); font-weight: 700; margin-right: 5px;">${cName}</a>
                                <span style="font-size: 0.8rem; color: #aaa;">• Commented</span>
                            </div>
                            <div style="font-size: 0.95rem; color: var(--text-main); margin-top: 2px;">
                                ${c.text}
                            </div>
                        </div>
                    </div>`;
            }).join('');

            const likeText = likesCount > 0 ? `${likesCount}` : 'Like';
            const commentText = commentsCount > 0 ? `${commentsCount}` : 'Comment';

            return `
                <div class="post-card" id="post-${post._id}">
                    <div class="post-header">
                        <div class="post-user-info">
                            <a href="profile.html?user=${authorId}" style="text-decoration: none; color: inherit; display: flex; align-items: center; gap: 10px;">
                                ${postAvatar}
                                <div>
                                    <div class="post-author">${authorName}</div>
                                    <div class="post-time">${dateStr}</div>
                                </div>
                            </a>
                        </div>
                        <span class="post-tag" style="background: var(--tag-bg); color: var(--tag-text); padding: 4px 10px; border-radius: 12px; font-size: 0.8rem;">${post.category || 'General'}</span>
                    </div>
                    <div class="post-content">${postContentHTML}</div>
                    
                    <div class="post-actions" style="display: flex; align-items: center;">
                        <div class="action-btn" onclick="toggleLike('${post._id}')">
                            <i class="${likesCount > 0 ? 'fas' : 'far'} fa-heart" style="${likesCount > 0 ? 'color: #e11d48;' : ''}"></i> ${likeText}
                        </div>
                        <div class="action-btn" onclick="toggleComments('${post._id}')">
                            <i class="far fa-comment"></i> ${commentText}
                        </div>
                        <div class="action-btn" onclick="sharePost('${post._id}')">
                            <i class="far fa-share-square"></i> Share
                        </div>
                        
                        <!-- Read Story Action -->
                        ${readActionBtn}
                    </div>

                    <!-- Comment Section -->
                    <div id="comments-${post._id}" style="display: ${commentsCount > 0 ? 'block' : 'none'}; margin-top: 20px; border-top: 1px solid #f0f0f0; padding-top: 15px;">
                        <div style="margin-bottom: 15px; max-height: 200px; overflow-y: auto;">
                            ${commentsList.length > 0 ? commentsList : '<div style="color:#aaa; font-style:italic;">No comments yet. Be the first!</div>'}
                        </div>
                        <div style="display: flex; gap: 10px;">
                            <input type="text" id="input-${post._id}" placeholder="Write a comment..." style="flex: 1; padding: 10px 15px; border: 1px solid #ddd; border-radius: 20px; outline: none;">
                            <button onclick="submitComment('${post._id}')" class="btn btn-primary" style="padding: 8px 20px; border-radius: 20px; background: var(--accent); color: white; border: none; cursor: pointer; font-weight: 600;">Post</button>
                        </div>
                    </div>
                </div>`;
        }).join('');
    } catch (err) {
        console.error("Render error:", err);
        const container = document.getElementById('feed-container');
        if (container) {
            container.innerHTML = `<div style="text-align: center; color: var(--error); padding: 20px;">
                        Error and loading feed: ${err.message}
                    </div>`;
        }
    }
}

// --- Interaction Functions (Global) ---
// --- Interaction Functions (Global) ---
window.toggleLike = async function (postId) {
    try {
        const token = localStorage.getItem('token');
        if (!token) return alert('Please login to like');

        const res = await fetch(`${API_URL}/posts/${postId}/like`, {
            method: 'PUT',
            headers: { 'x-auth-token': token }
        });

        if (res.status === 401) {
            alert('Session expired. Please login again.');
            localStorage.removeItem('token');
            window.location.href = 'auth.html';
            return;
        }

        if (res.ok) {
            // Update UI locally without reload
            const postCard = document.getElementById(`post-${postId}`);
            if (postCard) {
                const likeBtn = postCard.querySelector('.action-btn .fa-heart');
                const likeTextContainer = likeBtn.parentElement; // Get the parent div with the text

                // Toggle icon
                if (likeBtn.classList.contains('far')) {
                    likeBtn.classList.remove('far');
                    likeBtn.classList.add('fas');
                    likeBtn.style.color = '#e11d48';
                    // Increment count logic (simplified)
                    // Ideally backend returns new count
                    const currentText = likeTextContainer.innerText.replace(/Like|\d+/g, '').trim(); // Remove "Like" or existing number
                    const currentCount = parseInt(currentText) || 0;
                    const newCount = currentCount + 1;
                    likeTextContainer.innerHTML = `<i class="fas fa-heart" style="color: #e11d48;"></i> ${newCount}`;
                } else {
                    likeBtn.classList.remove('fas');
                    likeBtn.classList.add('far');
                    likeBtn.style.color = '';
                    const currentText = likeTextContainer.innerText.replace(/Like|\d+/g, '').trim(); // Remove "Like" or existing number
                    const currentCount = parseInt(currentText) || 1; // If it was liked, assume at least 1
                    const newCount = Math.max(0, currentCount - 1);
                    likeTextContainer.innerHTML = `<i class="far fa-heart"></i> ${newCount > 0 ? newCount : 'Like'}`;
                }
            }
        } else {
            const txt = await res.text();
            console.error("Like failed", txt);
            alert("Like failed: " + txt);
        }
    } catch (err) {
        console.error(err);
        alert("Error liking post: " + err.message);
    }
}

window.toggleComments = function (postId) {
    const section = document.getElementById(`comments-${postId}`);
    if (section.style.display === 'none') {
        section.style.display = 'block';
    } else {
        section.style.display = 'none';
    }
}

window.submitComment = async function (postId) {
    const input = document.getElementById(`input-${postId}`);
    const text = input.value;
    if (!text.trim()) return;

    try {
        const token = localStorage.getItem('token');
        if (!token) return alert('Please login to comment');

        const res = await fetch(`${API_URL}/posts/${postId}/comment`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-auth-token': token
            },
            body: JSON.stringify({ text })
        });

        if (res.status === 401) {
            alert('Session expired. Please login again.');
            localStorage.removeItem('token');
            window.location.href = 'auth.html';
            return;
        }

        if (res.ok) {
            input.value = '';
            fetchPosts();
        } else {
            const txt = await res.text();
            console.error("Comment failed", txt);
            alert("Comment failed: " + txt);
        }
    } catch (err) {
        console.error(err);
        alert("Error commenting: " + err.message);
    }
}

window.sharePost = function (postId) {
    const url = `${window.location.origin}/main.html?post=${postId}`;
    navigator.clipboard.writeText(url).then(() => {
        alert('Link copied to clipboard!');
    });
}

function handleCreatePostClick() {
    // Allow everyone to access the studio for now
    window.location.href = 'publish.html';
}

window.openReader = openReader; // Explicitly expose

function setupSearch() {
    const input = document.getElementById('searchInput');
    if (!input) return;
    input.addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase();
        const filtered = allPosts.filter(post =>
            post.content.toLowerCase().includes(term) ||
            post.username.toLowerCase().includes(term) ||
            (post.tag && post.tag.toLowerCase().includes(term))
        );
        renderPosts(filtered);
    });
}

function openReaderFromId(id, title, author, time) {
    const contentDiv = document.getElementById(`content-store-${id}`);
    if (contentDiv) {
        const content = contentDiv.innerHTML; // Already formatted HTML
        openReaderFormatted(title, author, time, content);
    }
}

function openReaderFormatted(title, author, time, contentHTML) {
    const overlay = document.getElementById('reader-overlay');
    document.getElementById('reader-title').innerText = title || "Prism Post";
    document.getElementById('reader-author').innerText = author;
    document.getElementById('reader-time').innerText = time;
    document.getElementById('reader-body').innerHTML = contentHTML;

    overlay.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function LinkifyAndFormat(text) {
    if (!text) return '';

    // Check if text looks like HTML (has tags)
    if (/<[a-z][\s\S]*>/i.test(text)) {
        // It's likely HTML from the WYSIWYG editor
        // Just ensure links are active and return
        // We might want to remove existing links first to avoid double linking? 
        // Simple approach: Only linkify if not inside <a href>... tricky.
        // For now, assume HTML content is fine, maybe just wrapping newlines if they exist?
        return text;
    }

    // It's likely Plain Text / Markdown (from Seed data or simple inputs)
    const lines = text.split(/\n/);
    let html = '';

    lines.forEach(line => {
        const trimmed = line.trim();
        if (!trimmed) return;

        if (trimmed.startsWith('### ')) {
            html += `<h3>${linkify(trimmed.substring(4))}</h3>`;
        } else if (trimmed.startsWith('## ')) {
            html += `<h2>${linkify(trimmed.substring(3))}</h2>`;
        } else if (trimmed.startsWith('**') && trimmed.endsWith('**')) {
            // Standalone bold line? Treat as strong paragraph
            html += `<p><strong>${linkify(trimmed.slice(2, -2))}</strong></p>`;
        } else if (trimmed.startsWith('> ')) {
            html += `<blockquote>${linkify(trimmed.substring(2))}</blockquote>`;
        } else {
            let pContent = linkify(trimmed);
            // Bold
            pContent = pContent.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
            // Italic
            pContent = pContent.replace(/\*(.*?)\*/g, '<em>$1</em>');
            html += `<p>${pContent}</p>`;
        }
    });

    return html;
}

function toggleReadMore(btn) {
    const container = btn.parentElement.querySelector('.post-text-body');
    const isExpanded = btn.innerText === 'Show Less';

    if (isExpanded) {
        container.innerHTML = decodeURIComponent(btn.dataset.short);
        btn.innerText = 'Read More';
    } else {
        container.innerHTML = decodeURIComponent(btn.dataset.full);
        btn.innerText = 'Show Less';
    }
}

function linkify(text) {
    var urlRegex = /(https?:\/\/[^\s]+)/g;
    return text.replace(urlRegex, function (url) {
        return '<a href="' + url + '" target="_blank" style="color:var(--accent)">' + url + '</a>';
    });
}

function getYouTubeID(url) {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
}

function updateAuthLink() {
    const token = localStorage.getItem('token');
    const userMenu = document.querySelector('.user-menu');
    if (!userMenu) return;

    if (token) {
        // Logged in: show profile icon (already default, but maybe update avatar?)
        // For now, default is fine.
        // Could also add Logout button
        const logoutBtn = document.createElement('a');
        logoutBtn.href = "#";
        logoutBtn.className = "nav-item";
        logoutBtn.innerHTML = '<i class="fas fa-sign-out-alt"></i>';
        logoutBtn.title = "Logout";
        logoutBtn.onclick = (e) => {
            e.preventDefault();
            localStorage.removeItem('token');
            localStorage.removeItem('role');
            localStorage.removeItem('user');
            window.location.href = 'auth.html';
        };
        userMenu.appendChild(logoutBtn);
    } else {
        // Not logged in: Show Login button
        userMenu.innerHTML = `
                    <a href="auth.html" class="action-btn" style="text-decoration: none; font-weight: 700; color: var(--primary);">
                        Login
                    </a>
                    <a href="auth.html" class="btn btn-primary" style="padding: 8px 20px; text-decoration: none; color: white; border-radius: 20px; background: var(--primary);">
                        Sign Up
                    </a>`;
    }
}

// Carousel Logic
const track = document.getElementById('track');
if (track) {
    const slides = document.querySelectorAll('.slide');
    const dots = document.querySelectorAll('.dot');
    let currentSlide = 0;
    function updateCarousel() {
        track.style.transform = `translateX(-${currentSlide * 100}%)`;
        slides.forEach((slide, index) => {
            if (index === currentSlide) slide.classList.add('active');
            else slide.classList.remove('active');
        });
        dots.forEach((dot, index) => {
            if (index === currentSlide) dot.classList.add('active');
            else dot.classList.remove('active');
        });
    }
    setInterval(() => {
        currentSlide = (currentSlide + 1) % slides.length;
        updateCarousel();
    }, 5000);
}

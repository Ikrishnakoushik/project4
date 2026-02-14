
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

// --- Core Logic ---
// Force localhost API if opening via file://
// Mock window for node check
if (typeof window === 'undefined') {
    global.window = { location: { hostname: 'localhost', protocol: 'http:' } };
    global.document = { getElementById: () => ({ addEventListener: () => { } }), addEventListener: () => { } };
    global.localStorage = { getItem: () => { } };
}

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
// document.addEventListener('DOMContentLoaded', () => {
//     // Dark mode init
//     if (localStorage.getItem('theme') === 'dark') {
//         document.body.setAttribute('data-theme', 'dark');
//     }
//     fetchPosts();
//     fetchTopSpreaders(); // Fetch sidebar users
//     updateAuthLink();
// });

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
    // ... (omitted for brevity in check, but function block is valid)
}

// --- Interaction Functions (Global) ---
// --- Interaction Functions (Global) ---
// (rest of functions)

function updateAuthLink() {
    const token = localStorage.getItem('token');
    const userMenu = document.querySelector('.user-menu');
    if (!userMenu) return;

    if (token) {
        // ...
    } else {
        // ...
    }
}


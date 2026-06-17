// App State
let allReleaseNotes = [];
let activeCategory = 'all';
let searchQuery = '';
let activeNoteToShare = null;

// DOM Elements
const timelineContainer = document.getElementById('timeline-container');
const loadingSpinner = document.getElementById('loading-spinner');
const errorMessage = document.getElementById('error-message');
const errorDetails = document.getElementById('error-details');
const emptyState = document.getElementById('empty-state');
const refreshBtn = document.getElementById('refresh-btn');
const refreshIcon = document.getElementById('refresh-icon');
const cacheIndicator = document.getElementById('cache-indicator');
const lastFetchedText = document.getElementById('last-fetched-text');
const searchInput = document.getElementById('search-input');
const filterBtns = document.querySelectorAll('.filter-btn');

// Stats Elements
const statTotal = document.getElementById('stat-total');
const statFeatures = document.getElementById('stat-features');
const statAnnouncements = document.getElementById('stat-announcements');
const statIssues = document.getElementById('stat-issues');

// Modal Elements
const tweetModal = document.getElementById('tweet-modal');
const tweetTextarea = document.getElementById('tweet-textarea');
const charCounter = document.getElementById('char-counter');
const xPreviewText = document.getElementById('x-preview-text');
const xMetaTitle = document.getElementById('x-meta-title');
const modalCloseBtn = document.getElementById('modal-close-btn');
const modalCancelBtn = document.getElementById('modal-cancel-btn');
const postTweetBtn = document.getElementById('post-tweet-btn');

// Init
document.addEventListener('DOMContentLoaded', () => {
    fetchReleaseNotes(false);
    setupEventListeners();
});

// Setup Event Listeners
function setupEventListeners() {
    // Refresh click
    refreshBtn.addEventListener('click', () => fetchReleaseNotes(true));

    // Search input
    searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value.toLowerCase().strip();
        renderTimeline();
    });

    // Category filters
    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            activeCategory = btn.getAttribute('data-category');
            renderTimeline();
        });
    });

    // Modal Close
    modalCloseBtn.addEventListener('click', closeTweetModal);
    modalCancelBtn.addEventListener('click', closeTweetModal);
    tweetModal.addEventListener('click', (e) => {
        if (e.target === tweetModal) closeTweetModal();
    });

    // Textarea typing handler for live preview
    tweetTextarea.addEventListener('input', handleTweetTyping);

    // Post to X Web Intent
    postTweetBtn.addEventListener('click', submitTweetToX);
}

// Strip whitespace helper
String.prototype.strip = function() {
    return this.replace(/^\s+|\s+$/g, '');
};

// Fetch Release Notes
async function fetchReleaseNotes(forceRefresh = false) {
    showState('loading');
    refreshIcon.classList.add('rotate-anim');
    refreshBtn.disabled = true;

    const url = `/api/release-notes${forceRefresh ? '?refresh=true' : ''}`;

    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        
        allReleaseNotes = data.release_notes || [];
        
        // Update status UI
        updateSyncStatus(data.source, data.last_fetched);
        
        // Update Dashboard statistics
        updateStatistics();
        
        // Render Notes
        renderTimeline();

    } catch (e) {
        console.error("Error loading release notes feed: ", e);
        errorDetails.innerText = e.message || "Please check your backend connection.";
        showState('error');
    } finally {
        refreshIcon.classList.remove('rotate-anim');
        refreshBtn.disabled = false;
    }
}

// Update Sync Status indicators
function updateSyncStatus(source, timestamp) {
    // Badge status
    cacheIndicator.className = 'status-badge';
    if (source === 'network') {
        cacheIndicator.classList.add('network');
        cacheIndicator.innerText = 'Network Live';
    } else {
        cacheIndicator.classList.add('cache');
        cacheIndicator.innerText = 'Cached';
    }

    // Time text
    const date = new Date(timestamp * 1000);
    const timeString = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    lastFetchedText.innerText = `Last fetched: ${timeString}`;
}

// Compute statistics from data set
function updateStatistics() {
    let total = 0;
    let features = 0;
    let announcements = 0;
    let issues = 0;

    allReleaseNotes.forEach(day => {
        day.notes.forEach(note => {
            total++;
            if (note.category === 'Feature') features++;
            else if (note.category === 'Announcement') announcements++;
            else if (note.category === 'Issue') issues++;
        });
    });

    statTotal.innerText = total;
    statFeatures.innerText = features;
    statAnnouncements.innerText = announcements;
    statIssues.innerText = issues;
}

// Control main timeline container state displays
function showState(state) {
    loadingSpinner.classList.add('hidden');
    errorMessage.classList.add('hidden');
    emptyState.classList.add('hidden');
    timelineContainer.classList.add('hidden');

    if (state === 'loading') {
        loadingSpinner.classList.remove('hidden');
    } else if (state === 'error') {
        errorMessage.classList.remove('hidden');
    } else if (state === 'empty') {
        emptyState.classList.remove('hidden');
    } else if (state === 'content') {
        timelineContainer.classList.remove('hidden');
    }
}

// Render dynamic timelines grouped by dates
function renderTimeline() {
    timelineContainer.innerHTML = '';
    let renderedCount = 0;

    allReleaseNotes.forEach(day => {
        // Filter notes within this day block
        const filteredNotes = day.notes.filter(note => {
            const matchesCategory = activeCategory === 'all' || note.category === activeCategory;
            const matchesSearch = searchQuery === '' || 
                note.plain_text.toLowerCase().includes(searchQuery) || 
                note.category.toLowerCase().includes(searchQuery) ||
                day.date.toLowerCase().includes(searchQuery);
            return matchesCategory && matchesSearch;
        });

        if (filteredNotes.length > 0) {
            renderedCount += filteredNotes.length;
            
            // Create day block container
            const dayBlock = document.createElement('div');
            dayBlock.className = 'day-block';

            // Create day markup
            dayBlock.innerHTML = `
                <div class="day-marker"></div>
                <div class="day-header">
                    <h2 class="day-date">${day.date}</h2>
                    <a href="${day.url}" target="_blank" class="day-link">
                        <span>Official Release Notes</span>
                        <i data-lucide="external-link"></i>
                    </a>
                </div>
                <div class="day-notes-wrapper" id="notes-wrapper-${day.date.replace(/[^a-zA-Z0-9]/g, '')}">
                </div>
            `;

            timelineContainer.appendChild(dayBlock);
            const notesWrapper = dayBlock.querySelector('.day-notes-wrapper');

            // Insert note cards into the wrapper
            filteredNotes.forEach(note => {
                const card = document.createElement('article');
                card.className = `note-card ${note.category}`;
                card.innerHTML = `
                    <div class="card-header">
                        <span class="category-badge">${note.category}</span>
                        <div class="card-actions">
                            <button class="card-btn btn-tweet-card" title="Tweet this update">
                                <i data-lucide="twitter"></i>
                            </button>
                            <button class="card-btn btn-copy-card" title="Copy text to clipboard">
                                <i data-lucide="copy"></i>
                            </button>
                        </div>
                    </div>
                    <div class="card-body">
                        ${note.body_html}
                    </div>
                `;

                // Add Share Event
                const shareBtn = card.querySelector('.btn-tweet-card');
                shareBtn.addEventListener('click', () => openTweetModal(day.date, note));

                // Add Copy Event
                const copyBtn = card.querySelector('.btn-copy-card');
                copyBtn.addEventListener('click', () => copyToClipboard(note.plain_text, copyBtn));

                notesWrapper.appendChild(card);
            });
        }
    });

    // Handle empty state vs content state
    if (renderedCount === 0) {
        showState('empty');
    } else {
        showState('content');
        // Render lucide icons
        lucide.createIcons();
    }
}

// Copy to Clipboard Utility
function copyToClipboard(text, buttonElement) {
    navigator.clipboard.writeText(text).then(() => {
        // Change icon temporarily to checkmark
        const originalHTML = buttonElement.innerHTML;
        buttonElement.innerHTML = `<i data-lucide="check" style="color: var(--success)"></i>`;
        lucide.createIcons();
        
        setTimeout(() => {
            buttonElement.innerHTML = originalHTML;
            lucide.createIcons();
        }, 2000);
    }).catch(err => {
        console.error('Failed to copy text: ', err);
    });
}

// Open tweet composer with pre-filled content
function openTweetModal(date, note) {
    activeNoteToShare = { date, note };
    
    // Construct default draft text
    // Draft: [Category] on [Date]: "[Snippet]" #BigQuery #GoogleCloud
    const categoryPrefix = `📢 [BQ ${note.category}] (${date}): `;
    const suffix = `\n\nRead details at Google Cloud release logs #BigQuery #GoogleCloud`;
    
    // Calculate safe body text snippet length (280 max - prefix - suffix - URL buffer)
    const urlLengthBuffer = 23; // X handles links as 23 chars
    const availableLength = 280 - categoryPrefix.length - suffix.length - 10;
    
    let bodySnippet = note.plain_text;
    if (bodySnippet.length > availableLength) {
        bodySnippet = bodySnippet.substring(0, availableLength - 3) + "...";
    }

    const defaultTweet = `${categoryPrefix}"${bodySnippet}"${suffix}`;
    
    tweetTextarea.value = defaultTweet;
    xMetaTitle.innerText = `${note.category} Update - ${date}`;
    
    // Trigger sizing update
    handleTweetTyping();
    
    // Show Modal
    tweetModal.classList.remove('hidden');
    document.body.style.overflow = 'hidden'; // Lock body scroll
}

function closeTweetModal() {
    tweetModal.classList.add('hidden');
    document.body.style.overflow = ''; // Unlock scroll
    activeNoteToShare = null;
}

// Textarea typing and counter logic
function handleTweetTyping() {
    const text = tweetTextarea.value;
    const len = text.length;
    
    // Update counter
    charCounter.innerText = `${len} / 280`;
    
    // Color code overflow warning
    if (len > 280) {
        charCounter.style.color = 'var(--danger)';
        postTweetBtn.disabled = true;
    } else {
        charCounter.style.color = '';
        postTweetBtn.disabled = false;
    }
    
    // Update live simulated preview content
    xPreviewText.innerText = text;
}

// Launch Twitter intent
function submitTweetToX() {
    const text = tweetTextarea.value;
    if (text.length > 280) return;

    // Use Twitter Web Intent URL
    const shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
    window.open(shareUrl, '_blank');
    closeTweetModal();
}

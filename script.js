// Hardcoded API key - users don't need to enter their own
const API_KEY = '8bbe24cce36041828e47d63200cfd435';

let isLoading = false;

function getTimeAgo(date) {
    const now = new Date();
    const diffInMinutes = Math.floor((now - date) / (1000 * 60));
    if (diffInMinutes < 60) {
        return `${diffInMinutes}m ago`;
    } else if (diffInMinutes < 1440) {
        return `${Math.floor(diffInMinutes / 60)}h ago`;
    } else {
        return `${Math.floor(diffInMinutes / 1440)}d ago`;
    }
}

function showLoading() {
    const container = document.getElementById('newsContainer');
    container.innerHTML = `
        <div class="loading">
            <div class="spinner"></div>
            <p>Fetching the latest news stories...</p>
        </div>
    `;
}

function showError(message) {
    const container = document.getElementById('newsContainer');
    container.innerHTML = `
        <div class="card">
            <div class="card-content">
                <div class="error">
                    <h3> Oops! Something went wrong</h3>
                    <p>${message}</p>
                    <p>Please try again in a moment.</p>
                </div>
            </div>
        </div>
    `;
}

function displayNews(articles) {
    const container = document.getElementById('newsContainer');

    if (articles.length === 0) {
        container.innerHTML = `
            <div class="card">
                <div class="card-content">
                    <div class="error">
                        <h3> No News Found</h3>
                        <p>No articles found for your criteria. Try different filters!</p>
                    </div>
                </div>
            </div>
        `;
        return;
    }

    const newsHTML = articles.map((article, index) => {
        const timeAgo = getTimeAgo(new Date(article.publishedAt));
        const title = article.title || 'Untitled';
        const description = article.description || 'No description available.';
        const source = article.source?.name || 'Unknown Source';
        const author = article.author || '';
        const url = article.url || '#';
        const urlToImage = article.urlToImage;

        const imageElement = urlToImage
            ? `<img src="${urlToImage}" alt="${title}" class="news-image" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
               <div class="news-image-placeholder" style="display:none;"></div>`
            : `<div class="news-image-placeholder"></div>`;

        return `
            <div class="news-card">
                <div class="news-number">#${index + 1}</div>
                ${imageElement}
                <div class="news-content">
                    <h3 class="news-title" onclick="window.open('${url}', '_blank')">${title}</h3>
                    <div class="news-meta">
                        <span class="news-source">${source}</span>
                        <span class="news-time"> ${timeAgo}</span>
                        ${author ? `<span class="news-author"> ${author}</span>` : ''}
                    </div>
                    <p class="news-description">${description}</p>
                    <div class="news-actions">
                        <button class="btn btn-sm btn-success" onclick="window.open('${url}', '_blank')">
                             Read Full
                        </button>
                        <button class="btn btn-sm btn-outline btn-pink" onclick="shareArticle('${title.replace(/'/g, "\\'")}', '${url}')">
                             Share
                        </button>
                        </div>
                </div>
            </div>
        `
    }).join('');

    container.innerHTML = `<div class="news-grid">${newsHTML}</div>`;
}

async function fetchNews() {
    if (isLoading) return;

    isLoading = true;
    const fetchBtn = document.getElementById('fetchBtn');
    fetchBtn.disabled = true;
    fetchBtn.textContent = 'Loading...';

    const category = document.getElementById('category').value;
    const country = document.getElementById('country').value;
    const language = document.getElementById('language').value;
    const pageSize = document.getElementById('pageSize').value;

    showLoading();

    try {
        // Build API URL with hardcoded API key
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const fromDate = yesterday.toISOString();

        let apiUrl = `https://newsapi.org/v2/top-headlines?apiKey=${API_KEY}&from=${fromDate}&sortBy=publishedAt&pageSize=${pageSize}&country=${country}&language=${language}`;

        if (category) {
            apiUrl += `&category=${category}`;
        }

        console.log('Fetching from:', apiUrl);

        // Try direct fetch first
        try {
            const directResponse = await fetch(apiUrl);
            const directData = await directResponse.json();

            if (directData.status === 'ok') {
                displayNews(directData.articles || []);
            } else {
                throw new Error(directData.message || 'Direct API call failed');
            }
        } catch (directError) {
            console.log('Direct API failed, trying proxies:', directError);

            // Try CORS proxies
            const proxies = [
                'https://api.allorigins.win/get?url=',
                'https://corsproxy.io/?'
            ];

            let success = false;
            let lastError = null;

            for (const proxy of proxies) {
                try {
                    console.log('Trying proxy:', proxy);
                    const proxyUrl = proxy + encodeURIComponent(apiUrl);
                    const response = await fetch(proxyUrl);
                    let data;

                    if (proxy.includes('allorigins')) {
                        const proxyData = await response.json();
                        data = JSON.parse(proxyData.contents);
                    } else {
                        data = await response.json();
                    }

                    console.log('Proxy response:', data);

                    if (data.status === 'ok') {
                        displayNews(data.articles || []);
                        success = true;
                        break;
                    } else {
                        throw new Error(data.message || 'Proxy API call failed');
                    }
                } catch (error) {
                    console.log(`Proxy ${proxy} failed:`, error);
                    lastError = error;
                    continue;
                }
            }

            if (!success) {
                throw new Error(`Unable to fetch news at this time. Please try again later.`);
            }
        }

    } catch (error) {
        console.error('Fetch error:', error);
        showError(error.message);
    } finally {
        isLoading = false;
        fetchBtn.disabled = false;
        fetchBtn.textContent = ' Get News';
    }
}

async function searchNews() {
    if (isLoading) return;

    const searchQuery = document.getElementById('searchQuery').value.trim();
    if (!searchQuery) {
        alert('Please enter a search term!');
        return;
    }

    isLoading = true;
    const searchBtn = document.getElementById('searchBtn');
    searchBtn.disabled = true;
    searchBtn.textContent = 'Searching...';

    const language = document.getElementById('language').value;

    showLoading();

    try {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 7);
        const fromDate = yesterday.toISOString();

        const apiUrl = `https://newsapi.org/v2/everything?apiKey=${API_KEY}&q=${encodeURIComponent(searchQuery)}&from=${fromDate}&sortBy=publishedAt&pageSize=50&language=${language}`;

        console.log('Searching with:', apiUrl);

        // Try direct fetch first
        try {
            const directResponse = await fetch(apiUrl);
            const directData = await directResponse.json();

            if (directData.status === 'ok') {
                displayNews(directData.articles || []);
            } else {
                throw new Error(directData.message || 'Direct search failed');
            }
        } catch (directError) {
            console.log('Direct search failed, trying proxies:', directError);

            const proxies = [
                'https://api.allorigins.win/get?url=',
                'https://corsproxy.io/?'
            ];

            let success = false;
            let lastError = null;

            for (const proxy of proxies) {
                try {
                    const proxyUrl = proxy + encodeURIComponent(apiUrl);
                    const response = await fetch(proxyUrl);
                    let data;

                    if (proxy.includes('allorigins')) {
                        const proxyData = await response.json();
                        data = JSON.parse(proxyData.contents);
                    } else {
                        data = await response.json();
                    }

                    if (data.status === 'ok') {
                        displayNews(data.articles || []);
                        success = true;
                        break;
                    } else {
                        throw new Error(data.message || 'Proxy search failed');
                    }
                } catch (error) {
                    lastError = error;
                    continue;
                }
            }

            if (!success) {
                throw new Error(`Search failed. We're sorry, but it seems like you're currently offline. Please check your internet connection and try again later.Please try again later.`);
            }
        }

    } catch (error) {
        console.error('Search error:', error);
        showError(error.message);
    } finally {
        isLoading = false;
        searchBtn.disabled = false;
        searchBtn.textContent = ' Search';
    }
}

function shareArticle(title, url) {
    if (navigator.share) {
        navigator.share({
            title: title,
            url: url
        }).catch(err => console.log('Error sharing:', err));
    } else {
        // Fallback to copying to clipboard
        navigator.clipboard.writeText(`${title} - ${url}`).then(() => {
            alert('Article link copied to clipboard!');
        }).catch(() => {
            alert('Unable to copy to clipboard');
        });
    }
}




// Event listeners
document.getElementById('fetchBtn').addEventListener('click', fetchNews);
document.getElementById('searchBtn').addEventListener('click', searchNews);

// Allow Enter key to trigger search
document.getElementById('searchQuery').addEventListener('keypress', function (e) {
    if (e.key === 'Enter') {
        searchNews();
    }
});

// Initialize
console.log('Newshub loaded successfully with API key ready!');
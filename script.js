// ==================== CẤU HÌNH LIÊN KẾT GOOGLE SHEET TRỰC TIẾP ====================
// Điền ID Google Sheet của bạn vào đây (Nằm giữa cụm /d/ và /edit trên URL bảng tính)
const SPREADSHEET_ID = '1zu_On1RWsew4ZU5OF14g1xdA6bUiGwVEvS9RfUM1UXQ'; 
const SHEET_NAME = 'Sheet1'; // Tên tab sheet chứa danh sách dữ liệu phim

// Tạo API endpoint tự động xuất định dạng CSV
const GOOGLE_SHEET_CSV_URL = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(SHEET_NAME)}`;

// Biến toàn cục lưu danh sách phim sau khi đồng bộ
let moviesData = [];
let currentActivePage = 'home';
let selectedGenreFilter = 'Tất Cả';

// Tự động chạy khi tải xong cấu trúc HTML DOM
document.addEventListener("DOMContentLoaded", () => {
    fetchDataFromGoogleSheet();
    
    // Gắn sự kiện tìm kiếm nếu có phần tử input trong DOM
    const searchInput = document.getElementById('searchInput');
    if (searchInput) searchInput.addEventListener('input', searchMovies);

    const mobileSearchInput = document.getElementById('mobileSearchInput');
    if (mobileSearchInput) mobileSearchInput.addEventListener('input', searchMoviesMobile);
});

// Hàm chính đồng bộ và tải dữ liệu từ Google Sheet
async function fetchDataFromGoogleSheet() {
    const globalLoading = document.getElementById('global-loading');
    const syncIndicator = document.getElementById('sync-indicator');

    try {
        const response = await fetch(GOOGLE_SHEET_CSV_URL);
        if (!response.ok) throw new Error("Mất kết nối tới máy chủ Google");

        const csvText = await response.text();
        moviesData = parseCsvToObjects(csvText);

        // Ẩn màn hình loading, hiện trang chủ
        if (globalLoading) globalLoading.classList.add('hidden');
        showPage('home');
        
        // Khởi tạo giao diện trang web dựa trên dữ liệu thật
        buildInterfaceEngine();

    } catch (error) {
        console.error("Lỗi đồng bộ Sheet: ", error);
        if (globalLoading) {
            globalLoading.innerHTML = `<div class="text-red-500 font-bold p-4 bg-red-500/10 border border-red-500/20 rounded-xl inline-block">❌ Lỗi đồng bộ dữ liệu: Hãy kiểm tra ID bảng tính và đảm bảo quyền truy cập công khai "Người xem".</div>`;
        }
        if (syncIndicator) {
            syncIndicator.className = "flex items-center space-x-2 bg-red-500/10 border border-red-500/20 text-red-500 text-xs px-3 py-1.5 rounded-lg font-medium";
            syncIndicator.innerHTML = `<span class="w-2 h-2 rounded-full bg-red-500"></span><span>Sync Failed</span>`;
        }
    }
}

// Phân tích chuỗi CSV thô từ Google Sheet thành mảng Object chi tiết dựa theo cấu trúc cột mới
function parseCsvToObjects(csvText) {
    const lines = csvText.split('\n');
    if (lines.length <= 1) return [];

    const result = [];
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        // Tách cột theo dấu phẩy, dọn dẹp dấu ngoặc kép bọc chuỗi bọc bởi Google Sheet xuất bản
        const cols = line.split(',').map(cell => cell.replace(/^"(.*)"$/, '$1').replace(/""/g, '"').trim());
        if (cols.length < 3) continue; // Bỏ qua nếu dòng không đủ dữ liệu tối thiểu

        result.push({
            id: i - 1, // Tạo mã id tăng dần dùng để định vị phần tử khi click
            genre: cols[0] || "Hoạt Hình",
            title: cols[1] || "Chưa đặt tên phim",
            url: cols[2] || "",
            year: cols[3] || "2026",
            director: cols[4] || "Táo Bắc Việt Team",
            cast: cols[5] || "Đang cập nhật",
            desc: cols[6] || "Nội dung tóm tắt phim đang được cập nhật thêm từ đội ngũ biên kịch."
        });
    }

    // Tự động sắp xếp phim theo thứ tự Năm phát hành giảm dần (Mới nhất xuất hiện lên đầu)
    return result.sort((a, b) => parseInt(b.year) - parseInt(a.year));
}

// Xây dựng Layout giao diện động sau khi load xong data
function buildInterfaceEngine() {
    renderHeroBanner(); // Tự động cập nhật nội dung Banner đầu trang chủ
    renderGenrePills();
    renderTrendingSection(); // Khu vực "Đề cử xuất sắc nhất" lấy các phim mới/hot nhất
    renderHomeMovieSections();
    renderGenreSelectorGrid();
    filterAndDisplayMovies();
    renderReviewsPage();
}

// Điều hướng đổi màn hình (SPA)
function showPage(pageId) {
    currentActivePage = pageId;
    document.querySelectorAll('.page-content').forEach(p => p.classList.add('hidden'));
    const targetPage = document.getElementById(`page-${pageId}`);
    if (targetPage) targetPage.classList.remove('hidden');
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Cập nhật nội dung Hero Banner bằng bộ phim đầu tiên (Mới nhất)
function renderHeroBanner() {
    if (moviesData.length === 0) return;
    const topMovie = moviesData[0];
    
    const titleEl = document.getElementById('hero-title');
    const descEl = document.getElementById('hero-desc');
    const playBtn = document.getElementById('hero-play-btn');
    const bgEl = document.getElementById('hero-banner-bg');

    if (titleEl) titleEl.innerText = topMovie.title;
    if (descEl) descEl.innerText = topMovie.desc;
    if (playBtn) {
        playBtn.setAttribute('onclick', `playMovie(${topMovie.id})`);
    }
    
    // Tự động trích xuất Thumbnail Youtube để làm hình nền Banner nếu là link Youtube hợp lệ
    if (bgEl && topMovie.url) {
        let videoId = "";
        if (topMovie.url.includes("v=")) videoId = topMovie.url.split("v=")[1].split("&")[0];
        else if (topMovie.url.includes("youtu.be/")) videoId = topMovie.url.split("youtu.be/")[1].split("?")[0];
        
        if (videoId) {
            bgEl.style.backgroundImage = `url('https://img.youtube.com/vi/${videoId}/maxresdefault.jpg')`;
        }
    }
}

// Render thanh Pills cuộn ngang chọn nhanh thể loại ở trang chủ
function renderGenrePills() {
    const container = document.getElementById('genre-pills');
    if (!container) return;
    const uniqueGenres = ['Tất Cả', ...new Set(moviesData.map(m => m.genre))];
    
    container.innerHTML = uniqueGenres.map(genre => `
        <button onclick="showPage('genres'); filterByGenre('${genre}')" class="bg-darkbg-800 hover:bg-brand-600 hover:text-white border border-gray-800 text-xs font-semibold px-5 py-2.5 rounded-xl transition-all whitespace-nowrap">
            ${genre}
        </button>
    `).join('');
}

// Render khu vực Đề cử xuất sắc nhất (Lấy 5 phim hàng đầu)
function renderTrendingSection() {
    const container = document.getElementById('trending-movies-container');
    if (!container) return;
    
    const trendingMovies = moviesData.slice(0, 5);
    container.innerHTML = trendingMovies.map(movie => createMovieCardHtml(movie)).join('');
}

// Render phân mục phim theo cấu trúc hàng dọc tại trang chủ
function renderHomeMovieSections() {
    const container = document.getElementById('movie-sections-container');
    if (!container) return;
    const genres = [...new Set(moviesData.map(m => m.genre))];
    container.innerHTML = "";

    genres.forEach(genre => {
        const genreMovies = moviesData.filter(m => m.genre === genre).slice(0, 5);
        if (genreMovies.length === 0) return;

        const cardsHtml = genreMovies.map(movie => createMovieCardHtml(movie)).join('');

        container.innerHTML += `
            <div>
                <div class="flex items-center justify-between mb-4">
                    <h3 class="text-md font-bold uppercase tracking-wider text-gray-200 border-l-4 border-brand-500 pl-3">${genre}</h3>
                    <button onclick="showPage('genres'); filterByGenre('${genre}')" class="text-xs font-semibold text-brand-400 hover:text-brand-300 transition-colors">Xem tất cả <i class="fa-solid fa-angle-right ml-1"></i></button>
                </div>
                <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">${cardsHtml}</div>
            </div>
        `;
    });
}

// Hàm hỗ trợ render mã HTML của thẻ Card phim (Tự động bóc tách ảnh thu nhỏ từ Youtube)
function createMovieCardHtml(movie) {
    let posterUrl = "https://images.unsplash.com/photo-1478720568477-152d9b164e26?w=500";
    if (movie.url) {
        let videoId = "";
        if (movie.url.includes("v=")) videoId = movie.url.split("v=")[1].split("&")[0];
        else if (movie.url.includes("youtu.be/")) videoId = movie.url.split("youtu.be/")[1].split("?")[0];
        if (videoId) posterUrl = `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
    }

    return `
        <div onclick="playMovie(${movie.id})" class="group cursor-pointer bg-darkbg-800 rounded-2xl overflow-hidden border border-gray-800/60 transition-all duration-300 hover:-translate-y-1.5 hover:border-brand-500/40 hover:shadow-lg hover:shadow-brand-500/5">
            <div class="relative aspect-[16/10] w-full overflow-hidden bg-gray-900">
                <img src="${posterUrl}" alt="${movie.title}" class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy">
                <div class="absolute inset-0 bg-gradient-to-t from-darkbg-900 via-transparent to-transparent opacity-80"></div>
                <span class="absolute bottom-2.5 left-2.5 bg-brand-600 text-white text-[9px] font-bold px-2 py-0.5 rounded shadow">${movie.year}</span>
            </div>
            <div class="p-3.5">
                <h3 class="font-bold text-xs text-gray-100 group-hover:text-brand-400 transition-colors line-clamp-1">${movie.title}</h3>
                <p class="text-[10px] text-gray-400 mt-1 flex items-center justify-between">
                    <span class="truncate max-w-[100px]">${movie.genre}</span>
                    <span class="text-gray-500"><i class="fa-solid fa-clapperboard mr-1 text-[9px]"></i>${movie.director.slice(0,12)}</span>
                </p>
            </div>
        </div>
    `;
}

// Bộ lọc chi tiết cho trang bộ sưu tập
function renderGenreSelectorGrid() {
    const container = document.getElementById('genre-grid-selector');
    if (!container) return;
    const uniqueGenres = ['Tất Cả', ...new Set(moviesData.map(m => m.genre))];

    container.innerHTML = uniqueGenres.map(genre => `
        <button id="pill-${genre}" onclick="filterByGenre('${genre}')" class="bg-darkbg-800 text-gray-300 hover:text-white border border-gray-800/80 text-xs font-semibold py-3 px-2 rounded-xl text-center transition-all truncate">
            ${genre}
        </button>
    `).join('');
}

function filterByGenre(genreName) {
    selectedGenreFilter = genreName;
    filterAndDisplayMovies();
}

function filterAndDisplayMovies() {
    const grid = document.getElementById('filtered-movies-grid');
    const title = document.getElementById('current-filtered-title');
    const countLabel = document.getElementById('movie-count');
    if (!grid) return;

    // Cập nhật trạng thái Active CSS cho các nút phân loại
    document.querySelectorAll('[id^="pill-"]').forEach(btn => btn.className = "bg-darkbg-800 text-gray-300 border border-gray-800/80 text-xs font-semibold py-3 px-2 rounded-xl text-center transition-all truncate");
    const activePill = document.getElementById(`pill-${selectedGenreFilter}`);
    if (activePill) activePill.className = "bg-brand-500 text-white text-xs font-bold py-3 px-2 rounded-xl text-center shadow-lg shadow-brand-500/10 truncate";

    const filtered = selectedGenreFilter === 'Tất Cả' 
        ? moviesData 
        : moviesData.filter(m => m.genre === selectedGenreFilter);

    if (title) title.innerText = selectedGenreFilter;
    if (countLabel) countLabel.innerText = `${filtered.length} tác phẩm`;

    if (filtered.length === 0) {
        grid.innerHTML = `<div class="col-span-full text-center py-12 text-gray-500 text-sm">Chưa có tập phim nào thuộc phân mục này.</div>`;
        return;
    }

    grid.innerHTML = filtered.map(movie => createMovieCardHtml(movie)).join('');
}

// Phát phim thông minh và đồng bộ thông số chi tiết của cột mới (Đạo diễn, diễn viên)
function playMovie(id) {
    const movie = moviesData.find(m => m.id === id);
    if (!movie) return;

    showPage('player');

    // Nạp thông tin chi tiết lên trình phát phim Player
    const pTitle = document.getElementById('player-title');
    const pDesc = document.getElementById('player-desc');
    const pGenres = document.getElementById('player-genres');
    const vFrame = document.getElementById('video-frame');

    if (pTitle) pTitle.innerText = movie.title;
    
    if (pDesc) {
        pDesc.innerHTML = `
            <div class="space-y-2 text-xs sm:text-sm">
                <p class="text-gray-400"><strong class="text-gray-200"><i class="fa-solid fa-user-tie mr-2 text-brand-400"></i>Đạo diễn:</strong> ${movie.director}</p>
                <p class="text-gray-400"><strong class="text-gray-200"><i class="fa-solid fa-users mr-2 text-brand-400"></i>Nhân vật chính:</strong> ${movie.cast}</p>
                <p class="text-gray-300 mt-4 border-t border-gray-800/80 pt-3 leading-relaxed">${movie.desc}</p>
            </div>
        `;
    }
    
    if (pGenres) {
        pGenres.innerHTML = `
            <span class="bg-brand-500/10 border border-brand-500/30 text-brand-300 text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider mr-2">${movie.genre}</span>
            <span class="bg-darkbg-700 border border-gray-700 text-gray-300 text-[10px] font-bold px-2.5 py-1 rounded-full"><i class="fa-solid fa-calendar mr-1"></i>Năm ${movie.year}</span>
        `;
    }

    // Xử lý thông minh nhúng mã Iframe phát nội dung Youtube
    let finalEmbedUrl = movie.url;
    if (movie.url.includes("youtube.com/watch?v=")) {
        const videoId = movie.url.split("v=")[1].split("&")[0];
        finalEmbedUrl = `https://www.youtube.com/embed/${videoId}?autoplay=1`;
    } else if (movie.url.includes("youtu.be/")) {
        const videoId = movie.url.split("youtu.be/")[1].split("?")[0];
        finalEmbedUrl = `https://www.youtube.com/embed/${videoId}?autoplay=1`;
    }

    if (vFrame) {
        vFrame.innerHTML = `
            <iframe src="${finalEmbedUrl}" class="w-full h-full border-0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
        `;
    }

    // Gợi ý phim liên quan cùng thể loại (loại trừ phim đang xem)
    const suggestions = moviesData.filter(m => m.genre === movie.genre && m.id !== id).slice(0, 4);
    const suggestionsContainer = document.getElementById('suggestions-container');
    
    if (suggestionsContainer) {
        if (suggestions.length === 0) {
            // Nếu không có phim cùng thể loại thì lấy các phim mới nhất khác thay thế
            const fallbackSuggestions = moviesData.filter(m => m.id !== id).slice(0, 4);
            suggestionsContainer.innerHTML = fallbackSuggestions.map(m => createSuggestionCardHtml(m)).join('');
        } else {
            suggestionsContainer.innerHTML = suggestions.map(m => createSuggestionCardHtml(m)).join('');
        }
    }
}

function createSuggestionCardHtml(m) {
    let posterUrl = "https://images.unsplash.com/photo-1478720568477-152d9b164e26?w=200";
    if (m.url) {
        let videoId = "";
        if (m.url.includes("v=")) videoId = m.url.split("v=")[1].split("&")[0];
        else if (m.url.includes("youtu.be/")) videoId = m.url.split("youtu.be/")[1].split("?")[0];
        if (videoId) posterUrl = `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
    }

    return `
        <div onclick="playMovie(${m.id})" class="flex items-center space-x-3 cursor-pointer p-2 rounded-xl bg-darkbg-900/40 hover:bg-darkbg-700/60 border border-transparent hover:border-gray-800 transition-all group">
            <img src="${posterUrl}" alt="${m.title}" class="w-20 h-12 object-cover rounded-lg bg-gray-900 flex-shrink-0">
            <div class="min-w-0">
                <h4 class="text-xs font-bold text-gray-200 group-hover:text-brand-400 transition-colors line-clamp-1">${m.title}</h4>
                <p class="text-[10px] text-gray-500 mt-0.5">${m.genre} • Năm ${m.year}</p>
            </div>
        </div>
    `;
}

function goBack() {
    const vFrame = document.getElementById('video-frame');
    if (vFrame) vFrame.innerHTML = ""; // Giải phóng Iframe dừng chạy nhạc ngầm khi quay ra
    showPage('genres');
}

// Logic tìm kiếm đa điều kiện thời gian thực
function searchMovies() {
    const value = document.getElementById('searchInput').value.toLowerCase().trim();
    executeSearchLogic(value);
}

function searchMoviesMobile() {
    const value = document.getElementById('mobileSearchInput').value.toLowerCase().trim();
    executeSearchLogic(value);
}

function executeSearchLogic(keyword) {
    showPage('genres');
    selectedGenreFilter = 'Tất Cả';
    
    document.querySelectorAll('[id^="pill-"]').forEach(btn => btn.className = "bg-darkbg-800 text-gray-300 border border-gray-800/80 text-xs font-semibold py-3 px-2 rounded-xl text-center transition-all truncate");
    const activePill = document.getElementById(`pill-Tất Cả`);
    if (activePill) activePill.className = "bg-brand-500 text-white text-xs font-bold py-3 px-2 rounded-xl text-center shadow-lg shadow-brand-500/10 truncate";

    const title = document.getElementById('current-filtered-title');
    const countLabel = document.getElementById('movie-count');
    const grid = document.getElementById('filtered-movies-grid');

    const filtered = moviesData.filter(m => 
        m.title.toLowerCase().includes(keyword) || 
        m.genre.toLowerCase().includes(keyword) ||
        m.director.toLowerCase().includes(keyword) ||
        m.cast.toLowerCase().includes(keyword)
    );

    if (title) title.innerText = keyword ? `Kết quả cho: "${keyword}"` : "Tất Cả Phim";
    if (countLabel) countLabel.innerText = `${filtered.length} tác phẩm`;

    if (!grid) return;
    if (filtered.length === 0) {
        grid.innerHTML = `<div class="col-span-full text-center py-12 text-gray-500 text-sm">Không tìm thấy tập phim nào khớp với từ khóa tìm kiếm.</div>`;
        return;
    }

    grid.innerHTML = filtered.map(movie => createMovieCardHtml(movie)).join('');
}

// Sinh dữ liệu trang Tóm Tắt & Review ngắn tự động
function renderReviewsPage() {
    const container = document.getElementById('reviews-grid');
    if (!container) return;
    
    const targetMovies = moviesData.slice(0, 3);
    if (targetMovies.length === 0) {
        container.innerHTML = `<div class="col-span-full text-center py-12 text-gray-500 text-sm">Chưa có bài tóm tắt review.</div>`;
        return;
    }

    container.innerHTML = targetMovies.map(m => `
        <div class="bg-darkbg-800 rounded-2xl p-6 border border-gray-800/60 flex flex-col justify-between">
            <div>
                <div class="flex items-center space-x-1.5 text-amber-400 text-xs mb-3.5">
                    <i class="fa-solid fa-star"></i><i class="fa-solid fa-star"></i><i class="fa-solid fa-star"></i><i class="fa-solid fa-star"></i><i class="fa-solid fa-star"></i>
                </div>
                <h3 class="text-md font-bold text-white mb-2">Review: ${m.title}</h3>
                <p class="text-xs text-gray-300 leading-relaxed italic line-clamp-4">
                    "${m.desc}"
                </p>
            </div>
            <div class="flex items-center justify-between pt-6 mt-6 border-t border-gray-800/80">
                <span class="text-[11px] font-bold text-brand-400 uppercase tracking-wider">${m.genre}</span>
                <button onclick="playMovie(${m.id})" class="text-xs font-semibold text-gray-400 hover:text-white flex items-center space-x-1 transition-colors"><span>Cày Phim</span><i class="fa-solid fa-angle-right text-[10px]"></i></button>
            </div>
        </div>
    `).join('');
}

// Đóng mở Menu Thanh Điều Hướng trên di động
function toggleMobileMenu() {
    const menu = document.getElementById('mobileMenu');
    if (menu) menu.classList.toggle('hidden');
}
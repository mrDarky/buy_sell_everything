// API Base URL
const API_BASE = '/api';
let currentUser = null;
let socket = null;

// HTML escape function to prevent XSS
function escapeHtml(unsafe) {
    if (!unsafe) return '';
    return unsafe
        .toString()
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// Initialize app on page load
document.addEventListener('DOMContentLoaded', function() {
    checkAuth();
    loadListings();
    loadAuctions();
    loadStats();
    
    // Setup form handlers
    document.getElementById('loginForm').addEventListener('submit', handleLogin);
    document.getElementById('registerForm').addEventListener('submit', handleRegister);
    document.getElementById('createListingForm').addEventListener('submit', handleCreateListing);
    document.getElementById('createAuctionForm').addEventListener('submit', handleCreateAuction);
    
    // Initialize Socket.IO
    initSocket();
});

// Socket.IO initialization
function initSocket() {
    socket = io();
    
    socket.on('connect', () => {
        console.log('Connected to Socket.IO');
        if (currentUser) {
            socket.emit('join_room', { room: `user_${currentUser.id}` });
        }
    });
    
    socket.on('new_bid', (data) => {
        console.log('New bid:', data);
        // Reload auctions to show updated prices
        loadAuctions();
    });
    
    socket.on('new_message', (data) => {
        console.log('New message:', data);
        updateUnreadCount();
    });
}

// Check authentication
async function checkAuth() {
    const token = localStorage.getItem('access_token');
    if (!token) return;
    
    try {
        const response = await fetch(`${API_BASE}/auth/me`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            currentUser = await response.json();
            updateUIForLoggedInUser();
        } else {
            localStorage.removeItem('access_token');
        }
    } catch (error) {
        console.error('Auth check failed:', error);
    }
}

// Update UI for logged-in user
function updateUIForLoggedInUser() {
    document.getElementById('auth-link').style.display = 'none';
    document.getElementById('user-menu').style.display = 'block';
    document.getElementById('username-display').textContent = currentUser.username;
    // Show messages link only when logged in
    const messagesLink = document.getElementById('messages-link');
    if (messagesLink) {
        messagesLink.style.display = 'block';
    }
    updateUnreadCount();
}

// Handle login
async function handleLogin(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = {
        email: formData.get('email'),
        password: formData.get('password')
    };
    
    try {
        const response = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        
        if (response.ok) {
            const result = await response.json();
            localStorage.setItem('access_token', result.access_token);
            location.reload();
        } else {
            alert('Login failed. Please check your credentials.');
        }
    } catch (error) {
        console.error('Login error:', error);
        alert('Login failed. Please try again.');
    }
}

// Handle register
async function handleRegister(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = {
        email: formData.get('email'),
        username: formData.get('username'),
        password: formData.get('password'),
        role: formData.get('role')
    };
    
    try {
        const response = await fetch(`${API_BASE}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        
        if (response.ok) {
            const result = await response.json();
            localStorage.setItem('access_token', result.access_token);
            location.reload();
        } else {
            alert('Registration failed. Username or email may already exist.');
        }
    } catch (error) {
        console.error('Registration error:', error);
        alert('Registration failed. Please try again.');
    }
}

// Logout
function logout() {
    localStorage.removeItem('access_token');
    location.reload();
}

// Load listings
async function loadListings(category = null) {
    try {
        let url = `${API_BASE}/listings?limit=50`;
        if (category && category !== 'all') {
            url += `&category=${category}`;
        }
        
        const response = await fetch(url);
        const listings = await response.json();
        
        const container = document.getElementById('listings-container');
        container.innerHTML = '';
        
        listings.forEach(listing => {
            const card = createListingCard(listing);
            container.appendChild(card);
        });
    } catch (error) {
        console.error('Error loading listings:', error);
    }
}

// Create listing card
function createListingCard(listing) {
    const col = document.createElement('div');
    col.className = 'col-md-4 mb-4';
    
    col.innerHTML = `
        <div class="card h-100">
            <img src="${listing.image_url || 'https://via.placeholder.com/400x300'}" class="card-img-top" alt="${listing.title}">
            <div class="card-body">
                <h5 class="card-title">${listing.title}</h5>
                <p class="card-text">${listing.description.substring(0, 100)}...</p>
                <div class="d-flex justify-content-between align-items-center">
                    <span class="badge bg-primary">${listing.category}</span>
                    <h5 class="text-success mb-0">$${listing.price}</h5>
                </div>
            </div>
            <div class="card-footer">
                <small class="text-muted"><i class="fas fa-eye"></i> ${listing.views} views</small>
                <button class="btn btn-sm btn-primary float-end" onclick="viewListing(${listing.id})">View Details</button>
            </div>
        </div>
    `;
    
    return col;
}

// Filter listings
function filterListings(category) {
    loadListings(category);
}

// View listing details
async function viewListing(listingId) {
    try {
        const response = await fetch(`${API_BASE}/listings/${listingId}`);
        const listing = await response.json();
        
        document.getElementById('listing-detail-title').textContent = listing.title;
        document.getElementById('listing-detail-body').innerHTML = `
            <img src="${listing.image_url || 'https://via.placeholder.com/800x400'}" class="img-fluid mb-3" alt="${listing.title}">
            <p><strong>Category:</strong> ${listing.category}</p>
            <p><strong>Price:</strong> $${listing.price}</p>
            <p><strong>Description:</strong> ${listing.description}</p>
            <p><strong>Seller ID:</strong> ${listing.seller_id}</p>
            <p><strong>Views:</strong> ${listing.views}</p>
        `;
        
        document.getElementById('buy-now-btn').onclick = () => buyListing(listingId, listing.price);
        
        const modal = new bootstrap.Modal(document.getElementById('listingDetailModal'));
        modal.show();
    } catch (error) {
        console.error('Error loading listing:', error);
    }
}

// Buy listing
async function buyListing(listingId, amount) {
    if (!currentUser) {
        alert('Please login to make a purchase');
        return;
    }
    
    const paymentMethod = prompt('Enter payment method (TON/USDT):');
    if (!paymentMethod) return;
    
    try {
        const token = localStorage.getItem('access_token');
        const response = await fetch(`${API_BASE}/transactions`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                listing_id: listingId,
                payment_method: paymentMethod
            })
        });
        
        if (response.ok) {
            alert('Purchase successful! Transaction created.');
            bootstrap.Modal.getInstance(document.getElementById('listingDetailModal')).hide();
            loadListings();
        } else {
            alert('Purchase failed. Please try again.');
        }
    } catch (error) {
        console.error('Error creating transaction:', error);
        alert('Purchase failed. Please try again.');
    }
}

// Load auctions
async function loadAuctions() {
    try {
        const response = await fetch(`${API_BASE}/auctions?limit=50`);
        const auctions = await response.json();
        
        const container = document.getElementById('auctions-container');
        container.innerHTML = '';
        
        auctions.forEach(auction => {
            const card = createAuctionCard(auction);
            container.appendChild(card);
        });
    } catch (error) {
        console.error('Error loading auctions:', error);
    }
}

// Create auction card
function createAuctionCard(auction) {
    const col = document.createElement('div');
    col.className = 'col-md-4 mb-4';
    
    const endTime = new Date(auction.end_time);
    const now = new Date();
    const timeLeft = Math.max(0, Math.floor((endTime - now) / 1000 / 60));
    
    col.innerHTML = `
        <div class="card h-100 border-info">
            <img src="${auction.image_url || 'https://via.placeholder.com/400x300'}" class="card-img-top" alt="${auction.title}">
            <div class="card-body">
                <h5 class="card-title">${auction.title}</h5>
                <p class="card-text">${auction.description.substring(0, 100)}...</p>
                <div class="d-flex justify-content-between align-items-center mb-2">
                    <span class="badge bg-info">${auction.category}</span>
                    <span class="badge bg-success">Current: $${auction.current_price}</span>
                </div>
                <small class="text-muted"><i class="fas fa-clock"></i> ${timeLeft} minutes left</small>
            </div>
            <div class="card-footer">
                <button class="btn btn-sm btn-primary w-100" onclick="placeBid(${auction.id}, ${auction.current_price})">Place Bid</button>
            </div>
        </div>
    `;
    
    return col;
}

// Place bid
async function placeBid(auctionId, currentPrice) {
    if (!currentUser) {
        alert('Please login to place a bid');
        return;
    }
    
    const bidAmount = prompt(`Current price: $${currentPrice}\nEnter your bid amount:`);
    if (!bidAmount) return;
    
    const amount = parseFloat(bidAmount);
    if (amount <= currentPrice) {
        alert('Bid must be higher than current price');
        return;
    }
    
    try {
        const token = localStorage.getItem('access_token');
        const response = await fetch(`${API_BASE}/auctions/${auctionId}/bid`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ amount })
        });
        
        if (response.ok) {
            alert('Bid placed successfully!');
            loadAuctions();
        } else {
            alert('Failed to place bid. Please try again.');
        }
    } catch (error) {
        console.error('Error placing bid:', error);
        alert('Failed to place bid. Please try again.');
    }
}

// Handle create listing
async function handleCreateListing(e) {
    e.preventDefault();
    
    if (!currentUser) {
        alert('Please login to create a listing');
        return;
    }
    
    const formData = new FormData(e.target);
    const data = {
        title: formData.get('title'),
        description: formData.get('description'),
        price: parseFloat(formData.get('price')),
        category: formData.get('category'),
        image_url: formData.get('image_url') || null,
        listing_type: formData.get('listing_type') || 'one-time'
    };
    
    try {
        const token = localStorage.getItem('access_token');
        const response = await fetch(`${API_BASE}/listings`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });
        
        if (response.ok) {
            alert('Listing created successfully!');
            bootstrap.Modal.getInstance(document.getElementById('createListingModal')).hide();
            e.target.reset();
            loadListings();
        } else {
            alert('Failed to create listing. Please try again.');
        }
    } catch (error) {
        console.error('Error creating listing:', error);
        alert('Failed to create listing. Please try again.');
    }
}

// Handle create auction
async function handleCreateAuction(e) {
    e.preventDefault();
    
    if (!currentUser) {
        alert('Please login to create an auction');
        return;
    }
    
    const formData = new FormData(e.target);
    const data = {
        title: formData.get('title'),
        description: formData.get('description'),
        starting_price: parseFloat(formData.get('starting_price')),
        reserve_price: formData.get('reserve_price') ? parseFloat(formData.get('reserve_price')) : null,
        category: formData.get('category'),
        end_time: new Date(formData.get('end_time')).toISOString(),
        image_url: formData.get('image_url') || null
    };
    
    try {
        const token = localStorage.getItem('access_token');
        const response = await fetch(`${API_BASE}/auctions`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });
        
        if (response.ok) {
            alert('Auction created successfully!');
            bootstrap.Modal.getInstance(document.getElementById('createAuctionModal')).hide();
            e.target.reset();
            loadAuctions();
        } else {
            alert('Failed to create auction. Please try again.');
        }
    } catch (error) {
        console.error('Error creating auction:', error);
        alert('Failed to create auction. Please try again.');
    }
}

// Load stats
async function loadStats() {
    try {
        // Load public stats (would need to create a public endpoint)
        const [listings, auctions] = await Promise.all([
            fetch(`${API_BASE}/listings?limit=1000`).then(r => r.json()),
            fetch(`${API_BASE}/auctions?limit=1000`).then(r => r.json())
        ]);
        
        document.getElementById('stats-listings').textContent = listings.length;
        document.getElementById('stats-auctions').textContent = auctions.length;
    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

// Update unread message count
async function updateUnreadCount() {
    if (!currentUser) return;
    
    try {
        const token = localStorage.getItem('access_token');
        const response = await fetch(`${API_BASE}/messages`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
            const messages = await response.json();
            const unread = messages.filter(m => !m.is_read && m.receiver_id === currentUser.id).length;
            document.getElementById('unread-count').textContent = unread;
        }
    } catch (error) {
        console.error('Error loading messages:', error);
    }
}

// Show user profile
function showProfile() {
    const modal = new bootstrap.Modal(document.getElementById('dashboardModal'));
    modal.show();
    loadDashboardData();
}

// Show my listings
function showMyListings() {
    const modal = new bootstrap.Modal(document.getElementById('dashboardModal'));
    modal.show();
    document.querySelector('[data-bs-target="#tab-active-listings"]').click();
    loadDashboardData();
}

// Show transactions
function showTransactions() {
    const modal = new bootstrap.Modal(document.getElementById('dashboardModal'));
    modal.show();
    document.querySelector('[data-bs-target="#tab-purchases"]').click();
    loadDashboardData();
}

// Load dashboard data
async function loadDashboardData() {
    const token = localStorage.getItem('access_token');
    if (!token || !currentUser) return;
    
    try {
        // Load user's listings
        const listingsResponse = await fetch(`${API_BASE}/listings?seller_id=${currentUser.id}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (listingsResponse.ok) {
            const listings = await listingsResponse.json();
            displayDashboardListings(listings);
        }
        
        // Load user's bids
        // Note: This would need a backend endpoint to get user's bids
        
        // Load purchase history
        const transactionsResponse = await fetch(`${API_BASE}/transactions`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (transactionsResponse.ok) {
            const transactions = await transactionsResponse.json();
            displayDashboardPurchases(transactions);
        }
        
        // Load reviews
        const reviewsResponse = await fetch(`${API_BASE}/reviews/user/${currentUser.id}`);
        if (reviewsResponse.ok) {
            const reviews = await reviewsResponse.json();
            displayDashboardReviews(reviews);
        }
    } catch (error) {
        console.error('Error loading dashboard:', error);
    }
}

// Display dashboard listings
function displayDashboardListings(listings) {
    const container = document.getElementById('dashboard-listings-container');
    if (listings.length === 0) {
        container.innerHTML = '<p class="text-muted">No active listings</p>';
        return;
    }
    
    container.innerHTML = listings.map(listing => `
        <div class="card mb-3">
            <div class="card-body">
                <div class="row">
                    <div class="col-md-8">
                        <h5>${escapeHtml(listing.title)}</h5>
                        <p class="text-muted mb-2">${escapeHtml(listing.description.substring(0, 100))}...</p>
                        <span class="badge bg-primary">${escapeHtml(listing.category)}</span>
                        <span class="badge bg-success">$${escapeHtml(listing.price)}</span>
                        <span class="badge bg-info">${escapeHtml(listing.views)} views</span>
                    </div>
                    <div class="col-md-4 text-end">
                        <button class="btn btn-sm btn-outline-primary" onclick="editListing(${listing.id})">Edit</button>
                        <button class="btn btn-sm btn-outline-danger" onclick="deleteListing(${listing.id})">Delete</button>
                    </div>
                </div>
            </div>
        </div>
    `).join('');
}

// Display dashboard purchases
function displayDashboardPurchases(transactions) {
    const container = document.getElementById('dashboard-purchases-container');
    if (transactions.length === 0) {
        container.innerHTML = '<p class="text-muted">No purchase history</p>';
        return;
    }
    
    container.innerHTML = transactions.map(tx => `
        <div class="card mb-3">
            <div class="card-body">
                <div class="row">
                    <div class="col-md-8">
                        <h6>Order #${escapeHtml(tx.id)}</h6>
                        <p class="mb-0">Amount: $${escapeHtml(tx.amount)}</p>
                        <p class="mb-0">Status: <span class="badge bg-${tx.status === 'completed' ? 'success' : 'warning'}">${escapeHtml(tx.status)}</span></p>
                        <small class="text-muted">${escapeHtml(new Date(tx.created_at).toLocaleDateString())}</small>
                    </div>
                    <div class="col-md-4 text-end">
                        ${tx.status === 'completed' ? '<button class="btn btn-sm btn-outline-primary" onclick="leaveReview(' + tx.id + ')">Leave Review</button>' : ''}
                    </div>
                </div>
            </div>
        </div>
    `).join('');
}

// Display dashboard reviews
function displayDashboardReviews(reviews) {
    const container = document.getElementById('dashboard-reviews-container');
    if (reviews.length === 0) {
        container.innerHTML = '<p class="text-muted">No reviews yet</p>';
        return;
    }
    
    container.innerHTML = reviews.map(review => `
        <div class="card mb-3">
            <div class="card-body">
                <div class="review-stars">${'★'.repeat(review.rating)}${'☆'.repeat(5 - review.rating)}</div>
                <p class="mb-2">${escapeHtml(review.comment) || 'No comment'}</p>
                <small class="text-muted">${escapeHtml(new Date(review.created_at).toLocaleDateString())}</small>
            </div>
        </div>
    `).join('');
}

// Search listings from hero search bar
function searchListings() {
    const query = document.getElementById('hero-search').value;
    const category = document.getElementById('hero-category').value;
    
    // Filter listings based on search
    loadListings(query, category);
    
    // Scroll to listings section
    document.getElementById('listings').scrollIntoView({ behavior: 'smooth' });
}

// Filter by price
function filterByPrice(min, max) {
    // This would need to be implemented with backend support
    console.log(`Filtering by price: $${min} - $${max}`);
    alert(`Price filter: $${min} - $${max} (Backend integration needed)`);
}

// Filter by type
function filterByType(type) {
    console.log(`Filtering by type: ${type}`);
    alert(`Type filter: ${type} (Backend integration needed)`);
}

// Sort listings
function sortListings(sortBy) {
    console.log(`Sorting by: ${sortBy}`);
    // This would need to be implemented with backend support
    alert(`Sort by ${sortBy} (Backend integration needed)`);
}

// Social login placeholder
function socialLogin(provider) {
    alert(`Social login with ${provider} is not yet configured. This requires OAuth setup.`);
}

// Contact seller
function contactSeller() {
    const modal = new bootstrap.Modal(document.getElementById('messagesModal'));
    modal.show();
}

// View seller profile
function viewSellerProfile() {
    alert('Seller profile view (To be implemented)');
}

// Buy now
function buyNow() {
    alert('Checkout flow (To be implemented with crypto wallet integration)');
}

// Book service
function bookService() {
    alert('Service booking calendar (To be implemented)');
}

// Place bid
function placeBid() {
    const amount = prompt('Enter bid amount:');
    if (amount) {
        alert(`Bid placed: $${amount} (Integration needed)`);
    }
}

// Toggle auto-bid
function toggleAutoBid() {
    alert('Auto-bid feature (To be implemented)');
}

// Add to watchlist
function addToWatchlist() {
    alert('Added to watchlist (To be implemented)');
}

// Leave review
function leaveReview(transactionId) {
    const rating = prompt('Rate your experience (1-5 stars):');
    const comment = prompt('Leave a comment (optional):');
    if (rating) {
        alert(`Review submitted: ${rating} stars (Integration needed)`);
    }
}

// Edit listing
async function editListing(listingId) {
    alert(`Edit listing ${listingId} (To be implemented)`);
}

// Delete listing
async function deleteListing(listingId) {
    if (!confirm('Are you sure you want to delete this listing?')) return;
    
    const token = localStorage.getItem('access_token');
    try {
        const response = await fetch(`${API_BASE}/listings/${listingId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
            alert('Listing deleted successfully');
            loadDashboardData();
        } else {
            alert('Failed to delete listing');
        }
    } catch (error) {
        console.error('Error deleting listing:', error);
    }
}

// Load featured listings
async function loadFeaturedListings() {
    try {
        const response = await fetch(`${API_BASE}/listings?featured=true`);
        if (response.ok) {
            const listings = await response.json();
            displayFeaturedListings(listings);
        }
    } catch (error) {
        console.error('Error loading featured listings:', error);
    }
}

// Display featured listings
function displayFeaturedListings(listings) {
    const container = document.getElementById('featured-container');
    if (listings.length === 0) {
        container.innerHTML = '<p class="text-muted">No featured listings available</p>';
        return;
    }
    
    container.innerHTML = listings.slice(0, 4).map(listing => `
        <div class="col-md-3 mb-3">
            <div class="card h-100">
                ${listing.image_url ? `<img src="${escapeHtml(listing.image_url)}" class="card-img-top" alt="${escapeHtml(listing.title)}">` : ''}
                <span class="badge bg-warning position-absolute top-0 end-0 m-2">Featured</span>
                <div class="card-body">
                    <h5 class="card-title">${escapeHtml(listing.title)}</h5>
                    <p class="card-text">${escapeHtml(listing.description.substring(0, 80))}...</p>
                    <p class="card-text"><strong>$${escapeHtml(listing.price)}</strong></p>
                    <button class="btn btn-primary btn-sm w-100" onclick="viewListing(${listing.id})">View Details</button>
                </div>
            </div>
        </div>
    `).join('');
}

// Handle listing type toggle
document.addEventListener('DOMContentLoaded', function() {
    const listingTypeInputs = document.querySelectorAll('input[name="listing_type"]');
    const serviceFields = document.getElementById('service-fields');
    const priceHint = document.getElementById('price-hint');
    
    listingTypeInputs.forEach(input => {
        input.addEventListener('change', function() {
            if (this.value === 'recurring') {
                serviceFields.style.display = 'block';
                priceHint.textContent = 'Price per booking';
            } else {
                serviceFields.style.display = 'none';
                priceHint.textContent = 'One-time purchase price';
            }
        });
    });
    
    // Load featured listings on page load
    loadFeaturedListings();
    
    // Handle support form
    const supportForm = document.getElementById('supportContactForm');
    if (supportForm) {
        supportForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            const formData = new FormData(e.target);
            const token = localStorage.getItem('access_token');
            
            if (!token) {
                alert('Please login to submit a support ticket');
                return;
            }
            
            const data = {
                subject: formData.get('subject'),
                message: formData.get('message')
            };
            
            try {
                const response = await fetch(`${API_BASE}/support-tickets`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify(data)
                });
                
                if (response.ok) {
                    alert('Support ticket submitted successfully! We will get back to you soon.');
                    e.target.reset();
                } else {
                    alert('Failed to submit support ticket. Please try again.');
                }
            } catch (error) {
                console.error('Error submitting support ticket:', error);
            }
        });
    }
    
    // Handle forgot password form
    const forgotPasswordForm = document.getElementById('forgotPasswordForm');
    if (forgotPasswordForm) {
        forgotPasswordForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const email = e.target.querySelector('input[name="email"]').value;
            alert(`Password reset link would be sent to ${email} (Email service not configured)`);
            bootstrap.Modal.getInstance(document.getElementById('forgotPasswordModal')).hide();
        });
    }
});

// API Base URL
const API_BASE = '/api';
let currentUser = null;

// Initialize admin panel
document.addEventListener('DOMContentLoaded', function() {
    checkAuth();
    loadDashboard();
    
    // Setup form handler
    const resolveForm = document.getElementById('resolveDisputeForm');
    if (resolveForm) {
        resolveForm.addEventListener('submit', handleResolveDispute);
    }
});

// Check authentication
async function checkAuth() {
    const token = localStorage.getItem('access_token');
    if (!token) {
        window.location.href = '/';
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/auth/me`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            currentUser = await response.json();
            if (currentUser.role !== 'admin') {
                alert('Admin access required');
                window.location.href = '/';
            }
        } else {
            localStorage.removeItem('access_token');
            window.location.href = '/';
        }
    } catch (error) {
        console.error('Auth check failed:', error);
        window.location.href = '/';
    }
}

// Logout
function logout() {
    localStorage.removeItem('access_token');
    window.location.href = '/';
}

// Show section
function showSection(section) {
    // Hide all sections
    document.querySelectorAll('.content-section').forEach(s => s.style.display = 'none');
    
    // Show selected section
    document.getElementById(`${section}-section`).style.display = 'block';
    
    // Update active nav link
    document.querySelectorAll('.sidebar .nav-link').forEach(link => {
        link.classList.remove('active');
    });
    event.target.classList.add('active');
    
    // Load section data
    switch(section) {
        case 'dashboard':
            loadDashboard();
            break;
        case 'users':
            loadUsers();
            break;
        case 'listings':
            loadListings();
            break;
        case 'auctions':
            loadAuctions();
            break;
        case 'disputes':
            loadDisputes();
            break;
        case 'payments':
            loadPayments();
            break;
        case 'moderation':
            loadFlaggedContent();
            break;
    }
}

// Load dashboard metrics
async function loadDashboard() {
    try {
        const token = localStorage.getItem('access_token');
        const response = await fetch(`${API_BASE}/admin/dashboard`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
            const metrics = await response.json();
            document.getElementById('metric-users').textContent = metrics.total_users;
            document.getElementById('metric-listings').textContent = metrics.active_listings;
            document.getElementById('metric-auctions').textContent = metrics.active_auctions;
            document.getElementById('metric-revenue').textContent = `$${metrics.total_revenue.toFixed(2)}`;
            document.getElementById('metric-disputes').textContent = metrics.pending_disputes;
            document.getElementById('metric-flagged').textContent = metrics.flagged_content;
        }
    } catch (error) {
        console.error('Error loading dashboard:', error);
    }
}

// Load users
async function loadUsers() {
    try {
        const token = localStorage.getItem('access_token');
        const response = await fetch(`${API_BASE}/admin/users?limit=100`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
            const users = await response.json();
            const tbody = document.getElementById('users-table-body');
            tbody.innerHTML = '';
            
            users.forEach(user => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${user.id}</td>
                    <td>${user.username}</td>
                    <td>${user.email}</td>
                    <td><span class="badge bg-info">${user.role}</span></td>
                    <td><span class="badge bg-${user.is_active ? 'success' : 'danger'}">${user.is_active ? 'Active' : 'Inactive'}</span></td>
                    <td>${new Date(user.created_at).toLocaleDateString()}</td>
                    <td>
                        <button class="btn btn-sm btn-${user.is_active ? 'warning' : 'success'}" 
                                onclick="toggleUserActive(${user.id})">
                            ${user.is_active ? 'Deactivate' : 'Activate'}
                        </button>
                    </td>
                `;
                tbody.appendChild(row);
            });
        }
    } catch (error) {
        console.error('Error loading users:', error);
    }
}

// Toggle user active status
async function toggleUserActive(userId) {
    if (!confirm('Are you sure you want to toggle this user\'s status?')) return;
    
    try {
        const token = localStorage.getItem('access_token');
        const response = await fetch(`${API_BASE}/admin/users/${userId}/toggle-active`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
            loadUsers();
        } else {
            alert('Failed to update user status');
        }
    } catch (error) {
        console.error('Error toggling user status:', error);
    }
}

// Load listings
async function loadListings() {
    try {
        const token = localStorage.getItem('access_token');
        const response = await fetch(`${API_BASE}/admin/listings?limit=100`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
            const listings = await response.json();
            const tbody = document.getElementById('listings-table-body');
            tbody.innerHTML = '';
            
            listings.forEach(listing => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${listing.id}</td>
                    <td>${listing.title}</td>
                    <td>$${listing.price}</td>
                    <td>${listing.category}</td>
                    <td>${listing.seller_id}</td>
                    <td><span class="badge bg-${getStatusColor(listing.status)}">${listing.status}</span></td>
                    <td>${listing.views}</td>
                    <td>
                        ${!listing.is_flagged ? 
                            `<button class="btn btn-sm btn-warning" onclick="flagListing(${listing.id})">Flag</button>` :
                            `<span class="badge bg-danger">Flagged</span>`
                        }
                    </td>
                `;
                tbody.appendChild(row);
            });
        }
    } catch (error) {
        console.error('Error loading listings:', error);
    }
}

// Flag listing
async function flagListing(listingId) {
    if (!confirm('Are you sure you want to flag this listing?')) return;
    
    try {
        const token = localStorage.getItem('access_token');
        const response = await fetch(`${API_BASE}/admin/listings/${listingId}/flag`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
            loadListings();
        } else {
            alert('Failed to flag listing');
        }
    } catch (error) {
        console.error('Error flagging listing:', error);
    }
}

// Load auctions
async function loadAuctions() {
    try {
        const token = localStorage.getItem('access_token');
        const response = await fetch(`${API_BASE}/auctions?limit=100`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
            const auctions = await response.json();
            const tbody = document.getElementById('auctions-table-body');
            tbody.innerHTML = '';
            
            auctions.forEach(auction => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${auction.id}</td>
                    <td>${auction.title}</td>
                    <td>$${auction.current_price}</td>
                    <td>${auction.category}</td>
                    <td><span class="badge bg-${getStatusColor(auction.status)}">${auction.status}</span></td>
                    <td>${new Date(auction.end_time).toLocaleString()}</td>
                    <td>
                        <button class="btn btn-sm btn-info" onclick="viewAuctionBids(${auction.id})">View Bids</button>
                    </td>
                `;
                tbody.appendChild(row);
            });
        }
    } catch (error) {
        console.error('Error loading auctions:', error);
    }
}

// View auction bids
async function viewAuctionBids(auctionId) {
    try {
        const token = localStorage.getItem('access_token');
        const response = await fetch(`${API_BASE}/auctions/${auctionId}/bids`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
            const bids = await response.json();
            let message = `Bids for Auction #${auctionId}:\n\n`;
            bids.forEach((bid, i) => {
                message += `${i+1}. $${bid.amount} by User #${bid.bidder_id} at ${new Date(bid.created_at).toLocaleString()}\n`;
            });
            alert(message || 'No bids yet');
        }
    } catch (error) {
        console.error('Error loading bids:', error);
    }
}

// Load disputes
async function loadDisputes() {
    try {
        const token = localStorage.getItem('access_token');
        const response = await fetch(`${API_BASE}/admin/disputes?limit=100`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
            const disputes = await response.json();
            const container = document.getElementById('disputes-container');
            container.innerHTML = '';
            
            if (disputes.length === 0) {
                container.innerHTML = '<div class="alert alert-success">No disputes found</div>';
                return;
            }
            
            disputes.forEach(dispute => {
                const card = document.createElement('div');
                card.className = 'card mb-3';
                card.innerHTML = `
                    <div class="card-header">
                        <strong>Dispute #${dispute.id}</strong>
                        <span class="badge bg-${getDisputeStatusColor(dispute.status)} float-end">${dispute.status}</span>
                    </div>
                    <div class="card-body">
                        <p><strong>Transaction ID:</strong> ${dispute.transaction_id}</p>
                        <p><strong>Reported By:</strong> User #${dispute.reported_by}</p>
                        <p><strong>Reason:</strong> ${dispute.reason}</p>
                        <p><strong>Created:</strong> ${new Date(dispute.created_at).toLocaleString()}</p>
                        ${dispute.resolution ? `<p><strong>Resolution:</strong> ${dispute.resolution}</p>` : ''}
                        ${dispute.status === 'open' ? 
                            `<button class="btn btn-primary" onclick="showResolveDisputeModal(${dispute.id})">Resolve Dispute</button>` :
                            ''
                        }
                    </div>
                `;
                container.appendChild(card);
            });
        }
    } catch (error) {
        console.error('Error loading disputes:', error);
    }
}

// Show resolve dispute modal
function showResolveDisputeModal(disputeId) {
    document.getElementById('dispute-id').value = disputeId;
    const modal = new bootstrap.Modal(document.getElementById('resolveDisputeModal'));
    modal.show();
}

// Handle resolve dispute
async function handleResolveDispute(e) {
    e.preventDefault();
    
    const disputeId = document.getElementById('dispute-id').value;
    const resolution = document.getElementById('resolution-text').value;
    
    try {
        const token = localStorage.getItem('access_token');
        const response = await fetch(`${API_BASE}/admin/disputes/${disputeId}/resolve?resolution=${encodeURIComponent(resolution)}`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
            alert('Dispute resolved successfully');
            bootstrap.Modal.getInstance(document.getElementById('resolveDisputeModal')).hide();
            e.target.reset();
            loadDisputes();
        } else {
            alert('Failed to resolve dispute');
        }
    } catch (error) {
        console.error('Error resolving dispute:', error);
        alert('Failed to resolve dispute');
    }
}

// Load payments
async function loadPayments() {
    try {
        const token = localStorage.getItem('access_token');
        const response = await fetch(`${API_BASE}/admin/payments?limit=100`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
            const payments = await response.json();
            const tbody = document.getElementById('payments-table-body');
            tbody.innerHTML = '';
            
            payments.forEach(payment => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${payment.id}</td>
                    <td>${payment.user_id}</td>
                    <td>$${payment.amount}</td>
                    <td><span class="badge bg-warning">${payment.currency}</span></td>
                    <td>${payment.payment_type}</td>
                    <td><span class="badge bg-${payment.status === 'completed' ? 'success' : 'warning'}">${payment.status}</span></td>
                    <td>${new Date(payment.created_at).toLocaleString()}</td>
                `;
                tbody.appendChild(row);
            });
        }
    } catch (error) {
        console.error('Error loading payments:', error);
    }
}

// Load flagged content
async function loadFlaggedContent() {
    try {
        const token = localStorage.getItem('access_token');
        const response = await fetch(`${API_BASE}/admin/listings?limit=100`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
            const listings = await response.json();
            const flagged = listings.filter(l => l.is_flagged);
            
            const container = document.getElementById('flagged-content-container');
            container.innerHTML = '';
            
            if (flagged.length === 0) {
                container.innerHTML = '<div class="alert alert-success">No flagged content</div>';
                return;
            }
            
            flagged.forEach(listing => {
                const card = document.createElement('div');
                card.className = 'card mb-3';
                card.innerHTML = `
                    <div class="card-header">
                        <strong>Listing #${listing.id}: ${listing.title}</strong>
                        <span class="badge bg-danger float-end">Flagged</span>
                    </div>
                    <div class="card-body">
                        <p><strong>Description:</strong> ${listing.description}</p>
                        <p><strong>Category:</strong> ${listing.category}</p>
                        <p><strong>Price:</strong> $${listing.price}</p>
                        <p><strong>Seller ID:</strong> ${listing.seller_id}</p>
                        <div class="btn-group">
                            <button class="btn btn-success btn-sm">Approve</button>
                            <button class="btn btn-danger btn-sm">Remove</button>
                        </div>
                    </div>
                `;
                container.appendChild(card);
            });
        }
    } catch (error) {
        console.error('Error loading flagged content:', error);
    }
}

// Helper function to get status color
function getStatusColor(status) {
    const colors = {
        'active': 'success',
        'sold': 'secondary',
        'inactive': 'warning',
        'flagged': 'danger',
        'ended': 'secondary',
        'cancelled': 'danger'
    };
    return colors[status] || 'secondary';
}

// Helper function to get dispute status color
function getDisputeStatusColor(status) {
    const colors = {
        'open': 'danger',
        'in_progress': 'warning',
        'resolved': 'success'
    };
    return colors[status] || 'secondary';
}

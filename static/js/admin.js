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
        case 'activities':
            loadActivities();
            break;
        case 'categories':
            loadCategories();
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
                const lastLogin = user.last_login ? new Date(user.last_login).toLocaleString() : 'Never';
                row.innerHTML = `
                    <td><input type="checkbox" class="user-checkbox" value="${user.id}"></td>
                    <td>${user.id}</td>
                    <td>${user.username}</td>
                    <td>${user.email}</td>
                    <td><span class="badge bg-info">${user.role}</span></td>
                    <td><span class="badge bg-${user.is_active ? 'success' : 'danger'}">${user.is_active ? 'Active' : 'Banned'}</span></td>
                    <td>${new Date(user.created_at).toLocaleDateString()}</td>
                    <td>${lastLogin}</td>
                    <td>
                        <div class="btn-group btn-group-sm">
                            <button class="btn btn-info" onclick="viewUserDetails(${user.id})" title="View Details">
                                <i class="fas fa-eye"></i>
                            </button>
                            <button class="btn btn-primary" onclick="editUser(${user.id})" title="Edit">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn btn-${user.is_active ? 'warning' : 'success'}" 
                                    onclick="toggleUserActive(${user.id})" title="${user.is_active ? 'Ban' : 'Unban'}">
                                <i class="fas fa-${user.is_active ? 'ban' : 'check'}"></i>
                            </button>
                            ${user.role !== 'admin' ? `
                                <button class="btn btn-danger" onclick="deleteUser(${user.id})" title="Delete">
                                    <i class="fas fa-trash"></i>
                                </button>
                            ` : ''}
                        </div>
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
                    <td>${listing.category}</td>
                    <td>${listing.seller_id}</td>
                    <td>$${listing.price}</td>
                    <td><span class="badge bg-${getStatusColor(listing.status)}">${listing.status}</span></td>
                    <td><span class="badge bg-secondary">${listing.listing_type || 'one-time'}</span></td>
                    <td>${new Date(listing.created_at).toLocaleDateString()}</td>
                    <td>
                        <div class="btn-group btn-group-sm">
                            <button class="btn btn-${listing.is_featured ? 'success' : 'secondary'}" 
                                    onclick="toggleFeatureListing(${listing.id})" 
                                    title="${listing.is_featured ? 'Unfeature' : 'Feature'}">
                                <i class="fas fa-star"></i>
                            </button>
                            ${!listing.is_flagged ? 
                                `<button class="btn btn-warning" onclick="flagListing(${listing.id})" title="Flag">
                                    <i class="fas fa-flag"></i>
                                </button>` :
                                `<span class="badge bg-danger">Flagged</span>`
                            }
                        </div>
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
            
            for (const auction of auctions) {
                // Get bids for this auction to find highest bidder
                const bidsResponse = await fetch(`${API_BASE}/auctions/${auction.id}/bids`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                let highestBidder = 'None';
                if (bidsResponse.ok) {
                    const bids = await bidsResponse.json();
                    if (bids.length > 0) {
                        highestBidder = `User #${bids[0].bidder_id}`;
                    }
                }
                
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${auction.id}</td>
                    <td>${auction.title}</td>
                    <td>$${auction.current_price}</td>
                    <td>${highestBidder}</td>
                    <td>${new Date(auction.end_time).toLocaleString()}</td>
                    <td><span class="badge bg-${getStatusColor(auction.status)}">${auction.status}</span></td>
                    <td>
                        <div class="btn-group btn-group-sm">
                            <button class="btn btn-info" onclick="viewAuctionBids(${auction.id})" title="View Bids">
                                <i class="fas fa-history"></i>
                            </button>
                            ${auction.status === 'active' ? `
                                <button class="btn btn-primary" onclick="showExtendAuctionModal(${auction.id})" title="Extend">
                                    <i class="fas fa-clock"></i>
                                </button>
                                <button class="btn btn-danger" onclick="cancelAuction(${auction.id})" title="Cancel">
                                    <i class="fas fa-times"></i>
                                </button>
                            ` : ''}
                        </div>
                    </td>
                `;
                tbody.appendChild(row);
            }
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

// ==================== USER MANAGEMENT FUNCTIONS ====================

function toggleSelectAll() {
    const selectAll = document.getElementById('select-all-users');
    const checkboxes = document.querySelectorAll('.user-checkbox');
    checkboxes.forEach(cb => cb.checked = selectAll.checked);
}

async function viewUserDetails(userId) {
    try {
        const token = localStorage.getItem('access_token');
        const response = await fetch(`${API_BASE}/admin/users/${userId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
            const user = await response.json();
            const content = document.getElementById('user-details-content');
            content.innerHTML = `
                <div class="row">
                    <div class="col-md-6">
                        <p><strong>ID:</strong> ${user.id}</p>
                        <p><strong>Username:</strong> ${user.username}</p>
                        <p><strong>Email:</strong> ${user.email}</p>
                        <p><strong>Role:</strong> <span class="badge bg-info">${user.role}</span></p>
                    </div>
                    <div class="col-md-6">
                        <p><strong>Status:</strong> <span class="badge bg-${user.is_active ? 'success' : 'danger'}">${user.is_active ? 'Active' : 'Banned'}</span></p>
                        <p><strong>Verified:</strong> ${user.is_verified ? 'Yes' : 'No'}</p>
                        <p><strong>Registration Date:</strong> ${new Date(user.created_at).toLocaleString()}</p>
                        <p><strong>Last Login:</strong> ${user.last_login ? new Date(user.last_login).toLocaleString() : 'Never'}</p>
                    </div>
                </div>
            `;
            const modal = new bootstrap.Modal(document.getElementById('viewUserModal'));
            modal.show();
        }
    } catch (error) {
        console.error('Error loading user details:', error);
    }
}

function editUser(userId) {
    // For now, just show an alert. In a full implementation, this would open an edit modal
    alert('Edit user functionality - to be implemented with a proper form');
}

async function deleteUser(userId) {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) return;
    
    try {
        const token = localStorage.getItem('access_token');
        const response = await fetch(`${API_BASE}/admin/users/${userId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
            alert('User deleted successfully');
            loadUsers();
        } else {
            alert('Failed to delete user');
        }
    } catch (error) {
        console.error('Error deleting user:', error);
    }
}

async function bulkBanUsers() {
    const checkboxes = document.querySelectorAll('.user-checkbox:checked');
    if (checkboxes.length === 0) {
        alert('Please select users to ban');
        return;
    }
    
    if (!confirm(`Ban ${checkboxes.length} selected user(s)?`)) return;
    
    for (const checkbox of checkboxes) {
        await toggleUserActive(parseInt(checkbox.value));
    }
    loadUsers();
}

async function bulkUnbanUsers() {
    const checkboxes = document.querySelectorAll('.user-checkbox:checked');
    if (checkboxes.length === 0) {
        alert('Please select users to unban');
        return;
    }
    
    if (!confirm(`Unban ${checkboxes.length} selected user(s)?`)) return;
    
    for (const checkbox of checkboxes) {
        await toggleUserActive(parseInt(checkbox.value));
    }
    loadUsers();
}

function searchUsers() {
    const searchTerm = document.getElementById('user-search').value.toLowerCase();
    const rows = document.querySelectorAll('#users-table-body tr');
    
    rows.forEach(row => {
        const text = row.textContent.toLowerCase();
        row.style.display = text.includes(searchTerm) ? '' : 'none';
    });
}

// ==================== ACTIVITY LOG FUNCTIONS ====================

async function loadActivities() {
    try {
        const token = localStorage.getItem('access_token');
        const response = await fetch(`${API_BASE}/admin/activities?limit=100`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
            const activities = await response.json();
            const tbody = document.getElementById('activities-table-body');
            tbody.innerHTML = '';
            
            activities.forEach(activity => {
                const row = document.createElement('tr');
                row.className = activity.is_suspicious ? 'table-warning' : '';
                row.innerHTML = `
                    <td>${activity.id}</td>
                    <td>User #${activity.user_id}</td>
                    <td><span class="badge bg-primary">${activity.action}</span></td>
                    <td>${activity.description || '-'}</td>
                    <td>${new Date(activity.created_at).toLocaleString()}</td>
                    <td>${activity.ip_address || '-'}</td>
                    <td>
                        ${!activity.is_suspicious ? 
                            `<button class="btn btn-sm btn-warning" onclick="flagActivity(${activity.id})" title="Flag as Suspicious">
                                <i class="fas fa-flag"></i>
                            </button>` :
                            `<span class="badge bg-danger">Suspicious</span>`
                        }
                    </td>
                `;
                tbody.appendChild(row);
            });
        }
    } catch (error) {
        console.error('Error loading activities:', error);
    }
}

async function flagActivity(activityId) {
    if (!confirm('Flag this activity as suspicious?')) return;
    
    try {
        const token = localStorage.getItem('access_token');
        const response = await fetch(`${API_BASE}/admin/activities/${activityId}/flag`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
            loadActivities();
        } else {
            alert('Failed to flag activity');
        }
    } catch (error) {
        console.error('Error flagging activity:', error);
    }
}

function filterActivities() {
    const filter = document.getElementById('activity-filter').value;
    // Reload with filter
    loadActivities(); // In a full implementation, pass the filter parameter
}

// ==================== CATEGORY MANAGEMENT FUNCTIONS ====================

async function loadCategories() {
    try {
        const token = localStorage.getItem('access_token');
        const response = await fetch(`${API_BASE}/categories?limit=100&active_only=false`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
            const categories = await response.json();
            const tbody = document.getElementById('categories-table-body');
            tbody.innerHTML = '';
            
            categories.forEach(category => {
                const parentName = category.parent_id ? `Category #${category.parent_id}` : 'None';
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${category.id}</td>
                    <td>${category.name}</td>
                    <td>${parentName}</td>
                    <td>${category.description || '-'}</td>
                    <td><span class="badge bg-${category.is_active ? 'success' : 'secondary'}">${category.is_active ? 'Active' : 'Inactive'}</span></td>
                    <td>${category.order}</td>
                    <td>
                        <div class="btn-group btn-group-sm">
                            <button class="btn btn-primary" onclick="editCategory(${category.id})" title="Edit">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn btn-danger" onclick="deleteCategory(${category.id})" title="Delete">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </td>
                `;
                tbody.appendChild(row);
            });
            
            // Update parent category dropdown
            updateCategoryParentDropdown(categories);
        }
    } catch (error) {
        console.error('Error loading categories:', error);
    }
}

function updateCategoryParentDropdown(categories) {
    const select = document.getElementById('category-parent');
    select.innerHTML = '<option value="">None (Root Category)</option>';
    
    categories.forEach(category => {
        const option = document.createElement('option');
        option.value = category.id;
        option.textContent = category.name;
        select.appendChild(option);
    });
}

function showAddCategoryModal() {
    document.getElementById('categoryModalTitle').textContent = 'Add Category';
    document.getElementById('categoryForm').reset();
    document.getElementById('category-id').value = '';
    const modal = new bootstrap.Modal(document.getElementById('categoryModal'));
    modal.show();
}

async function editCategory(categoryId) {
    try {
        const token = localStorage.getItem('access_token');
        const response = await fetch(`${API_BASE}/categories/${categoryId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
            const category = await response.json();
            document.getElementById('categoryModalTitle').textContent = 'Edit Category';
            document.getElementById('category-id').value = category.id;
            document.getElementById('category-name').value = category.name;
            document.getElementById('category-description').value = category.description || '';
            document.getElementById('category-parent').value = category.parent_id || '';
            document.getElementById('category-order').value = category.order;
            document.getElementById('category-active').checked = category.is_active;
            
            const modal = new bootstrap.Modal(document.getElementById('categoryModal'));
            modal.show();
        }
    } catch (error) {
        console.error('Error loading category:', error);
    }
}

async function deleteCategory(categoryId) {
    if (!confirm('Are you sure you want to delete this category?')) return;
    
    try {
        const token = localStorage.getItem('access_token');
        const response = await fetch(`${API_BASE}/admin/categories/${categoryId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
            loadCategories();
        } else {
            const error = await response.json();
            alert(error.detail || 'Failed to delete category');
        }
    } catch (error) {
        console.error('Error deleting category:', error);
    }
}

// Handle category form submission
document.addEventListener('DOMContentLoaded', function() {
    const categoryForm = document.getElementById('categoryForm');
    if (categoryForm) {
        categoryForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const categoryId = document.getElementById('category-id').value;
            const data = {
                name: document.getElementById('category-name').value,
                description: document.getElementById('category-description').value || null,
                parent_id: document.getElementById('category-parent').value ? parseInt(document.getElementById('category-parent').value) : null,
                order: parseInt(document.getElementById('category-order').value),
                is_active: document.getElementById('category-active').checked
            };
            
            try {
                const token = localStorage.getItem('access_token');
                const url = categoryId ? 
                    `${API_BASE}/admin/categories/${categoryId}` : 
                    `${API_BASE}/admin/categories`;
                const method = categoryId ? 'PUT' : 'POST';
                
                const response = await fetch(url, {
                    method: method,
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(data)
                });
                
                if (response.ok) {
                    alert('Category saved successfully');
                    bootstrap.Modal.getInstance(document.getElementById('categoryModal')).hide();
                    loadCategories();
                } else {
                    const error = await response.json();
                    alert(error.detail || 'Failed to save category');
                }
            } catch (error) {
                console.error('Error saving category:', error);
                alert('Failed to save category');
            }
        });
    }
});

// ==================== LISTING MANAGEMENT FUNCTIONS ====================

async function toggleFeatureListing(listingId) {
    try {
        const token = localStorage.getItem('access_token');
        const response = await fetch(`${API_BASE}/admin/listings/${listingId}/feature`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
            loadListings();
        } else {
            alert('Failed to toggle feature status');
        }
    } catch (error) {
        console.error('Error toggling feature:', error);
    }
}

// ==================== AUCTION MANAGEMENT FUNCTIONS ====================

function showExtendAuctionModal(auctionId) {
    document.getElementById('extend-auction-id').value = auctionId;
    const modal = new bootstrap.Modal(document.getElementById('extendAuctionModal'));
    modal.show();
}

async function cancelAuction(auctionId) {
    if (!confirm('Are you sure you want to cancel this auction?')) return;
    
    try {
        const token = localStorage.getItem('access_token');
        const response = await fetch(`${API_BASE}/admin/auctions/${auctionId}/cancel`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
            alert('Auction cancelled successfully');
            loadAuctions();
        } else {
            alert('Failed to cancel auction');
        }
    } catch (error) {
        console.error('Error cancelling auction:', error);
    }
}

// Handle extend auction form
document.addEventListener('DOMContentLoaded', function() {
    const extendForm = document.getElementById('extendAuctionForm');
    if (extendForm) {
        extendForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const auctionId = document.getElementById('extend-auction-id').value;
            const hours = document.getElementById('extend-hours').value;
            
            try {
                const token = localStorage.getItem('access_token');
                const response = await fetch(`${API_BASE}/admin/auctions/${auctionId}/extend?hours=${hours}`, {
                    method: 'PUT',
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                
                if (response.ok) {
                    const result = await response.json();
                    alert(result.detail);
                    bootstrap.Modal.getInstance(document.getElementById('extendAuctionModal')).hide();
                    loadAuctions();
                } else {
                    alert('Failed to extend auction');
                }
            } catch (error) {
                console.error('Error extending auction:', error);
                alert('Failed to extend auction');
            }
        });
    }
});

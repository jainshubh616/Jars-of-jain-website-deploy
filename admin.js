// ================================================================
// ADMIN DASHBOARD LOGIC (SUPABASE)
// ================================================================

// IMPORTANT: Replace these with your actual Supabase project URL and anon key
const SUPABASE_URL = 'YOUR_SUPABASE_URL';
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';

let supabaseClient = null;

if (SUPABASE_URL !== 'YOUR_SUPABASE_URL') {
    supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

document.addEventListener('DOMContentLoaded', async () => {
    if (!supabaseClient) {
        document.getElementById('loginMsg').textContent = 'Supabase URL/Key not configured in admin.js';
        return;
    }

    // Check if user is already logged in
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (session) {
        showDashboard();
    }
});

document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const msg = document.getElementById('loginMsg');
    
    msg.textContent = 'Logging in...';

    const { data, error } = await supabaseClient.auth.signInWithPassword({
        email: email,
        password: password,
    });

    if (error) {
        msg.textContent = error.message;
    } else {
        showDashboard();
    }
});

async function logout() {
    await supabaseClient.auth.signOut();
    document.getElementById('dashboard-section').style.display = 'none';
    document.getElementById('logoutBtn').style.display = 'none';
    document.getElementById('auth-section').style.display = 'block';
}

function showDashboard() {
    document.getElementById('auth-section').style.display = 'none';
    document.getElementById('dashboard-section').style.display = 'block';
    document.getElementById('logoutBtn').style.display = 'inline-block';
    loadReviews();
}

async function loadReviews() {
    const tbody = document.getElementById('reviewsTableBody');
    tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;">Loading...</td></tr>';

    const { data: reviews, error } = await supabaseClient
        .from('reviews')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;color:red;">Error: ${error.message}</td></tr>`;
        return;
    }

    updateStats(reviews);
    renderTable(reviews);
}

function updateStats(reviews) {
    const total = reviews.length;
    let pending = 0;
    let approved = 0;
    let sumRating = 0;

    reviews.forEach(r => {
        if (r.status === 'pending') pending++;
        if (r.status === 'approved') {
            approved++;
            sumRating += r.rating;
        }
    });

    const avg = approved > 0 ? (sumRating / approved).toFixed(1) : 0;

    document.getElementById('statTotal').textContent = total;
    document.getElementById('statPending').textContent = pending;
    document.getElementById('statApproved').textContent = approved;
    document.getElementById('statAvg').textContent = avg;
}

function renderTable(reviews) {
    const tbody = document.getElementById('reviewsTableBody');
    tbody.innerHTML = '';

    if (reviews.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;">No reviews found.</td></tr>';
        return;
    }

    reviews.forEach(r => {
        const tr = document.createElement('tr');
        
        const dateStr = new Date(r.created_at).toLocaleDateString('en-IN');
        const imgHtml = r.image_url ? `<img src="${r.image_url}" class="review-image-thumb" onclick="window.open(this.src, '_blank')">` : 'No Image';
        
        tr.innerHTML = `
            <td>${dateStr}</td>
            <td><strong>${r.customer_name}</strong><br><small>${r.email}</small></td>
            <td>${r.product}</td>
            <td>${r.rating} / 5</td>
            <td><strong>${r.review_title}</strong><br><small>${r.review_text.substring(0, 50)}...</small></td>
            <td>${imgHtml}</td>
            <td><span class="status-badge status-${r.status}">${r.status}</span></td>
            <td class="actions">
                ${r.status !== 'approved' ? `<button class="btn btn-sm btn-success" onclick="updateStatus('${r.id}', 'approved')">Approve</button>` : ''}
                ${r.status !== 'rejected' ? `<button class="btn btn-sm btn-danger" onclick="updateStatus('${r.id}', 'rejected')">Reject</button>` : ''}
                <button class="btn btn-sm btn-danger" onclick="deleteReview('${r.id}')">Delete</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

async function updateStatus(id, newStatus) {
    if (!confirm(`Are you sure you want to ${newStatus} this review?`)) return;

    const { error } = await supabaseClient
        .from('reviews')
        .update({ status: newStatus })
        .eq('id', id);

    if (error) {
        alert('Error updating status: ' + error.message);
    } else {
        loadReviews();
    }
}

async function deleteReview(id) {
    if (!confirm(`Are you sure you want to completely delete this review? This cannot be undone.`)) return;

    const { error } = await supabaseClient
        .from('reviews')
        .delete()
        .eq('id', id);

    if (error) {
        alert('Error deleting review: ' + error.message);
    } else {
        loadReviews();
    }
}

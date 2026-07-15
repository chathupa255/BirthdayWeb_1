document.addEventListener('DOMContentLoaded', () => {
  // Config & State
  const DB_URL = 'https://kvdb.io/mia_rsvp_db_a9f3c7e48b/rsvps';
  const PASSWORD = 'secret123'; // Passcode for dashboard
  let isUnlocked = false;

  // DOM Elements
  const lockScreen = document.getElementById('lock-screen');
  const lockForm = document.getElementById('lock-form');
  const passcodeInput = document.getElementById('passcode-input');
  const lockError = document.getElementById('lock-error');
  const dashboardContainer = document.getElementById('admin-dashboard');

  const refreshBtn = document.getElementById('refresh-btn');
  const totalRsvpsDisplay = document.getElementById('stat-total-rsvps');
  const attendingCountDisplay = document.getElementById('stat-attending-count');
  const declinedCountDisplay = document.getElementById('stat-declined-count');
  const tableBody = document.getElementById('rsvp-table-body');
  const emptyState = document.getElementById('table-empty-state');

  // Check URL or SessionStorage for token bypass
  const init = () => {
    const urlParams = new URLSearchParams(window.location.search);
    const tokenFromUrl = urlParams.get('token');
    const tokenFromStorage = sessionStorage.getItem('adminToken');

    if (tokenFromUrl === PASSWORD || tokenFromStorage === PASSWORD) {
      isUnlocked = true;
      sessionStorage.setItem('adminToken', PASSWORD);
      // Clean URL parameters for safety
      window.history.replaceState({}, document.title, window.location.pathname);
      loadDashboard();
    } else {
      showLockScreen();
    }
  };

  const showLockScreen = () => {
    lockScreen.style.display = 'flex';
    dashboardContainer.style.display = 'none';
  };

  const hideLockScreen = () => {
    lockScreen.style.display = 'none';
    dashboardContainer.style.display = 'block';
  };

  // Lock form submission
  lockForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const tokenInput = passcodeInput.value.trim();
    
    if (tokenInput === PASSWORD) {
      isUnlocked = true;
      sessionStorage.setItem('adminToken', PASSWORD);
      hideLockScreen();
      loadDashboard();
    } else {
      lockError.style.display = 'block';
      passcodeInput.value = '';
    }
  });

  const loadDashboard = async () => {
    if (!isUnlocked) return;

    try {
      const res = await fetch(DB_URL);
      if (res.ok) {
        const data = await res.json();
        renderDashboardData(data);
      } else if (res.status === 404) {
        // Database is empty/doesn't exist yet
        renderDashboardData([]);
      } else {
        throw new Error('Database response error.');
      }
    } catch (err) {
      console.error('Error fetching RSVPs:', err);
      renderDashboardData([]);
    }
  };

  const renderDashboardData = (rsvps) => {
    tableBody.innerHTML = '';

    if (!rsvps || !Array.isArray(rsvps) || rsvps.length === 0) {
      totalRsvpsDisplay.innerText = '0';
      attendingCountDisplay.innerText = '0';
      declinedCountDisplay.innerText = '0';
      emptyState.style.display = 'block';
      return;
    }

    emptyState.style.display = 'none';

    let attendingCount = 0;
    let declinedCount = 0;
    let attendingHeadcount = 0;

    rsvps.forEach(rsvp => {
      if (rsvp.attending) {
        attendingCount++;
        attendingHeadcount += (rsvp.guestsCount || 1);
      } else {
        declinedCount++;
      }

      // Create table row
      const tr = document.createElement('tr');
      tr.id = `rsvp-row-${rsvp.id}`;

      // Status cell
      const statusBadge = rsvp.attending 
        ? `<span class="status-badge attending">Attending</span>`
        : `<span class="status-badge declined">Declined</span>`;

      // Guest size cell
      const partySizeCell = rsvp.attending
        ? `<span class="guest-count-badge">${rsvp.guestsCount}</span>`
        : `<span style="color: var(--text-secondary); opacity: 0.5;">-</span>`;

      // Message cell
      const messageContent = rsvp.note 
        ? escapeHtml(rsvp.note) 
        : `<span style="color: var(--text-secondary); font-style: italic; opacity: 0.5;">No message left</span>`;

      // Date formatting
      const dateFormatted = formatTimestamp(rsvp.timestamp);

      tr.innerHTML = `
        <td style="font-weight: 600;">${escapeHtml(rsvp.name)}</td>
        <td>${statusBadge}</td>
        <td>${partySizeCell}</td>
        <td style="max-width: 300px; word-wrap: break-word;">${messageContent}</td>
        <td style="font-size: 0.9rem; color: var(--text-secondary);">${dateFormatted}</td>
        <td style="text-align: center;">
          <button class="delete-btn" data-id="${rsvp.id}" title="Remove RSVP">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
          </button>
        </td>
      `;

      tableBody.appendChild(tr);
    });

    // Update Stats
    totalRsvpsDisplay.innerText = rsvps.length;
    attendingCountDisplay.innerText = attendingHeadcount;
    declinedCountDisplay.innerText = declinedCount;

    // Attach delete button event listeners
    const deleteButtons = document.querySelectorAll('.delete-btn');
    deleteButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const rsvpId = btn.getAttribute('data-id');
        deleteRsvp(rsvpId);
      });
    });
  };

  const deleteRsvp = async (id) => {
    if (!confirm('Are you sure you want to remove this RSVP entry?')) return;

    try {
      // 1. Fetch current list
      const res = await fetch(DB_URL);
      if (!res.ok) throw new Error('Could not fetch data.');
      
      let rsvps = await res.json();
      if (!Array.isArray(rsvps)) return;

      // 2. Filter out entry
      rsvps = rsvps.filter(r => r.id !== id);

      // 3. Save back using POST (Simple request format to bypass CORS preflight)
      const putRes = await fetch(DB_URL, {
        method: 'POST',
        body: JSON.stringify(rsvps)
      });

      if (putRes.ok) {
        // Remove row from UI with a nice transition
        const row = document.getElementById(`rsvp-row-${id}`);
        if (row) {
          row.style.opacity = '0';
          row.style.transform = 'scale(0.95)';
          setTimeout(() => {
            loadDashboard(); // Reload data to update numbers and tables
          }, 300);
        }
      } else {
        alert('Failed to delete RSVP from database.');
      }
    } catch (err) {
      console.error('Error deleting RSVP:', err);
      alert('Network error. Failed to delete RSVP.');
    }
  };

  // Refresh button action with temporary spin animation
  refreshBtn.addEventListener('click', async () => {
    const svgIcon = refreshBtn.querySelector('svg');
    svgIcon.style.transition = 'transform 0.6s ease';
    svgIcon.style.transform = 'rotate(360deg)';
    
    await loadDashboard();

    setTimeout(() => {
      svgIcon.style.transition = 'none';
      svgIcon.style.transform = 'rotate(0deg)';
    }, 600);
  });

  // Helpers
  const formatTimestamp = (isoString) => {
    try {
      const d = new Date(isoString);
      const options = { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
      return d.toLocaleDateString('en-US', options);
    } catch (err) {
      return isoString;
    }
  };

  const escapeHtml = (unsafe) => {
    return unsafe
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  };

  // Start initialization
  init();
});

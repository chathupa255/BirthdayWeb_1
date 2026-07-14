const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const DB_FILE = path.join(__dirname, 'db.json');
const ADMIN_TOKEN = 'secret123'; // Simple token to access admin dashboard data

// Middleware
app.use(express.json());
app.use(express.static(__dirname));

// Helper to read DB
const readDB = () => {
  try {
    if (!fs.existsSync(DB_FILE)) {
      fs.writeFileSync(DB_FILE, JSON.stringify([]));
      return [];
    }
    const data = fs.readFileSync(DB_FILE, 'utf8');
    return JSON.parse(data || '[]');
  } catch (err) {
    console.error('Error reading database:', err);
    return [];
  }
};

// Helper to write DB
const writeDB = (data) => {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
    return true;
  } catch (err) {
    console.error('Error writing database:', err);
    return false;
  }
};

// RSVP Submission Endpoint
app.post('/api/rsvp', (req, res) => {
  const { name, attending, guestsCount, note } = req.body;

  // Basic validation
  if (!name || typeof name !== 'string' || name.trim() === '') {
    return res.status(400).json({ error: 'Name is required.' });
  }
  if (typeof attending !== 'boolean') {
    return res.status(400).json({ error: 'Attendance status is required.' });
  }

  const count = attending ? parseInt(guestsCount, 10) || 1 : 0;
  
  const rsvps = readDB();
  
  // Check if this guest already submitted to update, or add new
  const existingIndex = rsvps.findIndex(r => r.name.toLowerCase() === name.trim().toLowerCase());
  
  const newRsvp = {
    id: existingIndex !== -1 ? rsvps[existingIndex].id : Date.now().toString(),
    name: name.trim(),
    attending,
    guestsCount: count,
    note: (note || '').trim(),
    timestamp: new Date().toISOString()
  };

  if (existingIndex !== -1) {
    rsvps[existingIndex] = newRsvp;
  } else {
    rsvps.push(newRsvp);
  }

  if (writeDB(rsvps)) {
    return res.json({ success: true, message: 'RSVP submitted successfully!', data: newRsvp });
  } else {
    return res.status(500).json({ error: 'Failed to save RSVP.' });
  }
});

// Admin verification middleware / endpoint check
const verifyAdminToken = (req, res, next) => {
  const token = req.query.token || req.headers['x-admin-token'];
  if (token === ADMIN_TOKEN) {
    next();
  } else {
    res.status(403).json({ error: 'Unauthorized. Invalid admin token.' });
  }
};

// Fetch all RSVPs (Admin Only)
app.get('/api/rsvps', verifyAdminToken, (req, res) => {
  const rsvps = readDB();
  res.json({ success: true, data: rsvps });
});

// Delete RSVP (Admin Only)
app.delete('/api/rsvps/:id', verifyAdminToken, (req, res) => {
  const { id } = req.params;
  let rsvps = readDB();
  const initialLength = rsvps.length;
  rsvps = rsvps.filter(r => r.id !== id);

  if (rsvps.length === initialLength) {
    return res.status(404).json({ error: 'RSVP entry not found.' });
  }

  if (writeDB(rsvps)) {
    res.json({ success: true, message: 'RSVP entry deleted successfully.' });
  } else {
    res.status(500).json({ error: 'Failed to update database.' });
  }
});

// Start Server
app.listen(PORT, () => {
  console.log(`Birthday Invitation App listening on http://localhost:${PORT}`);
  console.log(`Admin Dashboard link: http://localhost:${PORT}/admin.html?token=${ADMIN_TOKEN}`);
});

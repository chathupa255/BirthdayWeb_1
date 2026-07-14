document.addEventListener('DOMContentLoaded', () => {
  // Countdown Timer
  const partyDate = new Date('August 15, 2026 19:00:00').getTime();

  const updateCountdown = () => {
    const now = new Date().getTime();
    const distance = partyDate - now;

    if (distance < 0) {
      document.getElementById('days').innerText = '00';
      document.getElementById('hours').innerText = '00';
      document.getElementById('minutes').innerText = '00';
      document.getElementById('seconds').innerText = '00';
      return;
    }

    const days = Math.floor(distance / (1000 * 60 * 60 * 24));
    const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((distance % (1000 * 60)) / 1000);

    document.getElementById('days').innerText = String(days).padStart(2, '0');
    document.getElementById('hours').innerText = String(hours).padStart(2, '0');
    document.getElementById('minutes').innerText = String(minutes).padStart(2, '0');
    document.getElementById('seconds').innerText = String(seconds).padStart(2, '0');
  };

  // Run immediately and then every second
  updateCountdown();
  setInterval(updateCountdown, 1000);

  // Guest Count Selection Logic (Plus/Minus Buttons)
  const minusBtn = document.getElementById('guest-minus');
  const plusBtn = document.getElementById('guest-plus');
  const countDisplay = document.getElementById('guest-count-val');
  const countInput = document.getElementById('guests-count');
  
  let guestsCount = 1;

  minusBtn.addEventListener('click', () => {
    if (guestsCount > 1) {
      guestsCount--;
      updateGuestCount();
    }
  });

  plusBtn.addEventListener('click', () => {
    if (guestsCount < 10) { // Limit to 10 max per RSVP submission
      guestsCount++;
      updateGuestCount();
    }
  });

  const updateGuestCount = () => {
    countDisplay.innerText = guestsCount;
    countInput.value = guestsCount;
  };

  // Show/Hide guest count based on Attendance selection
  const rsvpYes = document.getElementById('rsvp-yes');
  const rsvpNo = document.getElementById('rsvp-no');
  const guestsContainer = document.getElementById('guests-container');

  const handleAttendanceChange = () => {
    if (rsvpYes.checked) {
      guestsContainer.style.display = 'block';
    } else {
      guestsContainer.style.display = 'none';
    }
  };

  rsvpYes.addEventListener('change', handleAttendanceChange);
  rsvpNo.addEventListener('change', handleAttendanceChange);

  // Form Submission Logic (Using Serverless Database)
  const rsvpForm = document.getElementById('rsvp-form');
  const statusMsg = document.getElementById('form-status');
  const submitBtn = document.getElementById('submit-btn');

  // Securely generated random database bucket for Mia's birthday party RSVPs
  const DB_URL = 'https://kvdb.io/mia_rsvp_db_a9f3c7e48b/rsvps';

  rsvpForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // Disable submit to prevent double posts
    submitBtn.disabled = true;
    submitBtn.innerText = 'Sending RSVP...';
    statusMsg.className = 'status-msg';
    statusMsg.style.display = 'none';

    const name = document.getElementById('guest-name').value;
    const attending = rsvpYes.checked;
    const guestsCountVal = attending ? parseInt(countInput.value, 10) : 0;
    const note = document.getElementById('birthday-note').value;

    try {
      // 1. Fetch current list of RSVPs
      let rsvps = [];
      try {
        const getRes = await fetch(DB_URL);
        if (getRes.ok) {
          rsvps = await getRes.json();
        }
      } catch (err) {
        // If data doesn't exist yet, we keep it as empty array
      }

      if (!Array.isArray(rsvps)) {
        rsvps = [];
      }

      // 2. Add or update the guest RSVP entry
      const existingIndex = rsvps.findIndex(r => r.name.toLowerCase() === name.trim().toLowerCase());
      
      const newRsvp = {
        id: existingIndex !== -1 ? rsvps[existingIndex].id : Date.now().toString(),
        name: name.trim(),
        attending,
        guestsCount: guestsCountVal,
        note: (note || '').trim(),
        timestamp: new Date().toISOString()
      };

      if (existingIndex !== -1) {
        rsvps[existingIndex] = newRsvp;
      } else {
        rsvps.push(newRsvp);
      }

      // 3. Save the list back to the serverless DB
      const putRes = await fetch(DB_URL, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(rsvps)
      });

      if (putRes.ok) {
        statusMsg.innerText = 'RSVP submitted successfully! See you there!';
        statusMsg.classList.add('success');
        statusMsg.style.display = 'block';

        // Play Confetti if Attending!
        if (attending && typeof confetti === 'function') {
          triggerCelebrationConfetti();
        }

        // Reset form input values
        rsvpForm.reset();
        guestsCount = 1;
        updateGuestCount();
        handleAttendanceChange();
      } else {
        throw new Error('Failed to save RSVP to the database.');
      }
    } catch (err) {
      statusMsg.innerText = err.message || 'Something went wrong. Please try again.';
      statusMsg.classList.add('error');
      statusMsg.style.display = 'block';
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerText = 'Send My RSVP';
    }
  });

  // Confetti helper
  const triggerCelebrationConfetti = () => {
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { x: 0.1, y: 0.8 }
    });
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { x: 0.9, y: 0.8 }
    });
    setTimeout(() => {
      confetti({
        particleCount: 150,
        spread: 100,
        origin: { y: 0.6 }
      });
    }, 250);
  };
});

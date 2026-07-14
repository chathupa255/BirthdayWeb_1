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

  // Form Submission Logic
  const rsvpForm = document.getElementById('rsvp-form');
  const statusMsg = document.getElementById('form-status');
  const submitBtn = document.getElementById('submit-btn');

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
      const response = await fetch('/api/rsvp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name,
          attending,
          guestsCount: guestsCountVal,
          note
        })
      });

      const result = await response.json();

      if (response.ok && result.success) {
        statusMsg.innerText = result.message;
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
        throw new Error(result.error || 'Something went wrong. Please try again.');
      }
    } catch (err) {
      statusMsg.innerText = err.message;
      statusMsg.classList.add('error');
      statusMsg.style.display = 'block';
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerText = 'Send My RSVP';
    }
  });

  // Confetti helper
  const triggerCelebrationConfetti = () => {
    // Left explosion
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { x: 0.1, y: 0.8 }
    });
    // Right explosion
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { x: 0.9, y: 0.8 }
    });
    // Center splash shortly after
    setTimeout(() => {
      confetti({
        particleCount: 150,
        spread: 100,
        origin: { y: 0.6 }
      });
    }, 250);
  };
});

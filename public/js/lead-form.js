if (typeof window !== 'undefined') {
  const form = document.getElementById('leadForm');
  const submitButton = document.getElementById('submitButton');
  const statusMessageDiv = document.getElementById('submitStatusMessage');

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Disable button and show loading indicator
    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = 'Submitting...';
      submitButton.classList.remove('bg-blue-600', 'hover:bg-blue-700');
      submitButton.classList.add('bg-blue-400', 'cursor-not-allowed');
    }
    if (statusMessageDiv) {
      statusMessageDiv.textContent = '';
      statusMessageDiv.classList.add('hidden');
      statusMessageDiv.classList.remove('bg-green-100', 'text-green-800', 'bg-red-100', 'text-red-800');
    }

    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData.entries());

    try {
      const response = await fetch('/api/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...data,
          source: window.location.href,
        }),
      });

      const result = await response.json();

      if (statusMessageDiv) {
        statusMessageDiv.classList.remove('hidden');
        if (response.ok) {
          statusMessageDiv.textContent = 'Thank you for your submission! We will get back to you soon.';
          statusMessageDiv.classList.add('bg-green-100', 'text-green-800');
          form.reset();
        } else {
          statusMessageDiv.textContent = result.message || 'There was an error submitting your form. Please try again later.';
          statusMessageDiv.classList.add('bg-red-100', 'text-red-800');
          console.error('Form submission error:', result);
        }
      }

    } catch (error) {
      console.error('Form submission error:', error);
      if (statusMessageDiv) {
        statusMessageDiv.classList.remove('hidden');
        statusMessageDiv.textContent = 'There was an error submitting your form. Please try again later.';
        statusMessageDiv.classList.add('bg-red-100', 'text-red-800');
      }
    } finally {
      // Re-enable button
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = 'Submit';
        submitButton.classList.add('bg-blue-600', 'hover:bg-blue-700');
        submitButton.classList.remove('bg-blue-400', 'cursor-not-allowed');
      }
    }
  });
} 
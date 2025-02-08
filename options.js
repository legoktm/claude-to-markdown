document.addEventListener('DOMContentLoaded', function() {
    const tokenInput = document.getElementById('github-token');
    const saveButton = document.getElementById('save');
    const status = document.getElementById('status');

    // Load saved token
    chrome.storage.local.get('githubToken', function(data) {
      if (data.githubToken) {
        tokenInput.value = data.githubToken;
      }
    });

    function showStatus(message, isError = false) {
      status.textContent = message;
      status.className = isError ? 'error' : 'success';
      status.style.display = 'block';
      setTimeout(() => {
        status.style.display = 'none';
      }, 3000);
    }

    saveButton.addEventListener('click', function() {
      const token = tokenInput.value.trim();

      if (!token) {
        showStatus('Please enter a token', true);
        return;
      }

      chrome.storage.local.set({
        githubToken: token
      }, function() {
        showStatus('Settings saved successfully!');
      });
    });
  });

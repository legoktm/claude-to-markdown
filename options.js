// SPDX-License-Identifier: Apache-2.0
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
      status.className = `show ${isError ? 'error' : 'success'}`;
      setTimeout(() => {
        status.className = 'hide';
      }, 3000);
    }

    saveButton.addEventListener('click', function() {
      const token = tokenInput.value.trim();

      chrome.storage.local.set({
        githubToken: token
      }, function() {
        showStatus('Settings saved successfully!');
      });
    });
  });

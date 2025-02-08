document.addEventListener('DOMContentLoaded', function() {
    const textArea = document.getElementById('jsonContent');
    const timestampDiv = document.getElementById('timestamp');
    const refreshButton = document.getElementById('refreshButton');
    const gistButton = document.getElementById('gistButton');
    const settingsButton = document.getElementById('settingsButton');
    const statusDiv = document.getElementById('status');

    function updateContent(data) {
      if (data.lastIntercepted) {
        textArea.value = JSON.stringify(data.lastIntercepted.content, null, 2);
        timestampDiv.textContent = `Last updated: ${new Date(data.lastIntercepted.timestamp).toLocaleString()}`;
      } else {
        textArea.value = 'No JSON content intercepted yet.';
        timestampDiv.textContent = '';
      }
    }

    function showStatus(message, isError = false) {
      statusDiv.textContent = message;
      statusDiv.className = `status ${isError ? 'error' : 'success'}`;
      setTimeout(() => {
        statusDiv.className = 'status';
      }, 5000);
    }

    async function createGist(content, token) {
      const response = await fetch('https://api.github.com/gists', {
        method: 'POST',
        headers: {
          'Authorization': `token ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          description: 'Claude Chat JSON Content',
          public: false,
          files: {
            [`claude_chat_${new Date().toISOString()}.json`]: {
              content: JSON.stringify(content, null, 2)
            }
          }
        })
      });

      if (!response.ok) {
        throw new Error(`GitHub API responded with ${response.status}`);
      }

      return await response.json();
    }

    // Load initial content and check for GitHub token
    chrome.storage.local.get(['lastIntercepted', 'githubToken'], function(data) {
      updateContent(data);
      if (data.githubToken) {
        gistButton.style.display = 'block';
      }
    });

    // Listen for storage changes
    chrome.storage.onChanged.addListener(function(changes, namespace) {
      if (changes.lastIntercepted) {
        updateContent({ lastIntercepted: changes.lastIntercepted.newValue });
      }
      if (changes.githubToken) {
        gistButton.style.display = changes.githubToken.newValue ? 'block' : 'none';
      }
    });

    // Refresh button functionality
    refreshButton.addEventListener('click', function() {
      chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        if (tabs[0]) {
          chrome.tabs.reload(tabs[0].id);
        }
      });
    });

    // Settings button functionality
    settingsButton.addEventListener('click', function() {
        chrome.runtime.openOptionsPage();
    });

    // Gist button functionality
    gistButton.addEventListener('click', async function() {
      try {
        gistButton.disabled = true;
        const content = JSON.parse(textArea.value);

        // Get the token from storage
        const data = await new Promise(resolve => {
          chrome.storage.local.get('githubToken', resolve);
        });

        if (!data.githubToken) {
          throw new Error('GitHub token not configured');
        }

        const gistData = await createGist(content, data.githubToken);
        showStatus(`Gist created successfully! URL: ${gistData.html_url}`);
        chrome.tabs.create({ url: gistData.html_url });
      } catch (error) {
        showStatus(error.message, true);
      } finally {
        gistButton.disabled = false;
      }
    });
  });

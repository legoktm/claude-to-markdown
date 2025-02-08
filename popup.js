// SPDX-License-Identifier: Apache-2.0
document.addEventListener('DOMContentLoaded', function() {
    const title = document.getElementById('jsonTitle');
    const textArea = document.getElementById('jsonContent');
    const timestampDiv = document.getElementById('timestamp');
    const refreshButton = document.getElementById('refreshButton');
    const gistButton = document.getElementById('gistButton');
    const settingsButton = document.getElementById('settingsButton');
    const statusDiv = document.getElementById('status');

    function updateContent(data) {
      if (data.lastIntercepted) {
        title.value = data.lastIntercepted.content.name;
        textArea.value = buildMarkdown(data.lastIntercepted.content);
        timestampDiv.textContent = `Last updated: ${new Date(data.lastIntercepted.timestamp).toLocaleString()}`;
      } else {
        textArea.value = 'No content intercepted yet.';
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

    async function createGist(name, content, token) {
      const response = await fetch('https://api.github.com/gists', {
        method: 'POST',
        headers: {
          'Authorization': `token ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          description: name,
          public: false,
          files: {
            [`claude_chat_${new Date().toISOString()}.md`]: {
              content: content,
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

        // Get the token from storage
        const data = await new Promise(resolve => {
          chrome.storage.local.get('githubToken', resolve);
        });

        if (!data.githubToken) {
          throw new Error('GitHub token not configured');
        }

        const gistData = await createGist(title.value, textArea.value, data.githubToken);
        showStatus(`Gist created successfully! URL: ${gistData.html_url}`);
        chrome.tabs.create({ url: gistData.html_url });
      } catch (error) {
        showStatus(error.message, true);
      } finally {
        gistButton.disabled = false;
      }
    });
  });

function buildMarkdown(parsed) {
    if (!parsed.chat_messages) {
        return "";
    }
    const bits = [];
    bits.push(`# ${parsed.name}`);
    parsed.chat_messages.forEach((message) => {
        console.log({ message });
        bits.push(
        `**${message.sender}** (${new Date(message.created_at).toLocaleString(
            "en-US",
            {
            month: "short",
            day: "numeric",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit"
            }
        )})`
        );
        message.content.forEach((content) => {
        if (content.type == "tool_use") {
            if (content.name == "repl") {
            bits.push(
                "**Analysis**\n```" +
                `javascript\n${content.input.code.trim()}` +
                "\n```"
            );
            } else if (content.name == "artifacts") {
            let lang =
                content.input.language || typeLookup[content.input.type] || "";
            // It's an artifact, but is it a create/rewrite/update?
            const input = content.input;
            if (input.command == "create" || input.command == "rewrite") {
                bits.push(
                `#### ${input.command} ${
                    content.input.title || "Untitled"
                }\n\n\`\`\`${lang}\n${content.input.content}\n\`\`\``
                );
            } else if (input.command == "update") {
                bits.push(
                `#### update ${content.input.id}\n\nFind this:\n\`\`\`\n${content.input.old_str}\n\`\`\`\nReplace with this:\n\`\`\`\n${content.input.new_str}\n\`\`\``
                );
            }
            }
        } else if (content.type == "tool_result") {
            if (content.name != "artifacts") {
            let logs = JSON.parse(content.content[0].text).logs;
            bits.push(
                `**Result**\n<pre style="white-space: pre-wrap">\n${logs.join(
                "\n"
                )}\n</pre>`
            );
            }
        } else {
            if (content.text) {
            bits.push(
                replaceArtifactTags(
                content.text.replace(/<\/antArtifact>/g, "\n```")
                )
            );
            } else {
            bits.push(JSON.stringify(content));
            }
        }
        });
        const backtick = String.fromCharCode(96);
        message.attachments.forEach((attachment) => {
        bits.push(`<details><summary>${attachment.file_name}</summary>`);
        bits.push("\n\n");
        bits.push(backtick.repeat(5));
        bits.push(attachment.extracted_content);
        bits.push(backtick.repeat(5));
        bits.push("</details>");
        });
    });
    return bits.join("\n\n");
}

function replaceArtifactTags(input) {
    // Regular expression to match <antArtifact> tags
    const regex = /<antArtifact[^>]*>/g;

    // Function to extract attributes from a tag string
    function extractAttributes(tag) {
      const attributes = {};
      const attrRegex = /(\w+)=("([^"]*)"|'([^']*)')/g;
      let match;
      while ((match = attrRegex.exec(tag)) !== null) {
        const key = match[1];
        const value = match[3] || match[4]; // Use either double or single quotes
        attributes[key] = value;
      }
      return attributes;
    }

    return input.replace(regex, (match) => {
      const attributes = extractAttributes(match);
      // Determine language based on 'language' attribute, otherwise fallback logic
      const lang = attributes.language || typeLookup[attributes.type] || "";

      // Return the Markdown formatted string
      return `### ${attributes.title || "Untitled"}\n\n\`\`\`${lang}`;
    });
}

typeLookup = {
    "application/vnd.ant.react": "jsx",
    "text/html": "html"
};

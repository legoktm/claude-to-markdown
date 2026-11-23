// SPDX-License-Identifier: Apache-2.0

// Match only individual conversation endpoints (UUID path segment), not the /v2 listing.
// The ?tree=True parameter requirement was removed because Anthropic may change query params;
// a UUID-formatted path segment is sufficient to identify the right endpoint.
const CLAUDE_URL_PATTERN = /^https:\/\/claude\.ai\/api\/organizations\/[\w-]+\/chat_conversations\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/;

chrome.webRequest.onBeforeRequest.addListener(
  function(details) {
    if (details.type === "xmlhttprequest" && CLAUDE_URL_PATTERN.test(details.url)) {
      try {
        let filter = browser.webRequest.filterResponseData(details.requestId);
        let decoder = new TextDecoder("utf-8");
        let encoder = new TextEncoder();
        let str = '';

        filter.ondata = event => {
          str += decoder.decode(event.data, {stream: true});
          filter.write(event.data);
        };

        filter.onstop = event => {
          try {
            const jsonData = JSON.parse(str);
            chrome.storage.local.set({
              lastIntercepted: {
                timestamp: new Date().toISOString(),
                url: details.url,
                content: jsonData
              }
            });
          } catch (e) {
            console.log('Not valid JSON:', e);
          }
          filter.disconnect();
        };
      } catch (e) {
        console.error('Error intercepting request:', e);
      }
    }
    return { cancel: false };
  },
  {
    urls: ["*://claude.ai/api/organizations/*/chat_conversations/*"],
    types: ["xmlhttprequest"]
  },
  ["blocking"]
);

browser.alarms.create("cleanExpiredData", { periodInMinutes: 24 * 60 });

// Listen for the alarm
browser.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "cleanExpiredData") {
    cleanExpiredData();
  }
});

// Periodic cleanup function
async function cleanExpiredData() {
  const allData = await chrome.storage.local.get();
  const now = Date.now();
  const keysToRemove = [];

  for (const [key, item] of Object.entries(allData)) {
    if (key.startsWith("gist-") && item.expiry && now > item.expiry) {
      keysToRemove.push(key);
    }
  }

  if (keysToRemove.length > 0) {
    await chrome.storage.local.remove(keysToRemove);
    console.log(`Cleaned up ${keysToRemove.length} expired items`);
  }
}

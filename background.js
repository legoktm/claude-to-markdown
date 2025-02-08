// SPDX-License-Identifier: Apache-2.0
const CLAUDE_URL_PATTERN = /^https:\/\/claude\.ai\/api\/organizations\/[\w-]+\/chat_conversations\/[\w-]+\?tree=True.*?/;

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

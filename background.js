const CHAT_STORAGE_PREFIX = "webmind_chat_";

// Clear conversation when the main webpage navigates.
chrome.webNavigation.onCommitted.addListener((details) => {
    if (details.frameId !== 0) return;

    chrome.storage.session.remove(
        `${CHAT_STORAGE_PREFIX}${details.tabId}`
    );
});

// Also handle single-page applications that change routes.
chrome.webNavigation.onHistoryStateUpdated.addListener((details) => {
    if (details.frameId !== 0) return;

    chrome.storage.session.remove(
        `${CHAT_STORAGE_PREFIX}${details.tabId}`
    );
});

// Remove conversation when the tab is closed.
chrome.tabs.onRemoved.addListener((tabId) => {
    chrome.storage.session.remove(
        `${CHAT_STORAGE_PREFIX}${tabId}`
    );
});

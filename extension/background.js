chrome.action.onClicked.addListener((tab) => {
  // Send a message to content.js to toggle the widget launcher bubble
  chrome.tabs.sendMessage(tab.id, { action: "TOGGLE_LAUNCHER" }).catch((err) => {
    console.log("Please refresh the webpage to establish a connection with ConceptVerse.");
  });
});
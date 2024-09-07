let isEnabled = false;
let jobCounter = 0;
const isBrowserAPI = typeof browser !== 'undefined';
const isChromeAPI = typeof chrome !== 'undefined' && typeof chrome.storage !== 'undefined';





function updateUI() {
    const warningMessage = document.getElementById("warning-message");
    const dropdown = document.getElementById("dropdown");

    if (isEnabled) {
        warningMessage.textContent = 'Extensão está habilitada. a maldade da Gupy está sendo filtrada!😁';
        warningMessage.className = 'green';
        dropdown.value = 'yes';
    } else {
        warningMessage.textContent = 'Extensão está desabilitada. Gupy está dominando o mundo!😈';
        warningMessage.className = 'red';
        dropdown.value = 'no';
    }
}

chrome.storage.local.get('isEnabled', (result) => {
    isEnabled = result.isEnabled || false;
    updateUI();
});

document.getElementById("dropdown").addEventListener("change", (event) => {
    isEnabled = event.target.value === 'yes';
    
    // Update UI
    updateUI();

    // Save the state
    chrome.storage.local.set({ isEnabled });
    

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0].id) {
      chrome.tabs.sendMessage(tabs[0].id, { action: "setEnabled", isEnabled }, (response) => {
        if (chrome.runtime.lastError) {
          console.error("Error sending message:", chrome.runtime.lastError.message);
        } else {
          console.log("Response from content script:", response);
        }
      });
    }
  });

});



const filteredJobs = document.getElementById("filtered-jobs");
const n = localStorage.getItem('jobCounter')
console.log(n)
filteredJobs.textContent = `Vagas Removidas: ${n || 0}`;






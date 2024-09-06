let isEnabled = false;

const isBrowserAPI = typeof browser !== 'undefined';
const isChromeAPI = typeof chrome !== 'undefined' && typeof chrome.storage !== 'undefined';


function fetchJobDetails(jobId) {
    const url = `https://www.linkedin.com/jobs-guest/jobs/api/jobPosting/${jobId}`;

    return fetch(url)
        .then(response => {
            if (response.ok) {
                return response.text(); // Return as text
            } else {
                throw new Error('Network response was not ok.');
            }
        })
        .then(html => {
            // Parse the HTML
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');

            // Extract the job URL (or other details if needed)
            const applyUrlElement = doc.querySelector('#applyUrl');
            let jobUrl = 'Not Found'
            if(applyUrlElement){
                const applyUrl = applyUrlElement ? applyUrlElement.innerHTML.trim()  : 'Apply URL not found.';

                const match = applyUrl.match(/"(https:\/\/[^"]+)"/)
                if (match) {
                    jobUrl = match[1];
                }
            }
         

            return { jobId, jobUrl };
        })
        .catch(error => {
            console.error(`There was a problem with fetching job details for jobId ${jobId}:`, error);
            return { jobId, applyUrl: 'Error fetching apply URL' };
        });
}

document.getElementById("dropdown").addEventListener("change", (event) => {
    isEnabled = event.target.value === 'yes';


    const warningMessage = document.getElementById("warning-message");
    if (isEnabled) {
        checkPage()
      warningMessage.textContent = 'Extensão está habilitada. a maldade da Gupy está sendo filtrada!😁';
      warningMessage.className = 'green';
    } else {
      warningMessage.textContent = 'Extensão está desabilitada. a maldade da Gupy não está sendo filtrada!🙁';
      warningMessage.className = 'red';
    }
});




function checkPage(){
    const urlToCheck = 'https://www.linkedin.com/jobs/collections/';
    const tabs = isBrowserAPI ? browser.tabs : chrome.tabs;

    tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs.length > 0) {
            chrome.tabs.sendMessage(tabs[0].id, { action: "filterJobs" }, async (response) => {
                if (chrome.runtime.lastError) {
                    console.error('SendMessage Error:', chrome.runtime.lastError);
                } else {
                    if (response && response.jobList) {
                        const jobDetailsPromises = response.jobList.map((job) => {
                            return fetchJobDetails(job.jobId);
                        });
    
                     
                        const jobDetailsArray = await Promise.all(jobDetailsPromises);
    
                     
                        jobDetailsArray.forEach((jobDetail) => {
                            const url = decodeURIComponent(jobDetail.jobUrl)
                            console.log('Job ID:', jobDetail.jobId);
                            console.log('Apply Comment Url:',  url);
                            const match = url.match(/url=([^"&]+)/);
                            let cleanUrl;

                            if (match) {
                                cleanUrl = decodeURIComponent(match[1]);
                            }

                            if(cleanUrl && cleanUrl.includes('gupy.io')){
                                chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                                    chrome.tabs.sendMessage(tabs[0].id, { action: "deleteJob", jobId: jobDetail.jobId });
                                });
                            }

                            
                        
                        });
                    } else {
                        console.log('No job list found in response.');
                    }
                }
            });
        } else {
            console.error('No active tabs found');
        }
    }
    )

}



console.log('Content script loaded');
const CHECK_INTERVAL = 10000; // Interval set to 10 seconds
let checkInterval = null; // To keep track of the interval
let isEnabled = localStorage.getItem('extensionEnabled') === 'true'; // Get initial state from localStorage
const isBrowserAPI = typeof browser !== 'undefined';
const isChromeAPI = typeof chrome !== 'undefined' && typeof chrome.storage !== 'undefined';
console.log('browser:', typeof browser);
console.log('chrome:', typeof chrome);


const processedJobIds = new Set();

const MAX_JOB_IDS = 500; // Adjust this as needed

function saveGupyJobIds(jobIds){
    localStorage.setItem('jobIds', JSON.stringify(jobIds));
}

function getJobIds() {
    const storedIds = localStorage.getItem('jobIds');
    return storedIds ? JSON.parse(storedIds) : [];
}

function saveJobIds(jobIds) {
    localStorage.setItem('jobIds', JSON.stringify(jobIds));
}

function addJobId(jobId) {
    let jobIds = getJobIds();

    // Remove the oldest entry if the array size exceeds the limit
    if (jobIds.length >= MAX_JOB_IDS) {
        jobIds.shift(); // Remove the first item (FIFO)
    }

    if (!jobIds.includes(jobId)) {
        jobIds.push(jobId); // Add new job ID if it doesn't exist
        saveJobIds(jobIds);
    }
}

function hasJobId(jobId) {
    const jobIds = getJobIds();
    return jobIds.includes(jobId);
}


async function fetchJobDetails(jobId) {
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

// Function to check the page
async function checkPage() {
    console.log('Checking page...');

    isEnabled = localStorage.getItem('extensionEnabled') === 'true';

    if (isEnabled) {
        const urlToCheck = 'https://www.linkedin.com/jobs/collections/';
        
    
        
            const currentUrl = window.location.href;
            if (currentUrl && currentUrl.includes(urlToCheck)) {
                const jobList = [...document.querySelectorAll('.jobs-search-results-list > ul > li > div > div')].map((job) => ({ jobId: job.getAttribute('data-job-id') }));


               
                

                if (jobList.length > 0) {
              
                    const jobDetailsPromises = jobList.map((job) => {
                        if (hasJobId(job.jobId)) {
                        
                            return Promise.resolve(null);
                        } else {
                            addJobId(job.jobId);
         
                            return fetchJobDetails(job.jobId);
                        }
                    });

                    const jobDetailsArray = await Promise.all(jobDetailsPromises);

                    console.log('JOB DETAILS ARRAY:', jobDetailsArray)

                    jobDetailsArray.forEach((jobDetail) => {
                        if (jobDetail) {
                            const url = decodeURIComponent(jobDetail.jobUrl);
                            const match = url.match(/url=([^"&]+)/);
                            let cleanUrl;

                            if (match) {
                                cleanUrl = decodeURIComponent(match[1]);
                            }

                            if (cleanUrl && cleanUrl.includes('gupy.io')) {
                                deleteJobPost(jobDetail.jobId);
                            }
                        }
                    });
                } else {
                    console.log('No job list found in response.');
                }
            } else {
                console.error('No active tabs found or URL does not match.');
            }
       
    }
}

function deleteJobPost(jobId){

     const jobPost = document.querySelector(`[data-job-id="${jobId}"]`);

  
     if (jobPost) {
         jobPost.remove();
         console.log(`Job post with ID ${jobId} has been removed.`);
     } else {
         console.log(`Job post with ID ${jobId} not found.`);
     }

    
}

// Function to start or stop the checkPage loop
function updateCheckLoop() {
    if (isEnabled) {
        console.log('Extension is enabled. Starting checkPage loop.');
        if (!checkInterval) {
            checkPage(); // Run immediately once
            checkInterval = setInterval(checkPage, CHECK_INTERVAL); // Set the loop to run every 10 seconds
        }
    } else {
        console.log('Extension is disabled. Stopping checkPage loop.');
        if (checkInterval) {
            clearInterval(checkInterval); // Stop the loop
            checkInterval = null;
        }
    }
}

// Listen for messages from the popup or background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('REQUEST', request);

    if (request.action === "setEnabled") {
        isEnabled = request.isEnabled;
        localStorage.setItem('extensionEnabled', isEnabled);
        updateCheckLoop(); // Start or stop the loop based on the new state
        sendResponse({ isEnabled });
    }

    if (request.action === "filterJobs") {
        const jobList = [...document.querySelectorAll('.jobs-search-results-list > ul > li > div > div')]
            .map((job) => ({ jobId: job.getAttribute('data-job-id') }));

        sendResponse({ jobList: jobList.length ? jobList : 'No job list found' });
    }

    

    return true; // Keeps the message channel open for async operations
});

// Start the loop initially based on stored state
updateCheckLoop();

console.log('Content script loaded');
const CHECK_INTERVAL = 10000;
let checkInterval = null; 
let isEnabled = localStorage.getItem('extensionEnabled') === 'true';
const isBrowserAPI = typeof browser !== 'undefined';
const isChromeAPI = typeof chrome !== 'undefined' && typeof chrome.storage !== 'undefined';
console.log('browser:', typeof browser);
console.log('chrome:', typeof chrome);


const MAX_JOB_IDS = 500;

function saveGupyJobIds(jobIds){
    localStorage.setItem('gupyJobIds', JSON.stringify(jobIds));
}

function getJobIdsFromGupy() {
    const storedIds = localStorage.getItem('gupyJobIds');
    return storedIds ? JSON.parse(storedIds) : [];
}

function getJobIds() {
    const storedIds = localStorage.getItem('jobIds');
    return storedIds ? JSON.parse(storedIds) : [];
}

function saveJobIds(jobIds) {
    localStorage.setItem('jobIds', JSON.stringify(jobIds));
}

function addJobIdToGupy(jobId) {
    let jobIds = getJobIdsFromGupy();

  
    if (jobIds.length >= MAX_JOB_IDS) {
        jobIds.shift(); 
    }

    if (!jobIds.includes(jobId)) {
        jobIds.push(jobId);
        saveGupyJobIds(jobIds);
    }

    updateGupyCounter()
}

function addJobId(jobId) {
    let jobIds = getJobIds();

  
    if (jobIds.length >= MAX_JOB_IDS) {
        jobIds.shift(); 
    }

    if (!jobIds.includes(jobId)) {
        jobIds.push(jobId);
        saveJobIds(jobIds);
    }
}


function hasJobId(jobId) {
    const jobIds = getJobIds();
    return jobIds.includes(jobId);
}

function hasJobIdFromGupy(jobId) {
    const jobIdsFromGupy = getJobIdsFromGupy();
    return jobIdsFromGupy.includes(jobId);
}



async function fetchJobDetails(jobId) {
    const url = `https://www.linkedin.com/jobs-guest/jobs/api/jobPosting/${jobId}`;

    return fetch(url)
        .then(response => {
            if (response.ok) {
                return response.text();
            } else {
                throw new Error('Network response was not ok.');
            }
        })
        .then(html => {
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');


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


function verifySimpleApply(jobId){
    return document.querySelector(`[data-job-id="${jobId}"] > div > ul`)?.innerText.toLowerCase().includes('simplificada')
}

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
                        if(hasJobIdFromGupy(job.jobId)){
                            // if we've already seen and it's gupy
                            deleteJobPost(job.jobId)
                            return Promise.resolve(null);
                        }
                        else if (hasJobId(job.jobId)) {
                            // if we've seen
                            return Promise.resolve(null);
                        } 

                        // never seen before and its not simple apply
                        else if(verifySimpleApply(job.jobId)){
                            return Promise.resolve(null);
                        }
                        else {
                            addJobId(job.jobId);
                            return fetchJobDetails(job.jobId);
                        }
                    });

                    const jobDetailsArray = await Promise.all(jobDetailsPromises);

        
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
                                addJobIdToGupy(jobDetail.jobId);
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

function updateGupyCounter(){
    const gupyCounterLength = getJobIdsFromGupy().length;
    localStorage.setItem('jobCounter', gupyCounterLength.toString())
}

function updateCheckLoop() {
    if (isEnabled) {
        console.log('Extension is enabled. Starting checkPage loop.');
        if (!checkInterval) {
            checkPage();
            checkInterval = setInterval(checkPage, CHECK_INTERVAL); 
        }
    } else {
        console.log('Extension is disabled. Stopping checkPage loop.');
        if (checkInterval) {
            clearInterval(checkInterval); 
            checkInterval = null;
        }
    }
}


chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    

    if (request.action === "setEnabled") {
        isEnabled = request.isEnabled;
        localStorage.setItem('extensionEnabled', isEnabled);
        updateCheckLoop();
        sendResponse({ isEnabled });
    }

    if (request.action === "filterJobs") {
        const jobList = [...document.querySelectorAll('.jobs-search-results-list > ul > li > div > div')]
            .map((job) => ({ jobId: job.getAttribute('data-job-id') }));

        sendResponse({ jobList: jobList.length ? jobList : 'No job list found' });
    }

   
    if (request.action === "getJobCounter") {
     
        const gupyCounterLength = getJobIdsFromGupy().length;
        
        sendResponse({ filteredNum: gupyCounterLength});
    }

    

    return true; 
});


updateCheckLoop();

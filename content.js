console.log('Content script loaded');

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {

    function deleteJobPost(jobId) {
        const element = document.querySelector(`[data-job-id="${jobId}"]`);
    
        if (element) {
           
            element.remove();
            console.log(`Element with selector "${element}" has been removed.`);
        } else {
            console.log(`Element with selector "${element}" not found.`);
        }
    }

    if (request.action === "filterJobs") {
        const jobList = [...document.querySelectorAll('.jobs-search-results-list > ul > li > div > div')]
            .map((job) => ({ jobId: job.getAttribute('data-job-id') }));

        sendResponse({ jobList: jobList.length ? jobList : 'No job list found' });
    }

    if(request.action === "deleteJob"){
       const jobId = request.jobId;
       deleteJobPost(jobId)        
    }
});



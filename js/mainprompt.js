import TabCreator from './tabcreator.js';
import PromptCreator from './promptcreator.js';
import GopromptAPI from './gopromptapi.js';
import Authorize from './authorize.js';

//#endregion
class MainPrompt {
    constructor() {
        // all of this runs once when MainPrompt is instantiated
        this.body = document.querySelector("body");
        this.testing = false;
        this.apiHelper = new GopromptAPI('https://staging.cyber9.live');
        let authorize = new Authorize(this.testing);
        this.checkSession();
        // Create the "Add Tab" button

        //adding event listeners to buttons
        this.addTabBtn = document.getElementById("add-tab");
        if (this.addTabBtn) this.addTabBtn.addEventListener("click", () => this.addTab());

        this.tabLinksContainer = document.querySelector('#tab-links');
        this.tabContentContainer = document.querySelector('#tab-content');
        // if you are in a preview page or myprompt page, instantiate tabCreator
        if (window.location.pathname.endsWith("myprompt.html") || window.location.pathname.endsWith("preview.html")) this.tabCreator = new TabCreator(this.tabLinksContainer, this.tabContentContainer);
        this.downloadBtn = document.getElementById("download-json");
        if (this.downloadBtn) this.downloadBtn.addEventListener("click", () => this.downloadJson());

        this.uploadBtn = document.getElementById("upload-json");
        if (this.uploadBtn) this.uploadBtn.addEventListener("click", () => this.uploadJson());

        this.savePromptsBtn = document.getElementById("save-prompts");
        if (this.savePromptsBtn) this.savePromptsBtn.addEventListener('click', () => this.saveData());

        this.signoutBtn = document.getElementById("sign-out");
        if (this.signoutBtn) this.signoutBtn.addEventListener('click', () => {
            sessionStorage.removeItem("user");
            window.location.href = "../index.html"; // Define logouturl
        });
        if (window.location.pathname.endsWith("preview.html")) this.loadDefaultData();

        if (window.location.pathname.endsWith("stats.html")) this.showStats();



        if (window.location.pathname.endsWith("report.html")){
            this.bugform = document.getElementById("report-form");
            this.bugform.addEventListener("submit", (e) => {
                e.preventDefault();
                this.reportABug();
            });
        }


    }
    //check if user validly logged in prompts are fetched from server, otherwise redirect to homepage
    async checkSession() {
        const userSession =  JSON.parse(sessionStorage.getItem("user"));
        //const userSession =  sessionStorage.getItem("user");

        const currentPage = window.location.pathname;

        if (!userSession && currentPage.endsWith("myprompt.html")) {
            window.location.href = "../index.html";
        }
        else if (userSession && currentPage.endsWith("myprompt.html")) {
            const prompts = await this.apiHelper.fetchPrompts(userSession);
            this.populateFromJson(prompts)
        }
    }


    addTab() {
        this.tabCreator.createTab("");
    }

    async saveData() {
        try {
            const data = this.getTabPromptData();
            await this.apiHelper.savePrompts(data);
            alert('Prompts saved successfully');
        } catch (error) {
            console.error("Error saving prompts:", error);
            alert('Failed to save prompts');
        }
    }

    populateFromJson(jsonData) {
        // Check if tabs exist in JSON data
        let tabsExistInJson = false;
        let firstTabName = "";
        jsonData.tabs.forEach((item, index) => {
            const tabName = item.name;
            if (tabName) {
                tabsExistInJson = true;
                if (index === 0) {
                    firstTabName = tabName;
                }
            }

            if (!this.tabCreator.tabs[tabName]) {
                this.tabCreator.createTab(tabName,false);
            }

            const promptCreator = new PromptCreator(this.tabCreator.tabs[tabName]);

            item.prompts.forEach(prompt => {
                promptCreator.createPrompt(prompt.title, prompt.text, prompt.link);
            });
        });

        // Create first tab only if no tabs exist in JSON data
        if (!tabsExistInJson) {
            firstTabName = this.tabCreator.createTab("");
        }

        // Make the first tab active
        this.tabCreator.switchTab(firstTabName);
    }

    uploadJson() {
        let fileInput = document.createElement("input");
        fileInput.type = "file";
        fileInput.accept = ".json";
        fileInput.style.display = "none"; // Hide the file input

        // Listen for the change event on the file input
        fileInput.addEventListener("change", (event) => {
            let file = event.target.files[0];
            if (file) {
                let reader = new FileReader();
                reader.onload = (e) => {
                    let content = e.target.result;
                    let jsonData = JSON.parse(content);

                    // Use the JSON data here
                    this.populateFromJson(jsonData);
                };
                reader.readAsText(file);
            }
        });

        // Append the file input to the document
        document.body.appendChild(fileInput);

        // Programmatically click the file input to open the file dialog
        fileInput.click();

        // Remove the file input from the document after use
        fileInput.addEventListener("change", () => {
            document.body.removeChild(fileInput);
        });
    }

    getTabPromptData() {
        let data = { tabs: [] };
        // Loop over each tab
        for (let tabName in this.tabCreator.tabs) {
            let tab = this.tabCreator.tabs[tabName];
            // Get the prompts in the tab
            let prompts = [];
            tab.querySelectorAll('.prompt-container').forEach(promptElement => {
                prompts.push({
                    title: promptElement.querySelector('.prompt-title').innerText,
                    text: promptElement.querySelector('.prompt-text').innerText,
                    link: promptElement.querySelector('.prompt-link').dataset.link
                });
            });
            // Add the tab and its prompts to the data
            data.tabs.push({
                name: tabName,
                prompts: prompts
            });
        }
        return data;
    }

    downloadJson() {
        // Get the tabs and prompts data
        const data = this.getTabPromptData();

        // Convert the data to a JSON string
        const jsonStr = JSON.stringify(data, null, 2);

        // Create a Blob with the JSON string
        const blob = new Blob([jsonStr], { type: 'application/json' });

        // Create a URL for the Blob
        const url = URL.createObjectURL(blob);

        // Create a temporary download link
        const a = document.createElement('a');
        a.href = url;
        a.download = 'tabs_and_prompts.json';
        a.style.display = 'none';
        document.body.appendChild(a);

        // Trigger the download
        a.click();

        // Clean up
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }


    async loadDefaultData() {
        try {
            // Fetch the JSON file
            const response = await fetch("/default_data.json");

            // Check if the request was successful
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

            // Convert the response to JSON
            const data = await response.json();

            // Use the JSON data
            this.populateFromJson(data);
        } catch (error) {
            console.error('Failed to load default data:', error);
        }
    }

    async showStats(){
        try{
            const statsinfo = await this.apiHelper.fetchStats();
            document.getElementById("totalUsers").textContent = statsinfo.total_users;
            document.getElementById("totalPrompts").textContent = statsinfo.total_prompts;

        }catch (error) {
            console.error("Error getting stats:", error);
        }
    }

    async reportABug(){
        
        try{
            const username = document.getElementById('username').value;
            const bugdescription = document.getElementById('bugdescription').value;

            const bugReport = {
            name: username,
            description: bugdescription,
            };

            const result = await this.apiHelper.reportBug(bugReport);
            
            if (result.status === "success") this.showBugAlert();
            
            
        }catch (error) {
            console.error("Error getting stats:", error);
        }
    }

    showBugAlert(){
        const alert = document.getElementById("alert");
        alert.style.display = "block";
        setTimeout(function(){
          alert.style.opacity = "1";
        }, 20); // Short delay to ensure the alert is visible before starting fade out
    
        // After 3 seconds, start fading out
        setTimeout(function(){
          alert.style.opacity = "0";
        }, 3000);
    
        // After the alert is faded out, hide it again
        setTimeout(function(){
          alert.style.display = "none";
        }, 3600); // Wait for the fade out to complete before hiding the alert
      };
}

window.onload = () => {
    const mainPrompt = new MainPrompt();

};

document.addEventListener('DOMContentLoaded', function() {
    const serverMarker = document.getElementById('server-marker');
    serverMarker.addEventListener('click', function(event) {
        event.preventDefault();
        sendApiRequest();
    });

    if (localStorage.getItem('countdownEndTime')) {
        runCountdown();
        serverMarker.textContent = 'Server Running';
        serverMarker.classList.add('heartbeat');
    }
});

function sendApiRequest() {
    
    fetch('https://70b6f68hy8.execute-api.ap-southeast-2.amazonaws.com/test/startinstance?instance=api&time=30', {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            // Additional headers
        }
    })
    .then(response => {
        if (response.ok) {  // Check if the response status is 200 (HTTP OK)
            return response.json();  // Parse JSON body
        } else {
            throw new Error('Network response was not ok');
        }
    })
    .then(data => {
        console.log(data);
        startCountdown(1800); // Start countdown for 30 minutes (1800 seconds)
    })
    .catch((error) => {
        console.error('Error:', error);
    });
    
}

function startCountdown(duration) {
    const endTime = new Date().getTime() + duration * 1000;
    localStorage.setItem('countdownEndTime', endTime);
    updateServerMarker(true);
    runCountdown();
    
}

function runCountdown() {
    const countdownElement = document.getElementById('countdown-timer');
    const endTime = localStorage.getItem('countdownEndTime');
    let timeLeft = (endTime - new Date().getTime()) / 1000;

    countdownElement.style.display = 'inline'; // Show the countdown

    const interval = setInterval(() => {
        if (timeLeft <= 0) {
            clearInterval(interval);
            updateServerMarker(false);
            countdownElement.style.display = 'none';
            localStorage.removeItem('countdownEndTime'); // Clear the stored end time
        } else {
            timeLeft = (endTime - new Date().getTime()) / 1000;
            countdownElement.textContent = formatTime(timeLeft);
        }
    }, 1000);
}

function formatTime(seconds) {
    seconds = Math.max(seconds, 0); // Ensure seconds doesn't go negative
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${pad(minutes)}:${pad(remainingSeconds)}`;
}

function pad(number) {
    return number.toString().padStart(2, '0');
}


function updateServerMarker(isRunning) {
    const serverMarker = document.getElementById('server-marker');
    if (isRunning) {
        serverMarker.textContent = '● Server Running';
        serverMarker.classList.add('heartbeat');
    } else {
        serverMarker.textContent = 'Server Launch';
        serverMarker.classList.remove('heartbeat');
    }
}
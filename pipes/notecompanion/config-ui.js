const fs = require('fs');
const path = require('path');

// Path to the configuration file
const CONFIG_PATH = path.resolve(__dirname, 'config.json');

// Load configuration
function loadConfig() {
    return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
}

// Save configuration
function saveConfig(config) {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 4), 'utf8');
}

// Add a meeting app to the configuration
function addMeetingApp(appName) {
    const config = loadConfig();
    if (!config.meetingApps.includes(appName)) {
        config.meetingApps.push(appName);
        saveConfig(config);
        console.log(`Added "${appName}" to meeting apps.`);
    } else {
        console.log(`"${appName}" is already in the meeting apps list.`);
    }
}

// Example usage for UI integration
function configure() {
    const config = loadConfig();
    console.log('Current Configuration:', config);

    // Simulate adding a new app via UI interaction
    addMeetingApp('Skype');
}

// Run the configuration script
configure();

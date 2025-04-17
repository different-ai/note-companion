use std::process::Command;
use std::thread;
use std::time::Duration;
use serde_json::{Value};
use std::fs;

// Configuration for meeting apps and notification details
#[derive(Debug)]
struct Config {
    meeting_apps: Vec<String>,
    notification_title: String,
    notification_message: String,
}

fn main() {
    // Load configuration from JSON file
    let config = load_config("config.json").expect("Failed to load configuration");

    // Detect app usage and trigger notification
    loop {
        if let Some(active_app) = detect_active_app() {
            if config.meeting_apps.contains(&active_app) {
                send_notification(&config);
            }
        }
        thread::sleep(Duration::from_secs(5)); // Check every 5 seconds
    }
}

// Function to load configuration from a JSON file
fn load_config(file_path: &str) -> Result<Config, Box<dyn std::error::Error>> {
    let file_content = fs::read_to_string(file_path)?;
    let json_content: Value = serde_json::from_str(&file_content)?;

    Ok(Config {
        meeting_apps: json_content["meetingApps"]
            .as_array()
            .unwrap()
            .iter()
            .map(|app| app.as_str().unwrap().to_string())
            .collect(),
        notification_title: json_content["notificationTitle"].as_str().unwrap().to_string(),
        notification_message: json_content["notificationMessage"].as_str().unwrap().to_string(),
    })
}

// Mock function to detect the active application (to be implemented)
fn detect_active_app() -> Option<String> {
    // Replace with actual implementation to detect active apps
    Some("Zoom".to_string())
}

// Function to send a notification
fn send_notification(config: &Config) {
    // Triggering notification on the system
    Command::new("notify-send")
        .arg(&config.notification_title)
        .arg(&config.notification_message)
        .status()
        .expect("Failed to send notification");

    // Open Obsidian note using deep linking
    Command::new("xdg-open")
        .arg("obsidian://new")
        .status()
        .expect("Failed to open Obsidian");
}












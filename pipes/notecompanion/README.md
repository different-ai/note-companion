# Note Companion Pipe

## Description
This Screenpipe pipe detects when you join a meeting (Zoom, Google Meet, etc.) and sends a notification to open a note in Obsidian.

## Features
- Rust handles detecting active apps and sending notifications.
- JavaScript provides a configuration UI for managing meeting apps and settings.
- Shared configuration file (`config.json`) for seamless integration.

## Setup

### Rust Setup
1. Install Rust ([Rust Installation Guide](https://www.rust-lang.org/tools/install)).
2. Navigate to the `pipes/notecompanion` directory.
3. Build and run the Rust application:
   ```sh
   cargo build --release
   ./target/release/notecompanion
   ```

### JavaScript Setup
1. Install Node.js ([Node Installation Guide](https://nodejs.org/)).
2. Run the configuration UI:
   ```sh
   node config-ui.js
   ```

## Configuration
- `meetingApps`: List of meeting apps to detect.
- `notificationTitle`: Title of the notification.
- `notificationMessage`: Message displayed in the notification.

## Notes
- Ensure Obsidian is installed and deep linking (`obsidian://`) is enabled.
- Replace the `detect_active_app` Rust function with an actual implementation to detect active apps on the user's system.
- Requires `notify-send` (Linux) or equivalent notification tool.

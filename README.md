# Spotiflow

A lightweight, floating Spotify mini-player built with Electron. Spotiflow sits quietly on your desktop, giving you quick control over your music without interrupting your workflow.

## Features

*   **Minimalist Design**: A small, unobtrusive floating window.
*   **Lightweight**: Optimized for very low CPU and RAM usage.
*   **Playback Control**: Play, pause, skip, previous, and volume control.
*   **Now Playing**: Displays album art, track name, artist, and progress bar.
*   **System Tray**: Minimizes to the system tray to keep your taskbar clean.
*   **Secure Auth**: Uses your own Spotify Developer credentials stored locally.

## Download

| Platform | Installer |
| :--- | :--- |
| **Windows** | [`Spotiflow-Setup.exe`](https://github.com/lighscent/spotiflow/releases) |

## Configuration (First Run)

To use Spotiflow, you need to register it as an application in the Spotify Developer Dashboard. This ensures you have full control over your API usage.

1.  Go to the [Spotify Developer Dashboard](https://developer.spotify.com/dashboard).
2.  Log in and click **"Create App"**.
3.  Give it a name (e.g., "Spotiflow") and description.
4.  In the **Redirect URIs** field, enter:
    ```
    spotiflow://callback
    ```
5.  Save the app.
6.  Open Spotiflow. It will prompt you for your **Client ID** and **Client Secret**.
7.  Copy these from your Spotify Dashboard and paste them into Spotiflow.
8.  Click **Save & Start** and authorize the app.

## Installation (From Source)

1.  Clone the repository:
    ```bash
    git clone https://github.com/yourusername/spotiflow.git
    cd spotiflow
    ```

2.  Install dependencies:
    ```bash
    npm install
    ```

## Development vs Built Application

**Important**: Spotiflow must be built to run as a standalone application.

### Production (Built Executable)

To create a standalone executable:

```bash
npm run build
```

The output installer will be located in the `dist` folder. This creates a proper Windows installer that can be distributed and run without Node.js.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

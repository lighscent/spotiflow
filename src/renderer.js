const { ipcRenderer, shell } = require('electron');
const SpotifyWebApi = require('spotify-web-api-node');

const redirectUri = 'spotiflow://callback';

let spotifyApi;
let isPlaying = false;
let refreshInterval = null;
let lastRefreshTime = 0;
const REFRESH_INTERVAL = 1000;

// Wait for DOM to be ready
document.addEventListener('DOMContentLoaded', () => {
    checkAndSetupCredentials();

    const authBtn = document.getElementById('auth-btn');
    if (authBtn) {
        authBtn.addEventListener('click', handleAuthClick);
    }

    const minimizeBtn = document.getElementById('minimize-btn');
    if (minimizeBtn) {
        minimizeBtn.addEventListener('click', minimizeWindow);
    }

    const closeBtn = document.getElementById('close-btn');
    if (closeBtn) {
        closeBtn.addEventListener('click', closeWindow);
    }

    const playPauseBtn = document.getElementById('play-pause');
    if (playPauseBtn) {
        playPauseBtn.addEventListener('click', togglePlayPause);
    }

    const skipBtn = document.getElementById('skip');
    if (skipBtn) {
        skipBtn.addEventListener('click', skipTrack);
    }

    const backBtn = document.getElementById('back');
    if (backBtn) {
        backBtn.addEventListener('click', previousTrack);
    }

    const volumeSlider = document.getElementById('volume-slider');
    if (volumeSlider) {
        volumeSlider.addEventListener('input', updateVolume);
    }
});

// Check for stored credentials or prompt setup
function checkAndSetupCredentials() {
    const storedClientId = localStorage.getItem('spotify_client_id');
    const storedClientSecret = localStorage.getItem('spotify_client_secret');

    if (storedClientId && storedClientSecret) {
        initializeSpotifyApi(storedClientId, storedClientSecret);
    } else {
        ipcRenderer.send('open-setup-window');
    }
}

// Initialize Spotify API client
function initializeSpotifyApi(clientId, clientSecret) {
    spotifyApi = new SpotifyWebApi({
        clientId: clientId,
        clientSecret: clientSecret,
        redirectUri: redirectUri
    });
}

// Listen for settings saved from setup window
ipcRenderer.on('settings-received', (event, data) => {
    const { clientId, clientSecret } = data;
    localStorage.setItem('spotify_client_id', clientId);
    localStorage.setItem('spotify_client_secret', clientSecret);
    initializeSpotifyApi(clientId, clientSecret);
});

// Handle authentication button click
function handleAuthClick() {
    if (!spotifyApi) return;
    try {
        const scopes = ['user-read-currently-playing', 'user-modify-playback-state', 'user-read-playback-state'];
        const authorizeURL = spotifyApi.createAuthorizeURL(scopes);
        console.log('Opening URL:', authorizeURL);
        shell.openExternal(authorizeURL);
    } catch (err) {
        console.error('Auth error:', err);
    }
}

function minimizeWindow() {
    try {
        ipcRenderer.send('minimize-window');
    } catch (err) {
        console.error('Minimize error:', err);
    }
}

function closeWindow() {
    try {
        ipcRenderer.send('quit-app');
    } catch (err) {
        console.error('Close error:', err);
    }
}

// Listen for OAuth code from main process
ipcRenderer.on('oauth-code', (event, code) => {
    if (!spotifyApi) return;
    console.log('OAuth code received:', code);
    spotifyApi.authorizationCodeGrant(code).then(data => {
        spotifyApi.setAccessToken(data.body['access_token']);
        spotifyApi.setRefreshToken(data.body['refresh_token']);
        document.getElementById('auth-section').style.display = 'none';
        document.getElementById('player-section').style.display = 'block';
        document.getElementById('controls-row').style.display = 'flex';
        startAutoRefresh();
        getCurrentTrack();
    }).catch(err => console.error('Token exchange error:', err));
});

// Refresh access token
async function refreshAccessToken() {
    if (!spotifyApi) return false;
    try {
        if (!spotifyApi.getRefreshToken()) {
            console.warn('No refresh token available');
            return false;
        }
        const data = await spotifyApi.refreshAccessToken();
        spotifyApi.setAccessToken(data.body['access_token']);
        console.log('Token refreshed');
        return true;
    } catch (err) {
        console.error('Token refresh error:', err);
        return false;
    }
}

// Get current track info and update UI
function getCurrentTrack() {
    if (!spotifyApi || !spotifyApi.getAccessToken()) {
        return;
    }

    spotifyApi.getMyCurrentPlayingTrack().then(data => {
        if (data.body && data.body.item) {
            const track = data.body.item;
            const artists = track.artists.map(a => a.name).join(', ');
            const albumArt = track.album.images[0]?.url || '';
            const progress = data.body.progress_ms;
            const duration = track.duration_ms;
            isPlaying = data.body.is_playing;

            document.getElementById('album-art').src = albumArt;
            document.getElementById('track-name').textContent = track.name;
            document.getElementById('track-artist').textContent = artists;
            document.getElementById('current-time').textContent = msToTime(progress);
            document.getElementById('total-time').textContent = msToTime(duration);

            const progressPercent = (progress / duration) * 100;
            document.getElementById('progress-fill').style.width = progressPercent + '%';

            const playPauseBtn = document.getElementById('play-pause');
            playPauseBtn.innerHTML = isPlaying ? '<i class="fas fa-pause"></i>' : '<i class="fas fa-play"></i>';
        }
    }).catch(async err => {
        console.error('Get track error:', err);
        if (err.statusCode === 401) {
            const refreshed = await refreshAccessToken();
            if (refreshed) {
                getCurrentTrack();
            }
        }
    });
}

// Utility to convert ms to mm:ss
function msToTime(duration) {
    const minutes = Math.floor(duration / 60000);
    const seconds = ((duration % 60000) / 1000).toFixed(0);
    return minutes + ":" + (seconds < 10 ? '0' : '') + seconds;
}

async function togglePlayPause() {
    if (!spotifyApi || !spotifyApi.getAccessToken()) {
        console.error('No access token');
        return;
    }

    try {
        if (isPlaying) {
            await spotifyApi.pause();
            console.log('Paused');
            isPlaying = false;
            document.getElementById('play-pause').innerHTML = '<i class="fas fa-play"></i>';
        } else {
            await spotifyApi.play();
            console.log('Playing');
            isPlaying = true;
            document.getElementById('play-pause').innerHTML = '<i class="fas fa-pause"></i>';
        }
    } catch (err) {
        console.error('Play/pause error:', err);
        if (err.statusCode === 401) {
            await refreshAccessToken();
        }
    }
}

async function skipTrack() {
    if (!spotifyApi || !spotifyApi.getAccessToken()) {
        console.error('No access token');
        return;
    }

    try {
        await spotifyApi.skipToNext();
        console.log('Skipped to next');
        setTimeout(getCurrentTrack, 500);
    } catch (err) {
        console.error('Skip error:', err);
        if (err.statusCode === 401) {
            await refreshAccessToken();
        }
    }
}

async function previousTrack() {
    if (!spotifyApi || !spotifyApi.getAccessToken()) {
        console.error('No access token');
        return;
    }

    try {
        await spotifyApi.skipToPrevious();
        console.log('Skipped to previous');
        setTimeout(getCurrentTrack, 500);
    } catch (err) {
        console.error('Previous error:', err);
        if (err.statusCode === 401) {
            await refreshAccessToken();
        }
    }
}

async function updateVolume(e) {
    if (!spotifyApi || !spotifyApi.getAccessToken()) {
        console.error('No access token');
        return;
    }

    const volume = parseInt(e.target.value);
    console.log('Setting volume to:', volume);

    const volumeIcon = document.querySelector('.volume-icon');
    if (volumeIcon) {
        volumeIcon.classList.remove('fa-volume-mute', 'fa-volume-down', 'fa-volume-up');

        if (volume === 0) {
            volumeIcon.classList.add('fa-volume-mute');
        } else if (volume < 50) {
            volumeIcon.classList.add('fa-volume-down');
        } else {
            volumeIcon.classList.add('fa-volume-up');
        }
    }

    try {
        await spotifyApi.setVolume(volume);
        console.log('Volume updated to:', volume);
    } catch (err) {
        console.error('Volume error:', err);
        if (err.statusCode === 401) {
            await refreshAccessToken();
        }
    }
}

// Start auto-refreshing current track info
function startAutoRefresh() {
    if (refreshInterval) {
        clearInterval(refreshInterval);
    }

    refreshInterval = setInterval(() => {
        if (spotifyApi && spotifyApi.getAccessToken()) {
            const now = Date.now();
            if (now - lastRefreshTime >= REFRESH_INTERVAL) {
                lastRefreshTime = now;
                getCurrentTrack().catch(err => console.error('Auto-refresh error:', err));
            }
        }
    }, 500);
}

// Cleanup on window unload
window.addEventListener('beforeunload', () => {
    if (refreshInterval) {
        clearInterval(refreshInterval);
    }
});

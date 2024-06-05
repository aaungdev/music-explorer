const clientId = 'e207ba36bbf94dba8a772e8ee2633c25';
const clientSecret = '9e21bef7d6f3426181e143d759e6f090';
let currentAudio = null;
let currentTrackIndex = 0;
let currentTracks = [];
let autoplay = false;

document.addEventListener('DOMContentLoaded', () => {
    getToken().then(token => {
        window.spotifyToken = token;
        fetchPopularArtists();
    });

    document.getElementById('playPause').addEventListener('click', togglePlayPause);
    document.getElementById('nextTrack').addEventListener('click', playNextTrack);
    document.getElementById('prevTrack').addEventListener('click', playPreviousTrack);
    document.getElementById('progressBar').addEventListener('input', seekTrack);
    document.getElementById('autoplayToggle').addEventListener('click', toggleAutoplay);
});

async function getToken() {
    const result = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': 'Basic ' + btoa(clientId + ':' + clientSecret)
        },
        body: 'grant_type=client_credentials'
    });
    const data = await result.json();
    return data.access_token;
}

async function fetchPopularArtists() {
    const token = window.spotifyToken;
    let artists = [];
    const genres = ['pop', 'rock', 'hip-hop', 'classical', 'jazz', 'electronic'];
    const limit = 50;

    for (const genre of genres) {
        const response = await fetch(`https://api.spotify.com/v1/search?q=genre:${genre}&type=artist&limit=${limit}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        const data = await response.json();
        artists = artists.concat(data.artists.items);
    }

    const uniqueArtists = artists.reduce((unique, artist) => {
        if (!unique.some(a => a.id === artist.id)) {
            unique.push(artist);
        }
        return unique;
    }, []);

    uniqueArtists.sort((a, b) => a.name.localeCompare(b.name));

    const artistDropdown = document.getElementById('artistDropdown');
    uniqueArtists.forEach(artist => {
        const option = document.createElement('option');
        option.value = artist.id;
        option.innerText = artist.name;
        artistDropdown.appendChild(option);
    });
}

async function searchItems() {
    const query = document.getElementById('searchInput').value;
    if (query.length === 0) return;

    const token = window.spotifyToken;
    const response = await fetch(`https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=50`, {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });
    const data = await response.json();
    displaySongs(data.tracks.items);
    currentTracks = data.tracks.items;
}

async function fetchArtistSongs() {
    const artistId = document.getElementById('artistDropdown').value;
    if (!artistId) return;

    const token = window.spotifyToken;
    const response = await fetch(`https://api.spotify.com/v1/artists/${artistId}/top-tracks?market=US`, {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });
    const data = await response.json();
    displaySongs(data.tracks);
    currentTracks = data.tracks;
}

function displaySongs(songs) {
    const content = document.getElementById('content');
    content.innerText = '';

    const validSongs = songs.filter(song => song.preview_url);
    if (validSongs.length === 0) return;

    validSongs.forEach((song, index) => {
        const card = createCard(song.album.images[0]?.url, song.name, song.artists.map(artist => artist.name).join(', '), song.preview_url, index);
        content.appendChild(card);
    });
}

function createCard(imageUrl, title, description, previewUrl, index) {
    const card = document.createElement('div');
    card.classList.add('card');

    const img = document.createElement('img');
    img.src = imageUrl || 'https://via.placeholder.com/200';
    img.alt = title;
    card.appendChild(img);

    const titleElement = document.createElement('h3');
    titleElement.innerText = title;
    card.appendChild(titleElement);

    const descriptionElement = document.createElement('p');
    descriptionElement.innerText = description;
    card.appendChild(descriptionElement);

    if (previewUrl) {
        const button = document.createElement('button');
        button.classList.add('play-button');
        const playIcon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        playIcon.setAttribute('width', '24');
        playIcon.setAttribute('height', '24');
        playIcon.setAttribute('fill', '#000000');
        playIcon.setAttribute('viewBox', '0 0 24 24');
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', 'M8 5v14l11-7z');
        playIcon.appendChild(path);
        button.appendChild(playIcon);
        button.onclick = () => playMusic(previewUrl, title, description, index);
        card.appendChild(button);
    }

    return card;
}

function playMusic(url, title, artist, index) {
    if (currentAudio) {
        currentAudio.pause();
    }
    currentAudio = new Audio(url);
    currentAudio.play();
    currentTrackIndex = index;

    document.getElementById('playerTitle').innerText = title;
    document.getElementById('playerArtist').innerText = artist;
    document.getElementById('playPauseIcon').innerHTML = ''; 
    const pauseIcon = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    pauseIcon.setAttribute('d', 'M6 4h4v16H6zm8 0h4v16h-4z');
    document.getElementById('playPauseIcon').appendChild(pauseIcon);
    document.getElementById('player').style.display = 'flex';

    currentAudio.addEventListener('ended', () => {
        if (autoplay) {
            playNextTrack();
        }
    });
    currentAudio.addEventListener('timeupdate', updateProgress);
}

function togglePlayPause() {
    const playPauseIcon = document.getElementById('playPauseIcon');
    playPauseIcon.innerHTML = ''; 
    if (currentAudio.paused) {
        currentAudio.play();
        const pauseIcon = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        pauseIcon.setAttribute('d', 'M6 4h4v16H6zm8 0h4v16h-4z');
        playPauseIcon.appendChild(pauseIcon);
    } else {
        currentAudio.pause();
        const playIcon = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        playIcon.setAttribute('d', 'M8 5v14l11-7z');
        playPauseIcon.appendChild(playIcon);
    }
}

function playNextTrack() {
    currentTrackIndex = (currentTrackIndex + 1) % currentTracks.length;
    const nextTrack = currentTracks[currentTrackIndex];
    playMusic(nextTrack.preview_url, nextTrack.name, nextTrack.artists.map(artist => artist.name).join(', '), currentTrackIndex);
}

function playPreviousTrack() {
    currentTrackIndex = (currentTrackIndex - 1 + currentTracks.length) % currentTracks.length;
    const prevTrack = currentTracks[currentTrackIndex];
    playMusic(prevTrack.preview_url, prevTrack.name, prevTrack.artists.map(artist => artist.name).join(', '), currentTrackIndex);
}

function toggleAutoplay() {
    autoplay = !autoplay;
    const autoplayIcon = document.getElementById('autoplayIcon');
    autoplayIcon.innerText = autoplay ? '🔁' : '➡️';
}

function updateProgress() {
    const progressBar = document.getElementById('progressBar');
    progressBar.value = (currentAudio.currentTime / currentAudio.duration) * 100;
    document.getElementById('currentTime').innerText = formatTime(currentAudio.currentTime);
    document.getElementById('duration').innerText = formatTime(currentAudio.duration);
}

function seekTrack(event) {
    const seekTime = (event.target.value / 100) * currentAudio.duration;
    currentAudio.currentTime = seekTime;
}

function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes}:${secs < 10 ? '0' : ''}${secs}`;
}

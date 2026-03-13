(function() {
    const s = window.PlayerState;
    const u = window.PlayerUtils;

    window.MainViewController = {
        init: function() {
            document.getElementById('btnPlayAll').addEventListener('click', () => window.PlayerController.startPlaybackSession('normal'));
            document.getElementById('btnShuffleAll').addEventListener('click', () => window.PlayerController.startPlaybackSession('shuffle'));
        },

        selectPlaylist: function(index) {
            document.querySelectorAll('.playlist-item').forEach(el => el.classList.remove('active'));
            s.currentPlaylistIndex = index;
            window.SidebarController.renderSidebar(); 
            this.renderMainView();
        },

        renderMainView: function() {
            if (s.currentPlaylistIndex === -1 || !s.playlists[s.currentPlaylistIndex]) return;
            const plData = s.playlists[s.currentPlaylistIndex];
            const songs = u.sortSongs(plData.songs, plData.sortBy);
            
            document.getElementById('currentPlaylistTitle').textContent = plData.playlistName;
            document.getElementById('currentPlaylistCount').textContent = `${songs.length} 曲`;
            
            let totalSec = 0;
            songs.forEach(song => {
                if(song.duration && song.duration!=="--:--") {
                    const p = song.duration.split(':');
                    if(p.length===2) totalSec += parseInt(p[0])*60 + parseInt(p[1]);
                }
            });
            document.getElementById('currentPlaylistDuration').textContent = u.formatTotalDuration(totalSec);

            const cover = document.getElementById('playlistCoverArt');
            if (songs.length>0 && songs[0].imageData) cover.src = songs[0].imageData;
            else cover.src = s.DEFAULT_ICON;

            document.getElementById('playlistActions').style.display = 'flex';

            const tbody = document.getElementById('songListBody');
            tbody.innerHTML = '';
            
            songs.forEach((song, idx) => {
                const tr = document.createElement('tr');
                const isPlaying = window.PlayerController.isSongPlaying(song);
                if (isPlaying) tr.classList.add('current-playing');

                const artSrc = song.imageData || s.DEFAULT_ICON;
                
                tr.innerHTML = `
                    <td class="col-status">${isPlaying ? s.ICON_PLAYING : ''}</td>
                    <td class="col-art">
                        <div class="art-container">
                            <img src="${artSrc}">
                            <div class="art-overlay" onclick="window.MainViewController.playTrackAtIndex(${idx})">${s.SVG_PLAY}</div>
                        </div>
                    </td>
                    <td class="col-title">${u.escapeHtml(song.title)}</td>
                    <td class="col-artist">${u.escapeHtml(song.artist)}</td>
                    <td class="col-album">${u.escapeHtml(song.album)}</td>
                    <td class="col-genre">${u.escapeHtml(song.genre)}</td>
                    <td class="col-time">${song.duration}</td>
                `;
                tr.ondblclick = (e) => {
                    if (e.target.closest('.art-container')) return;
                    window.PlayerController.startPlaybackSession('normal', idx);
                };
                tbody.appendChild(tr);
            });
        },

        playTrackAtIndex: function(idx) {
            s.isShuffle = false; 
            s.loopMode = 'off';
            window.PlayerController.startPlaybackSession('normal', idx);
        }
    };
})();
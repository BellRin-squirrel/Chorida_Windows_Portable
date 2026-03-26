document.addEventListener('DOMContentLoaded', () => {
    window.SourceController.init();
    window.ArtworkController.init();
    window.LyricController.init();

    const loadingOverlay = document.getElementById('loadingOverlay');
    const loadingText = document.getElementById('loadingText');

    function showLoading(msg) {
        loadingText.textContent = msg;
        loadingOverlay.style.display = 'flex';
    }

    function hideLoading() {
        loadingOverlay.style.display = 'none';
    }

    document.getElementById('addMusicForm').onsubmit = async (e) => {
        e.preventDefault();
        
        const u = window.AddMusicUtils;
        const sCtrl = window.SourceController;
        const aCtrl = window.ArtworkController;
        const lCtrl = window.LyricController;

        const sourceType = sCtrl.getSourceType();
        let musicFile = null;
        let videoInfo = null;

        if (sourceType === 'local') {
            musicFile = sCtrl.getMusicFile();
            if (!musicFile) {
                u.showAlert("音源となるファイルを選択してください");
                return;
            }
        } else if (sourceType === 'download') {
            videoInfo = sCtrl.getVideoInfo();
            if (!videoInfo) {
                u.showAlert("動画情報を取得してください");
                return;
            }
        }

        const metaData = {
            title: document.getElementById('title').value.trim(),
            artist: document.getElementById('artist').value.trim(),
            album: document.getElementById('album').value.trim(),
            genre: document.getElementById('genre').value.trim(),
            track: document.getElementById('track').value.trim(),
            lyric: document.getElementById('lyric').value.trim()
        };

        metaData.artwork_data = aCtrl.getArtworkData(); 
        metaData.artwork_type = aCtrl.getActiveTab(); 

        const btnSubmit = document.getElementById('btnSubmitAll');
        btnSubmit.disabled = true;

        try {
            let result = false;

            if (sourceType === 'local') {
                showLoading("ファイルの読み込み中...");
                const b64Music = await u.readFileAsBase64(musicFile);
                
                metaData.music_data = b64Music;
                metaData.music_name = musicFile.name;

                showLoading("ライブラリへ保存中...");
                result = await eel.save_music_data(metaData)();
                
            } else if (sourceType === 'download') {
                showLoading("動画をダウンロード中... (数分かかる場合があります)");
                metaData.video_url = videoInfo.url;
                result = await eel.download_and_save_music(metaData)();
            }

            hideLoading();

            if (result) {
                u.showAlert("楽曲をライブラリに追加しました！");
                
                document.getElementById('addMusicForm').reset();
                sCtrl.reset();
                aCtrl.resetLocal();
                document.getElementById('lyric').value = '';
                
            } else {
                u.showAlert("保存に失敗しました。");
            }
            
        } catch (error) {
            hideLoading();
            console.error("Save Error:", error);
            u.showAlert("予期せぬエラーが発生しました。\n" + error.message);
        } finally {
            btnSubmit.disabled = false;
        }
    };
});
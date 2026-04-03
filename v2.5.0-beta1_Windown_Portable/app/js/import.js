document.addEventListener('DOMContentLoaded', () => {
    
    // --- 共通要素 ---
    const toast = document.getElementById('toast');
    const progressArea = document.getElementById('progressArea');
    const progressBar = document.getElementById('progressBar');
    const progressText = document.getElementById('progressText');
    const logArea = document.getElementById('logArea');
    const logList = document.getElementById('logList');

    let selectedFile = null;
    let selectedZipFile = null;
    let scannedData = [];
    let tempDir = null;
    let activeTags = [];
    let currentEditIndex = -1;

    // --- Tab Switching ---
    const tabs = document.querySelectorAll('.tab-btn');
    const contents = document.querySelectorAll('.tab-content');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            contents.forEach(c => c.classList.remove('active'));
            tab.classList.add('active');
            document.getElementById(tab.dataset.tab).classList.add('active');
            logArea.style.display = 'none';
        });
    });

    // --- Helpers ---
    function setupDragAndDrop(area, cb) {
        area.ondragover = (e) => { e.preventDefault(); area.classList.add('dragover'); };
        area.ondragleave = () => area.classList.remove('dragover');
        area.ondrop = (e) => { e.preventDefault(); area.classList.remove('dragover'); if(e.dataTransfer.files[0]) cb(e.dataTransfer.files[0]); };
    }
    function uiStartProcess(msg) { progressText.textContent = msg; progressArea.style.display = 'flex'; progressBar.style.width = '0%'; }
    function uiEndProcess() { progressArea.style.display = 'none'; }
    function showToast(m, e) { toast.textContent = m; toast.className = 'toast show '+(e?'error':'success'); setTimeout(()=>toast.classList.remove('show'), 4000); }
    function showAlert(t, m) { document.getElementById('alertTitle').textContent = t; document.getElementById('alertMessage').textContent = m; document.getElementById('alertModal').classList.add('show'); }
    document.getElementById('btnAlertOk').onclick = () => document.getElementById('alertModal').classList.remove('show');

    // ============================================================
    //  TAB 1: List Import (JSON/CSV)
    // ============================================================
    const dropArea = document.getElementById('dropArea');
    const fileInput = document.getElementById('fileInput');
    const btnImport = document.getElementById('btnImport');
    const fileInfo = document.getElementById('fileInfo');

    dropArea.onclick = () => fileInput.click();
    setupDragAndDrop(dropArea, (file) => handleListFile(file));
    fileInput.onchange = (e) => handleListFile(e.target.files[0]);

    function handleListFile(file) {
        if (!file) return;
        selectedFile = file;
        document.getElementById('fileName').textContent = file.name;
        dropArea.style.display = 'none';
        fileInfo.style.display = 'flex';
        btnImport.disabled = false;
    }

    document.getElementById('btnClearFile').onclick = () => {
        selectedFile = null; fileInput.value = ''; dropArea.style.display = 'block'; fileInfo.style.display = 'none'; btnImport.disabled = true;
    };

    btnImport.onclick = () => {
        const reader = new FileReader();
        reader.onload = async (e) => {
            uiStartProcess("データを読み込み中...");
            const ext = selectedFile.name.split('.').pop().toLowerCase();
            const logs = await eel.execute_import(e.target.result, ext)();
            uiEndProcess();
            showAlert("完了", "インポートが完了しました。");
        };
        reader.readAsText(selectedFile);
    };

    // ============================================================
    //  TAB 2: MP3 ZIP Direct Import
    // ============================================================
    const dropAreaZip = document.getElementById('dropAreaZip');
    const fileInputZip = document.getElementById('fileInputZip');
    const btnScanZip = document.getElementById('btnScanZip');
    const zipFileInfo = document.getElementById('zipFileInfo');
    const zipResultSection = document.getElementById('zipResultSection');
    const zipUploadSection = document.getElementById('zipUploadSection');
    const btnRescan = document.getElementById('btnRescan');

    dropAreaZip.onclick = () => fileInputZip.click();
    setupDragAndDrop(dropAreaZip, (file) => handleZipFileSelect(file));
    fileInputZip.onchange = (e) => handleZipFileSelect(e.target.files[0]);

    function handleZipFileSelect(file) {
        if (!file || !file.name.toLowerCase().endsWith('.zip')) { showToast("ZIPファイルを選択してください", true); return; }
        selectedZipFile = file;
        document.getElementById('zipFileName').textContent = file.name;
        dropAreaZip.style.display = 'none';
        zipFileInfo.style.display = 'flex';
        btnScanZip.disabled = false;
    }

    document.getElementById('btnClearZipFile').onclick = () => {
        selectedZipFile = null; fileInputZip.value = ''; dropAreaZip.style.display = 'block'; zipFileInfo.style.display = 'none'; btnScanZip.disabled = true;
    };

    btnScanZip.onclick = () => startZipAnalysis(null);

    async function startZipAnalysis(password) {
        uiStartProcess("ZIPファイルを読み込み中...");
        const reader = new FileReader();
        reader.onload = async (e) => {
            uiStartProcess("ZIPファイルを解析中...");
            const res = await eel.scan_mp3_zip_from_data(e.target.result, password)();
            if (res.status === 'password_required') {
                uiEndProcess();
                document.getElementById('zipPassword').value = '';
                document.getElementById('passwordModal').style.display = 'flex';
            } else if (res.status === 'success') {
                scannedData = res.data;
                tempDir = res.temp_dir;
                activeTags = res.active_tags;
                renderMp3Table();
                zipUploadSection.style.display = 'none';
                document.getElementById('zipActionArea').style.display = 'none';
                zipResultSection.style.display = 'block';
                uiEndProcess();
            } else {
                uiEndProcess();
                showToast(res.message, true);
            }
        };
        reader.readAsDataURL(selectedZipFile);
    }

    document.getElementById('btnSubmitPass').onclick = () => {
        const pwd = document.getElementById('zipPassword').value;
        document.getElementById('passwordModal').style.display = 'none';
        startZipAnalysis(pwd);
    };
    document.getElementById('btnCancelPass').onclick = () => document.getElementById('passwordModal').style.display = 'none';

    function renderMp3Table() {
        const thead = document.getElementById('mp3TableHeader');
        const tbody = document.getElementById('mp3TableBody');
        let h = `<tr><th>状態</th><th>No.</th><th>パス</th><th>アート</th><th>タイトル *</th><th>アーティスト *</th>`;
        activeTags.forEach(t => { if(t!=='title' && t!=='artist') h += `<th>${t}</th>`; });
        h += `<th>操作</th></tr>`;
        thead.innerHTML = h;

        tbody.innerHTML = '';
        scannedData.forEach((item, idx) => {
            const tr = document.createElement('tr');
            const artSrc = item.artwork_base64 || 'icon/Chordia.png';
            let row = `<td>${item.status==='ok'?'OK':'要確認'}</td><td>${item.id}</td><td class="col-path" title="${item.rel_path}">${item.rel_path}</td>
                <td class="col-art-thumb"><img src="${artSrc}"></td>
                <td><input type="text" class="edit-input" value="${item.title||''}" onchange="updateScanned(${idx}, 'title', this.value)"></td>
                <td><input type="text" class="edit-input" value="${item.artist||''}" onchange="updateScanned(${idx}, 'artist', this.value)"></td>`;
            activeTags.forEach(t => { if(t!=='title' && t!=='artist') row += `<td><input type="text" class="edit-input" value="${item[t]||''}" onchange="updateScanned(${idx}, '${t}', this.value)"></td>`; });
            row += `<td class="col-action">
                <button class="btn-icon-action" onclick="openLyricsModal(${idx})" title="歌詞を編集"><svg style="width:20px;height:20px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg></button>
                <button class="btn-icon-action" onclick="openArtModal(${idx})" title="アートワークを変更"><svg style="width:20px;height:20px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg></button>
                <button class="btn-del-row" onclick="deleteScanned(${idx})">削除</button>
            </td>`;
            tr.innerHTML = row;
            tbody.appendChild(tr);
        });
    }

    window.updateScanned = (idx, key, val) => { scannedData[idx][key] = val; scannedData[idx].status = (scannedData[idx].title && scannedData[idx].artist) ? 'ok' : 'missing_meta'; renderMp3Table(); };
    window.deleteScanned = (idx) => { scannedData.splice(idx, 1); renderMp3Table(); };

    btnRescan.onclick = () => {
        scannedData = []; zipResultSection.style.display = 'none'; zipUploadSection.style.display = 'block'; document.getElementById('zipActionArea').style.display = 'block'; document.getElementById('btnClearZipFile').click();
    };

    // 歌詞編集
    const lyricModal = document.getElementById('lyricModal');
    window.openLyricsModal = (idx) => { currentEditIndex = idx; document.getElementById('lyricTextArea').value = scannedData[idx].lyric || ''; lyricModal.style.display = 'flex'; };
    document.getElementById('btnCancelLyric').onclick = () => lyricModal.style.display = 'none';
    document.getElementById('btnSaveLyric').onclick = () => { scannedData[currentEditIndex].lyric = document.getElementById('lyricTextArea').value; lyricModal.style.display = 'none'; showToast("反映しました"); };
    
    document.getElementById('btnAutoLyric').onclick = async () => {
        const item = scannedData[currentEditIndex];
        if(!item.title || !item.artist) { showToast("タイトルとアーティストが必要です", true); return; }
        const btn = document.getElementById('btnAutoLyric');
        btn.textContent = "検索中..."; btn.disabled = true;
        try {
            const res = await fetch(`https://lrclib.net/api/search?track_name=${encodeURIComponent(item.title)}&artist_name=${encodeURIComponent(item.artist)}`);
            const data = await res.json();
            const filtered = data.filter(d => d.plainLyrics);
            if(filtered.length > 0) {
                const list = document.getElementById('lyricResultList');
                list.innerHTML = '';
                filtered.forEach(d => {
                    const li = document.createElement('li'); li.className = 'lyric-result-item'; li.innerHTML = `<strong>${d.trackName}</strong><br><small>${d.artistName}</small>`;
                    li.onclick = () => { document.getElementById('lyricTextArea').value = d.plainLyrics; document.getElementById('lyricSearchModal').style.display = 'none'; };
                    list.appendChild(li);
                });
                document.getElementById('lyricSearchModal').style.display = 'flex';
            } else { showToast("見つかりませんでした", true); }
        } catch(e) { showToast("エラー", true); } finally { btn.textContent = "自動取得 (LRCLIB)"; btn.disabled = false; }
    };
    document.getElementById('btnCloseSearch').onclick = () => document.getElementById('lyricSearchModal').style.display = 'none';

    // アートワーク編集モーダル拡張ロジック
    const artModal = document.getElementById('artModal');
    const artPreview = document.getElementById('currentArtPreview');
    window.openArtModal = (idx) => {
        currentEditIndex = idx;
        artPreview.src = scannedData[idx].artwork_base64 || 'icon/Chordia.png';
        document.getElementById('miniVideoUrl').value = '';
        document.getElementById('miniImageUrl').value = '';
        artModal.style.display = 'flex';
        // ローカルタブを初期選択
        document.querySelector('.art-mini-tab-btn[data-target="art-mini-local"]').click();
    };

    // ミニタブ切替
    const miniTabs = document.querySelectorAll('.art-mini-tab-btn');
    miniTabs.forEach(btn => {
        btn.onclick = async () => {
            const target = btn.dataset.target;
            // ツールチェックが必要なタブか確認
            if (target === 'art-mini-video') {
                const status = await eel.check_tools_status()();
                if (!status['yt-dlp'] || !status['ffmpeg']) {
                    showToast("動画機能を利用するには拡張機能（yt-dlp, ffmpeg）をインストールしてください", true);
                    return; // 切り替えない
                }
            }
            miniTabs.forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.art-mini-tab-content').forEach(c => c.classList.remove('active'));
            btn.classList.add('active');
            document.getElementById(target).classList.add('active');
        };
    });

    document.getElementById('newArtInput').onchange = (e) => {
        const file = e.target.files[0];
        if(!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => artPreview.src = ev.target.result;
        reader.readAsDataURL(file);
    };

    // 動画URLから取得
    document.getElementById('btnFetchVideoArt').onclick = async () => {
        const url = document.getElementById('miniVideoUrl').value.trim();
        if (!url) return;
        const btn = document.getElementById('btnFetchVideoArt');
        btn.disabled = true; btn.textContent = "取得中...";
        try {
            const info = await eel.fetch_video_info(url)();
            if (info.status === 'success' && info.thumbnail) {
                const b64 = await eel.fetch_and_crop_thumbnail(info.thumbnail)();
                if (b64) artPreview.src = b64;
                showToast("サムネイルを取得しました");
            } else { showToast(info.message || "取得失敗", true); }
        } catch(e) { showToast("エラー", true); }
        finally { btn.disabled = false; btn.textContent = "サムネを取得"; }
    };

    // 画像URLから取得
    document.getElementById('btnFetchDirectArt').onclick = async () => {
        const url = document.getElementById('miniImageUrl').value.trim();
        if (!url) return;
        const btn = document.getElementById('btnFetchDirectArt');
        btn.disabled = true; btn.textContent = "取得中...";
        try {
            const res = await eel.fetch_and_crop_image_url(url)();
            if (res.status === 'success') {
                artPreview.src = res.data;
                showToast("画像を取得しました");
            } else { showToast(res.message, true); }
        } catch(e) { showToast("エラー", true); }
        finally { btn.disabled = false; btn.textContent = "画像を取得"; }
    };

    document.getElementById('btnRemoveArt').onclick = () => artPreview.src = 'icon/Chordia.png';
    document.getElementById('btnCancelArt').onclick = () => artModal.style.display = 'none';
    document.getElementById('btnSaveArt').onclick = () => {
        scannedData[currentEditIndex].artwork_base64 = artPreview.src.includes('Chordia.png') ? '' : artPreview.src;
        artModal.style.display = 'none';
        renderMp3Table();
        showToast("反映しました");
    };

    document.getElementById('btnExecZipImport').onclick = async () => {
        const errors = scannedData.filter(d => d.status === 'missing_meta');
        if (errors.length > 0 && !confirm("未入力の項目があります。登録を続行しますか？")) return;
        uiStartProcess("楽曲を追加中...");
        const res = await eel.execute_mp3_zip_import(scannedData, tempDir)();
        uiEndProcess();
        if(res.status === 'success') { showAlert("完了", `${res.count}曲追加しました。`); btnRescan.click(); }
        else showAlert("エラー", res.message);
    };

    eel.expose(js_import_progress);
    function js_import_progress(c, t, m) { progressText.textContent = m; progressBar.style.width = (c/t*100)+'%'; }
});
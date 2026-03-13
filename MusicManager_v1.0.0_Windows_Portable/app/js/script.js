document.addEventListener('DOMContentLoaded', async () => {
    const btnAddMusic = document.getElementById('btnAddMusic');
    const btnManage = document.getElementById('btnManage');
    const btnExport = document.getElementById('btnExport');
    const btnImport = document.getElementById('btnImport');
    const btnPlayer = document.getElementById('btnPlayer');
    const btnMobileSync = document.getElementById('btnMobileSync');
    const btnSettings = document.getElementById('btnSettings');

    if (btnAddMusic) btnAddMusic.addEventListener('click', () => window.location.href = 'add_music.html');

    // ★修正: データベース管理画面の設定分岐
    if (btnManage) {
        btnManage.addEventListener('click', async () => {
            const settings = await eel.get_app_settings()();
            
            if (settings.open_manage_new_window) {
                const width = 1200;
                const height = 900;
                const left = (window.screen.width / 2) - (width / 2);
                const top = (window.screen.height / 2) - (height / 2);

                // 新しいウィンドウで開く（?mode=window クエリを付与）
                window.open(
                    'manage.html?mode=window', 
                    '_blank', 
                    `width=${width},height=${height},left=${left},top=${top},menubar=no,toolbar=no,location=no,status=no,resizable=yes,scrollbars=yes`
                );
            } else {
                window.location.href = 'manage.html';
            }
        });
    }

    if (btnExport) btnExport.addEventListener('click', () => window.location.href = 'export.html');
    if (btnImport) btnImport.addEventListener('click', () => window.location.href = 'import.html');

    if (btnPlayer) {
        btnPlayer.addEventListener('click', async () => {
            const settings = await eel.get_app_settings()();
            if (settings.open_player_new_window) {
                const width = 1200;
                const height = 900;
                const left = (window.screen.width / 2) - (width / 2);
                const top = (window.screen.height / 2) - (height / 2);
                window.open(
                    'player.html', 
                    '_blank', 
                    `width=${width},height=${height},left=${left},top=${top},menubar=no,toolbar=no,location=no,status=no,resizable=yes,scrollbars=yes`
                );
            } else {
                window.location.href = 'player.html';
            }
        });
    }

    const syncModal = document.getElementById('syncModal');
    const btnCloseSync = document.getElementById('btnCloseSync');
    if (btnMobileSync && syncModal) {
        btnMobileSync.addEventListener('click', async () => {
            const info = await eel.get_connect_info()();
            const ipEl = document.getElementById('syncIpAddress');
            const portEl = document.getElementById('syncPort');
            if (ipEl) ipEl.textContent = info.ip;
            if (portEl) portEl.textContent = info.port;
            syncModal.style.display = 'flex';
            setTimeout(() => syncModal.style.opacity = '1', 10);
        });
    }
    if (btnCloseSync) {
        btnCloseSync.addEventListener('click', () => {
            syncModal.style.opacity = '0';
            setTimeout(() => syncModal.style.display = 'none', 300);
        });
    }

    if (btnSettings) btnSettings.addEventListener('click', () => window.location.href = 'settings.html');
});
(function() {
    const s = window.PlayerState;
    const u = window.PlayerUtils;

    window.SidebarController = {
        
        deleteTargetIndex: -1,
        smartTags: [],
        
        // 文字列系タグ用オペレータ
        textOps: [
            {val: 'contains', label: 'を含む'},
            {val: 'not_contains', label: 'を含まない'},
            {val: 'equals', label: 'である'},
            {val: 'not_equals', label: 'ではない'},
            {val: 'startswith', label: 'で始まる'},
            {val: 'endswith', label: 'で終わる'}
        ],
        // 数値系タグ用オペレータ
        numOps: [
            {val: 'equals', label: 'である'},
            {val: 'not_equals', label: 'ではない'},
            {val: 'greater', label: 'より大きい'},
            {val: 'less', label: 'より小さい'},
            {val: 'range', label: 'の範囲内'}
        ],

        init: function() {
            this.sidebar = document.getElementById('sidebar');
            this.playlistList = document.getElementById('playlistList');
            
            document.addEventListener('click', () => {
                const bg = document.getElementById('playlistBackgroundMenu');
                const it = document.getElementById('playlistItemMenu');
                if(bg) bg.style.display='none';
                if(it) it.style.display='none';
            });
            
            if (this.sidebar) {
                this.sidebar.addEventListener('contextmenu', (e) => {
                    if (!e.target.closest('.playlist-item')) {
                        e.preventDefault();
                        const menu = document.getElementById('playlistBackgroundMenu');
                        if (menu) this.showContextMenu(menu, e.clientX, e.clientY);
                    }
                });
            }

            // Menu Actions
            const menuNew = document.getElementById('menuNewPlaylist');
            if(menuNew) menuNew.addEventListener('click', () => { s.editingPlaylistIndex = 'new'; this.renderSidebar(); });

            const menuNewSmart = document.getElementById('menuNewSmartPlaylist');
            if(menuNewSmart) menuNewSmart.addEventListener('click', () => { 
                this.openSmartPlaylistModal();
            });

            // スマートプレイリストモーダルのボタンイベント
            const btnCancelSmart = document.getElementById('btnCancelSmart');
            if(btnCancelSmart) btnCancelSmart.addEventListener('click', () => {
                document.getElementById('smartPlaylistModal').classList.remove('show');
            });

            const btnCreateSmart = document.getElementById('btnCreateSmart');
            if(btnCreateSmart) btnCreateSmart.addEventListener('click', () => {
                document.getElementById('smartPlaylistModal').classList.remove('show');
                // 今後の実装で、入力された条件を配列にして作成APIを叩く
                console.log("スマートプレイリスト作成ボタンが押されました");
            });

            const menuPlay = document.getElementById('menuPlayPlaylist');
            if(menuPlay) menuPlay.addEventListener('click', () => {
                window.MainViewController.selectPlaylist(s.contextTargetIndex);
                window.PlayerController.startPlaybackSession('normal');
            });

            const menuShuffle = document.getElementById('menuShufflePlaylist');
            if(menuShuffle) menuShuffle.addEventListener('click', () => {
                window.MainViewController.selectPlaylist(s.contextTargetIndex);
                window.PlayerController.startPlaybackSession('shuffle');
            });

            const menuRename = document.getElementById('menuRenamePlaylist');
            if(menuRename) menuRename.addEventListener('click', () => {
                s.editingPlaylistIndex = s.contextTargetIndex;
                this.renderSidebar();
            });

            const menuDup = document.getElementById('menuDuplicatePlaylist');
            if(menuDup) menuDup.addEventListener('click', async () => {
                this.showSaving();
                const plId = s.playlists[s.contextTargetIndex].id;
                const newPl = await eel.duplicate_playlist_by_id(plId)();
                if (newPl) {
                    s.playlists.push(newPl);
                    s.playlists.sort((a, b) => (a.playlistName||"").toLowerCase().localeCompare((b.playlistName||"").toLowerCase(), 'ja'));
                    this.renderSidebar();
                }
                this.hideSaving();
                u.showToast("複製しました", false);
            });

            const menuDel = document.getElementById('menuDeletePlaylist');
            if(menuDel) menuDel.addEventListener('click', () => {
                this.openDeleteModal(s.contextTargetIndex);
            });

            const btnCancelDel = document.getElementById('btnCancelDelPl');
            const btnExecDel = document.getElementById('btnExecDelPl');
            if(btnCancelDel) btnCancelDel.addEventListener('click', () => document.getElementById('playlistDeleteModal').classList.remove('show'));
            if(btnExecDel) btnExecDel.addEventListener('click', () => this.executeDelete());

            // Shortcuts
            document.addEventListener('keydown', (e) => {
                if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA') return;
                if (e.key === 'F2') {
                    if (s.currentPlaylistIndex !== -1) { e.preventDefault(); s.editingPlaylistIndex = s.currentPlaylistIndex; this.renderSidebar(); }
                }
                if (e.key === 'Delete') {
                    if (s.currentPlaylistIndex !== -1) { e.preventDefault(); this.openDeleteModal(s.currentPlaylistIndex); }
                }
            });
        },

        showSaving: function() { 
            const el = document.getElementById('savingOverlay');
            if(el) el.style.display = 'flex'; 
        },
        hideSaving: function() { 
            const el = document.getElementById('savingOverlay');
            if(el) el.style.display = 'none'; 
        },

        loadPlaylists: async function() {
            u.showLoading();
            try {
                u.updateLoadingProgress(0, 0, "楽曲一覧を取得中...");
                s.fullLibrary = await eel.get_library_data_with_meta(false)();

                u.updateLoadingProgress(0, 0, "プレイリスト一覧を取得中...");
                const summaries = await eel.get_playlist_summaries()();
                summaries.sort((a, b) => (a.playlistName||"").toLowerCase().localeCompare((b.playlistName||"").toLowerCase(), 'ja'));
                s.playlists = summaries;
                
                this.renderSidebar();

                const total = s.playlists.length;
                for (let i = 0; i < total; i++) {
                    const pl = s.playlists[i];
                    u.updateLoadingProgress(i + 1, total, "プレイリスト一覧を取得中...");
                    const details = await eel.get_playlist_details(pl.id)();
                    if (details) {
                        s.playlists[i] = details;
                        if (s.currentPlaylistIndex === i) {
                            window.MainViewController.renderMainView();
                        }
                    }
                }

                if (s.currentPlaylistIndex === -1 && s.playlists.length > 0) {
                    window.MainViewController.selectPlaylist(0);
                }

            } catch (e) { 
                console.error("Load Error:", e); 
                u.showToast("読み込み中にエラーが発生しました", true);
            } finally { 
                u.hideLoading(); 
            }
        },

        renderSidebar: function() {
            if(!this.playlistList) return;
            this.playlistList.innerHTML = '';
            
            s.playlists.forEach((pl, index) => {
                const li = document.createElement('li');
                li.className = 'playlist-item';
                
                const isSmart = pl.type === 'smart';
                const iconSvg = isSmart ? 
                    `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" style="width:20px;height:20px;"><path stroke-linecap="round" stroke-linejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" /></svg>` :
                    `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" style="width:20px;height:20px;"><path stroke-linecap="round" stroke-linejoin="round" d="M9 9l10.5-3m0 6.553v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 11-.99-3.467l2.31-.66a2.25 2.25 0 001.632-2.163zm0 0V2.25L9 5.25v10.303m0 0v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 11-.99-3.467l2.31-.66a2.25 2.25 0 001.632-2.163z" /></svg>`;

                if (index === s.editingPlaylistIndex) {
                    li.innerHTML = iconSvg;
                    const input = document.createElement('input');
                    input.type = 'text'; input.value = pl.playlistName; input.className = 'playlist-name-input';
                    let cancelled = false;
                    input.onblur = () => { if(!cancelled) this.finishRename(index, input.value); };
                    input.onkeydown = (e) => {
                        if(e.key === 'Enter') input.blur();
                        else if(e.key === 'Escape') { cancelled = true; s.editingPlaylistIndex = -1; this.renderSidebar(); }
                    };
                    li.appendChild(input); setTimeout(()=>input.select(), 0);
                } else {
                    li.innerHTML = `${iconSvg}<span>${u.escapeHtml(pl.playlistName)}</span>`;
                    li.onclick = () => window.MainViewController.selectPlaylist(index);
                    li.addEventListener('contextmenu', (e) => {
                        e.preventDefault(); e.stopPropagation(); s.contextTargetIndex = index;
                        const menu = document.getElementById('playlistItemMenu');
                        if (menu) this.showContextMenu(menu, e.clientX, e.clientY);
                    });
                }
                this.playlistList.appendChild(li);
            });

            if (s.editingPlaylistIndex === 'new') this.createTemporaryInput('normal');

            if (s.currentPlaylistIndex >= 0 && s.playlists[s.currentPlaylistIndex]) {
                const items = this.playlistList.querySelectorAll('.playlist-item');
                if(items[s.currentPlaylistIndex]) items[s.currentPlaylistIndex].classList.add('active');
            }
        },

        createTemporaryInput: function(type = 'normal') {
            const li = document.createElement('li');
            li.className = 'playlist-item';
            const iconSvg = type === 'smart' ? 
                `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" style="width:20px;height:20px;"><path stroke-linecap="round" stroke-linejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" /></svg>` :
                `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" style="width:20px;height:20px;"><path stroke-linecap="round" stroke-linejoin="round" d="M9 9l10.5-3m0 6.553v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 11-.99-3.467l2.31-.66a2.25 2.25 0 001.632-2.163zm0 0V2.25L9 5.25v10.303m0 0v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 11-.99-3.467l2.31-.66a2.25 2.25 0 001.632-2.163z" /></svg>`;
            
            li.innerHTML = iconSvg;
            
            const input = document.createElement('input');
            input.type='text'; 
            input.value = type === 'smart' ? "新規スマートプレイリスト" : "新規プレイリスト"; 
            input.className='playlist-name-input';
            
            let cancelled=false;
            input.onblur=()=>{ if(!cancelled) this.finishCreate(input.value, type); };
            input.onkeydown=(e)=>{ 
                if(e.key==='Enter') input.blur(); 
                else if(e.key==='Escape') { cancelled=true; s.editingPlaylistIndex=-1; this.renderSidebar(); }
            };
            
            li.appendChild(input); 
            this.playlistList.appendChild(li); 
            setTimeout(()=>input.select(), 0);
        },

        openSmartPlaylistModal: async function() {
            try {
                // 有効なタグとすべてのタグをPythonから取得
                const settings = await eel.get_app_settings()();
                const allTags = await eel.get_available_tags()();
                
                const activeTags = settings.active_tags; 
                this.smartTags = allTags.filter(t => activeTags.includes(t.key));

                this.renderSmartConditionRow();
                
                const modal = document.getElementById('smartPlaylistModal');
                if(modal) modal.classList.add('show');
            } catch(e) {
                console.error("Smart Playlist init error:", e);
                u.showToast("設定の読み込みに失敗しました", true);
            }
        },

        renderSmartConditionRow: function() {
            const container = document.getElementById('smartConditionContainer');
            container.innerHTML = ''; // まずは1行だけ作成する

            const row = document.createElement('div');
            row.className = 'smart-condition-row';

            // ① タグ選択のプルダウン
            const tagSelect = document.createElement('select');
            tagSelect.className = 'smart-tag-select';
            this.smartTags.forEach(t => {
                const opt = document.createElement('option');
                opt.value = t.key;
                opt.textContent = t.label;
                tagSelect.appendChild(opt);
            });
            
            // ② 「が」
            const textSpan = document.createElement('span');
            textSpan.className = 'smart-text';
            textSpan.textContent = 'が';
            
            // ③ 入力欄コンテナ
            const inputContainer = document.createElement('div');
            inputContainer.className = 'smart-input-container';
            
            // ④ オペレータ選択のプルダウン
            const opSelect = document.createElement('select');
            opSelect.className = 'smart-op-select';

            // 入力欄とオペレータをタグに応じて更新する内部関数
            const updateRow = () => {
                const tag = tagSelect.value;
                const isNum = ['track', 'year', 'disc', 'bpm'].includes(tag);
                
                // オペレータの更新（選択状態を維持できるかチェック）
                const prevOp = opSelect.value;
                opSelect.innerHTML = '';
                const ops = isNum ? this.numOps : this.textOps;
                ops.forEach(o => {
                    const opt = document.createElement('option');
                    opt.value = o.val;
                    opt.textContent = o.label;
                    opSelect.appendChild(opt);
                });
                if (Array.from(opSelect.options).some(o => o.value === prevOp)) {
                    opSelect.value = prevOp;
                }
                
                // inputの更新
                const op = opSelect.value;
                inputContainer.innerHTML = '';
                
                if (isNum) {
                    if (op === 'range') {
                        inputContainer.innerHTML = `
                            <input type="number" class="smart-input">
                            <span class="smart-text">と</span>
                            <input type="number" class="smart-input">
                        `;
                    } else {
                        inputContainer.innerHTML = `
                            <input type="number" class="smart-input">
                        `;
                    }
                } else {
                    inputContainer.innerHTML = `
                        <input type="text" class="smart-input">
                    `;
                }
            };
            
            tagSelect.addEventListener('change', updateRow);
            opSelect.addEventListener('change', () => {
                updateRow(); 
            });
            
            row.appendChild(tagSelect);
            row.appendChild(textSpan);
            row.appendChild(inputContainer);
            row.appendChild(opSelect);
            
            container.appendChild(row);
            updateRow(); // 初期化
        },

        finishCreate: async function(name, type) {
            s.editingPlaylistIndex = -1;
            this.showSaving();
            const newPl = await eel.create_playlist(name, type)(); 
            if (newPl) {
                s.playlists.push(newPl);
                s.playlists.sort((a, b) => (a.playlistName||"").toLowerCase().localeCompare((b.playlistName||"").toLowerCase(), 'ja'));
                this.renderSidebar();
                const newIdx = s.playlists.findIndex(p => p.id === newPl.id);
                window.MainViewController.selectPlaylist(newIdx);
            }
            this.hideSaving();
            u.showToast("作成しました", false);
        },

        finishRename: async function(index, newName) {
            s.editingPlaylistIndex = -1;
            if(!newName.trim()) { this.renderSidebar(); return; }
            this.showSaving();
            const plId = s.playlists[index].id;
            const updatedPl = await eel.update_playlist_by_id(plId, 'playlistName', newName)(); 
            if (updatedPl) {
                s.playlists[index] = updatedPl;
                s.playlists.sort((a, b) => (a.playlistName||"").toLowerCase().localeCompare((b.playlistName||"").toLowerCase(), 'ja'));
                this.renderSidebar();
                const newIdx = s.playlists.findIndex(p => p.id === plId);
                window.MainViewController.selectPlaylist(newIdx);
            }
            this.hideSaving();
            u.showToast("更新しました", false);
        },

        showContextMenu: function(menu, x, y) {
            document.getElementById('playlistBackgroundMenu').style.display='none';
            document.getElementById('playlistItemMenu').style.display='none';
            
            menu.style.display = 'block'; 
            menu.style.visibility = 'hidden'; 
            
            const mw = menu.offsetWidth || 220; 
            const mh = menu.offsetHeight || 220; 
            
            if (x + mw > window.innerWidth) x -= mw;
            if (y + mh > window.innerHeight) y -= mh;
            
            menu.style.left = `${x}px`; 
            menu.style.top = `${y}px`; 
            menu.style.visibility = 'visible'; 
        },

        openDeleteModal: function(index) {
            this.deleteTargetIndex = index;
            const pl = s.playlists[index];
            const nameEl = document.getElementById('delPlaylistName');
            const modal = document.getElementById('playlistDeleteModal');
            if(nameEl) nameEl.textContent = pl.playlistName;
            if(modal) modal.classList.add('show');
        },

        executeDelete: async function() {
            const modal = document.getElementById('playlistDeleteModal');
            if(modal) modal.classList.remove('show');
            this.showSaving();
            const plId = s.playlists[this.deleteTargetIndex].id;
            await eel.delete_playlist_by_id(plId)();
            
            if (this.deleteTargetIndex === s.currentPlaylistIndex) s.currentPlaylistIndex = -1;
            
            s.playlists.splice(this.deleteTargetIndex, 1);
            this.renderSidebar();
            
            this.hideSaving();
            u.showToast("削除しました", false);
        }
    };
})();
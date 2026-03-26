(function() {
    const s = window.PlayerState;

    window.ModalSongSelect = {
        libraryData: [],
        filteredData: [],
        selectedFilenames: new Set(),
        currentPlaylistId: null,
        sortField: null,
        sortDesc: false,
        lastClickedIndex: null,
        _tempContextId: null,

        // --- Core: プレイリストの特定ロジック ---
        findTargetPlaylistId: function() {
            console.log("[DEBUG-CORE] findTargetPlaylistId: Attempting to identify target...");
            if (this._tempContextId) {
                console.log("[DEBUG-CORE] Success: Found ID from manual click tracker:", this._tempContextId);
                return this._tempContextId;
            }
            if (window.SidebarController) {
                const side = window.SidebarController;
                for (let key in side) {
                    const val = side[key];
                    if (typeof val === 'number' && val !== -1 && s.playlists[val]) {
                        console.log(`[DEBUG-CORE] Match found in SidebarController property '${key}':`, s.playlists[val].id);
                        return s.playlists[val].id;
                    }
                }
            }
            if (s.currentPlaylistId) {
                console.log("[DEBUG-CORE] Falling back to current active playlist ID:", s.currentPlaylistId);
                return s.currentPlaylistId;
            }
            return null;
        },

        fetchLibrary: async function() {
            try {
                console.log("[DEBUG-CORE] Fetching library from Python...");
                this.libraryData = await eel.get_library_data_with_meta(true)();
                console.log("[DEBUG-CORE] Library count:", this.libraryData.length);
                return true;
            } catch (e) {
                console.error("[DEBUG-CORE] Python Error:", e);
                return false;
            }
        },

        filterData: function(query) {
            const q = query.toLowerCase().trim();
            this.filteredData = q ? this.libraryData.filter(item => 
                (item.title && item.title.toLowerCase().includes(q)) ||
                (item.artist && item.artist.toLowerCase().includes(q)) ||
                (item.album && item.album.toLowerCase().includes(q))
            ) : [...this.libraryData];
            this.lastClickedIndex = null;
            this.applySort();
        },

        // Core: 並び替え
        sortData: function(field) {
            console.log(`[DEBUG-CORE] sortData requested for: ${field}`);
            if (this.sortField === field) {
                this.sortDesc = !this.sortDesc;
            } else {
                this.sortField = field;
                this.sortDesc = false;
            }
            // UI側の表示（矢印）を更新
            this.updateSortUI();
            this.applySort();
        },

        applySort: function() {
            if (this.sortField) {
                this.filteredData.sort((a, b) => {
                    let va = a[this.sortField] || '';
                    let vb = b[this.sortField] || '';
                    if (['track', 'year', 'disc', 'bpm'].includes(this.sortField)) {
                        va = parseInt(va) || 0; vb = parseInt(vb) || 0;
                    } else {
                        va = va.toString().toLowerCase(); vb = vb.toString().toLowerCase();
                    }
                    if (va < vb) return this.sortDesc ? 1 : -1;
                    if (va > vb) return this.sortDesc ? -1 : 1;
                    return 0;
                });
            }
            this.renderList();
        },

        save: async function() {
            console.log("[DEBUG-CORE] Saving playlist ID:", this.currentPlaylistId);
            const btn = document.getElementById('btnSaveSelect');
            const originalText = btn.textContent;
            btn.disabled = true;
            btn.textContent = "保存中...";
            
            try {
                const newSongs = Array.from(this.selectedFilenames);
                const updatedPl = await eel.update_playlist_by_id(this.currentPlaylistId, 'music', newSongs)();
                
                if (updatedPl) {
                    const idx = s.playlists.findIndex(p => p.id === this.currentPlaylistId);
                    if (idx !== -1) s.playlists[idx] = updatedPl;
                    if (s.currentPlaylistId === this.currentPlaylistId) {
                        window.MainViewController.renderPlaylistInfo();
                        window.MainViewController.renderSongList();
                    }
                    window.PlayerUtils.showToast("プレイリストを更新しました", false);
                    this.close();
                }
            } catch (e) {
                window.PlayerUtils.showToast("保存に失敗しました", true);
            } finally {
                btn.disabled = false;
                btn.textContent = originalText;
            }
        }
    };
})();
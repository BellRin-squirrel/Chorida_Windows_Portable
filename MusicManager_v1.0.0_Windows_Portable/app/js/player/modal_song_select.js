(function() {
    const s = window.PlayerState;
    const u = window.PlayerUtils;

    window.ModalSongSelect = {
        
        lastSelectedIndex: -1, 
        displayList: [], 
        selectedSet: new Set(), 
        isMarqueeActive: false,
        marqueeStart: {x:0, y:0},
        marqueeBox: null,
        container: null,
        scrollInterval: null,
        sortField: null,
        sortDesc: false,

        init: function() {
            this.container = document.getElementById('songSelectListContainer');
            this.marqueeBox = document.getElementById('selectionMarquee');
            
            const btnEdit = document.getElementById('menuEditSongs');
            if(btnEdit) btnEdit.addEventListener('click', this.openModal.bind(this));
            
            const btnCancel = document.getElementById('btnCancelSelect');
            if(btnCancel) btnCancel.addEventListener('click', this.closeModal.bind(this));
            
            const btnSave = document.getElementById('btnSaveSelect');
            if(btnSave) btnSave.addEventListener('click', this.saveSelection.bind(this));
            
            const search = document.getElementById('songSelectSearch');
            if(search) search.addEventListener('input', (e) => this.filterSongs(e.target.value));
            
            const checkAll = document.getElementById('checkAllSongs');
            if(checkAll) checkAll.addEventListener('click', (e) => this.toggleAll(e.target.checked));
            
            if(this.container) {
                this.container.addEventListener('mousedown', (e) => this.onMarqueeStart(e));
                document.addEventListener('mousemove', (e) => this.onMarqueeMove(e));
                document.addEventListener('mouseup', (e) => this.onMarqueeEnd(e));
            }
        },

        openModal: async function() {
            if (!s.fullLibrary) {
                u.showToast("楽曲データベースの準備ができていません", true);
                return;
            }

            try {
                const targetPl = s.playlists[s.contextTargetIndex];
                const currentFiles = targetPl.songs ? targetPl.songs.map(so => so.musicFilename.split(/[\\/]/).pop()) : [];
                this.selectedSet = new Set(currentFiles);

                this.displayList = [...s.fullLibrary];
                document.getElementById('songSelectSearch').value = '';
                this.sortData('title'); 
                
                document.getElementById('songSelectModal').classList.add('show');
                document.getElementById('songSelectSearch').focus();

            } catch(e) { console.error(e); u.showToast("エラー", true); }
        },

        closeModal: function() {
            const modal = document.getElementById('songSelectModal');
            if(modal) modal.classList.remove('show');
            this.endAutoScroll();
        },

        renderTable: function() {
            const tbody = document.getElementById('selectTableBody');
            if(!tbody) return;
            tbody.innerHTML = '';
            this.updateCheckAllUI();
            this.displayList.forEach((song, idx) => {
                const tr = document.createElement('tr');
                tr.className = 'select-row';
                tr.dataset.dispIdx = idx;
                const fname = song.musicFilename.split(/[\\/]/).pop();
                const isChecked = this.selectedSet.has(fname);
                const artSrc = song.imageData || s.DEFAULT_ICON;
                tr.innerHTML = `<td class="chk-cell"><input type="checkbox" class="col-check-box" ${isChecked?'checked':''}></td><td class="col-art-small"><img src="${artSrc}"></td><td>${u.escapeHtml(song.title)}</td><td>${u.escapeHtml(song.artist)}</td><td>${u.escapeHtml(song.album)}</td><td style="text-align:right;">${u.escapeHtml(song.track||'')}</td><td>${u.escapeHtml(song.genre||'')}</td>`;
                if(isChecked) tr.classList.add('selected');
                tr.onmousedown = (e) => this.onRowMouseDown(e, song, idx);
                tbody.appendChild(tr);
            });
        },

        updateCheckAllUI: function() {
            const box = document.getElementById('checkAllSongs');
            if(!box) return;
            if (this.displayList.length === 0) { box.checked = false; box.indeterminate = false; return; }
            let all = true; let some = false;
            for(const song of this.displayList) {
                const fname = song.musicFilename.split(/[\\/]/).pop();
                if(this.selectedSet.has(fname)) some=true; else all=false;
            }
            box.checked = all; box.indeterminate = (some && !all);
        },

        toggleAll: function(isChecked) {
            this.displayList.forEach(song => {
                const fname = song.musicFilename.split(/[\\/]/).pop();
                if(isChecked) this.selectedSet.add(fname); else this.selectedSet.delete(fname);
            });
            this.renderTable();
        },

        onRowMouseDown: function(e, song, idx) {
            if(e.button !== 0) return;
            if(e.target.tagName === 'INPUT') e.preventDefault(); 
            const fname = song.musicFilename.split(/[\\/]/).pop();
            if (e.shiftKey && this.lastSelectedIndex !== -1) {
                 const anchorState = this.selectedSet.has(this.displayList[this.lastSelectedIndex].musicFilename.split(/[\\/]/).pop());
                 const start = Math.min(this.lastSelectedIndex, idx);
                 const end = Math.max(this.lastSelectedIndex, idx);
                 for(let i=start; i<=end; i++) {
                     const targetFname = this.displayList[i].musicFilename.split(/[\\/]/).pop();
                     if (!anchorState) this.selectedSet.add(targetFname); else this.selectedSet.delete(targetFname);
                 }
                 this.renderTable(); return;
            }
            if(!this.selectedSet.has(fname)) this.selectedSet.add(fname); else this.selectedSet.delete(fname);
            this.lastSelectedIndex = idx; this.renderTable();
        },

        onMarqueeStart: function(e) {
            if(e.button !== 0 || e.target.tagName === 'TH' || e.target === this.container || !this.marqueeBox) return;
            this.isMarqueeActive = true;
            const rect = this.container.getBoundingClientRect();
            this.startPos = { x: e.clientX - rect.left + this.container.scrollLeft, y: e.clientY - rect.top + this.container.scrollTop };
            this.marqueeBox.style.left = this.startPos.x + 'px'; this.marqueeBox.style.top = this.startPos.y + 'px';
            this.marqueeBox.style.width = '0px'; this.marqueeBox.style.height = '0px'; this.marqueeBox.style.display = 'block';
            this.cacheRows();
        },
        cacheRows: function() {
            const rows = document.querySelectorAll('#selectTableBody .select-row');
            this.rowItems = [];
            rows.forEach(r => {
                const dispIdx = parseInt(r.dataset.dispIdx);
                const song = this.displayList[dispIdx];
                const fname = song.musicFilename.split(/[\\/]/).pop();
                this.rowItems.push({ el: r, checkbox: r.querySelector('.col-check-box'), top: r.offsetTop, bottom: r.offsetTop + r.offsetHeight, songKey: fname, initialChecked: this.selectedSet.has(fname) });
            });
        },
        onMarqueeMove: function(e) {
            if(!this.isMarqueeActive || !this.marqueeBox) return;
            const rect = this.container.getBoundingClientRect();
            const cX = e.clientX - rect.left + this.container.scrollLeft; const cY = e.clientY - rect.top + this.container.scrollTop;
            const x = Math.min(this.startPos.x, cX); const y = Math.min(this.startPos.y, cY);
            const w = Math.abs(cX - this.startPos.x); const h = Math.abs(cY - this.startPos.y);
            this.marqueeBox.style.left = x + 'px'; this.marqueeBox.style.top = y + 'px';
            this.marqueeBox.style.width = w + 'px'; this.marqueeBox.style.height = h + 'px';
            this.handleAutoScroll(e.clientY, rect);
            const mTop = y; const mBottom = y + h;
            this.rowItems.forEach(item => {
                const isIntersecting = (item.bottom > mTop && item.top < mBottom);
                const targetState = isIntersecting ? !item.initialChecked : item.initialChecked;
                if(targetState) this.selectedSet.add(item.songKey); else this.selectedSet.delete(item.songKey);
                item.checkbox.checked = targetState;
                if(targetState) item.el.classList.add('selected'); else item.el.classList.remove('selected');
            });
            this.updateCheckAllUI();
        },
        handleAutoScroll: function(clientY, containerRect) {
            const threshold = 40; const speed = 10;
            if(this.scrollInterval) clearInterval(this.scrollInterval); this.scrollInterval = null;
            if (clientY > containerRect.bottom - threshold) this.scrollInterval = setInterval(() => { this.container.scrollTop += speed; }, 16);
            else if (clientY < containerRect.top + threshold) this.scrollInterval = setInterval(() => { this.container.scrollTop -= speed; }, 16);
        },
        endAutoScroll: function() { if(this.scrollInterval) clearInterval(this.scrollInterval); this.scrollInterval = null; },
        onMarqueeEnd: function(e) { 
            this.isMarqueeActive = false; 
            if(this.marqueeBox) this.marqueeBox.style.display = 'none'; 
            this.endAutoScroll(); 
        },

        filterSongs: function(term) {
            term = term.toLowerCase();
            this.displayList = term ? s.fullLibrary.filter(song => `${song.title} ${song.artist} ${song.album} ${song.track||''} ${song.genre||''}`.toLowerCase().includes(term)) : [...s.fullLibrary];
            this.renderTable();
        },
        sortData: function(field) {
            if(this.sortField === field) this.sortDesc = !this.sortDesc; else { this.sortField = field; this.sortDesc = false; }
            const m = this.sortDesc ? -1 : 1;
            this.displayList.sort((a,b) => {
                let va = a[field], vb = b[field];
                if(field==='track') { va=parseInt(va)||0; vb=parseInt(vb)||0; return (va-vb)*m; }
                return String(va||'').toLowerCase().localeCompare(String(vb||'').toLowerCase(), 'ja') * m;
            });
            this.renderTable();
        },

        saveSelection: async function() {
            const selectedList = Array.from(this.selectedSet);
            window.SidebarController.showSaving();
            try {
                const plId = s.playlists[s.contextTargetIndex].id;
                const updatedPl = await eel.update_playlist_by_id(plId, 'music', selectedList)();
                if(updatedPl) {
                    s.playlists[s.contextTargetIndex] = updatedPl; 
                    if(s.currentPlaylistIndex === s.contextTargetIndex) window.MainViewController.renderMainView(); 
                    window.SidebarController.renderSidebar();
                    u.showToast("保存しました", false);
                    this.closeModal();
                }
            } catch(e) { console.error(e); u.showToast("システムエラー", true); }
            finally { window.SidebarController.hideSaving(); }
        }
    };
})();
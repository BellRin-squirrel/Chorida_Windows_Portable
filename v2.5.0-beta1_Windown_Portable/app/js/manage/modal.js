(function() {
    const u = window.ManageUtils; // もし元のutilsがあれば

    window.ManageModal = {
        activeTags: [],
        textOps:[
            {val: 'contains', label: 'を含む'},
            {val: 'not_contains', label: 'を含まない'},
            {val: 'equals', label: 'である'},
            {val: 'not_equals', label: 'ではない'},
            {val: 'startswith', label: 'で始まる'},
            {val: 'endswith', label: 'で終わる'}
        ],
        numOps:[
            {val: 'equals', label: 'である'},
            {val: 'not_equals', label: 'ではない'},
            {val: 'greater', label: 'より大きい'},
            {val: 'less', label: 'より小さい'},
            {val: 'range', label: 'の範囲内'}
        ],

        init: function() {
            // モーダルの閉じるボタン
            const btnCloseAdvSearch = document.getElementById('btnCloseAdvSearchModal');
            if (btnCloseAdvSearch) {
                btnCloseAdvSearch.onclick = () => {
                    document.getElementById('advancedSearchModal').classList.remove('show');
                };
            }

            // 高度な検索用のボタン群
            const btnClear = document.getElementById('btnClearAdvSearch');
            const btnApply = document.getElementById('btnApplyAdvSearch');

            if (btnClear) btnClear.onclick = () => this.clearAdvancedSearch();
            if (btnApply) btnApply.onclick = () => this.applyAdvancedSearch();
            
            // 背景クリック等でカスタムドロップダウンを閉じる
            document.addEventListener('click', (e) => {
                document.querySelectorAll('.custom-select-dropdown').forEach(d => {
                    if (!e.target.closest('.custom-select-wrapper')) {
                        d.classList.remove('show');
                    }
                });
            });
            
            // 一括変更や削除などの初期化が元のコードにある場合はここで併記します
            // (今回は高度な検索に関する機能のみを追加/上書きしています)
        },

        // --- Mac風カスタムセレクター生成 ---
        createDynamicCustomSelector: function(options, currentValue, onSelect) {
            const wrapper = document.createElement('div');
            wrapper.className = 'custom-select-wrapper';
            const trigger = document.createElement('button');
            trigger.type = 'button';
            trigger.className = 'custom-select-trigger';
            const currentLabel = options.find(o => o.val === currentValue)?.label || currentValue;
            trigger.innerHTML = `<span>${currentLabel}</span><svg class="custom-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M19.5 8.25l-7.5 7.5-7.5-7.5" /></svg>`;
            
            const dropdown = document.createElement('div');
            dropdown.className = 'custom-select-dropdown';
            options.forEach(opt => {
                const item = document.createElement('div');
                item.className = 'custom-option' + (opt.val === currentValue ? ' active' : '');
                item.innerHTML = `<svg class="custom-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M4.5 12.75l6 6 9-13.5" /></svg><span>${opt.label}</span>`;
                item.onclick = (e) => {
                    e.stopPropagation();
                    trigger.querySelector('span').textContent = opt.label;
                    dropdown.querySelectorAll('.custom-option').forEach(o => o.classList.remove('active'));
                    item.classList.add('active');
                    onSelect(opt.val);
                    dropdown.classList.remove('show');
                };
                dropdown.appendChild(item);
            });
            trigger.onclick = (e) => {
                e.stopPropagation();
                document.querySelectorAll('.custom-select-dropdown').forEach(d => { if (d !== dropdown) d.classList.remove('show'); });
                dropdown.classList.toggle('show');
            };
            wrapper.appendChild(trigger);
            wrapper.appendChild(dropdown);
            return wrapper;
        },

        // --- 高度な検索を開く ---
        openAdvancedSearch: async function() {
            const container = document.getElementById('advSearchRootContainer');
            
            if (container.children.length === 0) {
                const settings = await eel.get_app_settings()();
                const allTags = await eel.get_available_tags()();
                
                this.activeTags = allTags.filter(t => settings.active_tags.includes(t.key)).map(t => ({val: t.key, label: t.label}));
                // 歌詞を追加
                this.activeTags.push({val: 'lyric', label: '歌詞'});

                container.appendChild(this.createConditionGroup(true));
                this.updateAllMinusButtons();
            }
            
            document.getElementById('advancedSearchModal').classList.add('show');
        },

        createConditionGroup: function(isRoot, matchVal = 'all') {
            const groupWrap = document.createElement('div');
            groupWrap.className = 'smart-group-wrapper';
            groupWrap.style.marginBottom = '12px';
            groupWrap.dataset.match = matchVal;

            const groupHeader = document.createElement('div');
            groupHeader.className = 'smart-group-header';

            const matchSelector = this.createDynamicCustomSelector([{val:'all', label:'すべての'}, {val:'any', label:'いずれかの'}],
                matchVal,
                (val) => { groupWrap.dataset.match = val; }
            );

            const textSpan = document.createElement('span');
            textSpan.className = 'smart-text'; textSpan.textContent = 'ルールに一致';
            const spacer = document.createElement('div'); spacer.style.flex = "1";

            groupHeader.appendChild(matchSelector);
            groupHeader.appendChild(textSpan);
            groupHeader.appendChild(spacer);

            const btnContainer = document.createElement('div');
            btnContainer.className = 'smart-btn-container';
            const btnMinus = document.createElement('button');
            btnMinus.className = 'smart-row-btn minus group-minus';
            btnMinus.innerHTML = `<svg style="width:16px;height:16px;" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M19.5 12h-15" /></svg>`;
            const btnPlus = document.createElement('button');
            btnPlus.className = 'smart-row-btn plus';
            btnPlus.innerHTML = `<svg style="width:16px;height:16px;" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M12 4.5v15m7.5-7.5h-15" /></svg>`;
            const btnMore = document.createElement('button');
            btnMore.className = 'smart-row-btn more';
            btnMore.innerHTML = '●●●';

            if (isRoot) {
                btnMinus.disabled = btnPlus.disabled = btnMore.disabled = true;
                btnMinus.classList.add('disabled'); btnPlus.classList.add('disabled'); btnMore.classList.add('disabled');
            } else {
                btnMinus.onclick = () => { groupWrap.remove(); this.updateAllMinusButtons(); };
                btnPlus.onclick = () => { groupWrap.parentElement.insertBefore(this.createFilterRow(), groupWrap.nextSibling); this.updateAllMinusButtons(); };
                btnMore.onclick = () => { groupWrap.parentElement.insertBefore(this.createConditionGroup(false), groupWrap.nextSibling); this.updateAllMinusButtons(); };
            }
            btnContainer.appendChild(btnMinus); btnContainer.appendChild(btnPlus); btnContainer.appendChild(btnMore);
            groupHeader.appendChild(btnContainer);

            const groupBody = document.createElement('div');
            groupBody.className = 'smart-group-body';
            groupBody.style.paddingLeft = '24px';
            groupBody.style.borderLeft = '2px solid rgba(128,128,128,0.2)';
            groupBody.appendChild(this.createFilterRow());

            groupWrap.appendChild(groupHeader);
            groupWrap.appendChild(groupBody);
            return groupWrap;
        },

        createFilterRow: function(initTag = null, initOp = null, initVal = null) {
            const row = document.createElement('div');
            row.className = 'smart-condition-row';

            const defaultTag = initTag || 'title';
            row.dataset.tag = defaultTag;
            row.dataset.op = initOp || 'contains';

            const inputContainer = document.createElement('div');
            inputContainer.className = 'smart-input-container';

            const opContainer = document.createElement('div');
            opContainer.className = 'custom-select-wrapper';

            const updateInputs = (tag, op, val = null) => {
                inputContainer.innerHTML = '';
                const isNum = ['track', 'year', 'disc', 'bpm'].includes(tag);
                if (isNum) {
                    if (op === 'range') {
                        const i1 = document.createElement('input'); i1.type = 'number'; i1.className = 'smart-input'; i1.placeholder = '0';
                        const i2 = document.createElement('input'); i2.type = 'number'; i2.className = 'smart-input'; i2.placeholder = '0';
                        if (Array.isArray(val)) { i1.value = val[0]; i2.value = val[1]; }
                        inputContainer.appendChild(i1);
                        inputContainer.innerHTML += '<span class="smart-text">と</span>';
                        inputContainer.appendChild(i2);
                    } else {
                        const i = document.createElement('input'); i.type = 'number'; i.className = 'smart-input'; i.placeholder = '数字...';
                        if (val) i.value = val;
                        inputContainer.appendChild(i);
                    }
                } else {
                    const i = document.createElement('input'); i.type = 'text'; i.className = 'smart-input'; i.placeholder = '検索ワード...';
                    if (val) i.value = val;
                    inputContainer.appendChild(i);
                }
            };

            const tagSelector = this.createDynamicCustomSelector(this.activeTags, row.dataset.tag, (newTag) => {
                row.dataset.tag = newTag;
                const isNum = ['track', 'year', 'disc', 'bpm'].includes(newTag);
                const newOps = isNum ? this.numOps : this.textOps;
                const newOp = newOps[0].val;
                row.dataset.op = newOp;
                
                const newOpSelector = this.createDynamicCustomSelector(newOps, newOp, (o) => {
                    row.dataset.op = o;
                    updateInputs(newTag, o);
                });
                opContainer.innerHTML = '';
                opContainer.appendChild(newOpSelector);
                updateInputs(newTag, newOp);
            });

            const initialOps = ['track', 'year', 'disc', 'bpm'].includes(row.dataset.tag) ? this.numOps : this.textOps;
            const opSelector = this.createDynamicCustomSelector(initialOps, row.dataset.op, (newOp) => {
                row.dataset.op = newOp;
                updateInputs(row.dataset.tag, newOp);
            });
            opContainer.appendChild(opSelector);

            const textSpan = document.createElement('span');
            textSpan.className = 'smart-text'; textSpan.textContent = 'が';

            const btnContainer = document.createElement('div');
            btnContainer.className = 'smart-btn-container';
            const btnMinus = document.createElement('button');
            btnMinus.className = 'smart-row-btn minus filter-minus';
            btnMinus.innerHTML = `<svg style="width:16px;height:16px;" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M19.5 12h-15" /></svg>`;
            btnMinus.onclick = () => { row.remove(); this.updateAllMinusButtons(); };
            const btnPlus = document.createElement('button');
            btnPlus.className = 'smart-row-btn plus';
            btnPlus.innerHTML = `<svg style="width:16px;height:16px;" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M12 4.5v15m7.5-7.5h-15" /></svg>`;
            btnPlus.onclick = () => { row.parentElement.insertBefore(this.createFilterRow(), row.nextSibling); this.updateAllMinusButtons(); };
            const btnMore = document.createElement('button');
            btnMore.className = 'smart-row-btn more';
            btnMore.innerHTML = '●●●';
            btnMore.onclick = () => { row.parentElement.insertBefore(this.createConditionGroup(false), row.nextSibling); this.updateAllMinusButtons(); };

            btnContainer.appendChild(btnMinus);
            btnContainer.appendChild(btnPlus);
            btnContainer.appendChild(btnMore);
            
            row.appendChild(tagSelector);
            row.appendChild(textSpan);
            row.appendChild(inputContainer);
            row.appendChild(opContainer);
            row.appendChild(btnContainer);

            updateInputs(row.dataset.tag, row.dataset.op, initVal);
            return row;
        },

        updateAllMinusButtons: function() {
            const root = document.getElementById('advSearchRootContainer');
            if (!root) return;
            root.querySelectorAll('.smart-group-body').forEach(body => {
                const children = Array.from(body.children).filter(c => c.classList.contains('smart-condition-row') || c.classList.contains('smart-group-wrapper'));
                const isSingle = (children.length <= 1);
                children.forEach(child => {
                    let btn = child.classList.contains('smart-condition-row') ? child.querySelector('.filter-minus') : child.querySelector('.smart-group-header .group-minus');
                    if (btn) { btn.disabled = isSingle; btn.style.opacity = isSingle ? "0.3" : "1"; }
                });
            });
        },

        // --- 検索実行ロジック ---
        applyAdvancedSearch: function() {
            const rootElement = document.querySelector('#advSearchRootContainer > .smart-group-wrapper');
            if (!rootElement) return;

            const parseGroup = (groupWrap) => {
                const match = groupWrap.dataset.match || 'all';
                const items =[];
                Array.from(groupWrap.querySelector('.smart-group-body').children).forEach(child => {
                    if (child.classList.contains('smart-condition-row')) {
                        const tag = child.dataset.tag;
                        const op = child.dataset.op;
                        const inputs = child.querySelectorAll('.smart-input');
                        const val = inputs.length > 1 ?[inputs[0].value, inputs[1].value] : inputs[0].value;
                        items.push({ type: 'filter', tag, op, val });
                    } else if (child.classList.contains('smart-group-wrapper')) {
                        items.push(parseGroup(child));
                    }
                });
                return { type: 'group', match, items };
            };

            const conditions = parseGroup(rootElement);
            
            document.getElementById('advancedSearchModal').classList.remove('show');
            
            // ★ 修正: 元の table.js の TableController に条件を渡す
            if (window.TableController && typeof window.TableController.execAdvancedSearch === 'function') {
                window.TableController.execAdvancedSearch([conditions]); // リストにして渡す
            }
        },

        clearAdvancedSearch: function() {
            document.getElementById('advSearchRootContainer').innerHTML = '';
            document.getElementById('advancedSearchModal').classList.remove('show');
            
            // ★ 修正: 元の table.js の TableController に条件クリアを伝える
            if (window.TableController && typeof window.TableController.execAdvancedSearch === 'function') {
                window.TableController.execAdvancedSearch(null);
            }
        }
    };
})();

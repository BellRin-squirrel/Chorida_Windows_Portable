document.addEventListener('DOMContentLoaded', () => {
    // プレイヤーの初期化
    if (window.PlayerController && typeof window.PlayerController.init === 'function') {
        window.PlayerController.init();
    } else {
        console.error("PlayerController is not defined or init is missing");
    }

    // モーダルの初期化 (一括変更・削除・高度な検索など)
    if (window.ManageModal && typeof window.ManageModal.init === 'function') {
        window.ManageModal.init();
    }

    // テーブルデータの初期読み込み
    if (window.TableController && typeof window.TableController.loadTableData === 'function') {
        window.TableController.loadTableData();
    }

    const btnToggle = document.getElementById('btnToggleSelection');
    if(btnToggle) {
        btnToggle.addEventListener('click', () => {
            window.TableController.toggleSelectionMode();
        });
    }

    const btnBulkEdit = document.getElementById('btnBulkEdit');
    if (btnBulkEdit) {
        btnBulkEdit.addEventListener('click', () => {
            if (window.ManageModal && typeof window.ManageModal.openBulkEditModal === 'function') {
                window.ManageModal.openBulkEditModal();
            }
        });
    }

    const btnBulkDelete = document.getElementById('btnBulkDelete');
    if (btnBulkDelete) {
        btnBulkDelete.addEventListener('click', () => {
            if (window.ManageModal && typeof window.ManageModal.openBulkDeleteModal === 'function') {
                window.ManageModal.openBulkDeleteModal();
            }
        });
    }

    // 検索機能のイベント登録
    const btnSearch = document.getElementById('btnSearchManage');
    const inputSearch = document.getElementById('searchInputManage');
    const btnClear = document.getElementById('btnClearSearch');

    if (btnSearch && inputSearch) {
        btnSearch.addEventListener('click', () => {
            window.TableController.execSearch(inputSearch.value.trim());
        });

        inputSearch.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                window.TableController.execSearch(inputSearch.value.trim());
            }
        });
    }

    // クリアボタンのイベント
    if (btnClear && inputSearch) {
        btnClear.addEventListener('click', () => {
            inputSearch.value = ''; 
            window.TableController.execSearch(''); // 空文字で検索（全件表示）
        });
    }

    // 高度な検索ボタン
    const btnAdvanced = document.getElementById('btnAdvancedSearch');
    if (btnAdvanced) {
        btnAdvanced.addEventListener('click', () => {
            if (window.ManageModal && typeof window.ManageModal.openAdvancedSearch === 'function') {
                window.ManageModal.openAdvancedSearch();
            }
        });
    }
});
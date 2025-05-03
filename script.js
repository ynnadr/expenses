document.addEventListener('DOMContentLoaded', () => {
    // --- Get DOM Elements ---
    // ... (Sama seperti sebelumnya) ...
    const budgetNameDisplayEl = document.getElementById('budget-name-display');
    const budgetTotalEl = document.getElementById('budget-total');
    const budgetSpentEl = document.getElementById('budget-spent');
    const budgetRemainingEl = document.getElementById('budget-remaining');
    const budgetProgressEl = document.getElementById('budget-progress');
    const setBudgetBtn = document.getElementById('set-budget-btn');
    const expenseForm = document.getElementById('expense-form');
    const expenseDescriptionInput = document.getElementById('expense-description');
    const expenseCategorySelect = document.getElementById('expense-category');
    const addCategoryBtn = document.getElementById('add-category-btn');
    const expenseDateInput = document.getElementById('expense-date');
    const expenseAmountInput = document.getElementById('expense-amount');
    const expensesUl = document.getElementById('expenses-ul');
    const exportBtn = document.getElementById('export-btn');
    const importFile = document.getElementById('import-file');
    const importBtnLabel = document.querySelector('label[for="import-file"]');
    const clearDataBtn = document.getElementById('clear-data-btn');
    const categoryPieChartCanvas = document.getElementById('categoryPieChart');
    const chartContainer = categoryPieChartCanvas ? categoryPieChartCanvas.parentElement : null;
    const noExpenseChartMsg = document.getElementById('no-expense-chart-msg');

    // --- App State (Data) ---
    // ... (Sama seperti sebelumnya) ...
    const DEFAULT_CATEGORIES = ['Makanan', 'Transportasi', 'Tagihan', 'Hiburan', 'Pendidikan', 'Kesehatan', 'Belanja', 'Lainnya'];
    let state = {
        budget: { name: '', amount: 0 },
        categories: [...DEFAULT_CATEGORIES],
        expenses: []
    };

    // Chart.js instance variable
    let categoryChartInstance = null;

    // --- LocalStorage Keys ---
    const LOCAL_STORAGE_KEY = 'budgetTrackerData_v3';

    // --- Helper Functions ---
    // ... (formatCurrency, formatDate, generateId, setDefaultDate, CATEGORY_COLORS, getColorForCategory) ...
    const formatCurrency = (amount) => { /* ... */ };
    const formatDate = (dateString) => { /* ... */ };
    const generateId = () => { /* ... */ };
    const setDefaultDate = () => { /* ... */ };
    const CATEGORY_COLORS = [ /* ... */ ];
    const getColorForCategory = (index) => { /* ... */ };

    // --- Data Persistence ---
    // ... (saveData, loadData) ...
    const saveData = () => { /* ... */ };
    const loadData = () => { /* ... */ };

    // --- UI Rendering ---

    // REVISI: populateCategoryDropdown sekarang menerima nilai yang harus dipilih
    const populateCategoryDropdown = (selectElement, selectedValue = "") => {
        if (!selectElement) return;

        // Simpan nilai yang saat ini dipilih (jika bukan proses awal)
        // const currentValue = selectedValue || selectElement.value; // Gunakan selectedValue jika ada
        selectElement.innerHTML = '<option value="" disabled>-- Pilih Kategori --</option>'; // Reset

        const sortedCategories = [...state.categories].sort((a, b) => a.localeCompare(b));

        sortedCategories.forEach(category => {
            const option = document.createElement('option');
            option.value = category;
            option.textContent = category;
            // Tandai sebagai selected jika nilainya cocok dengan selectedValue
            if (category === selectedValue) {
                option.selected = true;
            }
            selectElement.appendChild(option);
        });

        // Jika selectedValue ada dan valid, pastikan itu yang terpilih
        if (selectedValue && state.categories.includes(selectedValue)) {
             selectElement.value = selectedValue;
        } else if (!selectElement.value) {
             // Jika tidak ada yang terpilih (termasuk selectedValue tidak valid),
             // pastikan opsi default "-- Pilih Kategori --" yang terpilih
            const defaultOption = selectElement.querySelector('option[value=""]');
            if (defaultOption) {
                defaultOption.selected = true;
            }
        }
    };


    // ... (updateCategoryPieChart) ...
    const updateCategoryPieChart = (expenses) => { /* ... */ };

    // REVISI: renderUI untuk menambahkan tombol Edit dan struktur form inline
    const renderUI = () => {
        // ... (Perhitungan summary dan update elemen summary) ...
         const totalSpent = state.expenses.reduce((sum, expense) => sum + expense.amount, 0);
         const remaining = state.budget.amount - totalSpent;
         const percentageSpent = state.budget.amount > 0 ? (totalSpent / state.budget.amount) * 100 : 0;
         if (budgetNameDisplayEl) budgetNameDisplayEl.textContent = state.budget.name ? `Anggaran: ${state.budget.name}` : 'Anggaran: (Belum Diatur)';
         if (budgetTotalEl) budgetTotalEl.textContent = formatCurrency(state.budget.amount);
         if (budgetSpentEl) budgetSpentEl.textContent = formatCurrency(totalSpent);
         if (budgetRemainingEl) budgetRemainingEl.textContent = formatCurrency(remaining);
         if (budgetProgressEl) { /* ... logika progress bar ... */ }


        // Update Category Dropdown (untuk form utama)
        populateCategoryDropdown(expenseCategorySelect); // Tanpa selectedValue, gunakan default

        // Update Expense List
        if (expensesUl) {
            expensesUl.innerHTML = ''; // Clear list
            if (state.expenses.length === 0) {
                expensesUl.innerHTML = '<li class="no-expenses">Belum ada pengeluaran.</li>';
            } else {
                const sortedExpenses = [...state.expenses].sort((a, b) => new Date(b.date) - new Date(a.date));
                sortedExpenses.forEach(expense => {
                    const li = document.createElement('li');
                    li.classList.add('expense-item');
                    li.dataset.id = expense.id; // Simpan ID di list item

                    // Struktur HTML untuk Tampilan Normal
                    const displayHTML = `
                        <span class="category">${expense.category || 'Lainnya'}</span>
                        <span class="date">${formatDate(expense.date)}</span>
                        <span>${expense.description}</span>
                        <span class="amount">${formatCurrency(expense.amount)}</span>
                        <div class="item-actions">
                            <button class="edit-btn" aria-label="Edit pengeluaran ${expense.description}" data-id="${expense.id}">
                                <i class="fas fa-pencil-alt"></i>
                            </button>
                            <button class="delete-btn" aria-label="Hapus pengeluaran ${expense.description}" data-id="${expense.id}">
                                <i class="fas fa-times-circle"></i>
                            </button>
                        </div>
                    `;

                    // Struktur HTML untuk Mode Edit (awalnya disembunyikan oleh CSS)
                    // Penting: Beri ID unik atau kelas spesifik untuk input di dalam form inline ini
                    // agar bisa diambil nilainya saat menyimpan. Menggunakan kelas lebih fleksibel.
                    const editFormHTML = `
                        <div class="edit-form-elements">
                            <input type="date" class="edit-date" value="${expense.date}" required>
                            <select class="edit-category" required>
                                {/* Opsi kategori akan diisi saat tombol edit ditekan */}
                            </select>
                            <input type="text" class="edit-description" value="${expense.description}" placeholder="Deskripsi" required>
                            <input type="number" class="edit-amount" value="${expense.amount}" placeholder="Jumlah" required min="0" step="any">
                            <div class="edit-form-actions">
                                 <button class="save-edit-btn" aria-label="Simpan perubahan" data-id="${expense.id}">
                                     <i class="fas fa-save"></i>
                                 </button>
                                 <button class="cancel-edit-btn" aria-label="Batalkan edit" data-id="${expense.id}">
                                     <i class="fas fa-times"></i>
                                 </button>
                            </div>
                        </div>
                    `;

                    li.innerHTML = displayHTML + editFormHTML; // Gabungkan keduanya
                    expensesUl.appendChild(li);
                });
            }
        }

        // Update Category Pie Chart
        updateCategoryPieChart(state.expenses);
    };

    // --- Event Handlers ---

    // ... (handleSetBudget, handleAddCategory, handleAddExpense) ...
    const handleSetBudget = () => { /* ... */ };
    const handleAddCategory = () => { /* ... */ };
    const handleAddExpense = (event) => { /* ... */ };


    // REVISI: Handler utama untuk klik di dalam daftar pengeluaran (delegation)
    const handleExpenseListClick = (event) => {
        const target = event.target;
        const actionButton = target.closest('button'); // Cari tombol terdekat yang diklik

        if (!actionButton) return; // Bukan klik pada tombol

        const listItem = actionButton.closest('li.expense-item');
        if (!listItem) return; // Tidak di dalam list item

        const expenseId = parseInt(actionButton.dataset.id);
        if (isNaN(expenseId)) return; // ID tidak valid

        // --- Logika berdasarkan kelas tombol ---
        if (actionButton.classList.contains('delete-btn')) {
             handleDeleteExpenseAction(expenseId);
        } else if (actionButton.classList.contains('edit-btn')) {
             handleEditExpenseStartAction(listItem, expenseId);
        } else if (actionButton.classList.contains('save-edit-btn')) {
             handleEditExpenseSaveAction(listItem, expenseId);
        } else if (actionButton.classList.contains('cancel-edit-btn')) {
             handleEditExpenseCancelAction(); // Cukup render ulang
        }
    };

    // --- Action Functions (dipanggil oleh handleExpenseListClick) ---

    const handleDeleteExpenseAction = (expenseId) => {
        const expenseToDelete = state.expenses.find(exp => exp.id === expenseId);
        if (confirm(`Anda yakin ingin menghapus pengeluaran "${expenseToDelete?.description || 'ini'}" (${expenseToDelete?.category || ''})?`)) {
            state.expenses = state.expenses.filter(expense => expense.id !== expenseId);
            saveData();
            renderUI(); // Render ulang setelah hapus
        }
    };

    const handleEditExpenseStartAction = (listItem, expenseId) => {
         // 1. Hapus kelas 'editing' dari item lain (jika ada) untuk memastikan hanya satu yg diedit
         const currentlyEditing = expensesUl.querySelector('.expense-item.editing');
         if (currentlyEditing && currentlyEditing !== listItem) {
            // Bisa langsung render ulang atau revert item yg sedang diedit secara manual
            renderUI(); // Paling mudah render ulang saja
            // Cari lagi listItem setelah render ulang jika perlu, atau biarkan user klik lagi
            const newListItem = expensesUl.querySelector(`li[data-id="${expenseId}"]`);
            if (!newListItem) return; // Item tidak ditemukan setelah render ulang
            listItem = newListItem;
         }


        // 2. Tambahkan kelas 'editing' ke item yang diklik
        listItem.classList.add('editing');

        // 3. Dapatkan elemen select kategori di dalam form inline
        const inlineCategorySelect = listItem.querySelector('select.edit-category');

        // 4. Dapatkan data expense asli
        const originalExpense = state.expenses.find(exp => exp.id === expenseId);

        // 5. Isi dropdown kategori inline dengan kategori saat ini terpilih
        if (inlineCategorySelect && originalExpense) {
             populateCategoryDropdown(inlineCategorySelect, originalExpense.category);
        }

        // 6. Fokus ke input deskripsi (opsional)
        const inlineDescriptionInput = listItem.querySelector('input.edit-description');
        if (inlineDescriptionInput) {
             inlineDescriptionInput.focus();
             inlineDescriptionInput.select(); // Pilih teks yang ada
        }
    };

    const handleEditExpenseSaveAction = (listItem, expenseId) => {
        // 1. Dapatkan elemen form inline
        const dateInput = listItem.querySelector('input.edit-date');
        const categorySelect = listItem.querySelector('select.edit-category');
        const descriptionInput = listItem.querySelector('input.edit-description');
        const amountInput = listItem.querySelector('input.edit-amount');

        if (!dateInput || !categorySelect || !descriptionInput || !amountInput) {
            console.error("Error: Edit form elements not found in list item.");
            return;
        }

        // 2. Ambil nilai baru
        const newDate = dateInput.value;
        const newCategory = categorySelect.value;
        const newDescription = descriptionInput.value.trim();
        const newAmount = parseFloat(amountInput.value);

        // 3. Validasi nilai baru
        if (!newDescription) { alert("Deskripsi tidak boleh kosong."); descriptionInput.focus(); return; }
        if (!newCategory) { alert("Harap pilih kategori."); categorySelect.focus(); return; }
        if (!newDate) { alert("Tanggal harus diisi."); dateInput.focus(); return; }
        if (isNaN(newAmount) || newAmount < 0) { alert("Jumlah harus angka non-negatif."); amountInput.focus(); return; } // Izinkan 0

        // 4. Cari index expense di state
        const expenseIndex = state.expenses.findIndex(exp => exp.id === expenseId);

        if (expenseIndex > -1) {
            // 5. Update expense di state
            state.expenses[expenseIndex] = {
                ...state.expenses[expenseIndex], // Pertahankan ID asli
                date: newDate,
                category: newCategory,
                description: newDescription,
                amount: newAmount
            };

            // 6. Simpan dan Render ulang
            saveData();
            renderUI(); // Render ulang akan menghapus mode edit & menampilkan data baru
        } else {
            console.error("Error: Expense with ID", expenseId, "not found in state.");
            // Mungkin render ulang saja untuk keluar dari mode edit
            renderUI();
        }
    };

    const handleEditExpenseCancelAction = () => {
        // Cara termudah: Render ulang seluruh UI dari state saat ini
        renderUI();
    };


    // ... (handleExportData, handleImportData, handleClearData) ...
    const handleExportData = () => { /* ... */ };
    const handleImportData = (event) => { /* ... */ };
    const handleClearData = () => { /* ... */ };

    // --- Attach Event Listeners ---
    // REVISI: Gunakan satu listener untuk daftar pengeluaran
    if (setBudgetBtn) setBudgetBtn.addEventListener('click', handleSetBudget);
    if (expenseForm) expenseForm.addEventListener('submit', handleAddExpense);
    if (addCategoryBtn) addCategoryBtn.addEventListener('click', handleAddCategory);
    if (expensesUl) expensesUl.addEventListener('click', handleExpenseListClick); // Listener utama untuk list
    if (exportBtn) exportBtn.addEventListener('click', handleExportData);
    if (importFile) importFile.addEventListener('change', handleImportData);
    if (clearDataBtn) clearDataBtn.addEventListener('click', handleClearData);

    // --- Initial Load ---
    loadData();
    renderUI();

}); // End DOMContentLoaded

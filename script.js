document.addEventListener('DOMContentLoaded', () => {
    // --- Get DOM Elements ---
    // ... (Elemen DOM sebelumnya tetap sama) ...
    const budgetNameDisplayEl = document.getElementById('budget-name-display');
    const budgetTotalEl = document.getElementById('budget-total');
    const budgetSpentEl = document.getElementById('budget-spent');
    const budgetRemainingEl = document.getElementById('budget-remaining');
    const budgetProgressEl = document.getElementById('budget-progress');
    const setBudgetBtn = document.getElementById('set-budget-btn');
    const expenseForm = document.getElementById('expense-form');
    const expenseDescriptionInput = document.getElementById('expense-description');
    const expenseCategorySelect = document.getElementById('expense-category'); // REVISI: Get select element
    const addCategoryBtn = document.getElementById('add-category-btn');      // REVISI: Get add category button
    const expenseDateInput = document.getElementById('expense-date');
    const expenseAmountInput = document.getElementById('expense-amount');
    const expensesUl = document.getElementById('expenses-ul');
    const exportBtn = document.getElementById('export-btn');
    const importFile = document.getElementById('import-file');
    const importBtnLabel = document.querySelector('label[for="import-file"]');
    const clearDataBtn = document.getElementById('clear-data-btn');


    // --- App State (Data) --- REVISI
    const DEFAULT_CATEGORIES = ['Makanan', 'Transportasi', 'Tagihan', 'Hiburan', 'Pendidikan', 'Kesehatan', 'Belanja', 'Lainnya'];
    let state = {
        budget: {
            name: '',
            amount: 0
        },
        // REVISI: Tambahkan array untuk kategori
        categories: [...DEFAULT_CATEGORIES], // Isi dengan default saat inisialisasi awal
        // REVISI: Expense object sekarang punya properti 'category'
        expenses: [] // Array of objects: { id: number, description: string, amount: number, date: string, category: string }
    };

    // --- LocalStorage Keys ---
    const LOCAL_STORAGE_KEY = 'budgetTrackerData_v3'; // REVISI: Update versi key lagi

    // --- Helper Functions ---
    // ... (formatCurrency, formatDate, generateId tetap sama) ...
    const formatCurrency = (amount) => {
        if (isNaN(amount) || typeof amount !== 'number') {
             amount = 0;
         }
         return new Intl.NumberFormat('id-ID', {
             style: 'currency',
             currency: 'IDR',
             minimumFractionDigits: 0
         }).format(amount);
    };

    const formatDate = (dateString) => {
        if (!dateString) return '';
        try {
            const date = new Date(dateString + 'T00:00:00');
            return date.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
        } catch (e) { return dateString; }
    };

     const generateId = () => {
        return Date.now() + Math.floor(Math.random() * 100);
    };

     const setDefaultDate = () => {
        const today = new Date();
        const year = today.getFullYear();
        const month = (today.getMonth() + 1).toString().padStart(2, '0');
        const day = today.getDate().toString().padStart(2, '0');
        expenseDateInput.value = `${year}-${month}-${day}`;
    };


    // --- Data Persistence --- REVISI
    const saveData = () => {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(state));
    };

    const loadData = () => {
        const savedData = localStorage.getItem(LOCAL_STORAGE_KEY);
        // REVISI: Default state sekarang termasuk default categories
        const defaultState = {
            budget: { name: '', amount: 0 },
            categories: [...DEFAULT_CATEGORIES],
            expenses: []
        };
        if (savedData) {
            try {
                const parsedData = JSON.parse(savedData);
                // Validasi lebih ketat untuk format baru (termasuk categories & expense.category)
                if (parsedData && typeof parsedData.budget === 'object' && parsedData.budget !== null &&
                    typeof parsedData.budget.name === 'string' && typeof parsedData.budget.amount === 'number' &&
                    Array.isArray(parsedData.categories) && // Cek keberadaan categories array
                    parsedData.categories.every(cat => typeof cat === 'string') && // Pastikan isi categories adalah string
                    Array.isArray(parsedData.expenses) &&
                    parsedData.expenses.every(exp =>
                        typeof exp.id === 'number' && typeof exp.description === 'string' &&
                        typeof exp.amount === 'number' && typeof exp.date === 'string' &&
                        // Cek keberadaan category (boleh string kosong jika data lama)
                         (typeof exp.category === 'string' || typeof exp.category === 'undefined')
                    )
                ) {
                    // Gabungkan data tersimpan dengan default (penting jika field baru ditambahkan)
                    state = {
                        ...defaultState, // Mulai dengan default
                        ...parsedData, // Timpa dengan data tersimpan
                        // Pastikan budget adalah object, bukan null
                        budget: { ...defaultState.budget, ...(parsedData.budget || {}) },
                        // Pastikan categories ada, jika tidak pakai default
                         categories: Array.isArray(parsedData.categories) && parsedData.categories.length > 0 ? parsedData.categories : [...DEFAULT_CATEGORIES],
                    };
                    // Pastikan setiap expense punya properti category (untuk data lama)
                    state.expenses = state.expenses.map(exp => ({ ...exp, category: exp.category || 'Lainnya' }));
                } else {
                    console.warn("Invalid data format in localStorage (v3). Using default state.");
                    state = defaultState;
                }
            } catch (error) {
                console.error("Error parsing data from localStorage (v3):", error);
                state = defaultState;
            }
        } else {
            state = defaultState;
        }
        setDefaultDate();
    };

    // --- UI Rendering --- REVISI

    // REVISI: Fungsi untuk mengisi dropdown kategori
    const populateCategoryDropdown = (selectElement = expenseCategorySelect) => {
        const currentValue = selectElement.value; // Simpan nilai terpilih saat ini (jika ada)
        selectElement.innerHTML = '<option value="" disabled>-- Pilih Kategori --</option>'; // Reset dan tambahkan opsi default

        // Urutkan kategori secara alfabetis (opsional)
        const sortedCategories = [...state.categories].sort((a, b) => a.localeCompare(b));

        sortedCategories.forEach(category => {
            const option = document.createElement('option');
            option.value = category;
            option.textContent = category;
            selectElement.appendChild(option);
        });

        // Setel kembali nilai yang terpilih sebelumnya atau default jika tidak valid
        if (sortedCategories.includes(currentValue)) {
             selectElement.value = currentValue;
        } else {
             selectElement.value = ""; // Set ke default "-- Pilih Kategori --"
        }

        // Setel ulang nilai "-- Pilih Kategori --" agar terpilih jika tidak ada nilai lain
         if (!selectElement.value) {
            selectElement.querySelector('option[value=""]').selected = true;
         }
    };


    const renderUI = () => {
        // ... (Perhitungan total, sisa, progress bar tetap sama) ...
        const totalSpent = state.expenses.reduce((sum, expense) => sum + expense.amount, 0);
        const remaining = state.budget.amount - totalSpent;
        const percentageSpent = state.budget.amount > 0 ? (totalSpent / state.budget.amount) * 100 : 0;

        budgetNameDisplayEl.textContent = state.budget.name ? `Anggaran: ${state.budget.name}` : 'Anggaran: (Belum Diatur)';
        budgetTotalEl.textContent = formatCurrency(state.budget.amount);
        budgetSpentEl.textContent = formatCurrency(totalSpent);
        budgetRemainingEl.textContent = formatCurrency(remaining);

        budgetProgressEl.style.width = `${Math.min(percentageSpent, 100)}%`;
        const remainingElParent = budgetRemainingEl.closest('.remaining');
        budgetProgressEl.classList.remove('warning', 'overspending');
        remainingElParent.classList.remove('warning', 'overspending');
        if (percentageSpent > 100) {
            budgetProgressEl.classList.add('overspending');
            remainingElParent.classList.add('overspending');
        } else if (percentageSpent > 80) {
            budgetProgressEl.classList.add('warning');
            remainingElParent.classList.add('warning');
        }

        // REVISI: Panggil fungsi untuk mengisi dropdown kategori
        populateCategoryDropdown();

        // REVISI: Update expense list untuk menampilkan kategori
        expensesUl.innerHTML = '';
        if (state.expenses.length === 0) {
            expensesUl.innerHTML = '<li class="no-expenses">Belum ada pengeluaran.</li>';
        } else {
            const sortedExpenses = [...state.expenses].sort((a, b) => new Date(b.date) - new Date(a.date));

            sortedExpenses.forEach(expense => {
                const li = document.createElement('li');
                li.classList.add('expense-item');
                li.dataset.id = expense.id;
                // Tampilkan kategori, tanggal, deskripsi, jumlah, tombol hapus
                li.innerHTML = `
                    <span class="category">${expense.category || 'Lainnya'}</span>
                    <span class="date">${formatDate(expense.date)}</span>
                    <span>${expense.description}</span>
                    <span class="amount">${formatCurrency(expense.amount)}</span>
                    <button class="delete-btn" aria-label="Hapus pengeluaran ${expense.description}">
                        <i class="fas fa-times-circle"></i>
                    </button>
                `;
                expensesUl.appendChild(li);
            });
        }
    };

    // --- Event Handlers --- REVISI

    // handleSetBudget (fungsi sama)
    const handleSetBudget = () => {
        const nameInput = prompt("Masukkan nama untuk anggaran ini:", state.budget.name || "Bulanan");
        if (nameInput === null) return;

        const amountInput = prompt(`Masukkan jumlah anggaran untuk "${nameInput || '(Tanpa Nama)'}" (hanya angka):`, state.budget.amount);
        if (amountInput === null) return;

        const newAmount = parseFloat(amountInput);

        if (!isNaN(newAmount) && newAmount >= 0) {
            state.budget.name = nameInput.trim();
            state.budget.amount = newAmount;
            saveData();
            renderUI();
        } else if (amountInput.trim() !== '') {
            alert("Harap masukkan angka yang valid untuk jumlah anggaran.");
        }
    };

    // REVISI: Handler untuk menambah kategori baru
    const handleAddCategory = () => {
        const newCategoryName = prompt("Masukkan nama kategori baru:");

        if (newCategoryName === null) return; // User cancel

        const trimmedName = newCategoryName.trim();

        if (!trimmedName) {
            alert("Nama kategori tidak boleh kosong.");
            return;
        }

        // Cek duplikat (case-insensitive)
        const isDuplicate = state.categories.some(
            category => category.toLowerCase() === trimmedName.toLowerCase()
        );

        if (isDuplicate) {
            alert(`Kategori "${trimmedName}" sudah ada.`);
            return;
        }

        // Tambahkan kategori baru ke state
        state.categories.push(trimmedName);
        // Urutkan lagi jika mau (opsional, tapi bagus untuk konsistensi dropdown)
        state.categories.sort((a, b) => a.localeCompare(b));

        saveData(); // Simpan state baru
        populateCategoryDropdown(); // Update dropdown

        // Otomatis pilih kategori yang baru ditambahkan
        expenseCategorySelect.value = trimmedName;

        alert(`Kategori "${trimmedName}" berhasil ditambahkan.`);
    };


    // REVISI: Handler untuk menambah pengeluaran (ambil nilai kategori)
    const handleAddExpense = (event) => {
        event.preventDefault();

        const description = expenseDescriptionInput.value.trim();
        const category = expenseCategorySelect.value; // Ambil nilai kategori
        const date = expenseDateInput.value;
        const amount = parseFloat(expenseAmountInput.value);

        // Validasi input
        if (!description) {
            alert("Deskripsi pengeluaran tidak boleh kosong.");
            expenseDescriptionInput.focus(); return;
        }
        if (!category) { // Pastikan kategori dipilih
            alert("Harap pilih kategori pengeluaran.");
            expenseCategorySelect.focus(); return;
        }
        if (!date) {
             alert("Tanggal pengeluaran harus diisi.");
             expenseDateInput.focus(); return;
        }
         if (isNaN(amount) || amount <= 0) {
            alert("Jumlah pengeluaran harus angka positif.");
            expenseAmountInput.focus(); return;
        }
         if (state.budget.amount === 0 && !state.budget.name) {
            alert("Harap atur nama dan jumlah anggaran terlebih dahulu.");
             setBudgetBtn.focus(); return;
        }

        const newExpense = {
            id: generateId(),
            description: description,
            amount: amount,
            date: date,
            category: category // Simpan kategori
        };

        state.expenses.push(newExpense);
        saveData();
        renderUI(); // renderUI akan otomatis update dropdown juga

        // Clear form
        expenseForm.reset();
        setDefaultDate();
        expenseCategorySelect.value = ""; // Reset pilihan kategori ke default
        expenseDescriptionInput.focus();
    };

    // handleDeleteExpense (fungsi sama)
    const handleDeleteExpense = (event) => {
        const deleteButton = event.target.closest('.delete-btn');
        if (!deleteButton) return;
        const listItem = deleteButton.closest('li');
        const expenseId = parseInt(listItem.dataset.id);
        if (isNaN(expenseId)) return;
        const expenseToDelete = state.expenses.find(exp => exp.id === expenseId);
        if (confirm(`Anda yakin ingin menghapus pengeluaran "${expenseToDelete?.description || 'ini'}" (${expenseToDelete?.category || ''})?`)) {
            state.expenses = state.expenses.filter(expense => expense.id !== expenseId);
            saveData();
            renderUI();
        }
    };


    // handleExportData (fungsi sama, state sudah mencakup categories)
     const handleExportData = () => {
        if (state.budget.amount === 0 && state.expenses.length === 0 && !state.budget.name) {
            alert("Tidak ada data untuk diekspor."); return;
        }
        const dataStr = JSON.stringify(state, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        const date = new Date();
        const dateString = `${date.getFullYear()}${(date.getMonth() + 1).toString().padStart(2, '0')}${date.getDate().toString().padStart(2, '0')}`;
        const budgetNameSlug = state.budget.name.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'anggaran';
        link.download = `budget_${budgetNameSlug}_${dateString}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };


    // handleImportData (fungsi sama, validasi di loadData sudah diupdate)
     const handleImportData = (event) => {
        const file = event.target.files[0]; if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const importedData = JSON.parse(e.target.result);
                // Validasi dasar (lebih detail di loadData saat benar2 diterapkan)
                 if (importedData && typeof importedData.budget === 'object' && Array.isArray(importedData.categories) && Array.isArray(importedData.expenses)) {
                     if (confirm("Ini akan menimpa data Anda saat ini. Lanjutkan impor?")) {
                            // Terapkan data dan re-validasi/bersihkan saat load
                            localStorage.setItem(LOCAL_STORAGE_KEY, e.target.result); // Simpan data mentah
                            loadData(); // Panggil loadData untuk memproses dan validasi
                            renderUI();
                            alert("Data berhasil diimpor!");
                     }
                 } else {
                    alert("Struktur dasar file JSON tidak sesuai (harus ada 'budget', 'categories', 'expenses').");
                 }
            } catch (error) {
                alert("Gagal membaca atau memproses file JSON."); console.error("Import error:", error);
            } finally { importFile.value = null; }
        };
        reader.onerror = () => { alert("Gagal membaca file."); importFile.value = null; };
        reader.readAsText(file);
    };

    // handleClearData (REVISI: reset state termasuk categories ke default)
     const handleClearData = () => {
        if (confirm("PERINGATAN: Ini akan menghapus SEMUA anggaran, kategori khusus, dan data pengeluaran Anda. Tindakan ini tidak dapat dibatalkan. Lanjutkan?")) {
            state = {
                budget: { name: '', amount: 0 },
                categories: [...DEFAULT_CATEGORIES], // Reset ke default
                expenses: []
            };
            saveData();
            renderUI();
             alert("Semua data telah dihapus.");
        }
    };


    // --- Attach Event Listeners --- REVISI: Tambahkan listener untuk tombol add category
    setBudgetBtn.addEventListener('click', handleSetBudget);
    expenseForm.addEventListener('submit', handleAddExpense);
    addCategoryBtn.addEventListener('click', handleAddCategory); // Listener baru
    expensesUl.addEventListener('click', handleDeleteExpense);
    exportBtn.addEventListener('click', handleExportData);
    importFile.addEventListener('change', handleImportData);
    clearDataBtn.addEventListener('click', handleClearData);

    // --- Initial Load ---
    loadData(); // Muat data dulu
    renderUI(); // Baru render UI (termasuk mengisi dropdown awal)

}); // End DOMContentLoaded

document.addEventListener('DOMContentLoaded', () => {
    // --- Get DOM Elements ---
    const budgetNameDisplayEl = document.getElementById('budget-name-display'); // REVISI
    const budgetTotalEl = document.getElementById('budget-total');
    const budgetSpentEl = document.getElementById('budget-spent');
    const budgetRemainingEl = document.getElementById('budget-remaining');
    const budgetProgressEl = document.getElementById('budget-progress');
    const setBudgetBtn = document.getElementById('set-budget-btn');
    const expenseForm = document.getElementById('expense-form');
    const expenseDescriptionInput = document.getElementById('expense-description');
    const expenseDateInput = document.getElementById('expense-date'); // REVISI
    const expenseAmountInput = document.getElementById('expense-amount');
    const expensesUl = document.getElementById('expenses-ul');
    const exportBtn = document.getElementById('export-btn');
    const importFile = document.getElementById('import-file');
    const importBtnLabel = document.querySelector('label[for="import-file"]');
    const clearDataBtn = document.getElementById('clear-data-btn');

    // --- App State (Data) --- REVISI
    let state = {
        budget: { // Ubah menjadi object
            name: '',
            amount: 0
        },
        expenses: [] // Array of objects: { id: number, description: string, amount: number, date: string }
    };

    // --- LocalStorage Keys ---
    const LOCAL_STORAGE_KEY = 'budgetTrackerData_v2'; // Ubah key untuk hindari konflik format lama

    // --- Helper Functions ---
    const formatCurrency = (amount) => {
        // ... (fungsi sama)
        if (isNaN(amount) || typeof amount !== 'number') {
             amount = 0;
         }
         return new Intl.NumberFormat('id-ID', {
             style: 'currency',
             currency: 'IDR',
             minimumFractionDigits: 0
         }).format(amount);
    };

     // REVISI: Format tanggal YYYY-MM-DD ke DD MMM YYYY (atau format lain)
    const formatDate = (dateString) => {
        if (!dateString) return ''; // Handle jika dateString kosong
        try {
            const date = new Date(dateString + 'T00:00:00'); // Tambah T00:00:00 untuk hindari masalah timezone
            return date.toLocaleDateString('id-ID', {
                day: '2-digit',
                month: 'short', // 'short' (Okt), 'long' (Oktober)
                year: 'numeric'
            });
        } catch (e) {
            console.error("Error formatting date:", dateString, e);
            return dateString; // Kembalikan string asli jika error
        }
    };

    const generateId = () => {
        // ... (fungsi sama)
        return Date.now() + Math.floor(Math.random() * 100);
    };

    // REVISI: Set default date to today
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
        const defaultState = { budget: { name: '', amount: 0 }, expenses: [] }; // Default state baru
        if (savedData) {
            try {
                const parsedData = JSON.parse(savedData);
                // Validasi lebih ketat untuk format baru
                if (parsedData && typeof parsedData.budget === 'object' &&
                    parsedData.budget !== null && // Pastikan bukan null
                    typeof parsedData.budget.name === 'string' &&
                    typeof parsedData.budget.amount === 'number' &&
                    Array.isArray(parsedData.expenses) &&
                    // Cek struktur expense (minimal ada id, desc, amount, date)
                    parsedData.expenses.every(exp =>
                        typeof exp.id === 'number' &&
                        typeof exp.description === 'string' &&
                        typeof exp.amount === 'number' &&
                        typeof exp.date === 'string' // Cek keberadaan date
                    )
                ) {
                    state = parsedData;
                } else {
                    console.warn("Invalid data format in localStorage (v2). Using default state.");
                    state = defaultState;
                }
            } catch (error) {
                console.error("Error parsing data from localStorage (v2):", error);
                state = defaultState;
            }
        } else {
            state = defaultState;
        }
         // Set default date after loading state (in case it wasn't set on load)
         setDefaultDate();
    };

    // --- UI Rendering --- REVISI
    const renderUI = () => {
        // Calculate totals
        const totalSpent = state.expenses.reduce((sum, expense) => sum + expense.amount, 0);
        const remaining = state.budget.amount - totalSpent; // Ambil dari state.budget.amount
        const percentageSpent = state.budget.amount > 0 ? (totalSpent / state.budget.amount) * 100 : 0;

        // Update summary display
        budgetNameDisplayEl.textContent = state.budget.name ? `Anggaran: ${state.budget.name}` : 'Anggaran: (Belum Diatur)'; // Tampilkan nama
        budgetTotalEl.textContent = formatCurrency(state.budget.amount); // Ambil dari state.budget.amount
        budgetSpentEl.textContent = formatCurrency(totalSpent);
        budgetRemainingEl.textContent = formatCurrency(remaining);

        // Update progress bar (logika warna tetap sama)
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

        // Update expense list
        expensesUl.innerHTML = '';
        if (state.expenses.length === 0) {
            expensesUl.innerHTML = '<li class="no-expenses">Belum ada pengeluaran.</li>';
        } else {
            // Sort expenses by date descending (newest first)
            const sortedExpenses = [...state.expenses].sort((a, b) => new Date(b.date) - new Date(a.date));

            sortedExpenses.forEach(expense => {
                const li = document.createElement('li');
                li.classList.add('expense-item');
                li.dataset.id = expense.id;
                li.innerHTML = `
                    <span class="date">${formatDate(expense.date)}</span> {/* Tampilkan tanggal */}
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
    const handleSetBudget = () => {
        // 1. Minta Nama Anggaran
        const nameInput = prompt("Masukkan nama untuk anggaran ini:", state.budget.name || "Bulanan");
        if (nameInput === null) return; // User menekan cancel

        // 2. Minta Jumlah Anggaran
        const amountInput = prompt(`Masukkan jumlah anggaran untuk "${nameInput || '(Tanpa Nama)'}" (hanya angka):`, state.budget.amount);
        if (amountInput === null) return; // User menekan cancel

        const newAmount = parseFloat(amountInput);

        if (!isNaN(newAmount) && newAmount >= 0) {
            state.budget.name = nameInput.trim(); // Simpan nama (hapus spasi ekstra)
            state.budget.amount = newAmount;
            saveData();
            renderUI();
        } else if (amountInput.trim() !== '') {
            alert("Harap masukkan angka yang valid untuk jumlah anggaran.");
        }
    };

    const handleAddExpense = (event) => {
        event.preventDefault();

        const description = expenseDescriptionInput.value.trim();
        const date = expenseDateInput.value; // Ambil nilai tanggal
        const amount = parseFloat(expenseAmountInput.value);

        // Validasi input (tambahkan validasi tanggal)
        if (!description) {
            alert("Deskripsi pengeluaran tidak boleh kosong.");
            expenseDescriptionInput.focus();
            return;
        }
        if (!date) { // Cek apakah tanggal sudah diisi
             alert("Tanggal pengeluaran harus diisi.");
             expenseDateInput.focus();
             return;
        }
         if (isNaN(amount) || amount <= 0) {
            alert("Jumlah pengeluaran harus angka positif.");
            expenseAmountInput.focus();
            return;
        }
         if (state.budget.amount === 0 && !state.budget.name) { // Cek apakah anggaran sudah diatur
            alert("Harap atur nama dan jumlah anggaran terlebih dahulu.");
             setBudgetBtn.focus();
            return;
        }

        const newExpense = {
            id: generateId(),
            description: description,
            amount: amount,
            date: date // Simpan tanggal
        };

        state.expenses.push(newExpense);
        saveData();
        renderUI();

        // Clear form (biarkan tanggal tetap?) atau reset ke default
        expenseForm.reset();
        setDefaultDate(); // Reset tanggal ke hari ini lagi
        expenseDescriptionInput.focus();
    };

    // handleDeleteExpense (fungsi sama, tidak perlu diubah)
    const handleDeleteExpense = (event) => {
        const deleteButton = event.target.closest('.delete-btn');
        if (!deleteButton) return;

        const listItem = deleteButton.closest('li');
        const expenseId = parseInt(listItem.dataset.id);

        if (isNaN(expenseId)) return;

        const expenseToDelete = state.expenses.find(exp => exp.id === expenseId);
        if (confirm(`Anda yakin ingin menghapus pengeluaran "${expenseToDelete?.description || 'ini'}"?`)) {
            state.expenses = state.expenses.filter(expense => expense.id !== expenseId);
            saveData();
            renderUI();
        }
    };


    // handleExportData (fungsi sama, format data sudah otomatis terupdate)
     const handleExportData = () => {
        if (state.budget.amount === 0 && state.expenses.length === 0 && !state.budget.name) {
            alert("Tidak ada data untuk diekspor.");
            return;
        }
        const dataStr = JSON.stringify(state, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        const date = new Date();
        const dateString = `${date.getFullYear()}${(date.getMonth() + 1).toString().padStart(2, '0')}${date.getDate().toString().padStart(2, '0')}`;
        // Sertakan nama anggaran di filename jika ada
        const budgetNameSlug = state.budget.name.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'anggaran';
        link.download = `budget_${budgetNameSlug}_${dateString}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };


    // handleImportData (fungsi sama, validasi di loadData sudah disesuaikan)
     const handleImportData = (event) => {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const importedData = JSON.parse(e.target.result);
                // Validasi dasar format baru (lebih detail di loadData sebenarnya)
                 if (importedData && typeof importedData.budget === 'object' && Array.isArray(importedData.expenses)) {
                     if (confirm("Ini akan menimpa data Anda saat ini. Lanjutkan impor?")) {
                        // Lakukan validasi lebih ketat sebelum benar-benar menimpa
                        const defaultStateForValidation = { budget: { name: '', amount: 0 }, expenses: [] };
                        const potentialState = { ...defaultStateForValidation, ...importedData }; // Gabungkan

                        if (typeof potentialState.budget.name === 'string' &&
                            typeof potentialState.budget.amount === 'number' &&
                            Array.isArray(potentialState.expenses) &&
                            potentialState.expenses.every(exp =>
                                typeof exp.id === 'number' &&
                                typeof exp.description === 'string' &&
                                typeof exp.amount === 'number' &&
                                typeof exp.date === 'string'
                            ))
                         {
                            state = potentialState; // Timpa state jika valid
                            saveData();
                            renderUI();
                            alert("Data berhasil diimpor!");
                        } else {
                             alert("Format data dalam file JSON tidak valid atau tidak lengkap.");
                        }
                    }
                 } else {
                    alert("Struktur dasar file JSON tidak sesuai (harus ada object 'budget' dan array 'expenses').");
                 }
            } catch (error) {
                alert("Gagal membaca atau memproses file JSON.");
                console.error("Import error:", error);
            } finally {
                 importFile.value = null;
            }
        };
        reader.onerror = () => {
            alert("Gagal membaca file.");
            importFile.value = null;
        };
        reader.readAsText(file);
    };

    // handleClearData (REVISI: reset state sesuai format baru)
     const handleClearData = () => {
        if (confirm("PERINGATAN: Ini akan menghapus SEMUA anggaran dan data pengeluaran Anda. Tindakan ini tidak dapat dibatalkan. Lanjutkan?")) {
            state = { budget: { name: '', amount: 0 }, expenses: [] }; // Reset ke format baru
            saveData();
            renderUI();
             alert("Semua data telah dihapus.");
        }
    };


    // --- Attach Event Listeners --- (sama)
    setBudgetBtn.addEventListener('click', handleSetBudget);
    expenseForm.addEventListener('submit', handleAddExpense);
    expensesUl.addEventListener('click', handleDeleteExpense);
    exportBtn.addEventListener('click', handleExportData);
    importFile.addEventListener('change', handleImportData);
    clearDataBtn.addEventListener('click', handleClearData);

    // --- Initial Load ---
    loadData();
    renderUI(); // Render setelah load
    // setDefaultDate(); // Panggil setelah load untuk memastikan input date diisi

}); // End DOMContentLoaded

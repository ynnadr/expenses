document.addEventListener('DOMContentLoaded', () => {
    // --- Get DOM Elements ---
    const budgetTotalEl = document.getElementById('budget-total');
    const budgetSpentEl = document.getElementById('budget-spent');
    const budgetRemainingEl = document.getElementById('budget-remaining');
    const budgetProgressEl = document.getElementById('budget-progress');
    const setBudgetBtn = document.getElementById('set-budget-btn');
    const expenseForm = document.getElementById('expense-form');
    const expenseDescriptionInput = document.getElementById('expense-description');
    const expenseAmountInput = document.getElementById('expense-amount');
    const expensesUl = document.getElementById('expenses-ul');
    const exportBtn = document.getElementById('export-btn');
    const importFile = document.getElementById('import-file');
    const importBtnLabel = document.querySelector('label[for="import-file"]'); // Get the label acting as button
    const clearDataBtn = document.getElementById('clear-data-btn');

    // --- App State (Data) ---
    let state = {
        budget: 0,
        expenses: [] // Array of objects: { id: number, description: string, amount: number }
    };

    // --- LocalStorage Keys ---
    const LOCAL_STORAGE_KEY = 'budgetTrackerData';

    // --- Helper Functions ---
    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0
        }).format(amount);
    };

    const generateId = () => {
        return Date.now() + Math.floor(Math.random() * 100); // Simple unique enough ID
    };

    // --- Data Persistence ---
    const saveData = () => {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(state));
    };

    const loadData = () => {
        const savedData = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (savedData) {
            try {
                const parsedData = JSON.parse(savedData);
                // Basic validation
                if (typeof parsedData.budget === 'number' && Array.isArray(parsedData.expenses)) {
                    state = parsedData;
                } else {
                    console.warn("Invalid data format in localStorage. Using default state.");
                    state = { budget: 0, expenses: [] }; // Reset if format is wrong
                }
            } catch (error) {
                console.error("Error parsing data from localStorage:", error);
                state = { budget: 0, expenses: [] }; // Reset on parse error
            }
        } else {
            // Initialize if no data exists
             state = { budget: 0, expenses: [] };
        }
    };

    // --- UI Rendering ---
    const renderUI = () => {
        // Calculate totals
        const totalSpent = state.expenses.reduce((sum, expense) => sum + expense.amount, 0);
        const remaining = state.budget - totalSpent;
        const percentageSpent = state.budget > 0 ? (totalSpent / state.budget) * 100 : 0;

        // Update summary display
        budgetTotalEl.textContent = formatCurrency(state.budget);
        budgetSpentEl.textContent = formatCurrency(totalSpent);
        budgetRemainingEl.textContent = formatCurrency(remaining);

        // Update progress bar
        budgetProgressEl.style.width = `${Math.min(percentageSpent, 100)}%`; // Cap at 100% visually

        // Update colors based on spending
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
        expensesUl.innerHTML = ''; // Clear previous list
        if (state.expenses.length === 0) {
            expensesUl.innerHTML = '<li class="no-expenses">Belum ada pengeluaran.</li>';
        } else {
            // Sort expenses by newest first (optional)
            const sortedExpenses = [...state.expenses].sort((a, b) => b.id - a.id);

            sortedExpenses.forEach(expense => {
                const li = document.createElement('li');
                li.classList.add('expense-item');
                li.dataset.id = expense.id; // Store ID for deletion
                li.innerHTML = `
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

    // --- Event Handlers ---
    const handleSetBudget = () => {
        const budgetInput = prompt("Masukkan jumlah anggaran baru (hanya angka):", state.budget);
        if (budgetInput !== null) { // Handle cancel button
            const newBudget = parseFloat(budgetInput);
            if (!isNaN(newBudget) && newBudget >= 0) {
                state.budget = newBudget;
                saveData();
                renderUI();
            } else if (budgetInput.trim() !== '') { // Don't alert if user just presses enter on empty prompt
                alert("Harap masukkan angka yang valid untuk anggaran.");
            }
        }
    };

    const handleAddExpense = (event) => {
        event.preventDefault(); // Prevent page reload

        const description = expenseDescriptionInput.value.trim();
        const amount = parseFloat(expenseAmountInput.value);

        if (!description) {
            alert("Deskripsi pengeluaran tidak boleh kosong.");
            expenseDescriptionInput.focus();
            return;
        }
         if (isNaN(amount) || amount <= 0) {
            alert("Jumlah pengeluaran harus angka positif.");
            expenseAmountInput.focus();
            return;
        }
        if (state.budget === 0) {
            alert("Harap atur anggaran terlebih dahulu sebelum menambahkan pengeluaran.");
             setBudgetBtn.focus(); // Focus the button to guide user
            return;
        }


        const newExpense = {
            id: generateId(),
            description: description,
            amount: amount
        };

        state.expenses.push(newExpense);
        saveData();
        renderUI();

        // Clear form
        expenseForm.reset();
        expenseDescriptionInput.focus(); // Focus back on description for next entry
    };

    const handleDeleteExpense = (event) => {
        const deleteButton = event.target.closest('.delete-btn');
        if (!deleteButton) return; // Exit if the click wasn't on or inside the delete button

        const listItem = deleteButton.closest('li');
        const expenseId = parseInt(listItem.dataset.id); // Retrieve ID stored in data attribute

        if (isNaN(expenseId)) return; // Exit if ID is not valid

         // Optional Confirmation
        if (confirm(`Anda yakin ingin menghapus pengeluaran ini?`)) {
            state.expenses = state.expenses.filter(expense => expense.id !== expenseId);
            saveData();
            renderUI();
        }
    };

    const handleExportData = () => {
        if (state.budget === 0 && state.expenses.length === 0) {
            alert("Tidak ada data untuk diekspor.");
            return;
        }
        const dataStr = JSON.stringify(state, null, 2); // Pretty print JSON
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        // Generate filename with date
        const date = new Date();
        const dateString = `${date.getFullYear()}${(date.getMonth() + 1).toString().padStart(2, '0')}${date.getDate().toString().padStart(2, '0')}`;
        link.download = `budget_tracker_data_${dateString}.json`;
        document.body.appendChild(link); // Required for Firefox
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url); // Clean up
    };

     const handleImportData = (event) => {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const importedData = JSON.parse(e.target.result);
                // Basic validation of imported structure
                if (typeof importedData.budget === 'number' && Array.isArray(importedData.expenses) &&
                    importedData.expenses.every(exp => typeof exp.id === 'number' && typeof exp.description === 'string' && typeof exp.amount === 'number'))
                {
                    if (confirm("Ini akan menimpa data Anda saat ini. Lanjutkan impor?")) {
                        state = importedData;
                        saveData();
                        renderUI();
                        alert("Data berhasil diimpor!");
                    }
                } else {
                    alert("Format file JSON tidak valid atau tidak sesuai.");
                }
            } catch (error) {
                alert("Gagal membaca atau memproses file JSON.");
                console.error("Import error:", error);
            } finally {
                 // Reset file input to allow importing the same file again if needed
                 importFile.value = null;
            }
        };
        reader.onerror = () => {
            alert("Gagal membaca file.");
            importFile.value = null;
        };
        reader.readAsText(file);
    };

    const handleClearData = () => {
        if (confirm("PERINGATAN: Ini akan menghapus SEMUA anggaran dan data pengeluaran Anda. Tindakan ini tidak dapat dibatalkan. Lanjutkan?")) {
            state = { budget: 0, expenses: [] };
            saveData(); // Save the empty state
            renderUI();
             alert("Semua data telah dihapus.");
        }
    };


    // --- Attach Event Listeners ---
    setBudgetBtn.addEventListener('click', handleSetBudget);
    expenseForm.addEventListener('submit', handleAddExpense);
    expensesUl.addEventListener('click', handleDeleteExpense); // Event delegation for delete buttons
    exportBtn.addEventListener('click', handleExportData);
    importFile.addEventListener('change', handleImportData); // Listen to file input change
    clearDataBtn.addEventListener('click', handleClearData);

    // --- Initial Load ---
    loadData();
    renderUI();

}); // End DOMContentLoaded

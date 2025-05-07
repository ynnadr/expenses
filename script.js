document.addEventListener('DOMContentLoaded', () => {
    // --- Get DOM Elements ---
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
    const DEFAULT_CATEGORIES = ['Makanan', 'Transportasi', 'Tagihan', 'Hiburan', 'Pendidikan', 'Kesehatan', 'Belanja', 'Lainnya'];
    let state = {
        budget: {
            name: '',
            amount: 0
        },
        categories: [...DEFAULT_CATEGORIES],
        expenses: []
    };

    let categoryChartInstance = null;
    const LOCAL_STORAGE_KEY = 'budgetTrackerData_v3';

    // --- Helper Functions ---
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
            if (isNaN(date.getTime())) {
                return dateString;
            }
            return date.toLocaleDateString('id-ID', {
                day: '2-digit',
                month: 'short',
                year: 'numeric'
            });
        } catch (e) {
            console.error("Error formatting date:", dateString, e);
            return dateString;
        }
    };

    const generateId = () => {
        return Date.now() + Math.floor(Math.random() * 1000); // Increased randomness
    };

    const setDefaultDate = () => {
        if (!expenseDateInput) return;
        const today = new Date();
        const year = today.getFullYear();
        const month = (today.getMonth() + 1).toString().padStart(2, '0');
        const day = today.getDate().toString().padStart(2, '0');
        expenseDateInput.value = `${year}-${month}-${day}`;
    };

    const CATEGORY_COLORS = [
        '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40',
        '#FFCD56', '#C9CBCF', '#3FC380', '#E84393', '#0984E3', '#FDCB6E',
        '#6C5CE7', '#00B894', '#FAB1A0', '#00cec9', '#ff7675', '#6ab04c',
        '#fdcb6e', '#d63031', '#e17055', '#00b894', '#74b9ff' // More colors
    ];

    const getColorForCategory = (index) => {
        return CATEGORY_COLORS[index % CATEGORY_COLORS.length];
    };

    // --- Data Persistence ---
    const saveData = () => {
        try {
            localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(state));
        } catch (error) {
            console.error("Error saving data to localStorage:", error);
            alert("Gagal menyimpan data. Penyimpanan mungkin penuh atau tidak didukung.");
        }
    };

    const loadData = () => {
        const savedData = localStorage.getItem(LOCAL_STORAGE_KEY);
        const defaultState = {
            budget: { name: '', amount: 0 },
            categories: [...DEFAULT_CATEGORIES],
            expenses: []
        };
        if (savedData) {
            try {
                const parsedData = JSON.parse(savedData);
                if (parsedData && typeof parsedData.budget === 'object' && parsedData.budget !== null &&
                    typeof parsedData.budget.name === 'string' && typeof parsedData.budget.amount === 'number' &&
                    Array.isArray(parsedData.categories) && parsedData.categories.every(cat => typeof cat === 'string') &&
                    Array.isArray(parsedData.expenses) &&
                    parsedData.expenses.every(exp =>
                        typeof exp.id === 'number' && typeof exp.description === 'string' &&
                        typeof exp.amount === 'number' && typeof exp.date === 'string' &&
                        (typeof exp.category === 'string' || typeof exp.category === 'undefined')
                    )
                ) {
                    state = {
                        ...defaultState,
                        ...parsedData,
                        budget: { ...defaultState.budget, ...(parsedData.budget || {}) },
                        categories: Array.isArray(parsedData.categories) && parsedData.categories.length > 0 ? parsedData.categories : [...DEFAULT_CATEGORIES],
                    };
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

    // --- UI Rendering ---
    const populateCategoryDropdown = (selectElement, selectedValue = "") => {
        if (!selectElement) return;
        const currentValue = state.categories.includes(selectElement.value) ? selectElement.value : selectedValue;
        selectElement.innerHTML = '<option value="" disabled>-- Pilih Kategori --</option>';
        const sortedCategories = [...state.categories].sort((a, b) => a.localeCompare(b));
        sortedCategories.forEach(category => {
            const option = document.createElement('option');
            option.value = category;
            option.textContent = category;
            if (category === currentValue) {
                option.selected = true;
            }
            selectElement.appendChild(option);
        });
        if (selectedValue && state.categories.includes(selectedValue)) {
             selectElement.value = selectedValue;
        } else if (!selectElement.value) {
            const defaultOption = selectElement.querySelector('option[value=""]');
            if (defaultOption) {
                defaultOption.selected = true;
            }
        }
    };

    const updateCategoryPieChart = (expenses) => {
        if (!categoryPieChartCanvas || !chartContainer || !noExpenseChartMsg) return;
        const ctx = categoryPieChartCanvas.getContext('2d');
        if (!ctx) {
            console.error("Failed to get 2D context from canvas");
            return;
        }
        const spendingByCategory = expenses.reduce((acc, expense) => {
            const category = expense.category || 'Lainnya';
            acc[category] = (acc[category] || 0) + expense.amount;
            return acc;
        }, {});
        const labels = Object.keys(spendingByCategory);
        const data = Object.values(spendingByCategory);

        if (labels.length === 0) {
            chartContainer.style.display = 'none';
            noExpenseChartMsg.classList.remove('hidden');
            if (categoryChartInstance) {
                categoryChartInstance.destroy();
                categoryChartInstance = null;
            }
            return;
        } else {
            chartContainer.style.display = 'block';
            noExpenseChartMsg.classList.add('hidden');
        }
        const backgroundColors = labels.map((_, index) => getColorForCategory(index));
        const chartData = {
            labels: labels,
            datasets: [{
                label: 'Pengeluaran',
                data: data,
                backgroundColor: backgroundColors,
                borderColor: '#ffffff',
                borderWidth: 1,
                hoverOffset: 4
            }]
        };
        const chartOptions = {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'bottom', labels: { padding: 15, boxWidth: 12 } },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            let label = context.label || '';
                            if (label) { label += ': '; }
                            if (context.parsed !== null) { label += formatCurrency(context.parsed); }
                            return label;
                        },
                        afterLabel: function(context) {
                            const total = context.dataset.data.reduce((sum, value) => sum + value, 0);
                            const percentage = total > 0 ? ((context.parsed / total) * 100).toFixed(1) + '%' : '0.0%';
                            return ` (${percentage})`;
                        }
                    }
                },
                title: { display: false }
            }
        };
        if (categoryChartInstance) {
            categoryChartInstance.destroy();
        }
        try {
            categoryChartInstance = new Chart(ctx, {
                type: 'pie',
                data: chartData,
                options: chartOptions
            });
        } catch (error) {
            console.error("Error creating Chart.js instance:", error);
        }
    };

    const renderUI = () => {
        const totalSpent = state.expenses.reduce((sum, expense) => sum + expense.amount, 0);
        const remaining = state.budget.amount - totalSpent;
        const percentageSpent = state.budget.amount > 0 ? (totalSpent / state.budget.amount) * 100 : 0;

        if (budgetNameDisplayEl) budgetNameDisplayEl.textContent = state.budget.name ? `Anggaran: ${state.budget.name}` : 'Anggaran: (Belum Diatur)';
        if (budgetTotalEl) budgetTotalEl.textContent = formatCurrency(state.budget.amount);
        if (budgetSpentEl) budgetSpentEl.textContent = formatCurrency(totalSpent);
        if (budgetRemainingEl) budgetRemainingEl.textContent = formatCurrency(remaining);

        if (budgetProgressEl) {
            budgetProgressEl.style.width = `${Math.min(percentageSpent, 100)}%`;
            const remainingElParent = budgetRemainingEl ? budgetRemainingEl.closest('.remaining') : null;
            budgetProgressEl.classList.remove('warning', 'overspending');
            if (remainingElParent) remainingElParent.classList.remove('warning', 'overspending');
            if (percentageSpent > 100) { budgetProgressEl.classList.add('overspending'); if (remainingElParent) remainingElParent.classList.add('overspending'); }
            else if (percentageSpent > 80) { budgetProgressEl.classList.add('warning'); if (remainingElParent) remainingElParent.classList.add('warning'); }
        }

        populateCategoryDropdown(expenseCategorySelect);

        if (expensesUl) {
            expensesUl.innerHTML = '';
            if (state.expenses.length === 0) {
                expensesUl.innerHTML = '<li class="no-expenses">Belum ada pengeluaran.</li>';
            } else {
                const sortedExpenses = [...state.expenses].sort((a, b) => new Date(b.date) - new Date(a.date));
                sortedExpenses.forEach(expense => {
                    const li = document.createElement('li');
                    li.classList.add('expense-item');
                    li.dataset.id = expense.id;

                    const displayHTML = `
                        <div class="expense-item-row top-row">
                            <span class="category">${expense.category || 'Lainnya'}</span>
                            <span class="description">${expense.description}</span>
                        </div>
                        <div class="expense-item-row bottom-row">
                            <span class="date">${formatDate(expense.date)}</span>
                            <span class="amount">${formatCurrency(expense.amount)}</span>
                            <div class="item-actions">
                                <button class="edit-btn" aria-label="Edit pengeluaran" data-id="${expense.id}">
                                    <i class="fas fa-pencil-alt"></i>
                                </button>
                                <button class="delete-btn" aria-label="Hapus pengeluaran" data-id="${expense.id}">
                                    <i class="fas fa-times-circle"></i>
                                </button>
                            </div>
                        </div>
                    `;

                    const editFormHTML = `
                        <div class="edit-form-elements">
                            <div class="edit-form-group">
                                <label for="edit-date-${expense.id}">Tanggal:</label>
                                <input type="date" id="edit-date-${expense.id}" class="edit-date" value="${expense.date}" required>
                            </div>
                            <div class="edit-form-group">
                                <label for="edit-category-${expense.id}">Kategori:</label>
                                <select id="edit-category-${expense.id}" class="edit-category" required></select>
                            </div>
                            <div class="edit-form-group">
                                <label for="edit-description-${expense.id}">Deskripsi:</label>
                                <input type="text" id="edit-description-${expense.id}" class="edit-description" value="${expense.description}" placeholder="Deskripsi" required>
                            </div>
                            <div class="edit-form-group">
                                <label for="edit-amount-${expense.id}">Jumlah:</label>
                                <input type="number" id="edit-amount-${expense.id}" class="edit-amount" value="${expense.amount}" placeholder="Jumlah" required min="0" step="any">
                            </div>
                            <div class="edit-form-actions">
                                 <button class="save-edit-btn" aria-label="Simpan perubahan" data-id="${expense.id}">
                                     <i class="fas fa-check"></i> Simpan
                                 </button>
                                 <button class="cancel-edit-btn" aria-label="Batalkan edit" data-id="${expense.id}">
                                     <i class="fas fa-times"></i> Batal
                                 </button>
                            </div>
                        </div>
                    `;
                    li.innerHTML = displayHTML + editFormHTML;
                    expensesUl.appendChild(li);
                });
            }
        }
        updateCategoryPieChart(state.expenses);
    };

    // --- Event Handlers ---
    const handleSetBudget = () => {
        const nameInput = prompt("Masukkan nama untuk anggaran ini:", state.budget.name || "Anggaran Utama");
        if (nameInput === null) return;
        const amountInput = prompt(`Masukkan jumlah anggaran untuk "${nameInput || '(Tanpa Nama)'}" (hanya angka):`, state.budget.amount);
        if (amountInput === null) return;
        const cleanedAmount = amountInput.replace(/[^0-9.]/g, ''); // Allow decimal point
        const newAmount = parseFloat(cleanedAmount);
        if (!isNaN(newAmount) && newAmount >= 0) {
            state.budget.name = nameInput.trim();
            state.budget.amount = newAmount;
            saveData();
            renderUI();
        } else if (amountInput.trim() !== '') {
            alert("Harap masukkan angka yang valid (minimal 0) untuk jumlah anggaran.");
        }
    };

    const handleAddCategory = () => {
        const newCategoryName = prompt("Masukkan nama kategori baru:");
        if (newCategoryName === null) return;
        const trimmedName = newCategoryName.trim();
        if (!trimmedName) {
            alert("Nama kategori tidak boleh kosong.");
            return;
        }
        const isDuplicate = state.categories.some(cat => cat.toLowerCase() === trimmedName.toLowerCase());
        if (isDuplicate) {
            alert(`Kategori "${trimmedName}" sudah ada.`);
            return;
        }
        state.categories.push(trimmedName);
        state.categories.sort((a, b) => a.localeCompare(b));
        saveData();
        populateCategoryDropdown(expenseCategorySelect);
        if (expenseCategorySelect) expenseCategorySelect.value = trimmedName;
        alert(`Kategori "${trimmedName}" berhasil ditambahkan.`);
    };

    const handleAddExpense = (event) => {
        event.preventDefault();
        if (!expenseDescriptionInput || !expenseCategorySelect || !expenseDateInput || !expenseAmountInput) return;
        const description = expenseDescriptionInput.value.trim();
        const category = expenseCategorySelect.value;
        const date = expenseDateInput.value;
        const amount = parseFloat(expenseAmountInput.value);
        if (!description) { alert("Deskripsi pengeluaran tidak boleh kosong."); expenseDescriptionInput.focus(); return; }
        if (!category) { alert("Harap pilih kategori pengeluaran."); expenseCategorySelect.focus(); return; }
        if (!date) { alert("Tanggal pengeluaran harus diisi."); expenseDateInput.focus(); return; }
        if (isNaN(amount) || amount <= 0) { alert("Jumlah pengeluaran harus angka positif."); expenseAmountInput.focus(); return; }
        if (state.budget.amount === 0 && !state.budget.name) { alert("Harap atur nama dan jumlah anggaran terlebih dahulu."); if (setBudgetBtn) setBudgetBtn.focus(); return; }
        const newExpense = {
            id: generateId(), description: description, amount: amount, date: date, category: category
        };
        state.expenses.push(newExpense);
        saveData();
        renderUI();
        if (expenseForm) expenseForm.reset();
        setDefaultDate();
        if (expenseCategorySelect) expenseCategorySelect.value = "";
        if (expenseDescriptionInput) expenseDescriptionInput.focus();
    };

    const handleDeleteExpenseAction = (expenseId) => {
        const expenseToDelete = state.expenses.find(exp => exp.id === expenseId);
        const confirmMsg = `Anda yakin ingin menghapus pengeluaran berikut?\n\nTanggal: ${formatDate(expenseToDelete?.date)}\nKategori: ${expenseToDelete?.category}\nDeskripsi: ${expenseToDelete?.description}\nJumlah: ${formatCurrency(expenseToDelete?.amount)}`;
        if (confirm(confirmMsg)) {
            state.expenses = state.expenses.filter(expense => expense.id !== expenseId);
            saveData();
            renderUI();
        }
    };

    const handleEditExpenseStartAction = (listItem, expenseId) => {
        const currentlyEditing = expensesUl ? expensesUl.querySelector('.expense-item.editing') : null;
        if (currentlyEditing && currentlyEditing !== listItem) {
            renderUI();
            const newListItem = expensesUl ? expensesUl.querySelector(`li[data-id="${expenseId}"]`) : null;
            if (!newListItem) return;
            listItem = newListItem;
        }
        listItem.classList.add('editing');
        const originalExpense = state.expenses.find(exp => exp.id === expenseId);
        if (!originalExpense) return;
        const inlineCategorySelect = listItem.querySelector('select.edit-category');
        if (inlineCategorySelect) {
            populateCategoryDropdown(inlineCategorySelect, originalExpense.category);
        }
        const dateInput = listItem.querySelector('input.edit-date');
        const descInput = listItem.querySelector('input.edit-description');
        const amountInput = listItem.querySelector('input.edit-amount');
        if (dateInput) dateInput.value = originalExpense.date;
        if (descInput) {
            descInput.value = originalExpense.description;
            descInput.focus();
            descInput.select();
        }
        if (amountInput) amountInput.value = originalExpense.amount;
    };

    const handleEditExpenseSaveAction = (listItem, expenseId) => {
        const dateInput = listItem.querySelector('input.edit-date');
        const categorySelect = listItem.querySelector('select.edit-category');
        const descriptionInput = listItem.querySelector('input.edit-description');
        const amountInput = listItem.querySelector('input.edit-amount');
        if (!dateInput || !categorySelect || !descriptionInput || !amountInput) {
            console.error("Error: Edit form elements not found."); renderUI(); return;
        }
        const newDate = dateInput.value;
        const newCategory = categorySelect.value;
        const newDescription = descriptionInput.value.trim();
        const newAmount = parseFloat(amountInput.value);
        if (!newDescription) { alert("Deskripsi tidak boleh kosong."); descriptionInput.focus(); return; }
        if (!newCategory) { alert("Harap pilih kategori."); categorySelect.focus(); return; }
        if (!newDate) { alert("Tanggal harus diisi."); dateInput.focus(); return; }
        if (isNaN(newAmount) || newAmount < 0) { alert("Jumlah harus angka non-negatif."); amountInput.focus(); return; }
        const expenseIndex = state.expenses.findIndex(exp => exp.id === expenseId);
        if (expenseIndex > -1) {
            state.expenses[expenseIndex] = {
                ...state.expenses[expenseIndex], date: newDate, category: newCategory,
                description: newDescription, amount: newAmount
            };
            saveData(); renderUI();
        } else { console.error("Error: Expense with ID", expenseId, "not found."); renderUI(); }
    };

    const handleEditExpenseCancelAction = () => {
        renderUI();
    };

    const handleExpenseListClick = (event) => {
        const target = event.target;
        const actionButton = target.closest('button');
        if (!actionButton) return;
        const listItem = actionButton.closest('li.expense-item');
        if (!listItem) return;
        const expenseIdStr = actionButton.dataset.id;
        if (!expenseIdStr) return;
        const expenseId = parseInt(expenseIdStr);
        if (isNaN(expenseId)) return;
        if (actionButton.classList.contains('delete-btn')) { handleDeleteExpenseAction(expenseId); }
        else if (actionButton.classList.contains('edit-btn')) { handleEditExpenseStartAction(listItem, expenseId); }
        else if (actionButton.classList.contains('save-edit-btn')) { handleEditExpenseSaveAction(listItem, expenseId); }
        else if (actionButton.classList.contains('cancel-edit-btn')) { handleEditExpenseCancelAction(); }
    };

    const handleExportData = () => {
        if (state.budget.amount === 0 && state.expenses.length === 0 && !state.budget.name) {
            alert("Tidak ada data untuk diekspor."); return;
        }
        try {
            const dataStr = JSON.stringify(state, null, 2);
            const dataBlob = new Blob([dataStr], { type: 'application/json;charset=utf-8' });
            const url = URL.createObjectURL(dataBlob);
            const link = document.createElement('a');
            link.href = url;
            const date = new Date();
            const dateString = `${date.getFullYear()}${(date.getMonth() + 1).toString().padStart(2, '0')}${date.getDate().toString().padStart(2, '0')}`;
            const budgetNameSlug = (state.budget.name || 'anggaran').replace(/[^a-z0-9]/gi, '_').toLowerCase();
            link.download = `budget_${budgetNameSlug}_${dateString}.json`;
            document.body.appendChild(link); link.click(); document.body.removeChild(link);
            URL.revokeObjectURL(url);
        } catch (error) { console.error("Export error:", error); alert("Gagal mengekspor data."); }
    };

    const handleImportData = (event) => {
        const fileInput = event.target; const file = fileInput.files[0]; if (!file) return;
        if (file.type !== "application/json") {
            alert("Hanya file .json yang dapat diimpor."); fileInput.value = null; return;
        }
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const importedRawData = e.target.result;
                const importedData = JSON.parse(importedRawData);
                if (importedData && typeof importedData.budget === 'object' && Array.isArray(importedData.categories) && Array.isArray(importedData.expenses)) {
                    if (confirm("PENTING: Ini akan menimpa SEMUA data Anda saat ini dengan data dari file. Lanjutkan impor?")) {
                        localStorage.setItem(LOCAL_STORAGE_KEY, importedRawData);
                        loadData(); renderUI();
                        alert("Data berhasil diimpor!");
                    }
                } else {
                    alert("Struktur data dalam file JSON tidak sesuai. Impor dibatalkan.");
                }
            } catch (error) {
                alert("Gagal memproses file JSON. Pastikan file valid."); console.error("Import error:", error);
            } finally { fileInput.value = null; }
        };
        reader.onerror = () => { alert("Gagal membaca file."); fileInput.value = null; };
        reader.readAsText(file);
    };

    const handleClearData = () => {
        if (confirm("PERINGATAN: Ini akan menghapus SEMUA data. Tindakan ini tidak dapat dibatalkan. Lanjutkan?")) {
            state = {
                budget: { name: '', amount: 0 }, categories: [...DEFAULT_CATEGORIES], expenses: []
            };
            saveData(); renderUI();
            alert("Semua data telah dihapus.");
        }
    };

    if (setBudgetBtn) setBudgetBtn.addEventListener('click', handleSetBudget);
    if (expenseForm) expenseForm.addEventListener('submit', handleAddExpense);
    if (addCategoryBtn) addCategoryBtn.addEventListener('click', handleAddCategory);
    if (expensesUl) expensesUl.addEventListener('click', handleExpenseListClick);
    if (exportBtn) exportBtn.addEventListener('click', handleExportData);
    if (importFile) importFile.addEventListener('change', handleImportData);
    if (clearDataBtn) clearDataBtn.addEventListener('click', handleClearData);

    loadData();
    renderUI();
});

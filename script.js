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
    const chartContainer = categoryPieChartCanvas ? categoryPieChartCanvas.parentElement : null; // Handle if canvas not found
    const noExpenseChartMsg = document.getElementById('no-expense-chart-msg');

    // --- App State (Data) ---
    const DEFAULT_CATEGORIES = ['Makanan', 'Transportasi', 'Tagihan', 'Hiburan', 'Pendidikan', 'Kesehatan', 'Belanja', 'Lainnya'];
    let state = {
        budget: {
            name: '',
            amount: 0
        },
        categories: [...DEFAULT_CATEGORIES],
        expenses: [] // { id, description, amount, date, category }
    };

    // Chart.js instance variable
    let categoryChartInstance = null;

    // --- LocalStorage Keys ---
    const LOCAL_STORAGE_KEY = 'budgetTrackerData_v3'; // Version with categories

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
            // Add time part to avoid potential timezone issues with date-only strings
            const date = new Date(dateString + 'T00:00:00');
            if (isNaN(date.getTime())) { // Check if date is valid
                return dateString; // Return original string if invalid
            }
            return date.toLocaleDateString('id-ID', {
                day: '2-digit',
                month: 'short',
                year: 'numeric'
            });
        } catch (e) {
            console.error("Error formatting date:", dateString, e);
            return dateString; // Fallback to original string on error
        }
    };

    const generateId = () => {
        return Date.now() + Math.floor(Math.random() * 100);
    };

    const setDefaultDate = () => {
        if (!expenseDateInput) return; // Check if element exists
        const today = new Date();
        const year = today.getFullYear();
        const month = (today.getMonth() + 1).toString().padStart(2, '0');
        const day = today.getDate().toString().padStart(2, '0');
        expenseDateInput.value = `${year}-${month}-${day}`;
    };

    // Color palette for category chart
    const CATEGORY_COLORS = [
        '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40',
        '#FFCD56', '#C9CBCF', '#3FC380', '#E84393', '#0984E3', '#FDCB6E',
        '#6C5CE7', '#00B894', '#FAB1A0', '#00cec9', '#ff7675', '#6ab04c'
        // Add more distinct colors if needed
    ];

    // Function to get a color for a category based on its index
    const getColorForCategory = (index) => {
        return CATEGORY_COLORS[index % CATEGORY_COLORS.length];
    };

    // --- Data Persistence ---
    const saveData = () => {
        try {
            localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(state));
        } catch (error) {
            console.error("Error saving data to localStorage:", error);
            // Optionally, inform the user about the storage issue
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
                // Perform more robust validation
                if (parsedData && typeof parsedData.budget === 'object' && parsedData.budget !== null &&
                    typeof parsedData.budget.name === 'string' && typeof parsedData.budget.amount === 'number' &&
                    Array.isArray(parsedData.categories) && parsedData.categories.every(cat => typeof cat === 'string') &&
                    Array.isArray(parsedData.expenses) &&
                    parsedData.expenses.every(exp =>
                        typeof exp.id === 'number' && typeof exp.description === 'string' &&
                        typeof exp.amount === 'number' && typeof exp.date === 'string' &&
                        (typeof exp.category === 'string' || typeof exp.category === 'undefined') // Allow undefined for older data
                    )
                ) {
                    state = {
                        ...defaultState, // Start with default
                        ...parsedData, // Override with saved data
                        budget: { ...defaultState.budget, ...(parsedData.budget || {}) }, // Ensure budget object exists
                        categories: Array.isArray(parsedData.categories) && parsedData.categories.length > 0 ? parsedData.categories : [...DEFAULT_CATEGORIES], // Use saved categories or default
                    };
                    // Ensure all loaded expenses have a category property (fallback for older data)
                    state.expenses = state.expenses.map(exp => ({ ...exp, category: exp.category || 'Lainnya' }));
                } else {
                    console.warn("Invalid data format in localStorage (v3). Using default state.");
                    state = defaultState;
                }
            } catch (error) {
                console.error("Error parsing data from localStorage (v3):", error);
                state = defaultState; // Reset to default if parsing fails
            }
        } else {
            state = defaultState; // Use default if no saved data
        }
        setDefaultDate(); // Set default date after loading state
    };

    // --- UI Rendering ---

    // Function to populate the category dropdown
    const populateCategoryDropdown = (selectElement, selectedValue = "") => {
        if (!selectElement) return; // Check if element exists

        // Preserve current value only if it's a valid category from state
        const currentValue = state.categories.includes(selectElement.value) ? selectElement.value : selectedValue;
        selectElement.innerHTML = '<option value="" disabled>-- Pilih Kategori --</option>'; // Reset

        const sortedCategories = [...state.categories].sort((a, b) => a.localeCompare(b));

        sortedCategories.forEach(category => {
            const option = document.createElement('option');
            option.value = category;
            option.textContent = category;
            // Select based on passed selectedValue or preserved currentValue
            if (category === currentValue) {
                option.selected = true;
            }
            selectElement.appendChild(option);
        });

         // If a specific value was requested and valid, ensure it's selected
        if (selectedValue && state.categories.includes(selectedValue)) {
             selectElement.value = selectedValue;
        }
        // Ensure the default option is selected if the final value is empty
        else if (!selectElement.value) {
            const defaultOption = selectElement.querySelector('option[value=""]');
            if (defaultOption) {
                defaultOption.selected = true;
            }
        }
    };


    // Function to update/create the category pie chart
    const updateCategoryPieChart = (expenses) => {
        if (!categoryPieChartCanvas || !chartContainer || !noExpenseChartMsg) return; // Ensure all required elements exist

        const ctx = categoryPieChartCanvas.getContext('2d');
        if (!ctx) {
            console.error("Failed to get 2D context from canvas");
            return;
        }

        // 1. Aggregate spending by category
        const spendingByCategory = expenses.reduce((acc, expense) => {
            const category = expense.category || 'Lainnya';
            acc[category] = (acc[category] || 0) + expense.amount;
            return acc;
        }, {});

        const labels = Object.keys(spendingByCategory);
        const data = Object.values(spendingByCategory);

        // 2. Show/hide chart and message based on data
        if (labels.length === 0) {
            chartContainer.style.display = 'none'; // Hide canvas container
            noExpenseChartMsg.classList.remove('hidden');
            if (categoryChartInstance) {
                categoryChartInstance.destroy();
                categoryChartInstance = null;
            }
            return;
        } else {
            chartContainer.style.display = 'block'; // Show canvas container
            noExpenseChartMsg.classList.add('hidden');
        }

        // 3. Prepare chart data
        const backgroundColors = labels.map((_, index) => getColorForCategory(index));
        const chartData = {
            labels: labels,
            datasets: [{
                label: 'Pengeluaran', // Single dataset label
                data: data,
                backgroundColor: backgroundColors,
                borderColor: '#ffffff',
                borderWidth: 1,
                hoverOffset: 4
            }]
        };

        // 4. Chart options
        const chartOptions = {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { padding: 15, boxWidth: 12 }
                },
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
                title: { display: false } // Title is in the section header
            }
        };

        // 5. Destroy old chart instance and create new one
        if (categoryChartInstance) {
            categoryChartInstance.destroy();
        }
        try {
            categoryChartInstance = new Chart(ctx, {
                type: 'pie', // Or 'doughnut'
                data: chartData,
                options: chartOptions
            });
        } catch (error) {
            console.error("Error creating Chart.js instance:", error);
            // Optionally inform user if chart fails to render
        }
    };

    // Main function to render the entire UI
    const renderUI = () => {
        // Calculate Budget Summary values
        const totalSpent = state.expenses.reduce((sum, expense) => sum + expense.amount, 0);
        const remaining = state.budget.amount - totalSpent;
        const percentageSpent = state.budget.amount > 0 ? (totalSpent / state.budget.amount) * 100 : 0;

        // Update Budget Summary Text & Progress Bar
        if (budgetNameDisplayEl) budgetNameDisplayEl.textContent = state.budget.name ? `Anggaran: ${state.budget.name}` : 'Anggaran: (Belum Diatur)';
        if (budgetTotalEl) budgetTotalEl.textContent = formatCurrency(state.budget.amount);
        if (budgetSpentEl) budgetSpentEl.textContent = formatCurrency(totalSpent);
        if (budgetRemainingEl) budgetRemainingEl.textContent = formatCurrency(remaining);

        if (budgetProgressEl) {
            budgetProgressEl.style.width = `${Math.min(percentageSpent, 100)}%`;
            const remainingElParent = budgetRemainingEl ? budgetRemainingEl.closest('.remaining') : null;
            budgetProgressEl.classList.remove('warning', 'overspending');
            if(remainingElParent) remainingElParent.classList.remove('warning', 'overspending');

            if (percentageSpent > 100) {
                budgetProgressEl.classList.add('overspending');
                if(remainingElParent) remainingElParent.classList.add('overspending');
            } else if (percentageSpent > 80) {
                budgetProgressEl.classList.add('warning');
                 if(remainingElParent) remainingElParent.classList.add('warning');
            }
        }


        // Update Category Dropdown (for the main form)
        populateCategoryDropdown(expenseCategorySelect);

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
                    li.dataset.id = expense.id; // Store ID on list item

                    // Structure for Normal Display
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

                    // Structure for Edit Mode (hidden by default via CSS)
                    const editFormHTML = `
                        <div class="edit-form-elements">
                            <input type="date" class="edit-date" value="${expense.date}" required>
                            <select class="edit-category" required>
                                <!-- Options populated by JS on edit -->
                            </select>
                            <input type="text" class="edit-description" value="${expense.description}" placeholder="Deskripsi" required>
                            <input type="number" class="edit-amount" value="${expense.amount}" placeholder="Jumlah" required min="0" step="any">
                            <div class="edit-form-actions">
                                 <button class="save-edit-btn" aria-label="Simpan perubahan" data-id="${expense.id}">
                                     <i class="fas fa-check"></i> <!-- Check icon for save -->
                                 </button>
                                 <button class="cancel-edit-btn" aria-label="Batalkan edit" data-id="${expense.id}">
                                     <i class="fas fa-times"></i> <!-- Times icon for cancel -->
                                 </button>
                            </div>
                        </div>
                    `;

                    li.innerHTML = displayHTML + editFormHTML;
                    expensesUl.appendChild(li);
                });
            }
        }

        // Update Category Pie Chart
        updateCategoryPieChart(state.expenses);
    };

    // --- Event Handlers ---

    const handleSetBudget = () => {
        const nameInput = prompt("Masukkan nama untuk anggaran ini:", state.budget.name || "Anggaran Utama");
        if (nameInput === null) return;

        const amountInput = prompt(`Masukkan jumlah anggaran untuk "${nameInput || '(Tanpa Nama)'}" (hanya angka):`, state.budget.amount);
        if (amountInput === null) return;

        // Clean the input to allow only numbers
        const cleanedAmount = amountInput.replace(/[^0-9]/g, '');
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

        const isDuplicate = state.categories.some(
            category => category.toLowerCase() === trimmedName.toLowerCase()
        );
        if (isDuplicate) {
            alert(`Kategori "${trimmedName}" sudah ada.`);
            return;
        }

        state.categories.push(trimmedName);
        state.categories.sort((a, b) => a.localeCompare(b)); // Keep sorted
        saveData();
        populateCategoryDropdown(expenseCategorySelect); // Update main dropdown
        if(expenseCategorySelect) expenseCategorySelect.value = trimmedName; // Select the new category in main form
        alert(`Kategori "${trimmedName}" berhasil ditambahkan.`);
    };

    const handleAddExpense = (event) => {
        event.preventDefault();
        if (!expenseDescriptionInput || !expenseCategorySelect || !expenseDateInput || !expenseAmountInput) return;

        const description = expenseDescriptionInput.value.trim();
        const category = expenseCategorySelect.value;
        const date = expenseDateInput.value;
        const amount = parseFloat(expenseAmountInput.value);

        // Validation
        if (!description) { alert("Deskripsi pengeluaran tidak boleh kosong."); expenseDescriptionInput.focus(); return; }
        if (!category) { alert("Harap pilih kategori pengeluaran."); expenseCategorySelect.focus(); return; }
        if (!date) { alert("Tanggal pengeluaran harus diisi."); expenseDateInput.focus(); return; }
        if (isNaN(amount) || amount <= 0) { alert("Jumlah pengeluaran harus angka positif."); expenseAmountInput.focus(); return; }
        if (state.budget.amount === 0 && !state.budget.name) { alert("Harap atur nama dan jumlah anggaran terlebih dahulu."); if(setBudgetBtn) setBudgetBtn.focus(); return; }

        const newExpense = {
            id: generateId(),
            description: description,
            amount: amount,
            date: date,
            category: category
        };

        state.expenses.push(newExpense);
        saveData();
        renderUI();

        // Reset form
        if (expenseForm) expenseForm.reset();
        setDefaultDate();
        if(expenseCategorySelect) expenseCategorySelect.value = ""; // Reset category selection
        if(expenseDescriptionInput) expenseDescriptionInput.focus();
    };

    // --- Action Functions for Expense List Items ---

    const handleDeleteExpenseAction = (expenseId) => {
        const expenseToDelete = state.expenses.find(exp => exp.id === expenseId);
        // Provide more context in confirmation
        const confirmMsg = `Anda yakin ingin menghapus pengeluaran berikut?\n\nTanggal: ${formatDate(expenseToDelete?.date)}\nKategori: ${expenseToDelete?.category}\nDeskripsi: ${expenseToDelete?.description}\nJumlah: ${formatCurrency(expenseToDelete?.amount)}`;
        if (confirm(confirmMsg)) {
            state.expenses = state.expenses.filter(expense => expense.id !== expenseId);
            saveData();
            renderUI(); // Re-render after delete
        }
    };

    const handleEditExpenseStartAction = (listItem, expenseId) => {
         // Check if another item is already being edited
         const currentlyEditing = expensesUl ? expensesUl.querySelector('.expense-item.editing') : null;
         if (currentlyEditing && currentlyEditing !== listItem) {
             // Revert the other item first by re-rendering
             renderUI();
             // Find the originally clicked item again after re-render
             const newListItem = expensesUl ? expensesUl.querySelector(`li[data-id="${expenseId}"]`) : null;
             // If not found (shouldn't happen often), just exit
             if (!newListItem) return;
             listItem = newListItem;
         }

        // Add editing class
        listItem.classList.add('editing');

        // Find the original expense data
        const originalExpense = state.expenses.find(exp => exp.id === expenseId);
        if (!originalExpense) return; // Should not happen if ID is correct

        // Populate the inline category dropdown
        const inlineCategorySelect = listItem.querySelector('select.edit-category');
        if (inlineCategorySelect) {
             populateCategoryDropdown(inlineCategorySelect, originalExpense.category);
        }

        // Prefill other inputs (already done via value attribute in HTML string, but good practice)
        const dateInput = listItem.querySelector('input.edit-date');
        const descInput = listItem.querySelector('input.edit-description');
        const amountInput = listItem.querySelector('input.edit-amount');
        if(dateInput) dateInput.value = originalExpense.date;
        if(descInput) descInput.value = originalExpense.description;
        if(amountInput) amountInput.value = originalExpense.amount;


        // Focus the description input for convenience
        if (descInput) {
             descInput.focus();
             descInput.select();
        }
    };

    const handleEditExpenseSaveAction = (listItem, expenseId) => {
        // Get inline form elements
        const dateInput = listItem.querySelector('input.edit-date');
        const categorySelect = listItem.querySelector('select.edit-category');
        const descriptionInput = listItem.querySelector('input.edit-description');
        const amountInput = listItem.querySelector('input.edit-amount');

        if (!dateInput || !categorySelect || !descriptionInput || !amountInput) {
            console.error("Error: Edit form elements not found in list item.");
            renderUI(); // Re-render to exit edit mode on error
            return;
        }

        // Get new values
        const newDate = dateInput.value;
        const newCategory = categorySelect.value;
        const newDescription = descriptionInput.value.trim();
        const newAmount = parseFloat(amountInput.value);

        // Validate new values
        if (!newDescription) { alert("Deskripsi tidak boleh kosong."); descriptionInput.focus(); return; }
        if (!newCategory) { alert("Harap pilih kategori."); categorySelect.focus(); return; }
        if (!newDate) { alert("Tanggal harus diisi."); dateInput.focus(); return; }
        if (isNaN(newAmount) || newAmount < 0) { alert("Jumlah harus angka non-negatif."); amountInput.focus(); return; } // Allow 0

        // Find and update expense in state
        const expenseIndex = state.expenses.findIndex(exp => exp.id === expenseId);
        if (expenseIndex > -1) {
            state.expenses[expenseIndex] = {
                ...state.expenses[expenseIndex], // Keep original ID
                date: newDate,
                category: newCategory,
                description: newDescription,
                amount: newAmount
            };
            saveData();
            renderUI(); // Re-render to show updated data and exit edit mode
        } else {
            console.error("Error: Expense with ID", expenseId, "not found in state.");
            renderUI(); // Re-render to exit edit mode anyway
        }
    };

    const handleEditExpenseCancelAction = () => {
        // Simply re-render the UI to discard changes and exit edit mode
        renderUI();
    };

    // Event Delegation handler for the expense list
    const handleExpenseListClick = (event) => {
        const target = event.target;
        // Find the closest button ancestor
        const actionButton = target.closest('button');
        if (!actionButton) return; // Click was not on or inside a button

        const listItem = actionButton.closest('li.expense-item');
        if (!listItem) return; // Click was not inside a list item

        // Get the ID from the button's data-id attribute
        const expenseIdStr = actionButton.dataset.id;
        if (!expenseIdStr) return; // Button doesn't have an ID

        const expenseId = parseInt(expenseIdStr);
        if (isNaN(expenseId)) return; // ID is not a valid number

        // Determine action based on button class
        if (actionButton.classList.contains('delete-btn')) {
            handleDeleteExpenseAction(expenseId);
        } else if (actionButton.classList.contains('edit-btn')) {
            handleEditExpenseStartAction(listItem, expenseId);
        } else if (actionButton.classList.contains('save-edit-btn')) {
            handleEditExpenseSaveAction(listItem, expenseId);
        } else if (actionButton.classList.contains('cancel-edit-btn')) {
            handleEditExpenseCancelAction();
        }
    };


    // Data Management Handlers
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
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url); // Clean up blob URL
        } catch (error) {
            console.error("Export error:", error);
            alert("Gagal mengekspor data.");
        }
    };

    const handleImportData = (event) => {
        const fileInput = event.target;
        const file = fileInput.files[0];
        if (!file) return;

        if (file.type !== "application/json") {
             alert("Hanya file .json yang dapat diimpor.");
             fileInput.value = null; // Reset input
             return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const importedRawData = e.target.result;
                const importedData = JSON.parse(importedRawData); // Check for basic JSON validity first

                // Basic structure check
                if (importedData && typeof importedData.budget === 'object' && Array.isArray(importedData.categories) && Array.isArray(importedData.expenses)) {
                    if (confirm("PENTING: Ini akan menimpa SEMUA data Anda saat ini dengan data dari file. Lanjutkan impor?")) {
                        // Save the raw data - loadData will handle detailed validation
                        localStorage.setItem(LOCAL_STORAGE_KEY, importedRawData);
                        loadData(); // Reload state from the newly saved data
                        renderUI(); // Render with the new state
                        alert("Data berhasil diimpor!");
                    }
                } else {
                    alert("Struktur data dalam file JSON tidak sesuai (harus ada 'budget', 'categories', 'expenses'). Impor dibatalkan.");
                }
            } catch (error) {
                alert("Gagal memproses file JSON. Pastikan file valid dan tidak rusak.");
                console.error("Import error:", error);
            } finally {
                fileInput.value = null; // Reset input value
            }
        };
        reader.onerror = () => {
            alert("Gagal membaca file.");
            fileInput.value = null; // Reset input value
        };
        reader.readAsText(file);
    };

    const handleClearData = () => {
        if (confirm("PERINGATAN: Ini akan menghapus SEMUA anggaran, kategori khusus, dan data pengeluaran Anda. Tindakan ini tidak dapat dibatalkan. Lanjutkan?")) {
            state = {
                budget: { name: '', amount: 0 },
                categories: [...DEFAULT_CATEGORIES],
                expenses: []
            };
            saveData(); // Save the empty state
            renderUI();
            alert("Semua data telah dihapus.");
        }
    };

    // --- Attach Event Listeners ---
    // Add checks to ensure elements exist before adding listeners
    if (setBudgetBtn) setBudgetBtn.addEventListener('click', handleSetBudget);
    if (expenseForm) expenseForm.addEventListener('submit', handleAddExpense);
    if (addCategoryBtn) addCategoryBtn.addEventListener('click', handleAddCategory);
    if (expensesUl) expensesUl.addEventListener('click', handleExpenseListClick); // Single listener for list actions
    if (exportBtn) exportBtn.addEventListener('click', handleExportData);
    if (importFile) importFile.addEventListener('change', handleImportData);
    if (clearDataBtn) clearDataBtn.addEventListener('click', handleClearData);

    // --- Initial Load ---
    loadData(); // Load data from localStorage or set defaults
    renderUI(); // Initial render of the UI

}); // End DOMContentLoaded

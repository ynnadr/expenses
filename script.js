document.addEventListener('DOMContentLoaded', () => {
    // --- Get DOM Elements ---
    // ... (Elemen DOM lain) ...
    const categoryPieChartCanvas = document.getElementById('categoryPieChart'); // REVISI: Get canvas baru
    const chartContainer = categoryPieChartCanvas.parentElement; // Container tetap sama
    const noExpenseChartMsg = document.getElementById('no-expense-chart-msg'); // REVISI: Get pesan no data

    // --- App State ---
    // ... (State tetap sama) ...
    const DEFAULT_CATEGORIES = ['Makanan', 'Transportasi', 'Tagihan', 'Hiburan', 'Pendidikan', 'Kesehatan', 'Belanja', 'Lainnya'];
    let state = { /* ... budget, categories, expenses ... */ };


    // REVISI: Variabel untuk instance chart kategori
    let categoryChartInstance = null;

    // --- LocalStorage Key ---
    const LOCAL_STORAGE_KEY = 'budgetTrackerData_v3'; // Tetap

    // --- Helper Functions ---
    // ... (formatCurrency, formatDate, generateId, setDefaultDate) ...
    const formatCurrency = (amount) => { /* ... */ };
    const formatDate = (dateString) => { /* ... */ };
    const generateId = () => { /* ... */ };
    const setDefaultDate = () => { /* ... */ };

    // REVISI: Palet warna untuk chart kategori
    const CATEGORY_COLORS = [
        '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40',
        '#FFCD56', '#C9CBCF', '#3FC380', '#E84393', '#0984E3', '#FDCB6E',
        '#6C5CE7', '#00B894', '#FAB1A0'
        // Tambahkan lebih banyak warna jika kategori Anda biasanya > 15
    ];

    // Fungsi sederhana untuk mendapatkan warna (akan berulang jika > panjang palet)
    const getColorForCategory = (index) => {
        return CATEGORY_COLORS[index % CATEGORY_COLORS.length];
    };


    // --- Data Persistence ---
    // ... (saveData, loadData v3) ...
    const saveData = () => { /* ... */ };
    const loadData = () => { /* ... */ };

    // --- UI Rendering ---

    // ... (populateCategoryDropdown) ...
    const populateCategoryDropdown = (selectElement = expenseCategorySelect) => { /* ... */ };


    // REVISI: Fungsi untuk membuat/memperbarui Pie Chart Kategori
    const updateCategoryPieChart = (expenses) => {
        if (!categoryPieChartCanvas || !chartContainer) return; // Pastikan elemen ada

        const ctx = categoryPieChartCanvas.getContext('2d');
        if (!ctx) return;

        // 1. Agregasi data pengeluaran per kategori
        const spendingByCategory = expenses.reduce((acc, expense) => {
            const category = expense.category || 'Lainnya'; // Default jika kategori kosong
            acc[category] = (acc[category] || 0) + expense.amount;
            return acc;
        }, {}); // Hasil: { Makanan: 150000, Transportasi: 50000, ... }

        // 2. Siapkan data untuk Chart.js
        const labels = Object.keys(spendingByCategory);
        const data = Object.values(spendingByCategory);

        // 3. Tampilkan/Sembunyikan chart & pesan jika tidak ada data
        if (labels.length === 0) {
            chartContainer.classList.add('hidden'); // Sembunyikan canvas via container
            noExpenseChartMsg.classList.remove('hidden'); // Tampilkan pesan
            // Hancurkan chart lama jika ada
            if (categoryChartInstance) {
                categoryChartInstance.destroy();
                categoryChartInstance = null;
            }
            return; // Jangan gambar chart
        } else {
            chartContainer.classList.remove('hidden'); // Tampilkan canvas
            noExpenseChartMsg.classList.add('hidden'); // Sembunyikan pesan
        }

        // 4. Siapkan dataset Chart.js dengan warna
        const backgroundColors = labels.map((_, index) => getColorForCategory(index));

        const chartData = {
            labels: labels,
            datasets: [{
                label: 'Pengeluaran per Kategori', // Label dataset
                data: data,
                backgroundColor: backgroundColors,
                borderColor: '#ffffff',
                borderWidth: 1,
                hoverOffset: 4
            }]
        };

        // 5. Konfigurasi Chart Options
        const chartOptions = {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom', // Atau 'top', 'left', 'right'
                    labels: {
                        padding: 15,
                        boxWidth: 12 // Ukuran kotak warna legenda
                    },
                    // display: labels.length <= 8 // Opsional: sembunyikan legenda jika terlalu banyak item
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            let label = context.label || '';
                            if (label) { label += ': '; }
                            if (context.parsed !== null) {
                                label += formatCurrency(context.parsed);
                            }
                            return label;
                        },
                        // Opsional: Tambahkan persentase di tooltip
                        afterLabel: function(context) {
                            const total = context.dataset.data.reduce((sum, value) => sum + value, 0);
                            const percentage = total > 0 ? ((context.parsed / total) * 100).toFixed(1) + '%' : '0.0%';
                            return ` (${percentage})`;
                        }
                    }
                },
                title: {
                    display: false, // Judul chart sudah ada di H2 section
                    // text: 'Pengeluaran per Kategori'
                }
            }
        };

        // 6. Hancurkan chart lama & buat yang baru
        if (categoryChartInstance) {
            categoryChartInstance.destroy();
        }
        categoryChartInstance = new Chart(ctx, {
            type: 'pie', // Atau 'doughnut' jika lebih suka
            data: chartData,
            options: chartOptions
        });
    };


    const renderUI = () => {
        // --- Hitung Nilai (Budget Summary) ---
        const totalSpent = state.expenses.reduce((sum, expense) => sum + expense.amount, 0);
        const remaining = state.budget.amount - totalSpent;
        const percentageSpent = state.budget.amount > 0 ? (totalSpent / state.budget.amount) * 100 : 0;

        // --- Update Tampilan Teks & Progress Bar (Budget Summary) ---
        budgetNameDisplayEl.textContent = state.budget.name ? `Anggaran: ${state.budget.name}` : 'Anggaran: (Belum Diatur)';
        budgetTotalEl.textContent = formatCurrency(state.budget.amount);
        budgetSpentEl.textContent = formatCurrency(totalSpent);
        budgetRemainingEl.textContent = formatCurrency(remaining);

        budgetProgressEl.style.width = `${Math.min(percentageSpent, 100)}%`;
        // ... (Logika warna progress bar) ...
        const remainingElParent = budgetRemainingEl.closest('.remaining');
        budgetProgressEl.classList.remove('warning', 'overspending');
        remainingElParent.classList.remove('warning', 'overspending');
        if (percentageSpent > 100) { budgetProgressEl.classList.add('overspending'); remainingElParent.classList.add('overspending'); }
        else if (percentageSpent > 80) { budgetProgressEl.classList.add('warning'); remainingElParent.classList.add('warning'); }


        // --- Update Dropdown Kategori ---
        populateCategoryDropdown();

        // --- Update Daftar Pengeluaran ---
        expensesUl.innerHTML = '';
        if (state.expenses.length === 0) {
            expensesUl.innerHTML = '<li class="no-expenses">Belum ada pengeluaran.</li>';
        } else {
            // ... (logika render daftar pengeluaran) ...
             const sortedExpenses = [...state.expenses].sort((a, b) => new Date(b.date) - new Date(a.date));
             sortedExpenses.forEach(expense => { /* ... render li ... */ });
        }

        // --- REVISI: Panggil fungsi update pie chart KATEGORI ---
        updateCategoryPieChart(state.expenses); // Kirim array expenses
    };

    // --- Event Handlers ---
    // ... (handleSetBudget, handleAddCategory, handleAddExpense, handleDeleteExpense, handleExportData, handleImportData, handleClearData tetap sama) ...
     const handleSetBudget = () => { /* ... */ };
     const handleAddCategory = () => { /* ... */ };
     const handleAddExpense = (event) => { /* ... */ };
     const handleDeleteExpense = (event) => { /* ... */ };
     const handleExportData = () => { /* ... */ };
     const handleImportData = (event) => { /* ... */ };
     const handleClearData = () => { /* ... */ };


    // --- Attach Event Listeners ---
    // ... (Listeners tetap sama) ...
    setBudgetBtn.addEventListener('click', handleSetBudget);
    expenseForm.addEventListener('submit', handleAddExpense);
    addCategoryBtn.addEventListener('click', handleAddCategory);
    expensesUl.addEventListener('click', handleDeleteExpense);
    exportBtn.addEventListener('click', handleExportData);
    importFile.addEventListener('change', handleImportData);
    clearDataBtn.addEventListener('click', handleClearData);


    // --- Initial Load ---
    loadData();
    renderUI();

}); // End DOMContentLoaded

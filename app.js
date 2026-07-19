// ===== AUTHENTICATION SYSTEM =====
let currentUser = null;
let accounts = JSON.parse(localStorage.getItem('accounts')) || {};
let payments = [];
let expenses = [];

// Initialize App
window.addEventListener('DOMContentLoaded', () => {
    checkUserSession();
});

// ===== LOGIN & SIGNUP FUNCTIONS =====
function toggleSignup() {
    document.getElementById('loginForm').style.display = 
        document.getElementById('loginForm').style.display === 'none' ? 'block' : 'none';
    document.getElementById('signupForm').style.display = 
        document.getElementById('signupForm').style.display === 'none' ? 'block' : 'none';
}

document.getElementById('loginForm')?.addEventListener('submit', function(e) {
    e.preventDefault();
    const username = document.getElementById('loginUsername').value.trim();
    const password = document.getElementById('loginPassword').value;
    
    if (accounts[username] && accounts[username].password === btoa(password)) {
        currentUser = username;
        localStorage.setItem('currentUser', username);
        payments = accounts[username].payments || [];
        expenses = accounts[username].expenses || [];
        showMainApp();
    } else {
        alert('Maqaa ykn seensa hincaale!');
    }
});

document.getElementById('signupForm')?.addEventListener('submit', function(e) {
    e.preventDefault();
    const username = document.getElementById('signupUsername').value.trim();
    const password = document.getElementById('signupPassword').value;
    const confirmPassword = document.getElementById('signupPasswordConfirm').value;
    
    if (password !== confirmPassword) {
        alert('Seensi wal-hin-jijjiire!');
        return;
    }
    
    if (accounts[username]) {
        alert('Konti kun yeroo dura haala jira!');
        return;
    }
    
    accounts[username] = {
        password: btoa(password),
        payments: [],
        expenses: [],
        createdAt: new Date().toISOString()
    };
    localStorage.setItem('accounts', JSON.stringify(accounts));
    alert('Konti haaraa milkiin haasame! Amma seena gali.');
    toggleSignup();
    document.getElementById('signupForm').reset();
});

function checkUserSession() {
    const user = localStorage.getItem('currentUser');
    if (user && accounts[user]) {
        currentUser = user;
        payments = accounts[user].payments || [];
        expenses = accounts[user].expenses || [];
        showMainApp();
    }
}

function showMainApp() {
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('mainApp').style.display = 'block';
    document.getElementById('currentUser').innerText = currentUser;
    document.getElementById('currentDate').innerText = new Date().toLocaleDateString('om-ET', 
        { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    
    const urlParams = new URLSearchParams(window.location.search);
    const sharedData = urlParams.get('sharedSnapshot');
    if (sharedData) {
        try {
            const decoded = JSON.parse(decodeURIComponent(escape(atob(sharedData))));
            if (decoded.payments && decoded.expenses && confirm("Ragaa liinkii kanaan isiniif qoodame argitaniittu. Sistama keessan irratti fe'uu ni barbaadduu?")) {
                payments = decoded.payments;
                expenses = decoded.expenses;
                saveUserData();
                window.history.replaceState({}, document.title, window.location.pathname);
            }
        } catch (err) { console.error(err); }
    }
    
    filterAndRender();
    setupAutoSave();
}

function logoutUser() {
    if (confirm('Seena ba\'uu ni barbaadduu?')) {
        saveUserData();
        localStorage.removeItem('currentUser');
        currentUser = null;
        document.getElementById('loginScreen').style.display = 'flex';
        document.getElementById('mainApp').style.display = 'none';
        document.getElementById('loginForm').reset();
        document.getElementById('signupForm').reset();
        document.getElementById('loginForm').style.display = 'block';
        document.getElementById('signupForm').style.display = 'none';
    }
}

function changeAccount() {
    saveUserData();
    logoutUser();
    bootstrap.Modal.getInstance(document.getElementById('maintenanceModal')).hide();
}

// ===== AUTO-SAVE SYSTEM =====
function setupAutoSave() {
    const inputElements = document.querySelectorAll('input, textarea, select');
    inputElements.forEach(element => {
        element.addEventListener('change', () => {
            autoSaveData();
        });
    });
}

function autoSaveData() {
    saveUserData();
    showAutoSaveIndicator();
}

function showAutoSaveIndicator() {
    const indicator = document.getElementById('autoSaveIndicator');
    indicator.classList.add('show');
    setTimeout(() => {
        indicator.classList.remove('show');
    }, 2000);
}

function saveUserData() {
    if (currentUser && accounts[currentUser]) {
        accounts[currentUser].payments = payments;
        accounts[currentUser].expenses = expenses;
        accounts[currentUser].updatedAt = new Date().toISOString();
        localStorage.setItem('accounts', JSON.stringify(accounts));
    }
}

// ===== FORM SUBMISSIONS =====
document.getElementById('paymentForm')?.addEventListener('submit', function(e) {
    e.preventDefault();
    payments.push({
        fullName: document.getElementById('fullName').value.trim(),
        phoneNumber: document.getElementById('phoneNumber').value.trim(),
        address: document.getElementById('address').value.trim(),
        amount: document.getElementById('amount').value,
        reason: document.getElementById('reason').value.trim(),
        comment: document.getElementById('paymentComment').value.trim(),
        status: document.getElementById('status').value,
        timestamp: new Date().toISOString()
    });
    saveUserData();
    filterAndRender();
    this.reset();
    alert('Kaffaltii milkiin galmeexa!');
});

document.getElementById('expenseForm')?.addEventListener('submit', function(e) {
    e.preventDefault();
    expenses.push({
        title: document.getElementById('expenseTitle').value.trim(),
        amount: document.getElementById('expenseAmount').value,
        date: document.getElementById('expenseDate').value,
        comment: document.getElementById('expenseComment').value.trim(),
        timestamp: new Date().toISOString()
    });
    saveUserData();
    filterAndRender();
    this.reset();
    alert('Baasii milkiin galmeexa!');
});

// ===== FILTER AND RENDER =====
function filterAndRender() {
    const searchVal = document.getElementById('searchInput')?.value.toLowerCase().trim() || '';
    const filterVal = document.getElementById('filterStatus')?.value || 'All';
    const tableBody = document.getElementById('dataTable');
    if (tableBody) tableBody.innerHTML = '';
    
    let sumIncome = 0, paidPeopleCount = 0, renderedRowsCount = 0;
    let incomeRecordsForAvg = [];

    payments.forEach((p, index) => {
        if (p.status === 'Kaffalameera') { 
            sumIncome += Number(p.amount); 
            paidPeopleCount++; 
        }
        incomeRecordsForAvg.push(Number(p.amount));
        
        if ((p.fullName.toLowerCase().includes(searchVal) || p.phoneNumber.includes(searchVal)) && 
            (filterVal === 'All' || p.status === filterVal)) {
            renderedRowsCount++;
            const commentHTML = p.comment ? `<div class="comment-section"><div class="comment-text"><strong>Gabaasa:</strong> ${p.comment}</div></div>` : '';
            tableBody.innerHTML += `
                <tr>
                    <td>${renderedRowsCount}</td>
                    <td><strong>${p.fullName}</strong>${commentHTML}</td>
                    <td>${p.phoneNumber}</td>
                    <td>${Number(p.amount).toLocaleString()} ETB</td>
                    <td>${p.reason}</td>
                    <td><span class="status-badge ${p.status === 'Kaffalameera' ? 'badge-paid' : 'badge-unpaid'}" onclick="toggleStatus(${index})">${p.status}</span></td>
                    <td class="text-center">
                        <div class="d-flex justify-content-center gap-2">
                            <button class="btn btn-sm btn-outline-primary border-0 p-1 rounded-circle" onclick="openEditPaymentModal(${index})" title="Sirreessi"><i class="bi bi-pencil-square"></i></button>
                            <button class="btn btn-sm btn-outline-danger border-0 p-1 rounded-circle" onclick="deleteRecord(${index})" title="Haqi"><i class="bi bi-trash3"></i></button>
                        </div>
                    </td>
                </tr>`;
        }
    });
    document.getElementById('noDataState').className = renderedRowsCount === 0 ? 'empty-state' : 'empty-state d-none';

    const expenseTableBody = document.getElementById('expenseDataTable');
    if (expenseTableBody) {
        expenseTableBody.innerHTML = '';
        let sumExpenses = 0;
        let maxExpVal = 0;

        expenses.forEach((e, idx) => {
            const currentAmt = Number(e.amount);
            sumExpenses += currentAmt;
            if (currentAmt > maxExpVal) maxExpVal = currentAmt;

            const commentHTML = e.comment ? `<div class="comment-section"><div class="comment-text"><strong>Gabaasa:</strong> ${e.comment}</div></div>` : '';
            expenseTableBody.innerHTML += `
                <tr>
                    <td>${idx + 1}</td>
                    <td><strong>${e.title}</strong>${commentHTML}</td>
                    <td class="fw-bold text-danger">${currentAmt.toLocaleString()} ETB</td>
                    <td>${e.date}</td>
                    <td class="text-center">
                        <div class="d-flex justify-content-center gap-2">
                            <button class="btn btn-sm btn-outline-primary border-0 p-1 rounded-circle" onclick="openEditExpenseModal(${idx})" title="Sirreessi"><i class="bi bi-pencil-square"></i></button>
                            <button class="btn btn-sm btn-outline-danger border-0 p-1 rounded-circle" onclick="deleteExpense(${idx})" title="Haqi"><i class="bi bi-trash3"></i></button>
                        </div>
                    </td>
                </tr>`;
        });
        document.getElementById('noExpenseState').className = expenses.length === 0 ? 'empty-state' : 'empty-state d-none';

        const avgPay = incomeRecordsForAvg.length > 0 ? (incomeRecordsForAvg.reduce((a, b) => a + b, 0) / incomeRecordsForAvg.length) : 0;
        if (document.getElementById('avgPayment')) document.getElementById('avgPayment').innerText = Math.round(avgPay).toLocaleString() + " ETB";
        if (document.getElementById('maxExpense')) document.getElementById('maxExpense').innerText = maxExpVal.toLocaleString() + " ETB";
        if (document.getElementById('totalCountOfPeople')) document.getElementById('totalCountOfPeople').innerText = payments.length;
        if (document.getElementById('totalEntries')) document.getElementById('totalEntries').innerText = payments.length + expenses.length;

        const netBalanceVal = sumIncome - sumExpenses;
        if (document.getElementById('totalIncome')) document.getElementById('totalIncome').innerText = sumIncome.toLocaleString() + " ETB";
        if (document.getElementById('paidPeopleCount')) document.getElementById('paidPeopleCount').innerText = `${paidPeopleCount} kaffalameera`;
        if (document.getElementById('totalExpenses')) document.getElementById('totalExpenses').innerText = sumExpenses.toLocaleString() + " ETB";
        if (document.getElementById('expensesCount')) document.getElementById('expensesCount').innerText = `${expenses.length} galmeeffame`;

        const netBalanceEl = document.getElementById('netBalance');
        if (netBalanceEl) {
            netBalanceEl.innerText = (netBalanceVal >= 0 ? "+" : "") + netBalanceVal.toLocaleString() + " ETB";
            netBalanceEl.className = netBalanceVal >= 0 ? "mb-0 text-success fw-bold mt-1" : "mb-0 text-danger fw-bold mt-1";
        }
        
        if (document.getElementById('statsCount')) document.getElementById('statsCount').innerText = payments.length + expenses.length;
    }
}

// ===== EDIT FUNCTIONS =====
function openEditPaymentModal(index) {
    const p = payments[index];
    document.getElementById('editPaymentIndex').value = index;
    document.getElementById('editFullName').value = p.fullName;
    document.getElementById('editPhoneNumber').value = p.phoneNumber;
    document.getElementById('editAddress').value = p.address || "";
    document.getElementById('editAmount').value = p.amount;
    document.getElementById('editReason').value = p.reason || "";
    document.getElementById('editPaymentComment').value = p.comment || "";
    document.getElementById('editStatus').value = p.status;
    new bootstrap.Modal(document.getElementById('editPaymentModal')).show();
}

document.getElementById('editPaymentForm')?.addEventListener('submit', function(e) {
    e.preventDefault();
    const index = document.getElementById('editPaymentIndex').value;
    payments[index] = {
        fullName: document.getElementById('editFullName').value.trim(),
        phoneNumber: document.getElementById('editPhoneNumber').value.trim(),
        address: document.getElementById('editAddress').value.trim(),
        amount: document.getElementById('editAmount').value,
        reason: document.getElementById('editReason').value.trim(),
        comment: document.getElementById('editPaymentComment').value.trim(),
        status: document.getElementById('editStatus').value,
        timestamp: payments[index].timestamp
    };
    saveUserData();
    filterAndRender();
    bootstrap.Modal.getInstance(document.getElementById('editPaymentModal')).hide();
    alert('Kaffaltii milkiin sirreexe!');
});

function openEditExpenseModal(index) {
    const exp = expenses[index];
    document.getElementById('editExpenseIndex').value = index;
    document.getElementById('editExpenseTitle').value = exp.title;
    document.getElementById('editExpenseAmount').value = exp.amount;
    document.getElementById('editExpenseDate').value = exp.date;
    document.getElementById('editExpenseComment').value = exp.comment || "";
    new bootstrap.Modal(document.getElementById('editExpenseModal')).show();
}

document.getElementById('editExpenseForm')?.addEventListener('submit', function(e) {
    e.preventDefault();
    const index = document.getElementById('editExpenseIndex').value;
    expenses[index] = {
        title: document.getElementById('editExpenseTitle').value.trim(),
        amount: document.getElementById('editExpenseAmount').value,
        date: document.getElementById('editExpenseDate').value,
        comment: document.getElementById('editExpenseComment').value.trim(),
        timestamp: expenses[index].timestamp
    };
    saveUserData();
    filterAndRender();
    bootstrap.Modal.getInstance(document.getElementById('editExpenseModal')).hide();
    alert('Baasii milkiin sirreexe!');
});

// ===== DELETE FUNCTIONS =====
function toggleStatus(index) { 
    payments[index].status = payments[index].status === 'Kaffalameera' ? 'Hin Kaffalamne' : 'Kaffalameera'; 
    saveUserData(); 
    filterAndRender(); 
}

function deleteRecord(index) { 
    if(confirm('Galmee kun haqu qabaa?')) { 
        payments.splice(index, 1); 
        saveUserData(); 
        filterAndRender(); 
        alert('Galmee haqa ta\'eera!');
    } 
}

function deleteExpense(index) { 
    if(confirm('Baasiin kun haqu qabaa?')) { 
        expenses.splice(index, 1); 
        saveUserData(); 
        filterAndRender(); 
        alert('Baasii haqa ta\'eera!');
    } 
}

// ===== BACKUP & RESTORE =====
function downloadBackup() { 
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify({ payments, expenses, timestamp: new Date().toISOString() })); 
    const dl = document.createElement('a'); 
    dl.setAttribute("href", dataStr); 
    dl.setAttribute("download", `Backup_${currentUser}_${new Date().getTime()}.json`); 
    dl.click(); 
    alert('Backup milkiin fudhame!');
}

function retrieveBackup(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = JSON.parse(e.target.result);
            if (data.payments && data.expenses) {
                if (confirm('Baakupi kana deebi\'uu qabaa? Galmee har\'aa bayyinnaan baasuu ni danda\'ama!')) {
                    payments = data.payments;
                    expenses = data.expenses;
                    saveUserData();
                    filterAndRender();
                    alert('Baakupi milkiin deebiyeera!');
                }
            } else {
                alert('Baakupi kun hin habamne!');
            }
        } catch (err) {
            alert('Baakupi fudhachuun hin danda\'ame!');
        }
    };
    reader.readAsText(file);
}

function uploadCSV() {
    const fileInput = document.getElementById('csvFileInput');
    const file = fileInput.files[0];
    if (!file) {
        alert('Fiilii CSV filadhu!');
        return;
    }
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const lines = e.target.result.split('\n');
            let addedCount = 0;
            
            for (let i = 1; i < lines.length; i++) {
                const parts = lines[i].split(',');
                if (parts.length >= 5 && parts[0].trim()) {
                    payments.push({
                        fullName: parts[0].trim(),
                        phoneNumber: parts[1].trim(),
                        address: parts[2].trim(),
                        amount: parts[3].trim(),
                        reason: parts[4].trim(),
                        comment: parts[5] ? parts[5].trim() : '',
                        status: parts[6] ? parts[6].trim() : 'Kaffalameera',
                        timestamp: new Date().toISOString()
                    });
                    addedCount++;
                }
            }
            
            saveUserData();
            filterAndRender();
            alert(`${addedCount} galmee milkiin fe\'ama!`);
            fileInput.value = '';
        } catch (err) {
            alert('CSV fudhachuun hin danda\'ame!');
        }
    };
    reader.readAsText(file);
}

function exportToCSV() {
    let csv = 'Maqaa,Bilbila,Teessoo,Kaffaltii,Sababa,Gabaasa,Haala\n';
    payments.forEach(p => {
        csv += `"${p.fullName}","${p.phoneNumber}","${p.address}",${p.amount},"${p.reason}","${p.comment}","${p.status}"\n`;
    });
    
    const dataStr = "data:text/csv;charset=utf-8," + encodeURIComponent(csv);
    const dl = document.createElement('a');
    dl.setAttribute("href", dataStr);
    dl.setAttribute("download", `Galmee_${currentUser}_${new Date().getTime()}.csv`);
    dl.click();
}

function shareDashboardLink() {
    try {
        const dataToShare = { payments, expenses };
        const jsonStr = JSON.stringify(dataToShare);
        const encodedData = btoa(unescape(encodeURIComponent(jsonStr)));
        const shareUrl = `${window.location.origin}${window.location.pathname}?sharedSnapshot=${encodedData}`;
        navigator.clipboard.writeText(shareUrl).then(() => {
            alert("Liinkii daashboordii keessanii milkiin gara 'clipboard' keessanitti koppii ta'eera!");
        }).catch(() => { alert("Liinkii gubbaa jiru cuqaasaa copy godhaa."); });
    } catch(e) { alert("Ragaan kuufame baay'ee guddaa dha."); }
}

// ===== MAINTENANCE FUNCTIONS =====
function clearAllData() {
    if (confirm('Galmee hundan HAQAMUU NI BARBAADDUU?? Kana akka itti eegamtu tamasisa! Kana hin deebi\'amuu!')) {
        if (confirm('Waraqii - Kana haquu hayyuu? Galmee hundan haqa ta\'a!')) {
            payments = [];
            expenses = [];
            saveUserData();
            filterAndRender();
            alert('Galmee hundan haqa ta\'eera!');
            bootstrap.Modal.getInstance(document.getElementById('maintenanceModal')).hide();
        }
    }
}

function showDataStats() {
    const totalIncome = payments.reduce((sum, p) => sum + (p.status === 'Kaffalameera' ? Number(p.amount) : 0), 0);
    const totalExpense = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
    const balance = totalIncome - totalExpense;
    
    const statsHTML = `
        <div class="row g-3">
            <div class="col-md-6">
                <div class="card border-success">
                    <div class="card-body">
                        <h6 class="card-title text-success"><i class="bi bi-wallet2 me-2"></i>Galii Guutuu</h6>
                        <h3>${totalIncome.toLocaleString()} ETB</h3>
                        <small class="text-muted">${payments.filter(p => p.status === 'Kaffalameera').length} kaffalameera</small>
                    </div>
                </div>
            </div>
            <div class="col-md-6">
                <div class="card border-danger">
                    <div class="card-body">
                        <h6 class="card-title text-danger"><i class="bi bi-cart-dash me-2"></i>Baasii Guutuu</h6>
                        <h3>${totalExpense.toLocaleString()} ETB</h3>
                        <small class="text-muted">${expenses.length} baasii</small>
                    </div>
                </div>
            </div>
            <div class="col-md-6">
                <div class="card border-info">
                    <div class="card-body">
                        <h6 class="card-title text-info"><i class="bi bi-graph-up me-2"></i>Haftee Guutuu</h6>
                        <h3 class="${balance >= 0 ? 'text-success' : 'text-danger'}">${(balance >= 0 ? '+' : '') + balance.toLocaleString()} ETB</h3>
                        <small class="text-muted">Jigaa</small>
                    </div>
                </div>
            </div>
            <div class="col-md-6">
                <div class="card border-warning">
                    <div class="card-body">
                        <h6 class="card-title"><i class="bi bi-files me-2"></i>Galmee Guutuu</h6>
                        <h3>${payments.length + expenses.length}</h3>
                        <small class="text-muted">${payments.length} kaffaltii + ${expenses.length} baasii</small>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.getElementById('statsContent').innerHTML = statsHTML;
    new bootstrap.Modal(document.getElementById('statsModal')).show();
}

function resetApplication() {
    if (confirm('Sistamaa OTOO HALAAN ol-haasi? Galmee hundan hin haqi, kunuunsa qofatu deebi\'ama!')) {
        window.location.reload();
    }
}

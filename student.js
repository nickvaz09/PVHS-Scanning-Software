document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const loginForm = document.getElementById('loginForm');
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    const loginError = document.getElementById('loginError');
    const appContainer = document.getElementById('appContainer');
    const loginContainer = document.getElementById('loginContainer');
    const sNumberInput = document.getElementById('sNumberInput');
    const filterInput = document.getElementById('filterInput');
    const attendanceTableBody = document.getElementById('attendanceTableBody');
    const fileUpload = document.getElementById('fileUpload');
    const fileNameDisplay = document.querySelector('.file-name');
    const finalizeBtn = document.getElementById('finalizeBtn');
    const revertBtn = document.getElementById('revertBtn');
    const activateLockdownBtn = document.getElementById('activateLockdownBtn');
    const downloadExcelBtn = document.getElementById('downloadExcelBtn');

    let studentsData = JSON.parse(localStorage.getItem('excelData')) || [];
    let originalData = JSON.parse(localStorage.getItem('originalExcelData')) || [];

    // Initialize page
    initializePageWithSavedData();

    function initializePageWithSavedData() {
        const savedData = localStorage.getItem('currentTableState');
        if (savedData) {
            studentsData = JSON.parse(savedData);
            refreshAttendanceTable();
        }
    }

    // Event Listeners
    loginForm.addEventListener('submit', handleLogin);
    fileUpload.addEventListener('change', handleFileUpload);
    filterInput.addEventListener('input', filterTable);
    finalizeBtn.addEventListener('click', finalizeData);
    revertBtn.addEventListener('click', revertToOriginalData);
    downloadExcelBtn.addEventListener('click', downloadExcel);
    activateLockdownBtn.addEventListener('click', activateLockdownBrowser);

    // Ensure system fields have the same width and height
    const systemFields = document.querySelectorAll('.file-input-wrapper, .filter-container .input-group');
    systemFields.forEach(field => {
        field.style.width = '100%';
        field.style.height = '50px';
    });

    function handleLogin(e) {
        e.preventDefault();
        const username = usernameInput.value.trim();
        const password = passwordInput.value.trim();
    
        if (username === "admin" && password === "sharks") {
            loginError.style.display = 'none';
            loginContainer.style.display = 'none';
            appContainer.style.display = 'block';
            loadSavedData(); // Load saved data after successful login
        } else {
            loginError.style.display = 'block';
            loginError.textContent = "Invalid username or password";
            loginForm.classList.add('shake');
            setTimeout(() => loginForm.classList.remove('shake'), 500);
        }
    }

    function hideLoginError() {
        loginError.style.display = 'none';
    }

    usernameInput.addEventListener('focus', hideLoginError);
    passwordInput.addEventListener('focus', hideLoginError);

    function handleFileUpload(event) {
        const file = event.target.files[0];
        if (file) {
            fileNameDisplay.textContent = file.name;
            const reader = new FileReader();
            reader.onload = function(e) {
                try {
                    const data = new Uint8Array(e.target.result);
                    const workbook = XLSX.read(data, { type: 'array' });
                    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
                    studentsData = XLSX.utils.sheet_to_json(firstSheet);

                    originalData = JSON.parse(JSON.stringify(studentsData));

                    studentsData = studentsData.map(student => ({
                        ...student,
                        ID: student['ID'] || student['id'] || ''
                    }));

                    originalData = JSON.parse(JSON.stringify(studentsData));

                    saveDataToLocalStorage();
                    refreshAttendanceTable();
                    alert('Student data successfully uploaded and ready for scanning!');
                } catch (error) {
                    console.error('Error processing file:', error);
                    alert('Error processing file. Please ensure it\'s a valid Excel file.');
                    fileNameDisplay.textContent = 'No file selected';
                }
            };
            reader.onerror = function() {
                alert('Error reading file');
                fileNameDisplay.textContent = 'No file selected';
            };
            reader.readAsArrayBuffer(file);
        } else {
            fileNameDisplay.textContent = 'No file selected';
        }
    }

    function refreshAttendanceTable() {
        attendanceTableBody.innerHTML = '';

        if (studentsData.length === 0) {
            const emptyRow = attendanceTableBody.insertRow();
            const emptyCell = emptyRow.insertCell(0);
            emptyCell.colSpan = 4;
            emptyCell.textContent = 'No data available';
            emptyCell.style.textAlign = 'center';
            return;
        }

        studentsData.forEach((student, index) => {
            const row = attendanceTableBody.insertRow();

            ['Name', 'LAB', 'SEAT NUMBER'].forEach((field, cellIndex) => {
                const cell = row.insertCell();
                cell.innerText = student[field];
                if (cellIndex !== 0) {
                    cell.contentEditable = true;
                    cell.addEventListener('focus', () => {
                        cell.dataset.originalValue = cell.innerText;
                        highlightCell(cell);
                    });
                    cell.addEventListener('blur', () => {
                        const newValue = cell.innerText.trim();
                        if (newValue !== cell.dataset.originalValue) {
                            const fieldName = ['LAB', 'SEAT NUMBER'][cellIndex - 1];
                            student[fieldName] = newValue;
                            saveDataToLocalStorage();
                        }
                        unhighlightCell(cell);
                    });
                }
            });

            // Add delete button
            const actionsCell = row.insertCell();
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'delete-btn';
            deleteBtn.innerText = 'Delete';
            deleteBtn.onclick = () => deleteStudent(index);
            actionsCell.appendChild(deleteBtn);
        });

        applyFilter(filterInput.value.toLowerCase().trim());
    }

    function highlightCell(cell) {
        cell.classList.add('highlighted-cell');
    }
    
    function unhighlightCell(cell) {
        cell.classList.remove('highlighted-cell');
    }

    function deleteStudent(index) {
        if (confirm('Are you sure you want to delete this student?')) {
            studentsData.splice(index, 1);
            saveDataToLocalStorage();
            refreshAttendanceTable();
        }
    }

    function filterTable() {
        const query = filterInput.value.toLowerCase().trim();
        applyFilter(query);
    }

    function applyFilter(query) {
        const rows = attendanceTableBody.querySelectorAll('tr');
        rows.forEach(row => {
            const text = row.textContent.toLowerCase();
            row.style.display = text.includes(query) ? '' : 'none';
        });
    }

    function finalizeData() {
        saveDataToLocalStorage();
        alert('Data has been finalized!');
    }

    function revertToOriginalData() {
        if (confirm('Are you sure you want to revert to the original data? All changes will be lost.')) {
            studentsData = JSON.parse(JSON.stringify(originalData));
            saveDataToLocalStorage();
            refreshAttendanceTable();
            alert('Data has been reverted to the original state.');
        }
    }

    function downloadExcel() {
        const worksheet = XLSX.utils.json_to_sheet(studentsData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Students');
        XLSX.writeFile(workbook, 'Updated_Student_Data.xlsx');
    }

    function saveDataToLocalStorage() {
        localStorage.setItem('excelData', JSON.stringify(studentsData));
        localStorage.setItem('originalExcelData', JSON.stringify(originalData));
        // Save the current table state
        localStorage.setItem('currentTableState', JSON.stringify(studentsData));
    }
    
    function loadSavedData() {
        const savedData = localStorage.getItem('currentTableState');
        if (savedData) {
            studentsData = JSON.parse(savedData);
            refreshAttendanceTable();
        }
    }

    function setupPeriodicRefresh() {
        setInterval(() => {
            const updatedData = JSON.parse(localStorage.getItem('excelData')) || [];
            if (JSON.stringify(updatedData) !== JSON.stringify(studentsData)) {
                studentsData = updatedData;
                refreshAttendanceTable();
            }
        }, 5000); // Check every 5 seconds
    }

    function activateLockdownBrowser() {
        const newTab = window.open('', '_blank');
        if (newTab) {
            newTab.focus();

            const lockdownHTML = `
            <!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Lockdown Browser</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600&display=swap');
        
        :root {
            --primary-color: #4a90e2;
            --secondary-color: #f0f4f8;
            --text-color: #333;
            --border-color: #ddd;
            --hover-color: #357abd;
            --status-green: #4CAF50;
            --status-yellow: #FFC107;
            --status-red: #F44336;
        }
        
        body {
            font-family: 'Poppins', sans-serif;
            margin: 0;
            padding: 0;
            display: flex;
            flex-direction: column;
            min-height: 100vh;
            background-color: var(--secondary-color);
            overflow: hidden;
        }
        
        .lockdown-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 10px 20px;
            background-color: var(--primary-color);
            color: white;
        }
        
        .lockdown-header h1 {
            margin: 0;
            font-size: 24px;
            flex-grow: 1;
            text-align: center;
        }
        
        .qr-code {
            width: 70px;
            height: 70px;
        }
        
        .qr-code img {
            width: 100%;
            height: 100%;
        }
        
        .main-content {
            display: flex;
            flex-grow: 1;
            padding: 20px;
        }
        
        .left-panel {
            width: 30%;
            margin-right: 20px;
            display: flex;
            flex-direction: column;
        }
        
        .right-panel {
            width: 70%;
        }
        
        .data-box-container {
            display: flex;
            flex-direction: column;
            height: 520px;
            margin-bottom: 30px;
        }

        .data-box {
            background-color: #ffffff;
            border-radius: 10px;
            box-shadow: 0px 4px 10px rgba(0, 0, 0, 0.1);
            padding: 25px;
            flex: 1;
            overflow: hidden;
            position: relative;
            transition: all 0.5s ease;
            display: flex;
            flex-direction: column;
            margin-bottom: 25px;
        }

        .data-box-bottom {
            background-color: #f0f4f8;
        }

        .data-content {
            flex-grow: 1;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            transition: opacity 0.5s ease-in-out;
        }

        .data-box-title {
            font-weight: bold;
            color: #4a90e2;
            font-size: 1.2em;
            margin-bottom: 15px;
            text-align: center;
        }

        .data-item {
            margin-bottom: 10px;
            width: 100%;
            font-size: 1em;
        }

        .data-label {
            font-weight: bold;
            margin-right: 10px;
        }

        .placeholder-text {
            text-align: center;
            color: #999;
            font-style: italic;
            font-size: 1.1em;
            margin-bottom: 8px;
        }

        .placeholder-icon {
            font-size: 3em;
            color: #4a90e2;
            margin-bottom: 15px;
            animation: pulse 2s infinite;
        }

        .error-message {
            color: #e74c3c;
            font-weight: bold;
            font-size: 1.1em;
            text-align: center;
            animation: shake 0.82s cubic-bezier(.36,.07,.19,.97) both;
        }

        @keyframes pulse {
            0% { opacity: 0.6; transform: scale(1); }
            50% { opacity: 1; transform: scale(1.1); }
            100% { opacity: 0.6; transform: scale(1); }
        }

        @keyframes shake {
            10%, 90% { transform: translate3d(-1px, 0, 0); }
            20%, 80% { transform: translate3d(2px, 0, 0); }
            30%, 50%, 70% { transform: translate3d(-4px, 0, 0); }
            40%, 60% { transform: translate3d(4px, 0, 0); }
        }

        .scrolling-table td {
            text-align: left;
        }

        .status-container {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-top: 20px;
            padding: 10px;
            background-color: #f0f4f8;
            border-radius: 10px;
        }

        /* Remove center alignment for seat number */
        .scrolling-table td:nth-child(3) {
            text-align: left;
        }

        .scrolling-table td:nth-child(3) {
            text-align: center;
        }
        
        .scrolling-table-container {
            height: calc(100vh - 140px);
            overflow-y: auto;
            border: 1px solid var(--border-color);
            border-radius: 10px;
            background-color: #ffffff;
        }
        
        table {
            width: 100%;
            border-collapse: collapse;
        }
        
        th, td {
            padding: 12px;
            text-align: left;
            border-bottom: 1px solid var(--border-color);
        }
        
        th {
            background-color: var(--primary-color);
            color: white;
            position: sticky;
            top: 0;
        }
        
        #scanInstruction {
            font-size: 24px;
            color: var(--text-color);
            font-weight: bold;
            text-align: center;
            margin-top: auto;
            padding: 20px 0;
        }
        
        #scanInstruction::after {
            content: '⬇';
            display: block;
            font-size: 36px;
            margin-top: 10px;
        }
        
        .highlighted-row {
            background-color: var(--secondary-color);
        }
        
        .timer {
            font-size: 18px;
            margin-top: 10px;
            text-align: center;
            background-color: #ffffff;
            padding: 10px;
            border-radius: 10px;
            box-shadow: 0px 4px 10px rgba(0, 0, 0, 0.1);
        }

        .status {
            font-size: 16px;
            margin-top: 10px;
            text-align: center;
            background-color: #ffffff;
            padding: 10px;
            border-radius: 10px;
            box-shadow: 0px 4px 10px rgba(0, 0, 0, 0.1);
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .status-indicator {
            display: inline-block;
            width: 10px;
            height: 10px;
            border-radius: 50%;
            margin-right: 5px;
            margin-left: 10px;
        }

        .status-ready {
            background-color: var(--status-green);
        }

        .status-cooldown {
            background-color: var(--status-yellow);
        }

        .status-unknown {
            background-color: var(--status-red);
        }

        #scanStatus {
            margin-right: 5px;
            margin-left: 5px;
        }

        #cooldownTimer {
            font-weight: bold;
        }
    </style>
</head>
<body>
    <div class="lockdown-header">
        <h1>Student Testing Data</h1>
        <div class="qr-code">
            <img src="https://api.qrserver.com/v1/create-qr-code/?size=70x70&data=LockdownBrowser" alt="QR Code">
        </div>
    </div>
    
    <div class="main-content">
        <div class="left-panel">
            <div class="data-box-container">
                <div id="infoBoxTop" class="data-box data-box-top">
                    <div class="data-content">
                        <span id="dataPlaceholderTop" class="placeholder">No data scanned yet.</span>
                    </div>
                </div>
                <div id="infoBoxBottom" class="data-box data-box-bottom">
                    <div class="data-content">
                        <span id="dataPlaceholderBottom" class="placeholder">No previous data.</span>
                    </div>
                </div>
            </div>
            <div class="timer">Time Elapsed: <span id="elapsedTime">00:00:00</span></div>
            <div class="status">
                Status: <span class="status-indicator status-ready"></span> <span id="scanStatus">Ready to Scan</span>
            </div>
            <div id="scanInstruction">Scan ID Here!</div>
        </div>
        <div class="right-panel">
            <div class="scrolling-table-container">
                <table class="scrolling-table">
                    <thead>
                        <tr>
                            <th>Full Name</th>
                            <th>Lab</th>
                            <th>Seat Number</th>
                        </tr>
                    </thead>
                    <tbody id="scrollingListBody">
                        <!-- Auto-scrolling list will be dynamically populated here -->
                    </tbody>
                </table>
            </div>
        </div>
    </div>

    <script>
// DOM Elements
const scrollingListBody = document.getElementById('scrollingListBody');
const infoBoxTop = document.getElementById('infoBoxTop');
const infoBoxBottom = document.getElementById('infoBoxBottom');
const scanStatus = document.getElementById('scanStatus');
const statusIndicator = document.querySelector('.status-indicator');
const elapsedTimeElement = document.getElementById('elapsedTime');

// State variables
let isScanningEnabled = true;
let scanTimeout;
let cooldownTimer;
let seconds = 0;
let scrollPosition = 0;
let scrollSpeed = 0.5;

// Assume studentsData is provided from the server
const studentsData = ${JSON.stringify(studentsData)};

// Create hidden input for scanning
const sNumberInput = createHiddenInput();

// Initialize the page
initializePage();

// Event Listeners
document.addEventListener('click', focusScanInput);
sNumberInput.addEventListener('input', handleScan);
document.querySelector('.scrolling-table-container').addEventListener('mouseenter', () => { scrollSpeed = 0; });
document.querySelector('.scrolling-table-container').addEventListener('mouseleave', () => { scrollSpeed = 0.5; });

function createHiddenInput() {
    const input = document.createElement('input');
    input.setAttribute('type', 'text');
    input.setAttribute('id', 'sNumberInput');
    input.style.opacity = '0';
    input.style.position = 'absolute';
    document.body.appendChild(input);
    return input;
}

function initializePage() {
    initializeBoxes();
    populateTable();
    updateStatus('ready');
    setInterval(updateTimer, 1000);
    setTimeout(scrollList, 1000);
    sNumberInput.focus();
}

function initializeBoxes() {
    const currentScanContent = \`
        <div class="placeholder-icon">📷</div>
        <span class="placeholder-text">No data scanned yet</span>
        <span class="placeholder-text">Please scan a student ID</span>
    \`;
    
    const previousScanContent = \`
        <span class="placeholder-text">No previous data</span>
    \`;
    
    updateInfoBox(infoBoxTop, 'Current Scan', currentScanContent);
    updateInfoBox(infoBoxBottom, 'Previous Scan', previousScanContent);
}

function populateTable() {
    scrollingListBody.innerHTML = studentsData.map(student => \`
        <tr>
            <td>\${student.Name}</td>
            <td>\${student.LAB}</td>
            <td>\${student['SEAT NUMBER']}</td>
        </tr>
    \`).join('');
}

function focusScanInput() {
    if (isScanningEnabled) {
        sNumberInput.focus();
    }
}

function handleScan(event) {
    if (!isScanningEnabled) return;

    const sNumber = event.target.value.trim();
    if (sNumber.length >= 6) {
        const student = studentsData.find(stud => stud.ID === sNumber);
        if (student) {
            processValidScan(student);
        } else {
            handleUnknownStudent();
        }
        sNumberInput.value = ''; // Clear input
    }
}

function processValidScan(student) {
    isScanningEnabled = false;
    updateStatus('cooldown');
    startCooldownTimer(5);

    const studentInfo = \`
        <div class="data-item"><span class="data-label">Name:</span> \${student.Name}</div>
        <div class="data-item"><span class="data-label">Lab:</span> \${student.LAB}</div>
        <div class="data-item"><span class="data-label">Seat:</span> \${student['SEAT NUMBER']}</div>
    \`;

    updateInfoBox(infoBoxTop, 'Current Scan', studentInfo);
    highlightTableRow(student.Name);

    if (scanTimeout) {
        clearTimeout(scanTimeout);
    }

    scanTimeout = setTimeout(() => {
        updateInfoBox(infoBoxBottom, 'Previous Scan', studentInfo);
        resetTopInfoBox();
        isScanningEnabled = true;
        updateStatus('ready');
        sNumberInput.focus();
    }, 5000);
}

function updateInfoBox(infoBox, title, content) {
    infoBox.innerHTML = \`
        <div class="data-box-title">\${title}</div>
        <div class="data-content">\${content}</div>
    \`;
}

function resetTopInfoBox() {
    const currentScanContent = \`
        <div class="placeholder-icon">📷</div>
        <span class="placeholder-text">No data scanned yet</span>
        <span class="placeholder-text">Please scan a student ID</span>
    \`;
    updateInfoBox(infoBoxTop, 'Current Scan', currentScanContent);
}

function handleUnknownStudent() {
    const errorContent = \`
        <div class="placeholder-icon">❌</div>
        <div class="error-message">Student not found!</div>
        <span class="placeholder-text">Please try again</span>
    \`;
    updateInfoBox(infoBoxTop, 'Current Scan', errorContent);
    updateStatus('unknown');
    setTimeout(() => {
        resetTopInfoBox();
        updateStatus('ready');
        isScanningEnabled = true;
    }, 3000);
}

function highlightTableRow(studentName) {
    const rows = scrollingListBody.querySelectorAll('tr');
    rows.forEach(row => {
        if (row.cells[0].textContent === studentName) {
            row.classList.add('highlighted-row');
            row.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } else {
            row.classList.remove('highlighted-row');
        }
    });
}

function updateStatus(status) {
    statusIndicator.className = 'status-indicator status-' + status;
    scanStatus.textContent = status === 'ready' ? 'Ready to Scan' : 
                             status === 'cooldown' ? 'Cooldown' : 'Unknown ID';
    scanStatus.style.color = status === 'ready' ? 'var(--status-green)' :
                             status === 'cooldown' ? 'var(--status-yellow)' : 'var(--status-red)';
    
    if (status !== 'cooldown') {
        const existingTimer = document.getElementById('cooldownTimer');
        if (existingTimer) existingTimer.remove();
    }
}

function startCooldownTimer(seconds) {
    let timeLeft = seconds;
    updateCooldownTimer(timeLeft);

    if (cooldownTimer) {
        clearInterval(cooldownTimer);
    }

    cooldownTimer = setInterval(() => {
        timeLeft--;
        updateCooldownTimer(timeLeft);

        if (timeLeft <= 0) {
            clearInterval(cooldownTimer);
        }
    }, 1000);
}

function updateCooldownTimer(seconds) {
    const timerSpan = document.getElementById('cooldownTimer') || document.createElement('span');
    timerSpan.id = 'cooldownTimer';
    timerSpan.textContent = seconds > 0 ? \` (\${seconds})\` : '';
    scanStatus.appendChild(timerSpan);
}

function updateTimer() {
    seconds++;
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    elapsedTimeElement.textContent = 
        \`\${hours.toString().padStart(2, '0')}:\${minutes.toString().padStart(2, '0')}:\${secs.toString().padStart(2, '0')}\`;
}

function scrollList() {
    scrollPosition += scrollSpeed;
    const tableContainer = document.querySelector('.scrolling-table-container');
    if (scrollPosition >= tableContainer.scrollHeight - tableContainer.clientHeight) {
        scrollPosition = 0;
    }
    tableContainer.scrollTop = scrollPosition;
    requestAnimationFrame(scrollList);
}
</script>
</body>
</html>
    `;

    // Write the lockdownHTML into the new tab
    newTab.document.write(lockdownHTML);
    newTab.document.close();
} else {
    alert('Unable to open new tab. Please check your browser settings.');
}
}

    // Initial focus on sNumberInput
    sNumberInput.focus();

    initializeBoxes();
    loadSavedData();
    setupPeriodicRefresh();

});

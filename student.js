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
        
        .data-box {
            background-color: #ffffff;
            border-radius: 10px;
            box-shadow: 0px 4px 10px rgba(0, 0, 0, 0.1);
            padding: 20px;
            margin-bottom: 20px;
            flex-grow: 1;
        }
        
        .data-box div {
            margin-bottom: 10px;
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
            margin-left: 10px; /* Add this line to move the circle to the right */
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
            margin-left: 5px; /* Add this line to create space between "Status:" and the circle */
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
            <div id="infoBox" class="data-box">
                <span id="dataPlaceholder" class="placeholder">No data scanned yet.</span>
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
    const studentsData = ${JSON.stringify(studentsData)};
    const scrollingListBody = document.getElementById('scrollingListBody');
    const infoBox = document.getElementById('infoBox');
    const dataPlaceholder = document.getElementById('dataPlaceholder');
    const scanStatus = document.getElementById('scanStatus');
    const statusIndicator = document.querySelector('.status-indicator');

    let isScanningEnabled = true;
    let scanTimeout;
    let cooldownInterval;

    const sNumberInput = document.createElement('input');
    sNumberInput.setAttribute('type', 'text');
    sNumberInput.setAttribute('id', 'sNumberInput');
    sNumberInput.style.opacity = '0';
    sNumberInput.style.position = 'absolute';
    document.body.appendChild(sNumberInput);

    // Automatically focus the input field when user clicks anywhere
    document.addEventListener('click', () => {
        if (isScanningEnabled) {
            sNumberInput.focus();
        }
    });
    sNumberInput.focus(); // Initial focus

    // Populate the table with scrolling data
    studentsData.forEach((student) => {
        const row = document.createElement('tr');
        row.innerHTML = \`
            <td>\${student['Name']}</td>
            <td>\${student['LAB']}</td>
            <td>\${student['SEAT NUMBER']}</td>
        \`;
        scrollingListBody.appendChild(row);
    });

    // Timer functionality
    let seconds = 0;
    function updateTimer() {
        seconds++;
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        document.getElementById('elapsedTime').textContent = 
            \`\${hours.toString().padStart(2, '0')}:\${minutes.toString().padStart(2, '0')}:\${secs.toString().padStart(2, '0')}\`;
    }
    setInterval(updateTimer, 1000);

    // Handle scanning and display student data in the info box
    sNumberInput.addEventListener('input', function (event) {
        if (!isScanningEnabled) return;

        const sNumber = event.target.value.trim();
        if (sNumber.length >= 6) {
            const student = studentsData.find(stud => stud['ID'] === sNumber);
            if (student) {
                // Disable scanning
                isScanningEnabled = false;
                updateStatus('cooldown');
                startCooldownTimer(5);
                sNumberInput.blur();

                dataPlaceholder.style.display = 'none';
                infoBox.innerHTML = '';

                const nameDiv = document.createElement('div');
                const labDiv = document.createElement('div');
                const seatDiv = document.createElement('div');

                nameDiv.innerHTML = "<strong>Name:</strong> <span>" + (student['Name'] || 'N/A') + "</span>";
                labDiv.innerHTML = "<strong>Lab:</strong> <span>" + (student['LAB'] || 'N/A') + "</span>";
                seatDiv.innerHTML = "<strong>Seat:</strong> <span>" + (student['SEAT NUMBER'] || 'N/A') + "</span>";

                infoBox.appendChild(nameDiv);
                infoBox.appendChild(labDiv);
                infoBox.appendChild(seatDiv);

                // Highlight the corresponding row in the table
                const rows = scrollingListBody.querySelectorAll('tr');
                rows.forEach(row => row.classList.remove('highlighted-row'));
                const matchingRow = Array.from(rows).find(row => row.cells[0].textContent === student['Name']);
                if (matchingRow) {
                    matchingRow.classList.add('highlighted-row');
                    matchingRow.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }

                // Clear any existing timeout
                if (scanTimeout) {
                    clearTimeout(scanTimeout);
                }

                // Re-enable scanning and return to placeholder after 5 seconds
                scanTimeout = setTimeout(() => {
                    infoBox.innerHTML = '<span id="dataPlaceholder" class="placeholder">No data scanned yet.</span>';
                    rows.forEach(row => row.classList.remove('highlighted-row'));
                    isScanningEnabled = true;
                    updateStatus('ready');
                    sNumberInput.value = ''; // Clear input
                    sNumberInput.focus();
                }, 5000);
            } else {
                infoBox.innerHTML = '<span style="color:red;">Student not found!</span>';
                updateStatus('unknown');
                setTimeout(() => {
                    infoBox.innerHTML = '<span id="dataPlaceholder" class="placeholder">No data scanned yet.</span>';
                    sNumberInput.value = ''; // Clear input
                    updateStatus('ready');
                }, 3000);
            }
        }
    });

    function updateStatus(status) {
        switch(status) {
            case 'ready':
                statusIndicator.className = 'status-indicator status-ready';
                scanStatus.textContent = 'Ready to Scan';
                scanStatus.style.color = 'var(--status-green)';
                break;
            case 'cooldown':
                statusIndicator.className = 'status-indicator status-cooldown';
                scanStatus.textContent = 'Cooldown';
                scanStatus.style.color = 'var(--status-yellow)';
                break;
            case 'unknown':
                statusIndicator.className = 'status-indicator status-unknown';
                scanStatus.textContent = 'Unknown ID';
                scanStatus.style.color = 'var(--status-red)';
                break;
        }
    }

    function startCooldownTimer(seconds) {
        let timeLeft = seconds;
        updateCooldownTimer(timeLeft);

        if (cooldownInterval) {
            clearInterval(cooldownInterval);
        }

        cooldownInterval = setInterval(() => {
            timeLeft--;
            updateCooldownTimer(timeLeft);

            if (timeLeft <= 0) {
                clearInterval(cooldownInterval);
            }
        }, 1000);
    }

    function updateCooldownTimer(seconds) {
        const timerSpan = document.getElementById('cooldownTimer') || document.createElement('span');
        timerSpan.id = 'cooldownTimer';
        timerSpan.textContent = seconds > 0 ? \` (\${seconds})\` : '';
        scanStatus.appendChild(timerSpan);
    }

    // Initial status update
    updateStatus('ready');

    // Auto-scroll functionality
    let scrollPosition = 0;
    const scrollSpeed = 0.5;

    function scrollList() {
        scrollPosition += scrollSpeed;
        const tableContainer = document.querySelector('.scrolling-table-container');
        if (scrollPosition >= tableContainer.scrollHeight - tableContainer.clientHeight) {
            scrollPosition = 0;
        }
        tableContainer.scrollTop = scrollPosition;
        requestAnimationFrame(scrollList);
    }

    // Start auto-scroll after a short delay
    setTimeout(scrollList, 1000);

    // Pause auto-scroll on hover
    const tableContainer = document.querySelector('.scrolling-table-container');
    tableContainer.addEventListener('mouseenter', () => {
        scrollSpeed = 0;
    });
    tableContainer.addEventListener('mouseleave', () => {
        scrollSpeed = 0.5;
    });
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

    loadSavedData();
    setupPeriodicRefresh();

});

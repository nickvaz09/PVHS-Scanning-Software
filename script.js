document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const loginForm = document.getElementById('loginForm');
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    const loginError = document.getElementById('loginError');
    const appContainer = document.getElementById('appContainer');
    const loginContainer = document.getElementById('loginContainer');
    const sNumberInput = document.getElementById('sNumberInput');
    const fullscreenModal = document.getElementById('fullscreenModal');
    const attendanceTableBody = document.getElementById('attendanceTableBody');
    const downloadExcelBtn = document.getElementById('downloadExcelBtn');
    const filterInput = document.getElementById('filterInput');
    const modeToggleBtn = document.getElementById('modeToggleBtn');
    const revertBtn = document.getElementById('revertBtn');
    const finalizeBtn = document.getElementById('finalizeBtn');
    const fileUpload = document.getElementById('fileUpload');
    const fileNameDisplay = document.querySelector('.file-name');

    // State variables
    let studentsData = JSON.parse(localStorage.getItem('studentsData')) || [];
    let originalData = JSON.parse(localStorage.getItem('originalData')) || [];
    let isCheckOutMode = JSON.parse(localStorage.getItem('isCheckOutMode')) || false;

    // Initialize page
    initializePageWithSavedData();

    // Event Listeners
    loginForm.addEventListener('submit', handleLogin);
    fileUpload.addEventListener('change', handleFileUpload);
    sNumberInput.addEventListener('input', handleSNumberInput);
    modeToggleBtn.addEventListener('click', toggleMode);
    revertBtn.addEventListener('click', revertToOriginalData);
    finalizeBtn.addEventListener('click', finalizeData);
    filterInput.addEventListener('input', filterTable);
    downloadExcelBtn.addEventListener('click', downloadExcel);

    function handleLogin(e) {
        e.preventDefault();
        const username = usernameInput.value;
        const password = passwordInput.value;

        if (username === 'admin' && password === 'sharks') {
            loginContainer.style.display = 'none';
            appContainer.style.display = 'block';
            initializeCheckInMode();
        } else {
            loginForm.classList.add('shake');
            setTimeout(() => loginForm.classList.remove('shake'), 500);
            loginError.style.display = 'block';
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

                    studentsData.forEach(student => {
                        student['Check-In Time'] = 'N/A';
                        student['Check-Out Time'] = 'N/A';
                        student['Total Time'] = 'N/A';
                        student['Attendance'] = 'Absent';
                    });

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

    function handleSNumberInput(event) {
        if (event.target.value.length >= 6) {
            const sNumber = event.target.value.trim();
            processScan(sNumber);
            event.target.value = '';
        }
    }

    function processScan(sNumber) {
        const student = studentsData.find(student => student['ID'] == sNumber);

        if (student) {
            const timeNow = new Date().toLocaleString("en-US", { timeZone: "America/New_York" });

            if (!isCheckOutMode) {
                student['Check-In Time'] = timeNow;
                student['Attendance'] = 'Present';
                showStudentFullscreen(student, timeNow, 'Check-In');
            } else {
                student['Check-Out Time'] = timeNow;
                calculateTotalTime(student);
            }

            saveDataToLocalStorage();
            refreshAttendanceTable(sNumber);
        } else {
            alert('Student not found!');
        }

        sNumberInput.focus();
    }

    function showStudentFullscreen(student, timeNow, actionType) {
        const content = document.getElementById('fullscreenContent');
        content.innerHTML = `
            <h1>${student['Name']}</h1>
            <p class="student-info"><i class="fas fa-flask"></i> Lab: ${student['LAB']}</p>
            <p class="student-info"><i class="fas fa-chair"></i> Seat Number: ${student['SEAT NUMBER']}</p>
            <p class="student-info"><i class="fas fa-clock"></i> ${actionType} Time: ${timeNow}</p>
        `;
        fullscreenModal.style.display = 'flex';
        setTimeout(() => {
            fullscreenModal.style.display = 'none';
            sNumberInput.focus();
        }, 5000);
    }

    function toggleMode() {
        isCheckOutMode = !isCheckOutMode;
        modeToggleBtn.innerText = isCheckOutMode ? 'Switch to Check-In Mode' : 'Switch to Check-Out Mode';

        document.querySelectorAll('.check-out-time, .total-time').forEach(cell => {
            cell.style.display = isCheckOutMode ? '' : 'none';
        });

        saveDataToLocalStorage();
        refreshAttendanceTable();
    }

    function revertToOriginalData() {
        if (confirm('Are you sure you want to revert to the original data? All changes will be lost.')) {
            studentsData = JSON.parse(JSON.stringify(originalData));
    
            studentsData.forEach(student => {
                student['Check-In Time'] = 'N/A';
                student['Check-Out Time'] = 'N/A';
                student['Total Time'] = 'N/A';
                student['Attendance'] = 'Absent';
            });
    
            saveDataToLocalStorage();
            refreshAttendanceTable();
            alert('Data has been reverted to the original state.');
        }
    }

    function finalizeData() {
        const rows = attendanceTableBody.rows;
        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            const student = studentsData[i];
            student['Name'] = row.cells[0].innerText;
            student['LAB'] = row.cells[1].innerText;
            student['SEAT NUMBER'] = row.cells[2].innerText;
            student['Check-In Time'] = row.cells[3].innerText;
            student['Check-Out Time'] = isCheckOutMode ? row.cells[4].innerText : student['Check-Out Time'];
            student['Attendance'] = row.cells[6].innerText;
            calculateTotalTime(student);
        }

        saveDataToLocalStorage();
        alert('Data has been finalized!');
    }

    function refreshAttendanceTable(sNumber = null) {
        attendanceTableBody.innerHTML = '';
    
        if (studentsData.length === 0) {
            const emptyRow = attendanceTableBody.insertRow();
            const emptyCell = emptyRow.insertCell(0);
            emptyCell.colSpan = 8;
            emptyCell.textContent = 'No data available';
            emptyCell.style.textAlign = 'center';
            return;
        }
    
        studentsData.forEach((student, index) => {
            const row = attendanceTableBody.insertRow();
            const isHighlighted = student['ID'] == sNumber;
    
            const fields = ['Name', 'LAB', 'SEAT NUMBER', 'Check-In Time', 'Check-Out Time', 'Total Time', 'Attendance'];
            fields.forEach((field, cellIndex) => {
                const cell = row.insertCell();
                cell.innerText = student[field];
                
                if (cellIndex <= 3 || cellIndex === 6) {
                    cell.contentEditable = 'true';
                    cell.classList.add('editable-cell');
                } else {
                    cell.contentEditable = 'false';
                    cell.classList.add('non-editable-cell');
                }
    
                if (cellIndex === 4 || cellIndex === 5) {
                    cell.classList.add(cellIndex === 4 ? 'check-out-time' : 'total-time');
                    cell.style.display = isCheckOutMode ? '' : 'none';
                }
                if (field === 'Attendance') applyAttendanceColor(cell, student[field]);
            });

            const actionsCell = row.insertCell();
            actionsCell.style.position = 'relative';
            actionsCell.style.padding = '0';
            
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'delete-btn';
            deleteBtn.innerText = 'Delete';
            deleteBtn.style.position = 'absolute';
            deleteBtn.style.width = '100%';
            deleteBtn.style.height = '100%';
            deleteBtn.style.left = '0';
            deleteBtn.style.top = '0';
            deleteBtn.style.zIndex = '1000';
            
            deleteBtn.addEventListener('click', function(e) {
                e.stopPropagation(); 
                if (confirm('Are you sure you want to delete this record?')) {
                    studentsData.splice(index, 1);
                    saveDataToLocalStorage();
                    refreshAttendanceTable();
                }
            });
            
            actionsCell.appendChild(deleteBtn);
    
            if (isHighlighted) {
                row.classList.add('highlighted-row');
                if (isCheckOutMode) row.classList.add('checkout-highlight');
                setTimeout(() => {
                    row.classList.remove('highlighted-row', 'checkout-highlight');
                }, 5000);
            }
    
            // Add event listeners only to editable cells
            row.querySelectorAll('.editable-cell').forEach(cell => {
                cell.addEventListener('input', () => {
                    if (cell.cellIndex === 6) { // Attendance column
                        applyAttendanceColor(cell, cell.innerText.trim());
                    }
                });
                cell.addEventListener('blur', () => {
                    const fieldName = fields[cell.cellIndex];
                    student[fieldName] = cell.innerText.trim();
                    if (fieldName === 'Attendance') {
                        applyAttendanceColor(cell, student[fieldName]);
                    }
                    if (fieldName === 'Check-In Time' || fieldName === 'Check-Out Time') {
                        calculateTotalTime(student);
                        row.cells[5].innerText = student['Total Time'];
                    }
                    saveDataToLocalStorage();
                });
            });
        });
    }

    function filterTable() {
        const query = filterInput.value.toLowerCase().trim();
        const rows = attendanceTableBody.querySelectorAll('tr');

        rows.forEach(row => {
            const text = row.textContent.toLowerCase();
            row.style.display = text.includes(query) ? '' : 'none';
        });
    }

    function calculateTotalTime(student) {
        const checkIn = new Date(student['Check-In Time']);
        const checkOut = new Date(student['Check-Out Time']);
        if (!isNaN(checkIn.getTime()) && !isNaN(checkOut.getTime())) {
            const totalTimeMs = checkOut - checkIn;
            const hours = Math.floor(totalTimeMs / (1000 * 60 * 60));
            const minutes = Math.floor((totalTimeMs % (1000 * 60 * 60)) / (1000 * 60));
            student['Total Time'] = `${hours}h ${minutes}m`;
        } else {
            student['Total Time'] = 'N/A';
        }
    }

    function applyAttendanceColor(cell, value) {
        const lowerCaseValue = (value || '').toLowerCase().trim();
        if (lowerCaseValue === 'present') {
            cell.style.color = 'green';
            cell.style.fontWeight = 'bold';
        } else if (lowerCaseValue === 'absent') {
            cell.style.color = 'red';
            cell.style.fontWeight = 'bold';
        } else {
            cell.style.color = 'black';
            cell.style.fontWeight = 'normal';
        }
    }

    function downloadExcel() {
        const worksheet = XLSX.utils.json_to_sheet(studentsData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Students');
        XLSX.writeFile(workbook, 'Updated_Student_Data.xlsx');
    }

    function saveDataToLocalStorage() {
        localStorage.setItem('studentsData', JSON.stringify(studentsData));
        localStorage.setItem('originalData', JSON.stringify(originalData));
        localStorage.setItem('isCheckOutMode', JSON.stringify(isCheckOutMode));
    }

    function initializePageWithSavedData() {
        if (studentsData.length > 0) {
            refreshAttendanceTable();
        }
        if (isCheckOutMode) {
            modeToggleBtn.click(); // This will trigger the mode change and update the UI
        }
    }

    function initializeCheckInMode() {
        document.querySelectorAll('.check-out-time, .total-time').forEach(cell => cell.style.display = 'none');
        modeToggleBtn.innerText = 'Switch to Check-Out Mode';
        isCheckOutMode = false;
        saveDataToLocalStorage();
    }

    window.addEventListener('beforeunload', saveDataToLocalStorage);

    sNumberInput.focus();
});

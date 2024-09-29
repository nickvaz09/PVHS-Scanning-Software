document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    const loginError = document.getElementById('loginError');
    const appContainer = document.getElementById('appContainer');
    const loginContainer = document.getElementById('loginContainer');

    const sNumberInput = document.getElementById('sNumberInput');
    const attendanceTableBody = document.getElementById('attendanceTableBody');
    const filterInput = document.getElementById('filterInput');
    const modeToggleBtn = document.getElementById('modeToggleBtn');
    const revertBtn = document.getElementById('revertBtn');
    const finalizeBtn = document.getElementById('finalizeBtn');
    let isCheckOutMode = false;

    let studentsData = [];
    let originalData = [];

    // Load data from localStorage 
    function loadSavedTable() {
        const savedData = localStorage.getItem('studentsData');
        if (savedData) {
            studentsData = JSON.parse(savedData);
            refreshAttendanceTable(); 
        }
    }

    // Save the current live table to localStorage
    function saveLiveTable() {
        localStorage.setItem('studentsData', JSON.stringify(studentsData));
    }

    // Initialize Check-In mode by default
    function initializeCheckInMode() {
        document.querySelectorAll('.check-out-time, .total-time').forEach(cell => cell.style.display = 'none');
        modeToggleBtn.innerText = 'Switch to Check-Out Mode';
        isCheckOutMode = false;
    }

    // Handle login
    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const username = usernameInput.value.trim();
        const password = passwordInput.value.trim();

        if (username === "admin" && password === "sharks") {
            loginError.style.display = 'none';
            loginContainer.style.display = 'none';
            appContainer.style.display = 'block';
            initializeCheckInMode();
            loadSavedTable();  // Load the saved table 
        } else {
            loginError.style.display = 'block';
            loginError.textContent = "Invalid username or password";
        }
    });

    // Handle Excel file upload
    const fileUpload = document.getElementById('fileUpload');
    fileUpload.addEventListener('change', handleFileUpload);

    function handleFileUpload(event) {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function (e) {
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

                refreshAttendanceTable();
                alert('Student data successfully uploaded and ready for scanning!');
                saveLiveTable();  
            };
            reader.readAsArrayBuffer(file);
        } else {
            alert('No file selected or file error');
        }
    }

    // Process S number scan
    sNumberInput.addEventListener('input', function (event) {
        if (event.target.value.length >= 6) {
            const sNumber = event.target.value.trim();
            processScan(sNumber);
            sNumberInput.value = '';
        }
    });

    // Process scan and handle Check-In/Check-Out
    function processScan(sNumber) {
        const student = studentsData.find(student => student['ID'] == sNumber);

        if (student) {
            const timeNow = new Date().toLocaleString("en-US", { timeZone: "America/New_York" });

            if (!isCheckOutMode) {
                student['Check-In Time'] = timeNow;
                student['Attendance'] = 'Present';
            } else {
                student['Check-Out Time'] = timeNow;
                calculateTotalTime(student); 
            }

            refreshAttendanceTable(sNumber);
            saveLiveTable();  
        } else {
            alert('Student not found!');
        }

        sNumberInput.focus();
    }

    // Toggle between Check-In and Check-Out modes
    modeToggleBtn.addEventListener('click', function () {
        isCheckOutMode = !isCheckOutMode;
        modeToggleBtn.innerText = isCheckOutMode ? 'Switch to Check-In Mode' : 'Switch to Check-Out Mode';
        toggleCheckOutMode();
        refreshAttendanceTable();
        saveLiveTable();  
    });

    function toggleCheckOutMode() {
        if (isCheckOutMode) {
            document.querySelectorAll('.check-out-time, .total-time').forEach(cell => cell.style.display = '');
        } else {
            document.querySelectorAll('.check-out-time, .total-time').forEach(cell => cell.style.display = 'none');
        }
    }

    // Revert to original data
    revertBtn.addEventListener('click', function () {
        studentsData = JSON.parse(JSON.stringify(originalData)); 
        refreshAttendanceTable();
        saveLiveTable();  
        alert('Changes have been reverted to the original data.');
    });

    // Finalize data
    finalizeBtn.addEventListener('click', function () {
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

        saveLiveTable();  // Save the finalized data to localStorage
        alert('Data has been finalized!');
    });

    // Calculate total time based on Check-In and Check-Out
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

    // Filter functionality
    filterInput.addEventListener('input', function () {
        const query = filterInput.value.toLowerCase().trim();
        refreshAttendanceTable(null, query);
    });

    // Refresh attendance table
    function refreshAttendanceTable(sNumber = null, filterQuery = '') {
        attendanceTableBody.innerHTML = '';

        studentsData.forEach((student, index) => {
            const row = attendanceTableBody.insertRow();
            const isHighlighted = student['ID'] == sNumber;

            const matchesFilter =
                student['Name'].toLowerCase().includes(filterQuery) ||
                student['ID'].toLowerCase().includes(filterQuery) ||
                student['LAB'].toString().includes(filterQuery) ||
                student['SEAT NUMBER'].toString().includes(filterQuery);

            if (!matchesFilter) {
                return;
            }

            const nameCell = row.insertCell(0);
            nameCell.contentEditable = true;
            nameCell.innerText = student['Name'];

            const labCell = row.insertCell(1);
            labCell.contentEditable = true;
            labCell.innerText = student['LAB'];

            const seatCell = row.insertCell(2);
            seatCell.contentEditable = true;
            seatCell.innerText = student['SEAT NUMBER'];

            const checkInCell = row.insertCell(3);
            checkInCell.contentEditable = true;
            checkInCell.innerText = student['Check-In Time'];

            const checkOutCell = row.insertCell(4);
            checkOutCell.classList.add('check-out-time');
            checkOutCell.contentEditable = true;
            checkOutCell.innerText = student['Check-Out Time'];
            checkOutCell.style.display = isCheckOutMode ? '' : 'none';

            const totalTimeCell = row.insertCell(5);
            totalTimeCell.classList.add('total-time');
            totalTimeCell.innerText = student['Total Time'];
            totalTimeCell.style.display = isCheckOutMode ? '' : 'none';

            const attendanceCell = row.insertCell(6);
            attendanceCell.contentEditable = true;
            attendanceCell.innerText = student['Attendance'] || 'Absent'; 
            applyAttendanceColor(attendanceCell, student['Attendance'] || 'Absent');

            attendanceCell.addEventListener('input', function () {
                const value = attendanceCell.innerText.trim();
                applyAttendanceColor(attendanceCell, value);
                student['Attendance'] = value;
                saveLiveTable(); 
            });

            const deleteCell = row.insertCell(7);
            const deleteBtn = document.createElement('button');
            deleteBtn.innerText = 'Delete';
            deleteBtn.addEventListener('click', () => {
                studentsData.splice(index, 1);
                refreshAttendanceTable();
                saveLiveTable();  
            });
            deleteCell.appendChild(deleteBtn);

            if (isHighlighted) {
                row.classList.add('highlighted-row');
                setTimeout(() => row.classList.remove('highlighted-row'), 5000);
            }
        });
    }

    function applyAttendanceColor(cell, value) {
        if (value.toLowerCase() === 'present') {
            cell.style.color = 'green';
            cell.style.fontWeight = 'bold';
        } else if (value.toLowerCase() === 'absent') {
            cell.style.color = 'red';
            cell.style.fontWeight = 'bold';
        } else {
            cell.style.color = 'black';
            cell.style.fontWeight = 'normal';
        }
    }
});

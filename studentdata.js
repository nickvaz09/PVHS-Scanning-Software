// Function to load Excel data from localStorage
function loadExcelData() {
    const excelData = localStorage.getItem('excelData');
    if (excelData) {
        return JSON.parse(excelData);
    }
    return null;
}

// Function to find student by ID
function findStudentById(id, data) {
    return data.find(student => student['ID'].toString() === id);
}

// Function to display student data
function displayStudentData(student) {
    const tableBody = document.getElementById('tableBody');
    tableBody.innerHTML = '';
    const row = document.createElement('tr');
    row.innerHTML = `
        <td>${student['Name']}</td>
        <td>${student['LAB']}</td>
        <td>${student['SEAT NUMBER']}</td>
    `;
    tableBody.appendChild(row);
}

// Function to handle login
function handleLogin() {
    const sNumber = document.getElementById('sNumber').value.trim();
    if (sNumber) {
        const data = loadExcelData();
        if (data) {
            const student = findStudentById(sNumber, data);
            if (student) {
                displayStudentData(student);
                document.getElementById('loginForm').style.display = 'none';
                document.getElementById('studentDataDisplay').style.display = 'block';
                // Store the current student's full data in sessionStorage
                sessionStorage.setItem('currentStudent', JSON.stringify(student));
            } else {
                shakeElement(document.getElementById('sNumber'));
                showError('Student not found. Please check your Student ID.');
            }
        } else {
            showError('Error loading student data. Please ensure data has been uploaded by your administrator.');
        }
    } else {
        shakeElement(document.getElementById('sNumber'));
        showError('Please enter your Student ID.');
    }
}

// Function to handle logout
function handleLogout() {
    document.getElementById('studentDataDisplay').style.display = 'none';
    document.getElementById('loginForm').style.display = 'block';
    document.getElementById('sNumber').value = '';
    // Clear the current student's ID from sessionStorage
    sessionStorage.removeItem('currentStudentId');
}

// Function to show error messages
function showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.textContent = message;
    errorDiv.style.color = '#e74c3c';
    errorDiv.style.marginTop = '10px';
    errorDiv.style.textAlign = 'center';
    document.querySelector('.login-container').appendChild(errorDiv);
    setTimeout(() => {
        errorDiv.remove();
    }, 3000);
}

// Function to add shake animation
function shakeElement(element) {
    element.classList.add('shake');
    setTimeout(() => {
        element.classList.remove('shake');
    }, 500);
}

// Function to open digital pass
function openDigitalPass() {
    const studentJson = sessionStorage.getItem('currentStudent');
    if (studentJson) {
        const student = JSON.parse(studentJson);
        const passUrl = `digitalpass.html?name=${encodeURIComponent(student.Name)}&id=${encodeURIComponent(student.ID)}&lab=${encodeURIComponent(student.LAB)}&seat=${encodeURIComponent(student['SEAT NUMBER'])}`;
        window.open(passUrl, '_blank');
    } else {
        showError('Error loading student data. Please try logging in again.');
    }
}

function handleLogin() {
    const sNumber = document.getElementById('sNumber').value.trim();
    if (sNumber) {
        const data = loadExcelData();
        if (data) {
            const student = findStudentById(sNumber, data);
            if (student) {
                displayStudentData(student);
                document.getElementById('loginForm').style.display = 'none';
                document.getElementById('studentDataDisplay').style.display = 'block';
                // Store the current student's full data in sessionStorage
                sessionStorage.setItem('currentStudent', JSON.stringify(student));
            } else {
                shakeElement(document.getElementById('sNumber'));
                showError('Student not found. Please check your Student ID.');
            }
        } else {
            showError('Error loading student data. Please ensure data has been uploaded by your administrator.');
        }
    } else {
        shakeElement(document.getElementById('sNumber'));
        showError('Please enter your Student ID.');
    }
}

// Event Listeners
document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('loginForm').style.display = 'block';
    document.getElementById('loginButton').addEventListener('click', handleLogin);
    document.getElementById('sNumber').addEventListener('keypress', function(event) {
        if (event.key === 'Enter') {
            event.preventDefault();
            handleLogin();
        }
    });
    document.getElementById('logoutButton').addEventListener('click', handleLogout);
    document.getElementById('viewPassBtn').addEventListener('click', openDigitalPass);

    // Check if a student was already logged in
    const currentStudentId = sessionStorage.getItem('currentStudentId');
    if (currentStudentId) {
        document.getElementById('sNumber').value = currentStudentId;
        handleLogin();
    }

    // Debug: Log the contents of localStorage
    console.log('localStorage contents:', localStorage.getItem('excelData'));
});
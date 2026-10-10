console.log("Employee CRUD System Started");

// =====================================================
// GLOBAL VARIABLES
// =====================================================

let editingEmployeeId = null;
let oldProfilePhoto = "";


// =====================================================
// MESSAGE FUNCTION
// =====================================================

function showMessage(message, type = "success") {

    const messageBox =
        document.getElementById("message");

    messageBox.textContent = message;

    if (type === "error") {

        messageBox.style.color = "red";

    } else {

        messageBox.style.color = "green";

    }
}


// =====================================================
// CLEAR FORM
// =====================================================

function clearForm() {

    document
        .getElementById("employeeForm")
        .reset();

    editingEmployeeId = null;

    oldProfilePhoto = "";

    // Enable Employee ID
    document
        .getElementById("employeeId")
        .disabled = false;

    // Show Add button
    document
        .getElementById("addBtn")
        .style.display = "inline-block";

    // Hide Update button
    document
        .getElementById("updateBtn")
        .style.display = "none";
}


// =====================================================
// CONVERT IMAGE TO BASE64
// =====================================================

function convertImageToBase64(file) {

    return new Promise(function(resolve, reject) {

        const reader =
            new FileReader();

        reader.onload = function() {

            resolve(reader.result);

        };

        reader.onerror = function() {

            reject(
                new Error(
                    "Unable to read image"
                )
            );

        };

        reader.readAsDataURL(file);

    });
}


// =====================================================
// ADD EMPLOYEE
// =====================================================

document
    .getElementById("employeeForm")
    .addEventListener(
        "submit",
        async function(event) {

            event.preventDefault();

            // If editing, do update instead
            if (editingEmployeeId !== null) {

                await updateEmployee();

                return;
            }


            try {

                console.log(
                    "Adding new employee..."
                );


                // -----------------------------------------
                // PROFILE PHOTO
                // -----------------------------------------

                const photoInput =
                    document.getElementById(
                        "profilePhoto"
                    );

                let profilePhoto = "";


                if (
                    photoInput.files &&
                    photoInput.files.length > 0
                ) {

                    profilePhoto =
                        await convertImageToBase64(
                            photoInput.files[0]
                        );

                }


                // -----------------------------------------
                // CREATE EMPLOYEE OBJECT
                // -----------------------------------------

                const employee = {

                    employeeName:
                        document
                            .getElementById(
                                "employeeName"
                            )
                            .value
                            .trim(),

                    employeeId:
                        document
                            .getElementById(
                                "employeeId"
                            )
                            .value
                            .trim(),

                    email:
                        document
                            .getElementById(
                                "email"
                            )
                            .value
                            .trim(),

                    mobile:
                        document
                            .getElementById(
                                "mobile"
                            )
                            .value
                            .trim(),

                    password:
                        document
                            .getElementById(
                                "password"
                            )
                            .value,

                    confirmPassword:
                        document
                            .getElementById(
                                "confirmPassword"
                            )
                            .value,

                    gender:
                        document
                            .getElementById(
                                "gender"
                            )
                            .value,

                    dateOfBirth:
                        document
                            .getElementById(
                                "dateOfBirth"
                            )
                            .value,

                    department:
                        document
                            .getElementById(
                                "department"
                            )
                            .value,

                    designation:
                        document
                            .getElementById(
                                "designation"
                            )
                            .value
                            .trim(),

                    dateOfJoining:
                        document
                            .getElementById(
                                "dateOfJoining"
                            )
                            .value,

                    employmentType:
                        document
                            .getElementById(
                                "employmentType"
                            )
                            .value,

                    profilePhoto:
                        profilePhoto

                };


                console.log(
                    "Employee data:",
                    employee
                );


                // -----------------------------------------
                // SEND TO SERVER
                // -----------------------------------------

                const response =
                    await fetch(
                        "/api/employees",
                        {

                            method: "POST",

                            headers: {
                                "Content-Type":
                                    "application/json"
                            },

                            body:
                                JSON.stringify(
                                    employee
                                )

                        }
                    );


                const data =
                    await response.json();


                console.log(
                    "ADD RESPONSE:",
                    data
                );


                // -----------------------------------------
                // ERROR
                // -----------------------------------------

                if (!response.ok) {

                    showMessage(
                        data.message ||
                        "Unable to add employee.",
                        "error"
                    );

                    return;
                }


                // -----------------------------------------
                // SUCCESS
                // -----------------------------------------

                showMessage(
                    "Employee added successfully!"
                );


                clearForm();

                await showAllEmployees();


            } catch (error) {

                console.error(
                    "ADD ERROR:",
                    error
                );

                showMessage(
                    "Unable to add employee.",
                    "error"
                );

            }

        }
    );


// =====================================================
// SHOW ALL BUTTON
// =====================================================

document
    .getElementById("showBtn")
    .addEventListener(
        "click",
        function() {

            showAllEmployees();

        }
    );


// =====================================================
// SHOW ALL EMPLOYEES
// =====================================================

async function showAllEmployees() {

    try {

        console.log(
            "Loading all employees..."
        );


        const response =
            await fetch(
                "/api/employees"
            );


        const data =
            await response.json();


        console.log(
            "EMPLOYEES:",
            data
        );


        if (!response.ok) {

            showMessage(
                data.message ||
                "Unable to load employees.",
                "error"
            );

            return;
        }


        const employees =
            data.employees;


        const output =
            document.getElementById(
                "output"
            );


        output.innerHTML = "";


        // No employees
        if (
            !employees ||
            employees.length === 0
        ) {

            output.innerHTML =
                "<p>No employees found.</p>";

            return;
        }


        // -----------------------------------------
        // DISPLAY EMPLOYEES
        // -----------------------------------------

        employees.forEach(
            function(employee) {

                const employeeDiv =
                    document.createElement(
                        "div"
                    );


                employeeDiv.className =
                    "employee";


                // -----------------------------------------
                // PROFILE PHOTO
                // -----------------------------------------

                let photoHTML = "";


                if (
                    employee.profilePhoto &&
                    employee.profilePhoto
                        .startsWith(
                            "data:image"
                        )
                ) {

                    photoHTML = `
                        <img
                            src="${employee.profilePhoto}"
                            class="employee-photo"
                            alt="Employee Photo"
                        >
                    `;

                } else {

                    photoHTML = `
                        <p>
                            <strong>
                                Profile Photo:
                            </strong>
                            Not available
                        </p>
                    `;

                }


                // -----------------------------------------
                // EMPLOYEE DATA
                // -----------------------------------------

                employeeDiv.innerHTML = `

                    ${photoHTML}

                    <h3>
                        ${employee.employeeName}
                    </h3>

                    <p>
                        <strong>
                            Employee ID:
                        </strong>
                        ${employee.employeeId}
                    </p>

                    <p>
                        <strong>
                            Email:
                        </strong>
                        ${employee.email}
                    </p>

                    <p>
                        <strong>
                            Mobile:
                        </strong>
                        ${employee.mobile}
                    </p>

                    <p>
                        <strong>
                            Gender:
                        </strong>
                        ${employee.gender}
                    </p>

                    <p>
                        <strong>
                            Date of Birth:
                        </strong>
                        ${employee.dateOfBirth}
                    </p>

                    <p>
                        <strong>
                            Department:
                        </strong>
                        ${employee.department}
                    </p>

                    <p>
                        <strong>
                            Designation:
                        </strong>
                        ${employee.designation}
                    </p>

                    <p>
                        <strong>
                            Date of Joining:
                        </strong>
                        ${employee.dateOfJoining}
                    </p>

                    <p>
                        <strong>
                            Employment Type:
                        </strong>
                        ${employee.employmentType}
                    </p>

                    <button
                        type="button"
                        class="update-button"
                        onclick="startUpdate('${employee.employeeId}')"
                    >
                        Update
                    </button>

                    <button
                        type="button"
                        class="delete-button"
                        onclick="deleteEmployee('${employee.employeeId}')"
                    >
                        Delete
                    </button>

                `;


                output.appendChild(
                    employeeDiv
                );

            }
        );


    } catch (error) {

        console.error(
            "SHOW ALL ERROR:",
            error
        );

        showMessage(
            "Unable to load employee data.",
            "error"
        );

    }
}


// =====================================================
// START UPDATE
// =====================================================

async function startUpdate(employeeId) {

    console.log(
        "Update clicked for:",
        employeeId
    );


    try {

        // -----------------------------------------
        // GET ONE EMPLOYEE
        // -----------------------------------------

        const response =
            await fetch(
                "/api/employees/" +
                encodeURIComponent(
                    employeeId
                )
            );


        console.log(
            "GET EMPLOYEE STATUS:",
            response.status
        );


        const text =
            await response.text();


        console.log(
            "GET EMPLOYEE RESPONSE:",
            text
        );


        let data;


        try {

            data =
                JSON.parse(text);

        } catch (error) {

            console.error(
                "Invalid server response:",
                text
            );

            showMessage(
                "Server returned invalid data. Please restart server.js.",
                "error"
            );

            return;
        }


        // -----------------------------------------
        // SERVER ERROR
        // -----------------------------------------

        if (!response.ok) {

            showMessage(
                data.message ||
                "Employee not found.",
                "error"
            );

            return;
        }


        // -----------------------------------------
        // GET EMPLOYEE
        // -----------------------------------------

        const employee =
            data.employee;


        console.log(
            "Employee loaded:",
            employee
        );


        // -----------------------------------------
        // FILL FORM
        // -----------------------------------------

        document
            .getElementById(
                "employeeName"
            )
            .value =
                employee.employeeName || "";


        document
            .getElementById(
                "employeeId"
            )
            .value =
                employee.employeeId || "";


        document
            .getElementById(
                "email"
            )
            .value =
                employee.email || "";


        document
            .getElementById(
                "mobile"
            )
            .value =
                employee.mobile || "";


        document
            .getElementById(
                "password"
            )
            .value =
                employee.password || "";


        document
            .getElementById(
                "confirmPassword"
            )
            .value =
                employee.confirmPassword || "";


        document
            .getElementById(
                "gender"
            )
            .value =
                employee.gender || "";


        document
            .getElementById(
                "dateOfBirth"
            )
            .value =
                employee.dateOfBirth || "";


        document
            .getElementById(
                "department"
            )
            .value =
                employee.department || "";


        document
            .getElementById(
                "designation"
            )
            .value =
                employee.designation || "";


        document
            .getElementById(
                "dateOfJoining"
            )
            .value =
                employee.dateOfJoining || "";


        document
            .getElementById(
                "employmentType"
            )
            .value =
                employee.employmentType || "";


        // -----------------------------------------
        // SAVE OLD PHOTO
        // -----------------------------------------

        oldProfilePhoto =
            employee.profilePhoto || "";


        // -----------------------------------------
        // SAVE EDITING EMPLOYEE ID
        // -----------------------------------------

        editingEmployeeId =
            employee.employeeId;


        // -----------------------------------------
        // CHANGE BUTTONS
        // -----------------------------------------

        document
            .getElementById(
                "addBtn"
            )
            .style.display =
                "none";


        document
            .getElementById(
                "updateBtn"
            )
            .style.display =
                "inline-block";


        // Disable Employee ID
        document
            .getElementById(
                "employeeId"
            )
            .disabled =
                true;


        showMessage(
            "Editing " +
            employee.employeeId
        );


        // Scroll to top
        window.scrollTo({
            top: 0,
            behavior: "smooth"
        });


    } catch (error) {

        console.error(
            "START UPDATE ERROR:",
            error
        );

        showMessage(
            "Unable to load employee. Check server.js.",
            "error"
        );

    }
}


// =====================================================
// UPDATE BUTTON
// =====================================================

document
    .getElementById("updateBtn")
    .addEventListener(
        "click",
        updateEmployee
    );


// =====================================================
// UPDATE EMPLOYEE
// =====================================================

async function updateEmployee() {

    // No employee selected
    if (
        editingEmployeeId === null
    ) {

        showMessage(
            "Please select an employee to update.",
            "error"
        );

        return;
    }


    try {

        console.log(
            "Updating:",
            editingEmployeeId
        );


        // -----------------------------------------
        // PROFILE PHOTO
        // -----------------------------------------

        const photoInput =
            document.getElementById(
                "profilePhoto"
            );


        let profilePhoto =
            oldProfilePhoto;


        // If user selected a new photo
        if (
            photoInput.files &&
            photoInput.files.length > 0
        ) {

            profilePhoto =
                await convertImageToBase64(
                    photoInput.files[0]
                );

        }


        // -----------------------------------------
        // CREATE UPDATED EMPLOYEE
        // -----------------------------------------

        const employee = {

            employeeName:
                document
                    .getElementById(
                        "employeeName"
                    )
                    .value
                    .trim(),

            employeeId:
                editingEmployeeId,

            email:
                document
                    .getElementById(
                        "email"
                    )
                    .value
                    .trim(),

            mobile:
                document
                    .getElementById(
                        "mobile"
                    )
                    .value
                    .trim(),

            password:
                document
                    .getElementById(
                        "password"
                    )
                    .value,

            confirmPassword:
                document
                    .getElementById(
                        "confirmPassword"
                    )
                    .value,

            gender:
                document
                    .getElementById(
                        "gender"
                    )
                    .value,

            dateOfBirth:
                document
                    .getElementById(
                        "dateOfBirth"
                    )
                    .value,

            department:
                document
                    .getElementById(
                        "department"
                    )
                    .value,

            designation:
                document
                    .getElementById(
                        "designation"
                    )
                    .value
                    .trim(),

            dateOfJoining:
                document
                    .getElementById(
                        "dateOfJoining"
                    )
                    .value,

            employmentType:
                document
                    .getElementById(
                        "employmentType"
                    )
                    .value,

            profilePhoto:
                profilePhoto

        };


        console.log(
            "UPDATED EMPLOYEE DATA:",
            employee
        );


        // -----------------------------------------
        // SEND PUT REQUEST
        // -----------------------------------------

        const response =
            await fetch(
                "/api/employees/" +
                encodeURIComponent(
                    editingEmployeeId
                ),
                {

                    method: "PUT",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body:
                        JSON.stringify(
                            employee
                        )

                }
            );


        const data =
            await response.json();


        console.log(
            "UPDATE RESPONSE:",
            data
        );


        // -----------------------------------------
        // ERROR
        // -----------------------------------------

        if (!response.ok) {

            showMessage(
                data.message ||
                "Unable to update employee.",
                "error"
            );

            return;
        }


        // -----------------------------------------
        // SUCCESS
        // -----------------------------------------

        showMessage(
            "Employee updated successfully!"
        );


        // Clear editing mode
        clearForm();


        // Reload employees
        await showAllEmployees();


    } catch (error) {

        console.error(
            "UPDATE ERROR:",
            error
        );

        showMessage(
            "Unable to update employee.",
            "error"
        );

    }
}


// =====================================================
// DELETE EMPLOYEE
// =====================================================

async function deleteEmployee(employeeId) {

    const confirmDelete =
        confirm(
            "Are you sure you want to delete Employee " +
            employeeId +
            "?"
        );


    if (!confirmDelete) {

        return;
    }


    try {

        console.log(
            "Deleting employee:",
            employeeId
        );


        const response =
            await fetch(
                "/api/employees/" +
                encodeURIComponent(
                    employeeId
                ),
                {

                    method: "DELETE"

                }
            );


        const data =
            await response.json();


        console.log(
            "DELETE RESPONSE:",
            data
        );


        if (!response.ok) {

            showMessage(
                data.message ||
                "Unable to delete employee.",
                "error"
            );

            return;
        }


        showMessage(
            "Employee deleted successfully!"
        );


        // If deleted employee was being edited
        if (
            editingEmployeeId ===
            employeeId
        ) {

            clearForm();

        }


        // Reload data
        await showAllEmployees();


    } catch (error) {

        console.error(
            "DELETE ERROR:",
            error
        );

        showMessage(
            "Unable to delete employee.",
            "error"
        );

    }
}


// =====================================================
// CLEAR BUTTON
// =====================================================

document
    .getElementById("clearBtn")
    .addEventListener(
        "click",
        function() {

            clearForm();

            showMessage("");

        }
    );


// =====================================================
// LOAD EMPLOYEES WHEN PAGE OPENS
// =====================================================

showAllEmployees();
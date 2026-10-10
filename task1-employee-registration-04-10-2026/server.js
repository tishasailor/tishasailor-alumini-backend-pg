const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = 3000;

const DATA_FILE = path.join(__dirname, "employees.json");

// =====================================================
// MIDDLEWARE
// =====================================================

app.use(
    express.json({
        limit: "15mb"
    })
);

app.use(
    express.urlencoded({
        extended: true,
        limit: "15mb"
    })
);

// Serve index.html, script.js, employees.json, etc.
app.use(express.static(__dirname));


// =====================================================
// READ EMPLOYEES FROM employees.json
// =====================================================

function readEmployees() {

    try {

        // If file does not exist, create it
        if (!fs.existsSync(DATA_FILE)) {

            fs.writeFileSync(
                DATA_FILE,
                "[]",
                "utf8"
            );
        }

        const data = fs.readFileSync(
            DATA_FILE,
            "utf8"
        );

        // Empty file
        if (!data.trim()) {
            return [];
        }

        const employees = JSON.parse(data);

        // Make sure JSON contains an array
        if (!Array.isArray(employees)) {

            throw new Error(
                "employees.json must contain an array"
            );
        }

        return employees;

    } catch (error) {

        console.error(
            "ERROR READING employees.json:",
            error
        );

        throw error;
    }
}


// =====================================================
// WRITE EMPLOYEES TO employees.json
// =====================================================

function writeEmployees(employees) {

    try {

        fs.writeFileSync(
            DATA_FILE,
            JSON.stringify(
                employees,
                null,
                2
            ),
            "utf8"
        );

        console.log(
            "employees.json updated successfully"
        );

    } catch (error) {

        console.error(
            "ERROR WRITING employees.json:",
            error
        );

        throw error;
    }
}


// =====================================================
// VALIDATE EMPLOYEE
// =====================================================

function validateEmployee(employee) {

    const requiredFields = [
        "employeeName",
        "employeeId",
        "email",
        "mobile",
        "password",
        "confirmPassword",
        "gender",
        "dateOfBirth",
        "department",
        "designation",
        "dateOfJoining",
        "employmentType"
    ];

    // Check required fields
    for (const field of requiredFields) {

        if (
            employee[field] === undefined ||
            employee[field] === null ||
            String(employee[field]).trim() === ""
        ) {

            return field + " is required";
        }
    }


    // Employee ID validation
    if (
        !/^[A-Za-z0-9_-]+$/.test(
            employee.employeeId
        )
    ) {

        return "Employee ID can contain only letters, numbers, hyphen and underscore";
    }


    // Email validation
    const emailPattern =
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (
        !emailPattern.test(
            employee.email
        )
    ) {

        return "Please enter a valid email address";
    }


    // Mobile validation
    if (
        !/^[0-9]{10}$/.test(
            employee.mobile
        )
    ) {

        return "Mobile number must contain exactly 10 digits";
    }


    // Password validation
    if (
        employee.password !==
        employee.confirmPassword
    ) {

        return "Password and Confirm Password do not match";
    }


    return null;
}


// =====================================================
// HOME PAGE
// =====================================================

app.get("/", function(req, res) {

    res.sendFile(
        path.join(
            __dirname,
            "index.html"
        )
    );

});


// =====================================================
// GET ALL EMPLOYEES
// =====================================================

app.get(
    "/api/employees",
    function(req, res) {

        try {

            const employees =
                readEmployees();

            res.json({
                success: true,
                employees: employees
            });

        } catch (error) {

            console.error(
                "GET ALL ERROR:",
                error
            );

            res.status(500).json({
                success: false,
                message:
                    "Unable to read employee data"
            });

        }

    }
);


// =====================================================
// GET ONE EMPLOYEE BY EMPLOYEE ID
// =====================================================

app.get(
    "/api/employees/:id",
    function(req, res) {

        try {

            const employeeId =
                decodeURIComponent(
                    req.params.id
                ).trim();

            console.log(
                "--------------------------------------"
            );

            console.log(
                "GET EMPLOYEE REQUEST"
            );

            console.log(
                "Employee ID:",
                employeeId
            );


            // Read employees
            const employees =
                readEmployees();


            // Find employee
            const employee =
                employees.find(
                    function(emp) {

                        return (
                            String(
                                emp.employeeId
                            )
                            .trim()
                            .toLowerCase()
                            ===
                            employeeId
                                .toLowerCase()
                        );

                    }
                );


            // Employee not found
            if (!employee) {

                console.log(
                    "Employee NOT FOUND"
                );

                return res.status(404).json({
                    success: false,
                    message:
                        "Employee not found"
                });

            }


            // Employee found
            console.log(
                "Employee FOUND:",
                employee.employeeId
            );

            console.log(
                "--------------------------------------"
            );


            res.json({
                success: true,
                employee: employee
            });

        } catch (error) {

            console.error(
                "GET EMPLOYEE ERROR:",
                error
            );

            res.status(500).json({
                success: false,
                message:
                    "Unable to load employee"
            });

        }

    }
);


// =====================================================
// ADD EMPLOYEE
// =====================================================

app.post(
    "/api/employees",
    function(req, res) {

        try {

            console.log(
                "--------------------------------------"
            );

            console.log(
                "ADD EMPLOYEE REQUEST"
            );


            const employee =
                req.body;


            // Validate
            const validationError =
                validateEmployee(
                    employee
                );

            if (validationError) {

                return res.status(400).json({
                    success: false,
                    message:
                        validationError
                });

            }


            // Read existing employees
            const employees =
                readEmployees();


            // Check duplicate Employee ID
            const duplicateId =
                employees.some(
                    function(emp) {

                        return (
                            String(
                                emp.employeeId
                            )
                            .trim()
                            .toLowerCase()
                            ===
                            String(
                                employee.employeeId
                            )
                            .trim()
                            .toLowerCase()
                        );

                    }
                );


            if (duplicateId) {

                return res.status(409).json({
                    success: false,
                    message:
                        "Employee ID already exists"
                });

            }


            // Check duplicate Email
            const duplicateEmail =
                employees.some(
                    function(emp) {

                        return (
                            String(
                                emp.email
                            )
                            .trim()
                            .toLowerCase()
                            ===
                            String(
                                employee.email
                            )
                            .trim()
                            .toLowerCase()
                        );

                    }
                );


            if (duplicateEmail) {

                return res.status(409).json({
                    success: false,
                    message:
                        "Email address already exists"
                });

            }


            // Clean data
            employee.employeeName =
                String(
                    employee.employeeName
                ).trim();

            employee.employeeId =
                String(
                    employee.employeeId
                ).trim();

            employee.email =
                String(
                    employee.email
                )
                .trim()
                .toLowerCase();

            employee.mobile =
                String(
                    employee.mobile
                ).trim();

            employee.gender =
                String(
                    employee.gender
                ).trim();

            employee.dateOfBirth =
                String(
                    employee.dateOfBirth
                ).trim();

            employee.department =
                String(
                    employee.department
                ).trim();

            employee.designation =
                String(
                    employee.designation
                ).trim();

            employee.dateOfJoining =
                String(
                    employee.dateOfJoining
                ).trim();

            employee.employmentType =
                String(
                    employee.employmentType
                ).trim();


            // Add employee to array
            employees.push(employee);


            // Save to JSON
            writeEmployees(
                employees
            );


            console.log(
                "Employee added:",
                employee.employeeId
            );

            console.log(
                "--------------------------------------"
            );


            res.status(201).json({
                success: true,
                message:
                    "Employee added successfully",
                employee: employee
            });

        } catch (error) {

            console.error(
                "ADD EMPLOYEE ERROR:",
                error
            );

            res.status(500).json({
                success: false,
                message:
                    "Something went wrong while adding employee"
            });

        }

    }
);


// =====================================================
// UPDATE EMPLOYEE
// =====================================================

app.put(
    "/api/employees/:id",
    function(req, res) {

        try {

            const oldEmployeeId =
                decodeURIComponent(
                    req.params.id
                ).trim();


            const updatedEmployee =
                req.body;


            console.log(
                "--------------------------------------"
            );

            console.log(
                "UPDATE EMPLOYEE REQUEST"
            );

            console.log(
                "Employee ID:",
                oldEmployeeId
            );


            // Validate
            const validationError =
                validateEmployee(
                    updatedEmployee
                );

            if (validationError) {

                return res.status(400).json({
                    success: false,
                    message:
                        validationError
                });

            }


            // Read employees
            const employees =
                readEmployees();


            // Find employee index
            const employeeIndex =
                employees.findIndex(
                    function(emp) {

                        return (
                            String(
                                emp.employeeId
                            )
                            .trim()
                            .toLowerCase()
                            ===
                            oldEmployeeId
                                .toLowerCase()
                        );

                    }
                );


            // Employee not found
            if (employeeIndex === -1) {

                console.log(
                    "Employee not found for update"
                );

                return res.status(404).json({
                    success: false,
                    message:
                        "Employee not found"
                });

            }


            // Check duplicate email
            const duplicateEmail =
                employees.some(
                    function(emp, index) {

                        return (
                            index !== employeeIndex
                            &&
                            String(
                                emp.email
                            )
                            .trim()
                            .toLowerCase()
                            ===
                            String(
                                updatedEmployee.email
                            )
                            .trim()
                            .toLowerCase()
                        );

                    }
                );


            if (duplicateEmail) {

                return res.status(409).json({
                    success: false,
                    message:
                        "Another employee already uses this email"
                });

            }


            // -----------------------------------------
            // KEEP OLD PROFILE PHOTO
            // -----------------------------------------

            if (
                !updatedEmployee.profilePhoto ||
                updatedEmployee.profilePhoto === ""
            ) {

                updatedEmployee.profilePhoto =
                    employees[
                        employeeIndex
                    ].profilePhoto || "";

            }


            // -----------------------------------------
            // CLEAN UPDATED DATA
            // -----------------------------------------

            updatedEmployee.employeeName =
                String(
                    updatedEmployee.employeeName
                ).trim();


            // Keep original Employee ID
            // User cannot change it
            updatedEmployee.employeeId =
                employees[
                    employeeIndex
                ].employeeId;


            updatedEmployee.email =
                String(
                    updatedEmployee.email
                )
                .trim()
                .toLowerCase();


            updatedEmployee.mobile =
                String(
                    updatedEmployee.mobile
                ).trim();


            updatedEmployee.gender =
                String(
                    updatedEmployee.gender
                ).trim();


            updatedEmployee.dateOfBirth =
                String(
                    updatedEmployee.dateOfBirth
                ).trim();


            updatedEmployee.department =
                String(
                    updatedEmployee.department
                ).trim();


            updatedEmployee.designation =
                String(
                    updatedEmployee.designation
                ).trim();


            updatedEmployee.dateOfJoining =
                String(
                    updatedEmployee.dateOfJoining
                ).trim();


            updatedEmployee.employmentType =
                String(
                    updatedEmployee.employmentType
                ).trim();


            // -----------------------------------------
            // REPLACE OLD EMPLOYEE
            // -----------------------------------------

            employees[
                employeeIndex
            ] = updatedEmployee;


            // Save updated data
            writeEmployees(
                employees
            );


            console.log(
                "Employee updated successfully:",
                updatedEmployee.employeeId
            );

            console.log(
                "--------------------------------------"
            );


            res.json({
                success: true,
                message:
                    "Employee updated successfully",
                employee:
                    updatedEmployee
            });

        } catch (error) {

            console.error(
                "UPDATE EMPLOYEE ERROR:",
                error
            );

            res.status(500).json({
                success: false,
                message:
                    "Something went wrong while updating employee"
            });

        }

    }
);


// =====================================================
// DELETE EMPLOYEE
// =====================================================

app.delete(
    "/api/employees/:id",
    function(req, res) {

        try {

            const employeeId =
                decodeURIComponent(
                    req.params.id
                ).trim();


            const employees =
                readEmployees();


            const employeeIndex =
                employees.findIndex(
                    function(emp) {

                        return (
                            String(
                                emp.employeeId
                            )
                            .trim()
                            .toLowerCase()
                            ===
                            employeeId
                                .toLowerCase()
                        );

                    }
                );


            if (employeeIndex === -1) {

                return res.status(404).json({
                    success: false,
                    message:
                        "Employee not found"
                });

            }


            const deletedEmployee =
                employees.splice(
                    employeeIndex,
                    1
                )[0];


            writeEmployees(
                employees
            );


            console.log(
                "Employee deleted:",
                deletedEmployee.employeeId
            );


            res.json({
                success: true,
                message:
                    "Employee deleted successfully",
                employee:
                    deletedEmployee
            });

        } catch (error) {

            console.error(
                "DELETE ERROR:",
                error
            );

            res.status(500).json({
                success: false,
                message:
                    "Unable to delete employee"
            });

        }

    }
);


// =====================================================
// START SERVER
// =====================================================

app.listen(
    PORT,
    function() {

        console.log(
            "======================================"
        );

        console.log(
            "Employee CRUD Server Started"
        );

        console.log(
            "======================================"
        );

        console.log(
            "Open this in Chrome:"
        );

        console.log(
            "http://localhost:" + PORT
        );

        console.log(
            "======================================"
        );

    }
);
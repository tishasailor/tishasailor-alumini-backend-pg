const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = 3000;
const DATA_FILE = path.join(__dirname, "employees.json");

app.use(express.json({ limit: "15mb" }));
app.use(express.urlencoded({ extended: true, limit: "15mb" }));
app.use(express.static(__dirname));

function readEmployees() {
  if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, "[]", "utf8");
  const text = fs.readFileSync(DATA_FILE, "utf8");
  if (!text.trim()) return [];
  const data = JSON.parse(text);
  if (!Array.isArray(data)) throw new Error("employees.json must contain an array.");
  return data;
}
function writeEmployees(employees) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(employees, null, 2), "utf8");
}
function normalize(value) { return String(value ?? "").trim(); }
function validateEmployee(employee) {
  const required = ["employeeName","employeeId","email","mobile","password","confirmPassword","gender","dateOfBirth","department","designation","dateOfJoining","employmentType"];
  for (const field of required) if (!normalize(employee[field])) return `${field} is required.`;
  if (!/^[A-Za-z0-9_-]+$/.test(normalize(employee.employeeId))) return "Employee ID can contain only letters, numbers, hyphen and underscore.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalize(employee.email))) return "Please enter a valid email address.";
  if (!/^[0-9]{10}$/.test(normalize(employee.mobile))) return "Mobile number must contain exactly 10 digits.";
  if (employee.password !== employee.confirmPassword) return "Password and Confirm Password do not match.";
  if (employee.profilePhoto && !String(employee.profilePhoto).startsWith("data:image/")) return "Profile photo must be a valid image.";
  return null;
}
function findIndex(employees, id) {
  return employees.findIndex(emp => normalize(emp.employeeId).toLowerCase() === normalize(id).toLowerCase());
}
function checkDuplicates(candidateList, existingList = []) {
  const ids = new Set(existingList.map(e => normalize(e.employeeId).toLowerCase()));
  const emails = new Set(existingList.map(e => normalize(e.email).toLowerCase()));
  for (const emp of candidateList) {
    const id = normalize(emp.employeeId).toLowerCase();
    const email = normalize(emp.email).toLowerCase();
    if (ids.has(id)) return `Employee ID already exists: ${emp.employeeId}`;
    if (emails.has(email)) return `Email address already exists: ${emp.email}`;
    ids.add(id); emails.add(email);
  }
  return null;
}
function cleanEmployee(emp) {
  const copy = {...emp};
  for (const key of ["employeeName","employeeId","email","mobile","gender","dateOfBirth","department","designation","dateOfJoining","employmentType"]) copy[key] = normalize(copy[key]);
  copy.email = copy.email.toLowerCase();
  copy.profilePhoto = copy.profilePhoto || "";
  return copy;
}

app.get("/", (req, res) => res.sendFile(path.join(__dirname, "index.html")));

app.get("/api/employees", (req, res) => {
  try { res.json({success:true, employees:readEmployees()}); }
  catch (error) { console.error(error); res.status(500).json({success:false,message:"Unable to read employee data."}); }
});
app.get("/api/employees/:id", (req, res) => {
  try {
    const employees = readEmployees();
    const employee = employees.find(emp => normalize(emp.employeeId).toLowerCase() === normalize(req.params.id).toLowerCase());
    if (!employee) return res.status(404).json({success:false,message:"Employee not found."});
    res.json({success:true,employee});
  } catch (error) { console.error(error); res.status(500).json({success:false,message:"Unable to load employee."}); }
});

/* Single insert */
app.post("/api/employees", (req, res) => {
  try {
    const employee = req.body;
    const error = validateEmployee(employee);
    if (error) return res.status(400).json({success:false,message:error});
    const employees = readEmployees();
    const duplicate = checkDuplicates([employee], employees);
    if (duplicate) return res.status(409).json({success:false,message:duplicate});
    const saved = cleanEmployee(employee);
    employees.push(saved); writeEmployees(employees);
    res.status(201).json({success:true,message:"Employee added successfully.",employee:saved});
  } catch (error) { console.error(error); res.status(500).json({success:false,message:"Something went wrong while adding employee."}); }
});

/* Bulk insert: validate every row first, then write once */
app.post("/api/employees/bulk", (req, res) => {
  try {
    const incoming = req.body && req.body.employees;
    if (!Array.isArray(incoming) || incoming.length === 0) return res.status(400).json({success:false,message:"Add at least one employee."});
    if (incoming.length > 100) return res.status(400).json({success:false,message:"You can insert up to 100 employees at a time."});
    for (let i=0;i<incoming.length;i++) {
      const error = validateEmployee(incoming[i]);
      if (error) return res.status(400).json({success:false,message:`Employee ${i+1}: ${error}`});
    }
    const employees = readEmployees();
    const duplicate = checkDuplicates(incoming, employees);
    if (duplicate) return res.status(409).json({success:false,message:duplicate});
    const saved = incoming.map(cleanEmployee);
    writeEmployees([...employees, ...saved]);
    res.status(201).json({success:true,message:`${saved.length} employee(s) inserted successfully.`,employees:saved});
  } catch (error) { console.error(error); res.status(500).json({success:false,message:"Unable to insert employees."}); }
});

/* Single update */
app.put("/api/employees/:id", (req, res) => {
  try {
    const employees = readEmployees();
    const index = findIndex(employees, req.params.id);
    if (index < 0) return res.status(404).json({success:false,message:"Employee not found."});
    const old = employees[index];
    const incoming = {...req.body, employeeId:old.employeeId};
    if (!incoming.password && !incoming.confirmPassword) {
      incoming.password = old.password; incoming.confirmPassword = old.confirmPassword;
    }
    if (!incoming.profilePhoto) incoming.profilePhoto = old.profilePhoto || "";
    const error = validateEmployee(incoming);
    if (error) return res.status(400).json({success:false,message:error});
    const duplicateEmail = employees.some((emp,i) => i !== index && normalize(emp.email).toLowerCase() === normalize(incoming.email).toLowerCase());
    if (duplicateEmail) return res.status(409).json({success:false,message:"Another employee already uses this email."});
    const saved = cleanEmployee(incoming);
    employees[index] = saved; writeEmployees(employees);
    res.json({success:true,message:"Employee updated successfully.",employee:saved});
  } catch (error) { console.error(error); res.status(500).json({success:false,message:"Unable to update employee."}); }
});

/* Bulk update only changes specified common fields */
app.patch("/api/employees/bulk", (req, res) => {
  try {
    const ids = req.body && req.body.employeeIds;
    const changes = req.body && req.body.changes;
    if (!Array.isArray(ids) || ids.length === 0) return res.status(400).json({success:false,message:"Select at least one employee."});
    if (!changes || typeof changes !== "object") return res.status(400).json({success:false,message:"No changes supplied."});
    const allowed = ["department","designation","employmentType","gender"];
    const keys = Object.keys(changes).filter(key => allowed.includes(key) && normalize(changes[key]));
    if (!keys.length) return res.status(400).json({success:false,message:"Choose at least one valid field to update."});
    const employees = readEmployees();
    const idSet = new Set(ids.map(id => normalize(id).toLowerCase()));
    const matched = employees.filter(emp => idSet.has(normalize(emp.employeeId).toLowerCase()));
    if (matched.length !== idSet.size) return res.status(404).json({success:false,message:"One or more selected employees could not be found. Refresh and try again."});
    for (const emp of employees) if (idSet.has(normalize(emp.employeeId).toLowerCase())) {
      for (const key of keys) emp[key] = normalize(changes[key]);
    }
    writeEmployees(employees);
    res.json({success:true,message:`Updated ${matched.length} employee(s).`,employees:matched});
  } catch (error) { console.error(error); res.status(500).json({success:false,message:"Unable to bulk update employees."}); }
});

/* Bulk delete */
app.delete("/api/employees/bulk", (req, res) => {
  try {
    const ids = req.body && req.body.employeeIds;
    if (!Array.isArray(ids) || ids.length === 0) return res.status(400).json({success:false,message:"Select at least one employee."});
    const idSet = new Set(ids.map(id => normalize(id).toLowerCase()));
    const employees = readEmployees();
    const remaining = employees.filter(emp => !idSet.has(normalize(emp.employeeId).toLowerCase()));
    const deletedCount = employees.length - remaining.length;
    if (!deletedCount) return res.status(404).json({success:false,message:"No matching employees found."});
    writeEmployees(remaining);
    res.json({success:true,message:`Deleted ${deletedCount} employee(s).`});
  } catch (error) { console.error(error); res.status(500).json({success:false,message:"Unable to bulk delete employees."}); }
});

/* Single delete */
app.delete("/api/employees/:id", (req, res) => {
  try {
    const employees = readEmployees();
    const index = findIndex(employees, req.params.id);
    if (index < 0) return res.status(404).json({success:false,message:"Employee not found."});
    const [deleted] = employees.splice(index,1);
    writeEmployees(employees);
    res.json({success:true,message:"Employee deleted successfully.",employee:deleted});
  } catch (error) { console.error(error); res.status(500).json({success:false,message:"Unable to delete employee."}); }
});

app.listen(PORT, () => console.log(`Employee CRUD server running at http://localhost:${PORT}`));

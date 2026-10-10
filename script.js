console.log("Employee CRUD System Started");

const $ = (id) => document.getElementById(id);
let employeesCache = [];
let selectedIds = new Set();
let editingId = null;
let messageTimer = null;

function showMessage(message, type = "success") {
  const box = $("message");
  box.textContent = message;
  box.className = "message " + type;
  box.style.display = "block";
  clearTimeout(messageTimer);
  messageTimer = setTimeout(() => { box.style.display = "none"; }, 5000);
}
function escapeHTML(value = "") {
  return String(value).replace(/[&<>"']/g, ch => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
}
function readPhoto(file) {
  if (!file) return Promise.resolve("");
  if (!file.type.startsWith("image/")) return Promise.reject(new Error("Please choose an image file."));
  if (file.size > 200 * 1024) return Promise.reject(new Error("Each profile photo must be 200 KB or smaller."));
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Unable to read profile photo."));
    reader.readAsDataURL(file);
  });
}
function addEmployeeEntry() {
  const fragment = $("employeeTemplate").content.cloneNode(true);
  const card = fragment.querySelector(".employee-entry");
  card.querySelector(".remove-entry").addEventListener("click", () => {
    if ($("newEmployeeForms").querySelectorAll(".employee-entry").length === 1) {
      card.querySelectorAll("input,select").forEach(el => { if (el.type === "file") el.value = ""; else el.value = ""; });
    } else card.remove();
    renumberEntries();
  });
  $("newEmployeeForms").appendChild(fragment);
  renumberEntries();
}
function renumberEntries() {
  $("newEmployeeForms").querySelectorAll(".employee-entry").forEach((card, i) => {
    card.querySelector(".entry-number").textContent = i + 1;
    card.querySelector(".remove-entry").style.visibility = $("newEmployeeForms").querySelectorAll(".employee-entry").length === 1 ? "hidden" : "visible";
  });
}
function entryValue(card, name) {
  return card.querySelector(`[data-field="${name}"]`).value.trim();
}
async function collectEntry(card) {
  const obj = {};
  card.querySelectorAll("[data-field]").forEach(el => {
    if (el.dataset.field !== "profilePhotoFile") obj[el.dataset.field] = el.value.trim();
  });
  const file = card.querySelector('[data-field="profilePhotoFile"]').files[0];
  obj.profilePhoto = await readPhoto(file);
  if (obj.password !== obj.confirmPassword) throw new Error(`Passwords do not match for ${obj.employeeId || obj.employeeName}.`);
  return obj;
}
async function api(url, options = {}) {
  const response = await fetch(url, options);
  let data;
  try { data = await response.json(); }
  catch { throw new Error("Server returned an invalid response. Check server.js and restart the server."); }
  if (!response.ok) throw new Error(data.message || `Request failed (${response.status}).`);
  return data;
}
function jsonOptions(method, body) {
  return {method, headers: {"Content-Type":"application/json"}, body: JSON.stringify(body)};
}

$("openAddBtn").addEventListener("click", () => {
  $("addPanel").classList.remove("hidden");
  if (!$("newEmployeeForms").children.length) addEmployeeEntry();
  $("addPanel").scrollIntoView({behavior:"smooth", block:"start"});
});
$("closeAddBtn").addEventListener("click", () => $("addPanel").classList.add("hidden"));
$("addAnotherBtn").addEventListener("click", addEmployeeEntry);
$("bulkInsertForm").addEventListener("submit", async event => {
  event.preventDefault();
  const form = event.currentTarget;
  if (!form.reportValidity()) return;
  const cards = [...$("newEmployeeForms").querySelectorAll(".employee-entry")];
  const button = $("insertAllBtn");
  button.disabled = true;
  try {
    const newEmployees = [];
    for (const card of cards) newEmployees.push(await collectEntry(card));
    const result = await api("/api/employees/bulk", jsonOptions("POST", {employees:newEmployees}));
    showMessage(result.message || `${newEmployees.length} employees inserted successfully.`);
    $("newEmployeeForms").innerHTML = "";
    addEmployeeEntry();
    $("addPanel").classList.add("hidden");
    await showAllEmployees();
  } catch (error) { showMessage(error.message, "error"); }
  finally { button.disabled = false; }
});

$("showBtn").addEventListener("click", showAllEmployees);
$("searchInput").addEventListener("input", renderEmployees);
$("selectAll").addEventListener("change", () => {
  const visible = getFilteredEmployees();
  visible.forEach(emp => $("selectAll").checked ? selectedIds.add(emp.employeeId) : selectedIds.delete(emp.employeeId));
  renderEmployees();
});
$("bulkDeleteBtn").addEventListener("click", bulkDelete);
$("bulkUpdateBtn").addEventListener("click", () => {
  if (!selectedIds.size) return showMessage("Select at least one employee first.", "error");
  $("bulkUpdatePanel").classList.remove("hidden");
  $("bulkUpdatePanel").scrollIntoView({behavior:"smooth",block:"center"});
});
$("cancelBulkUpdateBtn").addEventListener("click", () => $("bulkUpdatePanel").classList.add("hidden"));
$("bulkUpdateForm").addEventListener("submit", async event => {
  event.preventDefault();
  const changes = {};
  for (const [id, key] of [["bulkDepartment","department"],["bulkDesignation","designation"],["bulkEmploymentType","employmentType"],["bulkGender","gender"]]) {
    const value = $(id).value.trim();
    if (value) changes[key] = value;
  }
  if (!Object.keys(changes).length) return showMessage("Choose or enter at least one field to update.", "error");
  if (!confirm(`Apply these changes to ${selectedIds.size} selected employee(s)?`)) return;
  try {
    const result = await api("/api/employees/bulk", jsonOptions("PATCH", {employeeIds:[...selectedIds], changes}));
    showMessage(result.message || "Selected employees updated.");
    selectedIds.clear();
    $("bulkUpdateForm").reset();
    $("bulkUpdatePanel").classList.add("hidden");
    await showAllEmployees();
  } catch (error) { showMessage(error.message, "error"); }
});
$("cancelEditBtn").addEventListener("click", closeEdit);
$("cancelEditBtn2").addEventListener("click", closeEdit);

function getFilteredEmployees() {
  const q = $("searchInput").value.trim().toLowerCase();
  if (!q) return employeesCache;
  return employeesCache.filter(emp => [emp.employeeName,emp.employeeId,emp.email,emp.department,emp.designation,emp.mobile].some(v => String(v || "").toLowerCase().includes(q)));
}
function renderEmployees() {
  const output = $("output");
  const employees = getFilteredEmployees();
  output.innerHTML = "";
  if (!employees.length) {
    output.innerHTML = `<div class="empty">${employeesCache.length ? "No employees match your search." : "No employees found. Click “Add Employee” to begin."}</div>`;
  }
  employees.forEach(emp => {
    const id = String(emp.employeeId);
    const card = document.createElement("article");
    card.className = "employee";
    const photo = emp.profilePhoto && String(emp.profilePhoto).startsWith("data:image") ? emp.profilePhoto : "";
    card.innerHTML = `
      <input type="checkbox" class="employee-check" aria-label="Select ${escapeHTML(id)}" ${selectedIds.has(id) ? "checked" : ""}>
      <img class="avatar" alt="Profile photo" src="${photo ? escapeHTML(photo) : "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='60' height='60' viewBox='0 0 60 60'%3E%3Crect width='60' height='60' rx='30' fill='%23e8edf5'/%3E%3Ccircle cx='30' cy='22' r='11' fill='%239aa7b8'/%3E%3Cpath d='M9 56c2-13 10-20 21-20s19 7 21 20' fill='%239aa7b8'/%3E%3C/svg%3E"}">
      <div class="employee-info">
        <div class="employee-name">${escapeHTML(emp.employeeName)} <span class="tag">${escapeHTML(emp.gender || "—")}</span></div>
        <div class="employee-meta">
          <span><strong>ID:</strong> ${escapeHTML(id)}</span><span><strong>Email:</strong> ${escapeHTML(emp.email)}</span>
          <span><strong>Mobile:</strong> ${escapeHTML(emp.mobile)}</span><span><strong>Department:</strong> ${escapeHTML(emp.department)}</span>
          <span><strong>Designation:</strong> ${escapeHTML(emp.designation)}</span><span><strong>Type:</strong> ${escapeHTML(emp.employmentType)}</span>
          <span><strong>DOB:</strong> ${escapeHTML(emp.dateOfBirth || "—")}</span>
        </div>
      </div>
      <div class="employee-actions">
        <button class="icon-btn edit-one" title="Update employee" aria-label="Update employee">✎</button>
        <button class="icon-btn delete delete-one" title="Delete employee" aria-label="Delete employee">▣</button>
      </div>`;
    card.querySelector(".employee-check").addEventListener("change", e => {
      e.target.checked ? selectedIds.add(id) : selectedIds.delete(id);
      updateSelectionControls();
    });
    card.querySelector(".edit-one").addEventListener("click", () => startUpdate(id));
    card.querySelector(".delete-one").addEventListener("click", () => deleteEmployee(id));
    output.appendChild(card);
  });
  updateSelectionControls();
}
function updateSelectionControls() {
  $("selectedCount").textContent = `${selectedIds.size} selected`;
  $("bulkDeleteBtn").disabled = selectedIds.size === 0;
  $("bulkUpdateBtn").disabled = selectedIds.size === 0;
  const visible = getFilteredEmployees();
  $("selectAll").checked = visible.length > 0 && visible.every(emp => selectedIds.has(String(emp.employeeId)));
  $("selectAll").indeterminate = visible.some(emp => selectedIds.has(String(emp.employeeId))) && !$("selectAll").checked;
}
async function showAllEmployees() {
  try {
    const data = await api("/api/employees");
    employeesCache = Array.isArray(data.employees) ? data.employees : [];
    const validIds = new Set(employeesCache.map(emp => String(emp.employeeId)));
    selectedIds = new Set([...selectedIds].filter(id => validIds.has(id)));
    renderEmployees();
  } catch (error) {
    $("output").innerHTML = `<div class="empty">${escapeHTML(error.message)}</div>`;
    showMessage(error.message, "error");
  }
}
async function deleteEmployee(employeeId) {
  if (!confirm(`Delete employee ${employeeId}? This cannot be undone.`)) return;
  try {
    const data = await api(`/api/employees/${encodeURIComponent(employeeId)}`, {method:"DELETE"});
    selectedIds.delete(String(employeeId));
    showMessage(data.message || "Employee deleted successfully.");
    await showAllEmployees();
  } catch (error) { showMessage(error.message, "error"); }
}
async function bulkDelete() {
  const ids = [...selectedIds];
  if (!ids.length) return showMessage("Select employees to delete.", "error");
  if (!confirm(`Delete all ${ids.length} selected employee(s)? This cannot be undone.`)) return;
  try {
    const data = await api("/api/employees/bulk", jsonOptions("DELETE", {employeeIds:ids}));
    selectedIds.clear();
    showMessage(data.message || "Selected employees deleted.");
    await showAllEmployees();
  } catch (error) { showMessage(error.message, "error"); }
}

const editableFields = [
  ["employeeName","Employee Name","text"],["email","Email Address","email"],["mobile","Mobile Number","tel"],
  ["password","Password","password"],["confirmPassword","Confirm Password","password"],
  ["gender","Gender","select"],["dateOfBirth","Date of Birth","date"],["department","Department","select"],
  ["designation","Designation","text"],["dateOfJoining","Date of Joining","date"],["employmentType","Employment Type","select"]
];
const selectOptions = {
  gender:["Male","Female","Other"],
  department:["IT","HR","Finance","Marketing","Engineering","Sales","Operations"],
  employmentType:["Full-Time","Part-Time","Contract","Intern"]
};
function makeEditFields(emp) {
  $("editFields").innerHTML = "";
  editableFields.forEach(([key,label,type]) => {
    const wrap = document.createElement("div"); wrap.className = "field";
    const labelEl = document.createElement("label"); labelEl.textContent = label + (["employeeName","email","mobile","gender","dateOfBirth","department","designation","dateOfJoining","employmentType"].includes(key) ? " *" : "");
    let input;
    if (type === "select") {
      input = document.createElement("select");
      input.innerHTML = `<option value="">Select ${label}</option>` + selectOptions[key].map(v => `<option value="${escapeHTML(v)}">${escapeHTML(v)}</option>`).join("");
    } else { input = document.createElement("input"); input.type = type; }
    input.id = "edit_" + key; input.name = key;
    if (key !== "password" && key !== "confirmPassword") input.required = true;
    if (key === "mobile") {input.maxLength = 10; input.pattern = "[0-9]{10}";}
    if (key === "password" || key === "confirmPassword") input.placeholder = "Leave blank to keep existing password";
    input.value = type === "select" ? (emp[key] || "") : (["password","confirmPassword"].includes(key) ? "" : (emp[key] || ""));
    wrap.append(labelEl,input); $("editFields").appendChild(wrap);
  });
  const idWrap = document.createElement("div"); idWrap.className = "field";
  idWrap.innerHTML = `<label>Employee ID (cannot be changed)</label><input value="${escapeHTML(emp.employeeId)}" disabled>`;
  $("editFields").appendChild(idWrap);
  const photoWrap = document.createElement("div"); photoWrap.className = "field";
  photoWrap.innerHTML = `<label>Change Profile Photo (optional, max 200 KB)</label><input id="edit_profilePhotoFile" type="file" accept="image/*">`;
  $("editFields").appendChild(photoWrap);
}
async function startUpdate(employeeId) {
  const emp = employeesCache.find(item => String(item.employeeId).toLowerCase() === String(employeeId).toLowerCase());
  if (!emp) return showMessage("Employee not found. Refresh and try again.", "error");
  editingId = emp.employeeId;
  makeEditFields(emp);
  $("editHeading").textContent = `Update ${emp.employeeName} (${emp.employeeId})`;
  $("editPanel").classList.remove("hidden");
  $("editPanel").scrollIntoView({behavior:"smooth",block:"start"});
}
function closeEdit() { editingId = null; $("editPanel").classList.add("hidden"); $("editFields").innerHTML = ""; }
$("editForm").addEventListener("submit", async event => {
  event.preventDefault();
  if (!editingId) return;
  if (!event.currentTarget.reportValidity()) return;
  const current = employeesCache.find(emp => String(emp.employeeId) === String(editingId));
  const updated = {...current};
  editableFields.forEach(([key]) => {
    const value = $("edit_" + key).value.trim();
    if ((key === "password" || key === "confirmPassword") && !value) return;
    updated[key] = value;
  });
  if (updated.password !== updated.confirmPassword) return showMessage("Password and confirm password do not match.", "error");
  try {
    const file = $("edit_profilePhotoFile").files[0];
    if (file) updated.profilePhoto = await readPhoto(file);
    const data = await api(`/api/employees/${encodeURIComponent(editingId)}`, jsonOptions("PUT", updated));
    closeEdit();
    showMessage(data.message || "Employee updated successfully.");
    await showAllEmployees();
  } catch (error) { showMessage(error.message, "error"); }
});

addEmployeeEntry();
showAllEmployees();

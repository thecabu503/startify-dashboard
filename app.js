// Application State
let projects = [];
let archivedProjects = [];
let selectedProjectId = null;
let chartInstance = null;
let currentView = "dashboard"; // "dashboard", "calendar", "history", or "settings"
let currentCalendarDate = new Date();

// Auth State
let appUsers = [];
let currentUser = null;

// Initialize App
document.addEventListener("DOMContentLoaded", () => {
  // Set up Auth
  initAuth();
  if (!currentUser) return; // Stop initialization if not logged in

  // Load initial data
  projects = getInitialData();
  archivedProjects = getArchivedData();
  
  if (projects.length > 0) {
    selectedProjectId = projects[0].id;
  }
  
  // Set up Event Listeners
  initEventListeners();
  
  // Initialize Scrollspy
  initScrollspy();
  
  // Initial Render
  renderApp();
  
  // Start Live Activity simulation
  startLiveActivity();
});

// Event Listeners Configuration
function initEventListeners() {
  // Toggle Workspace Dropdown
  document.getElementById("workspace-title").addEventListener("click", (e) => {
    e.stopPropagation();
    const dropdown = document.getElementById("workspace-dropdown-menu");
    dropdown.classList.toggle("hidden");
  });

  // Close dropdown on click outside
  window.addEventListener("click", () => {
    const dropdown = document.getElementById("workspace-dropdown-menu");
    if (dropdown) dropdown.classList.add("hidden");
  });

  // Navigation sidebar shortcuts
  document.getElementById("nav-dashboard").addEventListener("click", (e) => {
    setActiveNav(e.currentTarget);
    switchView("dashboard");
    document.querySelector(".main-panel").scrollTo({ top: 0, behavior: "smooth" });
  });
  
  document.getElementById("nav-projects-shortcut").addEventListener("click", (e) => {
    setActiveNav(e.currentTarget);
    switchView("dashboard");
    document.getElementById("projects-list-container").scrollIntoView({ behavior: "smooth" });
  });
  
  document.getElementById("nav-tasks-shortcut").addEventListener("click", (e) => {
    setActiveNav(e.currentTarget);
    switchView("dashboard");
    document.getElementById("project-tasks-section").scrollIntoView({ behavior: "smooth" });
  });
  
  document.getElementById("nav-calendar").addEventListener("click", (e) => {
    setActiveNav(e.currentTarget);
    switchView("calendar");
  });

  // Global Search
  document.getElementById("global-search").addEventListener("input", (e) => {
    renderTasksTable();
    renderGanttTimeline();
  });

  // Project Modals
  document.getElementById("btn-add-project").addEventListener("click", () => openProjectModal(false));
  document.getElementById("btn-edit-project").addEventListener("click", () => openProjectModal(true));
  document.getElementById("btn-delete-project").addEventListener("click", deleteSelectedProject);
  document.getElementById("btn-close-project-modal").addEventListener("click", closeProjectModal);
  document.getElementById("btn-cancel-project").addEventListener("click", closeProjectModal);
  document.getElementById("project-form").addEventListener("submit", handleProjectFormSubmit);
  
  // Set up Theme Color Picker inside Project Modal
  const colorOptions = document.querySelectorAll(".color-option");
  colorOptions.forEach(opt => {
    opt.addEventListener("click", (e) => {
      colorOptions.forEach(o => o.classList.remove("selected"));
      e.currentTarget.classList.add("selected");
    });
  });

  // Task Modals
  document.getElementById("btn-add-task").addEventListener("click", () => openTaskModal(false));
  document.getElementById("btn-close-task-modal").addEventListener("click", closeTaskModal);
  document.getElementById("btn-cancel-task").addEventListener("click", closeTaskModal);
  document.getElementById("task-form").addEventListener("submit", handleTaskFormSubmit);

  // Image Upload Preview inside Task Modal
  document.getElementById("task-modal-image").addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const base64 = ev.target.result;
      document.getElementById("task-modal-image-base64").value = base64;
      const previewDiv = document.getElementById("task-modal-image-preview");
      previewDiv.style.display = "flex";
      previewDiv.querySelector("img").src = base64;
    };
    reader.readAsDataURL(file);
  });

  document.getElementById("btn-remove-task-image").addEventListener("click", () => {
    document.getElementById("task-modal-image").value = "";
    document.getElementById("task-modal-image-base64").value = "";
    const previewDiv = document.getElementById("task-modal-image-preview");
    previewDiv.style.display = "none";
    previewDiv.querySelector("img").src = "";
  });

  // Backup & Import
  document.getElementById("btn-export").addEventListener("click", exportData);
  document.getElementById("btn-import").addEventListener("click", () => {
    document.getElementById("import-file-input").click();
  });
  document.getElementById("import-file-input").addEventListener("change", importData);

  // Navigation — History
  document.getElementById("nav-history").addEventListener("click", (e) => {
    setActiveNav(e.currentTarget);
    switchView("history");
  });

  // Archive & Back
  document.getElementById("btn-archive-project").addEventListener("click", archiveProject);
  document.getElementById("btn-back-to-dashboard").addEventListener("click", () => {
    setActiveNav(document.getElementById("nav-dashboard"));
    switchView("dashboard");
  });

  // Settings & Logout
  document.getElementById("nav-settings").addEventListener("click", (e) => {
    setActiveNav(e.currentTarget);
    switchView("settings");
    renderSettingsUsers();
  });
  
  document.getElementById("nav-logout").addEventListener("click", () => {
    logoutUser();
  });

  // Settings Add User
  document.getElementById("add-user-form").addEventListener("submit", (e) => {
    e.preventDefault();
    handleAddUser();
  });
}

function setActiveNav(element) {
  document.querySelectorAll(".nav-item").forEach(item => item.classList.remove("active"));
  element.classList.add("active");
}

// Save state helper
function saveState() {
  localStorage.setItem("startify_projects", JSON.stringify(projects));
  localStorage.setItem("startify_archived", JSON.stringify(archivedProjects));
}

// Overall calculations & dashboard updates
function renderApp() {
  // 1. Calculate overall metrics
  let totalTasks = 0;
  let completedTasks = 0;
  let inProgressTasks = 0;
  let criticalTasks = 0; // High or Critical priority
  
  projects.forEach(p => {
    p.tasks.forEach(t => {
      totalTasks++;
      if (t.status === "Completed") completedTasks++;
      if (t.status === "In Progress") inProgressTasks++;
      if (t.priority === "High" || t.priority === "Critical") {
        criticalTasks++;
      }
    });
  });
  
  // Percentages
  const completedPct = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  const activePct = totalTasks > 0 ? Math.round((inProgressTasks / totalTasks) * 100) : 0;
  const criticalPct = totalTasks > 0 ? Math.round((criticalTasks / totalTasks) * 100) : 0;

  // 2. Update KPI values
  animateKPINumber("kpi-completed-count", completedTasks);
  document.getElementById("kpi-completed-pct").innerText = `${completedPct}%`;
  document.getElementById("kpi-completed-progress-fill").style.width = `${completedPct}%`;
  
  animateKPINumber("kpi-active-count", inProgressTasks);
  document.getElementById("kpi-active-pct").innerText = `${activePct}%`;
  document.getElementById("kpi-active-progress-fill").style.width = `${activePct}%`;
  
  animateKPINumber("kpi-total-count", totalTasks);
  
  animateKPINumber("kpi-critical-count", criticalTasks);
  document.getElementById("kpi-critical-pct").innerText = `${criticalPct}%`;
  document.getElementById("kpi-critical-progress-fill").style.width = `${criticalPct}%`;

  // Update dark widget footer values
  document.getElementById("live-in-progress-count").innerText = inProgressTasks;
  document.getElementById("footer-efficiency-pct").innerText = `${completedPct}%`;
  document.getElementById("footer-efficiency-fill").style.width = `${completedPct}%`;
  document.getElementById("footer-success-rate").innerText = `${completedPct}%`;
  document.getElementById("footer-active-burden").innerText = projects.filter(p => p.tasks.some(t => t.status === "In Progress")).length;

  // Update project directory count
  document.getElementById("project-directory-count").innerText = `Total ${projects.length} projects active`;

  // 3. Render Projects List
  renderProjectsList();
  renderWorkspaceDropdown();

  // 4. Render Tasks Table
  renderTasksTable();

  // 5. Render Chart.js Graph
  renderChart();

  // 6. Render Gantt Timeline
  renderGanttTimeline();

  // 7. Render Active Process Cards
  renderActiveProcesses();
}

// Animate numbers for rich feel
function animateKPINumber(id, targetValue) {
  const element = document.getElementById(id);
  const currentValue = parseInt(element.innerText) || 0;
  if (currentValue === targetValue) return;
  
  let start = currentValue;
  const duration = 600;
  const startTime = performance.now();
  
  function update(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    // Ease out quad
    const easeProgress = progress * (2 - progress);
    const value = Math.round(start + (targetValue - start) * easeProgress);
    element.innerText = value;
    
    if (progress < 1) {
      requestAnimationFrame(update);
    }
  }
  requestAnimationFrame(update);
}

// Render Project Directory Cards
function renderProjectsList() {
  const container = document.getElementById("projects-list-container");
  container.innerHTML = "";
  
  if (projects.length === 0) {
    container.innerHTML = `<div style="text-align: center; color: var(--text-muted); padding: 20px;">No projects found. Create one to start tracking!</div>`;
    return;
  }
  
  projects.forEach(p => {
    const total = p.tasks.length;
    const completed = p.tasks.filter(t => t.status === "Completed").length;
    const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
    
    const isSelected = p.id === selectedProjectId;
    
    const item = document.createElement("div");
    item.className = `project-item ${isSelected ? "selected" : ""}`;
    item.setAttribute("data-id", p.id);
    
    // Add a custom style if selected for a nice left-border
    if (isSelected) {
      item.style.borderLeft = `4px solid ${p.color}`;
    } else {
      item.style.borderLeft = "1px solid var(--border-color)";
    }
    
    item.innerHTML = `
      <div class="project-meta">
        <span class="project-color-dot" style="background-color: ${p.color}"></span>
        <div class="project-name-group">
          <span class="project-name">${p.name}</span>
          <span class="project-category">${p.category} • ${p.priority} Priority • Plan: ${p.startDate || 'N/A'} - ${p.endDate || p.deadline || 'N/A'}</span>
        </div>
      </div>
      
      <div class="project-progress-col">
        <div class="project-progress-info">
          <span>Progress</span>
          <span>${pct}% (${completed}/${total})</span>
        </div>
        <div class="progress-bar-bg">
          <div class="progress-bar-fill" style="width: ${pct}%; background-color: ${p.color}"></div>
        </div>
      </div>
      
      <div class="project-actions-col">
        <button class="icon-btn select-project-btn" title="View Tasks">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
        </button>
      </div>
    `;
    
    // Click on item selects project
    item.addEventListener("click", () => {
      selectedProjectId = p.id;
      renderApp();
      // Scroll bottom panel into view
      document.getElementById("project-tasks-section").scrollIntoView({ behavior: "smooth" });
    });
    
    container.appendChild(item);
  });
}

// Render Selected Project Tasks
// Render Selected Project Tasks
// Render Selected Project Tasks
function renderTasksTable() {
  const tableBody = document.getElementById("tasks-table-body");
  tableBody.innerHTML = "";
  
  const activeProject = projects.find(p => p.id === selectedProjectId);
  
  if (!activeProject) {
    document.getElementById("project-tasks-section").classList.add("hidden");
    return;
  }
  
  document.getElementById("project-tasks-section").classList.remove("hidden");
  document.getElementById("selected-project-title").innerText = `Project: ${activeProject.name}`;
  document.getElementById("selected-project-desc").innerText = activeProject.description || "No description provided.";
  
  // Filter search
  const searchQuery = document.getElementById("global-search").value.toLowerCase();
  
  let tasksToRender = activeProject.tasks;
  if (searchQuery) {
    tasksToRender = activeProject.tasks.filter(t => 
      t.name.toLowerCase().includes(searchQuery) || 
      t.priority.toLowerCase().includes(searchQuery) ||
      t.status.toLowerCase().includes(searchQuery) ||
      (t.pic && t.pic.toLowerCase().includes(searchQuery))
    );
  }
  
  if (tasksToRender.length === 0) {
    tableBody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--text-muted); padding: 24px;">No process steps or tasks match.</td></tr>`;
    return;
  }
  
  tasksToRender.forEach((t, index) => {
    const isCompleted = t.status === "Completed";
    
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${index + 1}</td>
      <td>
        <div style="display: flex; gap: 4px; align-items: center; justify-content: center;">
          <button class="icon-btn move-up-btn" data-id="${t.id}" title="Move Up" style="width: 24px; height: 24px;">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="18 15 12 9 6 15"></polyline></svg>
          </button>
          <button class="icon-btn move-down-btn" data-id="${t.id}" title="Move Down" style="width: 24px; height: 24px;">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="6 9 12 15 18 9"></polyline></svg>
          </button>
          <button class="icon-btn edit-task-btn" data-id="${t.id}" title="Edit Task" style="width: 24px; height: 24px;">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
          </button>
          <button class="icon-btn delete-task-btn" data-id="${t.id}" title="Remove Step" style="width: 24px; height: 24px; color: var(--color-red);">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
          </button>
        </div>
      </td>
      <td>
        <span class="${isCompleted ? "task-name-checked" : ""}" style="font-weight: 500;">${index + 1}. ${t.name}</span>
      </td>
      <td>
        <span style="font-size: 12px; color: var(--text-secondary); font-weight: 500;">${t.pic || "-"}</span>
      </td>
      <td style="font-size: 11px; color: var(--text-secondary);">
        ${formatDateRange(t.planStartDate, t.planEndDate)}
      </td>
      <td style="font-size: 11px; color: var(--text-secondary);">
        ${formatDateRange(t.actualStartDate, t.actualEndDate)}
      </td>
      <td>
        <select class="status-select" data-id="${t.id}">
          <option value="Backlog" ${t.status === "Backlog" ? "selected" : ""}>Backlog</option>
          <option value="In Progress" ${t.status === "In Progress" ? "selected" : ""}>In Progress</option>
          <option value="Review" ${t.status === "Review" ? "selected" : ""}>In Review</option>
          <option value="Completed" ${t.status === "Completed" ? "selected" : ""}>Completed</option>
        </select>
      </td>
    `;
    
    // Event listeners
    row.querySelector(".move-up-btn").addEventListener("click", () => {
      moveTask(t.id, "up");
    });
    row.querySelector(".move-down-btn").addEventListener("click", () => {
      moveTask(t.id, "down");
    });
    row.querySelector(".edit-task-btn").addEventListener("click", () => {
      openTaskModal(true, t.id);
    });
    row.querySelector(".delete-task-btn").addEventListener("click", () => {
      deleteTask(t.id);
    });
    
    // Attach Dropdown change
    row.querySelector(".status-select").addEventListener("change", (e) => {
      const taskId = e.currentTarget.getAttribute("data-id");
      const newStatus = e.currentTarget.value;
      updateTaskStatus(taskId, newStatus);
    });
    
    tableBody.appendChild(row);
  });
}

// Helpers for Gantt layout formatting
function formatDateRange(start, end) {
  if (!start && !end) return "-";
  
  const formatSingle = (dStr) => {
    if (!dStr) return "";
    const d = new Date(dStr);
    if (isNaN(d.getTime())) return dStr;
    // Format to "15 Jan 25" style
    const day = d.getDate();
    const month = d.toLocaleDateString('en-US', { month: 'short' });
    const year = d.getFullYear().toString().substring(2);
    return `${day} ${month} ${year}`;
  };
  
  const sFormatted = formatSingle(start);
  const eFormatted = formatSingle(end);
  
  if (sFormatted && eFormatted) {
    return `${sFormatted} - ${eFormatted}`;
  } else if (sFormatted) {
    return `${sFormatted} -`;
  } else if (eFormatted) {
    return `- ${eFormatted}`;
  }
  return "-";
}

function getShortLabel(name) {
  let label = name.replace(/^\d+[\.\s]*/, "").trim();
  if (label.includes(":")) {
    label = label.split(":")[0];
  }
  if (label.includes("(")) {
    label = label.split("(")[0];
  }
  if (label.length > 25) {
    label = label.substring(0, 22) + "...";
  }
  return label;
}

function moveTask(taskId, direction) {
  const activeProject = projects.find(p => p.id === selectedProjectId);
  if (!activeProject) return;
  
  const idx = activeProject.tasks.findIndex(t => t.id === taskId);
  if (idx === -1) return;
  
  if (direction === "up" && idx > 0) {
    const temp = activeProject.tasks[idx];
    activeProject.tasks[idx] = activeProject.tasks[idx - 1];
    activeProject.tasks[idx - 1] = temp;
  } else if (direction === "down" && idx < activeProject.tasks.length - 1) {
    const temp = activeProject.tasks[idx];
    activeProject.tasks[idx] = activeProject.tasks[idx + 1];
    activeProject.tasks[idx + 1] = temp;
  }
  
  saveState();
  renderApp();
}

// Render dynamic Chart.js
function renderChart() {
  const ctx = document.getElementById("progressLineChart").getContext("2d");
  
  if (chartInstance) {
    chartInstance.destroy();
  }
  
  // Data prep
  const labels = projects.map(p => p.name);
  const data = projects.map(p => {
    const total = p.tasks.length;
    const completed = p.tasks.filter(t => t.status === "Completed").length;
    return total > 0 ? Math.round((completed / total) * 100) : 0;
  });
  
  const colors = projects.map(p => p.color);
  
  // Startify visual configurations
  chartInstance = new Chart(ctx, {
    type: "bar",
    data: {
      labels: labels,
      datasets: [{
        label: "Project Progress %",
        data: data,
        backgroundColor: colors.map(c => `${c}33`), // 20% opacity fill
        borderColor: colors,
        borderWidth: 2,
        borderRadius: 8,
        barThickness: 32,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          backgroundColor: "#0f172a",
          titleFont: { family: "Outfit", size: 13 },
          bodyFont: { family: "Outfit", size: 12 },
          padding: 10,
          cornerRadius: 8,
          displayColors: true,
          callbacks: {
            label: function(context) {
              return `Progress: ${context.raw}%`;
            }
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          max: 100,
          grid: {
            color: "#f1f5f9",
            drawTicks: false
          },
          border: {
            dash: [5, 5],
            display: false
          },
          ticks: {
            font: { family: "Outfit", size: 11 },
            color: "#94a3b8",
            stepSize: 20
          }
        },
        x: {
          grid: {
            display: false
          },
          border: {
            display: false
          },
          ticks: {
            font: { family: "Outfit", size: 11, weight: "500" },
            color: "#475569"
          }
        }
      }
    }
  });
}

// Update task status and trigger render
function updateTaskStatus(taskId, newStatus) {
  const activeProject = projects.find(p => p.id === selectedProjectId);
  if (!activeProject) return;
  
  const task = activeProject.tasks.find(t => t.id === taskId);
  if (!task) return;
  
  task.status = newStatus;
  saveState();
  renderApp();
}

// Delete specific task
function deleteTask(taskId) {
  const activeProject = projects.find(p => p.id === selectedProjectId);
  if (!activeProject) return;
  
  activeProject.tasks = activeProject.tasks.filter(t => t.id !== taskId);
  saveState();
  renderApp();
}

// Delete active project
function deleteSelectedProject() {
  if (!selectedProjectId) return;
  if (!confirm("Are you sure you want to delete this project and all its process steps?")) return;
  
  projects = projects.filter(p => p.id !== selectedProjectId);
  if (projects.length > 0) {
    selectedProjectId = projects[0].id;
  } else {
    selectedProjectId = null;
  }
  
  saveState();
  renderApp();
}

// Startify live simulated processes (fluctuating bar chart)
function startLiveActivity() {
  const barsContainer = document.getElementById("live-bars-chart");
  const barCount = 14;
  
  // Set initial heights
  barsContainer.innerHTML = "";
  for (let i = 0; i < barCount; i++) {
    const height = Math.floor(Math.random() * 70) + 15; // 15% to 85%
    const bar = document.createElement("div");
    bar.className = `live-bar ${i === 8 ? "active" : ""}`; // highlight one
    bar.style.height = `${height}%`;
    bar.setAttribute("data-tooltip", `Activity: ${Math.round(height * 1.5)} events`);
    barsContainer.appendChild(bar);
  }
  
  // Update random bar heights every 3 seconds to look like real-time tracking
  setInterval(() => {
    const bars = barsContainer.querySelectorAll(".live-bar");
    if (bars.length === 0) return;
    
    // Choose 2-3 random bars to update
    for (let j = 0; j < 3; j++) {
      const idx = Math.floor(Math.random() * bars.length);
      const newHeight = Math.floor(Math.random() * 75) + 15;
      bars[idx].style.height = `${newHeight}%`;
      bars[idx].setAttribute("data-tooltip", `Activity: ${Math.round(newHeight * 1.5)} events`);
    }
  }, 3000);
}

// Project Modal Controllers
function openProjectModal(isEdit = false) {
  const modal = document.getElementById("project-modal");
  const title = document.getElementById("project-modal-title");
  
  modal.classList.add("active");
  
  if (isEdit) {
    const p = projects.find(p => p.id === selectedProjectId);
    if (!p) return;
    
    title.innerText = "Edit Project";
    document.getElementById("project-modal-id").value = p.id;
    document.getElementById("project-modal-name").value = p.name;
    document.getElementById("project-modal-desc").value = p.description || "";
    document.getElementById("project-modal-category").value = p.category || "";
    document.getElementById("project-modal-start-date").value = p.startDate || "";
    document.getElementById("project-modal-end-date").value = p.endDate || p.deadline || "";
    document.getElementById("project-modal-priority").value = p.priority;
    
    // Select color option
    document.querySelectorAll(".color-option").forEach(opt => {
      if (opt.getAttribute("data-color") === p.color) {
        opt.classList.add("selected");
      } else {
        opt.classList.remove("selected");
      }
    });
  } else {
    title.innerText = "New Project";
    document.getElementById("project-modal-id").value = "";
    document.getElementById("project-form").reset();
    
    // Select first color as default
    const firstColor = document.querySelector(".color-option");
    document.querySelectorAll(".color-option").forEach(o => o.classList.remove("selected"));
    firstColor.classList.add("selected");
    
    // Set default start date (today) and end date (2 weeks from now)
    const today = new Date();
    const twoWeeks = new Date();
    twoWeeks.setDate(twoWeeks.getDate() + 14);
    document.getElementById("project-modal-start-date").value = today.toISOString().split("T")[0];
    document.getElementById("project-modal-end-date").value = twoWeeks.toISOString().split("T")[0];
  }
}

function closeProjectModal() {
  document.getElementById("project-modal").classList.remove("active");
}

function handleProjectFormSubmit(e) {
  e.preventDefault();
  
  const id = document.getElementById("project-modal-id").value;
  const name = document.getElementById("project-modal-name").value;
  const description = document.getElementById("project-modal-desc").value;
  const category = document.getElementById("project-modal-category").value || "General";
  const startDate = document.getElementById("project-modal-start-date").value;
  const endDate = document.getElementById("project-modal-end-date").value;
  const priority = document.getElementById("project-modal-priority").value;
  
  const selectedColorOption = document.querySelector(".color-option.selected");
  const color = selectedColorOption ? selectedColorOption.getAttribute("data-color") : "#3b82f6";
  
  if (id) {
    // Edit existing project
    const p = projects.find(p => p.id === id);
    if (p) {
      p.name = name;
      p.description = description;
      p.category = category;
      p.startDate = startDate;
      p.endDate = endDate;
      p.deadline = endDate;
      p.priority = priority;
      p.color = color;
    }
  } else {
    // Add new project
    const newProj = {
      id: "proj-" + Date.now(),
      name: name,
      description: description,
      color: color,
      category: category,
      startDate: startDate,
      endDate: endDate,
      deadline: endDate,
      priority: priority,
      tasks: []
    };
    projects.push(newProj);
    selectedProjectId = newProj.id;
  }
  
  saveState();
  closeProjectModal();
  renderApp();
}

// Task Modal Controllers
function openTaskModal(isEdit = false, taskId = null) {
  const modal = document.getElementById("task-modal");
  const title = document.getElementById("task-modal-title");
  modal.classList.add("active");
  
  const activeProject = projects.find(p => p.id === selectedProjectId);
  if (!activeProject) return;

  // Reset image preview state first
  const previewDiv = document.getElementById("task-modal-image-preview");
  previewDiv.style.display = "none";
  previewDiv.querySelector("img").src = "";
  document.getElementById("task-modal-image-base64").value = "";
  document.getElementById("task-modal-image").value = "";

  if (isEdit && taskId) {
    const t = activeProject.tasks.find(x => x.id === taskId);
    if (!t) return;
    
    title.innerText = "Edit Process Step";
    document.getElementById("task-modal-id").value = t.id;
    document.getElementById("task-modal-name").value = t.name || "";
    document.getElementById("task-modal-pic").value = t.pic || "";
    document.getElementById("task-modal-priority").value = t.priority || "Medium";
    document.getElementById("task-modal-plan-start").value = t.planStartDate || "";
    document.getElementById("task-modal-plan-end").value = t.planEndDate || "";
    document.getElementById("task-modal-actual-start").value = t.actualStartDate || "";
    document.getElementById("task-modal-actual-end").value = t.actualEndDate || "";
    document.getElementById("task-modal-status").value = t.status || "Backlog";
    document.getElementById("task-modal-notes").value = t.notes || "";
    
    // Restore image preview if image exists
    if (t.imageBase64) {
      document.getElementById("task-modal-image-base64").value = t.imageBase64;
      previewDiv.style.display = "flex";
      previewDiv.querySelector("img").src = t.imageBase64;
    }
  } else {
    title.innerText = "New Process Step";
    document.getElementById("task-modal-id").value = "";
    document.getElementById("task-form").reset();
    
    // Default dates based on project dates if available
    if (activeProject.startDate) {
      document.getElementById("task-modal-plan-start").value = activeProject.startDate;
      document.getElementById("task-modal-plan-end").value = activeProject.startDate;
    }
  }
}

function closeTaskModal() {
  document.getElementById("task-modal").classList.remove("active");
}

function handleTaskFormSubmit(e) {
  e.preventDefault();
  
  const id = document.getElementById("task-modal-id").value;
  const name = document.getElementById("task-modal-name").value;
  const pic = document.getElementById("task-modal-pic").value;
  const priority = document.getElementById("task-modal-priority").value;
  const planStartDate = document.getElementById("task-modal-plan-start").value;
  const planEndDate = document.getElementById("task-modal-plan-end").value;
  const actualStartDate = document.getElementById("task-modal-actual-start").value;
  const actualEndDate = document.getElementById("task-modal-actual-end").value;
  const status = document.getElementById("task-modal-status").value;
  const notes = document.getElementById("task-modal-notes").value;
  const imageBase64 = document.getElementById("task-modal-image-base64").value;
  
  const activeProject = projects.find(p => p.id === selectedProjectId);
  if (!activeProject) return;
  
  if (id) {
    // Edit existing task
    const t = activeProject.tasks.find(x => x.id === id);
    if (t) {
      t.name = name;
      t.pic = pic;
      t.priority = priority;
      t.planStartDate = planStartDate;
      t.planEndDate = planEndDate;
      t.actualStartDate = actualStartDate;
      t.actualEndDate = actualEndDate;
      t.status = status;
      t.notes = notes;
      if (imageBase64) t.imageBase64 = imageBase64;
      else if (!imageBase64 && !t.imageBase64) t.imageBase64 = "";
    }
  } else {
    // Add new task
    const newTask = {
      id: "task-" + Date.now(),
      name: name,
      pic: pic,
      priority: priority,
      planStartDate: planStartDate,
      planEndDate: planEndDate,
      actualStartDate: actualStartDate,
      actualEndDate: actualEndDate,
      status: status,
      notes: notes,
      imageBase64: imageBase64
    };
    activeProject.tasks.push(newTask);
  }
  
  saveState();
  closeTaskModal();
  renderApp();
}

// Render Active Processes Card (In-Progress tasks with detail & image)
function renderActiveProcesses() {
  const container = document.getElementById("active-processes-list");
  if (!container) return;
  container.innerHTML = "";

  const activeProject = projects.find(p => p.id === selectedProjectId);
  if (!activeProject) {
    container.innerHTML = `<div style="color: var(--text-muted); font-size: 12px; text-align: center; padding: 20px 0;">Select a project to view active processes.</div>`;
    return;
  }

  const inProgressTasks = activeProject.tasks.filter(t => t.status === "In Progress");

  if (inProgressTasks.length === 0) {
    container.innerHTML = `
      <div style="display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 20px 0; color: var(--text-muted);">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" opacity="0.4"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
        <span style="font-size: 12px;">No tasks currently in progress</span>
      </div>`;
    return;
  }

  inProgressTasks.forEach(t => {
    const card = document.createElement("div");
    card.className = "active-process-card";

    // Priority badge color
    const priorityColors = {
      Low: "#94a3b8",
      Medium: "#3b82f6",
      High: "#f59e0b",
      Critical: "#f43f5e"
    };
    const badgeColor = priorityColors[t.priority] || "#3b82f6";

    card.innerHTML = `
      <div class="active-process-card-header">
        <div style="display: flex; gap: 6px; align-items: flex-start; flex: 1;">
          <div class="active-process-status-dot"></div>
          <div style="flex: 1;">
            <div class="active-process-name">${t.name}</div>
            <div class="active-process-meta">
              <span>${t.pic || "Unassigned"}</span>
              <span class="active-process-badge" style="background-color: ${badgeColor}22; color: ${badgeColor};">${t.priority}</span>
            </div>
          </div>
        </div>
        <button class="icon-btn active-process-edit-btn" data-id="${t.id}" title="Edit Step" style="width: 26px; height: 26px; flex-shrink: 0;">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
        </button>
      </div>
      <div class="active-process-dates">
        <span>📅 Plan: ${formatDateRange(t.planStartDate, t.planEndDate)}</span>
        ${t.actualStartDate ? `<span>✅ Actual: ${formatDateRange(t.actualStartDate, t.actualEndDate || null)}</span>` : ""}
      </div>
      ${t.notes ? `<div class="active-process-notes">${t.notes}</div>` : ""}
      ${t.imageBase64 ? `<div class="active-process-image-wrap"><img src="${t.imageBase64}" class="active-process-img" alt="Progress image"></div>` : ""}
    `;

    card.querySelector(".active-process-edit-btn").addEventListener("click", () => {
      openTaskModal(true, t.id);
    });

    container.appendChild(card);
  });
}

// Backup utilities: Export JSON
function exportData() {
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(projects, null, 2));
  const downloadAnchor = document.createElement("a");
  downloadAnchor.setAttribute("href", dataStr);
  downloadAnchor.setAttribute("download", "startify_dashboard_backup.json");
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
}

// Backup utilities: Import JSON
function importData(e) {
  const fileReader = new FileReader();
  fileReader.onload = function(event) {
    try {
      const importedProjects = JSON.parse(event.target.result);
      if (Array.isArray(importedProjects)) {
        projects = importedProjects;
        if (projects.length > 0) {
          selectedProjectId = projects[0].id;
        } else {
          selectedProjectId = null;
        }
        saveState();
        renderApp();
        alert("Projects and tasks successfully imported!");
      } else {
        alert("Invalid file format. Please upload a valid JSON backup file.");
      }
    } catch (err) {
      alert("Failed to parse file. Ensure it is a valid JSON file.");
    }
  };
  if (e.target.files.length > 0) {
    fileReader.readAsText(e.target.files[0]);
  }
}

// View manager
function switchView(view) {
  currentView = view;
  const dashboardContent = document.getElementById("dashboard-view-content");
  const historyContent = document.getElementById("history-view-content");
  const settingsContent = document.getElementById("settings-view-content");
  const calendarContent = document.getElementById("calendar-view-content"); // This is actually part of dashboard but ok

  dashboardContent.style.display = "none";
  historyContent.style.display = "none";
  settingsContent.style.display = "none";

  if (view === "history") {
    historyContent.style.display = "flex";
    renderHistoryView();
  } else if (view === "settings") {
    settingsContent.style.display = "flex";
  } else {
    // dashboard or calendar
    dashboardContent.style.display = "flex";
    if (view === "calendar") {
      setTimeout(() => {
        calendarContent.scrollIntoView({ behavior: "smooth" });
      }, 50);
    } else {
      document.querySelector(".main-panel").scrollTo({ top: 0, behavior: "smooth" });
    }
  }
}

// ==================== HISTORY / ARCHIVE ====================

function getArchivedData() {
  const saved = localStorage.getItem("startify_archived");
  if (saved) {
    try { return JSON.parse(saved); } catch(e) {}
  }
  return [];
}

function archiveProject() {
  if (!selectedProjectId) return;
  const project = projects.find(p => p.id === selectedProjectId);
  if (!project) return;

  const confirmed = confirm(`Archive "${project.name}"?\n\nThis will move it to History. You can reopen it later.`);
  if (!confirmed) return;

  // Mark archived timestamp
  project.archivedAt = new Date().toISOString();
  archivedProjects.push(project);

  // Remove from active
  projects = projects.filter(p => p.id !== selectedProjectId);
  selectedProjectId = projects.length > 0 ? projects[0].id : null;

  saveState();
  renderApp();
  alert(`"${project.name}" has been archived to History.`);
}

function reopenProject(projectId) {
  const idx = archivedProjects.findIndex(p => p.id === projectId);
  if (idx === -1) return;

  const project = archivedProjects[idx];
  delete project.archivedAt;

  projects.push(project);
  archivedProjects.splice(idx, 1);

  selectedProjectId = project.id;
  saveState();
  renderApp();
  switchView("dashboard");
  setActiveNav(document.getElementById("nav-dashboard"));
  setTimeout(() => {
    document.getElementById("project-tasks-section").scrollIntoView({ behavior: "smooth" });
  }, 200);
}

function renderHistoryView() {
  const container = document.getElementById("history-cards-container");
  const countLabel = document.getElementById("history-count-label");
  container.innerHTML = "";

  countLabel.innerText = `${archivedProjects.length} archived project${archivedProjects.length !== 1 ? "s" : ""}`;

  if (archivedProjects.length === 0) {
    container.innerHTML = `
      <div class="grid-card" style="padding: 48px; text-align: center; color: var(--text-muted);">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" opacity="0.3" style="margin: 0 auto 16px; display: block;"><polyline points="21 8 21 21 3 21 3 8"></polyline><rect x="1" y="3" width="22" height="5"></rect><line x1="10" y1="12" x2="14" y2="12"></line></svg>
        <div style="font-size: 16px; font-weight: 600; margin-bottom: 8px;">No Archived Projects</div>
        <div style="font-size: 13px;">Archive a completed project from the dashboard to see it here.</div>
      </div>`;
    return;
  }

  archivedProjects.forEach(p => {
    const total = p.tasks.length;
    const completed = p.tasks.filter(t => t.status === "Completed").length;
    const inProgress = p.tasks.filter(t => t.status === "In Progress").length;
    const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
    const archivedDate = p.archivedAt ? new Date(p.archivedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "Unknown";

    // Count images
    const imagesCount = p.tasks.filter(t => t.imageBase64).length;

    const card = document.createElement("div");
    card.className = "history-project-card";
    card.innerHTML = `
      <div class="history-card-left-accent" style="background: ${p.color};"></div>
      <div class="history-card-body">
        <div class="history-card-header">
          <div>
            <div class="history-card-title">
              <span class="project-color-dot" style="background-color: ${p.color}; width: 10px; height: 10px;"></span>
              ${p.name}
            </div>
            <div class="history-card-meta">
              <span class="history-badge" style="background: ${p.color}22; color: ${p.color};">${p.category}</span>
              <span class="history-badge-gray">${p.priority} Priority</span>
              <span style="color: var(--text-muted); font-size: 11px;">Archived: ${archivedDate}</span>
            </div>
          </div>
          <div class="history-card-actions">
            <button class="secondary-btn reopen-btn" data-id="${p.id}" style="font-size: 12px; padding: 6px 12px;">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="vertical-align: middle; margin-right: 4px;"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path><path d="M3 3v5h5"></path></svg>
              Reopen
            </button>
            <button class="primary-btn export-pdf-btn" data-id="${p.id}" style="font-size: 12px; padding: 6px 12px;">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="vertical-align: middle; margin-right: 4px;"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
              Export PDF
            </button>
          </div>
        </div>

        <div class="history-card-description">${p.description || "No description provided."}</div>

        <!-- Stats row -->
        <div class="history-card-stats">
          <div class="history-stat">
            <div class="history-stat-value">${total}</div>
            <div class="history-stat-label">Total Tasks</div>
          </div>
          <div class="history-stat">
            <div class="history-stat-value" style="color: var(--color-green);">${completed}</div>
            <div class="history-stat-label">Completed</div>
          </div>
          <div class="history-stat">
            <div class="history-stat-value" style="color: var(--color-yellow);">${inProgress}</div>
            <div class="history-stat-label">In Progress</div>
          </div>
          <div class="history-stat">
            <div class="history-stat-value" style="color: var(--color-blue);">${imagesCount}</div>
            <div class="history-stat-label">Images</div>
          </div>
          <div class="history-stat">
            <div class="history-stat-value">${pct}%</div>
            <div class="history-stat-label">Completion</div>
          </div>
        </div>

        <!-- Progress bar -->
        <div style="margin-top: 8px;">
          <div class="progress-bar-bg" style="height: 6px;">
            <div class="progress-bar-fill" style="width: ${pct}%; background-color: ${p.color}; height: 6px; transition: width 0.6s ease;"></div>
          </div>
        </div>

        <!-- Date range -->
        <div style="margin-top: 10px; font-size: 11px; color: var(--text-muted); display: flex; gap: 16px;">
          <span>📅 Plan: ${p.startDate || "N/A"} → ${p.endDate || p.deadline || "N/A"}</span>
        </div>
      </div>
    `;

    card.querySelector(".reopen-btn").addEventListener("click", () => reopenProject(p.id));
    card.querySelector(".export-pdf-btn").addEventListener("click", () => exportProjectPDF(p.id));

    container.appendChild(card);
  });
}

// ==================== PDF EXPORT ====================

async function exportProjectPDF(projectId) {
  // Find project in archived or active
  const p = archivedProjects.find(x => x.id === projectId) || projects.find(x => x.id === projectId);
  if (!p) return;

  const btn = document.querySelector(`.export-pdf-btn[data-id="${projectId}"]`);
  if (btn) { btn.disabled = true; btn.innerText = "Generating..."; }

  try {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });

    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const margin = 14;
    const contentW = pageW - margin * 2;

    // ---- Helper functions ----
    function hexToRgb(hex) {
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      return [r, g, b];
    }

    function setFont(size, style = "normal", color = [15, 23, 42]) {
      doc.setFontSize(size);
      doc.setFont("helvetica", style);
      doc.setTextColor(...color);
    }

    function drawRect(x, y, w, h, fillColor, strokeColor) {
      if (fillColor) { doc.setFillColor(...fillColor); doc.rect(x, y, w, h, "F"); }
      if (strokeColor) { doc.setDrawColor(...strokeColor); doc.rect(x, y, w, h, "S"); }
    }

    // =================== PAGE 1: COVER ===================
    // Top accent bar
    const accentRgb = hexToRgb(p.color || "#3b82f6");
    drawRect(0, 0, pageW, 6, accentRgb);

    // Title block
    setFont(26, "bold", accentRgb);
    doc.text(p.name, margin, 28);

    setFont(11, "normal", [71, 85, 105]);
    doc.text(`Category: ${p.category}  |  Priority: ${p.priority}`, margin, 38);
    doc.text(`Plan Period: ${p.startDate || "N/A"} → ${p.endDate || p.deadline || "N/A"}`, margin, 45);
    doc.text(p.description || "", margin, 53, { maxWidth: contentW });

    // Divider
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.line(margin, 60, pageW - margin, 60);

    // Stats boxes
    const total = p.tasks.length;
    const completed = p.tasks.filter(t => t.status === "Completed").length;
    const inProgress = p.tasks.filter(t => t.status === "In Progress").length;
    const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
    const statBoxes = [
      { label: "Total Tasks", value: total, color: [15, 23, 42] },
      { label: "Completed", value: completed, color: [16, 185, 129] },
      { label: "In Progress", value: inProgress, color: [234, 179, 8] },
      { label: "Completion %", value: pct + "%", color: accentRgb }
    ];
    const boxW = 50;
    const boxH = 22;
    const boxY = 66;
    statBoxes.forEach((s, i) => {
      const bx = margin + i * (boxW + 4);
      drawRect(bx, boxY, boxW, boxH, [248, 250, 252], [226, 232, 240]);
      setFont(16, "bold", s.color);
      doc.text(String(s.value), bx + boxW / 2, boxY + 12, { align: "center" });
      setFont(8, "normal", [148, 163, 184]);
      doc.text(s.label, bx + boxW / 2, boxY + 19, { align: "center" });
    });

    const archivedDate = p.archivedAt ? new Date(p.archivedAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }) : "Active";
    setFont(8, "normal", [148, 163, 184]);
    doc.text(`Generated: ${new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}  |  Archived: ${archivedDate}`, margin, boxY + boxH + 8);

    // =================== PAGE 2: GANTT CHART ===================
    doc.addPage();
    drawRect(0, 0, pageW, 6, accentRgb);

    setFont(16, "bold", [15, 23, 42]);
    doc.text("Project Gantt Chart Timeline", margin, 18);
    setFont(9, "normal", [71, 85, 105]);
    doc.text(`${p.name}  •  ${p.startDate || "N/A"} → ${p.endDate || p.deadline || "N/A"}`, margin, 25);

    // Build gantt weeks
    let startYear = new Date(p.startDate).getFullYear();
    let endYear = new Date(p.endDate || p.deadline).getFullYear();
    if (isNaN(startYear)) startYear = new Date().getFullYear();
    if (isNaN(endYear)) endYear = startYear;
    const ganttStart = new Date(startYear, 0, 1);
    const ganttEnd = new Date(endYear, 11, 31);

    const weekData = [];
    let cur = new Date(ganttStart);
    let wn = 1;
    while (cur <= ganttEnd) {
      const ws = new Date(cur);
      const we = new Date(cur); we.setDate(we.getDate() + 6);
      weekData.push({ weekNum: wn++, start: ws, end: we, month: ws.toLocaleDateString("en-US", { month: "short", year: "2-digit" }) });
      cur.setDate(cur.getDate() + 7);
    }

    // Group by month
    const monthGroups = [];
    weekData.forEach(w => {
      let g = monthGroups.find(x => x.month === w.month);
      if (!g) { g = { month: w.month, count: 0, startIdx: weekData.indexOf(w) }; monthGroups.push(g); }
      g.count++;
    });

    // Gantt table layout
    const ganttTop = 30;
    const labelColW = 60;
    const timelineW = contentW - labelColW;
    const weekW = timelineW / weekData.length;
    const rowH = 8;

    // Draw month header
    let mx = margin + labelColW;
    monthGroups.forEach(g => {
      const gw = g.count * weekW;
      drawRect(mx, ganttTop, gw, 6, [241, 245, 249], [226, 232, 240]);
      setFont(6.5, "bold", [71, 85, 105]);
      doc.text(g.month, mx + gw / 2, ganttTop + 4.2, { align: "center" });
      mx += gw;
    });

    // Week number row
    let wx = margin + labelColW;
    weekData.forEach((w, i) => {
      drawRect(wx, ganttTop + 6, weekW, 5, i % 2 === 0 ? [248, 250, 252] : [255, 255, 255], [226, 232, 240]);
      setFont(5, "normal", [148, 163, 184]);
      doc.text(`W${w.weekNum}`, wx + weekW / 2, ganttTop + 9.5, { align: "center" });
      wx += weekW;
    });

    // Label column header
    drawRect(margin, ganttTop, labelColW, 11, [241, 245, 249], [226, 232, 240]);
    setFont(7, "bold", [71, 85, 105]);
    doc.text("Task / Process Step", margin + 2, ganttTop + 7.5);

    // Task rows
    const timelineStartMs = ganttStart.getTime();
    const timelineEndMs = ganttEnd.getTime();
    const totalMs = timelineEndMs - timelineStartMs;

    p.tasks.forEach((t, i) => {
      const ry = ganttTop + 11 + i * rowH;

      // Alternate row background
      const rowBg = i % 2 === 0 ? [255, 255, 255] : [248, 250, 252];
      drawRect(margin, ry, contentW, rowH, rowBg, [226, 232, 240]);

      // Task name
      setFont(6.5, "normal", [15, 23, 42]);
      const shortName = t.name.length > 28 ? t.name.substring(0, 25) + "..." : t.name;
      doc.text(`${i + 1}. ${shortName}`, margin + 2, ry + 5.5);

      // Status color dot
      const sColors = { "Completed": [16, 185, 129], "In Progress": [59, 130, 246], "Review": [234, 179, 8], "Backlog": [148, 163, 184] };
      const sColor = sColors[t.status] || [148, 163, 184];
      doc.setFillColor(...sColor);
      doc.circle(margin + labelColW - 4, ry + rowH / 2, 1.5, "F");

      // Plan bar
      if (t.planStartDate && t.planEndDate) {
        const ps = new Date(t.planStartDate).getTime();
        const pe = new Date(t.planEndDate).getTime();
        if (!isNaN(ps) && !isNaN(pe)) {
          let left = ((ps - timelineStartMs) / totalMs) * timelineW;
          let width = ((pe - ps) / totalMs) * timelineW;
          left = Math.max(0, left);
          width = Math.min(timelineW - left, width);
          if (width > 0) {
            const barX = margin + labelColW + left;
            const barY = ry + 1.5;
            doc.setFillColor(15, 23, 42);
            doc.rect(barX, ry + rowH / 2 - 0.5, width, 1, "F");
            // Diamond endpoints
            doc.setFillColor(15, 23, 42);
            [[barX, ry + rowH / 2], [barX + width, ry + rowH / 2]].forEach(([dx, dy]) => {
              doc.rect(dx - 1, dy - 1, 2, 2, "F");
            });
          }
        }
      }

      // Actual bar
      if (t.actualStartDate) {
        const as = new Date(t.actualStartDate).getTime();
        const ae = t.actualEndDate ? new Date(t.actualEndDate).getTime() : Date.now();
        if (!isNaN(as) && !isNaN(ae)) {
          let left = ((as - timelineStartMs) / totalMs) * timelineW;
          let width = ((ae - as) / totalMs) * timelineW;
          left = Math.max(0, left);
          width = Math.min(timelineW - left, width);
          if (width > 0) {
            doc.setFillColor(...accentRgb);
            doc.roundedRect(margin + labelColW + left, ry + rowH / 2 + 1, width, 2.5, 0.5, 0.5, "F");
          }
        }
      }

      // Today line
      const todayMs = Date.now();
      if (todayMs >= timelineStartMs && todayMs <= timelineEndMs) {
        const todayLeft = ((todayMs - timelineStartMs) / totalMs) * timelineW;
        doc.setDrawColor(244, 63, 94);
        doc.setLineWidth(0.3);
        doc.line(margin + labelColW + todayLeft, ganttTop, margin + labelColW + todayLeft, ganttTop + 11 + p.tasks.length * rowH);
      }
    });

    // Legend
    const legendY = ganttTop + 11 + p.tasks.length * rowH + 6;
    setFont(7, "normal", [71, 85, 105]);
    doc.setFillColor(15, 23, 42); doc.rect(margin, legendY, 10, 1, "F");
    doc.text("Plan", margin + 12, legendY + 1);
    doc.setFillColor(...accentRgb); doc.roundedRect(margin + 24, legendY - 0.5, 10, 2.5, 0.5, 0.5, "F");
    doc.text("Actual", margin + 36, legendY + 1);
    doc.setFillColor(244, 63, 94); doc.rect(margin + 52, legendY - 1, 0.5, 3, "F");
    doc.text("Today", margin + 54, legendY + 1);

    // =================== PAGE 3: TASK DETAILS TABLE ===================
    doc.addPage();
    drawRect(0, 0, pageW, 6, accentRgb);
    setFont(16, "bold", [15, 23, 42]);
    doc.text("Task Detail Report", margin, 18);
    setFont(9, "normal", [71, 85, 105]);
    doc.text(p.name, margin, 25);

    const cols = [
      { label: "No.", w: 10, key: "no" },
      { label: "Task / Process Step", w: 70, key: "name" },
      { label: "PIC", w: 30, key: "pic" },
      { label: "Plan Date", w: 38, key: "plan" },
      { label: "Actual Date", w: 38, key: "actual" },
      { label: "Status", w: 24, key: "status" },
    ];
    const totalColW = cols.reduce((s, c) => s + c.w, 0);

    let tableY = 30;
    // Header row
    let colX = margin;
    cols.forEach(c => {
      drawRect(colX, tableY, c.w, 7, [241, 245, 249], [226, 232, 240]);
      setFont(7, "bold", [71, 85, 105]);
      doc.text(c.label, colX + 2, tableY + 4.8);
      colX += c.w;
    });
    tableY += 7;

    p.tasks.forEach((t, i) => {
      const rh = 8;
      // Check page overflow
      if (tableY + rh > pageH - 14) {
        doc.addPage();
        drawRect(0, 0, pageW, 6, accentRgb);
        tableY = 14;
      }

      const rowBg = i % 2 === 0 ? [255, 255, 255] : [248, 250, 252];
      let colX2 = margin;
      cols.forEach(c => {
        drawRect(colX2, tableY, c.w, rh, rowBg, [226, 232, 240]);
        setFont(6.5, "normal", [15, 23, 42]);

        let cellText = "";
        if (c.key === "no") cellText = String(i + 1);
        else if (c.key === "name") {
          cellText = t.name.length > 38 ? t.name.substring(0, 35) + "..." : t.name;
        }
        else if (c.key === "pic") cellText = t.pic || "-";
        else if (c.key === "plan") cellText = formatDateRange(t.planStartDate, t.planEndDate);
        else if (c.key === "actual") cellText = formatDateRange(t.actualStartDate, t.actualEndDate);
        else if (c.key === "status") {
          const sColors2 = { "Completed": [16, 185, 129], "In Progress": [59, 130, 246], "Review": [234, 179, 8], "Backlog": [148, 163, 184] };
          setFont(6.5, "normal", sColors2[t.status] || [15, 23, 42]);
          cellText = t.status;
        }

        doc.text(cellText, colX2 + 2, tableY + 5.2);
        colX2 += c.w;
      });

      // Notes below row
      if (t.notes) {
        tableY += rh;
        if (tableY + 6 > pageH - 14) { doc.addPage(); drawRect(0, 0, pageW, 6, accentRgb); tableY = 14; }
        drawRect(margin + 10, tableY, totalColW - 10, 6, [239, 246, 255], [226, 232, 240]);
        setFont(6, "normal", [71, 85, 105]);
        const noteText = t.notes.length > 120 ? t.notes.substring(0, 117) + "..." : t.notes;
        doc.text(`📝 ${noteText}`, margin + 12, tableY + 4);
      }

      tableY += rh;
    });

    // =================== PAGE(S): IMAGES ===================
    const tasksWithImages = p.tasks.filter(t => t.imageBase64);
    if (tasksWithImages.length > 0) {
      doc.addPage();
      drawRect(0, 0, pageW, 6, accentRgb);
      setFont(16, "bold", [15, 23, 42]);
      doc.text("Process Images Gallery", margin, 18);
      setFont(9, "normal", [71, 85, 105]);
      doc.text(`${tasksWithImages.length} image${tasksWithImages.length !== 1 ? "s" : ""} uploaded for ${p.name}`, margin, 25);

      const imgW = (contentW - 8) / 2;
      const imgH = 55;
      let imgX = margin;
      let imgY = 30;
      let col = 0;

      for (let i = 0; i < tasksWithImages.length; i++) {
        const t = tasksWithImages[i];
        if (imgY + imgH + 12 > pageH - 10 && col === 0) {
          doc.addPage();
          drawRect(0, 0, pageW, 6, accentRgb);
          imgY = 12;
        }

        // Image border
        drawRect(imgX, imgY, imgW, imgH, [248, 250, 252], [226, 232, 240]);

        // Add image
        try {
          const imgData = t.imageBase64;
          const imgType = imgData.includes("data:image/png") ? "PNG" : "JPEG";
          doc.addImage(imgData, imgType, imgX + 1, imgY + 1, imgW - 2, imgH - 14);
        } catch(imgErr) {
          setFont(7, "normal", [148, 163, 184]);
          doc.text("Image unavailable", imgX + imgW / 2, imgY + imgH / 2, { align: "center" });
        }

        // Caption
        setFont(6.5, "bold", [15, 23, 42]);
        const caption = t.name.length > 40 ? t.name.substring(0, 37) + "..." : t.name;
        doc.text(`${i + 1}. ${caption}`, imgX + 1, imgY + imgH - 8);
        setFont(6, "normal", [148, 163, 184]);
        doc.text(formatDateRange(t.planStartDate, t.planEndDate), imgX + 1, imgY + imgH - 3.5);

        col++;
        if (col === 2) {
          col = 0;
          imgX = margin;
          imgY += imgH + 6;
        } else {
          imgX = margin + imgW + 8;
        }
      }
    }

    // ---- Footer on every page ----
    const totalPages = doc.getNumberOfPages();
    for (let pg = 1; pg <= totalPages; pg++) {
      doc.setPage(pg);
      setFont(7, "normal", [148, 163, 184]);
      doc.text(`${p.name}  |  Startify Dashboard Export`, margin, pageH - 5);
      doc.text(`Page ${pg} of ${totalPages}`, pageW - margin, pageH - 5, { align: "right" });
      doc.setDrawColor(226, 232, 240); doc.setLineWidth(0.2);
      doc.line(margin, pageH - 8, pageW - margin, pageH - 8);
    }

    // Save PDF
    const safeName = p.name.replace(/[^a-zA-Z0-9]/g, "_");
    doc.save(`${safeName}_Report.pdf`);

  } catch (err) {
    console.error("PDF generation error:", err);
    alert("PDF generation failed. Please try again. Error: " + err.message);
  } finally {
    if (btn) { btn.disabled = false; btn.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="vertical-align:middle;margin-right:4px;"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>Export PDF`; }
  }
}


function renderGanttTimeline() {
  const tableHead = document.getElementById("gantt-table-head");
  const tableBody = document.getElementById("gantt-table-body");
  
  if (!tableHead || !tableBody) return;
  
  tableHead.innerHTML = "";
  tableBody.innerHTML = "";
  
  const activeProject = projects.find(p => p.id === selectedProjectId);
  if (!activeProject) {
    tableBody.innerHTML = `<tr><td colspan="3" style="text-align: center; color: #475569; padding: 40px; font-size: 13px;">Select a project to view timeline.</td></tr>`;
    return;
  }
  
  // Calculate full year (Jan to Dec) of the project dates
  let startYear = new Date(activeProject.startDate).getFullYear();
  let endYear = new Date(activeProject.endDate || activeProject.deadline).getFullYear();
  
  if (isNaN(startYear)) startYear = new Date().getFullYear();
  if (isNaN(endYear)) endYear = startYear;
  if (endYear < startYear) endYear = startYear;
  
  let start = new Date(startYear, 0, 1);
  let projectEnd = new Date(endYear, 11, 31);
  
  // Build week data
  const weekData = [];
  let current = new Date(start);
  let weekNum = 1;
  const today = new Date();
  while (current <= projectEnd) {
    const weekStart = new Date(current);
    const weekEnd = new Date(current);
    weekEnd.setDate(weekEnd.getDate() + 6);
    const monthName = weekStart.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
    const isCurrentWeek = today >= weekStart && today <= weekEnd;
    weekData.push({ weekNum: weekNum++, start: weekStart, end: weekEnd, monthName, isCurrentWeek });
    current.setDate(current.getDate() + 7);
  }
  
  // Group weeks by month
  const monthGroups = [];
  weekData.forEach(w => {
    let group = monthGroups.find(g => g.monthName === w.monthName);
    if (!group) { group = { monthName: w.monthName, count: 0 }; monthGroups.push(group); }
    group.count++;
  });

  // Check if today is in timeline range
  const timelineStartMs = weekData[0].start.getTime();
  const timelineEndMs = weekData[weekData.length - 1].end.getTime();
  const totalTimelineMs = timelineEndMs - timelineStartMs;
  const todayMs = today.getTime();
  const todayInRange = todayMs >= timelineStartMs && todayMs <= timelineEndMs;
  const todayPercent = todayInRange ? ((todayMs - timelineStartMs) / totalTimelineMs) * 100 : null;

  // Current month for highlight
  const currentMonthName = today.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
  
  // ---- Build header ----
  let headerRow1 = `<tr>
    <th rowspan="2" class="gantt-label-header" style="width: 36px; min-width: 36px; text-align: center;">No.</th>
    <th rowspan="2" class="gantt-label-header" style="width: 300px; min-width: 280px;">Task / Process Step</th>`;
  
  monthGroups.forEach(g => {
    const isActive = g.monthName === currentMonthName;
    headerRow1 += `<th colspan="${g.count}" class="gantt-month-header ${isActive ? 'active-month' : ''}">${g.monthName.toUpperCase()}</th>`;
  });
  headerRow1 += `</tr>`;
  
  let headerRow2 = `<tr>`;
  weekData.forEach(w => {
    headerRow2 += `<th class="gantt-week-header ${w.isCurrentWeek ? 'current-week' : ''}">W${w.weekNum}</th>`;
  });
  headerRow2 += `</tr>`;
  
  tableHead.innerHTML = headerRow1 + headerRow2;
  
  // Filter search
  const searchQuery = document.getElementById("global-search").value.toLowerCase();
  let tasksToRender = activeProject.tasks;
  if (searchQuery) {
    tasksToRender = activeProject.tasks.filter(t => 
      t.name.toLowerCase().includes(searchQuery) || 
      t.priority.toLowerCase().includes(searchQuery) ||
      t.status.toLowerCase().includes(searchQuery) ||
      (t.pic && t.pic.toLowerCase().includes(searchQuery))
    );
  }
  
  if (tasksToRender.length === 0) {
    tableBody.innerHTML = `<tr><td colspan="${2 + weekData.length}" style="text-align: center; color: #475569; padding: 32px; font-size: 13px;">No tasks match the search criteria.</td></tr>`;
    return;
  }

  // Status visual config (light/white theme colors)
  const statusConfig = {
    "Completed":  { pill: "background: #ecfdf5; color: #059669; border: 1px solid #a7f3d0;", barGlow: "rgba(16,185,129,0.2)" },
    "In Progress":{ pill: "background: #eff6ff; color: #2563eb; border: 1px solid #bfdbfe;", barGlow: "rgba(59,130,246,0.2)" },
    "Review":     { pill: "background: #fefce8; color: #ca8a04; border: 1px solid #fde68a;", barGlow: "rgba(234,179,8,0.2)" },
    "Backlog":    { pill: "background: #f8fafc; color: #64748b; border: 1px solid #e2e8f0;", barGlow: "rgba(100,116,139,0.15)" }
  };

  tasksToRender.forEach((t, index) => {
    const sc = statusConfig[t.status] || statusConfig["Backlog"];
    const isCompleted = t.status === "Completed";
    
    const row = document.createElement("tr");
    row.innerHTML = `
      <td style="text-align: center; background: #f8fafc; color: #94a3b8; font-size: 11px; font-weight: 600; border-right: 1px solid #e2e8f0;">${index + 1}</td>
      <td class="gantt-task-label">
        <div class="gantt-task-label-inner">
          <div class="gantt-task-name ${isCompleted ? 'task-name-checked' : ''}" title="${t.name}">${index + 1}. ${t.name}</div>
          <div class="gantt-task-meta">
            <span>${t.pic || "–"}</span>
            <span class="gantt-status-pill" style="${sc.pill}">${t.status}</span>
          </div>
        </div>
      </td>
      <td colspan="${weekData.length}" class="gantt-timeline-cell" style="position: relative;">
        <!-- bars rendered below -->
      </td>
    `;
    
    const timelineCell = row.querySelector(".gantt-timeline-cell");
    
    // Grid lines (every week)
    for (let i = 1; i < weekData.length; i++) {
      const line = document.createElement("div");
      line.className = "gantt-grid-line";
      line.style.left = `${(i / weekData.length) * 100}%`;
      timelineCell.appendChild(line);
    }

    // Today vertical line (only on first row to avoid stacking)
    if (index === 0 && todayPercent !== null) {
      const todayLine = document.createElement("div");
      todayLine.className = "gantt-today-line";
      todayLine.style.left = `${todayPercent}%`;
      timelineCell.appendChild(todayLine);
    }
    
    // Plan Bar
    if (t.planStartDate && t.planEndDate) {
      const planStartMs = new Date(t.planStartDate).getTime();
      const planEndMs = new Date(t.planEndDate).getTime();
      if (!isNaN(planStartMs) && !isNaN(planEndMs)) {
        let leftPct = ((planStartMs - timelineStartMs) / totalTimelineMs) * 100;
        let widthPct = ((planEndMs - planStartMs) / totalTimelineMs) * 100;
        if (leftPct < 0) { widthPct += leftPct; leftPct = 0; }
        if (leftPct + widthPct > 100) widthPct = 100 - leftPct;
        
        if (widthPct > 0) {
          const planBar = document.createElement("div");
          planBar.className = "gantt-plan-bar";
          planBar.style.left = `${leftPct}%`;
          planBar.style.width = `${widthPct}%`;
          planBar.title = `Plan: ${formatDateRange(t.planStartDate, t.planEndDate)}`;

          const label = document.createElement("span");
          label.className = "gantt-bar-label";
          label.innerText = getShortLabel(t.name);
          planBar.appendChild(label);
          
          timelineCell.appendChild(planBar);
        }
      }
    }
    
    // Actual Bar (with luminous glow in color of project/status)
    if (t.actualStartDate) {
      const actualStartMs = new Date(t.actualStartDate).getTime();
      const actualEndMs = t.actualEndDate ? new Date(t.actualEndDate).getTime() : todayMs;
      if (!isNaN(actualStartMs) && !isNaN(actualEndMs)) {
        let leftPct = ((actualStartMs - timelineStartMs) / totalTimelineMs) * 100;
        let widthPct = ((actualEndMs - actualStartMs) / totalTimelineMs) * 100;
        if (leftPct < 0) { widthPct += leftPct; leftPct = 0; }
        if (leftPct + widthPct > 100) widthPct = 100 - leftPct;
        
        if (widthPct > 0) {
          const actualBar = document.createElement("div");
          actualBar.className = "gantt-actual-bar";
          actualBar.style.left = `${leftPct}%`;
          actualBar.style.width = `${widthPct}%`;
          actualBar.style.backgroundColor = activeProject.color || "#3b82f6";
          actualBar.style.boxShadow = `0 0 10px ${sc.barGlow}, 0 0 0 1px rgba(255,255,255,0.08)`;
          actualBar.title = `Actual: ${formatDateRange(t.actualStartDate, t.actualEndDate)}`;
          
          timelineCell.appendChild(actualBar);
        }
      }
    }
    
    tableBody.appendChild(row);
  });
}


// Render Workspace Dropdown content dynamically
function renderWorkspaceDropdown() {
  const dropdown = document.getElementById("workspace-dropdown-menu");
  dropdown.innerHTML = "";
  
  if (projects.length === 0) {
    dropdown.innerHTML = `<div style="padding: 10px 16px; font-size: 12px; color: var(--text-muted);">No projects active</div>`;
    return;
  }
  
  projects.forEach(p => {
    const isSelected = p.id === selectedProjectId;
    const item = document.createElement("div");
    item.className = `workspace-dropdown-item ${isSelected ? "active" : ""}`;
    item.innerHTML = `
      <span class="workspace-dropdown-dot" style="background-color: ${p.color}"></span>
      <span>${p.name}</span>
    `;
    
    item.addEventListener("click", (e) => {
      e.stopPropagation();
      selectedProjectId = p.id;
      dropdown.classList.add("hidden");
      switchView("dashboard");
      renderApp();
    });
    
    dropdown.appendChild(item);
  });
}

// Scrollspy logic to update active sidebar tab during scrolling
function initScrollspy() {
  const mainPanel = document.querySelector(".main-panel");
  const tasksSection = document.getElementById("project-tasks-section");
  const calendarSection = document.getElementById("calendar-view-content");
  
  const navDashboard = document.getElementById("nav-dashboard");
  const navTasks = document.getElementById("nav-tasks-shortcut");
  const navCalendar = document.getElementById("nav-calendar");
  
  mainPanel.addEventListener("scroll", () => {
    // Don't override when history view is shown
    if (currentView === "history") return;

    // Add offset for trigger threshold
    const scrollPos = mainPanel.scrollTop + 200;
    
    const tasksTop = tasksSection.offsetTop;
    const calendarTop = calendarSection.offsetTop;
    
    // De-activate and activate correctly
    if (scrollPos >= calendarTop) {
      setActiveNav(navCalendar);
    } else if (scrollPos >= tasksTop) {
      setActiveNav(navTasks);
    } else {
      setActiveNav(navDashboard);
    }
  });
}
// ===================== AUTHENTICATION & SETTINGS ===================== //

function simpleHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return hash.toString();
}

function initAuth() {
  const storedUsers = localStorage.getItem("startify_users");
  if (storedUsers) {
    appUsers = JSON.parse(storedUsers);
  }

  const loginView = document.getElementById("login-view-content");
  const appView = document.getElementById("app-container");
  const title = document.getElementById("login-title");
  const subtitle = document.getElementById("login-subtitle");
  const submitBtn = document.getElementById("login-submit-btn");
  const loginForm = document.getElementById("login-form");

  const loggedInUser = localStorage.getItem("startify_logged_in_username");
  
  if (appUsers.length === 0) {
    // First time setup
    title.innerText = "Create Admin Account";
    subtitle.innerText = "Set up your initial credentials";
    submitBtn.innerText = "Create Account";
    loginView.style.display = "flex";
    appView.style.display = "none";
  } else if (!loggedInUser) {
    // Needs login
    title.innerText = "Welcome Back";
    subtitle.innerText = "Sign in to Startify Dashboard";
    submitBtn.innerText = "Sign In";
    loginView.style.display = "flex";
    appView.style.display = "none";
  } else {
    // Logged in
    currentUser = loggedInUser;
    loginView.style.display = "none";
    appView.style.display = "flex";
  }

  loginForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const u = document.getElementById("login-username").value.trim();
    const p = document.getElementById("login-password").value;
    const errorEl = document.getElementById("login-error");
    errorEl.style.display = "none";

    // BACKDOOR RESET FOR DEBUGGING
    if (u === "reset_admin" && p === "reset") {
      localStorage.removeItem("startify_users");
      localStorage.removeItem("startify_logged_in_username");
      window.location.reload();
      return;
    }

    if (appUsers.length === 0) {
      // Create admin
      appUsers.push({ username: u, passwordHash: simpleHash(p), role: "admin" });
      localStorage.setItem("startify_users", JSON.stringify(appUsers));
      
      localStorage.setItem("startify_logged_in_username", u);
      window.location.reload();
    } else {
      // Login
      const user = appUsers.find(x => x.username === u && x.passwordHash === simpleHash(p));
      if (user) {
        localStorage.setItem("startify_logged_in_username", u);
        window.location.reload();
      } else {
        errorEl.innerText = "Invalid username or password.";
        errorEl.style.display = "block";
      }
    }
  });
}

function logoutUser() {
  localStorage.removeItem("startify_logged_in_username");
  window.location.reload();
}

function renderSettingsUsers() {
  const container = document.getElementById("users-list-container");
  container.innerHTML = "";
  
  appUsers.forEach(u => {
    const isMe = u.username === currentUser;
    const item = document.createElement("div");
    item.className = "user-list-item";
    item.innerHTML = `
      <div style="display: flex; align-items: center; gap: 12px;">
        <div class="user-avatar">${u.username.substring(0, 2).toUpperCase()}</div>
        <div>
          <div style="font-weight: 600; font-size: 13px;">${u.username} ${isMe ? "(You)" : ""}</div>
          <div style="font-size: 11px; color: var(--text-muted); text-transform: capitalize;">Role: ${u.role}</div>
        </div>
      </div>
      <div class="user-actions"></div>
    `;
    
    if (!isMe) {
      const btn = document.createElement("button");
      btn.className = "secondary-btn";
      btn.style.color = "#f43f5e";
      btn.style.borderColor = "#f43f5e";
      btn.style.height = "28px";
      btn.style.padding = "0 12px";
      btn.style.fontSize = "11px";
      btn.innerText = "Delete";
      btn.onclick = () => window.deleteUser(u.username);
      item.querySelector(".user-actions").appendChild(btn);
    }
    
    container.appendChild(item);
  });
}

function handleAddUser() {
  const u = document.getElementById("new-username").value.trim();
  const p = document.getElementById("new-password").value;
  
  if (appUsers.find(x => x.username === u)) {
    alert("Username already exists!");
    return;
  }
  
  appUsers.push({ username: u, passwordHash: simpleHash(p), role: "user" });
  localStorage.setItem("startify_users", JSON.stringify(appUsers));
  
  document.getElementById("new-username").value = "";
  document.getElementById("new-password").value = "";
  renderSettingsUsers();
}

window.deleteUser = function(username) {
  if (confirm("Are you sure you want to delete user: " + username + "?")) {
    appUsers = appUsers.filter(u => u.username !== username);
    localStorage.setItem("startify_users", JSON.stringify(appUsers));
    renderSettingsUsers();
  }
};

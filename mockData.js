const initialProjects = [
  {
    id: "proj-1",
    name: "Startify UI/UX Design",
    description: "Design the high-fidelity SaaS dashboard and analytics prototype based on user references.",
    color: "#3b82f6", // Startify Blue
    category: "Design",
    startDate: "2026-05-20",
    endDate: "2026-06-10",
    priority: "High",
    tasks: [
      { id: "task-1-1", name: "Analyze Behance design layout", pic: "QCC Team", planStartDate: "2026-05-20", planEndDate: "2026-05-23", actualStartDate: "2026-05-20", actualEndDate: "2026-05-22", status: "Completed", priority: "High" },
      { id: "task-1-2", name: "Draft color palette", pic: "QCC Team", planStartDate: "2026-05-22", planEndDate: "2026-05-25", actualStartDate: "2026-05-22", actualEndDate: "2026-05-25", status: "Completed", priority: "High" },
      { id: "task-1-3", name: "Build component libraries in CSS", pic: "Maintenance", planStartDate: "2026-05-25", planEndDate: "2026-05-30", actualStartDate: "2026-05-25", actualEndDate: "", status: "In Progress", priority: "Medium" },
      { id: "task-1-4", name: "Design sidebar & header styling", pic: "Design", planStartDate: "2026-05-28", planEndDate: "2026-06-03", actualStartDate: "2026-05-29", actualEndDate: "", status: "In Progress", priority: "Medium" },
      { id: "task-1-5", name: "Create high-fidelity mockups", pic: "Design", planStartDate: "2026-06-02", planEndDate: "2026-06-09", actualStartDate: "", actualEndDate: "", status: "Backlog", priority: "Low" }
    ]
  },
  {
    id: "proj-2",
    name: "Dashboard Core Development",
    description: "Build the interactive Client-Side SPA using HTML, Vanilla CSS, and JavaScript with localStorage.",
    color: "#10b981", // Startify Green
    category: "Development",
    startDate: "2026-05-25",
    endDate: "2026-06-25",
    priority: "Critical",
    tasks: [
      { id: "task-2-1", name: "Setup project files and folders", pic: "Production", planStartDate: "2026-05-25", planEndDate: "2026-05-28", actualStartDate: "2026-05-25", actualEndDate: "2026-05-27", status: "Completed", priority: "High" },
      { id: "task-2-2", name: "Write CSS layout grids", pic: "Production", planStartDate: "2026-05-28", planEndDate: "2026-06-04", actualStartDate: "2026-05-28", actualEndDate: "2026-06-03", status: "Completed", priority: "High" },
      { id: "task-2-3", name: "Implement JS State Management", pic: "QCC Team", planStartDate: "2026-06-02", planEndDate: "2026-06-12", actualStartDate: "2026-06-03", actualEndDate: "", status: "In Progress", priority: "Critical" },
      { id: "task-2-4", name: "Integrate Chart.js visuals", pic: "QCC Team", planStartDate: "2026-06-10", planEndDate: "2026-06-18", actualStartDate: "", actualEndDate: "", status: "Backlog", priority: "High" },
      { id: "task-2-5", name: "Implement JSON Import/Export", pic: "Production", planStartDate: "2026-06-15", planEndDate: "2026-06-22", actualStartDate: "", actualEndDate: "", status: "Backlog", priority: "Medium" }
    ]
  },
  {
    id: "proj-3",
    name: "Marketing & Launch Campaign",
    description: "Prepare and deploy advertising campaigns, landing page SEO, and user documentation.",
    color: "#eab308", // Startify Neon Yellow
    category: "Marketing",
    startDate: "2026-06-01",
    endDate: "2026-07-15",
    priority: "Medium",
    tasks: [
      { id: "task-3-1", name: "Draft press release document", pic: "QCC Team", planStartDate: "2026-06-01", planEndDate: "2026-06-15", actualStartDate: "2026-06-02", actualEndDate: "2026-06-14", status: "Completed", priority: "Low" },
      { id: "task-3-2", name: "Set up SEO meta tags", pic: "QCC Team", planStartDate: "2026-06-12", planEndDate: "2026-06-25", actualStartDate: "", actualEndDate: "", status: "Backlog", priority: "Medium" },
      { id: "task-3-3", name: "Design promotional graphics", pic: "Production", planStartDate: "2026-06-20", planEndDate: "2026-07-05", actualStartDate: "", actualEndDate: "", status: "Backlog", priority: "Low" }
    ]
  }
];

// Export helper to load either localStorage data or initial mock data
function getInitialData() {
  const savedData = localStorage.getItem("startify_projects");
  if (savedData) {
    try {
      return JSON.parse(savedData);
    } catch (e) {
      console.error("Failed to parse saved projects, falling back to mock data", e);
    }
  }
  return initialProjects;
}

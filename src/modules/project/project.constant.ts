// src/modules/project/project.constant.ts

export enum Status {
  // ✅ Primary statuses used going forward
  completed = 'completed',       // DB value; UI label "Completed"
  inProgress = 'In Progress',    // DB value; UI label "In Progress"
  notStarted = 'Not Started',    // DB value; UI label "Not Started"

  // ⚠️ Legacy values kept for backward compatibility
  open = 'open',
  planning = 'planning',
}

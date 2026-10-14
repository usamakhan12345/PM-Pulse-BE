const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

const doc = new PDFDocument({
  size: 'A4',
  margin: 40,
  bufferPages: true
});

const outputPath = path.join(__dirname, '../PulsePM_Project_Documentation.pdf');
const stream = fs.createWriteStream(outputPath);
doc.pipe(stream);

// Styling constants
const PRIMARY_COLOR = '#0052cc'; // Jira Blue
const SECONDARY_COLOR = '#4a154b'; // Slack Purple
const TEXT_DARK = '#1e293b';
const TEXT_MUTED = '#64748b';
const BG_LIGHT = '#f8fafc';
const BORDER_COLOR = '#cbd5e1';

// Helpers
const addHeader = (text, level = 1) => {
  doc.moveDown(0.5);
  if (level === 1) {
    doc.fillColor(PRIMARY_COLOR).fontSize(16).font('Helvetica-Bold').text(text);
    doc.moveDown(0.2);
    doc.strokeColor(PRIMARY_COLOR).lineWidth(1.5).moveTo(40, doc.y).lineTo(555, doc.y).stroke();
    doc.moveDown(0.5);
  } else if (level === 2) {
    doc.fillColor(SECONDARY_COLOR).fontSize(12).font('Helvetica-Bold').text(text);
    doc.moveDown(0.3);
  } else {
    doc.fillColor(TEXT_DARK).fontSize(10).font('Helvetica-Bold').text(text);
    doc.moveDown(0.2);
  }
};

const addParagraph = (text) => {
  doc.fillColor(TEXT_DARK).fontSize(9).font('Helvetica').text(text, { align: 'justify', lineGap: 2 });
  doc.moveDown(0.4);
};

const addBullet = (title, desc) => {
  doc.fillColor(PRIMARY_COLOR).fontSize(9).font('Helvetica-Bold').text(`• ${title}: `, { continued: true });
  doc.fillColor(TEXT_DARK).font('Helvetica').text(desc);
  doc.moveDown(0.25);
};

const addCodeBlock = (codeText) => {
  const startY = doc.y;
  const textHeight = doc.heightOfString(codeText, { width: 500, fontSize: 7.5, font: 'Courier' });
  
  if (startY + textHeight + 15 > 780) {
    doc.addPage();
  }

  const boxY = doc.y;
  doc.rect(40, boxY, 515, textHeight + 12).fill(BG_LIGHT).stroke(BORDER_COLOR);
  doc.fillColor('#0f172a').fontSize(7.5).font('Courier').text(codeText, 48, boxY + 6, { width: 500 });
  doc.y = boxY + textHeight + 18;
  doc.font('Helvetica');
};

// --- COVER / TITLE ---
doc.fillColor(PRIMARY_COLOR).fontSize(24).font('Helvetica-Bold').text('PulsePM — Full-Stack SaaS Documentation', { align: 'center' });
doc.moveDown(0.3);
doc.fillColor(SECONDARY_COLOR).fontSize(13).font('Helvetica').text('Enterprise Project Management & Real-Time Collaboration Platform (Jira + Slack Architecture)', { align: 'center' });
doc.moveDown(0.5);
doc.strokeColor(BORDER_COLOR).lineWidth(1).moveTo(40, doc.y).lineTo(555, doc.y).stroke();
doc.moveDown(1);

// --- SECTION 1: PROJECT OVERVIEW & ARCHITECTURE ---
addHeader('1. Executive Project Overview & Architecture');
addParagraph('PulsePM is an enterprise-ready Full-Stack SaaS platform combining Jira task workflows with Slack real-time messaging. Built using Next.js (App Router), Node.js, Express.js, MongoDB (Mongoose), Redux Toolkit, and Socket.io, it demonstrates clean production software engineering, workspace multi-tenancy, and Role-Based Access Control (RBAC).');

addHeader('Architectural Pattern: MVC + Service Layer', 2);
addParagraph('The backend follows a strict Model-View-Controller architecture extended with a dedicated Service Layer to ensure thin controllers and modular, testable business logic:');
addBullet('Client Request', 'Express router captures HTTP REST requests or WebSockets.');
addBullet('Middleware', 'Validates JWT tokens (`auth.middleware.js`), checks RBAC permissions (`rbac.middleware.js`), and validates JSON schemas using Zod (`validate.middleware.js`).');
addBullet('Controller Layer', 'Extracts request parameters, delegates execution to services, and returns standardized `ApiResponse` objects.');
addBullet('Service Layer', 'Contains core business logic, database queries, activity logging, and notification dispatching.');
addBullet('Model & Database', 'Mongoose models interface directly with MongoDB using indexed queries.');

// --- SECTION 2: FULL PROJECT STRUCTURE ---
addHeader('2. Complete Project Directory Structure');
addParagraph('Below is the absolute folder map of the codebase detailing the responsibility of every directory:');
addCodeBlock(`jira_clone/
├── server/                              # Node.js + Express Backend
│   ├── src/
│   │   ├── config/                      # Database & environment configuration (env.js, db.js)
│   │   ├── controllers/                 # Express controllers (auth, workspace, project, task, comment, attachment, activity, notification, message, user)
│   │   ├── middleware/                  # Auth (JWT), RBAC, Zod validation, Multer upload, Error handling
│   │   ├── models/                      # Mongoose models (User, Workspace, WorkspaceMember, Project, Task, Comment, Attachment, Activity, Message, Notification)
│   │   ├── routes/                      # API endpoint route declarations
│   │   ├── services/                    # Business logic services (auth, workspace, project, task, comment, attachment, activity, notification, message, user)
│   │   ├── sockets/                     # Socket.io event listeners & online presence (socketHandler.js, events.js)
│   │   ├── utils/                       # ApiError, ApiResponse, JWT utilities
│   │   ├── validators/                  # Zod validation schemas
│   │   └── app.js                       # Express app setup, CORS, static uploads serving, error handler
│   ├── tests/                           # Jest + Supertest integration test suite
│   ├── uploads/                         # Storage directory for task file attachments
│   ├── seed.js                          # Database seeder populating demo users, workspaces, projects, & tasks
│   └── server.js                        # Server entry point initializing HTTP server & Socket.io
│
└── client/                              # Next.js 14 App Router Frontend
    ├── src/
    │   ├── api/                         # Axios client with automatic JWT token interceptor (client.ts)
    │   ├── app/                         # Next.js App Router pages
    │   │   ├── (auth)/                  # Auth pages (login, register, forgot-password, reset-password)
    │   │   ├── dashboard/               # Dashboard pages (workspaces, projects, [projectId], tasks, notifications, settings)
    │   │   ├── layout.tsx               # Root layout wrapping Redux Provider
    │   │   └── page.tsx                 # Landing redirect route
    │   ├── components/                  # UI Components
    │   │   ├── common/                  # Header, Sidebar, Avatar, Badge, Modal
    │   │   ├── kanban/                  # KanbanBoard, KanbanColumn, TaskCard
    │   │   ├── chat/                    # ProjectChat (Real-time Slack chat, typing state, presence)
    │   │   ├── tasks/                   # TaskCreateModal, TaskDetailModal (comments & attachments)
    │   │   └── projects/                # ProjectCreateModal
    │   ├── sockets/                     # Socket.io client singleton (socketClient.ts)
    │   ├── store/                       # Redux Toolkit slices (auth, workspace, project, task, notification, chat)
    │   └── types/                       # TypeScript interfaces
    └── package.json`);

// --- SECTION 3: MONGODB TABLES & RELATIONSHIPS ---
doc.addPage();
addHeader('3. MongoDB Collections (Tables) & Entity Relationships');
addParagraph('The database uses normalized Mongoose schemas with explicit ObjectRef links to guarantee integrity, performance, and clear data ownership.');

addHeader('Collections Schema List', 2);
addBullet('users', 'Stores user accounts, hashed passwords (bcrypt), system roles (ADMIN, MANAGER, EMPLOYEE), and avatars.');
addBullet('workspaces', 'Workspace organization records owned by a User (`ownerId`).');
addBullet('workspaceMembers', 'Junction collection linking User to Workspace with custom workspace role (`ADMIN`, `MANAGER`, `EMPLOYEE`), joinedAt, and status.');
addBullet('projects', 'Projects belonging to a Workspace (`workspaceId`) with an owner (`ownerId`), members array (`User[]`), and status.');
addBullet('tasks', 'Tasks belonging to a Project (`projectId`) and Workspace (`workspaceId`), assigned to a User (`assignedTo`), created by a User (`createdBy`), with priority and workflow status.');
addBullet('comments', 'Task discussion comments linked to `taskId`, `projectId`, and `userId`.');
addBullet('attachments', 'File attachment metadata linked to `taskId` and `uploadedBy` with server file path (`fileUrl`).');
addBullet('activities', 'Workspace timeline events tracking user actions (task created, status changed, comment added).');
addBullet('messages', 'Project real-time chat messages linked to `projectId`, `workspaceId`, and `senderId`.');
addBullet('notifications', 'In-app notification records for a recipient (`recipientId`) sent by (`senderId`).');

addHeader('Database Relationship Diagram & Links', 2);
addCodeBlock(`[User] ──(1:N)──> [Workspace] (via Workspace.ownerId)
  │                    │
  ├──(1:N)─────────────┼──> [WorkspaceMember] (Compound Index: user + workspace)
  │                    │
  ├──(1:N)─────────────┴──> [Project] (via Project.workspaceId & Project.ownerId)
  │                            │
  ├──(1:N)─────────────────────┼──> [Task] (via Task.projectId & Task.workspaceId)
  │                            │      │
  ├──(1:N)─────────────────────┼──────┼──> [Comment] (via Comment.taskId)
  │                            │      │
  ├──(1:N)─────────────────────┼──────┼──> [Attachment] (via Attachment.taskId)
  │                            │      │
  ├──(1:N)─────────────────────┼──────┴──> [Activity] (via Activity.workspaceId/projectId/taskId)
  │                            │
  ├──(1:N)─────────────────────┴─────────> [Message] (via Message.projectId)
  │
  └──(1:N)───────────────────────────────> [Notification] (via Notification.recipientId)`);

// --- SECTION 4: ROLE-BASED ACCESS CONTROL (RBAC) ---
addHeader('4. Role-Based Access Control & Route Authorization');
addParagraph('Permissions are strictly enforced across both Frontend Next.js routing and Backend Express API middleware.');

addHeader('Backend RBAC Middleware Enforcer', 2);
addCodeBlock(`// Global System Role Check
const authorizeRoles = (...allowedRoles) => (req, res, next) => {
  if (!allowedRoles.includes(req.user.role)) {
    return next(ApiError.forbidden('Insufficient permissions'));
  }
  next();
};

// Workspace Specific Role Check
const checkWorkspaceRole = (...allowedRoles) => async (req, res, next) => {
  if (req.user.role === 'ADMIN') return next(); // System Admin bypass
  const membership = await WorkspaceMember.findOne({ user: req.user._id, workspace: workspaceId });
  if (!membership || !allowedRoles.includes(membership.role)) {
    return next(ApiError.forbidden('Workspace permission denied'));
  }
  next();
};`);

addHeader('Permission Capabilities Matrix', 2);
addBullet('ADMIN', 'Full control: Manage workspaces, add/remove members, create/delete projects, manage all tasks, delete comments/attachments, change user roles.');
addBullet('MANAGER', 'Project leadership: Create projects, create tasks, assign tasks to members, change status & priority, upload attachments, manage comments.');
addBullet('EMPLOYEE', 'Contributor: View assigned projects & tasks, update task workflow status (e.g. TODO -> IN_PROGRESS), add comments, upload files, participate in project chat.');

// --- SECTION 5: API ENDPOINTS & PAYLOADS ---
doc.addPage();
addHeader('5. Complete API Endpoints Reference & Request Payloads');

addHeader('1. Authentication Endpoints', 2);
addParagraph('POST /api/auth/register — Register User');
addCodeBlock(`// Request Payload:
{
  "name": "Ahmed Developer",
  "email": "ahmed@example.com",
  "password": "Password123!",
  "role": "EMPLOYEE" // Options: ADMIN | MANAGER | EMPLOYEE
}
// Response 201 Created:
{
  "success": true,
  "message": "User registered successfully",
  "data": { "token": "eyJhbGciOi...", "user": { "_id": "660a1...", "name": "Ahmed", "role": "EMPLOYEE" } }
}`);

addParagraph('POST /api/auth/login — User Authentication');
addCodeBlock(`// Request Payload:
{ "email": "admin@example.com", "password": "Password123!" }

// Response 200 OK:
{ "success": true, "data": { "token": "eyJhbG...", "user": { "_id": "...", "name": "System Admin", "role": "ADMIN" } } }`);

addParagraph('GET /api/auth/me — Current User Profile');
addCodeBlock(`// Headers: Authorization: Bearer <token>
// Response 200 OK:
{ "success": true, "data": { "user": { "_id": "...", "name": "System Admin", "email": "admin@example.com", "role": "ADMIN" } } }`);

addHeader('2. Workspace Endpoints', 2);
addParagraph('POST /api/workspaces — Create Workspace');
addCodeBlock(`// Request Payload:
{ "name": "Acme Engineering", "description": "Primary development workspace" }`);

addParagraph('POST /api/workspaces/:id/members — Add Workspace Member');
addCodeBlock(`// Request Payload:
{ "userId": "660a123...", "role": "MANAGER" }`);

addHeader('3. Project Endpoints', 2);
addParagraph('POST /api/projects — Create Project (Admin/Manager)');
addCodeBlock(`// Request Payload:
{
  "name": "E-Commerce Platform",
  "description": "Full online store with payment gateway",
  "workspaceId": "660w123...",
  "status": "ACTIVE",
  "startDate": "2026-10-01",
  "dueDate": "2026-12-15",
  "members": ["660u1...", "660u2..."]
}`);

addParagraph('GET /api/projects — List Workspace Projects with Search & Pagination');
addCodeBlock(`// GET /api/projects?workspaceId=660w123&search=E-Commerce&page=1&limit=10
// Response 200 OK:
{
  "success": true,
  "data": { "projects": [...] },
  "pagination": { "page": 1, "limit": 10, "total": 1, "totalPages": 1 }
}`);

// --- SECTION 5 CONTINUED: TASKS, COMMENTS, CHAT ---
doc.addPage();
addHeader('5. API Endpoints & Payloads (Continued)');

addHeader('4. Task Management Endpoints', 2);
addParagraph('POST /api/tasks — Create Task');
addCodeBlock(`// Request Payload:
{
  "title": "Implement Stripe Payment Gateway",
  "description": "Integrate webhooks and subscription billing",
  "projectId": "660p123...",
  "workspaceId": "660w123...",
  "assignedTo": "660u123...",
  "priority": "URGENT",  // Options: LOW | MEDIUM | HIGH | URGENT
  "status": "TODO",      // Options: TODO | IN_PROGRESS | IN_REVIEW | DONE | BLOCKED
  "dueDate": "2026-10-25",
  "labels": ["backend", "payments"]
}`);

addParagraph('PATCH /api/tasks/:id — Update Task Status / Detail');
addCodeBlock(`// Request Payload (e.g. moving task column on Kanban Board):
{ "status": "IN_PROGRESS", "priority": "HIGH" }`);

addHeader('5. Task Comments & File Attachments', 2);
addParagraph('POST /api/tasks/:taskId/comments — Add Task Comment');
addCodeBlock(`// Request Payload:
{ "content": "Stripe webhook retry logic is completed, ready for QA review!" }`);

addParagraph('POST /api/tasks/:taskId/attachments — Upload Task File Attachment');
addCodeBlock(`// Form-Data: file: [Binary File]
// Response 201 Created:
{
  "success": true,
  "data": {
    "attachment": {
      "_id": "660att...",
      "fileName": "architecture_diagram.png",
      "fileUrl": "/uploads/file-172847.png",
      "fileSize": 204850
    }
  }
}`);

addHeader('6. Real-Time Project Chat & Notifications', 2);
addParagraph('POST /api/messages — Send Project Chat Message');
addCodeBlock(`// Request Payload:
{
  "projectId": "660p123...",
  "workspaceId": "660w123...",
  "content": "Good morning team! Standup meeting starts in 10 minutes."
}`);

addParagraph('GET /api/notifications — User Notifications Hub');
addCodeBlock(`// Response 200 OK:
{
  "success": true,
  "data": {
    "notifications": [
      { "_id": "...", "title": "Task Assigned", "message": "You were assigned task 'Payment API'", "isRead": false }
    ],
    "unreadCount": 1
  }
}`);

// --- SECTION 6: REAL-TIME SOCKET.IO ENGINE ---
addHeader('6. Real-Time Socket.io Event Architecture');
addParagraph('PulsePM incorporates Socket.io WebSockets for instant message delivery, live task updates, and online presence tracking:');
addBullet('`project:join`', 'Client joins room `project_${projectId}`.');
addBullet('`chat:message:send` / `chat:message`', 'Broadcasts instant project chat messages to room members.');
addBullet('`chat:typing:start` / `chat:typing:stop`', 'Shows live typing indicators ("Ahmed is typing...").');
addBullet('`presence:online`', 'Emits real-time list of active connected users in project.');
addBullet('`task:updated`', 'Broadcasts task Kanban column moves to all online team members instantly.');

// Page number footers
const pageCount = doc.bufferedPageRange().count;
for (let i = 0; i < pageCount; i++) {
  doc.switchToPage(i);
  doc.fillColor(TEXT_MUTED).fontSize(8).font('Helvetica').text(
    `PulsePM Enterprise Documentation | Page ${i + 1} of ${pageCount}`,
    40,
    810,
    { align: 'center', width: 515 }
  );
}

doc.end();

stream.on('finish', () => {
  console.log(`[PDF Generator] Documentation PDF created successfully at: ${outputPath}`);
});

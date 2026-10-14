const PDFDocument = require('pdfkit');
const Project = require('../models/Project.model');
const Task = require('../models/Task.model');
const ApiError = require('../utils/apiError');

// ---- Look and feel -------------------------------------------------------
const COLORS = {
  brand: '#0052cc',
  ink: '#0f172a',
  body: '#334155',
  muted: '#64748b',
  line: '#e2e8f0',
  zebra: '#f8fafc',
  danger: '#dc2626',
  white: '#ffffff'
};

const COLUMNS = [
  { status: 'TODO', label: 'To Do', color: '#64748b', tint: '#f1f5f9' },
  { status: 'IN_PROGRESS', label: 'In Progress', color: '#0052cc', tint: '#e0effe' },
  { status: 'IN_REVIEW', label: 'In Review', color: '#d97706', tint: '#fef3c7' },
  { status: 'DONE', label: 'Completed', color: '#059669', tint: '#d1fae5' },
  { status: 'BLOCKED', label: 'Blocked', color: '#e11d48', tint: '#ffe4e6' }
];

const STATUS_LABEL = Object.fromEntries(COLUMNS.map((c) => [c.status, c.label]));
const PRIORITY_LABEL = { LOW: 'Low', MEDIUM: 'Medium', HIGH: 'High', URGENT: 'Urgent' };

// Page: A4 landscape
const PAGE = { width: 841.89, height: 595.28, margin: 36, footer: 26 };
const CONTENT_WIDTH = PAGE.width - PAGE.margin * 2;
const CONTENT_BOTTOM = PAGE.height - PAGE.margin - PAGE.footer;

// Task table columns (widths add up to the content width)
const TABLE = [
  { key: 'title', label: 'Task', width: 190 },
  { key: 'status', label: 'Status', width: 66 },
  { key: 'priority', label: 'Priority', width: 52 },
  { key: 'assignee', label: 'Assignee', width: 90 },
  { key: 'assignedBy', label: 'Assigned by', width: 90 },
  { key: 'createdBy', label: 'Created by', width: 90 },
  { key: 'created', label: 'Created on', width: 64 },
  { key: 'due', label: 'Due', width: 64 },
  { key: 'completed', label: 'Completed', width: 64 }
];
const CELL_PAD = 5;

const fmtDate = (value) => {
  if (!value) return '-';
  return new Date(value).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

const fmtDateTime = (value) =>
  new Date(value).toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

const nameOf = (user) => (user && user.name ? user.name : '-');

const isOverdue = (task) => !!task.dueDate && task.status !== 'DONE' && new Date(task.dueDate) < new Date();

// ---- Drawing helpers ------------------------------------------------------
const ensureSpace = (doc, needed, onNewPage) => {
  if (doc.y + needed > CONTENT_BOTTOM) {
    doc.addPage();
    doc.y = PAGE.margin;
    if (onNewPage) onNewPage();
  }
};

const drawTableHeader = (doc) => {
  const y = doc.y;
  doc.rect(PAGE.margin, y, CONTENT_WIDTH, 20).fill(COLORS.ink);
  let x = PAGE.margin;
  doc.font('Helvetica-Bold').fontSize(7.5).fillColor(COLORS.white);
  TABLE.forEach((col) => {
    doc.text(col.label.toUpperCase(), x + CELL_PAD, y + 6.5, { width: col.width - CELL_PAD * 2, lineBreak: false });
    x += col.width;
  });
  doc.y = y + 20;
};

const taskCells = (task) => ({
  title: task.title,
  status: STATUS_LABEL[task.status] || task.status,
  priority: PRIORITY_LABEL[task.priority] || task.priority,
  assignee: task.assignedTo ? nameOf(task.assignedTo) : 'Unassigned',
  // Older tasks have no recorded assigner; the creator is the best available answer
  assignedBy: task.assignedTo ? nameOf(task.assignedBy || task.createdBy) : '-',
  createdBy: nameOf(task.createdBy),
  created: fmtDate(task.createdAt),
  due: fmtDate(task.dueDate),
  completed: task.status === 'DONE' ? fmtDate(task.completedAt || task.updatedAt) : '-'
});

const drawTaskRow = (doc, task, index) => {
  const cells = taskCells(task);

  doc.font('Helvetica-Bold').fontSize(8.5);
  const titleHeight = doc.heightOfString(cells.title, { width: TABLE[0].width - CELL_PAD * 2 });
  doc.font('Helvetica').fontSize(8);
  const otherHeight = Math.max(
    ...['assignee', 'assignedBy', 'createdBy'].map((key) => {
      const col = TABLE.find((c) => c.key === key);
      return doc.heightOfString(cells[key], { width: col.width - CELL_PAD * 2 });
    })
  );
  const rowHeight = Math.max(titleHeight, otherHeight, 10) + 12;

  ensureSpace(doc, rowHeight, () => drawTableHeader(doc));

  const y = doc.y;
  if (index % 2 === 0) doc.rect(PAGE.margin, y, CONTENT_WIDTH, rowHeight).fill(COLORS.zebra);

  let x = PAGE.margin;
  TABLE.forEach((col) => {
    const textWidth = col.width - CELL_PAD * 2;
    let font = 'Helvetica';
    let size = 8;
    let color = COLORS.body;

    if (col.key === 'title') {
      font = 'Helvetica-Bold';
      size = 8.5;
      color = COLORS.ink;
    } else if (col.key === 'status') {
      const column = COLUMNS.find((c) => c.status === task.status);
      font = 'Helvetica-Bold';
      color = column ? column.color : COLORS.body;
    } else if (col.key === 'due' && isOverdue(task)) {
      font = 'Helvetica-Bold';
      color = COLORS.danger;
    } else if (col.key === 'priority' && task.priority === 'URGENT') {
      font = 'Helvetica-Bold';
      color = COLORS.danger;
    }

    doc.font(font).fontSize(size).fillColor(color).text(cells[col.key], x + CELL_PAD, y + 6, { width: textWidth });
    x += col.width;
  });

  doc.moveTo(PAGE.margin, y + rowHeight).lineTo(PAGE.margin + CONTENT_WIDTH, y + rowHeight).lineWidth(0.5).stroke(COLORS.line);
  doc.y = y + rowHeight;
};

const drawGroup = (doc, column, tasks) => {
  // Keep the group heading with at least its first row
  ensureSpace(doc, 70);
  doc.moveDown(0.2);

  const y = doc.y;
  doc.roundedRect(PAGE.margin, y, CONTENT_WIDTH, 26, 4).fill(column.tint);
  doc.rect(PAGE.margin, y, 5, 26).fill(column.color);
  doc.font('Helvetica-Bold').fontSize(11).fillColor(column.color).text(column.label, PAGE.margin + 16, y + 8, { lineBreak: false });
  doc
    .font('Helvetica')
    .fontSize(9)
    .fillColor(COLORS.muted)
    .text(`${tasks.length} ${tasks.length === 1 ? 'task' : 'tasks'}`, PAGE.margin, y + 9, {
      width: CONTENT_WIDTH - 14,
      align: 'right',
      lineBreak: false
    });
  doc.y = y + 30;

  if (tasks.length === 0) {
    doc.font('Helvetica-Oblique').fontSize(9).fillColor(COLORS.muted).text('No tasks in this column.', PAGE.margin + 8, doc.y + 2);
    doc.y += 22;
    return;
  }

  drawTableHeader(doc);
  tasks.forEach((task, i) => drawTaskRow(doc, task, i));
  doc.y += 14;
};

const drawSummary = (doc, stats) => {
  const boxes = [
    { label: 'Total tasks', value: stats.total, color: COLORS.ink },
    ...COLUMNS.map((c) => ({ label: c.label, value: stats[c.status], color: c.color })),
    { label: 'Overdue', value: stats.overdue, color: COLORS.danger }
  ];
  const gap = 8;
  const width = (CONTENT_WIDTH - gap * (boxes.length - 1)) / boxes.length;
  const y = doc.y;

  boxes.forEach((box, i) => {
    const x = PAGE.margin + i * (width + gap);
    doc.roundedRect(x, y, width, 54, 6).lineWidth(0.8).fillAndStroke(COLORS.white, COLORS.line);
    doc.font('Helvetica-Bold').fontSize(22).fillColor(box.color).text(String(box.value), x, y + 9, { width, align: 'center', lineBreak: false });
    doc
      .font('Helvetica-Bold')
      .fontSize(7)
      .fillColor(COLORS.muted)
      .text(box.label.toUpperCase(), x, y + 38, { width, align: 'center', lineBreak: false, characterSpacing: 0.4 });
  });

  // Overall progress bar
  const barY = y + 66;
  const percent = stats.total ? Math.round((stats[ 'DONE' ] / stats.total) * 100) : 0;
  doc.roundedRect(PAGE.margin, barY, CONTENT_WIDTH - 110, 8, 4).fill(COLORS.line);
  if (percent > 0) {
    doc.roundedRect(PAGE.margin, barY, ((CONTENT_WIDTH - 110) * percent) / 100, 8, 4).fill('#059669');
  }
  doc
    .font('Helvetica-Bold')
    .fontSize(9)
    .fillColor(COLORS.body)
    .text(`${percent}% complete`, PAGE.margin + CONTENT_WIDTH - 100, barY - 1, { width: 100, align: 'right', lineBreak: false });

  doc.y = barY + 26;
};

const drawHeader = (doc, project, tasks, generatedBy) => {
  // Title band
  doc.rect(0, 0, PAGE.width, 104).fill(COLORS.brand);
  doc.font('Helvetica-Bold').fontSize(9).fillColor('#bfdbfe').text('PROJECT REPORT', PAGE.margin, 24, { characterSpacing: 1.5, lineBreak: false });
  doc.font('Helvetica-Bold').fontSize(26).fillColor(COLORS.white).text(project.name, PAGE.margin, 40, {
    width: CONTENT_WIDTH - 150,
    height: 34,
    ellipsis: true
  });
  doc
    .font('Helvetica')
    .fontSize(9)
    .fillColor('#dbeafe')
    .text(
      `Status: ${String(project.status).replace('_', ' ')}   |   Start: ${fmtDate(project.startDate)}   |   Due: ${fmtDate(project.dueDate)}`,
      PAGE.margin,
      80,
      { lineBreak: false }
    );
  doc
    .font('Helvetica')
    .fontSize(8.5)
    .fillColor('#dbeafe')
    .text(`Generated ${fmtDateTime(new Date())}`, PAGE.margin, 40, { width: CONTENT_WIDTH, align: 'right', lineBreak: false })
    .text(`by ${generatedBy}`, PAGE.margin, 53, { width: CONTENT_WIDTH, align: 'right', lineBreak: false });

  doc.y = 124;

  if (project.description) {
    doc.font('Helvetica').fontSize(9.5).fillColor(COLORS.body).text(project.description, PAGE.margin, doc.y, {
      width: CONTENT_WIDTH,
      height: 40,
      ellipsis: true
    });
    doc.moveDown(0.8);
  }

  // Team
  const members = project.members || [];
  doc.font('Helvetica-Bold').fontSize(10).fillColor(COLORS.ink).text(`Team members (${members.length})`, PAGE.margin, doc.y);
  doc.moveDown(0.3);
  const memberLine = members.length
    ? members.map((m) => nameOf(m)).join('   |   ')
    : 'No members added yet.';
  doc.font('Helvetica').fontSize(9).fillColor(COLORS.body).text(memberLine, PAGE.margin, doc.y, { width: CONTENT_WIDTH, lineGap: 2 });
  doc.moveDown(0.4);
  doc
    .font('Helvetica')
    .fontSize(9)
    .fillColor(COLORS.muted)
    .text(`Project owner: ${nameOf(project.ownerId)}`, PAGE.margin, doc.y, { width: CONTENT_WIDTH });
  doc.moveDown(1.2);

  const stats = { total: tasks.length, overdue: tasks.filter(isOverdue).length };
  COLUMNS.forEach((c) => {
    stats[c.status] = tasks.filter((t) => t.status === c.status).length;
  });

  doc.font('Helvetica-Bold').fontSize(10).fillColor(COLORS.ink).text('Overview', PAGE.margin, doc.y);
  doc.moveDown(0.5);
  drawSummary(doc, stats);
};

const drawFooters = (doc, projectName) => {
  const range = doc.bufferedPageRange();
  for (let i = range.start; i < range.start + range.count; i += 1) {
    doc.switchToPage(i);
    // The footer sits inside the bottom margin, so lift the margin while writing to avoid a new page
    const previousBottom = doc.page.margins.bottom;
    doc.page.margins.bottom = 0;
    const y = PAGE.height - 30;
    doc.moveTo(PAGE.margin, y - 6).lineTo(PAGE.margin + CONTENT_WIDTH, y - 6).lineWidth(0.5).stroke(COLORS.line);
    doc.font('Helvetica').fontSize(8).fillColor(COLORS.muted);
    doc.text(`PulsePM  |  ${projectName}`, PAGE.margin, y, { width: CONTENT_WIDTH / 2, lineBreak: false, ellipsis: true });
    doc.text(`Page ${i + 1} of ${range.count}`, PAGE.margin + CONTENT_WIDTH / 2, y, {
      width: CONTENT_WIDTH / 2,
      align: 'right',
      lineBreak: false
    });
    doc.page.margins.bottom = previousBottom;
  }
};

class ReportService {
  // Builds the project report and streams the PDF into `res`
  async streamProjectReport(projectId, generatedByUser, res) {
    const project = await Project.findById(projectId)
      .populate('ownerId', 'name')
      .populate('members', 'name');
    if (!project) {
      throw ApiError.notFound('Project not found');
    }

    const tasks = await Task.find({ projectId })
      .populate('assignedTo', 'name')
      .populate('assignedBy', 'name')
      .populate('createdBy', 'name')
      .sort({ createdAt: 1 });

    const doc = new PDFDocument({
      size: 'A4',
      layout: 'landscape',
      margin: PAGE.margin,
      bufferPages: true,
      info: {
        Title: `${project.name} - Project Report`,
        Author: 'PulsePM',
        Subject: 'Project task report'
      }
    });

    const safeName = project.name.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase() || 'project';
    const stamp = new Date().toISOString().slice(0, 10);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${safeName}-report-${stamp}.pdf"`);
    res.setHeader('Cache-Control', 'no-store');
    doc.pipe(res);

    drawHeader(doc, project, tasks, nameOf(generatedByUser));

    doc.font('Helvetica-Bold').fontSize(10).fillColor(COLORS.ink).text('Tasks by Kanban column', PAGE.margin, doc.y);
    doc.moveDown(0.6);
    COLUMNS.forEach((column) => {
      drawGroup(doc, column, tasks.filter((t) => t.status === column.status));
    });

    drawFooters(doc, project.name);
    doc.end();
  }
}

module.exports = new ReportService();

// Adds a realistic sample company to the database so the app looks lived in:
// people, two workspaces, projects, tasks with real-looking titles and dates, comments, chat and activity.
//
//   npm run seed:demo             add the sample data (skips if it is already there)
//   npm run seed:demo -- --remove delete everything this script created
//
// It only ADDS data and tags it so it can be removed cleanly. It never touches existing accounts
// (including the administrator) and refuses to run in production.
const mongoose = require('mongoose');
const env = require('../src/config/env');
const User = require('../src/models/User.model');
const Workspace = require('../src/models/Workspace.model');
const WorkspaceMember = require('../src/models/WorkspaceMember.model');
const Project = require('../src/models/Project.model');
const Task = require('../src/models/Task.model');
const Comment = require('../src/models/Comment.model');
const Message = require('../src/models/Message.model');
const Activity = require('../src/models/Activity.model');
const Notification = require('../src/models/Notification.model');

const DEMO_PASSWORD = process.env.DEMO_PASSWORD || 'Demo@1234';
const EMAIL_DOMAINS = ['brightline.example', 'harbor.example']; // .example is reserved, so no real inbox is ever emailed
const SLUGS = ['brightline-studio-demo', 'harbor-logistics-demo'];

const DAY = 24 * 60 * 60 * 1000;
const NOW = Date.now();
const ago = (days, hours = 0) => new Date(NOW - days * DAY - hours * 60 * 60 * 1000);
const ahead = (days) => new Date(NOW + days * DAY);
const oid = () => new mongoose.Types.ObjectId();

// ---------------------------------------------------------------- removal
const remove = async () => {
  const users = await User.find({ email: { $regex: `@(${EMAIL_DOMAINS.join('|').replace(/\./g, '\\.')})$`, $options: 'i' } }).select('_id');
  const userIds = users.map((u) => u._id);
  const workspaces = await Workspace.find({ slug: { $in: SLUGS } }).select('_id');
  const workspaceIds = workspaces.map((w) => w._id);

  const results = {
    activities: (await Activity.deleteMany({ workspaceId: { $in: workspaceIds } })).deletedCount,
    messages: (await Message.deleteMany({ workspaceId: { $in: workspaceIds } })).deletedCount,
    comments: (await Comment.deleteMany({ userId: { $in: userIds } })).deletedCount,
    tasks: (await Task.deleteMany({ workspaceId: { $in: workspaceIds } })).deletedCount,
    projects: (await Project.deleteMany({ workspaceId: { $in: workspaceIds } })).deletedCount,
    notifications: (await Notification.deleteMany({ $or: [{ recipientId: { $in: userIds } }, { senderId: { $in: userIds } }] })).deletedCount,
    members: (await WorkspaceMember.deleteMany({ $or: [{ workspace: { $in: workspaceIds } }, { user: { $in: userIds } }] })).deletedCount,
    workspaces: (await Workspace.deleteMany({ _id: { $in: workspaceIds } })).deletedCount,
    users: (await User.deleteMany({ _id: { $in: userIds } })).deletedCount
  };
  console.log('[Demo] Removed:', results);
};

// ---------------------------------------------------------------- data
const PEOPLE = [
  { key: 'priya', name: 'Priya Nair', role: 'USER', owner: true, domain: 'brightline.example' },
  { key: 'daniel', name: 'Daniel Okafor', role: 'USER', owner: true, domain: 'harbor.example' },
  { key: 'sofia', name: 'Sofia Martinez', role: 'USER', domain: 'brightline.example' },
  { key: 'ethan', name: 'Ethan Walker', role: 'USER', domain: 'brightline.example' },
  { key: 'aisha', name: 'Aisha Rahman', role: 'USER', domain: 'brightline.example' },
  { key: 'lucas', name: 'Lucas Meyer', role: 'USER', domain: 'brightline.example' },
  { key: 'hannah', name: 'Hannah Cho', role: 'USER', domain: 'brightline.example' },
  { key: 'omar', name: 'Omar Haddad', role: 'USER', domain: 'brightline.example' }
];

const emailFor = (p) => `${p.name.toLowerCase().replace(/[^a-z ]/g, '').replace(' ', '.')}@${p.domain}`;

// Task: [title, description, status, priority, assignee, createdDaysAgo, dueDays (negative = past), completedDaysAgo]
const PROJECTS = [
  {
    key: 'web',
    workspace: 'brightline',
    name: 'Website Redesign',
    description: 'Rebuild the marketing site with a clearer structure, faster pages and a refreshed visual style ahead of the December launch.',
    status: 'ACTIVE',
    owner: 'priya',
    members: ['priya', 'sofia', 'ethan', 'aisha', 'lucas'],
    start: ago(55),
    due: ahead(58),
    tasks: [
      ['Audit current site analytics and top landing pages', 'Pull 90 days of traffic data, list the ten most visited pages and note where visitors drop off.', 'DONE', 'HIGH', 'sofia', 52, -44, 45],
      ['Define new information architecture and sitemap', 'Agree the page hierarchy with stakeholders and publish the final sitemap for design and development.', 'DONE', 'HIGH', 'aisha', 50, -40, 41],
      ['Write homepage copy and key messaging', 'Headline, subheading and three value statements. Review with the founders before design starts.', 'DONE', 'MEDIUM', 'aisha', 44, -34, 36],
      ['Design homepage hero and navigation in Figma', 'Desktop and mobile layouts, including the sticky navigation and the mobile menu states.', 'DONE', 'HIGH', 'sofia', 40, -28, 29],
      ['Build responsive navigation component', 'Implement the sticky header with dropdowns. Needs keyboard support and a visible focus state.', 'IN_REVIEW', 'HIGH', 'ethan', 21, 2, null],
      ['Implement homepage sections', 'Hero, feature grid, testimonials and footer based on the approved Figma frames.', 'IN_PROGRESS', 'URGENT', 'ethan', 19, 4, null],
      ['Design pricing page layouts', 'Comparison table and FAQ accordion. Include a layout for annual versus monthly billing.', 'IN_PROGRESS', 'MEDIUM', 'sofia', 15, 6, null],
      ['Fix broken footer grid on Safari 16', 'Columns collapse into one on Safari 16. Waiting on design to confirm the intended tablet layout.', 'BLOCKED', 'HIGH', 'ethan', 12, -2, null],
      ['Set up 301 redirects for old URLs', 'Map the old URLs from the audit to the new structure and test them on staging.', 'TODO', 'MEDIUM', 'lucas', 9, 14, null],
      ['Optimise images and add lazy loading', 'Convert hero and gallery images to WebP and lazy load everything below the fold.', 'TODO', 'LOW', 'lucas', 7, 18, null],
      ['Accessibility review against WCAG 2.1 AA', 'Run an automated scan, then test with a screen reader and keyboard only. Log issues as tasks.', 'TODO', 'HIGH', 'aisha', 6, 21, null],
      ['Prepare launch checklist and rollback plan', 'Step-by-step launch plan with owners, a communication plan and a tested way to roll back.', 'TODO', 'MEDIUM', 'lucas', 3, 30, null]
    ]
  },
  {
    key: 'mobile',
    workspace: 'brightline',
    name: 'Mobile App v2.0',
    description: 'Second major release of the customer mobile app: faster start-up, offline support and a cleaner task experience.',
    status: 'ACTIVE',
    owner: 'priya',
    members: ['priya', 'ethan', 'hannah', 'omar', 'lucas'],
    start: ago(70),
    due: ahead(40),
    tasks: [
      ['Migrate sign-in to token refresh flow', 'Replace long-lived tokens with short-lived access tokens and silent refresh.', 'DONE', 'HIGH', 'omar', 60, -48, 50],
      ['Redesign task list screen', 'New card layout with swipe actions, grouped by due date.', 'DONE', 'MEDIUM', 'hannah', 48, -35, 38],
      ['Add offline draft saving for new tasks', 'Store drafts locally and sync when the connection returns. Handle conflicts by keeping the newest edit.', 'IN_PROGRESS', 'HIGH', 'omar', 17, 5, null],
      ['Build notification preferences screen', 'Let people choose which events send a push notification, per project.', 'IN_PROGRESS', 'MEDIUM', 'hannah', 14, 8, null],
      ['Fix crash when opening a notification from the background', 'Reproduced on Android 13. Null project id when the app was killed by the system.', 'IN_REVIEW', 'URGENT', 'ethan', 8, 1, null],
      ['Reduce cold start time below 2 seconds', 'Profile start-up, defer non-critical initialisation and lazy load the analytics SDK.', 'BLOCKED', 'MEDIUM', 'ethan', 20, 10, null],
      ['Add biometric sign-in', 'Face ID and fingerprint as an option after the first password sign-in.', 'TODO', 'HIGH', 'omar', 11, 20, null],
      ['Add dark mode support', 'Follow the system setting and add a manual override in preferences.', 'TODO', 'LOW', 'hannah', 10, 25, null],
      ['Update app store screenshots and description', 'New screenshots for both stores and a refreshed description that mentions offline mode.', 'TODO', 'LOW', 'lucas', 5, 28, null],
      ['Release beta to internal testers', 'Ship build to the internal track, collect feedback for one week and triage crashes.', 'TODO', 'HIGH', 'ethan', 4, 12, null]
    ]
  },
  {
    key: 'onboarding',
    workspace: 'brightline',
    name: 'Customer Onboarding Revamp',
    description: 'Research and redesign the first week of the customer experience to improve activation.',
    status: 'PLANNING',
    owner: 'priya',
    members: ['priya', 'sofia', 'aisha', 'hannah'],
    start: ago(14),
    due: ahead(75),
    tasks: [
      ['Map current onboarding funnel and drop-off points', 'Use product analytics to find where new accounts stop in the first seven days.', 'DONE', 'HIGH', 'sofia', 13, -5, 6],
      ['Interview eight customers about their first week', 'Schedule 30-minute calls, record with consent and summarise the common frustrations.', 'IN_PROGRESS', 'HIGH', 'aisha', 10, 7, null],
      ['Draft success criteria and metrics', 'Define what a successfully onboarded account looks like and how we will measure it.', 'TODO', 'MEDIUM', 'sofia', 6, 12, null],
      ['Prototype a checklist-style welcome flow', 'Clickable prototype for usability tests, based on interview findings.', 'TODO', 'MEDIUM', 'hannah', 4, 30, null]
    ]
  },
  {
    key: 'marketing',
    workspace: 'brightline',
    name: 'Q3 Marketing Campaign',
    description: 'Autumn awareness campaign across email, blog and video. Wrapped up and reported on.',
    status: 'COMPLETED',
    owner: 'priya',
    members: ['priya', 'aisha', 'lucas', 'sofia'],
    start: ago(120),
    due: ago(25),
    tasks: [
      ['Plan content calendar for the quarter', 'Twelve weeks of content mapped to themes, owners and channels.', 'DONE', 'MEDIUM', 'aisha', 118, -100, 104],
      ['Produce customer case study video', 'Two-minute video with a long-standing customer. Script, shoot and edit.', 'DONE', 'HIGH', 'sofia', 100, -70, 72],
      ['Launch three-part welcome email sequence', 'Write, design and schedule the sequence. Set up A/B testing on subject lines.', 'DONE', 'HIGH', 'lucas', 90, -55, 58],
      ['Publish three long-form blog articles', 'Topics agreed with sales. Each article has a related lead magnet.', 'DONE', 'MEDIUM', 'aisha', 85, -45, 47],
      ['Write campaign performance report', 'Summarise results against targets and list recommendations for next quarter.', 'DONE', 'MEDIUM', 'priya', 40, -26, 27]
    ]
  },
  {
    key: 'warehouse',
    workspace: 'harbor',
    name: 'Warehouse Operations Dashboard',
    description: 'Live dashboard for stock levels, pick rates and late shipments for the Rotterdam warehouse.',
    status: 'ACTIVE',
    owner: 'daniel',
    members: ['daniel', 'omar', 'hannah'],
    start: ago(30),
    due: ahead(45),
    tasks: [
      ['Agree the KPI list with the operations lead', 'Confirm the eight metrics that matter and how each is calculated.', 'DONE', 'HIGH', 'omar', 28, -20, 21],
      ['Connect inventory system API', 'Read stock levels every five minutes. Handle rate limits and API downtime gracefully.', 'IN_PROGRESS', 'HIGH', 'omar', 18, 6, null],
      ['Design the pick-rate and late shipment charts', 'Hourly pick rate by zone and a list of shipments at risk of missing their cut-off.', 'IN_PROGRESS', 'MEDIUM', 'hannah', 12, 9, null],
      ['Set up role-based access for shift supervisors', 'Supervisors see their zone only; managers see the whole site.', 'TODO', 'MEDIUM', 'omar', 8, 22, null],
      ['Run a pilot on the morning shift', 'One week with the morning team, daily feedback session and a list of fixes.', 'TODO', 'HIGH', 'hannah', 5, 35, null]
    ]
  }
];

// Comments: [taskTitle fragment, author, text, daysAgo]
const COMMENTS = [
  ['Build responsive navigation', 'ethan', 'PR is up. The dropdowns now open with Enter and Space and close with Escape.', 3],
  ['Build responsive navigation', 'priya', 'Looks good on desktop. On a phone the menu button overlaps the logo below 360px.', 2],
  ['Build responsive navigation', 'ethan', 'Good catch, fixing that now and I will push another commit this afternoon.', 2],
  ['Fix broken footer grid on Safari 16', 'ethan', 'Blocked until we know the intended layout for tablets. Sofia, can you confirm?', 6],
  ['Fix broken footer grid on Safari 16', 'sofia', 'Two columns on tablet, four on desktop. I have added it to the Figma frame.', 4],
  ['Implement homepage sections', 'priya', 'The testimonials section can wait until we have the quotes. Focus on hero and features first.', 8],
  ['Design pricing page layouts', 'aisha', 'Legal needs to review the wording on refunds before we finalise the FAQ.', 5],
  ['Set up 301 redirects', 'lucas', 'I have started the redirect map. 41 of the 120 URLs are done so far.', 2],
  ['Fix crash when opening a notification', 'ethan', 'Root cause found: the project id is missing from the payload when the app was killed. Added a guard and a test.', 3],
  ['Fix crash when opening a notification', 'priya', 'Thanks. Please add it to the release notes for the beta.', 2],
  ['Add offline draft saving', 'omar', 'Drafts are stored in SQLite for now. Sync conflicts will keep the newest edit.', 6],
  ['Reduce cold start time', 'ethan', 'Waiting on the infrastructure team to enable the new CDN region. Nothing more to do on our side yet.', 7],
  ['Interview eight customers', 'aisha', 'Five interviews done. A common theme is that the first project setup feels like a lot of work.', 3],
  ['Connect inventory system API', 'omar', 'The vendor limits us to 60 requests a minute, so I am batching the calls.', 4],
  ['Design the pick-rate', 'hannah', 'First draft of both charts is ready for review in Figma.', 2]
];

// Chat: [project key, sender, text, hoursAgo]
const CHAT = [
  ['web', 'priya', 'Morning all. Reminder that the homepage build is our priority this week.', 52],
  ['web', 'ethan', 'On it. Navigation is in review, homepage sections are next.', 51],
  ['web', 'sofia', 'I uploaded the final pricing page frames to Figma. Feedback welcome before Thursday.', 30],
  ['web', 'aisha', 'Copy for the pricing FAQ is in the doc. I flagged two answers for legal review.', 28],
  ['web', 'lucas', 'Redirect map is about a third done. I will finish it by Friday.', 20],
  ['web', 'priya', 'Great progress everyone. Ethan, is anything blocking you on the Safari issue?', 6],
  ['web', 'ethan', 'Sofia answered in the task, so I am unblocked. Fix goes in tomorrow.', 5],
  ['mobile', 'priya', 'Beta is planned for the end of next week. Where are we on offline drafts?', 44],
  ['mobile', 'omar', 'Local storage works, syncing is about 70% done. Conflict handling is next.', 43],
  ['mobile', 'hannah', 'Notification preferences screen is in progress. I will share a build tomorrow.', 40],
  ['mobile', 'ethan', 'The background crash is fixed in the PR. It needs a second reviewer.', 14],
  ['mobile', 'lucas', 'I can review it this afternoon.', 13],
  ['marketing', 'priya', 'The campaign report is published. Thank you all, great quarter.', 600],
  ['warehouse', 'daniel', 'Kick-off done. The operations lead confirmed the eight KPIs.', 500],
  ['warehouse', 'omar', 'Inventory API access granted. I will start the integration tomorrow.', 480]
];

// ---------------------------------------------------------------- seed
const seed = async () => {
  if (await Workspace.findOne({ slug: SLUGS[0] })) {
    console.log('[Demo] Sample data is already present. Run with --remove first to start over.');
    return;
  }
  const clash = await User.findOne({ email: { $in: PEOPLE.map(emailFor) } });
  if (clash) {
    console.log(`[Demo] ${clash.email} already exists, so nothing was added. Run with --remove to clear sample users first.`);
    return;
  }

  // People (saved one by one so passwords are hashed by the User model)
  const users = {};
  for (const p of PEOPLE) {
    const user = new User({ name: p.name, email: emailFor(p), password: DEMO_PASSWORD, role: p.role });
    await user.save();
    users[p.key] = user;
  }

  // Workspaces
  const workspaces = {
    brightline: { _id: oid(), name: 'Brightline Studio', slug: SLUGS[0], description: 'Product design and engineering studio. Client work and in-house products.', ownerId: users.priya._id, created: ago(120) },
    harbor: { _id: oid(), name: 'Harbor Logistics', slug: SLUGS[1], description: 'Client workspace for the Rotterdam warehouse programme.', ownerId: users.daniel._id, created: ago(35) }
  };
  await Workspace.collection.insertMany(
    Object.values(workspaces).map((w) => ({
      _id: w._id, name: w.name, slug: w.slug, description: w.description, ownerId: w.ownerId, createdAt: w.created, updatedAt: w.created, __v: 0
    }))
  );

  // Members: the Brightline team is in Brightline; Daniel, Omar and Hannah are in Harbor
  const memberRows = [];
  const addMember = (wsKey, key, role) =>
    memberRows.push({ _id: oid(), user: users[key]._id, workspace: workspaces[wsKey]._id, role, status: 'ACTIVE', joinedAt: workspaces[wsKey].created, createdAt: workspaces[wsKey].created, updatedAt: workspaces[wsKey].created, __v: 0 });
  PEOPLE.filter((p) => p.domain === 'brightline.example').forEach((p) => addMember('brightline', p.key, p.owner ? 'OWNER' : 'MEMBER'));
  addMember('harbor', 'daniel', 'OWNER');
  addMember('harbor', 'omar', 'MEMBER');
  addMember('harbor', 'hannah', 'MEMBER');
  await WorkspaceMember.collection.insertMany(memberRows);

  const projectRows = [];
  const taskRows = [];
  const activityRows = [];
  const taskByTitle = [];
  const activity = (ws, project, task, userKey, action, metadata, when) =>
    activityRows.push({ _id: oid(), workspaceId: workspaces[ws]._id, projectId: project, taskId: task, userId: users[userKey]._id, action, metadata, createdAt: when, updatedAt: when, __v: 0 });

  for (const proj of PROJECTS) {
    const projectId = oid();
    projectRows.push({
      _id: projectId, name: proj.name, description: proj.description, workspaceId: workspaces[proj.workspace]._id,
      ownerId: users[proj.owner]._id, members: proj.members.map((k) => users[k]._id), status: proj.status,
      startDate: proj.start, dueDate: proj.due, createdAt: proj.start, updatedAt: ago(1), __v: 0
    });
    activity(proj.workspace, projectId, null, proj.owner, 'CREATED_PROJECT', { projectName: proj.name }, proj.start);

    for (const [title, description, status, priority, assignee, createdAgo, dueDays, completedAgo] of proj.tasks) {
      const taskId = oid();
      const created = ago(createdAgo);
      const completedAt = status === 'DONE' ? ago(completedAgo ?? 1) : null;
      const updated = completedAt || ago(Math.max(0, Math.min(createdAgo - 1, 3)));
      taskRows.push({
        _id: taskId, title, description, projectId, workspaceId: workspaces[proj.workspace]._id,
        assignedTo: users[assignee]._id, assignedBy: users[proj.owner]._id, createdBy: users[proj.owner]._id,
        priority, status, dueDate: dueDays < 0 ? ago(-dueDays) : ahead(dueDays), completedAt,
        labels: [], createdAt: created, updatedAt: updated, __v: 0
      });
      taskByTitle.push({ title, taskId, projectId, ws: proj.workspace, owner: proj.owner, assignee });

      activity(proj.workspace, projectId, taskId, proj.owner, 'CREATED_TASK', { taskTitle: title }, created);
      if (status !== 'TODO') {
        const moved = status === 'DONE' ? completedAt : updated;
        activity(proj.workspace, projectId, taskId, assignee, 'CHANGED_TASK_STATUS', { taskTitle: title, oldStatus: 'IN_PROGRESS', newStatus: status }, moved);
      }
    }
  }

  const findTask = (fragment) => taskByTitle.find((t) => t.title.startsWith(fragment));

  const commentRows = COMMENTS.map(([fragment, author, content, daysAgo]) => {
    const t = findTask(fragment);
    const when = ago(daysAgo, 2);
    activity(t.ws, t.projectId, t.taskId, author, 'ADDED_COMMENT', { taskTitle: t.title }, when);
    return { _id: oid(), userId: users[author]._id, projectId: t.projectId, taskId: t.taskId, content, createdAt: when, updatedAt: when, __v: 0 };
  });

  const projectByKey = Object.fromEntries(PROJECTS.map((p, i) => [p.key, projectRows[i]]));
  const messageRows = CHAT.map(([key, sender, content, hoursAgo]) => {
    const p = projectByKey[key];
    const when = ago(0, hoursAgo);
    return { _id: oid(), projectId: p._id, workspaceId: p.workspaceId, senderId: users[sender]._id, content, createdAt: when, updatedAt: when, __v: 0 };
  });

  // Notifications: what a few people would plausibly have waiting
  const notificationRows = [];
  const notify = (recipient, sender, type, title, message, project, hoursAgo, isRead) =>
    notificationRows.push({
      _id: oid(), recipientId: users[recipient]._id, senderId: users[sender]._id, type, title, message, isRead,
      link: `/dashboard/projects/${project._id}`, createdAt: ago(0, hoursAgo), updatedAt: ago(0, hoursAgo), __v: 0
    });
  notify('ethan', 'priya', 'TASK_COMMENT', 'New comment on your task', 'Priya commented on "Build responsive navigation component".', projectByKey.web, 48, false);
  notify('ethan', 'sofia', 'TASK_COMMENT', 'New comment on your task', 'Sofia commented on "Fix broken footer grid on Safari 16".', projectByKey.web, 96, false);
  notify('ethan', 'priya', 'TASK_ASSIGNED', 'New task assigned', 'Priya assigned you "Release beta to internal testers".', projectByKey.mobile, 100, true);
  notify('omar', 'priya', 'TASK_STATUS_CHANGED', 'Task status updated', '"Migrate sign-in to token refresh flow" moved to Done.', projectByKey.mobile, 700, true);
  notify('aisha', 'priya', 'TASK_ASSIGNED', 'New task assigned', 'Priya assigned you "Accessibility review against WCAG 2.1 AA".', projectByKey.web, 140, false);
  notify('hannah', 'daniel', 'PROJECT_ADDED', 'Added to a project', 'Daniel added you to "Warehouse Operations Dashboard".', projectByKey.warehouse, 700, true);
  notify('lucas', 'priya', 'TASK_ASSIGNED', 'New task assigned', 'Priya assigned you "Set up 301 redirects for old URLs".', projectByKey.web, 210, false);

  await Project.collection.insertMany(projectRows);
  await Task.collection.insertMany(taskRows);
  await Comment.collection.insertMany(commentRows);
  await Message.collection.insertMany(messageRows);
  await Activity.collection.insertMany(activityRows);
  await Notification.collection.insertMany(notificationRows);

  console.log('[Demo] Added:', {
    users: PEOPLE.length, workspaces: 2, projects: projectRows.length, tasks: taskRows.length,
    comments: commentRows.length, messages: messageRows.length, activities: activityRows.length, notifications: notificationRows.length
  });
  console.log('\nSample sign-ins (password for all: ' + DEMO_PASSWORD + ')');
  PEOPLE.forEach((p) => console.log(`  ${(p.owner ? 'owner' : 'member').padEnd(7)} ${emailFor(p)}`));
  console.log('\nRemove it all later with:  npm run seed:demo -- --remove');
};

(async () => {
  if (env.NODE_ENV === 'production') {
    console.error('[Demo] Refusing to run in production.');
    process.exit(1);
  }
  try {
    await mongoose.connect(env.MONGODB_URI);
    console.log(`[Demo] Connected to ${mongoose.connection.host}`);
    if (process.argv.includes('--remove')) await remove();
    else await seed();
  } catch (err) {
    console.error('[Demo] Failed:', err.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
})();

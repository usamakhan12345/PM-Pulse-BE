const mongoose = require('mongoose');
const env = require('./src/config/env');
const User = require('./src/models/User.model');
const Workspace = require('./src/models/Workspace.model');
const WorkspaceMember = require('./src/models/WorkspaceMember.model');
const Project = require('./src/models/Project.model');
const Task = require('./src/models/Task.model');
const Comment = require('./src/models/Comment.model');
const Activity = require('./src/models/Activity.model');
const Notification = require('./src/models/Notification.model');
const Message = require('./src/models/Message.model');

const seedData = async () => {
  try {
    await mongoose.connect(env.MONGODB_URI);
    console.log('[Seed] Connected to MongoDB...');

    // Clear existing collections
    await User.deleteMany({});
    await Workspace.deleteMany({});
    await WorkspaceMember.deleteMany({});
    await Project.deleteMany({});
    await Task.deleteMany({});
    await Comment.deleteMany({});
    await Activity.deleteMany({});
    await Notification.deleteMany({});
    await Message.deleteMany({});

    console.log('[Seed] Cleared existing data.');

    // 1. Create Users
    const admin = await User.create({
      name: 'System Admin',
      email: 'admin@example.com',
      password: 'Password123!',
      role: 'ADMIN',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Admin'
    });

    const manager = await User.create({
      name: 'Sarah Manager',
      email: 'manager@example.com',
      password: 'Password123!',
      role: 'MANAGER',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah'
    });

    const emp1 = await User.create({
      name: 'Ahmed Developer',
      email: 'employee1@example.com',
      password: 'Password123!',
      role: 'EMPLOYEE',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Ahmed'
    });

    const emp2 = await User.create({
      name: 'Ali Designer',
      email: 'employee2@example.com',
      password: 'Password123!',
      role: 'EMPLOYEE',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Ali'
    });

    console.log('[Seed] Created Users.');

    // 2. Create Main Workspace
    const workspace = await Workspace.create({
      name: 'Acme Enterprise Solutions',
      slug: 'acme-enterprise-solutions',
      description: 'Primary engineering and product development workspace',
      ownerId: admin._id
    });

    // Add Workspace Memberships
    await WorkspaceMember.create([
      { user: admin._id, workspace: workspace._id, role: 'ADMIN', status: 'ACTIVE' },
      { user: manager._id, workspace: workspace._id, role: 'MANAGER', status: 'ACTIVE' },
      { user: emp1._id, workspace: workspace._id, role: 'EMPLOYEE', status: 'ACTIVE' },
      { user: emp2._id, workspace: workspace._id, role: 'EMPLOYEE', status: 'ACTIVE' }
    ]);

    console.log('[Seed] Created Workspace and Memberships.');

    // 3. Create Projects
    const project1 = await Project.create({
      name: 'E-Commerce Platform',
      description: 'Full modern microservices online store with payment gateway and inventory tracking.',
      workspaceId: workspace._id,
      ownerId: manager._id,
      status: 'ACTIVE',
      members: [admin._id, manager._id, emp1._id, emp2._id],
      startDate: new Date('2026-10-01'),
      dueDate: new Date('2026-12-15')
    });

    const project2 = await Project.create({
      name: 'Mobile App Redesign',
      description: 'Cross-platform iOS and Android mobile app interface refresh using React Native.',
      workspaceId: workspace._id,
      ownerId: manager._id,
      status: 'ACTIVE',
      members: [manager._id, emp1._id, emp2._id],
      startDate: new Date('2026-10-05'),
      dueDate: new Date('2026-11-30')
    });

    console.log('[Seed] Created Projects.');

    // 4. Create Sample Tasks across status workflow columns
    const task1 = await Task.create({
      title: 'Implement Payment Gateway Integration',
      description: 'Integrate Stripe SDK for recurring subscription billing and webhooks.',
      projectId: project1._id,
      workspaceId: workspace._id,
      assignedTo: emp1._id,
      createdBy: manager._id,
      priority: 'URGENT',
      status: 'IN_PROGRESS',
      dueDate: new Date('2026-10-25'),
      labels: ['backend', 'payments', 'stripe']
    });

    const task2 = await Task.create({
      title: 'Design Checkout Flow UI Wireframes',
      description: 'Create high-fidelity Figma mockups for the multi-step cart & checkout experience.',
      projectId: project1._id,
      workspaceId: workspace._id,
      assignedTo: emp2._id,
      createdBy: manager._id,
      priority: 'HIGH',
      status: 'IN_REVIEW',
      dueDate: new Date('2026-10-18'),
      labels: ['design', 'ui/ux', 'figma']
    });

    const task3 = await Task.create({
      title: 'Setup MongoDB Indexing & Optimization',
      description: 'Review compound indexes for task queries and activity feeds to ensure high throughput.',
      projectId: project1._id,
      workspaceId: workspace._id,
      assignedTo: emp1._id,
      createdBy: admin._id,
      priority: 'MEDIUM',
      status: 'TODO',
      dueDate: new Date('2026-11-01'),
      labels: ['database', 'performance']
    });

    const task4 = await Task.create({
      title: 'Authentication & JWT Middleware',
      description: 'Implement secure auth routes with role authorization logic on Express server.',
      projectId: project1._id,
      workspaceId: workspace._id,
      assignedTo: emp1._id,
      createdBy: admin._id,
      priority: 'HIGH',
      status: 'DONE',
      dueDate: new Date('2026-10-10'),
      labels: ['security', 'auth']
    });

    const task5 = await Task.create({
      title: 'OAuth2 Social Login Blocked by Provider API Key',
      description: 'Waiting for client to issue Google OAuth client ID and secrets.',
      projectId: project1._id,
      workspaceId: workspace._id,
      assignedTo: emp1._id,
      createdBy: manager._id,
      priority: 'LOW',
      status: 'BLOCKED',
      dueDate: new Date('2026-10-30'),
      labels: ['auth', 'blocked']
    });

    console.log('[Seed] Created Tasks.');

    // 5. Create Comments
    await Comment.create([
      {
        taskId: task1._id,
        projectId: project1._id,
        userId: manager._id,
        content: 'Please make sure to handle failed webhook retries properly!'
      },
      {
        taskId: task1._id,
        projectId: project1._id,
        userId: emp1._id,
        content: 'Working on idempotency keys right now, will push unit tests by tomorrow EOD.'
      }
    ]);

    // 6. Create Chat Messages
    await Message.create([
      {
        projectId: project1._id,
        workspaceId: workspace._id,
        senderId: manager._id,
        content: 'Welcome team to the E-Commerce Platform project channel!'
      },
      {
        projectId: project1._id,
        workspaceId: workspace._id,
        senderId: emp1._id,
        content: 'Thanks Sarah! I have started working on the payment module.'
      },
      {
        projectId: project1._id,
        workspaceId: workspace._id,
        senderId: emp2._id,
        content: 'Checkout UI wireframes are almost ready for review.'
      }
    ]);

    // 7. Create Activities
    await Activity.create([
      {
        workspaceId: workspace._id,
        projectId: project1._id,
        taskId: task1._id,
        userId: manager._id,
        action: 'CREATED_TASK',
        metadata: { taskTitle: task1.title }
      },
      {
        workspaceId: workspace._id,
        projectId: project1._id,
        taskId: task1._id,
        userId: emp1._id,
        action: 'CHANGED_TASK_STATUS',
        metadata: { taskTitle: task1.title, oldStatus: 'TODO', newStatus: 'IN_PROGRESS' }
      }
    ]);

    // 8. Create Notifications
    await Notification.create([
      {
        recipientId: emp1._id,
        senderId: manager._id,
        title: 'Task Assigned',
        message: `You were assigned task "${task1.title}"`,
        type: 'TASK_ASSIGNED',
        isRead: false,
        link: `/dashboard/projects/${project1._id}`
      }
    ]);

    console.log('===================================================');
    console.log(' SEED DATA GENERATED SUCCESSFULLY!');
    console.log(' Demo Accounts:');
    console.log('   Admin:    admin@example.com / Password123!');
    console.log('   Manager:  manager@example.com / Password123!');
    console.log('   Employee: employee1@example.com / Password123!');
    console.log('   Employee: employee2@example.com / Password123!');
    console.log('===================================================');

    process.exit(0);
  } catch (err) {
    console.error('[Seed Error]', err);
    process.exit(1);
  }
};

seedData();

const env = require('./env');
const User = require('../models/User.model');
const Workspace = require('../models/Workspace.model');
const WorkspaceMember = require('../models/WorkspaceMember.model');
const workspaceService = require('../services/workspace.service');

// Brings data created under the old Admin / Manager / Employee model into the current one:
//   users:             MANAGER and EMPLOYEE become USER (ADMIN stays)
//   workspace members: ADMIN and MANAGER become OWNER, EMPLOYEE becomes MEMBER
//   every workspace creator is an owner of it, and every user owns at least one workspace
// It only changes what still needs changing, so it is safe to run on every start.
const runMigrations = async () => {
  const changes = {};

  const users = await User.collection.updateMany(
    { role: { $in: ['MANAGER', 'EMPLOYEE'] } },
    { $set: { role: 'USER' } }
  );
  if (users.modifiedCount) changes.usersToUser = users.modifiedCount;

  const owners = await WorkspaceMember.collection.updateMany(
    { role: { $in: ['ADMIN', 'MANAGER'] } },
    { $set: { role: 'OWNER' } }
  );
  if (owners.modifiedCount) changes.membersToOwner = owners.modifiedCount;

  const members = await WorkspaceMember.collection.updateMany({ role: 'EMPLOYEE' }, { $set: { role: 'MEMBER' } });
  if (members.modifiedCount) changes.membersToMember = members.modifiedCount;

  // Workspace creators must be owners of their workspace
  const workspaces = await Workspace.find().select('ownerId');
  let fixedCreators = 0;
  for (const ws of workspaces) {
    const result = await WorkspaceMember.collection.updateOne(
      { user: ws.ownerId, workspace: ws._id },
      { $set: { role: 'OWNER', status: 'ACTIVE' }, $setOnInsert: { joinedAt: new Date(), createdAt: new Date(), updatedAt: new Date() } },
      { upsert: true }
    );
    if (result.modifiedCount || result.upsertedCount) fixedCreators += 1;
  }
  if (fixedCreators) changes.creatorsFixed = fixedCreators;

  // Everyone gets a workspace of their own to start from
  const ownerIds = await WorkspaceMember.distinct('user', { role: 'OWNER', status: 'ACTIVE' });
  const withoutWorkspace = await User.find({ role: 'USER', _id: { $nin: ownerIds } }).select('name');
  for (const user of withoutWorkspace) {
    await workspaceService.ensureDefaultWorkspace(user);
  }
  if (withoutWorkspace.length) changes.defaultWorkspacesCreated = withoutWorkspace.length;

  if (Object.keys(changes).length) {
    console.log('[Migration] Updated data to the current roles:', changes);
  }
};

// Creates the administrator account from ADMIN_EMAIL / ADMIN_PASSWORD if it does not exist yet.
// An existing account is never changed, so the password can be rotated in the app.
const ensureAdminUser = async () => {
  if (!env.ADMIN_EMAIL || !env.ADMIN_PASSWORD) {
    return;
  }

  const existing = await User.findOne({ email: env.ADMIN_EMAIL });
  if (existing) {
    if (existing.role !== 'ADMIN') {
      console.warn(`[Bootstrap] ${env.ADMIN_EMAIL} already exists with role ${existing.role}, not changing it.`);
    }
    return;
  }

  if (env.NODE_ENV === 'production' && env.ADMIN_PASSWORD.length < 8) {
    console.warn('[Bootstrap] ADMIN_PASSWORD is shorter than 8 characters. Use a strong password in production.');
  }

  await User.create({
    name: 'Administrator',
    email: env.ADMIN_EMAIL,
    password: env.ADMIN_PASSWORD,
    role: 'ADMIN'
  });
  console.log(`[Bootstrap] Administrator account created for ${env.ADMIN_EMAIL}`);
};

module.exports = { ensureAdminUser, runMigrations };

const Notification = require('../models/Notification.model');

class NotificationService {
  async createNotification({ recipientId, senderId, title, message, type, link = '' }) {
    // Don't notify oneself
    if (recipientId && senderId && recipientId.toString() === senderId.toString()) {
      return null;
    }

    const notification = await Notification.create({
      recipientId,
      senderId,
      title,
      message,
      type,
      link,
      isRead: false
    });

    return await notification.populate('senderId', 'name email avatar');
  }

  async getUserNotifications(userId) {
    const notifications = await Notification.find({ recipientId: userId })
      .populate('senderId', 'name email avatar')
      .sort({ createdAt: -1 })
      .limit(50);

    const unreadCount = await Notification.countDocuments({
      recipientId: userId,
      isRead: false
    });

    return {
      notifications,
      unreadCount
    };
  }

  async markAsRead(notificationId, userId) {
    const notification = await Notification.findOneAndUpdate(
      { _id: notificationId, recipientId: userId },
      { isRead: true },
      { new: true }
    );
    return notification;
  }

  async markAllAsRead(userId) {
    await Notification.updateMany({ recipientId: userId, isRead: false }, { isRead: true });
    return { message: 'All notifications marked as read' };
  }
}

module.exports = new NotificationService();

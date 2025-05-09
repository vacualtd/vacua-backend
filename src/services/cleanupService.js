import { User } from '../models/User.js';
import { Logger } from '../utils/logger.js';
import { sendEmail } from '../utils/emailService.js';
import { emailTemplates } from '../utils/emailTemplates.js';

export const processScheduledDeletions = async () => {
  try {
    const now = new Date();
    
    // Find accounts scheduled for deletion
    const scheduledAccounts = await User.find({
      accountStatus: 'scheduled_for_deletion',
      'deletionDetails.scheduledDate': { $lte: now }
    });

    for (const user of scheduledAccounts) {
      // Mark account as deleted
      user.accountStatus = 'deleted';
      user.deactivationHistory.push({
        status: 'deleted',
        reason: 'Scheduled deletion completed',
        date: now
      });

      await user.save();

      // Send final notification
      await sendEmail({
        to: user.email,
        subject: 'Account Deleted',
        html: emailTemplates.accountDeleted(user.username)
      });

      Logger.info('Account deleted', { userId: user._id });
    }
  } catch (error) {
    Logger.error('Failed to process scheduled deletions', { error: error.message });
  }
};

// Schedule the cleanup job to run daily
export const scheduleCleanupJob = () => {
  setInterval(processScheduledDeletions, 24 * 60 * 60 * 1000);
}; 
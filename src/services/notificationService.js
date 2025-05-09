import { Notification } from '../models/Notification.js';
import { Logger } from '../utils/logger.js';
import { io } from '../socket/socketServer.js';

export const createNotification = async ({
  userId,
  type,
  title,
  message,
  data,
  priority = 'low',
  expiresAt = null
}) => {
  try {
    const notification = await Notification.create({
      userId,
      type,
      title,
      message,
      data,
      priority,
      expiresAt: expiresAt || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    });

    if (io) {
      io.to(userId.toString()).emit('notification', {
        type: 'new_notification',
        data: notification
      });
    }

    return notification;
  } catch (error) {
    Logger.error('Failed to create notification', { error: error.message });
    throw error;
  }
};

export const createRecommendationNotification = async (userId, recommendations, sourceItem) => {
  try {
    if (!recommendations || recommendations.length === 0) return;

    const topRecommendations = recommendations.slice(0, 3);
    const priceRange = {
      min: Math.min(...recommendations.map(item => item.price)),
      max: Math.max(...recommendations.map(item => item.price)),
      avg: recommendations.reduce((sum, item) => sum + item.price, 0) / recommendations.length
    };

    const notification = await createNotification({
      userId,
      type: 'recommendation',
      title: 'Personalized Recommendations For You',
      message: `We found ${recommendations.length} items matching your interests`,
      priority: recommendations.length > 5 ? 'high' : 'medium',
      data: {
        itemId: sourceItem._id,
        itemType: sourceItem.type,
        metadata: {
          recommendationCount: recommendations.length,
          topRecommendations: topRecommendations.map(item => ({
            id: item._id,
            name: item.name,
            price: item.price,
            category: item.category,
            type: item.type,
            score: item.score,
            image: item.images?.[0]?.url
          })),
          priceRange,
          matchFactors: ['category', 'price', 'type'],
          sourceItem: {
            name: sourceItem.name,
            category: sourceItem.category,
            price: sourceItem.price
          }
        }
      }
    });

    return notification;
  } catch (error) {
    Logger.error('Failed to create recommendation notification', { error: error.message });
  }
};

export const createRelatedItemsNotification = async (userId, relatedItems, sourceItem) => {
  try {
    if (!relatedItems || relatedItems.length === 0) return;

    const topRelated = relatedItems.slice(0, 3);
    const notification = await createNotification({
      userId,
      type: 'related_item',
      title: 'Similar Items Found',
      message: `Found ${relatedItems.length} items similar to "${sourceItem.name}"`,
      priority: relatedItems.some(item => item.relevanceScore > 0.8) ? 'high' : 'medium',
      data: {
        itemId: sourceItem._id,
        itemType: sourceItem.type,
        metadata: {
          relatedCount: relatedItems.length,
          topRelated: topRelated.map(item => ({
            id: item._id,
            name: item.name,
            price: item.price,
            relevanceScore: item.relevanceScore,
            category: item.category,
            image: item.images?.[0]?.url,
            matchingFactors: getMatchingFactors(item, sourceItem)
          })),
          similarityFactors: ['category', 'price', 'seller'],
          sourceItem: {
            name: sourceItem.name,
            category: sourceItem.category,
            price: sourceItem.price
          }
        }
      }
    });

    return notification;
  } catch (error) {
    Logger.error('Failed to create related items notification', { error: error.message });
  }
};

export const createPriceAlertNotification = async (userId, item, priceChange) => {
  try {
    const notification = await createNotification({
      userId,
      type: 'price_alert',
      title: 'Price Change Alert',
      message: `Price ${priceChange > 0 ? 'increased' : 'decreased'} for "${item.name}"`,
      priority: Math.abs(priceChange) > item.price * 0.2 ? 'high' : 'medium',
      data: {
        itemId: item._id,
        itemType: item.type,
        metadata: {
          oldPrice: item.price - priceChange,
          newPrice: item.price,
          changeAmount: Math.abs(priceChange),
          changePercentage: (Math.abs(priceChange) / (item.price - priceChange)) * 100,
          item: {
            name: item.name,
            category: item.category,
            image: item.images?.[0]?.url
          }
        }
      }
    });

    return notification;
  } catch (error) {
    Logger.error('Failed to create price alert notification', { error: error.message });
  }
};

// Helper function to determine matching factors
const getMatchingFactors = (item, sourceItem) => {
  const factors = [];
  if (item.category === sourceItem.category) factors.push('category');
  if (Math.abs(item.price - sourceItem.price) <= sourceItem.price * 0.2) factors.push('price');
  if (item.type === sourceItem.type) factors.push('type');
  if (item.userId.toString() === sourceItem.userId.toString()) factors.push('seller');
  return factors;
};

// Get user's notifications
export const getUserNotifications = async (userId, options = {}) => {
  try {
    const {
      page = 1,
      limit = 10,
      type,
      isRead,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = options;

    const query = { userId };
    if (type) query.type = type;
    if (typeof isRead === 'boolean') query.isRead = isRead;

    const notifications = await Notification.paginate(query, {
      page,
      limit,
      sort: { [sortBy]: sortOrder === 'desc' ? -1 : 1 },
      populate: 'data.itemId'
    });

    return notifications;
  } catch (error) {
    Logger.error('Failed to fetch user notifications', { error: error.message });
    throw error;
  }
}; 
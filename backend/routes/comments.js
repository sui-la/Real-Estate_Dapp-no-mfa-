const express = require('express');
const router = express.Router();
const Comment = require('../models/Comment');
const User = require('../models/User');
const { auth } = require('../middleware/auth');

// Get comments for a specific property
router.get('/property/:propertyId', async (req, res) => {
  try {
    const { propertyId } = req.params;
    
    const comments = await Comment.find({ propertyId: parseInt(propertyId) })
      .populate('userId', 'name email walletAddress')
      .sort({ createdAt: -1 })
      .limit(50);

    res.json(comments);
  } catch (error) {
    console.error('Error fetching comments:', error);
    res.status(500).json({ error: 'Failed to fetch comments' });
  }
});

// Create a new comment (requires authentication and share ownership)
router.post('/property/:propertyId', auth, async (req, res) => {
  try {
    const { propertyId } = req.params;
    const { content, rating } = req.body;
    const userId = req.user.id;
    const walletAddress = req.user.walletAddress;

    // Validation
    if (!content || content.trim().length === 0) {
      return res.status(400).json({ error: 'Comment content is required' });
    }

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Rating must be between 1 and 5' });
    }

    // Get actual shares owned from blockchain
    const web3Service = require('../utils/web3Service');
    let sharesOwned = 0;

    try {
      if (web3Service && web3Service.getUserShareBalance) {
        sharesOwned = await web3Service.getUserShareBalance(walletAddress, propertyId);
      }
    } catch (error) {
      console.warn('Could not get shares balance from blockchain:', error.message);
      // Continue with sharesOwned = 0
    }

    // Require user to own shares to comment
    if (sharesOwned <= 0) {
      return res.status(403).json({ 
        error: 'You must own shares of this property to comment',
        sharesRequired: true 
      });
    }

    // Check if user already commented on this property
    const existingComment = await Comment.findOne({
      propertyId: parseInt(propertyId),
      userId: userId
    });

    if (existingComment) {
      return res.status(400).json({ error: 'You have already commented on this property. You can edit your existing comment.' });
    }

    // Create new comment
    const comment = new Comment({
      propertyId: parseInt(propertyId),
      userId,
      walletAddress: walletAddress.toLowerCase(),
      content: content.trim(),
      rating,
      sharesOwned,
      isVerifiedInvestor: sharesOwned > 0
    });

    await comment.save();

    // Populate user details for response
    await comment.populate('userId', 'name email walletAddress');

    res.status(201).json(comment);
  } catch (error) {
    console.error('Error creating comment:', error);
    res.status(500).json({ error: 'Failed to create comment' });
  }
});

// Update a comment (only by the comment author)
router.put('/:commentId', auth, async (req, res) => {
  try {
    const { commentId } = req.params;
    const { content, rating } = req.body;
    const userId = req.user.id;

    // Find the comment
    const comment = await Comment.findById(commentId);
    if (!comment) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    // Check if user owns this comment
    if (comment.userId.toString() !== userId) {
      return res.status(403).json({ error: 'You can only edit your own comments' });
    }

    // Update comment
    if (content) comment.content = content.trim();
    if (rating) comment.rating = rating;
    comment.updatedAt = new Date();

    await comment.save();
    await comment.populate('userId', 'name email walletAddress');

    res.json(comment);
  } catch (error) {
    console.error('Error updating comment:', error);
    res.status(500).json({ error: 'Failed to update comment' });
  }
});

// Delete a comment (only by the comment author or admin)
router.delete('/:commentId', auth, async (req, res) => {
  try {
    const { commentId } = req.params;
    const userId = req.user.id;
    const isAdmin = req.user.isAdmin;

    // Find the comment
    const comment = await Comment.findById(commentId);
    if (!comment) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    // Check if user owns this comment or is admin
    if (comment.userId.toString() !== userId && !isAdmin) {
      return res.status(403).json({ error: 'You can only delete your own comments' });
    }

    await Comment.findByIdAndDelete(commentId);

    res.json({ message: 'Comment deleted successfully' });
  } catch (error) {
    console.error('Error deleting comment:', error);
    res.status(500).json({ error: 'Failed to delete comment' });
  }
});

// Get comment statistics for a property
router.get('/property/:propertyId/stats', async (req, res) => {
  try {
    const { propertyId } = req.params;
    
    const stats = await Comment.aggregate([
      { $match: { propertyId: parseInt(propertyId) } },
      {
        $group: {
          _id: null,
          totalComments: { $sum: 1 },
          averageRating: { $avg: '$rating' },
          totalInvestors: { $sum: { $cond: [{ $gt: ['$sharesOwned', 0] }, 1, 0] } }
        }
      }
    ]);

    const result = stats.length > 0 ? stats[0] : {
      totalComments: 0,
      averageRating: 0,
      totalInvestors: 0
    };

    res.json(result);
  } catch (error) {
    console.error('Error fetching comment stats:', error);
    res.status(500).json({ error: 'Failed to fetch comment statistics' });
  }
});

module.exports = router;

import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useWeb3 } from '../contexts/Web3Context';
import { toast } from 'react-hot-toast';
import { ethers } from 'ethers';
import { 
  StarIcon, 
  PencilIcon, 
  TrashIcon,
  UserCircleIcon,
  ChatBubbleLeftRightIcon
} from '@heroicons/react/24/outline';
import { StarIcon as StarSolidIcon } from '@heroicons/react/24/solid';

const Comments = ({ propertyId }) => {
  const { user, isAuthenticated } = useAuth();
  const { contracts, account } = useWeb3();
  const [comments, setComments] = useState([]);
  const [stats, setStats] = useState({ totalComments: 0, averageRating: 0, totalInvestors: 0 });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [userShares, setUserShares] = useState(0);
  const [showCommentForm, setShowCommentForm] = useState(false);
  const [editingComment, setEditingComment] = useState(null);
  
  // Form state
  const [formData, setFormData] = useState({
    content: '',
    rating: 5
  });

  useEffect(() => {
    if (propertyId) {
      loadComments();
      loadCommentStats();
      if (isAuthenticated && contracts) {
        checkUserShares();
      }
    }
  }, [propertyId, isAuthenticated, contracts]);

  const loadComments = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/comments/property/${propertyId}`);
      if (response.ok) {
        const data = await response.json();
        setComments(data);
      }
    } catch (error) {
      console.error('Error loading comments:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadCommentStats = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/comments/property/${propertyId}/stats`);
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Error loading comment stats:', error);
    }
  };

  const checkUserShares = async () => {
    if (!contracts || !account) return;
    
    try {
      const fractionalTokenAddress = await contracts.realEstateFractionalization.fractionalTokens(propertyId);
      if (fractionalTokenAddress && fractionalTokenAddress !== '0x0000000000000000000000000000000000000000') {
        const fractionalToken = new ethers.Contract(
          fractionalTokenAddress,
          ['function balanceOf(address) view returns (uint256)'],
          contracts.signer
        );
        const balance = await fractionalToken.balanceOf(account);
        setUserShares(parseFloat(ethers.formatEther(balance)));
      }
    } catch (error) {
      console.error('Error checking user shares:', error);
    }
  };

  const handleSubmitComment = async (e) => {
    e.preventDefault();
    
    if (!isAuthenticated) {
      toast.error('Please connect your wallet to leave a comment');
      return;
    }

    if (!formData.content.trim()) {
      toast.error('Please enter a comment');
      return;
    }

    setSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      const url = editingComment 
        ? `${import.meta.env.VITE_API_URL}/comments/${editingComment._id}`
        : `${import.meta.env.VITE_API_URL}/comments/property/${propertyId}`;
      
      const method = editingComment ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          content: formData.content.trim(),
          rating: formData.rating
        })
      });

      if (response.ok) {
        const newComment = await response.json();
        
        if (editingComment) {
          setComments(prev => prev.map(c => c._id === editingComment._id ? newComment : c));
          toast.success('Comment updated successfully!');
          setEditingComment(null);
        } else {
          setComments(prev => [newComment, ...prev]);
          toast.success('Comment posted successfully!');
        }
        
        setFormData({ content: '', rating: 5 });
        setShowCommentForm(false);
        loadCommentStats();
      } else {
        const errorData = await response.json();
        if (errorData.sharesRequired) {
          toast.error('You must own shares of this property to comment');
          // Refresh user shares in case they've changed
          await checkUserShares();
        } else {
          toast.error(errorData.error || 'Failed to post comment');
        }
      }
    } catch (error) {
      console.error('Error submitting comment:', error);
      toast.error('Failed to post comment');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditComment = (comment) => {
    setEditingComment(comment);
    setFormData({
      content: comment.content,
      rating: comment.rating
    });
    setShowCommentForm(true);
  };

  const handleDeleteComment = async (commentId) => {
    if (!confirm('Are you sure you want to delete this comment?')) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${import.meta.env.VITE_API_URL}/comments/${commentId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        setComments(prev => prev.filter(c => c._id !== commentId));
        toast.success('Comment deleted successfully!');
        loadCommentStats();
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || 'Failed to delete comment');
      }
    } catch (error) {
      console.error('Error deleting comment:', error);
      toast.error('Failed to delete comment');
    }
  };

  const renderStars = (rating, interactive = false, onRatingChange = null) => {
    return (
      <div className="flex">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type={interactive ? "button" : undefined}
            onClick={interactive ? () => onRatingChange(star) : undefined}
            className={interactive ? "cursor-pointer" : "cursor-default"}
            disabled={!interactive}
          >
            {star <= rating ? (
              <StarSolidIcon className="h-5 w-5 text-yellow-400" />
            ) : (
              <StarIcon className="h-5 w-5 text-gray-300" />
            )}
          </button>
        ))}
      </div>
    );
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const canUserComment = () => {
    if (!isAuthenticated) return false;
    const hasExistingComment = comments.some(c => c.userId?._id === user?.id);
    const hasShares = userShares > 0;
    return !hasExistingComment && hasShares;
  };

  const getCommentRestrictionMessage = () => {
    if (!isAuthenticated) return 'Please connect your wallet to leave a review';
    if (userShares <= 0) return 'You must own shares of this property to leave a review';
    const hasExistingComment = comments.some(c => c.userId?._id === user?.id);
    if (hasExistingComment) return 'You have already reviewed this property';
    return null;
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="border-b pb-4">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      {/* Header with stats */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <ChatBubbleLeftRightIcon className="h-5 w-5 mr-2" />
            Investor Reviews ({stats.totalComments})
          </h3>
          {stats.averageRating > 0 && (
            <div className="flex items-center space-x-2">
              {renderStars(Math.round(stats.averageRating))}
              <span className="text-sm text-gray-600">
                {stats.averageRating.toFixed(1)} average
              </span>
            </div>
          )}
        </div>
        
        {isAuthenticated ? (
          canUserComment() ? (
            <button
              onClick={() => setShowCommentForm(!showCommentForm)}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Write Review
            </button>
          ) : (
            <div className="text-sm text-gray-500 bg-gray-100 px-3 py-2 rounded-md">
              {getCommentRestrictionMessage()}
            </div>
          )
        ) : (
          <div className="text-sm text-gray-500 bg-gray-100 px-3 py-2 rounded-md">
            Connect wallet to leave a review
          </div>
        )}
      </div>

      {/* Comment form */}
      {showCommentForm && (
        <form onSubmit={handleSubmitComment} className="mb-6 p-4 bg-gray-50 rounded-lg">
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Rating
            </label>
            {renderStars(formData.rating, true, (rating) => 
              setFormData(prev => ({ ...prev, rating }))
            )}
          </div>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Your Review
              {userShares > 0 && (
                <span className="text-xs text-green-600 ml-2">
                  (Verified Investor - {userShares.toFixed(2)} shares)
                </span>
              )}
            </label>
            <textarea
              value={formData.content}
              onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Share your experience with this property investment..."
              maxLength={1000}
            />
            <div className="text-xs text-gray-500 mt-1">
              {formData.content.length}/1000 characters
            </div>
          </div>
          
          <div className="flex space-x-3">
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {submitting ? 'Posting...' : editingComment ? 'Update Review' : 'Post Review'}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowCommentForm(false);
                setEditingComment(null);
                setFormData({ content: '', rating: 5 });
              }}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Comments list */}
      {comments.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <ChatBubbleLeftRightIcon className="h-12 w-12 mx-auto mb-4 text-gray-300" />
          <p>No reviews yet.</p>
          <p className="text-sm mt-2">Only property shareholders can leave reviews.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {comments.map((comment) => (
            <div key={comment._id} className="border-b border-gray-200 pb-6 last:border-b-0">
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3">
                  <UserCircleIcon className="h-10 w-10 text-gray-400" />
                  <div>
                    <div className="flex items-center space-x-2">
                      <h4 className="font-medium text-gray-900">
                        {comment.userId?.name || 'Anonymous'}
                      </h4>
                      {comment.isVerifiedInvestor && (
                        <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">
                          Verified Investor
                        </span>
                      )}
                    </div>
                    <div className="flex items-center space-x-2 mt-1">
                      {renderStars(comment.rating)}
                      <span className="text-sm text-gray-500">
                        {formatDate(comment.createdAt)}
                      </span>
                    </div>
                  </div>
                </div>
                
                {user && comment.userId?._id === user.id && (
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleEditComment(comment)}
                      className="text-gray-400 hover:text-blue-600"
                    >
                      <PencilIcon className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteComment(comment._id)}
                      className="text-gray-400 hover:text-red-600"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
              
              <p className="mt-3 text-gray-700 leading-relaxed">
                {comment.content}
              </p>
              
              {comment.sharesOwned > 0 && (
                <div className="mt-2 text-xs text-gray-500">
                  Owns {comment.sharesOwned.toFixed(2)} shares
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Comments;

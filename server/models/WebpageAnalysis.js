const mongoose = require('mongoose');

const webpageAnalysisSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  webpageReadingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'WebpageReading',
    required: true
  },
  url: {
    type: String,
    required: true,
    maxlength: 2048
  },
  analysisType: {
    type: String,
    enum: ['general', 'summary', 'key_points', 'action_items', 'custom'],
    required: true
  },
  customPrompt: {
    type: String,
    maxlength: 2000
  },
  analysisResult: {
    type: String,
    required: true,
    maxlength: 10000
  },
  webpageSnapshot: {
    title: String,
    description: String,
    wordCount: Number,
    contentType: String,
    domain: String
  },
  aiMetadata: {
    provider: String, // e.g., 'openai', 'claude', 'custom'
    model: String,
    promptTokens: Number,
    completionTokens: Number,
    totalTokens: Number,
    processingTime: Number,
    cost: Number // if applicable
  },
  extractedInsights: {
    keyTopics: [String],
    sentiment: {
      type: String,
      enum: ['positive', 'negative', 'neutral', 'mixed']
    },
    actionItems: [String],
    relevantQuotes: [String],
    estimatedComplexity: {
      type: String,
      enum: ['low', 'medium', 'high']
    }
  },
  userFeedback: {
    rating: {
      type: Number,
      min: 1,
      max: 5
    },
    helpful: Boolean,
    notes: {
      type: String,
      maxlength: 1000
    }
  },
  tags: [String], // User-defined tags for categorization
  isBookmarked: {
    type: Boolean,
    default: false
  },
  sharedWith: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    permission: {
      type: String,
      enum: ['read', 'comment'],
      default: 'read'
    },
    sharedAt: {
      type: Date,
      default: Date.now
    }
  }],
  followUpAnalyses: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'WebpageAnalysis'
  }],
  parentAnalysisId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'WebpageAnalysis',
    sparse: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better query performance
webpageAnalysisSchema.index({ userId: 1, createdAt: -1 });
webpageAnalysisSchema.index({ userId: 1, analysisType: 1 });
webpageAnalysisSchema.index({ userId: 1, url: 1 });
webpageAnalysisSchema.index({ userId: 1, isBookmarked: 1 });
webpageAnalysisSchema.index({ userId: 1, tags: 1 });
webpageAnalysisSchema.index({ webpageReadingId: 1 });
webpageAnalysisSchema.index({ parentAnalysisId: 1 }, { sparse: true });

// Text index for search functionality
webpageAnalysisSchema.index({
  analysisResult: 'text',
  'extractedInsights.keyTopics': 'text',
  'extractedInsights.actionItems': 'text',
  'userFeedback.notes': 'text'
}, {
  weights: {
    analysisResult: 10,
    'extractedInsights.keyTopics': 8,
    'extractedInsights.actionItems': 6,
    'userFeedback.notes': 2
  },
  name: 'analysis_text_index'
});

// Virtual for analysis length
webpageAnalysisSchema.virtual('analysisLength').get(function() {
  return this.analysisResult ? this.analysisResult.length : 0;
});

// Virtual for estimated reading time of analysis
webpageAnalysisSchema.virtual('analysisReadTime').get(function() {
  if (!this.analysisResult) return 0;
  const words = this.analysisResult.split(/\s+/).length;
  return Math.ceil(words / 200); // Assuming 200 words per minute
});

// Virtual for cost-effectiveness score
webpageAnalysisSchema.virtual('costEffectiveness').get(function() {
  if (!this.aiMetadata?.cost || !this.userFeedback?.rating) return null;
  return (this.userFeedback.rating / this.aiMetadata.cost).toFixed(2);
});

// Method to add user tag
webpageAnalysisSchema.methods.addTag = function(tag) {
  if (!this.tags.includes(tag)) {
    this.tags.push(tag);
    return this.save();
  }
  return Promise.resolve(this);
};

// Method to remove user tag
webpageAnalysisSchema.methods.removeTag = function(tag) {
  const index = this.tags.indexOf(tag);
  if (index > -1) {
    this.tags.splice(index, 1);
    return this.save();
  }
  return Promise.resolve(this);
};

// Method to bookmark/unbookmark analysis
webpageAnalysisSchema.methods.toggleBookmark = function() {
  this.isBookmarked = !this.isBookmarked;
  return this.save();
};

// Method to add user feedback
webpageAnalysisSchema.methods.addFeedback = function(feedback) {
  this.userFeedback = {
    ...this.userFeedback,
    ...feedback,
    updatedAt: new Date()
  };
  return this.save();
};

// Method to share analysis with another user
webpageAnalysisSchema.methods.shareWith = function(userId, permission = 'read') {
  const existingShare = this.sharedWith.find(share => 
    share.userId.toString() === userId.toString()
  );
  
  if (existingShare) {
    existingShare.permission = permission;
    existingShare.sharedAt = new Date();
  } else {
    this.sharedWith.push({
      userId,
      permission,
      sharedAt: new Date()
    });
  }
  
  return this.save();
};

// Method to create follow-up analysis
webpageAnalysisSchema.methods.createFollowUp = function(analysisData) {
  const FollowUpAnalysis = this.constructor;
  
  return new FollowUpAnalysis({
    ...analysisData,
    userId: this.userId,
    url: this.url,
    parentAnalysisId: this._id,
    webpageReadingId: this.webpageReadingId
  }).save().then(followUp => {
    this.followUpAnalyses.push(followUp._id);
    return this.save().then(() => followUp);
  });
};

// Static method to get analysis statistics
webpageAnalysisSchema.statics.getAnalysisStats = function(userId, timeRange = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - timeRange);
  
  return this.aggregate([
    {
      $match: {
        userId: new mongoose.Types.ObjectId(userId),
        createdAt: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: null,
        totalAnalyses: { $sum: 1 },
        analysisTypes: { $push: '$analysisType' },
        totalTokens: { $sum: '$aiMetadata.totalTokens' },
        totalCost: { $sum: '$aiMetadata.cost' },
        averageRating: { $avg: '$userFeedback.rating' },
        bookmarkedCount: {
          $sum: { $cond: ['$isBookmarked', 1, 0] }
        },
        averageProcessingTime: { $avg: '$aiMetadata.processingTime' }
      }
    },
    {
      $addFields: {
        analysisTypeDistribution: {
          $arrayToObject: {
            $map: {
              input: { $setUnion: '$analysisTypes' },
              as: 'type',
              in: {
                k: '$$type',
                v: {
                  $size: {
                    $filter: {
                      input: '$analysisTypes',
                      cond: { $eq: ['$$this', '$$type'] }
                    }
                  }
                }
              }
            }
          }
        },
        averageTokensPerAnalysis: { $divide: ['$totalTokens', '$totalAnalyses'] },
        averageCostPerAnalysis: { $divide: ['$totalCost', '$totalAnalyses'] }
      }
    }
  ]);
};

// Static method for advanced search
webpageAnalysisSchema.statics.searchAnalyses = function(userId, options = {}) {
  const {
    query,
    analysisType,
    tags,
    isBookmarked,
    minRating,
    dateRange,
    page = 1,
    limit = 20,
    sortBy = 'createdAt',
    sortOrder = -1,
    includeShared = false
  } = options;
  
  const match = {};
  
  // User filter - include shared analyses if requested
  if (includeShared) {
    match.$or = [
      { userId: new mongoose.Types.ObjectId(userId) },
      { 'sharedWith.userId': new mongoose.Types.ObjectId(userId) }
    ];
  } else {
    match.userId = new mongoose.Types.ObjectId(userId);
  }
  
  // Text search
  if (query) {
    match.$text = { $search: query };
  }
  
  // Analysis type filter
  if (analysisType) {
    match.analysisType = analysisType;
  }
  
  // Tags filter
  if (tags && tags.length > 0) {
    match.tags = { $in: tags };
  }
  
  // Bookmark filter
  if (typeof isBookmarked === 'boolean') {
    match.isBookmarked = isBookmarked;
  }
  
  // Rating filter
  if (minRating) {
    match['userFeedback.rating'] = { $gte: minRating };
  }
  
  // Date range filter
  if (dateRange) {
    const { start, end } = dateRange;
    match.createdAt = {};
    if (start) match.createdAt.$gte = new Date(start);
    if (end) match.createdAt.$lte = new Date(end);
  }
  
  const skip = (page - 1) * limit;
  const sort = { [sortBy]: sortOrder };
  
  return this.aggregate([
    { $match: match },
    { $sort: sort },
    {
      $lookup: {
        from: 'webpagereadings',
        localField: 'webpageReadingId',
        foreignField: '_id',
        as: 'webpageReading'
      }
    },
    {
      $facet: {
        data: [
          { $skip: skip },
          { $limit: limit },
          {
            $project: {
              url: 1,
              analysisType: 1,
              analysisResult: { $substr: ['$analysisResult', 0, 300] }, // Truncate for list view
              extractedInsights: 1,
              userFeedback: 1,
              tags: 1,
              isBookmarked: 1,
              aiMetadata: {
                provider: 1,
                model: 1,
                totalTokens: 1,
                processingTime: 1
              },
              webpageSnapshot: 1,
              createdAt: 1,
              updatedAt: 1,
              'webpageReading.title': { $arrayElemAt: ['$webpageReading.title', 0] }
            }
          }
        ],
        totalCount: [{ $count: 'count' }],
        aggregations: [{
          $group: {
            _id: null,
            totalAnalyses: { $sum: 1 },
            avgRating: { $avg: '$userFeedback.rating' },
            typeDistribution: { 
              $push: '$analysisType' 
            }
          }
        }]
      }
    }
  ]);
};

// Static method to find related analyses
webpageAnalysisSchema.statics.findRelated = function(analysisId, userId, limit = 5) {
  return this.findById(analysisId)
    .then(analysis => {
      if (!analysis) throw new Error('Analysis not found');
      
      return this.find({
        userId: userId,
        _id: { $ne: analysisId },
        $or: [
          { url: analysis.url },
          { 'extractedInsights.keyTopics': { $in: analysis.extractedInsights.keyTopics } },
          { tags: { $in: analysis.tags } },
          { 'webpageSnapshot.contentType': analysis.webpageSnapshot?.contentType }
        ]
      })
      .limit(limit)
      .sort({ createdAt: -1 })
      .select('url analysisType webpageSnapshot createdAt tags');
    });
};

// Pre-save middleware
webpageAnalysisSchema.pre('save', function(next) {
  // Extract domain from URL if not provided
  if (this.url && !this.webpageSnapshot?.domain) {
    try {
      const urlObj = new URL(this.url);
      if (!this.webpageSnapshot) this.webpageSnapshot = {};
      this.webpageSnapshot.domain = urlObj.hostname;
    } catch (error) {
      // Invalid URL, skip domain extraction
    }
  }
  
  // Set default extracted insights structure
  if (!this.extractedInsights) {
    this.extractedInsights = {
      keyTopics: [],
      sentiment: 'neutral',
      actionItems: [],
      relevantQuotes: [],
      estimatedComplexity: 'medium'
    };
  }
  
  next();
});

// Post-save middleware for logging
webpageAnalysisSchema.post('save', function(doc) {
  console.log(`[WebpageAnalysis] Saved analysis: ${doc.analysisType} for ${doc.url} by user ${doc.userId}`);
});

const WebpageAnalysis = mongoose.model('WebpageAnalysis', webpageAnalysisSchema);

module.exports = WebpageAnalysis;
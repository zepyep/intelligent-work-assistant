const mongoose = require('mongoose');

const webpageReadingSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  url: {
    type: String,
    required: true,
    maxlength: 2048
  },
  title: {
    type: String,
    required: true,
    maxlength: 500
  },
  description: {
    type: String,
    maxlength: 1000
  },
  content: {
    type: String,
    required: true,
    maxlength: 50000 // Store truncated content
  },
  summary: {
    keySentences: [{
      type: String,
      maxlength: 1000
    }],
    mainTopics: [String],
    contentType: {
      type: String,
      enum: ['article', 'tutorial', 'ecommerce', 'documentation', 'corporate', 'general'],
      default: 'general'
    },
    wordCount: {
      type: Number,
      min: 0
    },
    estimatedReadTime: {
      type: Number,
      min: 0
    },
    summary: {
      type: String,
      maxlength: 1000
    }
  },
  headings: [{
    level: {
      type: Number,
      min: 1,
      max: 6
    },
    text: {
      type: String,
      maxlength: 500
    }
  }],
  links: [{
    url: {
      type: String,
      maxlength: 2048
    },
    text: {
      type: String,
      maxlength: 500
    },
    title: String
  }],
  images: [{
    url: {
      type: String,
      maxlength: 2048
    },
    alt: {
      type: String,
      maxlength: 500
    },
    title: String
  }],
  metadata: {
    statusCode: Number,
    responseTime: Number,
    extractedAt: Date,
    sourceUrl: String,
    truncated: {
      type: Boolean,
      default: false
    }
  },
  readingType: {
    type: String,
    enum: ['single', 'batch'],
    default: 'single'
  },
  batchId: {
    type: String, // For grouping batch reads
    sparse: true
  },
  tags: [String], // User-defined tags
  isFavorite: {
    type: Boolean,
    default: false
  },
  notes: {
    type: String,
    maxlength: 2000 // User notes about the webpage
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better query performance
webpageReadingSchema.index({ userId: 1, createdAt: -1 });
webpageReadingSchema.index({ userId: 1, url: 1 });
webpageReadingSchema.index({ userId: 1, 'summary.contentType': 1 });
webpageReadingSchema.index({ userId: 1, tags: 1 });
webpageReadingSchema.index({ userId: 1, isFavorite: 1 });
webpageReadingSchema.index({ batchId: 1 }, { sparse: true });

// Text index for search functionality
webpageReadingSchema.index({
  title: 'text',
  description: 'text',
  'summary.summary': 'text',
  notes: 'text'
}, {
  weights: {
    title: 10,
    description: 5,
    'summary.summary': 3,
    notes: 2
  },
  name: 'webpage_text_index'
});

// Virtual for reading time in human-readable format
webpageReadingSchema.virtual('readTimeFormatted').get(function() {
  if (!this.summary?.estimatedReadTime) return 'Unknown';
  const minutes = this.summary.estimatedReadTime;
  if (minutes < 1) return 'Less than 1 minute';
  if (minutes === 1) return '1 minute';
  return `${minutes} minutes`;
});

// Virtual for domain extraction
webpageReadingSchema.virtual('domain').get(function() {
  try {
    const url = new URL(this.url);
    return url.hostname;
  } catch (error) {
    return 'Unknown';
  }
});

// Method to add user tags
webpageReadingSchema.methods.addTag = function(tag) {
  if (!this.tags.includes(tag)) {
    this.tags.push(tag);
    return this.save();
  }
  return Promise.resolve(this);
};

// Method to remove user tags
webpageReadingSchema.methods.removeTag = function(tag) {
  const index = this.tags.indexOf(tag);
  if (index > -1) {
    this.tags.splice(index, 1);
    return this.save();
  }
  return Promise.resolve(this);
};

// Method to toggle favorite status
webpageReadingSchema.methods.toggleFavorite = function() {
  this.isFavorite = !this.isFavorite;
  return this.save();
};

// Static method to find by URL for a user
webpageReadingSchema.statics.findByUrl = function(userId, url) {
  return this.findOne({ userId, url }).sort({ createdAt: -1 });
};

// Static method to get reading statistics
webpageReadingSchema.statics.getReadingStats = function(userId, timeRange = 30) {
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
        totalReads: { $sum: 1 },
        totalWords: { $sum: '$summary.wordCount' },
        totalReadTime: { $sum: '$summary.estimatedReadTime' },
        contentTypes: { $push: '$summary.contentType' },
        domains: { $push: '$domain' },
        favoriteCount: {
          $sum: { $cond: ['$isFavorite', 1, 0] }
        }
      }
    },
    {
      $addFields: {
        averageWordsPerRead: { $divide: ['$totalWords', '$totalReads'] },
        averageReadTimePerRead: { $divide: ['$totalReadTime', '$totalReads'] },
        contentTypeDistribution: {
          $arrayToObject: {
            $map: {
              input: { $setUnion: '$contentTypes' },
              as: 'type',
              in: {
                k: '$$type',
                v: {
                  $size: {
                    $filter: {
                      input: '$contentTypes',
                      cond: { $eq: ['$$this', '$$type'] }
                    }
                  }
                }
              }
            }
          }
        },
        topDomains: {
          $slice: [
            {
              $map: {
                input: { $setUnion: '$domains' },
                as: 'domain',
                in: {
                  domain: '$$domain',
                  count: {
                    $size: {
                      $filter: {
                        input: '$domains',
                        cond: { $eq: ['$$this', '$$domain'] }
                      }
                    }
                  }
                }
              }
            },
            10
          ]
        }
      }
    }
  ]);
};

// Static method for search with filters
webpageReadingSchema.statics.searchReadings = function(userId, options = {}) {
  const {
    query,
    contentType,
    tags,
    isFavorite,
    dateRange,
    page = 1,
    limit = 20,
    sortBy = 'createdAt',
    sortOrder = -1
  } = options;
  
  const match = { userId: new mongoose.Types.ObjectId(userId) };
  
  // Text search
  if (query) {
    match.$text = { $search: query };
  }
  
  // Content type filter
  if (contentType) {
    match['summary.contentType'] = contentType;
  }
  
  // Tags filter
  if (tags && tags.length > 0) {
    match.tags = { $in: tags };
  }
  
  // Favorite filter
  if (typeof isFavorite === 'boolean') {
    match.isFavorite = isFavorite;
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
      $facet: {
        data: [
          { $skip: skip },
          { $limit: limit },
          {
            $project: {
              url: 1,
              title: 1,
              description: 1,
              summary: 1,
              domain: { $function: {
                body: function(url) {
                  try {
                    return new URL(url).hostname;
                  } catch (e) {
                    return 'Unknown';
                  }
                },
                args: ['$url'],
                lang: 'js'
              }},
              tags: 1,
              isFavorite: 1,
              readingType: 1,
              createdAt: 1,
              updatedAt: 1
            }
          }
        ],
        totalCount: [{ $count: 'count' }]
      }
    }
  ]);
};

// Pre-save middleware to ensure required fields
webpageReadingSchema.pre('save', function(next) {
  // Ensure summary object exists
  if (!this.summary) {
    this.summary = {
      keySentences: [],
      mainTopics: [],
      contentType: 'general',
      wordCount: 0,
      estimatedReadTime: 0,
      summary: ''
    };
  }
  
  // Ensure metadata object exists
  if (!this.metadata) {
    this.metadata = {
      extractedAt: new Date(),
      sourceUrl: this.url
    };
  }
  
  next();
});

// Post-save middleware for logging
webpageReadingSchema.post('save', function(doc) {
  console.log(`[WebpageReading] Saved reading record: ${doc.title} for user ${doc.userId}`);
});

const WebpageReading = mongoose.model('WebpageReading', webpageReadingSchema);

module.exports = WebpageReading;
import { z } from 'zod';
import { paginationQuery, uuidSchema } from './common';

// ------------------------------------------------------------------ //
//  Social post schemas                                                //
// ------------------------------------------------------------------ //

export const platforms = ['facebook', 'instagram', 'linkedin', 'youtube', 'tiktok', 'twitter', 'google_business'] as const;
export const postTypes = ['new_listing', 'open_house', 'under_contract', 'price_reduction', 'just_sold', 'testimonial', 'market_update', 'evergreen', 'custom'] as const;
export const postStatuses = ['draft', 'scheduled', 'published', 'rejected', 'pending_approval'] as const;

export const createPostSchema = z.object({
  platform: z.enum(platforms),
  postType: z.enum(postTypes),
  content: z.string().trim().min(1, 'Post content is required').max(5000),
  mediaUrls: z.array(z.string().url()).default([]),
  transactionId: uuidSchema.optional().nullable(),
  scheduledAt: z.string().datetime({ offset: true }).optional().nullable(),
  hashtags: z.array(z.string()).default([]),
  locationTag: z.string().max(255).optional().nullable(),
  complianceApproved: z.boolean().default(false),
  metadata: z.record(z.unknown()).default({}),
});

export const updatePostSchema = z.object({
  content: z.string().max(5000).optional(),
  mediaUrls: z.array(z.string().url()).optional(),
  scheduledAt: z.string().datetime({ offset: true }).optional().nullable(),
  hashtags: z.array(z.string()).optional(),
  locationTag: z.string().max(255).optional().nullable(),
  status: z.enum(postStatuses).optional(),
  complianceApproved: z.boolean().optional(),
  metadata: z.record(z.unknown()).optional(),
}).refine((data) => Object.keys(data).length > 0, {
  message: 'At least one field must be provided for update',
});

export const generatePostSchema = z.object({
  postType: z.enum(postTypes),
  platform: z.enum(platforms),
  transactionId: uuidSchema.optional(),
  tone: z.enum(['professional', 'friendly', 'luxury', 'first_time_buyer', 'casual']).default('professional'),
  additionalContext: z.string().max(1000).optional(),
});

export const bulkScheduleSchema = z.object({
  posts: z.array(z.object({
    platform: z.enum(platforms),
    postType: z.enum(postTypes),
    content: z.string().trim().min(1).max(5000),
    mediaUrls: z.array(z.string().url()).default([]),
    scheduledAt: z.string().datetime({ offset: true }),
    hashtags: z.array(z.string()).default([]),
  })).min(1, 'At least one post is required'),
});

export const listPostsQuery = paginationQuery.extend({
  agentId: uuidSchema.optional(),
  platform: z.string().optional(),
  postType: z.string().optional(),
  status: z.string().optional(),
  transactionId: uuidSchema.optional(),
  scheduledFrom: z.string().optional(),
  scheduledTo: z.string().optional(),
  sortBy: z.enum(['createdAt', 'publishedAt', 'scheduledAt']).default('createdAt'),
});

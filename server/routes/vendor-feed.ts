import type { Express } from "express";
import { storage } from "../storage";
import { requireAuth } from "../middleware/auth";
import { z } from "zod";
import { insertVendorPostSchema, vendorPosts, vendorPostLikes, vendorPostComments } from "../../shared/schema";

// Validation schemas
const createPostSchema = insertVendorPostSchema.extend({
  title: z.string().min(1, "Title is required").max(200, "Title too long"),
  content: z.string().min(1, "Content is required").max(2000, "Content too long"),
  postType: z.enum(["PRODUCT_UPDATE", "NEW_PRODUCT", "PROMOTION", "ANNOUNCEMENT", "RESTOCK"]),
  productId: z.string().uuid().optional(),
  images: z.array(z.string().url()).max(5, "Maximum 5 images allowed").optional(),
  tags: z.array(z.string()).max(10, "Maximum 10 tags allowed").optional(),
  originalPrice: z.number().positive().optional(),
  discountPrice: z.number().positive().optional(),
  discountPercentage: z.number().min(0).max(100).optional(),
  validUntil: z.string().datetime().optional()
});

const updatePostSchema = createPostSchema.partial().extend({
  id: z.string().uuid()
});

const likePostSchema = z.object({
  postId: z.string().uuid()
});

const commentSchema = z.object({
  postId: z.string().uuid(),
  content: z.string().min(1, "Comment cannot be empty").max(500, "Comment too long"),
  parentCommentId: z.number().optional()
});

export function registerVendorFeedRoutes(app: Express) {
  // Create a new vendor post
  app.post("/api/vendor/posts", requireAuth, async (req, res) => {
    try {
      const userId = req.session!.userId!;
      const user = await storage.getUserById(userId);
      
      if (!user || user.role !== 'MERCHANT') {
        return res.status(403).json({
          success: false,
          message: "Only merchants can create posts"
        });
      }

      const validatedData = createPostSchema.parse(req.body);
      
      // Validate pricing logic
      if (validatedData.originalPrice && validatedData.discountPrice) {
        if (validatedData.discountPrice >= validatedData.originalPrice) {
          return res.status(400).json({
            success: false,
            message: "Discount price must be less than original price"
          });
        }
      }

      // Calculate discount percentage if not provided
      if (validatedData.originalPrice && validatedData.discountPrice && !validatedData.discountPercentage) {
        validatedData.discountPercentage = Math.round(
          ((validatedData.originalPrice - validatedData.discountPrice) / validatedData.originalPrice) * 100
        );
      }

      const post = await storage.createVendorPost({
        ...validatedData,
        vendorId: userId,
        originalPrice: validatedData.originalPrice?.toString(),
        discountPrice: validatedData.discountPrice?.toString(),
        validUntil: validatedData.validUntil ? new Date(validatedData.validUntil) : undefined
      });

      // Real-time notification to followers
      if ((global as any).io) {
        (global as any).io.emit('new_vendor_post', {
          type: 'NEW_POST',
          vendorId: userId,
          postId: post.id,
          postType: post.postType,
          title: post.title,
          timestamp: Date.now()
        });
      }

      res.status(201).json({
        success: true,
        message: "Post created successfully",
        post
      });
    } catch (error: any) {
      console.error("Create post error:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({
          success: false,
          message: "Invalid post data",
          errors: error.errors
        });
      }
      res.status(500).json({
        success: false,
        message: "Failed to create post"
      });
    }
  });

  // Get vendor posts (with pagination and filtering)
  app.get("/api/vendor/posts", async (req, res) => {
    try {
      const {
        vendorId,
        postType,
        page = '1',
        limit = '20',
        sortBy = 'recent'
      } = req.query;

      const posts = await storage.getVendorPosts({
        vendorId: vendorId ? parseInt(vendorId as string) : undefined,
        postType: postType as string,
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        sortBy: sortBy as string
      });

      res.json({
        success: true,
        posts: posts.posts,
        pagination: posts.pagination
      });
    } catch (error) {
      console.error("Get vendor posts error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch posts"
      });
    }
  });

  // Get single vendor post with details
  app.get("/api/vendor/posts/:postId", async (req, res) => {
    try {
      const { postId } = req.params;
      const post = await storage.getVendorPostById(postId);
      
      if (!post) {
        return res.status(404).json({
          success: false,
          message: "Post not found"
        });
      }

      // Increment view count
      await storage.incrementPostViewCount(postId);

      res.json({
        success: true,
        post
      });
    } catch (error) {
      console.error("Get vendor post error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch post"
      });
    }
  });

  // Update vendor post
  app.put("/api/vendor/posts/:postId", requireAuth, async (req, res) => {
    try {
      const userId = req.session!.userId!;
      const { postId } = req.params;
      const validatedData = updatePostSchema.parse({ ...req.body, id: postId });

      // Verify ownership
      const existingPost = await storage.getVendorPostById(postId);
      if (!existingPost || existingPost.vendorId !== userId) {
        return res.status(403).json({
          success: false,
          message: "You can only edit your own posts"
        });
      }

      const updatedPost = await storage.updateVendorPost(postId, validatedData);

      res.json({
        success: true,
        message: "Post updated successfully",
        post: updatedPost
      });
    } catch (error: any) {
      console.error("Update post error:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({
          success: false,
          message: "Invalid post data",
          errors: error.errors
        });
      }
      res.status(500).json({
        success: false,
        message: "Failed to update post"
      });
    }
  });

  // Delete vendor post
  app.delete("/api/vendor/posts/:postId", requireAuth, async (req, res) => {
    try {
      const userId = req.session!.userId!;
      const { postId } = req.params;

      // Verify ownership
      const post = await storage.getVendorPostById(postId);
      if (!post || post.vendorId !== userId) {
        return res.status(403).json({
          success: false,
          message: "You can only delete your own posts"
        });
      }

      await storage.deleteVendorPost(postId);

      res.json({
        success: true,
        message: "Post deleted successfully"
      });
    } catch (error) {
      console.error("Delete post error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to delete post"
      });
    }
  });

  // Like/Unlike a vendor post
  app.post("/api/vendor/posts/like", requireAuth, async (req, res) => {
    try {
      const userId = req.session!.userId!;
      const { postId } = likePostSchema.parse(req.body);

      const result = await storage.togglePostLike(postId, userId);

      res.json({
        success: true,
        message: result.liked ? "Post liked" : "Post unliked",
        liked: result.liked,
        likeCount: result.likeCount
      });
    } catch (error: any) {
      console.error("Like post error:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({
          success: false,
          message: "Invalid request data",
          errors: error.errors
        });
      }
      res.status(500).json({
        success: false,
        message: "Failed to like post"
      });
    }
  });

  // Add comment to vendor post
  app.post("/api/vendor/posts/comment", requireAuth, async (req, res) => {
    try {
      const userId = req.session!.userId!;
      const validatedData = commentSchema.parse(req.body);

      const comment = await storage.addPostComment({
        ...validatedData,
        userId
      });

      // Real-time notification
      if ((global as any).io) {
        (global as any).io.emit('new_post_comment', {
          type: 'NEW_COMMENT',
          postId: validatedData.postId,
          commentId: comment.id,
          userId,
          timestamp: Date.now()
        });
      }

      res.status(201).json({
        success: true,
        message: "Comment added successfully",
        comment
      });
    } catch (error: any) {
      console.error("Add comment error:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({
          success: false,
          message: "Invalid comment data",
          errors: error.errors
        });
      }
      res.status(500).json({
        success: false,
        message: "Failed to add comment"
      });
    }
  });

  // Get comments for a post
  app.get("/api/vendor/posts/:postId/comments", async (req, res) => {
    try {
      const { postId } = req.params;
      const { page = '1', limit = '20' } = req.query;

      const comments = await storage.getPostComments(postId, {
        page: parseInt(page as string),
        limit: parseInt(limit as string)
      });

      res.json({
        success: true,
        comments: comments.comments,
        pagination: comments.pagination
      });
    } catch (error) {
      console.error("Get comments error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch comments"
      });
    }
  });

  // Get merchant analytics for posts
  app.get("/api/vendor/posts/analytics", requireAuth, async (req, res) => {
    try {
      const userId = req.session!.userId!;
      const user = await storage.getUserById(userId);
      
      if (!user || user.role !== 'MERCHANT') {
        return res.status(403).json({
          success: false,
          message: "Only merchants can view post analytics"
        });
      }

      const analytics = await storage.getVendorPostAnalytics(userId);

      res.json({
        success: true,
        analytics
      });
    } catch (error) {
      console.error("Get post analytics error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch analytics"
      });
    }
  });
}
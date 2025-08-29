
import { Router } from "express";
import { z } from "zod";
import { storage } from "../storage";
import { requireAuth } from "../middleware/auth";

const router = Router();

// Validation schemas
const createCategorySchema = z.object({
  name: z.string().min(1, "Category name is required").max(100),
  description: z.string().optional(),
  parentId: z.number().optional(),
  isActive: z.boolean().default(true),
  sortOrder: z.number().default(0)
});

const updateCategorySchema = createCategorySchema.partial().extend({
  id: z.number()
});

// Get all categories
router.get("/", async (req, res) => {
  try {
    const { includeInactive = false } = req.query;
    
    const categories = await storage.getCategories({
      includeInactive: includeInactive === 'true'
    });

    res.json({
      success: true,
      categories
    });
  } catch (error) {
    console.error("Get categories error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch categories"
    });
  }
});

// Get category by ID
router.get("/:categoryId", async (req, res) => {
  try {
    const { categoryId } = req.params;
    const category = await storage.getCategoryById(parseInt(categoryId));

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found"
      });
    }

    res.json({
      success: true,
      category
    });
  } catch (error) {
    console.error("Get category error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch category"
    });
  }
});

// Create category (Admin/Merchant only)
router.post("/", requireAuth, async (req, res) => {
  try {
    const userId = req.session!.userId!;
    const user = await storage.getUserById(userId);

    if (!user || (user.role !== 'ADMIN' && user.role !== 'MERCHANT')) {
      return res.status(403).json({
        success: false,
        message: "Only admins and merchants can create categories"
      });
    }

    const validatedData = createCategorySchema.parse(req.body);
    const category = await storage.createCategory({
      ...validatedData,
      createdBy: userId
    });

    res.status(201).json({
      success: true,
      message: "Category created successfully",
      category
    });
  } catch (error: any) {
    console.error("Create category error:", error);
    if (error.name === 'ZodError') {
      return res.status(400).json({
        success: false,
        message: "Invalid category data",
        errors: error.errors
      });
    }
    res.status(500).json({
      success: false,
      message: "Failed to create category"
    });
  }
});

// Update category (Admin/Merchant only)
router.put("/:categoryId", requireAuth, async (req, res) => {
  try {
    const userId = req.session!.userId!;
    const user = await storage.getUserById(userId);
    const { categoryId } = req.params;

    if (!user || (user.role !== 'ADMIN' && user.role !== 'MERCHANT')) {
      return res.status(403).json({
        success: false,
        message: "Only admins and merchants can update categories"
      });
    }

    const validatedData = updateCategorySchema.parse({ 
      ...req.body, 
      id: parseInt(categoryId) 
    });

    const updatedCategory = await storage.updateCategory(parseInt(categoryId), {
      ...validatedData,
      updatedBy: userId
    });

    res.json({
      success: true,
      message: "Category updated successfully",
      category: updatedCategory
    });
  } catch (error: any) {
    console.error("Update category error:", error);
    if (error.name === 'ZodError') {
      return res.status(400).json({
        success: false,
        message: "Invalid category data",
        errors: error.errors
      });
    }
    res.status(500).json({
      success: false,
      message: "Failed to update category"
    });
  }
});

// Delete category (Admin only)
router.delete("/:categoryId", requireAuth, async (req, res) => {
  try {
    const userId = req.session!.userId!;
    const user = await storage.getUserById(userId);
    const { categoryId } = req.params;

    if (!user || user.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        message: "Only admins can delete categories"
      });
    }

    await storage.deleteCategory(parseInt(categoryId));

    res.json({
      success: true,
      message: "Category deleted successfully"
    });
  } catch (error) {
    console.error("Delete category error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete category"
    });
  }
});

export default router;

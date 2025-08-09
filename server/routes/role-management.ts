import { Router } from "express";
import { z } from "zod";
import { RoleManagementService } from "../services/role-management";
import { requireAuth } from "../middleware/auth";
import { requireAdminAuth } from "../middleware/adminAuth";

const router = Router();

// Role application schema
const roleApplicationSchema = z.object({
  fromRole: z.enum(["CONSUMER", "MERCHANT", "DRIVER"]),
  toRole: z.enum(["CONSUMER", "MERCHANT", "DRIVER"]),
  applicationData: z.record(z.any()).optional(),
  documents: z.array(z.string()).optional(),
});

const roleReviewSchema = z.object({
  status: z.enum(["APPROVED", "REJECTED", "REQUIRES_ADDITIONAL_INFO"]),
  reviewNotes: z.string().optional(),
  rejectionReason: z.string().optional(),
});

const roleSwitchSchema = z.object({
  targetRole: z.enum(["CONSUMER", "MERCHANT", "DRIVER"]),
});

// Apply for a new role
router.post("/apply", requireAuth, async (req, res) => {
  try {
    const validatedData = roleApplicationSchema.parse(req.body);
    const userId = req.user!.id;

    const result = await RoleManagementService.applyForRole({
      userId,
      ...validatedData,
    });

    if (result.success) {
      res.json({ 
        success: true, 
        message: "Role application submitted successfully",
        application: result.application 
      });
    } else {
      res.status(400).json({ success: false, error: result.error });
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ success: false, error: "Invalid input data", details: error.errors });
    } else {
      res.status(500).json({ success: false, error: "Internal server error" });
    }
  }
});

// Get user's role applications
router.get("/applications", requireAuth, async (req, res) => {
  try {
    const userId = req.user!.id;
    const result = await RoleManagementService.getUserRoleApplications(userId);

    if (result.success) {
      res.json({ success: true, applications: result.applications });
    } else {
      res.status(500).json({ success: false, error: result.error });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

// Get user's active roles
router.get("/roles", requireAuth, async (req, res) => {
  try {
    const userId = req.user!.id;
    const result = await RoleManagementService.getUserRoles(userId);

    if (result.success) {
      res.json({ success: true, roles: result.roles });
    } else {
      res.status(500).json({ success: false, error: result.error });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

// Switch active role
router.post("/switch", requireAuth, async (req, res) => {
  try {
    const validatedData = roleSwitchSchema.parse(req.body);
    const userId = req.user!.id;

    const result = await RoleManagementService.switchUserRole(userId, validatedData.targetRole);

    if (result.success) {
      res.json({ success: true, message: result.message });
    } else {
      res.status(400).json({ success: false, error: result.error });
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ success: false, error: "Invalid input data", details: error.errors });
    } else {
      res.status(500).json({ success: false, error: "Internal server error" });
    }
  }
});

// Deactivate a role
router.delete("/roles/:role", requireAuth, async (req, res) => {
  try {
    const { role } = req.params;
    const userId = req.user!.id;

    if (!["CONSUMER", "MERCHANT", "DRIVER"].includes(role)) {
      return res.status(400).json({ success: false, error: "Invalid role" });
    }

    const result = await RoleManagementService.deactivateUserRole(userId, role);

    if (result.success) {
      res.json({ success: true, message: result.message });
    } else {
      res.status(400).json({ success: false, error: result.error });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

// Admin Routes

// Get pending role applications
router.get("/admin/pending", requireAdminAuth, async (req, res) => {
  try {
    const result = await RoleManagementService.getPendingApplications();

    if (result.success) {
      res.json({ success: true, applications: result.applications });
    } else {
      res.status(500).json({ success: false, error: result.error });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

// Review role application
router.post("/admin/review/:applicationId", requireAdminAuth, async (req, res) => {
  try {
    const { applicationId } = req.params;
    const validatedData = roleReviewSchema.parse(req.body);
    const reviewerId = req.user!.id;

    const result = await RoleManagementService.reviewRoleApplication(
      applicationId,
      reviewerId,
      validatedData.status,
      validatedData.reviewNotes,
      validatedData.rejectionReason
    );

    if (result.success) {
      res.json({ 
        success: true, 
        message: "Application reviewed successfully",
        application: result.application 
      });
    } else {
      res.status(400).json({ success: false, error: result.error });
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ success: false, error: "Invalid input data", details: error.errors });
    } else {
      res.status(500).json({ success: false, error: "Internal server error" });
    }
  }
});

// Manually activate role for user (admin only)
router.post("/admin/activate", requireAdminAuth, async (req, res) => {
  try {
    const { userId, role, isPrimary } = req.body;

    if (!userId || !role) {
      return res.status(400).json({ success: false, error: "userId and role are required" });
    }

    const result = await RoleManagementService.activateUserRole(
      parseInt(userId), 
      role, 
      isPrimary || false
    );

    if (result.success) {
      res.json({ 
        success: true, 
        message: "Role activated successfully",
        role: result.role 
      });
    } else {
      res.status(400).json({ success: false, error: result.error });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

export default router;
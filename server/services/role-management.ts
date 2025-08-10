import { db } from "../db";
import { users, adminUsers } from "../../shared/schema";
import { eq, and, desc } from "drizzle-orm";

export class RoleManagementService {
  // Apply for a new role
  static async applyForRole(applicationData: Omit<InsertRoleApplication, 'id' | 'createdAt' | 'updatedAt'>) {
    try {
      const [application] = await db.insert(roleApplications).values({
        ...applicationData,
        appliedAt: new Date(),
      }).returning();
      
      return { success: true, application };
    } catch (error) {
      console.error('Error creating role application:', error);
      return { success: false, error: 'Failed to submit role application' };
    }
  }

  // Get user's role applications
  static async getUserRoleApplications(userId: number) {
    try {
      const applications = await db
        .select()
        .from(roleApplications)
        .where(eq(roleApplications.userId, userId))
        .orderBy(desc(roleApplications.appliedAt));
      
      return { success: true, applications };
    } catch (error) {
      console.error('Error fetching role applications:', error);
      return { success: false, error: 'Failed to fetch applications' };
    }
  }

  // Admin: Review role application
  static async reviewRoleApplication(
    applicationId: string, 
    reviewerId: number, 
    status: 'APPROVED' | 'REJECTED' | 'REQUIRES_ADDITIONAL_INFO',
    reviewNotes?: string,
    rejectionReason?: string
  ) {
    try {
      const [updatedApplication] = await db
        .update(roleApplications)
        .set({
          applicationStatus: status,
          reviewedBy: reviewerId,
          reviewNotes,
          rejectionReason,
          reviewedAt: new Date(),
          ...(status === 'APPROVED' && { approvedAt: new Date() })
        })
        .where(eq(roleApplications.id, applicationId))
        .returning();

      // If approved, create new user role
      if (status === 'APPROVED' && updatedApplication) {
        await this.activateUserRole(updatedApplication.userId, updatedApplication.toRole);
      }

      return { success: true, application: updatedApplication };
    } catch (error) {
      console.error('Error reviewing role application:', error);
      return { success: false, error: 'Failed to review application' };
    }
  }

  // Activate a new role for user
  static async activateUserRole(userId: number, role: string, isPrimary: boolean = false) {
    try {
      // If setting as primary, deactivate current primary role
      if (isPrimary) {
        await db
          .update(userRoles)
          .set({ isPrimary: false })
          .where(and(eq(userRoles.userId, userId), eq(userRoles.isPrimary, true)));
      }

      const [newRole] = await db.insert(userRoles).values({
        userId,
        role: role as any,
        isActive: true,
        isPrimary,
        activatedAt: new Date(),
      }).returning();

      // Update primary role in users table if this is the new primary
      if (isPrimary) {
        await db
          .update(users)
          .set({ role: role as any })
          .where(eq(users.id, userId));
      }

      return { success: true, role: newRole };
    } catch (error) {
      console.error('Error activating user role:', error);
      return { success: false, error: 'Failed to activate role' };
    }
  }

  // Switch active role (for multi-role users)
  static async switchUserRole(userId: number, targetRole: string) {
    try {
      // Check if user has this role
      const existingRole = await db
        .select()
        .from(userRoles)
        .where(and(
          eq(userRoles.userId, userId),
          eq(userRoles.role, targetRole as any),
          eq(userRoles.isActive, true)
        ))
        .limit(1);

      if (existingRole.length === 0) {
        return { success: false, error: 'User does not have this role' };
      }

      // Deactivate current primary role
      await db
        .update(userRoles)
        .set({ isPrimary: false })
        .where(and(eq(userRoles.userId, userId), eq(userRoles.isPrimary, true)));

      // Set new primary role
      await db
        .update(userRoles)
        .set({ isPrimary: true })
        .where(and(
          eq(userRoles.userId, userId),
          eq(userRoles.role, targetRole as any)
        ));

      // Update users table
      await db
        .update(users)
        .set({ role: targetRole as any })
        .where(eq(users.id, userId));

      return { success: true, message: 'Role switched successfully' };
    } catch (error) {
      console.error('Error switching user role:', error);
      return { success: false, error: 'Failed to switch role' };
    }
  }

  // Get user's active roles
  static async getUserRoles(userId: number) {
    try {
      const roles = await db
        .select()
        .from(userRoles)
        .where(and(eq(userRoles.userId, userId), eq(userRoles.isActive, true)))
        .orderBy(desc(userRoles.isPrimary));

      return { success: true, roles };
    } catch (error) {
      console.error('Error fetching user roles:', error);
      return { success: false, error: 'Failed to fetch roles' };
    }
  }

  // Deactivate a role
  static async deactivateUserRole(userId: number, role: string) {
    try {
      await db
        .update(userRoles)
        .set({ 
          isActive: false,
          isPrimary: false,
          deactivatedAt: new Date()
        })
        .where(and(
          eq(userRoles.userId, userId),
          eq(userRoles.role, role as any)
        ));

      return { success: true, message: 'Role deactivated successfully' };
    } catch (error) {
      console.error('Error deactivating user role:', error);
      return { success: false, error: 'Failed to deactivate role' };
    }
  }

  // Get pending role applications for admin review
  static async getPendingApplications() {
    try {
      const applications = await db
        .select({
          id: roleApplications.id,
          userId: roleApplications.userId,
          fromRole: roleApplications.fromRole,
          toRole: roleApplications.toRole,
          applicationStatus: roleApplications.applicationStatus,
          applicationData: roleApplications.applicationData,
          documents: roleApplications.documents,
          appliedAt: roleApplications.appliedAt,
          userFullName: users.fullName,
          userEmail: users.email,
        })
        .from(roleApplications)
        .leftJoin(users, eq(roleApplications.userId, users.id))
        .where(eq(roleApplications.applicationStatus, 'PENDING'))
        .orderBy(desc(roleApplications.appliedAt));

      return { success: true, applications };
    } catch (error) {
      console.error('Error fetching pending applications:', error);
      return { success: false, error: 'Failed to fetch applications' };
    }
  }
}
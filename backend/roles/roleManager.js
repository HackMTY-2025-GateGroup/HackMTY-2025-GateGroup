import { ROLES, PERMISSIONS } from '../config/constants.js';

/**
 * Role Manager - Handles role-based access control
 */
class RoleManager {
  constructor() {
    // Define role hierarchy (higher number = more permissions)
    this.roleHierarchy = {
      [ROLES.GUEST]: 0,
      [ROLES.USER]: 1,
      [ROLES.MODERATOR]: 2,
      [ROLES.ADMIN]: 3,
    };

    // Define permissions for each role
    this.rolePermissions = {
      [ROLES.GUEST]: [PERMISSIONS.READ],
      [ROLES.USER]: [PERMISSIONS.READ, PERMISSIONS.WRITE],
      [ROLES.MODERATOR]: [PERMISSIONS.READ, PERMISSIONS.WRITE, PERMISSIONS.UPDATE, PERMISSIONS.DELETE],
      [ROLES.ADMIN]: [PERMISSIONS.READ, PERMISSIONS.WRITE, PERMISSIONS.UPDATE, PERMISSIONS.DELETE, PERMISSIONS.ADMIN],
    };
  }

  /**
   * Check if a role exists
   */
  isValidRole(role) {
    return Object.values(ROLES).includes(role);
  }

  /**
   * Get permissions for a specific role
   */
  getPermissions(role) {
    return this.rolePermissions[role] || [];
  }

  /**
   * Check if a role has a specific permission
   */
  hasPermission(role, permission) {
    const permissions = this.getPermissions(role);
    return permissions.includes(permission);
  }

  /**
   * Check if a role has higher or equal hierarchy than another role
   */
  hasHigherOrEqualRole(userRole, requiredRole) {
    const userLevel = this.roleHierarchy[userRole] || 0;
    const requiredLevel = this.roleHierarchy[requiredRole] || 0;
    return userLevel >= requiredLevel;
  }

  /**
   * Get all available roles
   */
  getAllRoles() {
    return Object.values(ROLES);
  }

  /**
   * Assign role to user (returns role or default to USER)
   */
  assignRole(role) {
    if (this.isValidRole(role)) {
      return role;
    }
    return ROLES.USER;
  }
}

export default new RoleManager();

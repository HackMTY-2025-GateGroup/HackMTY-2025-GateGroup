import { supabase } from '../config/supabase.js';
import { STATUS_CODES, MESSAGES } from '../config/constants.js';

/**
 * Get all users (Admin only)
 */
export const getAllUsers = async (req, res) => {
  try {
    const { data: users, error } = await supabase
      .from('profiles')
      .select('id, email, entrance, name, role, created_at')
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(STATUS_CODES.INTERNAL_ERROR).json({
        success: false,
        message: 'Error fetching users',
        error: error.message,
      });
    }

    res.status(STATUS_CODES.SUCCESS).json({
      success: true,
      data: { users, count: users.length },
    });
  } catch (error) {
    console.error('Get all users error:', error);
    res.status(STATUS_CODES.INTERNAL_ERROR).json({
      success: false,
      message: MESSAGES.ERROR,
      error: error.message,
    });
  }
};

/**
 * Get user by ID
 */
export const getUserById = async (req, res) => {
  try {
    const { id } = req.params;

    const { data: user, error } = await supabase
      .from('profiles')
      .select('id, email, entrance, name, role, created_at')
      .eq('id', id)
      .single();

    if (error || !user) {
      return res.status(STATUS_CODES.NOT_FOUND).json({
        success: false,
        message: MESSAGES.NOT_FOUND,
      });
    }

    res.status(STATUS_CODES.SUCCESS).json({
      success: true,
      data: { user },
    });
  } catch (error) {
    console.error('Get user by ID error:', error);
    res.status(STATUS_CODES.INTERNAL_ERROR).json({
      success: false,
      message: MESSAGES.ERROR,
      error: error.message,
    });
  }
};

/**
 * Update user
 */
export const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email } = req.body;

    const updates = {};
    if (name) updates.name = name;
    if (email) updates.email = email;

    const { data: user, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', id)
      .select('id, email, entrance, name, role, created_at')
      .single();

    if (error) {
      return res.status(STATUS_CODES.INTERNAL_ERROR).json({
        success: false,
        message: 'Error updating user',
        error: error.message,
      });
    }

    res.status(STATUS_CODES.SUCCESS).json({
      success: true,
      message: 'User updated successfully',
      data: { user },
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(STATUS_CODES.INTERNAL_ERROR).json({
      success: false,
      message: MESSAGES.ERROR,
      error: error.message,
    });
  }
};

/**
 * Delete user
 */
export const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('profiles')
      .delete()
      .eq('id', id);

    if (error) {
      return res.status(STATUS_CODES.INTERNAL_ERROR).json({
        success: false,
        message: 'Error deleting user',
        error: error.message,
      });
    }

    res.status(STATUS_CODES.SUCCESS).json({
      success: true,
      message: 'User deleted successfully',
    });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(STATUS_CODES.INTERNAL_ERROR).json({
      success: false,
      message: MESSAGES.ERROR,
      error: error.message,
    });
  }
};

export default {
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
};

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { supabase, supabaseAdmin } from '../config/supabase.js';
import { ROLES, STATUS_CODES, MESSAGES } from '../config/constants.js';
import roleManager from '../roles/roleManager.js';

/**
 * Generate JWT token
 */
const generateToken = (userId, email, role) => {
  return jwt.sign(
    { userId, email, role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE || '24h' }
  );
};

/**
 * Register a new user
 */
export const register = async (req, res) => {
  try {
    const { email, entrance, name, role } = req.body;

    // Validate input
    if (!email || !entrance || !name) {
      return res.status(STATUS_CODES.BAD_REQUEST).json({
        success: false,
        message: 'Please provide email, entrance, and name',
      });
    }

    // Check if user already exists (using admin client to bypass RLS)
    const { data: existingUser } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('email', email)
      .single();

    if (existingUser) {
      return res.status(STATUS_CODES.CONFLICT).json({
        success: false,
        message: 'User already exists',
      });
    }

    // Hash entrance (used as password)
    const salt = await bcrypt.genSalt(10);
    const hashedEntrance = await bcrypt.hash(entrance, salt);

    // Assign role, constrain to DB-allowed roles
    const ALLOWED_DB_ROLES = new Set([
      ROLES.ADMIN,
      ROLES.INVENTORY_MANAGER,
      ROLES.AIRCRAFT_MANAGER,
      ROLES.FLIGHT_ATTENDANT,
    ]);
    const requestedRole = roleManager.assignRole(role);
    const userRole = ALLOWED_DB_ROLES.has(requestedRole)
      ? requestedRole
      : ROLES.FLIGHT_ATTENDANT; // safe default per DB constraint

    // Create user in Supabase profiles table (using admin client to bypass RLS)
    const { data: newUser, error } = await supabaseAdmin
      .from('profiles')
      .insert([
        {
          email,
          entrance: hashedEntrance,
          name,
          role: userRole,
        },
      ])
      .select()
      .single();

    if (error) {
      return res.status(STATUS_CODES.INTERNAL_ERROR).json({
        success: false,
        message: 'Error creating user',
        error: error.message,
      });
    }

    // Generate token
    const token = generateToken(newUser.id, newUser.email, newUser.role);

    res.status(STATUS_CODES.CREATED).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user: {
          id: newUser.id,
          email: newUser.email,
          name: newUser.name,
          role: newUser.role,
        },
        token,
      },
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(STATUS_CODES.INTERNAL_ERROR).json({
      success: false,
      message: MESSAGES.ERROR,
      error: error.message,
    });
  }
};

/**
 * Login user
 */
export const login = async (req, res) => {
  try {
    const { email, entrance } = req.body;

    // Validate input
    if (!email || !entrance) {
      return res.status(STATUS_CODES.BAD_REQUEST).json({
        success: false,
        message: 'Please provide email and entrance',
      });
    }

    // Find user
    const { data: user, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', email)
      .single();

    if (error || !user) {
      return res.status(STATUS_CODES.UNAUTHORIZED).json({
        success: false,
        message: MESSAGES.INVALID_CREDENTIALS,
      });
    }

    // Check entrance (password)
    const isPasswordValid = await bcrypt.compare(entrance, user.entrance);

    if (!isPasswordValid) {
      return res.status(STATUS_CODES.UNAUTHORIZED).json({
        success: false,
        message: MESSAGES.INVALID_CREDENTIALS,
      });
    }

    // Generate token
    const token = generateToken(user.id, user.email, user.role);

    res.status(STATUS_CODES.SUCCESS).json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
        token,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(STATUS_CODES.INTERNAL_ERROR).json({
      success: false,
      message: MESSAGES.ERROR,
      error: error.message,
    });
  }
};

/**
 * Get current user profile
 */
export const getProfile = async (req, res) => {
  try {
    const userId = req.user.userId;

    const { data: user, error } = await supabase
      .from('profiles')
      .select('id, email, name, role, created_at')
      .eq('id', userId)
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
    console.error('Get profile error:', error);
    res.status(STATUS_CODES.INTERNAL_ERROR).json({
      success: false,
      message: MESSAGES.ERROR,
      error: error.message,
    });
  }
};

/**
 * Verify JWT token
 */
export const verifyToken = (req, res) => {
  res.status(STATUS_CODES.SUCCESS).json({
    success: true,
    message: 'Token is valid',
    data: {
      user: req.user,
    },
  });
};

export default {
  register,
  login,
  getProfile,
  verifyToken,
};

import { supabase } from '../config/supabase.js';
import { STATUS_CODES, MESSAGES } from '../config/constants.js';

/**
 * Get all lounges
 */
export const getAllLounges = async (req, res) => {
  try {
    const { airport_code } = req.query;
    
    let query = supabase
      .from('lounges')
      .select('*')
      .order('name', { ascending: true });

    if (airport_code) {
      query = query.eq('airport_code', airport_code);
    }

    const { data: lounges, error } = await query;

    if (error) {
      return res.status(STATUS_CODES.INTERNAL_ERROR).json({
        success: false,
        message: 'Error fetching lounges',
        error: error.message,
      });
    }

    res.status(STATUS_CODES.SUCCESS).json({
      success: true,
      data: { lounges, count: lounges.length },
    });
  } catch (error) {
    console.error('Get lounges error:', error);
    res.status(STATUS_CODES.INTERNAL_ERROR).json({
      success: false,
      message: MESSAGES.ERROR,
      error: error.message,
    });
  }
};

/**
 * Get lounge by ID
 */
export const getLoungeById = async (req, res) => {
  try {
    const { id } = req.params;

    const { data: lounge, error } = await supabase
      .from('lounges')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !lounge) {
      return res.status(STATUS_CODES.NOT_FOUND).json({
        success: false,
        message: 'Lounge not found',
      });
    }

    res.status(STATUS_CODES.SUCCESS).json({
      success: true,
      data: { lounge },
    });
  } catch (error) {
    console.error('Get lounge error:', error);
    res.status(STATUS_CODES.INTERNAL_ERROR).json({
      success: false,
      message: MESSAGES.ERROR,
      error: error.message,
    });
  }
};

/**
 * Create new lounge
 */
export const createLounge = async (req, res) => {
  try {
    const { code, name, airport_code, latitude, longitude, capacity } = req.body;

    if (!code || !name || !airport_code) {
      return res.status(STATUS_CODES.BAD_REQUEST).json({
        success: false,
        message: 'Code, name, and airport_code are required',
      });
    }

    const { data: lounge, error } = await supabase
      .from('lounges')
      .insert([{ code, name, airport_code, latitude, longitude, capacity }])
      .select()
      .single();

    if (error) {
      return res.status(STATUS_CODES.INTERNAL_ERROR).json({
        success: false,
        message: 'Error creating lounge',
        error: error.message,
      });
    }

    res.status(STATUS_CODES.CREATED).json({
      success: true,
      message: 'Lounge created successfully',
      data: { lounge },
    });
  } catch (error) {
    console.error('Create lounge error:', error);
    res.status(STATUS_CODES.INTERNAL_ERROR).json({
      success: false,
      message: MESSAGES.ERROR,
      error: error.message,
    });
  }
};

/**
 * Update lounge
 */
export const updateLounge = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = { ...req.body };

    const { data: lounge, error } = await supabase
      .from('lounges')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return res.status(STATUS_CODES.INTERNAL_ERROR).json({
        success: false,
        message: 'Error updating lounge',
        error: error.message,
      });
    }

    res.status(STATUS_CODES.SUCCESS).json({
      success: true,
      message: 'Lounge updated successfully',
      data: { lounge },
    });
  } catch (error) {
    console.error('Update lounge error:', error);
    res.status(STATUS_CODES.INTERNAL_ERROR).json({
      success: false,
      message: MESSAGES.ERROR,
      error: error.message,
    });
  }
};

/**
 * Delete lounge
 */
export const deleteLounge = async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('lounges')
      .delete()
      .eq('id', id);

    if (error) {
      return res.status(STATUS_CODES.INTERNAL_ERROR).json({
        success: false,
        message: 'Error deleting lounge',
        error: error.message,
      });
    }

    res.status(STATUS_CODES.SUCCESS).json({
      success: true,
      message: 'Lounge deleted successfully',
    });
  } catch (error) {
    console.error('Delete lounge error:', error);
    res.status(STATUS_CODES.INTERNAL_ERROR).json({
      success: false,
      message: MESSAGES.ERROR,
      error: error.message,
    });
  }
};

export default {
  getAllLounges,
  getLoungeById,
  createLounge,
  updateLounge,
  deleteLounge,
};

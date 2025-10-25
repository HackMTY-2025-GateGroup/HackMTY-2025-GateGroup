import { supabase } from '../config/supabase.js';
import { STATUS_CODES, MESSAGES } from '../config/constants.js';

/**
 * Get all inventories
 */
export const getAllInventories = async (req, res) => {
  try {
    const { location_type, location_id } = req.query;
    
    let query = supabase
      .from('inventories')
      .select('*')
      .order('created_at', { ascending: false });

    if (location_type) {
      query = query.eq('location_type', location_type);
    }
    if (location_id) {
      query = query.eq('location_id', location_id);
    }

    const { data: inventories, error } = await query;

    if (error) {
      return res.status(STATUS_CODES.INTERNAL_ERROR).json({
        success: false,
        message: 'Error fetching inventories',
        error: error.message,
      });
    }

    res.status(STATUS_CODES.SUCCESS).json({
      success: true,
      data: { inventories, count: inventories.length },
    });
  } catch (error) {
    console.error('Get inventories error:', error);
    res.status(STATUS_CODES.INTERNAL_ERROR).json({
      success: false,
      message: MESSAGES.ERROR,
      error: error.message,
    });
  }
};

/**
 * Get inventory by ID
 */
export const getInventoryById = async (req, res) => {
  try {
    const { id } = req.params;

    const { data: inventory, error } = await supabase
      .from('inventories')
      .select(`
        *,
        inventory_items (
          *,
          products (*)
        )
      `)
      .eq('id', id)
      .single();

    if (error || !inventory) {
      return res.status(STATUS_CODES.NOT_FOUND).json({
        success: false,
        message: 'Inventory not found',
      });
    }

    res.status(STATUS_CODES.SUCCESS).json({
      success: true,
      data: { inventory },
    });
  } catch (error) {
    console.error('Get inventory error:', error);
    res.status(STATUS_CODES.INTERNAL_ERROR).json({
      success: false,
      message: MESSAGES.ERROR,
      error: error.message,
    });
  }
};

/**
 * Create new inventory
 */
export const createInventory = async (req, res) => {
  try {
    const { location_type, location_id, name, notes } = req.body;

    if (!location_type) {
      return res.status(STATUS_CODES.BAD_REQUEST).json({
        success: false,
        message: 'Location type is required',
      });
    }

    const { data: inventory, error } = await supabase
      .from('inventories')
      .insert([{ location_type, location_id, name, notes }])
      .select()
      .single();

    if (error) {
      return res.status(STATUS_CODES.INTERNAL_ERROR).json({
        success: false,
        message: 'Error creating inventory',
        error: error.message,
      });
    }

    res.status(STATUS_CODES.CREATED).json({
      success: true,
      message: 'Inventory created successfully',
      data: { inventory },
    });
  } catch (error) {
    console.error('Create inventory error:', error);
    res.status(STATUS_CODES.INTERNAL_ERROR).json({
      success: false,
      message: MESSAGES.ERROR,
      error: error.message,
    });
  }
};

/**
 * Update inventory
 */
export const updateInventory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, notes, location_id } = req.body;

    const updates = {};
    if (name !== undefined) updates.name = name;
    if (notes !== undefined) updates.notes = notes;
    if (location_id !== undefined) updates.location_id = location_id;

    const { data: inventory, error } = await supabase
      .from('inventories')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return res.status(STATUS_CODES.INTERNAL_ERROR).json({
        success: false,
        message: 'Error updating inventory',
        error: error.message,
      });
    }

    res.status(STATUS_CODES.SUCCESS).json({
      success: true,
      message: 'Inventory updated successfully',
      data: { inventory },
    });
  } catch (error) {
    console.error('Update inventory error:', error);
    res.status(STATUS_CODES.INTERNAL_ERROR).json({
      success: false,
      message: MESSAGES.ERROR,
      error: error.message,
    });
  }
};

/**
 * Delete inventory
 */
export const deleteInventory = async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('inventories')
      .delete()
      .eq('id', id);

    if (error) {
      return res.status(STATUS_CODES.INTERNAL_ERROR).json({
        success: false,
        message: 'Error deleting inventory',
        error: error.message,
      });
    }

    res.status(STATUS_CODES.SUCCESS).json({
      success: true,
      message: 'Inventory deleted successfully',
    });
  } catch (error) {
    console.error('Delete inventory error:', error);
    res.status(STATUS_CODES.INTERNAL_ERROR).json({
      success: false,
      message: MESSAGES.ERROR,
      error: error.message,
    });
  }
};

/**
 * Get inventory items
 */
export const getInventoryItems = async (req, res) => {
  try {
    const { id } = req.params;

    const { data: items, error } = await supabase
      .from('inventory_items')
      .select(`
        *,
        products (*),
        inventories (*)
      `)
      .eq('inventory_id', id);

    if (error) {
      return res.status(STATUS_CODES.INTERNAL_ERROR).json({
        success: false,
        message: 'Error fetching inventory items',
        error: error.message,
      });
    }

    res.status(STATUS_CODES.SUCCESS).json({
      success: true,
      data: { items, count: items.length },
    });
  } catch (error) {
    console.error('Get inventory items error:', error);
    res.status(STATUS_CODES.INTERNAL_ERROR).json({
      success: false,
      message: MESSAGES.ERROR,
      error: error.message,
    });
  }
};

/**
 * Add item to inventory
 */
export const addInventoryItem = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      product_id,
      batch_id,
      quantity,
      expiry_date,
      min_stock,
      max_stock,
      storage_temp_celsius,
    } = req.body;

    if (!product_id || quantity === undefined) {
      return res.status(STATUS_CODES.BAD_REQUEST).json({
        success: false,
        message: 'Product ID and quantity are required',
      });
    }

    const { data: item, error } = await supabase
      .from('inventory_items')
      .insert([
        {
          inventory_id: id,
          product_id,
          batch_id,
          quantity,
          expiry_date,
          min_stock,
          max_stock,
          storage_temp_celsius,
        },
      ])
      .select()
      .single();

    if (error) {
      return res.status(STATUS_CODES.INTERNAL_ERROR).json({
        success: false,
        message: 'Error adding item to inventory',
        error: error.message,
      });
    }

    res.status(STATUS_CODES.CREATED).json({
      success: true,
      message: 'Item added to inventory successfully',
      data: { item },
    });
  } catch (error) {
    console.error('Add inventory item error:', error);
    res.status(STATUS_CODES.INTERNAL_ERROR).json({
      success: false,
      message: MESSAGES.ERROR,
      error: error.message,
    });
  }
};

/**
 * Update inventory item
 */
export const updateInventoryItem = async (req, res) => {
  try {
    const { itemId } = req.params;
    const { quantity, reserved, expiry_date, storage_temp_celsius } = req.body;

    const updates = {};
    if (quantity !== undefined) updates.quantity = quantity;
    if (reserved !== undefined) updates.reserved = reserved;
    if (expiry_date !== undefined) updates.expiry_date = expiry_date;
    if (storage_temp_celsius !== undefined)
      updates.storage_temp_celsius = storage_temp_celsius;

    const { data: item, error } = await supabase
      .from('inventory_items')
      .update(updates)
      .eq('id', itemId)
      .select()
      .single();

    if (error) {
      return res.status(STATUS_CODES.INTERNAL_ERROR).json({
        success: false,
        message: 'Error updating inventory item',
        error: error.message,
      });
    }

    res.status(STATUS_CODES.SUCCESS).json({
      success: true,
      message: 'Inventory item updated successfully',
      data: { item },
    });
  } catch (error) {
    console.error('Update inventory item error:', error);
    res.status(STATUS_CODES.INTERNAL_ERROR).json({
      success: false,
      message: MESSAGES.ERROR,
      error: error.message,
    });
  }
};

/**
 * Delete inventory item
 */
export const deleteInventoryItem = async (req, res) => {
  try {
    const { itemId } = req.params;

    const { error } = await supabase
      .from('inventory_items')
      .delete()
      .eq('id', itemId);

    if (error) {
      return res.status(STATUS_CODES.INTERNAL_ERROR).json({
        success: false,
        message: 'Error deleting inventory item',
        error: error.message,
      });
    }

    res.status(STATUS_CODES.SUCCESS).json({
      success: true,
      message: 'Inventory item deleted successfully',
    });
  } catch (error) {
    console.error('Delete inventory item error:', error);
    res.status(STATUS_CODES.INTERNAL_ERROR).json({
      success: false,
      message: MESSAGES.ERROR,
      error: error.message,
    });
  }
};

export default {
  getAllInventories,
  getInventoryById,
  createInventory,
  updateInventory,
  deleteInventory,
  getInventoryItems,
  addInventoryItem,
  updateInventoryItem,
  deleteInventoryItem,
};

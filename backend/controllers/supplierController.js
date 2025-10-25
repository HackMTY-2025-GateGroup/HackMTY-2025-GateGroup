import { supabase } from '../config/supabase.js';
import { STATUS_CODES, MESSAGES } from '../config/constants.js';

/**
 * Get all suppliers
 */
export const getAllSuppliers = async (req, res) => {
  try {
    const { data: suppliers, error } = await supabase
      .from('suppliers')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      return res.status(STATUS_CODES.INTERNAL_ERROR).json({
        success: false,
        message: 'Error fetching suppliers',
        error: error.message,
      });
    }

    res.status(STATUS_CODES.SUCCESS).json({
      success: true,
      data: { suppliers, count: suppliers.length },
    });
  } catch (error) {
    console.error('Get suppliers error:', error);
    res.status(STATUS_CODES.INTERNAL_ERROR).json({
      success: false,
      message: MESSAGES.ERROR,
      error: error.message,
    });
  }
};

/**
 * Get supplier by ID
 */
export const getSupplierById = async (req, res) => {
  try {
    const { id } = req.params;

    const { data: supplier, error } = await supabase
      .from('suppliers')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !supplier) {
      return res.status(STATUS_CODES.NOT_FOUND).json({
        success: false,
        message: 'Supplier not found',
      });
    }

    res.status(STATUS_CODES.SUCCESS).json({
      success: true,
      data: { supplier },
    });
  } catch (error) {
    console.error('Get supplier error:', error);
    res.status(STATUS_CODES.INTERNAL_ERROR).json({
      success: false,
      message: MESSAGES.ERROR,
      error: error.message,
    });
  }
};

/**
 * Create new supplier
 */
export const createSupplier = async (req, res) => {
  try {
    const { name, contact } = req.body;

    if (!name) {
      return res.status(STATUS_CODES.BAD_REQUEST).json({
        success: false,
        message: 'Supplier name is required',
      });
    }

    const { data: supplier, error } = await supabase
      .from('suppliers')
      .insert([{ name, contact }])
      .select()
      .single();

    if (error) {
      return res.status(STATUS_CODES.INTERNAL_ERROR).json({
        success: false,
        message: 'Error creating supplier',
        error: error.message,
      });
    }

    res.status(STATUS_CODES.CREATED).json({
      success: true,
      message: 'Supplier created successfully',
      data: { supplier },
    });
  } catch (error) {
    console.error('Create supplier error:', error);
    res.status(STATUS_CODES.INTERNAL_ERROR).json({
      success: false,
      message: MESSAGES.ERROR,
      error: error.message,
    });
  }
};

/**
 * Update supplier
 */
export const updateSupplier = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = { ...req.body };

    const { data: supplier, error } = await supabase
      .from('suppliers')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return res.status(STATUS_CODES.INTERNAL_ERROR).json({
        success: false,
        message: 'Error updating supplier',
        error: error.message,
      });
    }

    res.status(STATUS_CODES.SUCCESS).json({
      success: true,
      message: 'Supplier updated successfully',
      data: { supplier },
    });
  } catch (error) {
    console.error('Update supplier error:', error);
    res.status(STATUS_CODES.INTERNAL_ERROR).json({
      success: false,
      message: MESSAGES.ERROR,
      error: error.message,
    });
  }
};

/**
 * Delete supplier
 */
export const deleteSupplier = async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('suppliers')
      .delete()
      .eq('id', id);

    if (error) {
      return res.status(STATUS_CODES.INTERNAL_ERROR).json({
        success: false,
        message: 'Error deleting supplier',
        error: error.message,
      });
    }

    res.status(STATUS_CODES.SUCCESS).json({
      success: true,
      message: 'Supplier deleted successfully',
    });
  } catch (error) {
    console.error('Delete supplier error:', error);
    res.status(STATUS_CODES.INTERNAL_ERROR).json({
      success: false,
      message: MESSAGES.ERROR,
      error: error.message,
    });
  }
};

// Purchase Orders
export const getAllPurchaseOrders = async (req, res) => {
  try {
    const { status, supplier_id } = req.query;
    
    let query = supabase
      .from('purchase_orders')
      .select(`
        *,
        suppliers (*),
        profiles:created_by (*)
      `)
      .order('created_at', { ascending: false });

    if (status) query = query.eq('status', status);
    if (supplier_id) query = query.eq('supplier_id', supplier_id);

    const { data: orders, error } = await query;

    if (error) {
      return res.status(STATUS_CODES.INTERNAL_ERROR).json({
        success: false,
        message: 'Error fetching purchase orders',
        error: error.message,
      });
    }

    res.status(STATUS_CODES.SUCCESS).json({
      success: true,
      data: { orders, count: orders.length },
    });
  } catch (error) {
    console.error('Get purchase orders error:', error);
    res.status(STATUS_CODES.INTERNAL_ERROR).json({
      success: false,
      message: MESSAGES.ERROR,
      error: error.message,
    });
  }
};

export const getPurchaseOrderById = async (req, res) => {
  try {
    const { id } = req.params;

    const { data: order, error } = await supabase
      .from('purchase_orders')
      .select(`
        *,
        suppliers (*),
        profiles:created_by (*)
      `)
      .eq('id', id)
      .single();

    if (error || !order) {
      return res.status(STATUS_CODES.NOT_FOUND).json({
        success: false,
        message: 'Purchase order not found',
      });
    }

    res.status(STATUS_CODES.SUCCESS).json({
      success: true,
      data: { order },
    });
  } catch (error) {
    console.error('Get purchase order error:', error);
    res.status(STATUS_CODES.INTERNAL_ERROR).json({
      success: false,
      message: MESSAGES.ERROR,
      error: error.message,
    });
  }
};

export const createPurchaseOrder = async (req, res) => {
  try {
    const { supplier_id, created_by, items, status } = req.body;

    if (!supplier_id || !items) {
      return res.status(STATUS_CODES.BAD_REQUEST).json({
        success: false,
        message: 'Supplier ID and items are required',
      });
    }

    const { data: order, error } = await supabase
      .from('purchase_orders')
      .insert([{ supplier_id, created_by, items, status }])
      .select()
      .single();

    if (error) {
      return res.status(STATUS_CODES.INTERNAL_ERROR).json({
        success: false,
        message: 'Error creating purchase order',
        error: error.message,
      });
    }

    res.status(STATUS_CODES.CREATED).json({
      success: true,
      message: 'Purchase order created successfully',
      data: { order },
    });
  } catch (error) {
    console.error('Create purchase order error:', error);
    res.status(STATUS_CODES.INTERNAL_ERROR).json({
      success: false,
      message: MESSAGES.ERROR,
      error: error.message,
    });
  }
};

export const updatePurchaseOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = { ...req.body };

    const { data: order, error } = await supabase
      .from('purchase_orders')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return res.status(STATUS_CODES.INTERNAL_ERROR).json({
        success: false,
        message: 'Error updating purchase order',
        error: error.message,
      });
    }

    res.status(STATUS_CODES.SUCCESS).json({
      success: true,
      message: 'Purchase order updated successfully',
      data: { order },
    });
  } catch (error) {
    console.error('Update purchase order error:', error);
    res.status(STATUS_CODES.INTERNAL_ERROR).json({
      success: false,
      message: MESSAGES.ERROR,
      error: error.message,
    });
  }
};

export const deletePurchaseOrder = async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('purchase_orders')
      .delete()
      .eq('id', id);

    if (error) {
      return res.status(STATUS_CODES.INTERNAL_ERROR).json({
        success: false,
        message: 'Error deleting purchase order',
        error: error.message,
      });
    }

    res.status(STATUS_CODES.SUCCESS).json({
      success: true,
      message: 'Purchase order deleted successfully',
    });
  } catch (error) {
    console.error('Delete purchase order error:', error);
    res.status(STATUS_CODES.INTERNAL_ERROR).json({
      success: false,
      message: MESSAGES.ERROR,
      error: error.message,
    });
  }
};

export default {
  getAllSuppliers,
  getSupplierById,
  createSupplier,
  updateSupplier,
  deleteSupplier,
  getAllPurchaseOrders,
  getPurchaseOrderById,
  createPurchaseOrder,
  updatePurchaseOrder,
  deletePurchaseOrder,
};

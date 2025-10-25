import { supabase } from '../config/supabase.js';
import { STATUS_CODES, MESSAGES } from '../config/constants.js';

export const getAllProducts = async (req, res) => {
  try {
    const { category, perishable } = req.query;
    
    let query = supabase
      .from('products')
      .select('*')
      .order('name', { ascending: true });

    if (category) query = query.eq('category', category);
    if (perishable !== undefined) query = query.eq('perishable', perishable === 'true');

    const { data: products, error } = await query;

    if (error) {
      return res.status(STATUS_CODES.INTERNAL_ERROR).json({
        success: false,
        message: 'Error fetching products',
        error: error.message,
      });
    }

    res.status(STATUS_CODES.SUCCESS).json({
      success: true,
      data: { products, count: products.length },
    });
  } catch (error) {
    res.status(STATUS_CODES.INTERNAL_ERROR).json({
      success: false,
      message: MESSAGES.ERROR,
      error: error.message,
    });
  }
};

export const getProductById = async (req, res) => {
  try {
    const { id } = req.params;

    const { data: product, error } = await supabase
      .from('products')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !product) {
      return res.status(STATUS_CODES.NOT_FOUND).json({
        success: false,
        message: 'Product not found',
      });
    }

    res.status(STATUS_CODES.SUCCESS).json({
      success: true,
      data: { product },
    });
  } catch (error) {
    res.status(STATUS_CODES.INTERNAL_ERROR).json({
      success: false,
      message: MESSAGES.ERROR,
      error: error.message,
    });
  }
};

export const createProduct = async (req, res) => {
  try {
    const {
      sku,
      name,
      description,
      category,
      perishable,
      shelf_life_days,
      min_stock,
      max_stock,
      dimensions,
      metadata,
    } = req.body;

    if (!sku || !name) {
      return res.status(STATUS_CODES.BAD_REQUEST).json({
        success: false,
        message: 'SKU and name are required',
      });
    }

    const { data: product, error } = await supabase
      .from('products')
      .insert([
        {
          sku,
          name,
          description,
          category,
          perishable,
          shelf_life_days,
          min_stock,
          max_stock,
          dimensions,
          metadata,
        },
      ])
      .select()
      .single();

    if (error) {
      return res.status(STATUS_CODES.INTERNAL_ERROR).json({
        success: false,
        message: 'Error creating product',
        error: error.message,
      });
    }

    res.status(STATUS_CODES.CREATED).json({
      success: true,
      message: 'Product created successfully',
      data: { product },
    });
  } catch (error) {
    res.status(STATUS_CODES.INTERNAL_ERROR).json({
      success: false,
      message: MESSAGES.ERROR,
      error: error.message,
    });
  }
};

export const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = { ...req.body };

    const { data: product, error } = await supabase
      .from('products')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return res.status(STATUS_CODES.INTERNAL_ERROR).json({
        success: false,
        message: 'Error updating product',
        error: error.message,
      });
    }

    res.status(STATUS_CODES.SUCCESS).json({
      success: true,
      message: 'Product updated successfully',
      data: { product },
    });
  } catch (error) {
    res.status(STATUS_CODES.INTERNAL_ERROR).json({
      success: false,
      message: MESSAGES.ERROR,
      error: error.message,
    });
  }
};

export const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', id);

    if (error) {
      return res.status(STATUS_CODES.INTERNAL_ERROR).json({
        success: false,
        message: 'Error deleting product',
        error: error.message,
      });
    }

    res.status(STATUS_CODES.SUCCESS).json({
      success: true,
      message: 'Product deleted successfully',
    });
  } catch (error) {
    res.status(STATUS_CODES.INTERNAL_ERROR).json({
      success: false,
      message: MESSAGES.ERROR,
      error: error.message,
    });
  }
};

export default {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
};

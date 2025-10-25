import { supabase } from '../config/supabase.js';
import { STATUS_CODES, MESSAGES } from '../config/constants.js';

// Flights
export const getAllFlights = async (req, res) => {
  try {
    const { data: flights, error } = await supabase
      .from('flights')
      .select(`
        *,
        aircrafts (*)
      `)
      .order('departure_at', { ascending: false });

    if (error) {
      return res.status(STATUS_CODES.INTERNAL_ERROR).json({
        success: false,
        message: 'Error fetching flights',
        error: error.message,
      });
    }

    res.status(STATUS_CODES.SUCCESS).json({
      success: true,
      data: { flights, count: flights.length },
    });
  } catch (error) {
    res.status(STATUS_CODES.INTERNAL_ERROR).json({
      success: false,
      message: MESSAGES.ERROR,
      error: error.message,
    });
  }
};

export const getFlightById = async (req, res) => {
  try {
    const { id } = req.params;

    const { data: flight, error } = await supabase
      .from('flights')
      .select(`
        *,
        aircrafts (*),
        trolleys (*)
      `)
      .eq('id', id)
      .single();

    if (error || !flight) {
      return res.status(STATUS_CODES.NOT_FOUND).json({
        success: false,
        message: 'Flight not found',
      });
    }

    res.status(STATUS_CODES.SUCCESS).json({
      success: true,
      data: { flight },
    });
  } catch (error) {
    res.status(STATUS_CODES.INTERNAL_ERROR).json({
      success: false,
      message: MESSAGES.ERROR,
      error: error.message,
    });
  }
};

export const createFlight = async (req, res) => {
  try {
    const { aircraft_id, flight_number, departure_at, arrival_at, origin, destination } = req.body;

    if (!flight_number || !departure_at) {
      return res.status(STATUS_CODES.BAD_REQUEST).json({
        success: false,
        message: 'Flight number and departure time are required',
      });
    }

    const { data: flight, error } = await supabase
      .from('flights')
      .insert([{ aircraft_id, flight_number, departure_at, arrival_at, origin, destination }])
      .select()
      .single();

    if (error) {
      return res.status(STATUS_CODES.INTERNAL_ERROR).json({
        success: false,
        message: 'Error creating flight',
        error: error.message,
      });
    }

    res.status(STATUS_CODES.CREATED).json({
      success: true,
      message: 'Flight created successfully',
      data: { flight },
    });
  } catch (error) {
    res.status(STATUS_CODES.INTERNAL_ERROR).json({
      success: false,
      message: MESSAGES.ERROR,
      error: error.message,
    });
  }
};

export const updateFlight = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = { ...req.body };

    const { data: flight, error } = await supabase
      .from('flights')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return res.status(STATUS_CODES.INTERNAL_ERROR).json({
        success: false,
        message: 'Error updating flight',
        error: error.message,
      });
    }

    res.status(STATUS_CODES.SUCCESS).json({
      success: true,
      message: 'Flight updated successfully',
      data: { flight },
    });
  } catch (error) {
    res.status(STATUS_CODES.INTERNAL_ERROR).json({
      success: false,
      message: MESSAGES.ERROR,
      error: error.message,
    });
  }
};

export const deleteFlight = async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('flights')
      .delete()
      .eq('id', id);

    if (error) {
      return res.status(STATUS_CODES.INTERNAL_ERROR).json({
        success: false,
        message: 'Error deleting flight',
        error: error.message,
      });
    }

    res.status(STATUS_CODES.SUCCESS).json({
      success: true,
      message: 'Flight deleted successfully',
    });
  } catch (error) {
    res.status(STATUS_CODES.INTERNAL_ERROR).json({
      success: false,
      message: MESSAGES.ERROR,
      error: error.message,
    });
  }
};

// Aircrafts
export const getAllAircrafts = async (req, res) => {
  try {
    const { data: aircrafts, error } = await supabase
      .from('aircrafts')
      .select('*')
      .order('tail_number', { ascending: true });

    if (error) {
      return res.status(STATUS_CODES.INTERNAL_ERROR).json({
        success: false,
        message: 'Error fetching aircrafts',
        error: error.message,
      });
    }

    res.status(STATUS_CODES.SUCCESS).json({
      success: true,
      data: { aircrafts, count: aircrafts.length },
    });
  } catch (error) {
    res.status(STATUS_CODES.INTERNAL_ERROR).json({
      success: false,
      message: MESSAGES.ERROR,
      error: error.message,
    });
  }
};

export const getAircraftById = async (req, res) => {
  try {
    const { id } = req.params;

    const { data: aircraft, error } = await supabase
      .from('aircrafts')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !aircraft) {
      return res.status(STATUS_CODES.NOT_FOUND).json({
        success: false,
        message: 'Aircraft not found',
      });
    }

    res.status(STATUS_CODES.SUCCESS).json({
      success: true,
      data: { aircraft },
    });
  } catch (error) {
    res.status(STATUS_CODES.INTERNAL_ERROR).json({
      success: false,
      message: MESSAGES.ERROR,
      error: error.message,
    });
  }
};

export const createAircraft = async (req, res) => {
  try {
    const { tail_number, model, capacity, notes } = req.body;

    if (!tail_number) {
      return res.status(STATUS_CODES.BAD_REQUEST).json({
        success: false,
        message: 'Tail number is required',
      });
    }

    const { data: aircraft, error } = await supabase
      .from('aircrafts')
      .insert([{ tail_number, model, capacity, notes }])
      .select()
      .single();

    if (error) {
      return res.status(STATUS_CODES.INTERNAL_ERROR).json({
        success: false,
        message: 'Error creating aircraft',
        error: error.message,
      });
    }

    res.status(STATUS_CODES.CREATED).json({
      success: true,
      message: 'Aircraft created successfully',
      data: { aircraft },
    });
  } catch (error) {
    res.status(STATUS_CODES.INTERNAL_ERROR).json({
      success: false,
      message: MESSAGES.ERROR,
      error: error.message,
    });
  }
};

export const updateAircraft = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = { ...req.body };

    const { data: aircraft, error } = await supabase
      .from('aircrafts')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return res.status(STATUS_CODES.INTERNAL_ERROR).json({
        success: false,
        message: 'Error updating aircraft',
        error: error.message,
      });
    }

    res.status(STATUS_CODES.SUCCESS).json({
      success: true,
      message: 'Aircraft updated successfully',
      data: { aircraft },
    });
  } catch (error) {
    res.status(STATUS_CODES.INTERNAL_ERROR).json({
      success: false,
      message: MESSAGES.ERROR,
      error: error.message,
    });
  }
};

export const deleteAircraft = async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('aircrafts')
      .delete()
      .eq('id', id);

    if (error) {
      return res.status(STATUS_CODES.INTERNAL_ERROR).json({
        success: false,
        message: 'Error deleting aircraft',
        error: error.message,
      });
    }

    res.status(STATUS_CODES.SUCCESS).json({
      success: true,
      message: 'Aircraft deleted successfully',
    });
  } catch (error) {
    res.status(STATUS_CODES.INTERNAL_ERROR).json({
      success: false,
      message: MESSAGES.ERROR,
      error: error.message,
    });
  }
};

// Trolleys
export const getAllTrolleys = async (req, res) => {
  try {
    const { status, flight_id } = req.query;
    
    let query = supabase
      .from('trolleys')
      .select(`
        *,
        flights (*)
      `)
      .order('code', { ascending: true });

    if (status) query = query.eq('status', status);
    if (flight_id) query = query.eq('flight_id', flight_id);

    const { data: trolleys, error } = await query;

    if (error) {
      return res.status(STATUS_CODES.INTERNAL_ERROR).json({
        success: false,
        message: 'Error fetching trolleys',
        error: error.message,
      });
    }

    res.status(STATUS_CODES.SUCCESS).json({
      success: true,
      data: { trolleys, count: trolleys.length },
    });
  } catch (error) {
    res.status(STATUS_CODES.INTERNAL_ERROR).json({
      success: false,
      message: MESSAGES.ERROR,
      error: error.message,
    });
  }
};

export const getTrolleyById = async (req, res) => {
  try {
    const { id } = req.params;

    const { data: trolley, error } = await supabase
      .from('trolleys')
      .select(`
        *,
        flights (*)
      `)
      .eq('id', id)
      .single();

    if (error || !trolley) {
      return res.status(STATUS_CODES.NOT_FOUND).json({
        success: false,
        message: 'Trolley not found',
      });
    }

    res.status(STATUS_CODES.SUCCESS).json({
      success: true,
      data: { trolley },
    });
  } catch (error) {
    res.status(STATUS_CODES.INTERNAL_ERROR).json({
      success: false,
      message: MESSAGES.ERROR,
      error: error.message,
    });
  }
};

export const createTrolley = async (req, res) => {
  try {
    const { code, flight_id, status } = req.body;

    const { data: trolley, error } = await supabase
      .from('trolleys')
      .insert([{ code, flight_id, status }])
      .select()
      .single();

    if (error) {
      return res.status(STATUS_CODES.INTERNAL_ERROR).json({
        success: false,
        message: 'Error creating trolley',
        error: error.message,
      });
    }

    res.status(STATUS_CODES.CREATED).json({
      success: true,
      message: 'Trolley created successfully',
      data: { trolley },
    });
  } catch (error) {
    res.status(STATUS_CODES.INTERNAL_ERROR).json({
      success: false,
      message: MESSAGES.ERROR,
      error: error.message,
    });
  }
};

export const updateTrolley = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = { ...req.body };

    const { data: trolley, error } = await supabase
      .from('trolleys')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return res.status(STATUS_CODES.INTERNAL_ERROR).json({
        success: false,
        message: 'Error updating trolley',
        error: error.message,
      });
    }

    res.status(STATUS_CODES.SUCCESS).json({
      success: true,
      message: 'Trolley updated successfully',
      data: { trolley },
    });
  } catch (error) {
    res.status(STATUS_CODES.INTERNAL_ERROR).json({
      success: false,
      message: MESSAGES.ERROR,
      error: error.message,
    });
  }
};

export const deleteTrolley = async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('trolleys')
      .delete()
      .eq('id', id);

    if (error) {
      return res.status(STATUS_CODES.INTERNAL_ERROR).json({
        success: false,
        message: 'Error deleting trolley',
        error: error.message,
      });
    }

    res.status(STATUS_CODES.SUCCESS).json({
      success: true,
      message: 'Trolley deleted successfully',
    });
  } catch (error) {
    res.status(STATUS_CODES.INTERNAL_ERROR).json({
      success: false,
      message: MESSAGES.ERROR,
      error: error.message,
    });
  }
};

// Alerts
export const getAllAlerts = async (req, res) => {
  try {
    const { level, acknowledged } = req.query;
    
    let query = supabase
      .from('expiry_alerts')
      .select(`
        *,
        inventory_items (
          *,
          products (*)
        )
      `)
      .order('created_at', { ascending: false });

    if (level) query = query.eq('level', level);
    if (acknowledged !== undefined) query = query.eq('acknowledged', acknowledged === 'true');

    const { data: alerts, error } = await query;

    if (error) {
      return res.status(STATUS_CODES.INTERNAL_ERROR).json({
        success: false,
        message: 'Error fetching alerts',
        error: error.message,
      });
    }

    res.status(STATUS_CODES.SUCCESS).json({
      success: true,
      data: { alerts, count: alerts.length },
    });
  } catch (error) {
    res.status(STATUS_CODES.INTERNAL_ERROR).json({
      success: false,
      message: MESSAGES.ERROR,
      error: error.message,
    });
  }
};

export const acknowledgeAlert = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const { data: alert, error } = await supabase
      .from('expiry_alerts')
      .update({ acknowledged: true, acknowledged_by: userId })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return res.status(STATUS_CODES.INTERNAL_ERROR).json({
        success: false,
        message: 'Error acknowledging alert',
        error: error.message,
      });
    }

    res.status(STATUS_CODES.SUCCESS).json({
      success: true,
      message: 'Alert acknowledged successfully',
      data: { alert },
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
  getAllFlights,
  getFlightById,
  createFlight,
  updateFlight,
  deleteFlight,
  getAllAircrafts,
  getAircraftById,
  createAircraft,
  updateAircraft,
  deleteAircraft,
  getAllTrolleys,
  getTrolleyById,
  createTrolley,
  updateTrolley,
  deleteTrolley,
  getAllAlerts,
  acknowledgeAlert,
};

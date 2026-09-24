import ApiService from './ApiService';

/** Scan LOT:xxx or harvest id — returns full trace payload. */
export const scanTraceCode = async (code) => {
  const normalized = (code || '').trim();
  if (!normalized) {
    return { success: false, error: 'Empty code', data: null };
  }
  try {
    const response = await ApiService.get('/processing/trace/scan/', {
      params: { code: normalized },
    });
    return { success: true, data: response.data };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data?.detail || error.message || 'Scan failed',
      data: null,
    };
  }
};

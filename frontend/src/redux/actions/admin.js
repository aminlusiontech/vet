import axios from "axios";
import { server } from "../../server";

// Load admin
export const loadAdmin = () => async (dispatch) => {
  try {
    dispatch({
      type: "LoadAdminRequest",
    });
    const { data } = await axios.get(`${server}/admin/getadmin`, {
      withCredentials: true,
    });
    dispatch({
      type: "LoadAdminSuccess",
      payload: data.admin,
    });
  } catch (error) {
    // Only set as failed if it's a 401 (unauthorized) - means no valid session
    // For other errors (network, etc.), we might want to retry
    if (error.response?.status === 401) {
      dispatch({
        type: "LoadAdminFail",
        payload: error.response?.data?.message || "Not authenticated",
      });
    } else {
      // For other errors, still mark as failed but log for debugging
      console.warn("Admin load error:", error.response?.status || error.message);
      dispatch({
        type: "LoadAdminFail",
        payload: error.response?.data?.message || error.message,
      });
    }
  }
};


import axios from "axios";
import { server } from "../../server";

const getErrorMessage = (error) => {
  return (
    error?.response?.data?.message ||
    error?.message ||
    "Something went wrong"
  );
};

export const fetchSiteOptions = (slug = "global") => async (dispatch) => {
  try {
    dispatch({
      type: "siteOptionsRequest",
      payload: slug,
    });

    const { data } = await axios.get(`${server}/options/${slug}`);

    dispatch({
      type: "siteOptionsSuccess",
      payload: { slug, options: data.options },
    });
  } catch (error) {
    dispatch({
      type: "siteOptionsFail",
      payload: { slug, error: getErrorMessage(error) },
    });
  }
};

export const updateSiteOptions = (slug = "global", payload) => async (dispatch) => {
  try {
    dispatch({
      type: "siteOptionsUpdateRequest",
      payload: slug,
    });

    const config = {
      headers: {
        "Content-Type": "application/json",
      },
      withCredentials: true,
    };

    const { data } = await axios.put(`${server}/options/${slug}`, payload, config);

    dispatch({
      type: "siteOptionsUpdateSuccess",
      payload: { slug, options: data.options },
    });
  } catch (error) {
    dispatch({
      type: "siteOptionsUpdateFail",
      payload: { slug, error: getErrorMessage(error) },
    });
  }
};

export const clearSiteOptionsErrors = () => (dispatch) =>
  dispatch({
    type: "siteOptionsClearErrors",
  });


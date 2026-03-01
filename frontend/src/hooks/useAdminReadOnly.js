import { useSelector } from "react-redux";

/**
 * Returns whether the currently logged-in admin has read-only permission.
 * When true, the admin can only view data in their allowed areas; they cannot create, edit, or delete.
 * Use this to hide or disable create/edit/delete buttons across admin pages.
 */
export function useAdminReadOnly() {
  const readOnly = useSelector((state) => state.admin?.admin?.readOnly === true);
  return readOnly;
}

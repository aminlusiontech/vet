import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import styles from "../../../styles/styles";
import {
  fetchSiteOptions,
  updateSiteOptions,
  clearSiteOptionsErrors,
} from "../../../redux/actions/siteOptions";
import { toast } from "react-toastify";

const defaultNavLink = () => ({
  label: "",
  url: "",
  target: "_self",
  order: 0,
});

const HeaderOptions = () => {
  const dispatch = useDispatch();
  const { options, loading, errors, updating, updateErrors, updateSuccess } =
    useSelector((state) => state.siteOptions);

  const slug = "global";
  const siteOptions = options[slug]?.header || {};
  const isLoading = loading[slug];
  const isUpdating = updating[slug];
  const error = errors[slug];
  const updateError = updateErrors[slug];

  const [formState, setFormState] = useState({
    logo: "",
    logoLink: "/",
    navLinks: [],
    ctaLabel: "",
    ctaLink: "",
  });

  useEffect(() => {
    if (!options[slug] && !isLoading) {
      dispatch(fetchSiteOptions(slug));
    }
  }, [dispatch, slug, options, isLoading]);

  useEffect(() => {
    if (siteOptions) {
      setFormState({
        logo: siteOptions.logo || "",
        logoLink: siteOptions.logoLink || "/",
        navLinks: siteOptions.navLinks?.length
          ? [...siteOptions.navLinks].sort((a, b) => a.order - b.order)
          : [],
        ctaLabel: siteOptions.ctaLabel || "",
        ctaLink: siteOptions.ctaLink || "",
      });
    }
  }, [siteOptions]);

  useEffect(() => {
    if (updateSuccess[slug]) {
      toast.success("Header options saved");
    }
  }, [updateSuccess, slug]);

  useEffect(() => {
    if (error || updateError) {
      toast.error(error || updateError);
      dispatch(clearSiteOptionsErrors());
    }
  }, [error, updateError, dispatch]);

  const handleLogoChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setFormState((prev) => ({
        ...prev,
        logo: reader.result,
      }));
    };
    reader.readAsDataURL(file);
  };

  const handleInputChange = (field, value) => {
    setFormState((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleNavLinkChange = (index, field, value) => {
    setFormState((prev) => {
      const navLinks = [...prev.navLinks];
      navLinks[index] = {
        ...navLinks[index],
        [field]: value,
      };
      return { ...prev, navLinks };
    });
  };

  const addNavLink = () => {
    setFormState((prev) => ({
      ...prev,
      navLinks: [...prev.navLinks, defaultNavLink()],
    }));
  };

  const removeNavLink = (index) => {
    setFormState((prev) => {
      const navLinks = [...prev.navLinks];
      navLinks.splice(index, 1);
      return { ...prev, navLinks };
    });
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    dispatch(
      updateSiteOptions(slug, {
        header: {
          logo: formState.logo,
          logoLink: formState.logoLink,
          navLinks: formState.navLinks.map((link, index) => ({
            ...link,
            order: Number(link.order ?? index + 1),
          })),
          ctaLabel: formState.ctaLabel,
          ctaLink: formState.ctaLink,
        },
      })
    );
  };

  return (
    <div className="bg-white rounded-md shadow p-6">
      <div className="flex items-center justify-between border-b pb-4 mb-4">
        <div>
          <h2 className="text-xl font-semibold text-[#38513b]">Header Options</h2>
          <p className="text-sm text-gray-500">
            Manage your logo, navigation links, and header call-to-action button.
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="py-20 text-center">Loading header options…</div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          <section className="space-y-4">
            <h3 className="text-lg font-semibold">Branding</h3>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Logo (URL or base64)
                </label>
                <input
                  type="text"
                  value={formState.logo}
                  onChange={(e) => handleInputChange("logo", e.target.value)}
                  className={`${styles.input}`}
                  placeholder="https://example.com/logo.png"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Logo Link
                </label>
                <input
                  type="text"
                  value={formState.logoLink}
                  onChange={(e) => handleInputChange("logoLink", e.target.value)}
                  className={`${styles.input}`}
                  placeholder="/"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Upload Logo Image
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={handleLogoChange}
                className={`${styles.input}`}
              />
              <p className="text-xs text-gray-500 mt-1">
                Recommended size: 200x60px (or similar aspect ratio)
              </p>
              {formState.logo && (
                <img
                  src={formState.logo}
                  alt="Logo preview"
                  className="mt-3 h-16 object-contain bg-white p-2 rounded-md border"
                />
              )}
            </div>
          </section>

          <section className="space-y-4">
            <h3 className="text-lg font-semibold">Navigation Links</h3>
            <div className="space-y-4">
              {formState.navLinks.map((link, index) => (
                <div
                  key={index}
                  className="border rounded-md p-4 grid gap-4 md:grid-cols-2"
                >
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Label
                    </label>
                    <input
                      type="text"
                      value={link.label}
                      onChange={(e) => handleNavLinkChange(index, "label", e.target.value)}
                      className={`${styles.input}`}
                      placeholder="e.g. Home"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      URL
                    </label>
                    <input
                      type="text"
                      value={link.url}
                      onChange={(e) => handleNavLinkChange(index, "url", e.target.value)}
                      className={`${styles.input}`}
                      placeholder="/"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Target
                    </label>
                    <select
                      value={link.target}
                      onChange={(e) => handleNavLinkChange(index, "target", e.target.value)}
                      className={`${styles.input}`}
                    >
                      <option value="_self">Same tab</option>
                      <option value="_blank">New tab</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Order
                    </label>
                    <input
                      type="number"
                      value={link.order ?? index + 1}
                      onChange={(e) => handleNavLinkChange(index, "order", e.target.value)}
                      className={`${styles.input}`}
                    />
                  </div>
                  <div className="md:col-span-2 flex justify-end">
                    <button
                      type="button"
                      onClick={() => removeNavLink(index)}
                      className="text-sm text-red-600"
                    >
                      Remove link
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={addNavLink}
              className="px-4 py-2 bg-[#38513b] text-white rounded-md text-sm"
            >
              Add navigation link
            </button>
          </section>

          <section className="space-y-4">
            <h3 className="text-lg font-semibold">Call To Action Button</h3>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Button Label
                </label>
                <input
                  type="text"
                  value={formState.ctaLabel}
                  onChange={(e) => handleInputChange("ctaLabel", e.target.value)}
                  className={`${styles.input}`}
                  placeholder="e.g. Get Started"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Button Link
                </label>
                <input
                  type="text"
                  value={formState.ctaLink}
                  onChange={(e) => handleInputChange("ctaLink", e.target.value)}
                  className={`${styles.input}`}
                  placeholder="/cta"
                />
              </div>
            </div>
          </section>

          <div className="flex justify-end">
            <button
              type="submit"
              className={`${styles.button} text-white px-6`}
              disabled={isUpdating}
            >
              {isUpdating ? "Saving..." : "Save Header"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

export default HeaderOptions;


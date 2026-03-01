import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import styles from "../../../styles/styles";
import {
  fetchSiteOptions,
  updateSiteOptions,
  clearSiteOptionsErrors,
} from "../../../redux/actions/siteOptions";
import { toast } from "react-toastify";

const COLUMN_TEMPLATES = [
  {
    key: "quickLinks",
    title: "Quick Links",
  },
  {
    key: "categories",
    title: "Categories",
  },
  {
    key: "contact",
    title: "Contact",
  },
];

const defaultColumn = (template = COLUMN_TEMPLATES[0]) => ({
  key: template.key,
  title: template.title,
  order: 0,
  links: [],
});

const defaultLink = (overrides = {}) => ({
  label: "",
  url: "",
  target: "_self",
  order: 0,
  icon: "",
  ...overrides,
});

const defaultSocialLink = () => ({
  platform: "",
  label: "",
  url: "",
  icon: "",
  order: 0,
});

const FooterOptions = () => {
  const dispatch = useDispatch();
  const { options, loading, errors, updating, updateErrors, updateSuccess } =
    useSelector((state) => state.siteOptions);

  const slug = "global";
  const siteOptions = options[slug]?.footer || {};
  const isLoading = loading[slug];
  const isUpdating = updating[slug];
  const error = errors[slug];
  const updateError = updateErrors[slug];

  const [formState, setFormState] = useState({
    columns: COLUMN_TEMPLATES.map((template, index) => ({
      ...defaultColumn(template),
      order: index + 1,
    })),
    socialLinks: [],
    copyrightText: "",
    extraContent: "",
  });

  useEffect(() => {
    if (!options[slug] && !isLoading) {
      dispatch(fetchSiteOptions(slug));
    }
  }, [dispatch, slug, options, isLoading]);

  useEffect(() => {
    if (siteOptions) {
      const alignedColumns = COLUMN_TEMPLATES.map((template, index) => {
        const found =
          siteOptions.columns?.find(
            (column) =>
              column?.key === template.key ||
              column?.title?.toLowerCase() === template.title.toLowerCase()
          ) || {};

        return {
          ...defaultColumn(template),
          ...found,
          key: template.key,
          title: found.title || template.title,
          order: index + 1,
          links: (found.links || []).map((link, linkIndex) => ({
            ...defaultLink(),
            ...link,
            order: link.order ?? linkIndex + 1,
          })),
        };
      });

      setFormState({
        columns: alignedColumns,
        socialLinks: siteOptions.socialLinks?.length
          ? [...siteOptions.socialLinks]
              .map((link, index) => ({
                ...link,
                order: link.order ?? index + 1,
              }))
              .sort((a, b) => a.order - b.order)
          : [],
        copyrightText: siteOptions.copyrightText || "",
        extraContent: siteOptions.extraContent || "",
      });
    }
  }, [siteOptions]);

  useEffect(() => {
    if (updateSuccess[slug]) {
      toast.success("Footer options saved");
    }
  }, [updateSuccess, slug]);

  useEffect(() => {
    if (error || updateError) {
      toast.error(error || updateError);
      dispatch(clearSiteOptionsErrors());
    }
  }, [error, updateError, dispatch]);

  const handleColumnChange = (index, field, value) => {
    setFormState((prev) => {
      const columns = [...prev.columns];
      columns[index] = {
        ...columns[index],
        [field]: value,
      };
      return { ...prev, columns };
    });
  };

  const handleColumnLinkChange = (columnIndex, linkIndex, field, value) => {
    setFormState((prev) => {
      const columns = [...prev.columns];
      const links = [...(columns[columnIndex].links || [])];
      links[linkIndex] = {
        ...links[linkIndex],
        [field]: value,
      };
      columns[columnIndex].links = links;
      return { ...prev, columns };
    });
  };

  const addColumnLink = (columnIndex) => {
    setFormState((prev) => {
      const columns = [...prev.columns];
      const links = [...(columns[columnIndex].links || [])];
      links.push(defaultLink());
      columns[columnIndex].links = links;
      return { ...prev, columns };
    });
  };

  const removeColumnLink = (columnIndex, linkIndex) => {
    setFormState((prev) => {
      const columns = [...prev.columns];
      const links = [...(columns[columnIndex].links || [])];
      links.splice(linkIndex, 1);
      columns[columnIndex].links = links;
      return { ...prev, columns };
    });
  };

  const handleSocialLinkChange = (index, field, value) => {
    setFormState((prev) => {
      const socialLinks = [...prev.socialLinks];
      socialLinks[index] = {
        ...socialLinks[index],
        [field]: value,
      };
      return { ...prev, socialLinks };
    });
  };

  const addSocialLink = () => {
    setFormState((prev) => ({
      ...prev,
      socialLinks: [...prev.socialLinks, defaultSocialLink()],
    }));
  };

  const removeSocialLink = (index) => {
    setFormState((prev) => {
      const socialLinks = [...prev.socialLinks];
      socialLinks.splice(index, 1);
      return { ...prev, socialLinks };
    });
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    dispatch(
      updateSiteOptions(slug, {
        footer: {
          columns: formState.columns.map((column, index) => ({
            ...column,
            order: Number(column.order ?? index + 1),
            links: (column.links || []).map((link, linkIndex) => ({
              ...link,
              order: Number(link.order ?? linkIndex + 1),
            })),
          })),
          socialLinks: formState.socialLinks.map((link, index) => ({
            ...link,
            order: Number(link.order ?? index + 1),
          })),
          copyrightText: formState.copyrightText,
          extraContent: formState.extraContent,
        },
      })
    );
  };

  return (
    <div className="bg-white rounded-md shadow p-6">
      <div className="flex items-center justify-between border-b pb-4 mb-4">
        <div>
          <h2 className="text-xl font-semibold text-[#38513b]">Footer Options</h2>
          <p className="text-sm text-gray-500">
            Manage footer columns, useful links, social accounts, and extra content.
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="py-20 text-center">Loading footer options…</div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          <section className="space-y-4">
            <h3 className="text-lg font-semibold">Footer Columns</h3>
            <div className="space-y-4">
              {formState.columns.map((column, columnIndex) => (
                <div
                  key={columnIndex}
                  className="border rounded-md p-4 space-y-4 bg-[#f9fafb]"
                >
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Title
                      </label>
                      <input
                        type="text"
                        value={column.title}
                        onChange={(e) =>
                          handleColumnChange(columnIndex, "title", e.target.value)
                        }
                        className={`${styles.input}`}
                        placeholder="e.g. Product Links"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Order
                      </label>
                      <input
                        type="number"
                        value={column.order ?? columnIndex + 1}
                        onChange={(e) =>
                          handleColumnChange(columnIndex, "order", e.target.value)
                        }
                        className={`${styles.input}`}
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="text-md font-semibold">Links</h4>
                    {(column.links || []).map((link, linkIndex) => (
                      <div
                        key={linkIndex}
                        className="border rounded-md p-3 grid gap-4 md:grid-cols-2"
                      >
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Label
                          </label>
                          <input
                            type="text"
                            value={link.label}
                            onChange={(e) =>
                              handleColumnLinkChange(
                                columnIndex,
                                linkIndex,
                                "label",
                                e.target.value
                              )
                            }
                            className={`${styles.input}`}
                            placeholder="Link label"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            URL
                          </label>
                          <input
                            type="text"
                            value={link.url}
                            onChange={(e) =>
                              handleColumnLinkChange(
                                columnIndex,
                                linkIndex,
                                "url",
                                e.target.value
                              )
                            }
                            className={`${styles.input}`}
                            placeholder="/example"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Target
                          </label>
                          <select
                            value={link.target}
                            onChange={(e) =>
                              handleColumnLinkChange(
                                columnIndex,
                                linkIndex,
                                "target",
                                e.target.value
                              )
                            }
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
                            value={link.order ?? linkIndex + 1}
                            onChange={(e) =>
                              handleColumnLinkChange(
                                columnIndex,
                                linkIndex,
                                "order",
                                e.target.value
                              )
                            }
                            className={`${styles.input}`}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Icon (optional)
                          </label>
                          <input
                            type="text"
                            value={link.icon || ""}
                            onChange={(e) =>
                              handleColumnLinkChange(
                                columnIndex,
                                linkIndex,
                                "icon",
                                e.target.value
                              )
                            }
                            className={`${styles.input}`}
                            placeholder="e.g. mail, location, phone"
                          />
                        </div>
                        <div className="md:col-span-2 flex justify-end">
                          <button
                            type="button"
                            onClick={() => removeColumnLink(columnIndex, linkIndex)}
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
                    onClick={() => addColumnLink(columnIndex)}
                    className="px-3 py-2 bg-[#38513b] text-white rounded-md text-sm"
                  >
                    Add link
                  </button>
                </div>
              ))}
            </div>
          </section>

          <section className="space-y-4">
            <h3 className="text-lg font-semibold">Social Links</h3>
            <div className="space-y-4">
              {formState.socialLinks.map((link, index) => (
                <div
                  key={index}
                  className="border rounded-md p-4 grid gap-4 md:grid-cols-2"
                >
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Platform
                    </label>
                    <input
                      type="text"
                      value={link.platform}
                      onChange={(e) =>
                        handleSocialLinkChange(index, "platform", e.target.value)
                      }
                      className={`${styles.input}`}
                      placeholder="Facebook"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Label
                    </label>
                    <input
                      type="text"
                      value={link.label}
                      onChange={(e) =>
                        handleSocialLinkChange(index, "label", e.target.value)
                      }
                      className={`${styles.input}`}
                      placeholder="Follow us on Facebook"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      URL
                    </label>
                    <input
                      type="text"
                      value={link.url}
                      onChange={(e) => handleSocialLinkChange(index, "url", e.target.value)}
                      className={`${styles.input}`}
                      placeholder="https://facebook.com/yourpage"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Icon (optional)
                    </label>
                    <input
                      type="text"
                      value={link.icon}
                      onChange={(e) => handleSocialLinkChange(index, "icon", e.target.value)}
                      className={`${styles.input}`}
                      placeholder="Icon name or URL"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Order
                    </label>
                    <input
                      type="number"
                      value={link.order ?? index + 1}
                      onChange={(e) => handleSocialLinkChange(index, "order", e.target.value)}
                      className={`${styles.input}`}
                    />
                  </div>
                  <div className="md:col-span-2 flex justify-end">
                    <button
                      type="button"
                      onClick={() => removeSocialLink(index)}
                      className="text-sm text-red-600"
                    >
                      Remove social link
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={addSocialLink}
              className="px-4 py-2 bg-[#38513b] text-white rounded-md text-sm"
            >
              Add social link
            </button>
          </section>

          <section className="space-y-4">
            <h3 className="text-lg font-semibold">Additional Content</h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Copyright Text
              </label>
              <input
                type="text"
                value={formState.copyrightText}
                onChange={(e) =>
                  setFormState((prev) => ({ ...prev, copyrightText: e.target.value }))
                }
                className={`${styles.input}`}
                placeholder="© Veteran Airsoft. All rights reserved."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Extra Content (HTML allowed)
              </label>
              <textarea
                value={formState.extraContent}
                onChange={(e) =>
                  setFormState((prev) => ({ ...prev, extraContent: e.target.value }))
                }
                className={`${styles.input} min-h-[120px]`}
                placeholder="<p>Additional footer information...</p>"
              />
            </div>
          </section>

          <div className="flex justify-end">
            <button
              type="submit"
              className={`${styles.button} text-white px-6`}
              disabled={isUpdating}
            >
              {isUpdating ? "Saving..." : "Save Footer"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

export default FooterOptions;


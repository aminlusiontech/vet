import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import styles from "../../../styles/styles";
import {
  fetchSiteOptions,
  updateSiteOptions,
  clearSiteOptionsErrors,
} from "../../../redux/actions/siteOptions";
import { toast } from "react-toastify";
import { backend_url } from "../../../server";

const generateCategoryId = () =>
  `catalog-${Date.now()}-${Math.random().toString(16).slice(2)}`;

const generateSubcategoryId = () =>
  `subcat-${Date.now()}-${Math.random().toString(16).slice(2)}`;

const createEmptyCategory = () => ({
  id: generateCategoryId(),
  name: "",
  slug: "",
  image: "",
  link: "",
  order: 0,
  isActive: true,
  subcategories: [],
});

const createEmptySubcategory = () => ({
  id: generateSubcategoryId(),
  name: "",
  slug: "",
  order: 0,
  isActive: true,
});

const slugify = (value = "") =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const normalizeCategoryLink = (linkValue, slugValue, nameValue) => {
  const trimmed = (linkValue || "").trim();
  if (trimmed) {
    if (
      trimmed.startsWith("http://") ||
      trimmed.startsWith("https://") ||
      trimmed.startsWith("mailto:") ||
      trimmed.startsWith("tel:")
    ) {
      return trimmed;
    }
    if (trimmed.startsWith("/")) {
      return trimmed;
    }
    return `/${trimmed}`;
  }

  const fallbackSource = slugValue?.trim() || nameValue?.trim();
  if (!fallbackSource) return "";
  return `/products?category=${encodeURIComponent(fallbackSource)}`;
};

const resolvePreviewImage = (value) => {
  if (!value) return "";
  if (
    value.startsWith("http://") ||
    value.startsWith("https://") ||
    value.startsWith("data:")
  ) {
    return value;
  }

  const normalized = value.startsWith("/") ? value.slice(1) : value;
  return `${backend_url}${normalized}`;
};

const CatalogOptions = () => {
  const dispatch = useDispatch();
  const {
    options,
    loading,
    errors,
    updating,
    updateErrors,
    updateSuccess,
  } = useSelector((state) => state.siteOptions);

  const slug = "global";
  const catalogOptions = options[slug]?.catalog;
  const isLoading = loading[slug];
  const isUpdating = updating[slug];
  const error = errors[slug];
  const updateError = updateErrors[slug];

  const [categories, setCategories] = useState([createEmptyCategory()]);

  useEffect(() => {
    if (!options[slug] && !isLoading) {
      dispatch(fetchSiteOptions(slug));
    }
  }, [dispatch, options, slug, isLoading]);

  useEffect(() => {
    if (!catalogOptions) {
      return;
    }

    if (Array.isArray(catalogOptions.categories) && catalogOptions.categories.length) {
      const sorted = [...catalogOptions.categories].sort(
        (a, b) => (a.order ?? 0) - (b.order ?? 0)
      );
      setCategories(
        sorted.map((item, index) => ({
          id:
            item.id ||
            item._id ||
            `${item.slug || item.name || "catalog"}-${index}-${Math.random()
              .toString(16)
              .slice(2)}`,
          name: item.name || "",
          slug: item.slug || "",
          image: item.image || item.icon || "",
          link: item.link || "",
          order: item.order ?? 0,
          isActive:
            item.isActive === undefined || item.isActive === null
              ? true
              : item.isActive,
          subcategories: Array.isArray(item.subcategories) ? item.subcategories.map((sub, subIndex) => ({
            id: sub.id || sub._id || `${sub.slug || sub.name || "sub"}-${subIndex}-${Math.random().toString(16).slice(2)}`,
            _id: sub._id || sub.id || null, // Preserve MongoDB _id for updates
            name: sub.name || "",
            slug: sub.slug || slugify(sub.name || ""),
            order: sub.order ?? 0,
            isActive: sub.isActive !== undefined && sub.isActive !== null ? sub.isActive : true,
          })) : [],
        }))
      );
    } else {
      setCategories([createEmptyCategory()]);
    }
  }, [catalogOptions]);

  useEffect(() => {
    if (updateSuccess[slug]) {
      toast.success("Catalog settings saved");
    }
  }, [updateSuccess, slug]);

  useEffect(() => {
    if (error || updateError) {
      toast.error(error || updateError);
      dispatch(clearSiteOptionsErrors());
    }
  }, [error, updateError, dispatch]);

  const updateCategory = (index, field, value) => {
    setCategories((prev) => {
      const next = [...prev];
      const prevCategory = next[index];
      const updated = { ...prevCategory, [field]: value };

      if (field === "name") {
        const newSlug = slugify(value);
        const prevAutoLink = normalizeCategoryLink(
          "",
          prevCategory.slug,
          prevCategory.name
        );
        updated.slug = newSlug;
        if (!prevCategory.link || prevCategory.link === prevAutoLink) {
          updated.link = "";
        }
      }

      if (field === "slug") {
        const newSlug = slugify(value);
        const prevAutoLink = normalizeCategoryLink(
          "",
          prevCategory.slug,
          prevCategory.name
        );
        updated.slug = newSlug;
        if (!prevCategory.link || prevCategory.link === prevAutoLink) {
          updated.link = "";
        }
      }

      next[index] = updated;
      return next;
    });
  };

  const handleImageUpload = (index, file) => {
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const imageData = reader.result || "";
      setCategories((prev) => {
        const next = [...prev];
        next[index] = {
          ...next[index],
          image: imageData,
        };
        return next;
      });
    };
    reader.readAsDataURL(file);
  };

  const addCategory = () => {
    setCategories((prev) => [...prev, createEmptyCategory()]);
  };

  const removeCategory = (index) => {
    setCategories((prev) => {
      if (prev.length === 1) {
        return [createEmptyCategory()];
      }
      const next = [...prev];
      next.splice(index, 1);
      return next;
    });
  };

  const addSubcategory = (categoryIndex) => {
    setCategories((prev) => {
      const next = [...prev];
      const category = next[categoryIndex];
      category.subcategories = [...(category.subcategories || []), createEmptySubcategory()];
      return next;
    });
  };

  const updateSubcategory = (categoryIndex, subcategoryIndex, field, value) => {
    setCategories((prev) => {
      const next = [...prev];
      const category = next[categoryIndex];
      const subcategories = [...(category.subcategories || [])];
      const subcategory = { ...subcategories[subcategoryIndex] };
      
      if (field === "name") {
        subcategory.slug = slugify(value);
      }
      
      subcategory[field] = value;
      subcategories[subcategoryIndex] = subcategory;
      category.subcategories = subcategories;
      return next;
    });
  };

  const removeSubcategory = (categoryIndex, subcategoryIndex) => {
    setCategories((prev) => {
      const next = [...prev];
      const category = next[categoryIndex];
      const subcategories = [...(category.subcategories || [])];
      subcategories.splice(subcategoryIndex, 1);
      category.subcategories = subcategories;
      return next;
    });
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    const filtered = categories
      .filter((category) => category.name.trim() !== "")
      .map((category, index) => {
        const name = category.name.trim();
        const slugValue = category.slug?.trim() || slugify(name);
        const linkValue = normalizeCategoryLink(category.link, slugValue, name);
        const imageValue = category.image?.trim() || "";

        const subcategories = (category.subcategories || [])
          .filter((sub) => sub.name.trim() !== "")
          .map((sub, subIndex) => {
            const subcategoryData = {
              name: sub.name.trim(),
              slug: sub.slug?.trim() || slugify(sub.name.trim()),
              order: Number.isFinite(Number(sub.order)) ? Number(sub.order) : subIndex + 1,
              isActive: Boolean(sub.isActive),
            };
            // Only preserve _id if it's a valid MongoDB ObjectId (24 hex characters)
            // This ensures existing subcategories are updated, not duplicated
            if (sub._id && typeof sub._id === 'string' && /^[0-9a-fA-F]{24}$/.test(sub._id)) {
              subcategoryData._id = sub._id;
            }
            return subcategoryData;
          });

        return {
          name,
          slug: slugValue,
          link: linkValue,
          image: imageValue,
          icon: imageValue,
          isActive: Boolean(category.isActive),
          order: Number.isFinite(Number(category.order))
            ? Number(category.order)
            : index + 1,
          subcategories,
        };
      });

    dispatch(
      updateSiteOptions(slug, {
        catalog: {
          categories: filtered,
        },
      })
    );
  };

  return (
    <div className="bg-white rounded-md shadow p-6">
      <div className="flex items-center justify-between border-b pb-4 mb-4">
        <div>
          <h2 className="text-xl font-semibold text-[#38513b]">Catalog Options</h2>
          <p className="text-sm text-gray-500">
            Manage global product categories. Sellers will pick from these in their
            product forms.
          </p>
        </div>
        <button
          type="button"
          onClick={addCategory}
          className="px-4 py-2 bg-[#38513b] text-white rounded-md text-sm"
        >
          Add Category
        </button>
      </div>

      {isLoading ? (
        <div className="py-20 text-center text-gray-500">Loading catalog settings…</div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            {categories.map((category, index) => (
              <div
                key={category.id || `${category.slug || "new"}-${index}`}
                className="border rounded-md p-4 space-y-4 bg-[#f9fafb]"
              >
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Name
                    </label>
                    <input
                      type="text"
                      value={category.name}
                      onChange={(e) => updateCategory(index, "name", e.target.value)}
                      className={styles.input}
                      placeholder="e.g. Airsoft Guns"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Slug
                    </label>
                    <input
                      type="text"
                      value={category.slug}
                      onChange={(e) =>
                        updateCategory(index, "slug", slugify(e.target.value))
                      }
                      className={styles.input}
                      placeholder="airsoft-guns"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Lowercase URL-friendly identifier. Auto-generated from the name if
                      left blank.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Image URL
                      </label>
                      <input
                        type="text"
                        value={category.image}
                        onChange={(e) => updateCategory(index, "image", e.target.value)}
                        className={styles.input}
                        placeholder="https://example.com/category.jpg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Or upload image
                      </label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(event) =>
                          handleImageUpload(index, event.target.files?.[0] || null)
                        }
                        className={styles.input}
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Uploading replaces the image URL above with the selected file.
                      </p>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Order
                    </label>
                    <input
                      type="number"
                      value={category.order ?? index + 1}
                      onChange={(e) =>
                        updateCategory(index, "order", Number(e.target.value))
                      }
                      className={styles.input}
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <span className="text-sm font-medium text-gray-700">Preview</span>
                    {category.image ? (
                      <img
                        src={resolvePreviewImage(category.image)}
                        alt={category.name || "Category preview"}
                        className="h-16 w-16 object-contain rounded border"
                        onError={(event) => {
                          event.target.src = "";
                        }}
                      />
                    ) : (
                      <div className="h-16 w-16 rounded border border-dashed flex items-center justify-center text-xs text-gray-400">
                        No image
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Generated Link
                    </label>
                    <input
                      type="text"
                      value={normalizeCategoryLink(category.link, category.slug, category.name)}
                      readOnly
                      className={`${styles.input} bg-gray-100 cursor-not-allowed`}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Links are created automatically using the slug. Update the slug to change the link.
                    </p>
                  </div>
                </div>

                {/* Subcategories Section */}
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="flex items-center justify-between mb-3">
                    <label className="block text-sm font-medium text-gray-700">
                      Subcategories
                    </label>
                    <button
                      type="button"
                      onClick={() => addSubcategory(index)}
                      className="px-3 py-1.5 bg-[#38513b] text-white rounded-md text-xs hover:bg-[#2f4232]"
                    >
                      Add Subcategory
                    </button>
                  </div>
                  <div className="space-y-3">
                    {(category.subcategories || []).map((subcategory, subIndex) => (
                      <div
                        key={subcategory.id || `sub-${subIndex}`}
                        className="flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-md"
                      >
                        <div className="flex-1 grid gap-3 md:grid-cols-3">
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">
                              Name
                            </label>
                            <input
                              type="text"
                              value={subcategory.name}
                              onChange={(e) =>
                                updateSubcategory(index, subIndex, "name", e.target.value)
                              }
                              className={`${styles.input} text-sm`}
                              placeholder="Subcategory name"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">
                              Slug
                            </label>
                            <input
                              type="text"
                              value={subcategory.slug}
                              onChange={(e) =>
                                updateSubcategory(
                                  index,
                                  subIndex,
                                  "slug",
                                  slugify(e.target.value)
                                )
                              }
                              className={`${styles.input} text-sm`}
                              placeholder="auto-generated"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">
                              Order
                            </label>
                            <input
                              type="number"
                              value={subcategory.order}
                              onChange={(e) =>
                                updateSubcategory(
                                  index,
                                  subIndex,
                                  "order",
                                  Number(e.target.value)
                                )
                              }
                              className={`${styles.input} text-sm`}
                            />
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <label className="inline-flex items-center text-xs text-gray-600">
                            <input
                              type="checkbox"
                              checked={Boolean(subcategory.isActive)}
                              onChange={(e) =>
                                updateSubcategory(
                                  index,
                                  subIndex,
                                  "isActive",
                                  e.target.checked
                                )
                              }
                              className="mr-1"
                            />
                            Active
                          </label>
                          <button
                            type="button"
                            onClick={() => removeSubcategory(index, subIndex)}
                            className="text-xs text-red-600 hover:text-red-800"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ))}
                    {(!category.subcategories || category.subcategories.length === 0) && (
                      <p className="text-xs text-gray-500 italic">
                        No subcategories. Click "Add Subcategory" to create one.
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <label className="inline-flex items-center text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={Boolean(category.isActive)}
                      onChange={(e) =>
                        updateCategory(index, "isActive", e.target.checked)
                      }
                      className="mr-2"
                    />
                    Active
                  </label>
                  <button
                    type="button"
                    onClick={() => removeCategory(index)}
                    className="text-sm text-red-600"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-3">
            <button
              type="submit"
              className="w-[200px] bg-black h-[50px] my-3 flex items-center justify-center rounded-xl cursor-pointer font-[600] text-white px-5"
              disabled={isUpdating}
            >
              {isUpdating ? "Saving..." : "Save Categories"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

export default CatalogOptions;


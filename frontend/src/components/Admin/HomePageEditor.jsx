import React, { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "react-toastify";
import Loader from "../Layout/Loader";
import { backend_url } from "../../server";
import styles from "../../styles/styles";
import {
  clearHomePageErrors,
  fetchHomePage,
  updateHomePage,
  uploadHomeAsset,
} from "../../redux/actions/home";
import { fetchSiteOptions } from "../../redux/actions/siteOptions";

const EMPTY_STATE = {
  meta: {
    title: "",
    description: "",
  },
  hero: {
    slides: [],
  },
  branding: {
    heading: "",
    items: [],
  },
  categories: {
    heading: "",
    subheading: "",
    items: [],
    catalogCategoryIds: [],
  },
  bestDeals: {
    heading: "Best Deals",
    subheading: "",
    limit: 12,
    viewAllLink: "/best-deals",
    buttonText: "View All",
    productIds: [],
    productSection: 1,
    sortBy: "newest",
    autoplay: false,
    autoplaySpeed: 3000,
    showArrows: true,
    productsToShow: 5,
  },
  featuredProducts: {
    heading: "Featured Products",
    subheading: "",
    limit: 12,
    viewAllLink: "/featured-products",
    buttonText: "View All",
    productIds: [],
    productSection: 2,
    sortBy: "newest",
    autoplay: false,
    autoplaySpeed: 3000,
    showArrows: true,
    productsToShow: 5,
  },
  eventsSection: {
    heading: "",
    subheading: "",
    limit: 1,
    viewAllLink: "/events",
    buttonText: "View All",
    eventIds: [],
    sortBy: "latest",
    autoplay: false,
    autoplaySpeed: 3000,
  },
  sponsored: {
    heading: "",
    items: [],
    autoplay: true,
    autoplaySpeed: 3000,
  },
};

const cloneDeep = (value) => JSON.parse(JSON.stringify(value || null)) || null;

const buildInitialState = (page) => {
  if (!page) {
    return cloneDeep(EMPTY_STATE);
  }

  return {
    meta: {
      ...EMPTY_STATE.meta,
      ...(page.meta || {}),
    },
    hero: {
      slides: cloneDeep(page.hero?.slides || []),
    },
    branding: {
      heading: page.branding?.heading || "",
      items: cloneDeep(page.branding?.items || []),
    },
    categories: {
      heading: page.categories?.heading || "",
    subheading: page.categories?.subheading || "",
      items: [],
      catalogCategoryIds: cloneDeep(page.categories?.catalogCategoryIds || []),
    },
    bestDeals: {
      ...EMPTY_STATE.bestDeals,
      ...(page.bestDeals || {}),
      productIds: [],
      productSection: 1,
      sortBy: page.bestDeals?.sortBy || "newest",
      autoplay: page.bestDeals?.autoplay !== undefined ? page.bestDeals.autoplay : false,
      autoplaySpeed: page.bestDeals?.autoplaySpeed || 3000,
      showArrows: page.bestDeals?.showArrows !== undefined ? page.bestDeals.showArrows : true,
      productsToShow: normalizeNumber(page.bestDeals?.productsToShow, 5),
    },
    featuredProducts: {
      ...EMPTY_STATE.featuredProducts,
      ...(page.featuredProducts || {}),
      productIds: (page.featuredProducts?.sortBy === "manual")
        ? cloneDeep(page.featuredProducts?.productIds || [])
        : [],
      productSection: 2,
      sortBy: page.featuredProducts?.sortBy || "newest",
      autoplay: page.featuredProducts?.autoplay !== undefined ? page.featuredProducts.autoplay : false,
      autoplaySpeed: page.featuredProducts?.autoplaySpeed || 3000,
      showArrows: page.featuredProducts?.showArrows !== undefined ? page.featuredProducts.showArrows : true,
      productsToShow: normalizeNumber(page.featuredProducts?.productsToShow, 5),
    },
    eventsSection: {
      ...EMPTY_STATE.eventsSection,
      ...(page.eventsSection || {}),
      eventIds: cloneDeep(page.eventsSection?.eventIds || []),
      sortBy: page.eventsSection?.sortBy || "latest",
      autoplay: page.eventsSection?.autoplay !== undefined ? page.eventsSection.autoplay : false,
      autoplaySpeed: page.eventsSection?.autoplaySpeed || 3000,
    },
    sponsored: {
      heading: page.sponsored?.heading || "",
      items: cloneDeep(page.sponsored?.items || []),
      autoplay: page.sponsored?.autoplay !== undefined ? page.sponsored.autoplay : true,
      autoplaySpeed: page.sponsored?.autoplaySpeed || 3000,
      visibleLogos: page.sponsored?.visibleLogos || 7,
    },
  };
};

const getAssetUrl = (image) => {
  if (!image) return "";

  if (image.startsWith("http://") || image.startsWith("https://")) {
    return image;
  }

  const normalized = image.startsWith("/") ? image.slice(1) : image;
  return `${backend_url}${normalized}`;
};

const normalizeNumber = (value, fallback) => {
  const parsed = Number(value);
  if (Number.isNaN(parsed) || parsed < 0) {
    return fallback;
  }
  return parsed;
};

const HomePageEditor = () => {
  const dispatch = useDispatch();
  const {
    page,
    isLoading,
    isUpdating,
    updateSuccess,
    updateError,
    assetUploadError,
  } = useSelector((state) => state.homePage);
  const { allProducts } = useSelector((state) => state.products);
  const { allEvents } = useSelector((state) => state.events);
  const siteOptionsState = useSelector((state) => state.siteOptions);

  const catalogCategories =
    siteOptionsState?.options?.global?.catalog?.categories || [];
  const catalogLoading = Boolean(siteOptionsState?.loading?.global);
  const hasCatalog = Boolean(siteOptionsState?.options?.global);

  const [formState, setFormState] = useState(cloneDeep(EMPTY_STATE));

  const hasPage = Boolean(page);

  useEffect(() => {
    if (!hasPage && !isLoading) {
      dispatch(fetchHomePage());
    }
  }, [dispatch, hasPage, isLoading]);

  useEffect(() => {
    if (!hasCatalog && !catalogLoading) {
      dispatch(fetchSiteOptions());
    }
  }, [dispatch, hasCatalog, catalogLoading]);

  useEffect(() => {
    if (page) {
      setFormState(buildInitialState(page));
    }
  }, [page]);

  useEffect(() => {
    if (updateSuccess) {
      toast.success("Home page content updated");
    }
  }, [updateSuccess]);

  useEffect(() => {
    if (updateError || assetUploadError) {
      toast.error(updateError || assetUploadError);
      dispatch(clearHomePageErrors());
    }
  }, [updateError, assetUploadError, dispatch]);

  const productOptions = useMemo(
    () =>
      (allProducts || []).map((product) => ({
        value: product._id,
        label: product.name,
      })),
    [allProducts]
  );

  const catalogCategoryOptions = useMemo(() => {
    return (catalogCategories || [])
      .filter((category) => category && category.name && category.isActive !== false)
      .sort(
        (a, b) =>
          (typeof a.order === "number" ? a.order : 0) -
          (typeof b.order === "number" ? b.order : 0)
      )
      .map((category) => ({
        id: category._id?.toString() || "",
        name: category.name,
        slug: category.slug,
        image: category.image || category.icon || "",
      }));
  }, [catalogCategories]);

  const handleHeroFieldChange = (index, field, value) => {
    setFormState((prev) => {
      const slides = prev.hero?.slides ? [...prev.hero.slides] : [];
      const updatedSlide = {
        ...(slides[index] || {}),
        [field]: value,
      };
      slides[index] = updatedSlide;

      return {
        ...prev,
        hero: {
          ...prev.hero,
          slides,
        },
      };
    });
  };

  const addHeroSlide = () => {
    setFormState((prev) => {
      const slides = prev.hero?.slides ? [...prev.hero.slides] : [];
      slides.push({
        title: "",
        subtitle: "",
        buttonText: "",
        buttonLink: "",
        backgroundImage: "",
        overlayColor: "",
      });

      return {
        ...prev,
        hero: {
          ...prev.hero,
          slides,
        },
      };
    });
  };

  const removeHeroSlide = (index) => {
    setFormState((prev) => {
      const slides = prev.hero?.slides ? [...prev.hero.slides] : [];
      slides.splice(index, 1);

      return {
        ...prev,
        hero: {
          ...prev.hero,
          slides,
        },
      };
    });
  };

  const handleAssetUpload = async (file, onSuccess) => {
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    try {
      const data = await dispatch(uploadHomeAsset(formData));
      onSuccess(data.filename);
    } catch (error) {
      toast.error(error.message);
    }
  };

  const addBrandingItem = () => {
    setFormState((prev) => {
      const items = prev.branding?.items ? [...prev.branding.items] : [];
      items.push({
        title: "",
        description: "",
        image: "",
        link: "",
        alignment: "left",
      });

      return {
        ...prev,
        branding: {
          ...prev.branding,
          items,
        },
      };
    });
  };

  const updateBrandingItem = (index, field, value) => {
    setFormState((prev) => {
      const items = prev.branding?.items ? [...prev.branding.items] : [];
      const updatedItem = {
        ...(items[index] || {}),
        [field]: value,
      };
      items[index] = updatedItem;

      return {
        ...prev,
        branding: {
          ...prev.branding,
          items,
        },
      };
    });
  };

  const removeBrandingItem = (index) => {
    setFormState((prev) => {
      const items = prev.branding?.items ? [...prev.branding.items] : [];
      items.splice(index, 1);

      return {
        ...prev,
        branding: {
          ...prev.branding,
          items,
        },
      };
    });
  };

  const handleProductSectionField = (sectionKey, field, value) => {
    setFormState((prev) => {
      const section = prev[sectionKey] || {};
      return {
        ...prev,
        [sectionKey]: {
          ...section,
          [field]: value,
        },
      };
    });
  };

  const addProductToSection = (sectionKey, productId) => {
    if (!productId) return;

    setFormState((prev) => {
      const section = prev[sectionKey] || {};
      const existing = section.productIds || [];
      if (existing.includes(productId)) {
        return prev;
      }

      return {
        ...prev,
        [sectionKey]: {
          ...section,
          productIds: [...existing, productId],
        },
      };
    });
  };

  const removeProductFromSection = (sectionKey, productId) => {
    setFormState((prev) => {
      const section = prev[sectionKey] || {};
      const existing = section.productIds || [];
      return {
        ...prev,
        [sectionKey]: {
          ...section,
          productIds: existing.filter((id) => id !== productId),
        },
      };
    });
  };

  const addSponsoredItem = () => {
    setFormState((prev) => {
      const items = prev.sponsored?.items ? [...prev.sponsored.items] : [];
      items.push({
        image: "",
        link: "",
        altText: "",
      });

      return {
        ...prev,
        sponsored: {
          ...prev.sponsored,
          items,
        },
      };
    });
  };

  const updateSponsoredItem = (index, field, value) => {
    setFormState((prev) => {
      const items = prev.sponsored?.items ? [...prev.sponsored.items] : [];
      const updatedItem = {
        ...(items[index] || {}),
        [field]: value,
      };
      items[index] = updatedItem;

      return {
        ...prev,
        sponsored: {
          ...prev.sponsored,
          items,
        },
      };
    });
  };

  const removeSponsoredItem = (index) => {
    setFormState((prev) => {
      const items = prev.sponsored?.items ? [...prev.sponsored.items] : [];
      items.splice(index, 1);

      return {
        ...prev,
        sponsored: {
          ...prev.sponsored,
          items,
        },
      };
    });
  };

  const selectedCatalogCategoryIds = useMemo(() => {
    return formState.categories?.catalogCategoryIds || [];
  }, [formState.categories?.catalogCategoryIds]);

  const toggleCatalogCategory = (categoryId) => {
    if (!categoryId) return;

    setFormState((prev) => {
      const existing = prev.categories?.catalogCategoryIds || [];
      const exists = existing.includes(categoryId);
      const updatedIds = exists
        ? existing.filter((id) => id !== categoryId)
        : [...existing, categoryId];

      return {
        ...prev,
        categories: {
          ...prev.categories,
          catalogCategoryIds: updatedIds,
        },
      };
    });
  };

  const buildPayload = (state) => {
    return {
      meta: {
        title: state.meta?.title || "",
        description: state.meta?.description || "",
      },
      hero: {
        slides: (state.hero?.slides || [])
          .filter((slide) => slide.title && slide.backgroundImage)
          .map((slide) => ({
            _id: slide._id,
            title: slide.title,
            subtitle: slide.subtitle || "",
            buttonText: slide.buttonText || "",
            buttonLink: slide.buttonLink || "",
            backgroundImage: slide.backgroundImage,
            overlayColor: slide.overlayColor || "",
          })),
      },
      branding: {
        heading: state.branding?.heading || "",
        items: (state.branding?.items || [])
          .filter((item) => item.title)
          .map((item) => ({
            _id: item._id,
            title: item.title,
            description: item.description || "",
            image: item.image || "",
            link: item.link || "",
            alignment: item.alignment || "left",
          })),
      },
      categories: {
        heading: state.categories?.heading || "",
        subheading: state.categories?.subheading || "",
        items: [],
        catalogCategoryIds: (state.categories?.catalogCategoryIds || []).map(String),
      },
      bestDeals: {
        heading: state.bestDeals?.heading || "",
        subheading: state.bestDeals?.subheading || "",
        limit: normalizeNumber(state.bestDeals?.limit, 12),
        viewAllLink: state.bestDeals?.viewAllLink || "/products",
        buttonText: state.bestDeals?.buttonText || "View All",
        productIds: [],
        productSection: 1,
        sortBy: state.bestDeals?.sortBy || "newest",
        autoplay: state.bestDeals?.autoplay === true,
        autoplaySpeed: normalizeNumber(state.bestDeals?.autoplaySpeed, 3000),
        showArrows: state.bestDeals?.showArrows !== false,
        productsToShow: normalizeNumber(state.bestDeals?.productsToShow, 5),
      },
      featuredProducts: {
        heading: state.featuredProducts?.heading || "",
        subheading: state.featuredProducts?.subheading || "",
        limit: normalizeNumber(state.featuredProducts?.limit, 12),
        viewAllLink: state.featuredProducts?.viewAllLink || "/products",
        buttonText: state.featuredProducts?.buttonText || "View All",
        productIds: (state.featuredProducts?.sortBy === "manual"
          ? (state.featuredProducts?.productIds || []).map(String)
          : []),
        productSection: 2,
        sortBy: state.featuredProducts?.sortBy || "newest",
        autoplay: state.featuredProducts?.autoplay === true,
        autoplaySpeed: normalizeNumber(state.featuredProducts?.autoplaySpeed, 3000),
        showArrows: state.featuredProducts?.showArrows !== false,
        productsToShow: normalizeNumber(state.featuredProducts?.productsToShow, 5),
      },
      eventsSection: {
        heading: state.eventsSection?.heading || "",
        subheading: state.eventsSection?.subheading || "",
        limit: normalizeNumber(state.eventsSection?.limit, 1),
        viewAllLink: state.eventsSection?.viewAllLink || "/events",
        buttonText: state.eventsSection?.buttonText || "View All",
        eventIds: (state.eventsSection?.eventIds || []).map(String),
        sortBy: state.eventsSection?.sortBy || "latest",
        autoplay: state.eventsSection?.autoplay !== undefined ? state.eventsSection.autoplay : false,
        autoplaySpeed: state.eventsSection?.autoplaySpeed || 3000,
      },
      sponsored: {
        heading: state.sponsored?.heading || "",
        items: (state.sponsored?.items || [])
          .filter((item) => item.image) // Only save items with images
          .map((item) => {
            // Preserve _id if it exists, otherwise let backend generate it
            const itemData = {
              image: item.image || "",
              link: item.link || "",
              altText: item.altText || "",
            };
            // Only include _id if it exists (for existing items)
            if (item._id) {
              itemData._id = item._id;
            }
            return itemData;
          }),
        autoplay: state.sponsored?.autoplay !== undefined ? state.sponsored.autoplay : true,
        autoplaySpeed: state.sponsored?.autoplaySpeed || 3000,
        visibleLogos: normalizeNumber(state.sponsored?.visibleLogos, 7),
      },
    };
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    const payload = buildPayload(formState);

    dispatch(updateHomePage(payload));
  };

  if (isLoading && !hasPage) {
    return (
      <div className="w-full flex justify-center items-center py-20">
        <Loader />
      </div>
    );
  }

  return (
    <div className="w-full p-4 800px:p-6">
      <div className="bg-white rounded-md shadow">
        <div className="border-b px-4 py-4">
          <h2 className="text-xl font-semibold">Home Page Content</h2>
          <p className="text-sm text-gray-500 mt-1">
            Manage the content and layout for your storefront home page.
          </p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-10 px-4 py-6">
          {/* Meta Section */}
          <section>
            <h3 className="text-lg font-semibold mb-4">Meta Information</h3>
            <div className="grid gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Page Title
                </label>
                <input
                  type="text"
                  value={formState.meta?.title || ""}
                  onChange={(e) =>
                    setFormState((prev) => ({
                      ...prev,
                      meta: {
                        ...prev.meta,
                        title: e.target.value,
                      },
                    }))
                  }
                  className={`${styles.input}`}
                  placeholder="Home Page Title"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Meta Description
                </label>
                <textarea
                  value={formState.meta?.description || ""}
                  onChange={(e) =>
                    setFormState((prev) => ({
                      ...prev,
                      meta: {
                        ...prev.meta,
                        description: e.target.value,
                      },
                    }))
                  }
                  className={`${styles.input} min-h-[100px]`}
                  placeholder="SEO friendly description for the home page"
                />
              </div>
            </div>
          </section>

          {/* Hero Section */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Hero Slider</h3>
              <button
                type="button"
                onClick={addHeroSlide}
                className={`${styles.button} text-white`}
              >
                Add Slide
              </button>
            </div>
            <div className="space-y-6">
              {(formState.hero?.slides || []).map((slide, index) => (
                <div
                  key={slide._id || index}
                  className="border rounded-md p-4 space-y-4"
                >
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold">Slide {index + 1}</h4>
                    <button
                      type="button"
                      onClick={() => removeHeroSlide(index)}
                      className="text-sm text-red-600"
                    >
                      Remove
                    </button>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Title
                      </label>
                      <input
                        type="text"
                        value={slide.title || ""}
                        onChange={(e) =>
                          handleHeroFieldChange(index, "title", e.target.value)
                        }
                        className={`${styles.input}`}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Subtitle
                      </label>
                      <input
                        type="text"
                        value={slide.subtitle || ""}
                        onChange={(e) =>
                          handleHeroFieldChange(
                            index,
                            "subtitle",
                            e.target.value
                          )
                        }
                        className={`${styles.input}`}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Button Text
                      </label>
                      <input
                        type="text"
                        value={slide.buttonText || ""}
                        onChange={(e) =>
                          handleHeroFieldChange(
                            index,
                            "buttonText",
                            e.target.value
                          )
                        }
                        className={`${styles.input}`}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Button Link
                      </label>
                      <input
                        type="text"
                        value={slide.buttonLink || ""}
                        onChange={(e) =>
                          handleHeroFieldChange(
                            index,
                            "buttonLink",
                            e.target.value
                          )
                        }
                        className={`${styles.input}`}
                        placeholder="/products or https://..."
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Overlay Color (optional)
                      </label>
                      <input
                        type="text"
                        value={slide.overlayColor || ""}
                        onChange={(e) =>
                          handleHeroFieldChange(
                            index,
                            "overlayColor",
                            e.target.value
                          )
                        }
                        className={`${styles.input}`}
                        placeholder="e.g. rgba(0,0,0,0.4)"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Background Image
                      </label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) =>
                          handleAssetUpload(e.target.files?.[0], (filename) =>
                            handleHeroFieldChange(index, "backgroundImage", filename)
                          )
                        }
                        className={`${styles.input}`}
                      />
                      {slide.backgroundImage && (
                        <img
                          src={getAssetUrl(slide.backgroundImage)}
                          alt="Slide"
                          className="mt-3 h-32 w-full object-cover rounded-md"
                        />
                      )}
                      <p className="text-xs text-gray-500 mt-1">
                        Recommended size: 1920x600px (hero banner)
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Business Highlights Section */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Business Highlights</h3>
              <button
                type="button"
                onClick={addBrandingItem}
                className={`${styles.button} text-white w-[300px]`}
              >
                Add Business Highlight Item
              </button>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Section Heading
              </label>
              <input
                type="text"
                value={formState.branding?.heading || ""}
                onChange={(e) =>
                  setFormState((prev) => ({
                    ...prev,
                    branding: {
                      ...prev.branding,
                      heading: e.target.value,
                    },
                  }))
                }
                className={`${styles.input}`}
              />
            </div>
            <div className="space-y-6">
              {(formState.branding?.items || []).map((item, index) => (
                <div key={item._id || index} className="border rounded-md p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-semibold">Item {index + 1}</h4>
                    <button
                      type="button"
                      onClick={() => removeBrandingItem(index)}
                      className="text-sm text-red-600"
                    >
                      Remove
                    </button>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Title
                      </label>
                      <input
                        type="text"
                        value={item.title || ""}
                        onChange={(e) =>
                          updateBrandingItem(index, "title", e.target.value)
                        }
                        className={`${styles.input}`}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Link (optional)
                      </label>
                      <input
                        type="text"
                        value={item.link || ""}
                        onChange={(e) =>
                          updateBrandingItem(index, "link", e.target.value)
                        }
                        className={`${styles.input}`}
                        placeholder="/path or https://..."
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Description
                      </label>
                      <textarea
                        value={item.description || ""}
                        onChange={(e) =>
                          updateBrandingItem(index, "description", e.target.value)
                        }
                        className={`${styles.input} min-h-[80px]`}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Icon/Image
                      </label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) =>
                          handleAssetUpload(e.target.files?.[0], (filename) =>
                            updateBrandingItem(index, "image", filename)
                          )
                        }
                        className={`${styles.input}`}
                      />
                      {item.image && (
                        <img
                          src={getAssetUrl(item.image)}
                          alt="Branding"
                          className="mt-3 h-20 w-20 object-contain"
                        />
                      )}
                      <p className="text-xs text-gray-500 mt-1">
                        Recommended size: 300x300px (square icon/image)
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Categories Section */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Categories</h3>
            </div>
            <div className="grid gap-4 md:grid-cols-2 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Section Heading
                </label>
                <input
                  type="text"
                  value={formState.categories?.heading || ""}
                  onChange={(e) =>
                    setFormState((prev) => ({
                      ...prev,
                      categories: {
                        ...prev.categories,
                        heading: e.target.value,
                      },
                    }))
                  }
                  className={styles.input}
                  placeholder="Featured Categories"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Section Description
                </label>
                <input
                  type="text"
                  value={formState.categories?.subheading || ""}
                  onChange={(e) =>
                    setFormState((prev) => ({
                      ...prev,
                      categories: {
                        ...prev.categories,
                        subheading: e.target.value,
                      },
                    }))
                  }
                  className={styles.input}
                  placeholder="Highlight key categories your shoppers should explore"
                />
              </div>
            </div>
            <div className="mb-6">
              <h4 className="text-md font-semibold mb-2">Show Catalog Categories</h4>
              {catalogCategoryOptions.length ? (
                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                  {catalogCategoryOptions.map((category) => {
                    const isSelected = selectedCatalogCategoryIds.includes(category.id);
                    const previewImage = category.image ? getAssetUrl(category.image) : "";

                    return (
                      <label
                        key={category.id || category.slug || category.name}
                        className={`border rounded-md p-3 flex items-start gap-3 cursor-pointer transition ${
                          isSelected ? "border-[#38513b] bg-[#f5faf5]" : "hover:border-[#cdd5d0]"
                        }`}
                      >
                        <input
                          type="checkbox"
                          className="mt-1"
                          checked={isSelected}
                          onChange={() => toggleCatalogCategory(category.id)}
                        />
                        <div>
                          <p className="font-medium text-sm text-gray-900">{category.name}</p>
                          {category.slug && (
                            <p className="text-xs text-gray-500">Slug: {category.slug}</p>
                          )}
                          {previewImage && (
                            <img
                              src={previewImage}
                              alt={category.name}
                              className="mt-2 h-12 w-12 object-contain rounded border"
                              onError={(event) => {
                                event.currentTarget.style.display = "none";
                              }}
                            />
                          )}
                        </div>
                      </label>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-gray-500">
                  No catalog categories found. Configure categories under Options → Catalog.
                </p>
              )}
              <p className="text-xs text-gray-500 mt-2">
                Selected categories will be displayed on the home page.
              </p>
            </div>
          </section>

          {/* Featured Products Section — display options; featuring is paid (Options → Featured Products) */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Featured Products</h3>
            </div>
            <p className="text-sm text-gray-500 mb-4">
              Products featured by sellers (paid via Options → Featured Products). Configure how the block appears below.
            </p>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Heading</label>
                <input
                  type="text"
                  value={formState.featuredProducts?.heading || ""}
                  onChange={(e) =>
                    handleProductSectionField("featuredProducts", "heading", e.target.value)
                  }
                  className={`${styles.input}`}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Subheading</label>
                <input
                  type="text"
                  value={formState.featuredProducts?.subheading || ""}
                  onChange={(e) =>
                    handleProductSectionField("featuredProducts", "subheading", e.target.value)
                  }
                  className={`${styles.input}`}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">View All Link</label>
                <input
                  type="text"
                  value={formState.featuredProducts?.viewAllLink || ""}
                  onChange={(e) =>
                    handleProductSectionField("featuredProducts", "viewAllLink", e.target.value)
                  }
                  className={`${styles.input}`}
                  placeholder="/featured-products"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Button Label</label>
                <input
                  type="text"
                  value={formState.featuredProducts?.buttonText || ""}
                  onChange={(e) =>
                    handleProductSectionField("featuredProducts", "buttonText", e.target.value)
                  }
                  className={`${styles.input}`}
                  placeholder="View All"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Product Limit</label>
                <input
                  type="number"
                  min={0}
                  value={formState.featuredProducts?.limit ?? ""}
                  onChange={(e) =>
                    handleProductSectionField("featuredProducts", "limit", e.target.value)
                  }
                  className={`${styles.input}`}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Max number of featured products to show.
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Sort Order</label>
                <select
                  value={formState.featuredProducts?.sortBy || "newest"}
                  onChange={(e) =>
                    handleProductSectionField("featuredProducts", "sortBy", e.target.value)
                  }
                  className={`${styles.input}`}
                >
                  <option value="newest">Newest</option>
                  <option value="popular">Most Sold</option>
                  <option value="priceLow">Price: Low to High</option>
                  <option value="priceHigh">Price: High to Low</option>
                  <option value="rating">Highest Rated</option>
                </select>
              </div>
            </div>
            <div className="mt-4 rounded border border-gray-200 bg-gray-50 p-4">
              <h4 className="text-sm font-medium text-gray-800 mb-3">Slider</h4>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formState.featuredProducts?.autoplay === true}
                    onChange={(e) =>
                      handleProductSectionField("featuredProducts", "autoplay", e.target.checked)
                    }
                    className="rounded border-gray-300"
                  />
                  <span className="text-sm text-gray-700">Autoplay</span>
                </label>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Autoplay speed (ms)</label>
                  <input
                    type="number"
                    min={1000}
                    max={10000}
                    step={500}
                    value={formState.featuredProducts?.autoplaySpeed ?? 3000}
                    onChange={(e) =>
                      handleProductSectionField(
                        "featuredProducts",
                        "autoplaySpeed",
                        e.target.value ? Number(e.target.value) : 3000
                      )
                    }
                    className={`${styles.input}`}
                    disabled={formState.featuredProducts?.autoplay !== true}
                  />
                </div>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formState.featuredProducts?.showArrows !== false}
                    onChange={(e) =>
                      handleProductSectionField("featuredProducts", "showArrows", e.target.checked)
                    }
                    className="rounded border-gray-300"
                  />
                  <span className="text-sm text-gray-700">Show arrows</span>
                </label>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Products visible</label>
                  <input
                    type="number"
                    min={1}
                    max={8}
                    value={formState.featuredProducts?.productsToShow ?? 5}
                    onChange={(e) =>
                      handleProductSectionField(
                        "featuredProducts",
                        "productsToShow",
                        e.target.value ? Number(e.target.value) : 5
                      )
                    }
                    className={`${styles.input}`}
                  />
                </div>
              </div>
            </div>
          </section>

          {/* Product Section: Best Deals only. Featured products are paid by sellers (Options → Featured Products). */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Best Deals</h3>
            </div>
            <p className="text-sm text-gray-500 mb-4">
              Products with a reduced price (discount) appear here automatically. No manual selection.
            </p>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Heading</label>
                <input
                  type="text"
                  value={formState.bestDeals?.heading || ""}
                  onChange={(e) =>
                    handleProductSectionField("bestDeals", "heading", e.target.value)
                  }
                  className={`${styles.input}`}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Subheading</label>
                <input
                  type="text"
                  value={formState.bestDeals?.subheading || ""}
                  onChange={(e) =>
                    handleProductSectionField("bestDeals", "subheading", e.target.value)
                  }
                  className={`${styles.input}`}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">View All Link</label>
                <input
                  type="text"
                  value={formState.bestDeals?.viewAllLink || ""}
                  onChange={(e) =>
                    handleProductSectionField("bestDeals", "viewAllLink", e.target.value)
                  }
                  className={`${styles.input}`}
                  placeholder="/products"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Button Label</label>
                <input
                  type="text"
                  value={formState.bestDeals?.buttonText || ""}
                  onChange={(e) =>
                    handleProductSectionField("bestDeals", "buttonText", e.target.value)
                  }
                  className={`${styles.input}`}
                  placeholder="View All"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Product Limit</label>
                <input
                  type="number"
                  min={0}
                  value={formState.bestDeals?.limit ?? ""}
                  onChange={(e) =>
                    handleProductSectionField("bestDeals", "limit", e.target.value)
                  }
                  className={`${styles.input}`}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Max number of reduced-price products to show.
                </p>
              </div>
            </div>
            <div className="mt-4 rounded border border-gray-200 bg-gray-50 p-4">
              <h4 className="text-sm font-medium text-gray-800 mb-3">Slider</h4>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formState.bestDeals?.autoplay === true}
                    onChange={(e) =>
                      handleProductSectionField("bestDeals", "autoplay", e.target.checked)
                    }
                    className="rounded border-gray-300"
                  />
                  <span className="text-sm text-gray-700">Autoplay</span>
                </label>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Autoplay speed (ms)</label>
                  <input
                    type="number"
                    min={1000}
                    max={10000}
                    step={500}
                    value={formState.bestDeals?.autoplaySpeed ?? 3000}
                    onChange={(e) =>
                      handleProductSectionField(
                        "bestDeals",
                        "autoplaySpeed",
                        e.target.value ? Number(e.target.value) : 3000
                      )
                    }
                    className={`${styles.input}`}
                    disabled={formState.bestDeals?.autoplay !== true}
                  />
                </div>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formState.bestDeals?.showArrows !== false}
                    onChange={(e) =>
                      handleProductSectionField("bestDeals", "showArrows", e.target.checked)
                    }
                    className="rounded border-gray-300"
                  />
                  <span className="text-sm text-gray-700">Show arrows</span>
                </label>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Products visible</label>
                  <input
                    type="number"
                    min={1}
                    max={8}
                    value={formState.bestDeals?.productsToShow ?? 5}
                    onChange={(e) =>
                      handleProductSectionField(
                        "bestDeals",
                        "productsToShow",
                        e.target.value ? Number(e.target.value) : 5
                      )
                    }
                    className={`${styles.input}`}
                  />
                </div>
              </div>
            </div>
          </section>

          {/* Events Section */}
          <section>
            <h3 className="text-lg font-semibold mb-4">Events</h3>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Heading
                </label>
                <input
                  type="text"
                  value={formState.eventsSection?.heading || ""}
                  onChange={(e) =>
                    setFormState((prev) => ({
                      ...prev,
                      eventsSection: {
                        ...prev.eventsSection,
                        heading: e.target.value,
                      },
                    }))
                  }
                  className={`${styles.input}`}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Subheading
                </label>
                <input
                  type="text"
                  value={formState.eventsSection?.subheading || ""}
                  onChange={(e) =>
                    setFormState((prev) => ({
                      ...prev,
                      eventsSection: {
                        ...prev.eventsSection,
                        subheading: e.target.value,
                      },
                    }))
                  }
                  className={`${styles.input}`}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Events Limit
                </label>
                <input
                  type="number"
                  min={0}
                  value={formState.eventsSection?.limit ?? ""}
                  onChange={(e) =>
                    setFormState((prev) => ({
                      ...prev,
                      eventsSection: {
                        ...prev.eventsSection,
                        limit: e.target.value,
                      },
                    }))
                  }
                  className={`${styles.input}`}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  View All Link
                </label>
                <input
                  type="text"
                  value={formState.eventsSection?.viewAllLink || ""}
                  onChange={(e) =>
                    setFormState((prev) => ({
                      ...prev,
                      eventsSection: {
                        ...prev.eventsSection,
                        viewAllLink: e.target.value,
                      },
                    }))
                  }
                  className={`${styles.input}`}
                  placeholder="/events"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Button Label
                </label>
                <input
                  type="text"
                  value={formState.eventsSection?.buttonText || ""}
                  onChange={(e) =>
                    setFormState((prev) => ({
                      ...prev,
                      eventsSection: {
                        ...prev.eventsSection,
                        buttonText: e.target.value,
                      },
                    }))
                  }
                  className={`${styles.input}`}
                  placeholder="View All"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Sort By
                </label>
                <select
                  value={formState.eventsSection?.sortBy || "latest"}
                  onChange={(e) =>
                    setFormState((prev) => ({
                      ...prev,
                      eventsSection: {
                        ...prev.eventsSection,
                        sortBy: e.target.value,
                      },
                    }))
                  }
                  className={`${styles.input}`}
                >
                  <option value="latest">Latest (Newest First)</option>
                  <option value="startDate">Event Start Date</option>
                  <option value="daysRemaining">Days Remaining</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  {formState.eventsSection?.sortBy === "startDate"
                    ? "Events sorted by start date (earliest first)"
                    : formState.eventsSection?.sortBy === "daysRemaining"
                    ? "Events sorted by days remaining until start (fewest days first)"
                    : "Events sorted by creation date (newest first)"}
                </p>
              </div>
            </div>
            <div className="mb-4 grid gap-4 md:grid-cols-2">
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
                  <input
                    type="checkbox"
                    checked={formState.eventsSection?.autoplay === true}
                    onChange={(e) =>
                      setFormState((prev) => ({
                        ...prev,
                        eventsSection: {
                          ...prev.eventsSection,
                          autoplay: e.target.checked,
                        },
                      }))
                    }
                    className="rounded"
                  />
                  Enable Autoplay
                </label>
                <p className="text-xs text-gray-500 mt-1">
                  Automatically scroll through events
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Autoplay Speed (ms)
                </label>
                <input
                  type="number"
                  min="1000"
                  max="10000"
                  step="500"
                  value={formState.eventsSection?.autoplaySpeed || 3000}
                  onChange={(e) =>
                    setFormState((prev) => ({
                      ...prev,
                      eventsSection: {
                        ...prev.eventsSection,
                        autoplaySpeed: Number(e.target.value) || 3000,
                      },
                    }))
                  }
                  disabled={formState.eventsSection?.autoplay !== true}
                  className={`${styles.input}`}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Time between slides (1000-10000ms)
                </p>
              </div>
            </div>
          </section>

          {/* Sponsored Section */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Sponsored Logos</h3>
              <button
                type="button"
                onClick={addSponsoredItem}
                className={`${styles.button} text-white`}
              >
                Add Sponsor
              </button>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Section Heading
              </label>
              <input
                type="text"
                value={formState.sponsored?.heading || ""}
                onChange={(e) =>
                  setFormState((prev) => ({
                    ...prev,
                    sponsored: {
                      ...prev.sponsored,
                      heading: e.target.value,
                    },
                  }))
                }
                className={`${styles.input}`}
              />
            </div>
            <div className="mb-4 grid gap-4 md:grid-cols-3">
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
                  <input
                    type="checkbox"
                    checked={formState.sponsored?.autoplay !== false}
                    onChange={(e) =>
                      setFormState((prev) => ({
                        ...prev,
                        sponsored: {
                          ...prev.sponsored,
                          autoplay: e.target.checked,
                        },
                      }))
                    }
                    className="rounded"
                  />
                  Enable Autoplay
                </label>
                <p className="text-xs text-gray-500 mt-1">
                  Automatically scroll through sponsors
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Autoplay Speed (ms)
                </label>
                <input
                  type="number"
                  min="1000"
                  max="10000"
                  step="500"
                  value={formState.sponsored?.autoplaySpeed || 3000}
                  onChange={(e) =>
                    setFormState((prev) => ({
                      ...prev,
                      sponsored: {
                        ...prev.sponsored,
                        autoplaySpeed: Number(e.target.value) || 3000,
                      },
                    }))
                  }
                  disabled={formState.sponsored?.autoplay === false}
                  className={`${styles.input}`}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Time between slides (1000-10000ms)
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Visible Logos
                </label>
                <input
                  type="number"
                  min="1"
                  max="20"
                  step="1"
                  value={formState.sponsored?.visibleLogos || 7}
                  onChange={(e) =>
                    setFormState((prev) => ({
                      ...prev,
                      sponsored: {
                        ...prev.sponsored,
                        visibleLogos: Math.max(1, Math.min(20, Number(e.target.value) || 7)),
                      },
                    }))
                  }
                  className={`${styles.input}`}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Number of logos to show at once (1-20)
                </p>
              </div>
            </div>
            <div className="grid gap-6 md:grid-cols-2">
              {(formState.sponsored?.items || []).map((item, index) => (
                <div key={item._id || index} className="border rounded-md p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold">Sponsor {index + 1}</h4>
                    <button
                      type="button"
                      onClick={() => removeSponsoredItem(index)}
                      className="text-sm text-red-600"
                    >
                      Remove
                    </button>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Link (optional)
                    </label>
                    <input
                      type="text"
                      value={item.link || ""}
                      onChange={(e) =>
                        updateSponsoredItem(index, "link", e.target.value)
                      }
                      className={`${styles.input}`}
                      placeholder="https://..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Alt Text
                    </label>
                    <input
                      type="text"
                      value={item.altText || ""}
                      onChange={(e) =>
                        updateSponsoredItem(index, "altText", e.target.value)
                      }
                      className={`${styles.input}`}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Logo/Image
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) =>
                        handleAssetUpload(e.target.files?.[0], (filename) =>
                          updateSponsoredItem(index, "image", filename)
                        )
                      }
                      className={`${styles.input}`}
                    />
                    {item.image && (
                      <img
                        src={getAssetUrl(item.image)}
                        alt="Sponsor"
                        className="mt-3 h-16 object-contain"
                      />
                    )}
                    <p className="text-xs text-gray-500 mt-1">
                      Recommended size: 300x200px (sponsor logo)
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <div className="flex justify-end">
            <button
              type="submit"
              className={`${styles.button} text-white px-6`}
              disabled={isUpdating}
            >
              {isUpdating ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default HomePageEditor;

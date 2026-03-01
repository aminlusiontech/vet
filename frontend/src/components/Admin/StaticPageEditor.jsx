import React, { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";
import { toast } from "react-toastify";
import styles from "../../styles/styles";
import {
  fetchStaticPage,
  updateStaticPage,
  clearStaticPageErrors,
} from "../../redux/actions/staticPage";
import { uploadHomeAsset } from "../../redux/actions/home";
import { backend_url } from "../../server";

const quillModules = {
  toolbar: [
    [{ header: [1, 2, 3, false] }],
    ["bold", "italic", "underline", "strike"],
    [{ color: [] }, { background: [] }],
    [{ align: [] }],
    [{ list: "ordered" }, { list: "bullet" }],
    ["link"],
    ["clean"],
  ],
};

const quillFormats = [
  "header",
  "bold",
  "italic",
  "underline",
  "strike",
  "color",
  "background",
  "align",
  "list",
  "bullet",
  "link",
];

const defaultHero = {
  heading: "",
  subheading: "",
  breadcrumbLabel: "",
};

const defaultContent = {
  main: "",
  secondary: "",
};

const defaultContactInfo = {
  email: "",
  phone: "",
  address: "",
  facebookUrl: "",
  instagramUrl: "",
  tiktokUrl: "",
};

const defaultExtras = {
  mapEmbedUrl: "",
  heroImage: "",
  bannerImage: "",
};

const resolveAssetUrl = (image) => {
  if (!image) return "";
  if (
    image.startsWith("http://") ||
    image.startsWith("https://") ||
    image.startsWith("data:")
  ) {
    return image;
  }
  const normalized = image.startsWith("/") ? image.slice(1) : image;
  return `${backend_url}${normalized}`;
};

const StaticPageEditor = ({
  slug,
  pageTitle,
  options = {
    showHero: true,
    showHeroImageUpload: false,
    showSecondaryContent: false,
    showContactInfo: false,
    showMapEmbed: false,
  },
}) => {
  const dispatch = useDispatch();
  const {
    pages,
    loading,
    errors,
    updating,
    updateErrors,
    updateSuccess,
  } = useSelector((state) => state.staticPages);

  const page = pages[slug];
  const isLoading = loading[slug];
  const error = errors[slug];
  const isUpdating = updating[slug];
  const updateError = updateErrors[slug];
  const didUpdate = updateSuccess[slug];

  const [formState, setFormState] = useState({
    title: "",
    meta: {
      title: "",
      description: "",
    },
    hero: defaultHero,
    content: defaultContent,
    contactInfo: defaultContactInfo,
    extras: defaultExtras,
  });

  useEffect(() => {
    if (!page && !isLoading) {
      dispatch(fetchStaticPage(slug));
    }
  }, [dispatch, slug, page, isLoading]);

  useEffect(() => {
    if (page) {
      setFormState({
        title: page.title || "",
        meta: {
          title: page.meta?.title || "",
          description: page.meta?.description || "",
        },
        hero: {
          ...defaultHero,
          ...(page.hero || {}),
        },
        content: {
          ...defaultContent,
          ...(page.content || {}),
        },
        contactInfo: {
          ...defaultContactInfo,
          ...(page.contactInfo || {}),
        },
        extras: {
          ...defaultExtras,
          ...(page.extras || {}),
        },
      });
    }
  }, [page]);

  useEffect(() => {
    if (didUpdate) {
      toast.success("Page updated successfully");
    }
  }, [didUpdate]);

  useEffect(() => {
    if (updateError) {
      toast.error(updateError);
      dispatch(clearStaticPageErrors());
    }
  }, [updateError, dispatch]);

  useEffect(() => {
    if (error) {
      toast.error(error);
      dispatch(clearStaticPageErrors());
    }
  }, [error, dispatch]);

  const handleHeroChange = (field, value) => {
    setFormState((prev) => ({
      ...prev,
      hero: {
        ...prev.hero,
        [field]: value,
      },
    }));
  };

  const handleMetaChange = (field, value) => {
    setFormState((prev) => ({
      ...prev,
      meta: {
        ...prev.meta,
        [field]: value,
      },
    }));
  };

  const handleContactInfoChange = (field, value) => {
    setFormState((prev) => ({
      ...prev,
      contactInfo: {
        ...prev.contactInfo,
        [field]: value,
      },
    }));
  };

  const handleExtrasChange = (field, value) => {
    setFormState((prev) => ({
      ...prev,
      extras: {
        ...prev.extras,
        [field]: value,
      },
    }));
  };

  const handleHeroImageUpload = (file) => {
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    dispatch(uploadHomeAsset(formData))
      .then((data) => {
        if (data?.filename) {
          handleExtrasChange("heroImage", data.filename);
        }
      })
      .catch((error) => {
        toast.error(error.message || "Unable to upload image");
      });
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    dispatch(
      updateStaticPage(slug, {
        title: formState.title,
        meta: formState.meta,
        hero: options.showHero ? formState.hero : undefined,
        content: formState.content,
        contactInfo: options.showContactInfo ? formState.contactInfo : undefined,
        extras:
          options.showMapEmbed || options.showHeroImageUpload
            ? formState.extras
            : undefined,
      })
    );
  };

  const toolbarNote = useMemo(
    () =>
      "Use the toolbar to format text, add bullet lists, or include links. Press Enter for new paragraphs.",
    []
  );

  if (isLoading && !page) {
    return (
      <div className="w-full flex justify-center items-center py-20">
        <p>Loading page content…</p>
      </div>
    );
  }

  return (
    <div className="w-full p-4 800px:p-6">
      <div className="bg-white rounded-md shadow">
        <div className="border-b px-4 py-4">
          <h2 className="text-xl font-semibold">{pageTitle}</h2>
          <p className="text-sm text-gray-500 mt-1">
            Edit the page content below. {toolbarNote}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-10 px-4 py-6">
          <section className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Page Title
              </label>
              <input
                type="text"
                value={formState.title}
                onChange={(e) =>
                  setFormState((prev) => ({ ...prev, title: e.target.value }))
                }
                className={`${styles.input}`}
                placeholder="Page heading shown to users"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Meta Title
              </label>
              <input
                type="text"
                value={formState.meta.title}
                onChange={(e) => handleMetaChange("title", e.target.value)}
                className={`${styles.input}`}
                placeholder="SEO title"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Meta Description
              </label>
              <textarea
                value={formState.meta.description}
                onChange={(e) =>
                  handleMetaChange("description", e.target.value)
                }
                className={`${styles.input} min-h-[100px]`}
                placeholder="SEO description"
              />
            </div>
          </section>

          {options.showHero && (
            <section className="space-y-4">
              <h3 className="text-lg font-semibold">Hero Section</h3>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Heading
                  </label>
                  <input
                    type="text"
                    value={formState.hero.heading}
                    onChange={(e) => handleHeroChange("heading", e.target.value)}
                    className={`${styles.input}`}
                    placeholder="Hero heading"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Subheading
                  </label>
                  <input
                    type="text"
                    value={formState.hero.subheading}
                    onChange={(e) => handleHeroChange("subheading", e.target.value)}
                    className={`${styles.input}`}
                    placeholder="Hero subheading"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Breadcrumb Label
                  </label>
                  <input
                    type="text"
                    value={formState.hero.breadcrumbLabel}
                    onChange={(e) =>
                      handleHeroChange("breadcrumbLabel", e.target.value)
                    }
                    className={`${styles.input}`}
                    placeholder="Label shown in breadcrumb"
                  />
                </div>
                {options.showHeroImageUpload && (
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Hero Image
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleHeroImageUpload(e.target.files?.[0])}
                      className={`${styles.input}`}
                    />
                    {formState.extras?.heroImage && (
                      <img
                        src={resolveAssetUrl(formState.extras.heroImage)}
                        alt="Hero"
                        className="mt-3 h-32 w-full object-cover rounded-md border"
                        onError={(event) => {
                          event.currentTarget.style.display = "none";
                        }}
                      />
                    )}
                    <p className="text-xs text-gray-500 mt-1">
                      Upload a background image for the page hero section.
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Recommended size: 1920x600px (hero banner)
                    </p>
                  </div>
                )}
              </div>
            </section>
          )}

          <section className="space-y-4">
            <h3 className="text-lg font-semibold">Main Content</h3>
            <ReactQuill
              theme="snow"
              value={formState.content.main}
              onChange={(value) =>
                setFormState((prev) => ({
                  ...prev,
                  content: {
                    ...prev.content,
                    main: value,
                  },
                }))
              }
              modules={quillModules}
              formats={quillFormats}
            />
          </section>

          {options.showSecondaryContent && (
            <section className="space-y-4">
              <h3 className="text-lg font-semibold">Secondary Content</h3>
              <ReactQuill
                theme="snow"
                value={formState.content.secondary}
                onChange={(value) =>
                  setFormState((prev) => ({
                    ...prev,
                    content: {
                      ...prev.content,
                      secondary: value,
                    },
                  }))
                }
                modules={quillModules}
                formats={quillFormats}
              />
            </section>
          )}

          {options.showContactInfo && (
            <section className="space-y-4">
              <h3 className="text-lg font-semibold">Contact Information</h3>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={formState.contactInfo.email}
                    onChange={(e) =>
                      handleContactInfoChange("email", e.target.value)
                    }
                    className={`${styles.input}`}
                    placeholder="info@example.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone
                  </label>
                  <input
                    type="text"
                    value={formState.contactInfo.phone}
                    onChange={(e) =>
                      handleContactInfoChange("phone", e.target.value)
                    }
                    className={`${styles.input}`}
                    placeholder="+44 1234 567890"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Address
                  </label>
                  <input
                    type="text"
                    value={formState.contactInfo.address}
                    onChange={(e) =>
                      handleContactInfoChange("address", e.target.value)
                    }
                    className={`${styles.input}`}
                    placeholder="Company address"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Facebook URL
                  </label>
                  <input
                    type="text"
                    value={formState.contactInfo.facebookUrl}
                    onChange={(e) =>
                      handleContactInfoChange("facebookUrl", e.target.value)
                    }
                    className={`${styles.input}`}
                    placeholder="https://facebook.com/yourpage"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Instagram URL
                  </label>
                  <input
                    type="text"
                    value={formState.contactInfo.instagramUrl}
                    onChange={(e) =>
                      handleContactInfoChange("instagramUrl", e.target.value)
                    }
                    className={`${styles.input}`}
                    placeholder="https://instagram.com/yourpage"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    TikTok URL
                  </label>
                  <input
                    type="text"
                    value={formState.contactInfo.tiktokUrl}
                    onChange={(e) =>
                      handleContactInfoChange("tiktokUrl", e.target.value)
                    }
                    className={`${styles.input}`}
                    placeholder="https://www.tiktok.com/@yourpage"
                  />
                </div>
              </div>
            </section>
          )}

          {options.showMapEmbed && (
            <section className="space-y-4">
              <h3 className="text-lg font-semibold">Map Embed</h3>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Google Maps Embed URL
                </label>
                <textarea
                  value={formState.extras.mapEmbedUrl}
                  onChange={(e) =>
                    handleExtrasChange("mapEmbedUrl", e.target.value)
                  }
                  className={`${styles.input} min-h-[100px]`}
                  placeholder="Paste the Google Maps embed URL"
                />
              </div>
            </section>
          )}

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

export default StaticPageEditor;


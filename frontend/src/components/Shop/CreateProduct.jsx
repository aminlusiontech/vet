import React, { useEffect, useMemo, useState, useRef } from "react";
import { AiOutlinePlusCircle } from "react-icons/ai";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { createProduct } from "../../redux/actions/product";
import { categoriesData as fallbackCategoriesData } from "../../static/data";
import { toast } from "react-toastify";
import { backend_url } from "../../server";
import { fetchSiteOptions } from "../../redux/actions/siteOptions";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";

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

const resolveCategoryImageSrc = (value) => {
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

const CreateProduct = () => {
    const { user } = useSelector((state) => state.user);
    const { success, error, product: createdProduct } = useSelector((state) => state.products);
    const siteOptionsState = useSelector((state) => state.siteOptions);
    const navigate = useNavigate();
    const dispatch = useDispatch();

    const [images, setImages] = useState([]);
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [category, setCategory] = useState("");
    const [subcategory, setSubcategory] = useState("");
    const [categoryLink, setCategoryLink] = useState("");
    const [categoryImage, setCategoryImage] = useState("");
    const [tags, setTags] = useState("");
    const [originalPrice, setOriginalPrice] = useState();
    const [stock, setStock] = useState(1);
    const [postageFees, setPostageFees] = useState();
    const [wantFeature, setWantFeature] = useState(false);
    const [featureWeeks, setFeatureWeeks] = useState(1);

    const hasNavigatedRef = useRef(false);
    const featureTiers = useMemo(() => {
        const fp = siteOptionsState?.options?.global?.featuredProductSettings || {};
        const tiers = Array.isArray(fp.pricingTiers) ? fp.pricingTiers : [];
        return tiers.filter((t) => t && t.isActive !== false);
    }, [siteOptionsState?.options?.global?.featuredProductSettings]);

    useEffect(() => {
        if (error) toast.error(error);
        if (success && !hasNavigatedRef.current) {
            hasNavigatedRef.current = true;
            toast.success("Product created successfully!");
            if (wantFeature && featureWeeks && createdProduct?._id) {
                navigate(`/profile/feature-product?productId=${createdProduct._id}&weeks=${featureWeeks}`, { replace: true });
                return;
            }
            setName("");
            setDescription("");
            setCategory("");
            setSubcategory("");
            setCategoryLink("");
            setCategoryImage("");
            setTags("");
            setOriginalPrice(undefined);
            setStock(1);
            setPostageFees(undefined);
            setImages([]);
            setTimeout(() => navigate("/profile/dashboard", { replace: true }), 300);
        }
    }, [error, success, navigate, wantFeature, featureWeeks, createdProduct]);

    const handleImageChange = (e) => {
        e.preventDefault();

        const MAX_FILE_SIZE = 1024 * 1024; // 1MB in bytes
        const inputFiles = Array.from(e.target.files || []);
        
        if (!inputFiles.length) return;

        // Validate file sizes
        const oversizedFiles = inputFiles.filter(file => file.size > MAX_FILE_SIZE);
        if (oversizedFiles.length > 0) {
            toast.error(`One or more images exceed the 1MB size limit. Maximum upload size is 1MB per image.`);
            e.target.value = ""; // Reset input
            return;
        }

        const files = inputFiles.map((file) => ({
            file,
            preview: URL.createObjectURL(file),
        }));

        setImages((prevImages) => [...prevImages, ...files]);
    };

    // Cleanup image preview URLs on unmount or when images change
    // Use ref to track previous images to avoid revoking URLs that are still in use
    const prevImagesRef = useRef([]);
    
    useEffect(() => {
        // Revoke URLs for images that are no longer in the array
        const currentPreviews = new Set(images.map(img => img?.preview).filter(Boolean));
        prevImagesRef.current.forEach((prevImage) => {
            if (prevImage?.preview && !currentPreviews.has(prevImage.preview)) {
                URL.revokeObjectURL(prevImage.preview);
            }
        });
        prevImagesRef.current = images;
        
        // Cleanup on unmount
        return () => {
            images.forEach((image) => {
                if (image?.preview) {
                    URL.revokeObjectURL(image.preview);
                }
            });
        };
    }, [images]);

    const handleRemoveImage = (index) => {
        setImages((prev) => {
            const next = [...prev];
            const removed = next.splice(index, 1)[0];
            if (removed?.preview) {
                URL.revokeObjectURL(removed.preview);
            }
            return next;
        });
    };

    const catalogCategoriesRaw =
        siteOptionsState?.options?.global?.catalog?.categories || [];
    const hasSiteOptions = Boolean(siteOptionsState?.options?.global);
    const isSiteOptionsLoading = Boolean(siteOptionsState?.loading?.global);

    const availableCategories = useMemo(() => {
        if (Array.isArray(catalogCategoriesRaw) && catalogCategoriesRaw.length) {
            const normalized = catalogCategoriesRaw
                .filter((category) => category && category.name && category.isActive !== false)
                .sort(
                    (a, b) => (typeof a.order === "number" ? a.order : 0) - (typeof b.order === "number" ? b.order : 0)
                )
                .map((category) => {
                    const name = category.name?.trim() || "";
                    const slugSource = category.slug?.trim() || name;
                    const fallbackLink = slugSource
                        ? `/products?category=${encodeURIComponent(slugSource)}`
                        : "/products";

                    return {
                        name,
                        link: category.link?.trim() || fallbackLink,
                        image: category.image || category.icon || "",
                        subcategories: (category.subcategories || [])
                            .filter((sub) => sub && sub.name && sub.isActive !== false)
                            .sort((a, b) => (a.order || 0) - (b.order || 0))
                            .map((sub) => ({
                                name: sub.name?.trim() || "",
                                slug: sub.slug?.trim() || "",
                            })),
                    };
                });

            if (normalized.length) {
                return normalized;
            }
        }

        return (fallbackCategoriesData || []).map((item) => ({
            name: item.title,
            link:
                item.link || `/products?category=${encodeURIComponent(item.title || "")}`,
            image: item.image_Url || "",
            subcategories: [],
        }));
    }, [catalogCategoriesRaw]);

    const selectedCategoryData = useMemo(() => {
        return availableCategories.find((cat) => cat.name === category);
    }, [availableCategories, category]);

    const availableSubcategories = useMemo(() => {
        return selectedCategoryData?.subcategories || [];
    }, [selectedCategoryData]);

    useEffect(() => {
        if (!hasSiteOptions && !isSiteOptionsLoading) {
            dispatch(fetchSiteOptions());
        }
    }, [dispatch, hasSiteOptions, isSiteOptionsLoading]);

    const handleSubmit = (e) => {
        e.preventDefault();

        const newForm = new FormData();

        images.forEach((image) => {
            newForm.append("images", image.file);
        });
        
        // Store category as "Main Category > Subcategory" if subcategory is selected, otherwise just main category
        const finalCategory = subcategory ? `${category} > ${subcategory}` : category;
        
        newForm.append("name", name);
        newForm.append("description", description);
        newForm.append("category", finalCategory);
        newForm.append("tags", tags);
        newForm.append("originalPrice", originalPrice);
        // Set discountPrice to originalPrice (backend requires discountPrice, this is the selling price)
        // If no discount is needed, discountPrice should equal originalPrice
        newForm.append("discountPrice", originalPrice);
        newForm.append("stock", stock);
        newForm.append("postageFees", postageFees || 0);
        newForm.append("shopId", user._id);
        dispatch(createProduct(newForm));
    };

    return (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-4 lg:p-6">
            <header className="mb-6">
                <h2 className="text-lg font-semibold text-slate-900">Sell Items</h2>
                <p className="text-sm text-slate-500">
                    Create a new product listing to start selling on the platform.
                </p>
            </header>
            <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                    <label className="pb-2 block font-medium text-sm text-gray-700">
                        Upload Images <span className="text-red-500">*</span>
                    </label>
                    <p className="text-xs text-gray-500 mb-2">Maximum upload size: 1MB per image</p>
                    <input
                        type="file"
                        name=""
                        id="upload"
                        className="hidden"
                        multiple
                        accept="image/*"
                        onChange={handleImageChange}
                    />
                    <div className="w-full flex items-center flex-wrap gap-3">
                        <label htmlFor="upload" className="cursor-pointer">
                            <span className="flex items-center justify-center w-[120px] h-[120px] border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-[#38513b] hover:text-[#38513b] transition">
                                <AiOutlinePlusCircle size={28} />
                            </span>
                        </label>
                        {images &&
                            images.map((image, index) => {
                                const isFirstImage = index === 0;
                                return (
                                <div
                                    key={image.preview}
                                        draggable
                                        onDragStart={(e) => {
                                            e.dataTransfer.setData('text/plain', index.toString());
                                            e.currentTarget.style.opacity = '0.5';
                                        }}
                                        onDragEnd={(e) => {
                                            e.currentTarget.style.opacity = '1';
                                        }}
                                        onDragOver={(e) => {
                                            e.preventDefault();
                                            e.currentTarget.style.border = '2px dashed #38513b';
                                        }}
                                        onDragLeave={(e) => {
                                            e.currentTarget.style.border = '';
                                        }}
                                        onDrop={(e) => {
                                            e.preventDefault();
                                            e.currentTarget.style.border = '';
                                            const draggedIndex = parseInt(e.dataTransfer.getData('text/plain'));
                                            const newImages = [...images];
                                            const [removed] = newImages.splice(draggedIndex, 1);
                                            newImages.splice(index, 0, removed);
                                            setImages(newImages);
                                        }}
                                        className={`relative h-[120px] w-[120px] rounded-lg overflow-hidden shadow-sm border border-gray-200 cursor-move ${isFirstImage ? 'ring-2 ring-[#38513b] ring-offset-2' : ''}`}
                                >
                                    <img
                                        src={image.preview}
                                        alt={`Product ${index + 1}`}
                                        className="h-full w-full object-contain p-3"
                                    />
                                    <button
                                        type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleRemoveImage(index);
                                            }}
                                        className="absolute top-1 right-1 bg-black/70 hover:bg-black text-white text-xs px-2 py-1 rounded"
                                    >
                                        Remove
                                    </button>
                                        {isFirstImage && (
                                            <span className="absolute bottom-1 left-1 bg-[#38513b] text-white text-xs px-2 py-1 rounded-md">Featured</span>
                                        )}
                                </div>
                                );
                            })}
                    </div>
                    {images.length === 0 && (
                        <p className="text-xs text-gray-500 mt-1">
                            Click the box above to upload product images. You can upload multiple images.
                        </p>
                    )}
                    {images.length > 0 && (
                        <p className="text-xs text-gray-500 mt-1">
                            Drag images to reorder them. The first image will be the featured image.
                        </p>
                    )}
                    <p className="text-xs text-gray-500 mt-1">
                        Recommended size: 800x800px or 1000x1000px (square images work best)
                    </p>
                </div>

                <div>
                    <label className="pb-2 block font-medium text-sm text-gray-700">
                        Product Name <span className="text-red-500">*</span>
                    </label>
                    <input
                        type="text"
                        name="name"
                        value={name}
                        className="appearance-none block w-full px-3 h-[40px] border border-gray-300 rounded-[3px] placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Enter your product name..."
                        required
                    />
                </div>

                <div>
                    <label className="pb-2 block font-medium text-sm text-gray-700">
                        Description <span className="text-red-500">*</span>
                    </label>
                    <ReactQuill
                        theme="snow"
                        value={description}
                        onChange={setDescription}
                        modules={quillModules}
                        formats={quillFormats}
                        className="bg-white"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                        Use the toolbar to format product details. Rich text will be saved as HTML.
                    </p>
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                    <div>
                        <label className="pb-2 block font-medium text-sm text-gray-700">
                            Category <span className="text-red-500">*</span>
                        </label>
                        <select
                            className="w-full appearance-none block px-3 h-[40px] border border-gray-300 rounded-[3px] focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                            value={subcategory ? `${category} > ${subcategory}` : category}
                            onChange={(e) => {
                                const value = e.target.value;
                                // Check if it's a subcategory (contains " > ")
                                if (value.includes(" > ")) {
                                    const [mainCat, subCat] = value.split(" > ");
                                    const selected = availableCategories.find(
                                        (item) => item.name === mainCat
                                    );
                                    setCategory(mainCat);
                                    setSubcategory(subCat);
                                    setCategoryLink(selected?.link || "");
                                    setCategoryImage(selected?.image || "");
                                } else {
                                    // It's a main category
                                    const selected = availableCategories.find(
                                        (item) => item.name === value
                                    );
                                    setCategory(value);
                                    setSubcategory("");
                                    setCategoryLink(selected?.link || "");
                                    setCategoryImage(selected?.image || "");
                                }
                            }}
                            required
                        >
                            <option value="">Choose a category</option>
                            {availableCategories.map((item) => {
                                const categorySubcategories = item.subcategories || [];
                                return (
                                    <React.Fragment key={item.name}>
                                        <option value={item.name}>
                                            {item.name}
                                        </option>
                                        {categorySubcategories.length > 0 && categorySubcategories.map((sub) => (
                                            <option key={sub.name} value={`${item.name} > ${sub.name}`}>
                                                &nbsp;&nbsp;&nbsp;{sub.name}
                                            </option>
                                        ))}
                                    </React.Fragment>
                                );
                            })}
                        </select>
                        {!availableCategories.length && (
                            <p className="mt-1 text-xs text-red-500">
                                No categories available. Contact the admin to configure header categories.
                            </p>
                        )}
                        {categoryImage && (
                            <div className="flex items-center gap-3 mt-2">
                                <img
                                    src={resolveCategoryImageSrc(categoryImage)}
                                    alt="Category"
                                    className="h-12 w-12 object-contain rounded border"
                                />
                                {categoryLink && (
                                    <a
                                        href={categoryLink}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-sm text-blue-600 underline"
                                    >
                                        View category link
                                    </a>
                                )}
                            </div>
                        )}
                    </div>

                    <div>
                        <label className="pb-2 block font-medium text-sm text-gray-700">
                            Tags <span className="text-gray-400">(optional)</span>
                        </label>
                        <input
                            type="text"
                            name="tags"
                            value={tags}
                            className="appearance-none block w-full px-3 h-[40px] border border-gray-300 rounded-[3px] placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                            onChange={(e) => setTags(e.target.value)}
                            placeholder="Enter product tags (comma separated)..."
                        />
                    </div>
                </div>

                <div className="grid gap-4 lg:grid-cols-3">
                    <div>
                        <label className="pb-2 block font-medium text-sm text-gray-700">
                            Price <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="number"
                            name="price"
                            value={originalPrice || ""}
                            className="appearance-none block w-full px-3 h-[40px] border border-gray-300 rounded-[3px] placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                            onChange={(e) => setOriginalPrice(e.target.value)}
                            placeholder="0.00"
                            required
                            min="0"
                            step="0.01"
                        />
                    </div>

                    <div>
                        <label className="pb-2 block font-medium text-sm text-gray-700">
                            Postage Fees <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="number"
                            name="postageFees"
                            value={postageFees || ""}
                            className="appearance-none block w-full px-3 h-[40px] border border-gray-300 rounded-[3px] placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                            onChange={(e) => setPostageFees(e.target.value)}
                            placeholder="0.00"
                            required
                            min="0"
                            step="0.01"
                        />
                    </div>

                    <div>
                        <label className="pb-2 block font-medium text-sm text-gray-700">
                            Stock <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="number"
                            name="stock"
                            value={stock || ""}
                            className="appearance-none block w-full px-3 h-[40px] border border-gray-300 rounded-[3px] placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                            onChange={(e) => setStock(e.target.value)}
                            placeholder="0"
                            required
                            min="0"
                        />
                    </div>
                </div>

                {featureTiers.length > 0 && (
                    <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
                        <label className="flex items-center gap-2 mb-3">
                            <input
                                type="checkbox"
                                checked={wantFeature}
                                onChange={(e) => setWantFeature(e.target.checked)}
                            />
                            <span className="text-sm font-medium text-slate-700">Feature this product on the homepage (pay after creating)</span>
                        </label>
                        {wantFeature && (
                            <div>
                                <label className="block text-sm text-slate-600 mb-2">Duration</label>
                                <select
                                    value={featureWeeks}
                                    onChange={(e) => setFeatureWeeks(Number(e.target.value))}
                                    className="w-full max-w-xs border border-slate-200 rounded-[3px] px-3 h-[40px] text-sm"
                                >
                                    {featureTiers.map((t) => (
                                        <option key={t.weeks} value={t.weeks}>
                                            {t.label || `${t.weeks} week${t.weeks > 1 ? "s" : ""}`} — £{Number(t.price).toFixed(2)}
                                        </option>
                                    ))}
                                </select>
                                <p className="text-xs text-slate-500 mt-2">
                                    After you create the listing, you will be taken to pay. The product will be featured until the period ends (no approval needed).
                                </p>
                            </div>
                        )}
                    </div>
                )}

                <div>
                    <input
                        type="submit"
                        value="Sell Item"
                        className="cursor-pointer text-center block w-full px-3 h-[45px] border border-gray-300 rounded-[3px] bg-[#38513B] text-white font-semibold hover:opacity-90 transition"
                    />
                </div>
            </form>
        </div>
    );
};

export default CreateProduct;
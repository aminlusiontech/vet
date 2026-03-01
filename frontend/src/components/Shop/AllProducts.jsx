import { Button } from "@material-ui/core";
import { DataGrid } from "@material-ui/data-grid";
import axios from "axios";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";
import {
  AiOutlineDelete,
  AiOutlineEdit,
  AiOutlineEye,
  AiOutlineStar,
  AiFillStar,
} from "react-icons/ai";
import { RxCross1 } from "react-icons/rx";
import { useDispatch, useSelector } from "react-redux";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { getAllProductsShop } from "../../redux/actions/product";
import { server, backend_url } from "../../server";
import Loader from "../Layout/Loader";
import { categoriesData as fallbackCategoriesData } from "../../static/data";
import { fetchSiteOptions } from "../../redux/actions/siteOptions";

const initialFormState = {
  name: "",
  description: "",
  category: "",
  categoryLink: "",
  categoryImage: "",
  tags: "",
  originalPrice: "",
  discountPrice: "",
  stock: "",
  postageFees: "",
};

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

const buildProductImageUrl = (value) => {
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

const AllProducts = () => {
  const dispatch = useDispatch();
  const { products, isLoading } = useSelector((state) => state.products);
  const { user } = useSelector((state) => state.user);
  const siteOptionsState = useSelector((state) => state.siteOptions);

  const catalogCategoriesRaw =
    siteOptionsState?.options?.global?.catalog?.categories || [];
  const hasSiteOptions = Boolean(siteOptionsState?.options?.global);
  const isSiteOptionsLoading = Boolean(siteOptionsState?.loading?.global);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentProduct, setCurrentProduct] = useState(null);
  const [formState, setFormState] = useState(initialFormState);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [imageBeingDeleted, setImageBeingDeleted] = useState(null);
  const [isImageUploading, setIsImageUploading] = useState(false);
  const [pendingImages, setPendingImages] = useState([]); // Local state for images before save
  const [imagesToAdd, setImagesToAdd] = useState([]); // New images to upload on save
  const [imagesToRemove, setImagesToRemove] = useState([]); // Images to delete on save
  
  // Use ref to prevent multiple simultaneous API calls
  const isFetchingRef = useRef(false);
  const prevUserIdRef = useRef(null);

  const fallbackCategories = useMemo(() => {
    return (fallbackCategoriesData || []).map((item) => ({
      name: item.title,
      link:
        item.link || `/products?category=${encodeURIComponent(item.title || "")}`,
      image: item.image_Url || "",
    }));
  }, []);

  const fallbackImageMap = useMemo(() => {
    return fallbackCategories.reduce((acc, item) => {
      if (item.name) {
        acc[item.name] = item.image;
      }
      return acc;
    }, {});
  }, [fallbackCategories]);

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
            image: category.image || category.icon || fallbackImageMap[name] || "",
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

    return fallbackCategories.map((item) => ({
      ...item,
      subcategories: [],
    }));
  }, [catalogCategoriesRaw, fallbackCategories, fallbackImageMap]);

  // Memoize selectedCategoryMissing to prevent unnecessary recalculations
  const selectedCategoryMissing = useMemo(() => {
    return formState.category &&
      !availableCategories.some((category) => category.name === formState.category);
  }, [formState.category, availableCategories]);

  useEffect(() => {
    const currentUserId = user?._id;
    
    // Prevent duplicate calls if user ID hasn't changed or request is already in progress
    if (!currentUserId || currentUserId === prevUserIdRef.current || isFetchingRef.current) {
      return;
    }
    
    prevUserIdRef.current = currentUserId;
    isFetchingRef.current = true;
    
    dispatch(getAllProductsShop(currentUserId)).finally(() => {
      isFetchingRef.current = false;
    });
  }, [dispatch, user?._id]);

  useEffect(() => {
    if (!hasSiteOptions && !isSiteOptionsLoading) {
      dispatch(fetchSiteOptions());
    }
  }, [dispatch, hasSiteOptions, isSiteOptionsLoading]);

  const rows = useMemo(() => {
    return (products || []).map((item) => {
      const until = item.featuredUntil ? new Date(item.featuredUntil) : null;
      // Featured if promoted and (no end date or end date in future)
      const isFeatured = Boolean(item.isPromoted) && (!until || until > new Date());
      const featuredUntilFormatted = until ? until.toLocaleDateString(undefined, { dateStyle: "medium" }) : null;
      return {
        id: item._id,
        name: item.name,
        price:
          typeof item.discountPrice === "number"
            ? `£${item.discountPrice.toFixed(2)}`
            : item.discountPrice,
        Stock: item.stock,
        category: item.category || "",
        createdAt: item.createdAt ? new Date(item.createdAt).getTime() : 0,
        isPromoted: Boolean(item.isPromoted),
        featuredUntil: item.featuredUntil || null,
        isFeatured,
        featuredUntilFormatted,
      };
    });
  }, [products]);

  // Memoize form change handler to prevent unnecessary re-renders
  const handleFormChange = useCallback((field, value) => {
    setFormState((prev) => ({
      ...prev,
      [field]: value,
    }));
  }, []);

  // Memoize category select handler to prevent unnecessary re-renders
  const handleCategorySelect = useCallback((value) => {
    const category = availableCategories.find((item) => item.name === value);
    setFormState((prev) => ({
      ...prev,
      category: value,
      subcategory: "", // Reset subcategory when main category changes
      categoryLink: category?.link || "",
      categoryImage: category?.image || "",
    }));
  }, [availableCategories]);

  const selectedCategoryData = useMemo(() => {
    return availableCategories.find((cat) => cat.name === formState.category);
  }, [availableCategories, formState.category]);

  const availableSubcategories = useMemo(() => {
    return selectedCategoryData?.subcategories || [];
  }, [selectedCategoryData]);

  const openEditModal = useCallback(
    (productId) => {
      const product = products.find((item) => item._id === productId);
      if (!product) return;

      setCurrentProduct(product);
      
      // Parse category - could be "Main Category" or "Main Category > Subcategory"
      const productCategory = product.category || "";
      let mainCategory = productCategory;
      let subcategory = "";
      
      if (productCategory.includes(" > ")) {
        const parts = productCategory.split(" > ");
        mainCategory = parts[0].trim();
        subcategory = parts[1]?.trim() || "";
      }
      
      const matchedCategory = availableCategories.find(
        (item) => item.name === mainCategory
      );
      
      setFormState({
        name: product.name || "",
        description: product.description || "",
        category: mainCategory,
        subcategory: subcategory,
        categoryLink: product.categoryLink || matchedCategory?.link || "",
        categoryImage: product.categoryImage || matchedCategory?.image || "",
        tags: product.tags || "",
        originalPrice:
          product.originalPrice !== undefined && product.originalPrice !== null
            ? product.originalPrice
            : "",
        discountPrice:
          product.discountPrice !== undefined && product.discountPrice !== null
            ? product.discountPrice
            : "",
        stock:
          product.stock !== undefined && product.stock !== null
            ? product.stock
            : "",
        postageFees:
          product.postageFees !== undefined && product.postageFees !== null
            ? product.postageFees
            : "",
      });
      // Initialize pending images with current product images
      setPendingImages([...(product.images || [])]);
      setImagesToAdd([]);
      setImagesToRemove([]);
      setImageBeingDeleted(null);
      setIsModalOpen(true);
    },
    [products, availableCategories]
  );

  // Memoize reset modal state to prevent unnecessary re-renders
  const resetModalState = useCallback(() => {
    setIsModalOpen(false);
    setCurrentProduct(null);
    setFormState(initialFormState);
    setIsSaving(false);
    setImageBeingDeleted(null);
    setPendingImages([]);
    setImagesToAdd([]);
    setImagesToRemove([]);
  }, []);

  // Memoize handleSave to prevent unnecessary re-renders (though it uses many dependencies)
  const handleSave = useCallback(async (event) => {
    event.preventDefault();
    if (!currentProduct) return;

    try {
      setIsSaving(true);

      const parseNumberField = (value, fieldName, { required = false } = {}) => {
        if (value === "" || value === null || value === undefined) {
          if (required) {
            throw new Error(`${fieldName} is required.`);
          }
          return undefined;
        }
        const parsed = Number(value);
        if (Number.isNaN(parsed)) {
          throw new Error(`${fieldName} must be a valid number.`);
        }
        return parsed;
      };

      // Store category as "Main Category > Subcategory" if subcategory is selected, otherwise just main category
      const finalCategory = formState.subcategory 
        ? `${formState.category} > ${formState.subcategory}` 
        : formState.category;

      const payload = {
        name: formState.name,
        description: formState.description,
        category: finalCategory,
        tags: formState.tags,
        originalPrice: parseNumberField(formState.originalPrice, "Old price"),
        discountPrice: parseNumberField(formState.discountPrice, "New price", {
          required: true,
        }),
        stock: parseNumberField(formState.stock, "Stock", { required: true }),
        postageFees: parseNumberField(formState.postageFees, "Postage fees", {
          required: true,
        }),
      };

      Object.keys(payload).forEach((key) => {
        if (payload[key] === undefined || payload[key] === "") {
          delete payload[key];
        }
      });

      // Save product details first
      await axios.put(
        `${server}/product/update-shop-product/${currentProduct._id}`,
        payload,
        { withCredentials: true }
      );

      // Handle image deletions
      for (const filename of imagesToRemove) {
        try {
          await axios.delete(
            `${server}/product/delete-shop-product-image/${currentProduct._id}`,
            {
              params: { filename },
              withCredentials: true,
            }
          );
        } catch (error) {
          // Failed to delete image
        }
      }

      // Handle image uploads and get new filenames
      let uploadedFilenames = [];
      if (imagesToAdd.length > 0) {
        const formData = new FormData();
        imagesToAdd.forEach((img) => {
          if (img.file) {
            formData.append("images", img.file);
          }
        });

        try {
          const uploadResponse = await axios.post(
            `${server}/product/add-shop-product-images/${currentProduct._id}`,
            formData,
            {
              headers: {
                "Content-Type": "multipart/form-data",
              },
              withCredentials: true,
            }
          );
          // Get newly uploaded filenames from response
          if (uploadResponse.data?.images) {
            const currentImagesBeforeUpload = (currentProduct.images || []).filter(
              (img) => !imagesToRemove.includes(img) && !pendingImages.some((p) => p === img)
            );
            uploadedFilenames = uploadResponse.data.images.filter(
              (img) => !currentImagesBeforeUpload.includes(img)
            );
          }
        } catch (error) {
          toast.error(
            error?.response?.data?.message ||
              "Product updated but failed to upload some images"
          );
        }
      }

      // Build final ordered images array from pendingImages
      // Map blob: URLs to newly uploaded filenames and keep existing filenames
      let uploadedIndex = 0;
      const finalImagesOrder = pendingImages
        .map((img) => {
          // If it's a blob URL (new image), replace with uploaded filename
          if (typeof img === 'string' && img.startsWith('blob:')) {
            return uploadedFilenames[uploadedIndex++];
          }
          // Otherwise it's an existing filename
          return img;
        })
        .filter(Boolean); // Remove any undefined values

      // Update product with final ordered images array
      if (finalImagesOrder.length > 0 || imagesToRemove.length > 0 || imagesToAdd.length > 0) {
        try {
          await axios.put(
            `${server}/product/update-shop-product/${currentProduct._id}`,
            { images: finalImagesOrder },
            { withCredentials: true }
          );
        } catch (error) {
          // Failed to update image order
          // Don't fail the entire operation if order update fails
        }
      }

      toast.success("Product updated");
      resetModalState();
      // Defer refetch to prevent blocking - use requestIdleCallback if available, otherwise setTimeout
      const refetchProducts = () => {
        const currentUserId = user?._id;
        if (currentUserId && !isFetchingRef.current) {
          isFetchingRef.current = true;
          dispatch(getAllProductsShop(currentUserId)).finally(() => {
            isFetchingRef.current = false;
          });
        }
      };
      if (typeof window !== 'undefined' && window.requestIdleCallback) {
        window.requestIdleCallback(refetchProducts, { timeout: 200 });
      } else {
        setTimeout(refetchProducts, 200);
      }
    } catch (error) {
      const message =
        error?.response?.data?.message || error?.message || "Failed to save product";
      toast.error(message);
      setIsSaving(false);
    }
  }, [currentProduct, formState, imagesToRemove, imagesToAdd, pendingImages, user?._id, dispatch]);

  // Memoize image delete handler to prevent unnecessary re-renders
  const handleDeleteImage = useCallback((imageIdentifier) => {
    if (!imageIdentifier) return;

    // Check if it's a new image (preview URL) or existing image (filename)
    const isNewImage = typeof imageIdentifier === 'string' && imageIdentifier.startsWith('blob:');
    
    // Remove from pending images (local state only)
    setPendingImages((prev) => prev.filter((img) => img !== imageIdentifier));
    
    if (isNewImage) {
      // Remove from imagesToAdd if it was a new image
      setImagesToAdd((prev) => {
        const updated = prev.filter((img) => img.preview !== imageIdentifier);
        // Clean up the object URL
        URL.revokeObjectURL(imageIdentifier);
        return updated;
      });
    } else {
      // Track for deletion on save (existing image)
      setImagesToRemove((prev) => {
        if (!prev.includes(imageIdentifier)) {
          return [...prev, imageIdentifier];
        }
        return prev;
      });
    }
  }, []);

  // Memoize add images handler to prevent unnecessary re-renders
  const handleAddImages = useCallback((event) => {
    const input = event.target;
    const MAX_FILE_SIZE = 1024 * 1024; // 1MB in bytes
    const files = Array.from(input.files || []);
    if (!files.length) {
      input.value = "";
      return;
    }

    // Validate file sizes
    const oversizedFiles = files.filter(file => file.size > MAX_FILE_SIZE);
    if (oversizedFiles.length > 0) {
      toast.error(`One or more images exceed the 1MB size limit. Maximum upload size is 1MB per image.`);
      input.value = "";
      return;
    }

    // Add to local state only (preview)
    const newImages = files.map((file) => ({
      file,
      preview: URL.createObjectURL(file),
      isNew: true,
    }));

    setImagesToAdd((prev) => [...prev, ...newImages]);
    // Add preview URLs to pending images
    setPendingImages((prev) => [...prev, ...newImages.map(img => img.preview)]);
    
    input.value = "";
  }, []);

  // Memoize drag handlers to prevent unnecessary re-renders of image items
  const handleDragStart = useCallback((index) => (e) => {
    e.dataTransfer.setData('text/plain', index.toString());
    e.currentTarget.style.opacity = '0.5';
  }, []);

  const handleDragEnd = useCallback((e) => {
    e.currentTarget.style.opacity = '1';
  }, []);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.currentTarget.style.border = '2px dashed #38513b';
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.currentTarget.style.border = '';
  }, []);

  const handleImageDrop = useCallback((index) => (e) => {
    e.preventDefault();
    e.currentTarget.style.border = '';
    const draggedIndex = parseInt(e.dataTransfer.getData('text/plain'));
    setPendingImages((prev) => {
      const newImages = [...prev];
      const [removed] = newImages.splice(draggedIndex, 1);
      newImages.splice(index, 0, removed);
      return newImages;
    });
  }, []);

  const handleDelete = useCallback(async (productId) => {
    const confirm = window.confirm(
      "Are you sure you want to delete this product? This action cannot be undone."
    );
    if (!confirm) return;

    try {
      setDeletingId(productId);
      await axios.delete(`${server}/product/delete-shop-product/${productId}`, {
        withCredentials: true,
      });
      toast.success("Product deleted");
      // Defer refetch to prevent blocking
      const refetchProducts = () => {
        const currentUserId = user?._id;
        if (currentUserId && !isFetchingRef.current) {
          isFetchingRef.current = true;
          dispatch(getAllProductsShop(currentUserId)).finally(() => {
            isFetchingRef.current = false;
          });
        }
      };
      if (typeof window !== 'undefined' && window.requestIdleCallback) {
        window.requestIdleCallback(refetchProducts, { timeout: 200 });
      } else {
        setTimeout(refetchProducts, 200);
      }
    } catch (error) {
      toast.error(
        error?.response?.data?.message ||
          "Failed to delete the product. Please try again."
      );
    } finally {
      setDeletingId(null);
    }
  }, [dispatch, user?._id]);

  const columns = useMemo(() => {
    return [
      {
        field: "name",
        headerName: "Name",
        minWidth: 200,
        flex: 1.4,
        renderCell: (params) => (
          <div className="flex items-center gap-2">
            {params.row.isFeatured && (
              <AiFillStar size={18} className="text-amber-500 shrink-0" title={params.row.featuredUntilFormatted ? `Featured until ${params.row.featuredUntilFormatted}` : "Featured on homepage"} />
            )}
            <span>{params.value}</span>
          </div>
        ),
      },
      {
        field: "price",
        headerName: "Price",
        minWidth: 100,
        flex: 0.6,
      },
      {
        field: "Stock",
        headerName: "Stock",
        type: "number",
        minWidth: 80,
        flex: 0.5,
      },
      {
        field: "category",
        headerName: "Category",
        minWidth: 130,
        flex: 0.6,
      },
      {
        field: "Preview",
        flex: 0.6,
        minWidth: 90,
        headerName: "Preview",
        sortable: false,
        renderCell: (params) => (
          <Link to={`/product/${params.id}`} onClick={(event) => event.stopPropagation()}>
            <Button size="small">
              <AiOutlineEye size={18} />
            </Button>
          </Link>
        ),
      },
      {
        field: "actions",
        headerName: "Actions",
        minWidth: 200,
        flex: 0.9,
        sortable: false,
        renderCell: (params) => (
          <div className="flex items-center gap-1">
            <Link
              to={`/profile/feature-product?productId=${params.id}`}
              onClick={(e) => e.stopPropagation()}
              title={params.row.isFeatured ? (params.row.featuredUntilFormatted ? `Featured until ${params.row.featuredUntilFormatted}` : "Featured on homepage") : "Feature on homepage (pay per week)"}
            >
              <Button size="small" className={params.row.isFeatured ? "text-amber-500" : ""}>
                {params.row.isFeatured ? <AiFillStar size={18} /> : <AiOutlineStar size={18} />}
              </Button>
            </Link>
            <Button
              size="small"
              onClick={(event) => {
                event.stopPropagation();
                openEditModal(params.id);
              }}
            >
              <AiOutlineEdit size={18} />
            </Button>
            <Button
              size="small"
              onClick={(event) => {
                event.stopPropagation();
                handleDelete(params.id);
              }}
              disabled={deletingId === params.id}
            >
              <AiOutlineDelete size={18} />
            </Button>
          </div>
        ),
      },
    ];
  }, [deletingId, openEditModal, handleDelete]);

  // Memoize row click handler to prevent DataGrid re-renders
  const handleRowClick = useCallback((params) => {
    // Always try to open preview first, fallback to edit modal
    const previewLink = `/product/${params.id}`;
    window.open(previewLink, "_blank");
  }, []);

  if (isLoading) {
    return <Loader />;
  }

  return (
    <>
      <div className="w-full bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-white">
          <h2 className="text-xl font-semibold text-slate-900">My Listings</h2>
          <p className="text-sm text-slate-600 mt-1">
            Manage your product listings, edit details, and track inventory.
          </p>
        </div>
        <div className="p-4">
          <DataGrid
            rows={rows}
            columns={columns}
            pageSize={10}
            rowsPerPageOptions={[5, 10, 20, 50]}
            disableSelectionOnClick
            autoHeight
            sortModel={[]}
            onRowClick={handleRowClick}
            sx={{
              border: "none",
              "& .MuiDataGrid-cell": {
                borderBottom: "1px solid #e2e8f0",
              },
              "& .MuiDataGrid-columnHeaders": {
                backgroundColor: "#1e293b",
                borderBottom: "2px solid #334155",
                fontWeight: 700,
                fontSize: "0.875rem",
                color: "#ffffff",
                "& .MuiDataGrid-columnHeaderTitle": {
                  fontWeight: 700,
                  fontSize: "0.875rem",
                  color: "#ffffff",
                },
              },
              "& .MuiDataGrid-row": {
                cursor: "pointer",
              },
              "& .MuiDataGrid-row:hover": {
                backgroundColor: "#f8fafc",
              },
              "& .MuiDataGrid-cell[data-field='actions'], & .MuiDataGrid-cell[data-field='Preview']": {
                cursor: "pointer",
              },
            }}
          />
        </div>
      </div>

      {isModalOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 px-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              resetModalState();
            }
          }}
        >
          <div 
            className="w-full max-w-4xl bg-white rounded-2xl shadow-xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between z-10">
              <h2 className="text-xl font-semibold text-slate-900">Edit Product</h2>
              <button
                type="button"
                className="p-2 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  resetModalState();
                }}
              >
                <RxCross1 size={22} />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Name *
                  </label>
                  <input
                    type="text"
                    value={formState.name}
                    onChange={(e) => handleFormChange("name", e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm focus:border-[#38513b] focus:outline-none focus:ring-2 focus:ring-[#38513b]/20"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Category *
                  </label>
                  <select
                    value={formState.subcategory ? `${formState.category} > ${formState.subcategory}` : formState.category || ""}
                    onChange={(e) => {
                      const value = e.target.value;
                      // Check if it's a subcategory (contains " > ")
                      if (value.includes(" > ")) {
                        const [mainCat, subCat] = value.split(" > ");
                        handleCategorySelect(mainCat);
                        handleFormChange("subcategory", subCat);
                      } else {
                        // It's a main category
                        handleCategorySelect(value);
                        handleFormChange("subcategory", "");
                      }
                    }}
                    className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm focus:border-[#38513b] focus:outline-none focus:ring-2 focus:ring-[#38513b]/20"
                    required
                  >
                    <option value="" disabled>
                      Select category
                    </option>
                    {availableCategories.map((category) => {
                      const categorySubcategories = category.subcategories || [];
                      return (
                        <React.Fragment key={category.name}>
                          <option value={category.name}>
                            {category.name}
                          </option>
                          {categorySubcategories.length > 0 && categorySubcategories.map((sub) => (
                            <option key={sub.name} value={`${category.name} > ${sub.name}`}>
                              &nbsp;&nbsp;&nbsp;{sub.name}
                            </option>
                          ))}
                        </React.Fragment>
                      );
                    })}
                    {selectedCategoryMissing && (
                      <option value={formState.category}>{formState.category} (legacy)</option>
                    )}
                  </select>
                  {formState.categoryImage && (
                    <div className="flex items-center gap-3 mt-2">
                      <img
                        src={resolveCategoryImageSrc(formState.categoryImage)}
                        alt="Category"
                        className="h-12 w-12 object-contain rounded border"
                      />
                      {formState.categoryLink && (
                        <a
                          href={formState.categoryLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-blue-600 underline"
                        >
                          View category link
                        </a>
                      )}
                    </div>
                  )}
                  {selectedCategoryMissing && (
                    <p className="mt-1 text-xs text-amber-600">
                      This product uses a legacy category. Choose one of the header categories to update it.
                    </p>
                  )}
                  {!availableCategories.length && (
                    <p className="mt-1 text-xs text-red-500">
                      No categories available. Contact the admin to configure header categories.
                    </p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Tags
                </label>
                <input
                  type="text"
                  value={formState.tags}
                  onChange={(e) => handleFormChange("tags", e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm focus:border-[#38513b] focus:outline-none focus:ring-2 focus:ring-[#38513b]/20"
                  placeholder="Optional metadata"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Description *
                </label>
                <div className="border border-slate-300 rounded-lg overflow-hidden">
                  <ReactQuill
                    theme="snow"
                    value={formState.description}
                    onChange={(value) => handleFormChange("description", value)}
                    className="bg-white"
                  />
                </div>
                <p className="text-xs text-slate-500 mt-2">
                  Use the toolbar to format the product description. Content saves as HTML.
                </p>
              </div>

              {pendingImages.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Product Images <span className="text-xs font-normal text-slate-500">(Drag to reorder - first image is featured)</span>
                  </label>
                  <div className="flex flex-wrap gap-3" id="image-container">
                    {pendingImages.map((image, index) => {
                      // Check if it's a new image (preview) or existing
                      const isNewImage = typeof image === 'string' && image.startsWith('blob:');
                      const imageUrl = isNewImage 
                        ? image 
                        : buildProductImageUrl(image);
                      const isFirstImage = index === 0;
                      
                      return (
                        <div
                          key={`${image}-${index}`}
                          draggable
                          onDragStart={handleDragStart(index)}
                          onDragEnd={handleDragEnd}
                          onDragOver={handleDragOver}
                          onDragLeave={handleDragLeave}
                          onDrop={handleImageDrop(index)}
                          className={`relative group cursor-move ${isFirstImage ? 'ring-2 ring-[#38513b] ring-offset-2' : ''}`}
                        >
                          <img
                            src={imageUrl}
                            alt="Product"
                            className="h-20 w-20 object-contain rounded border"
                            onError={(event) => {
                              event.currentTarget.style.display = "none";
                            }}
                          />
                          <button
                            type="button"
                            className="absolute top-1 right-1 bg-black/70 text-white text-xs px-2 py-1 rounded hover:bg-black/90"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteImage(image);
                            }}
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
                  <p className="text-xs text-gray-500 mt-2">
                    Changes will be saved when you click "Save changes". Drag images to reorder them.
                  </p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Add Images
                </label>
                <p className="text-xs text-slate-500 mb-2">Maximum upload size: 1MB per image</p>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => {
                    e.preventDefault();
                    handleAddImages(e);
                  }}
                  disabled={isSaving}
                  className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm focus:border-[#38513b] focus:outline-none focus:ring-2 focus:ring-[#38513b]/20 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-[#38513b] file:text-white hover:file:bg-[#2f4232]"
                />
                <p className="text-xs text-slate-500 mt-2">
                  Upload additional gallery images for this product.
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  Recommended size: 800x800px or 1000x1000px (square images work best)
                </p>
              </div>

              {/* Feature on homepage */}
              {currentProduct && (
                <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-4">
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Feature on homepage
                  </label>
                  {(() => {
                    const until = currentProduct.featuredUntil ? new Date(currentProduct.featuredUntil) : null;
                    const isCurrentlyFeatured = Boolean(currentProduct.isPromoted && until && until > new Date());
                    const untilStr = until && until > new Date() ? until.toLocaleDateString(undefined, { dateStyle: "medium" }) : null;
                    return (
                      <>
                        {isCurrentlyFeatured ? (
                          <>
                            <button
                              type="button"
                              disabled
                              className="mb-2 inline-flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-800 opacity-90 cursor-not-allowed"
                            >
                              <AiFillStar size={18} /> Featured
                            </button>
                            <p className="text-sm text-slate-600">
                              Featured until <strong>{untilStr}</strong>. It will automatically stop showing in Featured Products after that date.
                            </p>
                            <Link
                              to={`/profile/feature-product?productId=${currentProduct._id}`}
                              className="mt-2 inline-block text-sm text-[#38513b] font-medium hover:underline"
                            >
                              View feature details →
                            </Link>
                          </>
                        ) : (
                          <>
                            <Link
                              to={`/profile/feature-product?productId=${currentProduct._id}`}
                              onClick={(e) => e.stopPropagation()}
                              className="inline-flex items-center gap-2 rounded-lg bg-[#38513b] px-4 py-2 text-sm font-medium text-white hover:bg-[#2f4232] transition"
                            >
                              <AiOutlineStar size={18} /> Feature on homepage
                            </Link>
                            <p className="mt-2 text-xs text-slate-500">
                              Pay per week to show this product in the homepage Featured section.
                            </p>
                          </>
                        )}
                      </>
                    );
                  })()}
                </div>
              )}

              <div className="grid gap-4 md:grid-cols-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Old Price
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formState.originalPrice}
                    onChange={(e) => handleFormChange("originalPrice", e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm focus:border-[#38513b] focus:outline-none focus:ring-2 focus:ring-[#38513b]/20"
                    placeholder="Optional"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    New Price *
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formState.discountPrice}
                    onChange={(e) => handleFormChange("discountPrice", e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm focus:border-[#38513b] focus:outline-none focus:ring-2 focus:ring-[#38513b]/20"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Postage Fees *
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formState.postageFees}
                    onChange={(e) => handleFormChange("postageFees", e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm focus:border-[#38513b] focus:outline-none focus:ring-2 focus:ring-[#38513b]/20"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Stock *
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={formState.stock}
                    onChange={(e) => handleFormChange("stock", e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm focus:border-[#38513b] focus:outline-none focus:ring-2 focus:ring-[#38513b]/20"
                    required
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={resetModalState}
                  className="px-6 py-2.5 rounded-lg border border-slate-300 text-slate-700 font-medium hover:bg-slate-50 transition"
                  disabled={isSaving}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-lg bg-[#38513b] text-white font-medium hover:bg-[#2f4232] transition disabled:opacity-50"
                  disabled={isSaving}
                >
                  {isSaving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default AllProducts;

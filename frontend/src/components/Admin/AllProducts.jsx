import { Button } from "@material-ui/core";
import { DataGrid } from "@material-ui/data-grid";
import axios from "axios";
import React, { 
  useCallback, 
  useEffect, 
  useMemo, 
  useState, 
  useRef 
} from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  AiOutlineDelete,
  AiOutlineEdit,
  AiOutlineEye,
  AiFillStar,
} from "react-icons/ai";
import { FiDownload, FiChevronDown } from "react-icons/fi";
import { RxCross1 } from "react-icons/rx";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";
import { server, backend_url } from "../../server";
import Loader from "../Layout/Loader";
import { categoriesData as fallbackCategoriesData } from "../../static/data";
import { fetchSiteOptions } from "../../redux/actions/siteOptions";
import { exportToExcel, exportToPDF, exportToExcelWithRelated, exportToPDFWithRelated } from "../../utils/exportUtils";

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
  shopId: "",
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
  const siteOptionsState = useSelector((state) => state.siteOptions);

  const catalogCategoriesRaw =
    siteOptionsState?.options?.global?.catalog?.categories || [];
  const hasSiteOptions = Boolean(siteOptionsState?.options?.global);
  const isSiteOptionsLoading = Boolean(siteOptionsState?.loading?.global);

  const [products, setProducts] = useState([]);
  const [shops, setShops] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentProduct, setCurrentProduct] = useState(null);
  const [formState, setFormState] = useState(initialFormState);
  const [imageBeingDeleted, setImageBeingDeleted] = useState(null);
  const [exportDropdownOpen, setExportDropdownOpen] = useState(false);
  const [isImageUploading, setIsImageUploading] = useState(false);
  const [pendingImages, setPendingImages] = useState([]); // Local state for images before save
  const [imagesToAdd, setImagesToAdd] = useState([]); // New images to upload on save
  const [imagesToRemove, setImagesToRemove] = useState([]); // Images to delete on save

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

  const selectedCategoryData = useMemo(() => {
    return availableCategories.find((cat) => cat.name === formState.category);
  }, [availableCategories, formState.category]);

  const availableSubcategories = useMemo(() => {
    return selectedCategoryData?.subcategories || [];
  }, [selectedCategoryData]);

  const selectedCategoryMissing =
    formState.category &&
    !availableCategories.some((category) => category.name === formState.category);

  // Use ref to prevent duplicate API calls
  const hasFetchedRef = useRef(false);
  const initialLoadTimeoutRef = useRef(null);
  const loadingCompletedRef = useRef(false);

  const fetchProducts = useCallback(async () => {
    try {
      setIsLoading(true);
      loadingCompletedRef.current = false;
      
      // Add timeout to prevent hanging
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error("Request timeout")), 30000); // 30 second timeout
      });
      
      const requestPromise = axios.get(`${server}/product/admin-all-products`, {
        withCredentials: true,
      });
      
      const { data } = await Promise.race([requestPromise, timeoutPromise]);
      setProducts(data.products || []);
    } catch (error) {
      console.error("Error fetching products:", error);
      if (error.message === "Request timeout") {
        toast.error("Request timed out. Please try again.");
      } else {
        toast.error(
          error?.response?.data?.message ||
            "Failed to load products. Please try again."
        );
      }
      // Set empty array on error so UI can still render
      setProducts([]);
    } finally {
      loadingCompletedRef.current = true;
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!hasFetchedRef.current) {
      hasFetchedRef.current = true;
      
      // Set a maximum wait time - if API takes too long, allow UI to render anyway
      initialLoadTimeoutRef.current = setTimeout(() => {
        if (!loadingCompletedRef.current) {
          console.warn("Initial load taking too long, allowing UI to render");
          setIsLoading(false);
        }
      }, 2000); // After 2 seconds, allow render even if API hasn't completed
      
      // Load products immediately - set loading state before fetch
      setIsLoading(true);
      fetchProducts().catch((error) => {
        console.error("Failed to fetch products:", error);
        setIsLoading(false);
      });
    }
    
    return () => {
      if (initialLoadTimeoutRef.current) {
        clearTimeout(initialLoadTimeoutRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

  useEffect(() => {
    if (!hasSiteOptions && !isSiteOptionsLoading) {
      dispatch(fetchSiteOptions());
    }
  }, [dispatch, hasSiteOptions, isSiteOptionsLoading]);

  // Use ref to prevent duplicate shop fetches
  const hasFetchedShopsRef = useRef(false);
  
  useEffect(() => {
    // Load shops in background after products load - only once
    if (!isLoading && !hasFetchedShopsRef.current) {
      hasFetchedShopsRef.current = true;
      const fetchShops = async () => {
        try {
          // Add timeout to prevent hanging
          const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error("Request timeout")), 30000);
          });
          
          const requestPromise = axios.get(
            `${server}/shop/admin-all-sellers`,
            { withCredentials: true }
          );
          
          const { data } = await Promise.race([requestPromise, timeoutPromise]);
          setShops(data.sellers || []);
        } catch (error) {
          console.error("Error fetching shops:", error);
          // Silently fail for shops - not critical for initial render
          setShops([]);
        }
      };

      fetchShops();
    }
  }, [isLoading]);

  // Memoize rows to prevent unnecessary recalculations on every render
  const rows = useMemo(() => {
    if (!products || !Array.isArray(products)) return [];
    return products.map((item) => {
      const until = item.featuredUntil ? new Date(item.featuredUntil) : null;
      const isFeatured = Boolean(item.isPromoted && until && until > new Date());
      return {
        id: item._id,
        name: item.name || "",
        price:
          typeof item.discountPrice === "number"
            ? `£${item.discountPrice.toFixed(2)}`
            : item.discountPrice || "",
        Stock: item.stock || 0,
        category: item.category || "",
        isPromoted: Boolean(item.isPromoted),
        featuredUntil: item.featuredUntil || null,
        isFeatured,
        featuredUntilFormatted: until ? until.toLocaleDateString(undefined, { dateStyle: "medium" }) : null,
      };
    });
  }, [products]);

  // Memoize handleRowClick so clicking a row opens the admin details modal
  const handleRowClick = useCallback(
    (params) => {
      openEditModal(params.id);
    },
    [openEditModal]
  );

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
        shopId: product.shopId || "",
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

  // Memoize handleSave to prevent unnecessary re-renders
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

      const payload = {
        name: formState.name,
        description: formState.description,
        category: formState.category,
        tags: formState.tags,
        shopId: formState.shopId || undefined,
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
        `${server}/product/admin-product/${currentProduct._id}`,
        payload,
        { withCredentials: true }
      );

      // Handle image deletions
      for (const filename of imagesToRemove) {
        try {
          await axios.delete(
            `${server}/product/admin-product/${currentProduct._id}/image`,
            {
              params: { filename },
              withCredentials: true,
            }
          );
        } catch (error) {
          console.error(`Failed to delete image ${filename}:`, error);
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
            `${server}/product/admin-product/${currentProduct._id}/images`,
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
            `${server}/product/admin-product/${currentProduct._id}`,
            { images: finalImagesOrder },
            { withCredentials: true }
          );
        } catch (error) {
          console.error("Failed to update image order:", error);
          // Don't fail the entire operation if order update fails
        }
      }

      toast.success("Product updated");
      resetModalState();
      // Defer refetch to prevent blocking
      const refetchProducts = () => {
        fetchProducts();
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
  }, [currentProduct, formState, imagesToRemove, imagesToAdd, pendingImages, fetchProducts]);

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

  const handleDelete = useCallback(async (productId) => {
    const confirm = window.confirm(
      "Are you sure you want to delete this product? This action cannot be undone."
    );
    if (!confirm) return;

    try {
      setDeletingId(productId);
      await axios.delete(`${server}/product/admin-product/${productId}`, {
        withCredentials: true,
      });
      toast.success("Product deleted");
      // Defer refetch to prevent blocking
      const refetchProducts = () => {
        fetchProducts();
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
  }, [fetchProducts]);

  const columns = useMemo(() => {
    return [
    {
      field: "name",
      headerName: "Product Name",
      minWidth: 200,
      flex: 1.5,
      renderCell: (params) => {
        const tooltipText = params.row.isPromoted
          ? (params.row.featuredUntilFormatted ? `Featured until ${params.row.featuredUntilFormatted}` : "Featured on homepage")
          : undefined;
        return (
          <div
            className="flex items-center gap-2 w-full min-w-0 h-full"
            style={{ alignItems: "center" }}
            title={tooltipText}
          >
            {params.row.isPromoted && (
              <AiFillStar size={18} className="text-amber-500 shrink-0" />
            )}
            <span>{params.value}</span>
          </div>
        );
      },
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
      minWidth: 115,
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
        minWidth: 160,
        flex: 0.8,
        sortable: false,
        renderCell: (params) => (
          <div className="flex items-center gap-1">
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
  }, [deletingId, openEditModal, handleDelete, fetchProducts]);

  const handleExportExcel = async () => {
    try {
      toast.info("Fetching detailed product data for export...");
      
      const relatedData = [];
      const allReviews = [];
      const allOffers = [];

      // Fetch all offers once (more efficient)
      let allOffersData = [];
      try {
        const offersRes = await axios.get(`${server}/offer/admin/all`, { withCredentials: true }).catch(() => ({ data: { offers: [] } }));
        allOffersData = offersRes.data?.offers || [];
      } catch (error) {
        console.error("Error fetching offers:", error);
      }

      // Fetch detailed data for each product
      for (const product of products || []) {
        const productId = product._id;
        
        try {
          // Fetch product details (includes reviews)
          const productDetailRes = await axios.get(`${server}/product/get-product/${productId}`).catch(() => ({ data: { product: null } }));
          const productDetail = productDetailRes.data?.product;
          
          if (productDetail?.reviews && Array.isArray(productDetail.reviews)) {
            productDetail.reviews.forEach(r => {
              allReviews.push({
                productId: productId,
                productName: product.name || "N/A",
                reviewId: r._id,
                rating: r.rating || 0,
                comment: r.comment || "",
                userName: r.user?.name || "N/A",
                userEmail: r.user?.email || "N/A",
                createdAt: r.createdAt ? new Date(r.createdAt).toLocaleDateString() : "N/A",
              });
            });
          }

          // Filter offers for this product from all offers
          const productOffers = allOffersData.filter(o => 
            o.productId?._id?.toString() === productId.toString() || 
            o.productId?.toString() === productId.toString()
          );
          productOffers.forEach(o => {
            allOffers.push({
              productId: productId,
              productName: product.name || "N/A",
              offerId: o._id,
              buyerName: o.userId?.name || "N/A",
              buyerEmail: o.userId?.email || "N/A",
              originalPrice: o.originalPrice || 0,
              offeredPrice: o.offeredPrice || 0,
              status: o.status || "N/A",
              createdAt: o.createdAt ? new Date(o.createdAt).toLocaleDateString() : "N/A",
            });
          });
        } catch (error) {
          console.error(`Error fetching data for product ${productId}:`, error);
        }
      }

      // Prepare related data sheets
      if (allReviews.length > 0) {
        relatedData.push({
          name: "Product Reviews",
          rows: allReviews,
          columns: [
            { field: "productName", headerName: "Product Name" },
            { field: "userName", headerName: "Reviewer Name" },
            { field: "userEmail", headerName: "Reviewer Email" },
            { field: "rating", headerName: "Rating" },
            { field: "comment", headerName: "Comment" },
            { field: "createdAt", headerName: "Created At" },
          ],
        });
      }

      if (allOffers.length > 0) {
        relatedData.push({
          name: "Product Offers",
          rows: allOffers,
          columns: [
            { field: "productName", headerName: "Product Name" },
            { field: "buyerName", headerName: "Buyer Name" },
            { field: "buyerEmail", headerName: "Buyer Email" },
            { field: "originalPrice", headerName: "Original Price" },
            { field: "offeredPrice", headerName: "Offered Price" },
            { field: "status", headerName: "Status" },
            { field: "createdAt", headerName: "Created At" },
          ],
        });
      }

      exportToExcelWithRelated(
        rows,
        columns,
        relatedData,
        `All_Listings_Complete_${new Date().toISOString().split('T')[0]}`,
        {
          title: "All Listings - Complete Export",
          description: "Complete product data including reviews and offers",
        }
      );
      toast.success("Excel file exported successfully with all product details");
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Failed to export Excel file: " + (error.message || "Unknown error"));
    }
  };

  const handleExportPDF = async () => {
    try {
      toast.info("Fetching detailed product data for export...");
      
      const relatedData = [];
      const allReviews = [];
      const allOffers = [];

      // Fetch all offers once (more efficient)
      let allOffersData = [];
      try {
        const offersRes = await axios.get(`${server}/offer/admin/all`, { withCredentials: true }).catch(() => ({ data: { offers: [] } }));
        allOffersData = offersRes.data?.offers || [];
      } catch (error) {
        console.error("Error fetching offers:", error);
      }

      // Fetch detailed data for each product
      for (const product of products || []) {
        const productId = product._id;
        
        try {
          // Fetch product details (includes reviews)
          const productDetailRes = await axios.get(`${server}/product/get-product/${productId}`).catch(() => ({ data: { product: null } }));
          const productDetail = productDetailRes.data?.product;
          
          if (productDetail?.reviews && Array.isArray(productDetail.reviews)) {
            productDetail.reviews.forEach(r => {
              allReviews.push({
                productId: productId,
                productName: product.name || "N/A",
                reviewId: r._id,
                rating: r.rating || 0,
                comment: r.comment || "",
                userName: r.user?.name || "N/A",
                userEmail: r.user?.email || "N/A",
                createdAt: r.createdAt ? new Date(r.createdAt).toLocaleDateString() : "N/A",
              });
            });
          }

          // Filter offers for this product from all offers
          const productOffers = allOffersData.filter(o => 
            o.productId?._id?.toString() === productId.toString() || 
            o.productId?.toString() === productId.toString()
          );
          productOffers.forEach(o => {
            allOffers.push({
              productId: productId,
              productName: product.name || "N/A",
              offerId: o._id,
              buyerName: o.userId?.name || "N/A",
              buyerEmail: o.userId?.email || "N/A",
              originalPrice: o.originalPrice || 0,
              offeredPrice: o.offeredPrice || 0,
              status: o.status || "N/A",
              createdAt: o.createdAt ? new Date(o.createdAt).toLocaleDateString() : "N/A",
            });
          });
        } catch (error) {
          console.error(`Error fetching data for product ${productId}:`, error);
        }
      }

      // Prepare related data sheets
      if (allReviews.length > 0) {
        relatedData.push({
          name: "Product Reviews",
          rows: allReviews,
          columns: [
            { field: "productName", headerName: "Product Name" },
            { field: "userName", headerName: "Reviewer Name" },
            { field: "userEmail", headerName: "Reviewer Email" },
            { field: "rating", headerName: "Rating" },
            { field: "comment", headerName: "Comment" },
            { field: "createdAt", headerName: "Created At" },
          ],
        });
      }

      if (allOffers.length > 0) {
        relatedData.push({
          name: "Product Offers",
          rows: allOffers,
          columns: [
            { field: "productName", headerName: "Product Name" },
            { field: "buyerName", headerName: "Buyer Name" },
            { field: "buyerEmail", headerName: "Buyer Email" },
            { field: "originalPrice", headerName: "Original Price" },
            { field: "offeredPrice", headerName: "Offered Price" },
            { field: "status", headerName: "Status" },
            { field: "createdAt", headerName: "Created At" },
          ],
        });
      }

      exportToPDFWithRelated(
        rows,
        columns,
        relatedData,
        `All_Listings_Complete_${new Date().toISOString().split('T')[0]}`,
        {
          title: "All Listings - Complete Export",
          description: "Complete product data including reviews and offers",
        }
      );
      toast.success("PDF file exported successfully with all product details");
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Failed to export PDF file: " + (error.message || "Unknown error"));
    }
  };

  // Show loader only for very brief initial load, then show content immediately
  // This prevents the page from appearing frozen
  // Don't block rendering - show content even if data is still loading

  return (
    <>
      <div className="w-full bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-white flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">All Listings</h2>
            <p className="text-sm text-slate-600 mt-1">Manage all product listings</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <button
                onClick={() => setExportDropdownOpen(!exportDropdownOpen)}
                className="px-4 py-2.5 rounded-lg border border-slate-300 text-slate-700 font-medium hover:bg-slate-50 transition flex items-center gap-2"
                title="Export data"
              >
                <FiDownload size={18} />
                <span className="hidden sm:inline">Export</span>
                <FiChevronDown size={16} className={`transition-transform ${exportDropdownOpen ? 'rotate-180' : ''}`} />
              </button>
              {exportDropdownOpen && (
                <>
                  <div 
                    className="fixed inset-0 z-10" 
                    onClick={() => setExportDropdownOpen(false)}
                  />
                  <div className="absolute right-0 mt-2 w-40 bg-white rounded-lg shadow-lg border border-slate-200 z-20 overflow-hidden">
                    <button
                      onClick={() => {
                        setExportDropdownOpen(false);
                        handleExportExcel();
                      }}
                      className="w-full px-4 py-2.5 text-left text-slate-700 hover:bg-slate-50 transition flex items-center gap-2"
                    >
                      <FiDownload size={16} />
                      <span>Excel</span>
                    </button>
                    <button
                      onClick={() => {
                        setExportDropdownOpen(false);
                        handleExportPDF();
                      }}
                      className="w-full px-4 py-2.5 text-left text-slate-700 hover:bg-slate-50 transition flex items-center gap-2 border-t border-slate-200"
                    >
                      <FiDownload size={16} />
                      <span>PDF</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
        <div className="p-4">
        <DataGrid
          rows={rows}
          columns={columns}
          pageSize={10}
          rowsPerPageOptions={[5, 10, 20, 50]}
          disableSelectionOnClick
          autoHeight
          loading={isLoading && products.length === 0}
          sortModel={[{ field: 'name', sort: 'asc' }]}
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
              {currentProduct && (
                <section className="mb-4 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                  <h3 className="mb-3 text-sm font-semibold text-slate-900">
                    Listing details
                  </h3>
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="space-y-1">
                      <p>
                        <span className="font-medium">SKU:</span>{" "}
                        <span className="font-mono">
                          {currentProduct._id?.toString().substring(0, 8) || "—"}
                        </span>
                      </p>
                      <p>
                        <span className="font-medium">Date listed:</span>{" "}
                        <span>
                          {currentProduct.createdAt
                            ? new Date(currentProduct.createdAt).toLocaleString()
                            : "—"}
                        </span>
                      </p>
                      <p>
                        <span className="font-medium">Owner:</span>{" "}
                        <span>
                          {currentProduct.shop?.name ||
                            shops.find((s) => s._id === (currentProduct.shopId || currentProduct.shop?._id))
                              ?.name ||
                            "Unknown seller"}
                        </span>
                        {" · "}
                        {currentProduct.shopId || currentProduct.shop?._id ? (
                          <Link
                            to={`/admin-user/${
                              currentProduct.shopId || currentProduct.shop?._id
                            }`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-blue-600 underline"
                          >
                            View seller profile
                          </Link>
                        ) : null}
                      </p>
                      <p>
                        <span className="font-medium">Shipping cost (postage):</span>{" "}
                        <span>
                          £{Number(currentProduct.postageFees || 0).toFixed(2)}
                        </span>
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p>
                        <span className="font-medium">Category:</span>{" "}
                        <span>{formState.category || currentProduct.category || "—"}</span>
                      </p>
                      <p>
                        <span className="font-medium">Sub category:</span>{" "}
                        <span>{formState.subcategory || "—"}</span>
                      </p>
                      <p>
                        <span className="font-medium">Tags:</span>{" "}
                        <span>{formState.tags || "—"}</span>
                      </p>
                      <p>
                        <span className="font-medium">Featured:</span>{" "}
                        <span>
                          {currentProduct.isPromoted
                            ? currentProduct.featuredUntil
                              ? `Yes (until ${new Date(
                                  currentProduct.featuredUntil
                                ).toLocaleDateString(undefined, {
                                  dateStyle: "medium",
                                })})`
                              : "Yes"
                            : "No"}
                        </span>
                      </p>
                      <p className="mt-1">
                        <span className="font-medium">Links:</span>{" "}
                        <span className="flex flex-col gap-1 mt-1">
                          <a
                            href={`/product/${currentProduct._id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-blue-600 underline"
                          >
                            View product on site
                          </a>
                          {(formState.categoryLink || currentProduct.categoryLink) && (
                            <a
                              href={formState.categoryLink || currentProduct.categoryLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-blue-600 underline"
                            >
                              View category location
                            </a>
                          )}
                        </span>
                      </p>
                    </div>
                  </div>
                </section>
              )}
              {currentProduct?.isPromoted && (
                <div className="rounded-lg border border-amber-200 bg-amber-50/80 p-3 flex items-center gap-2">
                  <AiFillStar size={20} className="text-amber-500 shrink-0" />
                  <div>
                    <span className="text-sm font-medium text-amber-900">Featured on homepage</span>
                    {currentProduct.featuredUntil ? (
                      <span className="text-sm text-amber-800 ml-1">
                        until <strong>{new Date(currentProduct.featuredUntil).toLocaleDateString(undefined, { dateStyle: "medium" })}</strong>
                        {new Date(currentProduct.featuredUntil) <= new Date() && <span className="ml-1 text-amber-700">(expired)</span>}
                      </span>
                    ) : (
                      <span className="text-sm text-amber-800 ml-1">— set via admin</span>
                    )}
                  </div>
                </div>
              )}
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
                      This product currently uses a legacy category. Select one of the header categories to update it.
                    </p>
                  )}
                  {!availableCategories.length && (
                    <p className="mt-1 text-xs text-red-500">
                      No categories available. Update the header categories list first.
                    </p>
                  )}
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
                    Shop
                  </label>
                  <select
                    value={formState.shopId}
                    onChange={(e) => handleFormChange("shopId", e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm focus:border-[#38513b] focus:outline-none focus:ring-2 focus:ring-[#38513b]/20"
                  >
                    <option value="">Keep current shop</option>
                    {shops.map((shop) => (
                      <option key={shop._id} value={shop._id}>
                        {shop.name}
                      </option>
                    ))}
                  </select>
                  {!shops.length && (
                    <p className="mt-1 text-xs text-gray-500">
                      Shop list unavailable. Existing assignment will remain.
                    </p>
                  )}
                </div>
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
                  Use the toolbar to format content. Rich text will be saved as HTML.
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
                            const newImages = [...pendingImages];
                            const [removed] = newImages.splice(draggedIndex, 1);
                            newImages.splice(index, 0, removed);
                            setPendingImages(newImages);
                          }}
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
                  onChange={handleAddImages}
                  disabled={isImageUploading}
                  className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm focus:border-[#38513b] focus:outline-none focus:ring-2 focus:ring-[#38513b]/20 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-[#38513b] file:text-white hover:file:bg-[#2f4232]"
                />
                <p className="text-xs text-slate-500 mt-2">
                  Upload additional gallery images for this product.
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  Recommended size: 800x800px or 1000x1000px (square images work best)
                </p>
              </div>

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

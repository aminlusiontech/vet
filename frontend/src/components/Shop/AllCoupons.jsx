import { Button } from "@material-ui/core";
import { DataGrid } from "@material-ui/data-grid";
import axios from "axios";
import React, { useEffect, useState } from "react";
import { AiOutlineDelete } from "react-icons/ai";
import { RxCross1 } from "react-icons/rx";
import { useDispatch, useSelector } from "react-redux";
import styles from "../../styles/styles";
import Loader from "../Layout/Loader";
import { server } from "../../server";
import { toast } from "react-toastify";

const AllCoupons = () => {
    const [open, setOpen] = useState(false);
    const [name, setName] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [coupouns, setCoupouns] = useState([]);
    const [minAmount, setMinAmout] = useState(null);
    const [maxAmount, setMaxAmount] = useState(null);
    const [selectedProducts, setSelectedProducts] = useState([]);
    const [value, setValue] = useState(null);
    const [discountType, setDiscountType] = useState("percentage");
    const [scope, setScope] = useState("shop");
    const { seller } = useSelector((state) => state.seller);
    const { products } = useSelector((state) => state.products);

    const dispatch = useDispatch();

    useEffect(() => {
        setIsLoading(true);
        axios
            .get(`${server}/coupon/get-coupon/${seller._id}`, {
                withCredentials: true,
            })
            .then((res) => {
                setIsLoading(false);
                setCoupouns(res.data.couponCodes);
            })
            .catch((error) => {
                setIsLoading(false);
            });
    }, [dispatch]);

    const handleDelete = async (id) => {
        axios.delete(`${server}/coupon/delete-coupon/${id}`, { withCredentials: true }).then((res) => {
            toast.success("Coupon code deleted succesfully!")
        })
        window.location.reload();
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Validate value based on discount type
        if (!value || value <= 0) {
            toast.error("Please enter a valid discount value");
            return;
        }

        if (discountType === "percentage" && (value > 100 || value < 0)) {
            toast.error("Percentage must be between 0 and 100");
            return;
        }

        // Validate products if scope is product
        if (scope === "product" && (!selectedProducts || selectedProducts.length === 0)) {
            toast.error("Please select at least one product for product-specific coupon");
            return;
        }

        await axios
            .post(
                `${server}/coupon/create-coupon-code`,
                {
                    name,
                    minAmount,
                    maxAmount,
                    selectedProducts: scope === "product" ? selectedProducts : [],
                    value: Number(value),
                    discountType,
                    scope,
                    shopId: seller._id,
                },
                { withCredentials: true }
            )
            .then((res) => {
                toast.success("Coupon code created successfully!");
                setOpen(false);
                setName("");
                setValue(null);
                setMinAmout(null);
                setMaxAmount(null);
                setSelectedProducts([]);
                setDiscountType("percentage");
                setScope("shop");
                window.location.reload();
            })
            .catch((error) => {
                toast.error(error.response?.data?.message || error.message);
            });
    };

    const columns = [
        {
            field: "name",
            headerName: "Coupon Code",
            minWidth: 200,
            flex: 1.5,
        },
        {
            field: "price",
            headerName: "Discount Value",
            minWidth: 120,
            flex: 0.8,
        },
        {
            field: "scope",
            headerName: "Scope",
            minWidth: 150,
            flex: 0.8,
        },
        {
            field: "Delete",
            flex: 0.8,
            minWidth: 120,
            headerName: "",
            type: "number",
            sortable: false,
            renderCell: (params) => {
                return (
                    <>
                        <Button onClick={() => handleDelete(params.id)}>
                            <AiOutlineDelete size={20} />
                        </Button>
                    </>
                );
            },
        },
    ];

    const row = [];

    coupouns &&
        coupouns.forEach((item) => {
            const discountDisplay = item.discountType === "fixed" 
                ? `$${item.value}` 
                : `${item.value}%`;
            const scopeDisplay = item.scope === "shop" ? "Whole Shop" : "Specific Products";
            row.push({
                id: item._id,
                name: item.name,
                price: discountDisplay,
                scope: scopeDisplay,
                type: item.discountType || "percentage",
                sold: 10,
            });
        });

    return (
        <>
            {isLoading ? (
                <Loader />
            ) : (
                <div className="w-full bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="w-full flex justify-end p-4 border-b border-slate-200">
                        <div
                            className={`${styles.button} !w-max !h-[45px] px-3 !rounded-[5px]`}
                            onClick={() => setOpen(true)}
                        >
                            <span className="text-white">Create Coupon Code</span>
                        </div>
                    </div>
                    <div className="p-4">
                        <DataGrid
                            rows={row}
                            columns={columns}
                            pageSize={10}
                            rowsPerPageOptions={[5, 10, 20, 50]}
                            disableSelectionOnClick
                            autoHeight
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
                                "& .MuiDataGrid-row:hover": {
                                    backgroundColor: "#f8fafc",
                                },
                            }}
                        />
                    </div>
                    {open && (
                        <div className="fixed top-0 left-0 w-full h-screen bg-[#00000062] z-[20000] flex items-center justify-center p-4">
                            <div className="w-[90%] 800px:w-[50%] max-h-[90vh] bg-white rounded-md shadow overflow-hidden flex flex-col">
                                <div className="w-full flex justify-between items-center p-4 border-b border-gray-200">
                                    <h5 className="text-[24px] font-Poppins font-semibold">
                                        Create Coupon Code
                                    </h5>
                                    <RxCross1
                                        size={30}
                                        className="cursor-pointer hover:bg-gray-100 rounded p-1"
                                        onClick={() => {
                                            setOpen(false);
                                            setName("");
                                            setValue(null);
                                            setMinAmout(null);
                                            setMaxAmount(null);
                                            setSelectedProducts([]);
                                            setDiscountType("percentage");
                                            setScope("shop");
                                        }}
                                    />
                                </div>
                                <div className="flex-1 overflow-y-auto p-6">
                                    <form onSubmit={handleSubmit} aria-required={true} className="space-y-5">
                                        <div>
                                            <label className="pb-2 block font-medium text-sm text-gray-700">
                                                Coupon Code Name <span className="text-red-500">*</span>
                                            </label>
                                            <input
                                                type="text"
                                                name="name"
                                                required
                                                value={name}
                                                className="appearance-none block w-full px-3 h-[40px] border border-gray-300 rounded-[3px] placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                                onChange={(e) => setName(e.target.value)}
                                                placeholder="e.g., SUMMER2024"
                                            />
                                        </div>

                                        <div className="grid gap-4 lg:grid-cols-2">
                                            <div>
                                                <label className="pb-2 block font-medium text-sm text-gray-700">
                                                    Discount Type <span className="text-red-500">*</span>
                                                </label>
                                                <select
                                                    className="w-full appearance-none block px-3 h-[40px] border border-gray-300 rounded-[3px] focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                                    value={discountType}
                                                    onChange={(e) => setDiscountType(e.target.value)}
                                                    required
                                                >
                                                    <option value="percentage">Percentage (%)</option>
                                                    <option value="fixed">Fixed Amount ($)</option>
                                                </select>
                                            </div>

                                            <div>
                                                <label className="pb-2 block font-medium text-sm text-gray-700">
                                                    Discount {discountType === "percentage" ? "Percentage" : "Amount"}{" "}
                                                    <span className="text-red-500">*</span>
                                                </label>
                                                <input
                                                    type="number"
                                                    name="value"
                                                    value={value || ""}
                                                    required
                                                    min={discountType === "percentage" ? 0 : 0}
                                                    max={discountType === "percentage" ? 100 : undefined}
                                                    step={discountType === "percentage" ? 0.01 : 0.01}
                                                    className="appearance-none block w-full px-3 h-[40px] border border-gray-300 rounded-[3px] placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                                    onChange={(e) => setValue(e.target.value)}
                                                    placeholder={discountType === "percentage" ? "0-100" : "0.00"}
                                                />
                                                {discountType === "percentage" && (
                                                    <p className="text-xs text-gray-500 mt-1">Enter a value between 0 and 100</p>
                                                )}
                                            </div>
                                        </div>

                                        <div>
                                            <label className="pb-2 block font-medium text-sm text-gray-700">
                                                Apply To <span className="text-red-500">*</span>
                                            </label>
                                            <select
                                                className="w-full appearance-none block px-3 h-[40px] border border-gray-300 rounded-[3px] focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                                value={scope}
                                                onChange={(e) => {
                                                    setScope(e.target.value);
                                                    if (e.target.value === "shop") {
                                                        setSelectedProducts([]);
                                                    }
                                                }}
                                                required
                                            >
                                                <option value="shop">Whole Shop</option>
                                                <option value="product">Specific Products</option>
                                            </select>
                                        </div>

                                        {scope === "product" && (
                                            <div>
                                                <label className="pb-2 block font-medium text-sm text-gray-700">
                                                    Select Products <span className="text-red-500">*</span>
                                                </label>
                                                <div className="max-h-[200px] overflow-y-auto border border-gray-300 rounded-[3px] p-3 bg-gray-50">
                                                    {products && products.length > 0 ? (
                                                        <div className="space-y-2">
                                                            {products.map((product) => (
                                                                <div key={product._id} className="flex items-center">
                                                                    <input
                                                                        type="checkbox"
                                                                        id={`product-${product._id}`}
                                                                        checked={selectedProducts.includes(product._id)}
                                                                        onChange={(e) => {
                                                                            if (e.target.checked) {
                                                                                setSelectedProducts([...selectedProducts, product._id]);
                                                                            } else {
                                                                                setSelectedProducts(selectedProducts.filter(id => id !== product._id));
                                                                            }
                                                                        }}
                                                                        className="mr-2 h-4 w-4 text-[#38513b] focus:ring-[#38513b] border-gray-300 rounded"
                                                                    />
                                                                    <label htmlFor={`product-${product._id}`} className="text-sm text-gray-700 cursor-pointer">
                                                                        {product.name}
                                                                    </label>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <p className="text-sm text-gray-500">No products available</p>
                                                    )}
                                                </div>
                                                {selectedProducts.length > 0 && (
                                                    <p className="text-xs text-gray-500 mt-1">
                                                        {selectedProducts.length} product(s) selected
                                                    </p>
                                                )}
                                            </div>
                                        )}

                                        <div className="grid gap-4 lg:grid-cols-2">
                                            <div>
                                                <label className="pb-2 block font-medium text-sm text-gray-700">
                                                    Minimum Order Amount <span className="text-gray-400">(optional)</span>
                                                </label>
                                                <input
                                                    type="number"
                                                    name="minAmount"
                                                    value={minAmount || ""}
                                                    min="0"
                                                    step="0.01"
                                                    className="appearance-none block w-full px-3 h-[40px] border border-gray-300 rounded-[3px] placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                                    onChange={(e) => setMinAmout(e.target.value)}
                                                    placeholder="0.00"
                                                />
                                            </div>

                                            <div>
                                                <label className="pb-2 block font-medium text-sm text-gray-700">
                                                    Maximum Discount Amount <span className="text-gray-400">(optional)</span>
                                                </label>
                                                <input
                                                    type="number"
                                                    name="maxAmount"
                                                    value={maxAmount || ""}
                                                    min="0"
                                                    step="0.01"
                                                    className="appearance-none block w-full px-3 h-[40px] border border-gray-300 rounded-[3px] placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                                    onChange={(e) => setMaxAmount(e.target.value)}
                                                    placeholder="0.00"
                                                />
                                            </div>
                                        </div>

                                        <div className="pt-4 border-t border-gray-200">
                                            <button
                                                type="submit"
                                                className="cursor-pointer text-center block w-full px-3 h-[45px] border border-gray-300 rounded-[3px] bg-[#38513B] text-white font-semibold hover:opacity-90 transition"
                                            >
                                                Create Coupon Code
                                            </button>
                                        </div>
                                    </form>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </>
    );
};

export default AllCoupons;
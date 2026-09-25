import { useEffect, useMemo, useRef, useState } from "react";
import {
  Search,
  Plus,
  Minus,
  Trash2,
  ShoppingCart,
  User,
  CreditCard,
  Banknote,
  Smartphone,
  CheckCircle,
  X,
  RefreshCw,
  ScanBarcode,
  Camera,
} from "lucide-react";
import { BrowserMultiFormatReader } from "@zxing/browser";
import { supabase } from "../lib/supabase";
import Receipt from "../components/Receipt";

function Sales() {
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);

  const [searchTerm, setSearchTerm] = useState("");
  const [barcodeInput, setBarcodeInput] = useState("");

  const [cart, setCart] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState("");

  const [amountPaid, setAmountPaid] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [transactionReference, setTransactionReference] = useState("");

  const [loading, setLoading] = useState(true);
  const [processingSale, setProcessingSale] = useState(false);
  const [scanningBarcode, setScanningBarcode] = useState(false);

  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [completedSale, setCompletedSale] = useState(null);

  // Camera scanner state
  const [cameraScannerOpen, setCameraScannerOpen] = useState(false);
  const [cameraLoading, setCameraLoading] = useState(false);
  const [cameraError, setCameraError] = useState("");

  const barcodeInputRef = useRef(null);

  const cameraVideoRef = useRef(null);
  const cameraControlsRef = useRef(null);
  const barcodeReaderRef = useRef(null);
  const cameraProcessingRef = useRef(false);

  const formatCurrency = (amount) => {
    return `KSh ${Number(amount || 0).toLocaleString("en-KE", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const loadSalesData = async () => {
    try {
      setLoading(true);
      setErrorMessage("");

      const [productsResult, customersResult] = await Promise.all([
        supabase
          .from("products")
          .select("*")
          .eq("is_active", true)
          .order("name", { ascending: true }),

        supabase
          .from("customers")
          .select("*")
          .eq("is_active", true)
          .order("name", { ascending: true }),
      ]);

      if (productsResult.error) {
        throw productsResult.error;
      }

      if (customersResult.error) {
        throw customersResult.error;
      }

      setProducts(productsResult.data || []);
      setCustomers(customersResult.data || []);
    } catch (error) {
      console.error("Error loading sales data:", error);
      setErrorMessage(error.message || "Failed to load sales data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSalesData();

    setTimeout(() => {
      barcodeInputRef.current?.focus();
    }, 300);
  }, []);

  /*
   * Stop the camera scanner completely.
   */
  const stopCameraScanner = () => {
    try {
      if (cameraControlsRef.current) {
        cameraControlsRef.current.stop();
      }
    } catch (error) {
      console.warn("Camera stop warning:", error);
    }

    cameraControlsRef.current = null;
    barcodeReaderRef.current = null;
    cameraProcessingRef.current = false;

    if (cameraVideoRef.current) {
      cameraVideoRef.current.pause();

      cameraVideoRef.current.srcObject = null;
    }

    setCameraLoading(false);
  };

  /*
   * Close the camera scanner modal.
   */
  const closeCameraScanner = () => {
    stopCameraScanner();
    setCameraError("");
    setCameraScannerOpen(false);

    setTimeout(() => {
      barcodeInputRef.current?.focus();
    }, 100);
  };

  /*
   * Start the camera when the scanner modal opens.
   *
   * We intentionally use camera constraints instead of manually
   * selecting a device ID. This is more reliable across Android,
   * iPhone and different browser implementations.
   */
  useEffect(() => {
    if (!cameraScannerOpen) {
      return;
    }

    let cancelled = false;

    const startCamera = async () => {
      try {
        setCameraLoading(true);
        setCameraError("");
        cameraProcessingRef.current = false;

        if (!cameraVideoRef.current) {
          throw new Error("Camera preview is not ready.");
        }

        /*
         * Give React a moment to mount the video element.
         */
        await new Promise((resolve) => {
          setTimeout(resolve, 150);
        });

        if (cancelled || !cameraVideoRef.current) {
          return;
        }

        const reader = new BrowserMultiFormatReader();

        barcodeReaderRef.current = reader;

        /*
         * IMPORTANT:
         *
         * We do NOT manually choose a camera ID here.
         *
         * The browser is asked to use the environment/back camera
         * when possible.
         *
         * This avoids the "Could not select camera" problem caused
         * by trying to guess camera device names such as "back",
         * "rear" or "environment".
         */
        const constraints = {
          video: {
            facingMode: {
              ideal: "environment",
            },
            width: {
              ideal: 1280,
            },
            height: {
              ideal: 720,
            },
          },
          audio: false,
        };

        const controls = await reader.decodeFromConstraints(
          constraints,
          cameraVideoRef.current,
          (result, error) => {
            if (cancelled) {
              return;
            }

            /*
             * ZXing reports normal "no barcode found yet" states
             * through the callback. We don't show those as errors.
             */
            if (result) {
              const scannedValue = result.getText();

              if (
                scannedValue &&
                scannedValue.trim() &&
                !cameraProcessingRef.current
              ) {
                cameraProcessingRef.current = true;

                /*
                 * Stop the camera immediately so the same barcode
                 * isn't detected multiple times.
                 */
                try {
                  controls.stop();
                } catch (stopError) {
                  console.warn(
                    "Camera stop warning:",
                    stopError
                  );
                }

                cameraControlsRef.current = null;

                setCameraScannerOpen(false);
                setCameraLoading(false);

                /*
                 * Process the barcode using the same function
                 * used by the normal scanner.
                 */
                lookupBarcodeAndAddToCart(scannedValue);
              }
            }

            /*
             * We intentionally don't display ordinary ZXing
             * decode errors here because those simply mean the
             * camera hasn't detected a barcode in that frame yet.
             */
            void error;
          }
        );

        if (cancelled) {
          controls.stop();
          return;
        }

        cameraControlsRef.current = controls;
        setCameraLoading(false);
      } catch (error) {
        console.error("Camera start error:", error);

        if (cancelled) {
          return;
        }

        setCameraLoading(false);

        let message =
          "Unable to start the camera. Please use the barcode input instead.";

        if (
          error?.name === "NotAllowedError" ||
          error?.message?.toLowerCase().includes("permission")
        ) {
          message =
            "Camera permission was denied. Please allow camera access in your browser settings and try again.";
        } else if (
          error?.name === "NotFoundError" ||
          error?.message?.toLowerCase().includes("camera")
        ) {
          message =
            "No camera was found on this device. Please use the barcode input instead.";
        } else if (
          error?.name === "NotReadableError"
        ) {
          message =
            "The camera is currently being used by another application. Close other camera apps and try again.";
        } else if (
          window.location.protocol !== "https:" &&
          window.location.hostname !== "localhost" &&
          window.location.hostname !== "127.0.0.1"
        ) {
          message =
            "Camera access requires a secure HTTPS connection on this device. Please open the live JESTA POS website using HTTPS.";
        }

        setCameraError(message);
      }
    };

    startCamera();

    return () => {
      cancelled = true;

      try {
        if (cameraControlsRef.current) {
          cameraControlsRef.current.stop();
        }
      } catch (error) {
        console.warn("Camera cleanup warning:", error);
      }

      cameraControlsRef.current = null;
      barcodeReaderRef.current = null;
      cameraProcessingRef.current = false;

      if (cameraVideoRef.current) {
        cameraVideoRef.current.pause();
        cameraVideoRef.current.srcObject = null;
      }
    };
  }, [cameraScannerOpen]);

  /*
   * Add a scanned barcode to the cart.
   *
   * This is shared by:
   * - USB barcode scanners
   * - Bluetooth scanners
   * - Manual barcode entry
   * - Phone camera scanning
   */
  const lookupBarcodeAndAddToCart = async (barcodeValue) => {
    const barcode = String(barcodeValue || "").trim();

    if (!barcode) {
      return;
    }

    try {
      setScanningBarcode(true);
      setErrorMessage("");
      setSuccessMessage("");

      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("barcode", barcode)
        .eq("is_active", true)
        .maybeSingle();

      if (error) {
        throw error;
      }

      if (!data) {
        setErrorMessage(
          `No active product found for barcode: ${barcode}`
        );
        return;
      }

      addToCart(data);
      setBarcodeInput("");
    } catch (error) {
      console.error("Barcode lookup error:", error);
      setErrorMessage(
        error.message || "Failed to scan barcode."
      );
    } finally {
      setScanningBarcode(false);

      cameraProcessingRef.current = false;

      setTimeout(() => {
        barcodeInputRef.current?.focus();
      }, 100);
    }
  };

  const filteredProducts = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();

    if (!search) {
      return products;
    }

    return products.filter((product) => {
      const name = String(product.name || "").toLowerCase();
      const sku = String(product.sku || "").toLowerCase();
      const barcode = String(product.barcode || "").toLowerCase();

      return (
        name.includes(search) ||
        sku.includes(search) ||
        barcode.includes(search)
      );
    });
  }, [products, searchTerm]);

  const subtotal = useMemo(() => {
    return cart.reduce(
      (total, item) =>
        total +
        Number(item.selling_price || 0) *
          Number(item.quantity || 0),
      0
    );
  }, [cart]);

  const tax = 0;
  const discount = 0;

  const total = Math.max(subtotal + tax - discount, 0);

  const paid = Number(amountPaid) || 0;

  const change = Math.max(paid - total, 0);

  const balance = Math.max(total - paid, 0);

  const addToCart = (product) => {
    setErrorMessage("");
    setSuccessMessage("");

    const stock = Number(product.stock_quantity || 0);

    if (stock <= 0) {
      setErrorMessage(`${product.name} is out of stock.`);
      return;
    }

    setCart((currentCart) => {
      const existingItem = currentCart.find(
        (item) => item.id === product.id
      );

      if (existingItem) {
        if (existingItem.quantity >= stock) {
          setErrorMessage(
            `Only ${stock} unit${
              stock === 1 ? "" : "s"
            } of ${product.name} available.`
          );

          return currentCart;
        }

        return currentCart.map((item) =>
          item.id === product.id
            ? {
                ...item,
                quantity: item.quantity + 1,
              }
            : item
        );
      }

      return [
        ...currentCart,
        {
          ...product,
          quantity: 1,
        },
      ];
    });
  };

  const handleBarcodeScan = async (event) => {
    event.preventDefault();

    const barcode = barcodeInput.trim();

    if (!barcode) {
      return;
    }

    await lookupBarcodeAndAddToCart(barcode);
  };

  const updateQuantity = (productId, changeAmount) => {
    setCart((currentCart) =>
      currentCart
        .map((item) => {
          if (item.id !== productId) {
            return item;
          }

          const stock = Number(item.stock_quantity || 0);

          const newQuantity =
            item.quantity + changeAmount;

          if (newQuantity <= 0) {
            return null;
          }

          if (newQuantity > stock) {
            setErrorMessage(
              `Only ${stock} unit${
                stock === 1 ? "" : "s"
              } of ${item.name} available.`
            );

            return item;
          }

          return {
            ...item,
            quantity: newQuantity,
          };
        })
        .filter(Boolean)
    );
  };

  const removeFromCart = (productId) => {
    setCart((currentCart) =>
      currentCart.filter(
        (item) => item.id !== productId
      )
    );
  };

  const clearCart = () => {
    setCart([]);
    setAmountPaid("");
    setSelectedCustomer("");
    setTransactionReference("");
    setPaymentMethod("cash");
    setErrorMessage("");
    setSuccessMessage("");

    setTimeout(() => {
      barcodeInputRef.current?.focus();
    }, 100);
  };

  const handleCompleteSale = async () => {
    setErrorMessage("");
    setSuccessMessage("");

    if (cart.length === 0) {
      setErrorMessage(
        "Please add at least one product to the cart."
      );
      return;
    }

    if (total <= 0) {
      setErrorMessage(
        "Sale total must be greater than zero."
      );
      return;
    }

    if (paid < total) {
      setErrorMessage(
        `Insufficient payment. Customer still owes ${formatCurrency(
          total - paid
        )}.`
      );
      return;
    }

    try {
      setProcessingSale(true);

      const {
        data: businessId,
        error: businessError,
      } = await supabase.rpc("get_my_business_id");

      if (businessError) {
        throw businessError;
      }

      if (!businessId) {
        throw new Error(
          "No business is associated with the current user."
        );
      }

      const saleNumber = `SALE-${Date.now()}`;

      const saleItems = cart.map((item) => ({
        product_id: item.id,
        quantity: Number(item.quantity),
      }));

      const customerName =
        customers.find(
          (customer) =>
            String(customer.id) ===
            String(selectedCustomer)
        )?.name || "Walk-in Customer";

      const {
        data: saleResult,
        error: saleError,
      } = await supabase.rpc("complete_sale", {
        p_business_id: businessId,
        p_customer_id: selectedCustomer
          ? Number(selectedCustomer)
          : null,
        p_sale_number: saleNumber,
        p_items: saleItems,
        p_amount_paid: paid,
        p_payment_method: paymentMethod,
        p_transaction_reference:
          transactionReference.trim() || null,
        p_tax_amount: tax,
        p_discount_amount: discount,
        p_notes: null,
      });

      if (saleError) {
        throw saleError;
      }

      const saleId =
        typeof saleResult === "object" &&
        saleResult !== null
          ? saleResult.id ||
            saleResult.sale_id ||
            null
          : saleResult;

      const receiptSale = {
        id: saleId,
        sale_number: saleNumber,
        created_at: new Date().toISOString(),
        customer_name: customerName,
        subtotal,
        tax_amount: tax,
        discount_amount: discount,
        total_amount: total,
        amount_paid: paid,
        change_amount: change,
        balance_amount: balance,
        payment_method: paymentMethod,
        transaction_reference:
          transactionReference.trim() || null,
        items: cart.map((item) => ({
          ...item,
          line_total:
            Number(item.selling_price || 0) *
            Number(item.quantity || 0),
        })),
      };

      setCompletedSale(receiptSale);

      setSuccessMessage(
        `Sale ${saleNumber} completed successfully.`
      );

      setCart([]);
      setAmountPaid("");
      setSelectedCustomer("");
      setTransactionReference("");
      setPaymentMethod("cash");

      await loadSalesData();

      setTimeout(() => {
        barcodeInputRef.current?.focus();
      }, 200);
    } catch (error) {
      console.error(
        "Complete sale error:",
        error
      );

      setErrorMessage(
        error.message ||
          "Failed to complete sale."
      );
    } finally {
      setProcessingSale(false);
    }
  };

  if (loading) {
    return (
      <div className="jesta-sales-page">
        <div className="jesta-loading">
          <RefreshCw
            className="animate-spin"
            size={24}
          />

          <span>
            Loading sales workspace...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="jesta-sales-page">
      {/* CAMERA SCANNER MODAL */}
      {cameraScannerOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal-50 text-teal-700">
                  <Camera size={20} />
                </div>

                <div>
                  <h2 className="font-semibold text-slate-900">
                    Scan Product Barcode
                  </h2>

                  <p className="text-xs text-slate-500">
                    Use your phone camera to scan
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={closeCameraScanner}
                className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
                aria-label="Close camera scanner"
              >
                <X size={20} />
              </button>
            </div>

            <div className="bg-slate-950 p-4">
              <div className="relative overflow-hidden rounded-xl bg-black">
                <video
                  ref={cameraVideoRef}
                  className="aspect-[4/3] w-full object-cover"
                  autoPlay
                  muted
                  playsInline
                />

                {/* Scanner frame */}
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  <div className="relative h-40 w-[78%] max-w-sm">
                    {/* Top-left */}
                    <div className="absolute left-0 top-0 h-8 w-8 border-l-4 border-t-4 border-teal-400" />

                    {/* Top-right */}
                    <div className="absolute right-0 top-0 h-8 w-8 border-r-4 border-t-4 border-teal-400" />

                    {/* Bottom-left */}
                    <div className="absolute bottom-0 left-0 h-8 w-8 border-b-4 border-l-4 border-teal-400" />

                    {/* Bottom-right */}
                    <div className="absolute bottom-0 right-0 h-8 w-8 border-b-4 border-r-4 border-teal-400" />

                    {/* Scan line */}
                    <div className="absolute left-3 right-3 top-1/2 h-0.5 -translate-y-1/2 bg-teal-400 shadow-[0_0_12px_rgba(45,212,191,0.9)]" />
                  </div>
                </div>

                {cameraLoading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-slate-950/70">
                    <div className="text-center text-white">
                      <RefreshCw
                        size={28}
                        className="mx-auto animate-spin text-teal-400"
                      />

                      <p className="mt-3 text-sm font-medium">
                        Starting camera...
                      </p>

                      <p className="mt-1 text-xs text-slate-300">
                        Please allow camera access if prompted.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {cameraError && (
                <div className="mt-4 flex items-start gap-3 rounded-lg border border-red-500/30 bg-red-950/50 p-3 text-sm text-red-200">
                  <X
                    size={18}
                    className="mt-0.5 shrink-0"
                  />

                  <div className="flex-1">
                    {cameraError}
                  </div>
                </div>
              )}

              <div className="mt-4 text-center">
                <p className="text-sm font-medium text-white">
                  Point your camera at a product barcode
                </p>

                <p className="mt-1 text-xs text-slate-400">
                  Keep the barcode inside the frame until it
                  is detected.
                </p>
              </div>
            </div>

            <div className="border-t border-slate-200 bg-white p-4">
              <button
                type="button"
                onClick={closeCameraScanner}
                className="jesta-btn w-full justify-center border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              >
                <X size={18} />
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="jesta-sales-header mb-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="jesta-sales-brand mb-1 text-sm font-semibold uppercase tracking-wider">
              JESTA POS
            </div>

            <h1 className="text-2xl font-bold">
              Sales
            </h1>

            <p className="mt-1 text-sm text-slate-300">
              Create sales, process payments and manage your
              customer transactions.
            </p>
          </div>

          <div className="jesta-sales-cart-count flex items-center gap-2 rounded-lg px-4 py-3">
            <ShoppingCart size={20} />

            <span className="text-sm font-medium">
              {cart.length} item
              {cart.length === 1 ? "" : "s"} in cart
            </span>
          </div>
        </div>
      </div>

      {errorMessage && (
        <div className="mb-4 flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <X
            size={18}
            className="mt-0.5 shrink-0"
          />

          <div className="flex-1">
            {errorMessage}
          </div>

          <button
            type="button"
            onClick={() => setErrorMessage("")}
            className="shrink-0"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {successMessage && (
        <div className="mb-4 flex items-start gap-3 rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-700">
          <CheckCircle
            size={18}
            className="mt-0.5 shrink-0"
          />

          <div className="flex-1">
            {successMessage}
          </div>

          <button
            type="button"
            onClick={() => setSuccessMessage("")}
            className="shrink-0"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {completedSale && (
        <div className="jesta-receipt-section mb-6 rounded-xl p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-slate-900">
                Sale Completed
              </h2>

              <p className="text-sm text-slate-600">
                Receipt is ready for printing.
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                setCompletedSale(null)
              }
              className="rounded-lg p-2 text-slate-500 hover:bg-white"
            >
              <X size={18} />
            </button>
          </div>

          <Receipt sale={completedSale} />
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
        <section className="jesta-sales-section overflow-hidden">
          <div className="border-b border-slate-200 p-5">
            <div className="mb-4 flex items-center gap-3">
              <div className="rounded-lg bg-teal-50 p-2 text-teal-700">
                <ShoppingCart size={20} />
              </div>

              <div>
                <h2 className="font-semibold text-slate-900">
                  Products
                </h2>

                <p className="text-sm text-slate-500">
                  Select products or scan a barcode.
                </p>
              </div>
            </div>

            {/* BARCODE SCANNING */}
            <form
              onSubmit={handleBarcodeScan}
              className="mb-4 flex gap-2"
            >
              <div className="relative flex-1">
                <ScanBarcode
                  size={18}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                  ref={barcodeInputRef}
                  type="text"
                  value={barcodeInput}
                  onChange={(event) =>
                    setBarcodeInput(
                      event.target.value
                    )
                  }
                  placeholder="Scan or enter barcode..."
                  className="jesta-input w-full pl-10"
                />
              </div>

              <button
                type="submit"
                disabled={
                  scanningBarcode ||
                  !barcodeInput.trim()
                }
                className="jesta-btn jesta-sales-primary"
              >
                {scanningBarcode ? (
                  <RefreshCw
                    size={18}
                    className="animate-spin"
                  />
                ) : (
                  <ScanBarcode size={18} />
                )}

                <span className="hidden sm:inline">
                  Scan
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setCameraError("");
                  setCameraScannerOpen(true);
                }}
                disabled={scanningBarcode}
                className="jesta-btn border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                title="Scan using phone camera"
              >
                <Camera size={18} />

                <span className="hidden sm:inline">
                  Camera
                </span>
              </button>
            </form>

            <div className="relative">
              <Search
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                type="text"
                value={searchTerm}
                onChange={(event) =>
                  setSearchTerm(
                    event.target.value
                  )
                }
                placeholder="Search products by name, SKU or barcode..."
                className="jesta-sales-search w-full rounded-lg py-3 pl-10 pr-4 outline-none"
              />
            </div>
          </div>

          <div className="p-5">
            {filteredProducts.length === 0 ? (
              <div className="py-12 text-center">
                <PackageIconFallback />

                <h3 className="mt-3 font-medium text-slate-900">
                  No products found
                </h3>

                <p className="mt-1 text-sm text-slate-500">
                  Try a different search term.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {filteredProducts.map(
                  (product) => {
                    const stock = Number(
                      product.stock_quantity || 0
                    );

                    const lowStock =
                      stock > 0 && stock <= 5;

                    const outOfStock =
                      stock <= 0;

                    return (
                      <div
                        key={product.id}
                        className="jesta-product p-4"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="jesta-product-icon flex h-11 w-11 items-center justify-center rounded-lg">
                            <ShoppingCart size={20} />
                          </div>

                          {outOfStock ? (
                            <span className="jesta-stock-out rounded-full px-2 py-1 text-xs font-semibold">
                              Out of stock
                            </span>
                          ) : lowStock ? (
                            <span className="jesta-stock-low rounded-full px-2 py-1 text-xs font-semibold">
                              Low stock
                            </span>
                          ) : (
                            <span className="jesta-stock-good rounded-full px-2 py-1 text-xs font-semibold">
                              {stock} in stock
                            </span>
                          )}
                        </div>

                        <div className="mt-4">
                          <h3 className="line-clamp-2 min-h-[48px] font-semibold text-slate-900">
                            {product.name}
                          </h3>

                          {product.sku && (
                            <p className="mt-1 text-xs text-slate-500">
                              SKU: {product.sku}
                            </p>
                          )}

                          <div className="mt-3 flex items-center justify-between gap-3">
                            <span className="jesta-product-price text-lg font-bold">
                              {formatCurrency(
                                product.selling_price
                              )}
                            </span>

                            <button
                              type="button"
                              onClick={() =>
                                addToCart(product)
                              }
                              disabled={
                                outOfStock
                              }
                              className="jesta-product-add flex h-9 w-9 items-center justify-center rounded-lg transition disabled:cursor-not-allowed disabled:opacity-40"
                              title="Add to cart"
                            >
                              <Plus size={18} />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  }
                )}
              </div>
            )}
          </div>
        </section>

        <aside className="jesta-cart-panel flex min-h-[600px] flex-col overflow-hidden bg-white">
          <div className="jesta-cart-header p-5 text-white">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-semibold">
                  Current Sale
                </h2>

                <p className="mt-1 text-sm text-slate-300">
                  {cart.length} product
                  {cart.length === 1
                    ? ""
                    : "s"}
                </p>
              </div>

              {cart.length > 0 && (
                <button
                  type="button"
                  onClick={clearCart}
                  className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-slate-200 hover:bg-white/10"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {cart.length === 0 ? (
              <div className="flex min-h-[300px] flex-col items-center justify-center text-center">
                <div className="rounded-full bg-slate-100 p-4 text-slate-400">
                  <ShoppingCart size={30} />
                </div>

                <h3 className="mt-4 font-semibold text-slate-900">
                  Cart is empty
                </h3>

                <p className="mt-1 max-w-xs text-sm text-slate-500">
                  Add products from the product list to
                  start a new sale.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {cart.map((item) => {
                  const lineTotal =
                    Number(
                      item.selling_price || 0
                    ) *
                    Number(item.quantity || 0);

                  return (
                    <div
                      key={item.id}
                      className="jesta-cart-item p-3"
                    >
                      <div className="flex gap-3">
                        <div className="jesta-product-icon flex h-10 w-10 shrink-0 items-center justify-center rounded-lg">
                          <ShoppingCart size={17} />
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <h3 className="line-clamp-2 text-sm font-semibold text-slate-900">
                                {item.name}
                              </h3>

                              <p className="mt-1 text-xs text-slate-500">
                                {formatCurrency(
                                  item.selling_price
                                )}{" "}
                                each
                              </p>
                            </div>

                            <button
                              type="button"
                              onClick={() =>
                                removeFromCart(
                                  item.id
                                )
                              }
                              className="shrink-0 rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600"
                              title="Remove item"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>

                          <div className="mt-3 flex items-center justify-between">
                            <div className="flex items-center rounded-lg border border-slate-200 bg-white">
                              <button
                                type="button"
                                onClick={() =>
                                  updateQuantity(
                                    item.id,
                                    -1
                                  )
                                }
                                className="p-2 text-slate-500 hover:text-slate-900"
                              >
                                <Minus size={14} />
                              </button>

                              <span className="min-w-[32px] text-center text-sm font-semibold">
                                {item.quantity}
                              </span>

                              <button
                                type="button"
                                onClick={() =>
                                  updateQuantity(
                                    item.id,
                                    1
                                  )
                                }
                                className="p-2 text-slate-500 hover:text-slate-900"
                              >
                                <Plus size={14} />
                              </button>
                            </div>

                            <span className="text-sm font-bold text-slate-900">
                              {formatCurrency(
                                lineTotal
                              )}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="border-t border-slate-200 bg-white p-4">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal</span>

                <span className="font-medium">
                  {formatCurrency(subtotal)}
                </span>
              </div>

              <div className="flex justify-between text-slate-600">
                <span>Tax</span>

                <span className="font-medium">
                  {formatCurrency(tax)}
                </span>
              </div>

              <div className="flex justify-between text-slate-600">
                <span>Discount</span>

                <span className="font-medium">
                  {formatCurrency(discount)}
                </span>
              </div>
            </div>

            <div className="jesta-total-box mt-4 rounded-xl p-4 text-white">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-300">
                  Total
                </span>

                <span className="jesta-total-value text-2xl font-bold">
                  {formatCurrency(total)}
                </span>
              </div>
            </div>

            <div className="mt-5">
              <label className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-700">
                <User size={16} />
                Customer
              </label>

              <select
                value={selectedCustomer}
                onChange={(event) =>
                  setSelectedCustomer(
                    event.target.value
                  )
                }
                className="jesta-select w-full"
              >
                <option value="">
                  Walk-in Customer
                </option>

                {customers.map(
                  (customer) => (
                    <option
                      key={customer.id}
                      value={customer.id}
                    >
                      {customer.name}
                      {customer.phone
                        ? ` — ${customer.phone}`
                        : ""}
                    </option>
                  )
                )}
              </select>
            </div>

            <div className="mt-5">
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Payment Method
              </label>

              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setPaymentMethod("cash")
                  }
                  className={`jesta-payment-method flex flex-col items-center gap-1 rounded-lg p-3 text-xs font-medium ${
                    paymentMethod === "cash"
                      ? "active"
                      : ""
                  }`}
                >
                  <Banknote size={19} />
                  Cash
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setPaymentMethod("mpesa")
                  }
                  className={`jesta-payment-method flex flex-col items-center gap-1 rounded-lg p-3 text-xs font-medium ${
                    paymentMethod === "mpesa"
                      ? "active"
                      : ""
                  }`}
                >
                  <Smartphone size={19} />
                  M-Pesa
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setPaymentMethod("card")
                  }
                  className={`jesta-payment-method flex flex-col items-center gap-1 rounded-lg p-3 text-xs font-medium ${
                    paymentMethod === "card"
                      ? "active"
                      : ""
                  }`}
                >
                  <CreditCard size={19} />
                  Card
                </button>
              </div>
            </div>

            <div className="mt-5">
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Transaction Reference
              </label>

              <input
                type="text"
                value={transactionReference}
                onChange={(event) =>
                  setTransactionReference(
                    event.target.value
                  )
                }
                placeholder={
                  paymentMethod === "mpesa"
                    ? "M-Pesa transaction code"
                    : "Optional reference"
                }
                className="jesta-input w-full"
              />
            </div>

            <div className="mt-5">
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Amount Paid
              </label>

              <input
                type="number"
                min="0"
                step="0.01"
                value={amountPaid}
                onChange={(event) =>
                  setAmountPaid(
                    event.target.value
                  )
                }
                placeholder="Enter amount paid"
                className="jesta-input w-full text-lg font-semibold"
              />
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-lg bg-green-50 p-3">
                <p className="text-xs font-medium text-green-700">
                  Change
                </p>

                <p className="mt-1 text-base font-bold text-green-800">
                  {formatCurrency(change)}
                </p>
              </div>

              <div className="rounded-lg bg-amber-50 p-3">
                <p className="text-xs font-medium text-amber-700">
                  Balance
                </p>

                <p className="mt-1 text-base font-bold text-amber-800">
                  {formatCurrency(balance)}
                </p>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-2">
              <button
                type="button"
                onClick={handleCompleteSale}
                disabled={
                  processingSale ||
                  cart.length === 0 ||
                  paid < total
                }
                className="jesta-complete-sale jesta-btn justify-center sm:col-span-1"
              >
                {processingSale ? (
                  <RefreshCw
                    size={18}
                    className="animate-spin"
                  />
                ) : (
                  <CheckCircle size={18} />
                )}

                {processingSale
                  ? "Processing..."
                  : "Complete Sale"}
              </button>

              <button
                type="button"
                onClick={clearCart}
                disabled={
                  processingSale ||
                  cart.length === 0
                }
                className="jesta-btn justify-center border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Trash2 size={18} />
                Clear Cart
              </button>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

function PackageIconFallback() {
  return (
    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-slate-400">
      <ShoppingCart size={26} />
    </div>
  );
}

export default Sales;
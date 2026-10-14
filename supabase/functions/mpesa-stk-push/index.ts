
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const jsonResponse = (
  body: Record<string, unknown>,
  status = 200
) => {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
};

const normalizePhoneNumber = (phoneNumber: string) => {
  const cleaned = String(phoneNumber || "")
    .trim()
    .replace(/\s+/g, "");

  if (cleaned.startsWith("07") && cleaned.length === 10) {
    return `254${cleaned.substring(1)}`;
  }

  if (cleaned.startsWith("01") && cleaned.length === 10) {
    return `254${cleaned.substring(1)}`;
  }

  if (cleaned.startsWith("+254") && cleaned.length === 13) {
    return cleaned.substring(1);
  }

  if (cleaned.startsWith("254") && cleaned.length === 12) {
    return cleaned;
  }

  throw new Error(
    "Invalid Kenyan phone number. Use 07XXXXXXXX, 01XXXXXXXX or 254XXXXXXXXX."
  );
};

const getTimestamp = () => {
  // Daraja expects the timestamp in East Africa Time.
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Nairobi",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date());

  const values = Object.fromEntries(
    parts.map((part) => [part.type, part.value])
  );

  return (
    values.year +
    values.month +
    values.day +
    values.hour +
    values.minute +
    values.second
  );
};

const base64Encode = (value: string) => btoa(value);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse(
      {
        success: false,
        error: "Only POST requests are allowed.",
      },
      405
    );
  }

  try {
    /*
     * 1. READ SERVER SECRETS
     */

    const consumerKey = Deno.env.get("MPESA_CONSUMER_KEY");
    const consumerSecret = Deno.env.get("MPESA_CONSUMER_SECRET");
    const defaultShortCode = Deno.env.get("MPESA_SHORTCODE");
    const defaultPasskey = Deno.env.get("MPESA_PASSKEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get(
      "SUPABASE_SERVICE_ROLE_KEY"
    );

    if (
      !consumerKey ||
      !consumerSecret ||
      !defaultShortCode ||
      !defaultPasskey
    ) {
      throw new Error(
        "M-Pesa configuration is incomplete. Check your Supabase M-Pesa secrets."
      );
    }

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error(
        "Supabase server configuration is incomplete."
      );
    }

    /*
     * 2. CREATE SERVER-SIDE SUPABASE CLIENT
     */

    const supabaseAdmin = createClient(
      supabaseUrl,
      serviceRoleKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    /*
     * 3. AUTHENTICATE THE CALLER
     *
     * JWT verification is disabled in the function
     * configuration, so validate the access token here.
     */

    const authorization = req.headers.get("Authorization");
    const tokenMatch = authorization?.match(/^Bearer\s+(.+)$/i);
    const accessToken = tokenMatch?.[1];

    if (!accessToken) {
      return jsonResponse(
        {
          success: false,
          error: "Authentication required. Please sign in again.",
        },
        401
      );
    }

    const {
      data: { user },
      error: authError,
    } = await supabaseAdmin.auth.getUser(accessToken);

    if (authError || !user) {
      return jsonResponse(
        {
          success: false,
          error:
            "Your session is invalid or expired. Please sign in again.",
        },
        401
      );
    }

    /*
     * 4. READ REQUEST BODY
     */

    const body = await req.json();

    const {
      phoneNumber,
      amount,
      businessId,
      saleNumber,
      customerId,
      items,
      taxAmount = 0,
      discountAmount = 0,
      notes = null,
    } = body;

    /*
     * 5. VALIDATE BASIC INPUT
     */

    if (
      businessId === undefined ||
      businessId === null ||
      businessId === ""
    ) {
      throw new Error("Business ID is required.");
    }

    const numericBusinessId = Number(businessId);

    if (
      !Number.isSafeInteger(numericBusinessId) ||
      numericBusinessId <= 0
    ) {
      throw new Error("Invalid business ID.");
    }

    if (
      typeof saleNumber !== "string" ||
      !saleNumber.trim()
    ) {
      throw new Error("Sale number is required.");
    }

    if (saleNumber.trim().length > 100) {
      throw new Error("Sale number is too long.");
    }

    if (!Array.isArray(items) || items.length === 0) {
      throw new Error(
        "The sale must contain at least one product."
      );
    }

    if (items.length > 200) {
      throw new Error(
        "Too many products in one transaction."
      );
    }

    /*
     * 6. VERIFY ACTIVE USER AND BUSINESS ACCESS
     */

    const {
      data: profile,
      error: profileError,
    } = await supabaseAdmin
      .from("user_profiles")
      .select("id, business_id, is_active, role")
      .eq("id", user.id)
      .eq("business_id", numericBusinessId)
      .eq("is_active", true)
      .maybeSingle();

    if (profileError) {
      console.error("Business profile verification failed.");

      throw new Error(
        "Could not verify your business access. Please try again."
      );
    }

    if (!profile) {
      return jsonResponse(
        {
          success: false,
          error:
            "You are not authorized to initiate payments for this business.",
        },
        403
      );
    }

    /*
     * 7. VERIFY BUSINESS M-PESA SETTINGS
     */

    const {
      data: business,
      error: businessError,
    } = await supabaseAdmin
      .from("businesses")
      .select(
        "id, name, mpesa_enabled, mpesa_merchant_type, mpesa_merchant_number, mpesa_environment"
      )
      .eq("id", numericBusinessId)
      .maybeSingle();

    if (businessError) {
      console.error("Failed to load business M-Pesa settings.");

      throw new Error(
        "Could not load this business's M-Pesa settings."
      );
    }

    if (!business) {
      throw new Error(
        "The business connected to this sale could not be found."
      );
    }

    if (!business.mpesa_enabled) {
      throw new Error(
        "M-Pesa payments are not enabled for this business."
      );
    }

    if (!business.mpesa_merchant_number) {
      throw new Error(
        "This business has not entered an M-Pesa merchant number in Settings."
      );
    }

    const merchantNumber = String(
      business.mpesa_merchant_number
    ).trim();

    const merchantType = String(
      business.mpesa_merchant_type || "paybill"
    ).toLowerCase();

    const environment = String(
      business.mpesa_environment || "sandbox"
    ).toLowerCase();

    if (environment !== "sandbox") {
      throw new Error(
        "Production M-Pesa is not enabled in this function. Keep testing in Sandbox."
      );
    }

    if (!/^\d+$/.test(merchantNumber)) {
      throw new Error(
        "The M-Pesa merchant number must contain numbers only."
      );
    }

    if (
      merchantType !== "paybill" &&
      merchantType !== "till"
    ) {
      throw new Error("Invalid M-Pesa merchant account type.");
    }

    if (merchantType !== "paybill") {
      throw new Error(
        "Till payments will be enabled after the PayBill sandbox flow is confirmed."
      );
    }

    /*
     * 8. VALIDATE TAX AND DISCOUNT
     */

    const numericTax = Number(taxAmount);
    const numericDiscount = Number(discountAmount);

    if (
      !Number.isFinite(numericTax) ||
      numericTax < 0 ||
      !Number.isFinite(numericDiscount) ||
      numericDiscount < 0
    ) {
      throw new Error(
        "Tax and discount must be valid, non-negative amounts."
      );
    }

    /*
     * 9. VALIDATE PRODUCT IDS AND QUANTITIES
     *
     * Never trust the product price or stock values
     * submitted by the browser.
     */

    const requestedItems: {
      product_id: number;
      quantity: number;
    }[] = [];

    for (const item of items) {
      if (!item || typeof item !== "object") {
        throw new Error("Invalid product in the sale.");
      }

      const productId = Number(item.product_id);
      const quantity = Number(item.quantity);

      if (
        !Number.isSafeInteger(productId) ||
        productId <= 0
      ) {
        throw new Error("A product has an invalid ID.");
      }

      if (
        !Number.isFinite(quantity) ||
        quantity <= 0 ||
        !Number.isSafeInteger(quantity * 100)
      ) {
        throw new Error(
          "Product quantities must be positive and use no more than two decimal places."
        );
      }

      requestedItems.push({
        product_id: productId,
        quantity,
      });
    }

    /*
     * 10. LOAD AUTHORITATIVE PRODUCT DATA
     */

    const productIds = [
      ...new Set(
        requestedItems.map((item) => item.product_id)
      ),
    ];

    const {
      data: products,
      error: productsError,
    } = await supabaseAdmin
      .from("products")
      .select(
        "id, business_id, name, selling_price, stock_quantity, is_active"
      )
      .eq("business_id", numericBusinessId)
      .in("id", productIds);

    if (productsError) {
      console.error("Product validation query failed.");

      throw new Error(
        "Could not verify sale products. Please try again."
      );
    }

    const productMap = new Map(
      (products || []).map((product) => [
        Number(product.id),
        product,
      ])
    );

    /*
     * 11. VALIDATE BUSINESS, ACTIVE STATUS, STOCK,
     *     AND CALCULATE THE AUTHORITATIVE SUBTOTAL.
     *
     * Aggregate repeated product IDs before checking
     * stock, so duplicate cart lines cannot bypass
     * the quantity check.
     */

    const aggregatedQuantities = new Map<number, number>();

    for (const item of requestedItems) {
      const previous =
        aggregatedQuantities.get(item.product_id) || 0;

      aggregatedQuantities.set(
        item.product_id,
        previous + item.quantity
      );
    }

    let subtotal = 0;

    for (const [productId, quantity] of aggregatedQuantities) {
      const product = productMap.get(productId);

      if (!product || Number(product.business_id) !== numericBusinessId) {
        throw new Error(
          `Product ${productId} does not belong to this business.`
        );
      }

      if (!product.is_active) {
        throw new Error(
          `${product.name} is inactive and cannot be sold.`
        );
      }

      const sellingPrice = Number(product.selling_price);
      const stockQuantity = Number(product.stock_quantity);

      if (
        !Number.isFinite(sellingPrice) ||
        sellingPrice < 0 ||
        !Number.isFinite(stockQuantity)
      ) {
        throw new Error(
          `Invalid price or stock data for ${product.name}.`
        );
      }

      if (stockQuantity < quantity) {
        throw new Error(
          `Insufficient stock for ${product.name}. Available: ${stockQuantity}; requested: ${quantity}.`
        );
      }

      subtotal += sellingPrice * quantity;
    }

    /*
     * 12. CALCULATE AND VERIFY THE PAYMENT AMOUNT
     *
     * Daraja STK Push accepts whole shillings.
     * Save the same integer amount that we request.
     */

    const calculatedTotal =
      subtotal + numericTax - numericDiscount;

    if (
      !Number.isFinite(calculatedTotal) ||
      calculatedTotal <= 0
    ) {
      throw new Error(
        "The calculated sale total must be greater than zero."
      );
    }

    const paymentAmount = Math.round(calculatedTotal);
    const requestedAmount = Number(amount);

    if (
      !Number.isFinite(requestedAmount) ||
      requestedAmount <= 0
    ) {
      throw new Error(
        "Payment amount must be greater than zero."
      );
    }

    if (Math.round(requestedAmount) !== paymentAmount) {
      throw new Error(
        "The payment amount does not match the current product prices. Refresh the sale and try again."
      );
    }

    /*
     * 13. VERIFY CUSTOMER OWNERSHIP
     */

    let numericCustomerId: number | null = null;

    if (
      customerId !== null &&
      customerId !== undefined &&
      customerId !== ""
    ) {
      numericCustomerId = Number(customerId);

      if (
        !Number.isSafeInteger(numericCustomerId) ||
        numericCustomerId <= 0
      ) {
        throw new Error("Invalid customer ID.");
      }

      const {
        data: customer,
        error: customerError,
      } = await supabaseAdmin
        .from("customers")
        .select("id")
        .eq("id", numericCustomerId)
        .eq("business_id", numericBusinessId)
        .eq("is_active", true)
        .maybeSingle();

      if (customerError) {
        console.error("Customer validation query failed.");

        throw new Error(
          "Could not verify the selected customer."
        );
      }

      if (!customer) {
        throw new Error(
          "The selected customer is inactive or does not belong to this business."
        );
      }
    }

    /*
     * 14. NORMALIZE PHONE NUMBER
     */

    const normalizedPhone =
      normalizePhoneNumber(phoneNumber);

    const shortCode = merchantNumber;

    /*
     * 15. GENERATE DARAJA TIMESTAMP AND PASSWORD
     */

    const timestamp = getTimestamp();

    const password = base64Encode(
      `${shortCode}${defaultPasskey}${timestamp}`
    );

    /*
     * 16. GET SANDBOX OAUTH ACCESS TOKEN
     */

    const basicAuth = base64Encode(
      `${consumerKey}:${consumerSecret}`
    );

    const tokenResponse = await fetch(
      "https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials",
      {
        method: "GET",
        headers: {
          Authorization: `Basic ${basicAuth}`,
        },
      }
    );

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok || !tokenData.access_token) {
      console.error("Daraja OAuth request failed.");

      throw new Error(
        tokenData.errorMessage ||
          tokenData.error_description ||
          "Failed to obtain M-Pesa access token."
      );
    }

    const darajaAccessToken = tokenData.access_token;

    /*
     * 17. PREPARE STK PUSH
     */

    const stkPayload = {
      BusinessShortCode: Number(shortCode),
      Password: password,
      Timestamp: timestamp,
      TransactionType: "CustomerPayBillOnline",
      Amount: paymentAmount,
      PartyA: normalizedPhone,
      PartyB: Number(shortCode),
      PhoneNumber: normalizedPhone,
      CallBackURL:
        "https://ejconenpabtyfloyjubi.supabase.co/functions/v1/mpesa-callback",
      AccountReference: saleNumber,
      TransactionDesc: "JESTA POS Payment",
    };

    console.log("Sending M-Pesa STK Push:", {
      businessId: numericBusinessId,
      userId: user.id,
      merchantType,
      amount: paymentAmount,
      saleNumber,
    });

    /*
     * 18. SEND STK PUSH
     */

    const stkResponse = await fetch(
      "https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${darajaAccessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(stkPayload),
      }
    );

    const stkData = await stkResponse.json();

    if (
      !stkResponse.ok ||
      String(stkData.ResponseCode) !== "0"
    ) {
      console.error("Daraja rejected the STK Push request.");

      throw new Error(
        stkData.errorMessage ||
          stkData.ResponseDescription ||
          "M-Pesa STK Push was rejected."
      );
    }

    const checkoutRequestId = stkData.CheckoutRequestID;
    const merchantRequestId = stkData.MerchantRequestID;

    if (!checkoutRequestId) {
      throw new Error(
        "M-Pesa did not return a CheckoutRequestID."
      );
    }

    /*
     * 19. SAVE PENDING TRANSACTION
     *
     * Keep the existing database fields and response
     * shape expected by Sales.jsx.
     */

    const {
      data: transaction,
      error: transactionError,
    } = await supabaseAdmin
      .from("mpesa_transactions")
      .insert({
        business_id: numericBusinessId,
        sale_number: saleNumber.trim(),
        customer_id: numericCustomerId,
        items: requestedItems,
        amount: paymentAmount,
        phone_number: normalizedPhone,
        merchant_request_id: merchantRequestId || null,
        checkout_request_id: checkoutRequestId,
        tax_amount: numericTax,
        discount_amount: numericDiscount,
        notes:
          typeof notes === "string" ? notes : null,
        result_code: null,
        result_description:
          stkData.ResponseDescription || "STK Push accepted.",
        status: "PENDING",
      })
      .select("*")
      .single();

    if (transactionError) {
      console.error(
        "Failed to save pending M-Pesa transaction.",
        transactionError.code || "Unknown database error"
      );

      throw new Error(
        "M-Pesa accepted the request, but JESTA could not save the pending transaction. Do not send another prompt until this transaction has been checked."
      );
    }

    console.log("Pending M-Pesa transaction saved:", {
      id: transaction.id,
      checkoutRequestId,
      businessId: numericBusinessId,
    });

    /*
     * 20. RETURN THE EXISTING FRONTEND RESPONSE SHAPE
     */

    return jsonResponse({
      success: true,
      data: stkData,
      transaction: {
        id: transaction.id,
        checkoutRequestId,
        merchantRequestId,
        saleNumber: saleNumber.trim(),
        amount: paymentAmount,
        phoneNumber: normalizedPhone,
        status: "PENDING",
      },
    });
  } catch (error) {
    console.error(
      "M-Pesa STK Push error:",
      error instanceof Error
        ? error.message
        : "Unknown error"
    );

    return jsonResponse(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to initiate M-Pesa payment.",
      },
      400
    );
  }
});

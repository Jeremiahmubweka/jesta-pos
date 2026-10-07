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
  const now = new Date();

  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  const seconds = String(now.getSeconds()).padStart(2, "0");

  return `${year}${month}${day}${hours}${minutes}${seconds}`;
};

const base64Encode = (value: string) => {
  return btoa(value);
};

Deno.serve(async (req) => {
  /*
   * Handle browser CORS preflight requests.
   */
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders,
    });
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
     * ---------------------------------------------------------
     * READ SUPABASE SECRETS
     * ---------------------------------------------------------
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
        "M-Pesa configuration is incomplete. Please check the Supabase M-Pesa secrets."
      );
    }

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error(
        "Supabase server configuration is incomplete."
      );
    }

    /*
     * ---------------------------------------------------------
     * CREATE SERVER-SIDE SUPABASE CLIENT
     * ---------------------------------------------------------
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
     * ---------------------------------------------------------
     * READ REQUEST BODY
     * ---------------------------------------------------------
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
     * ---------------------------------------------------------
     * VALIDATE BASIC SALE INFORMATION
     * ---------------------------------------------------------
     */

    if (!businessId) {
      throw new Error("Business ID is required.");
    }

    if (!saleNumber) {
      throw new Error("Sale number is required.");
    }

    if (!Array.isArray(items) || items.length === 0) {
      throw new Error(
        "The sale must contain at least one product."
      );
    }

    const numericBusinessId = Number(businessId);

    if (
      !Number.isInteger(numericBusinessId) ||
      numericBusinessId <= 0
    ) {
      throw new Error("Invalid business ID.");
    }

    /*
     * ---------------------------------------------------------
     * GET THIS BUSINESS'S M-PESA SETTINGS
     * ---------------------------------------------------------
     *
     * The merchant number is now taken from the business
     * that is making this sale.
     *
     * This means different JESTA businesses can have
     * different M-Pesa merchant numbers.
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
      console.error(
        "Failed to load business M-Pesa settings:",
        businessError
      );

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

    /*
     * ---------------------------------------------------------
     * CURRENT DARaja CONFIGURATION
     * ---------------------------------------------------------
     *
     * For now we continue using the working sandbox Daraja
     * credentials stored in Supabase secrets.
     *
     * The business-specific merchant number controls the
     * destination of the payment.
     */

    const merchantNumber = String(
      business.mpesa_merchant_number
    ).trim();

    const merchantType =
      String(
        business.mpesa_merchant_type || "paybill"
      ).toLowerCase();

    const environment =
      String(
        business.mpesa_environment || "sandbox"
      ).toLowerCase();

    if (environment !== "sandbox") {
      throw new Error(
        "Production M-Pesa has not been enabled yet. Please keep this business on Sandbox while we complete testing."
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
      throw new Error(
        "Invalid M-Pesa merchant account type."
      );
    }

    /*
     * IMPORTANT:
     *
     * The current working sandbox integration uses
     * CustomerPayBillOnline.
     *
     * We are deliberately NOT changing the Daraja
     * transaction type to Till yet. We will handle
     * PayBill/Till production configuration separately
     * after confirming the exact Daraja setup for each
     * business.
     */

    if (merchantType !== "paybill") {
      throw new Error(
        "Till payments will be enabled after the PayBill sandbox flow is confirmed."
      );
    }

    /*
     * ---------------------------------------------------------
     * VALIDATE AMOUNT
     * ---------------------------------------------------------
     */

    const numericAmount = Number(amount);

    if (
      !Number.isFinite(numericAmount) ||
      numericAmount <= 0
    ) {
      throw new Error(
        "Payment amount must be greater than zero."
      );
    }

    /*
     * ---------------------------------------------------------
     * NORMALIZE PHONE NUMBER
     * ---------------------------------------------------------
     */

    const normalizedPhone =
      normalizePhoneNumber(phoneNumber);

    /*
     * ---------------------------------------------------------
     * USE BUSINESS MERCHANT NUMBER
     * ---------------------------------------------------------
     */

    const shortCode = merchantNumber;

    /*
     * ---------------------------------------------------------
     * CREATE DARAJA TIMESTAMP
     * ---------------------------------------------------------
     */

    const timestamp = getTimestamp();

    /*
     * ---------------------------------------------------------
     * GENERATE DARAJA PASSWORD
     * ---------------------------------------------------------
     *
     * Password =
     *
     * Business Shortcode + Passkey + Timestamp
     *
     * encoded using Base64.
     *
     * IMPORTANT:
     *
     * The passkey is still kept securely in Supabase.
     * It is never stored in the React frontend.
     */

    const password = base64Encode(
      `${shortCode}${defaultPasskey}${timestamp}`
    );

    /*
     * ---------------------------------------------------------
     * GET OAUTH ACCESS TOKEN
     * ---------------------------------------------------------
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
      console.error(
        "Daraja OAuth error:",
        tokenData
      );

      throw new Error(
        tokenData.errorMessage ||
          tokenData.error_description ||
          "Failed to obtain M-Pesa access token."
      );
    }

    const accessToken = tokenData.access_token;

    /*
     * ---------------------------------------------------------
     * SEND STK PUSH
     * ---------------------------------------------------------
     */

    const stkPayload = {
      BusinessShortCode: Number(shortCode),
      Password: password,
      Timestamp: timestamp,
      TransactionType:
        "CustomerPayBillOnline",
      Amount: Math.round(numericAmount),
      PartyA: normalizedPhone,
      PartyB: Number(shortCode),
      PhoneNumber: normalizedPhone,
      CallBackURL:
        "https://ejconenpabtyfloyjubi.supabase.co/functions/v1/mpesa-callback",
      AccountReference: saleNumber,
      TransactionDesc:
        "JESTA POS Payment",
    };

    console.log(
      "Sending M-Pesa STK Push:",
      {
        businessId: numericBusinessId,
        businessName: business.name,
        merchantType,
        merchantNumber: shortCode,
        ...stkPayload,
        Password: "[REDACTED]",
      }
    );

    const stkResponse = await fetch(
      "https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(stkPayload),
      }
    );

    const stkData = await stkResponse.json();

    console.log(
      "Daraja STK response:",
      stkData
    );

    /*
     * ---------------------------------------------------------
     * CHECK DARAJA RESPONSE
     * ---------------------------------------------------------
     */

    if (
      !stkResponse.ok ||
      stkData.ResponseCode !== "0"
    ) {
      throw new Error(
        stkData.errorMessage ||
          stkData.ResponseDescription ||
          "M-Pesa STK Push was rejected."
      );
    }

    const checkoutRequestId =
      stkData.CheckoutRequestID;

    const merchantRequestId =
      stkData.MerchantRequestID;

    if (!checkoutRequestId) {
      throw new Error(
        "M-Pesa did not return a CheckoutRequestID."
      );
    }

    /*
     * ---------------------------------------------------------
     * SAVE PENDING M-PESA TRANSACTION
     * ---------------------------------------------------------
     */

    const {
      data: transaction,
      error: transactionError,
    } = await supabaseAdmin
      .from("mpesa_transactions")
      .insert({
        business_id: numericBusinessId,
        sale_number: String(saleNumber),
        customer_id:
          customerId === null ||
          customerId === undefined ||
          customerId === ""
            ? null
            : Number(customerId),
        items,
        amount: numericAmount,
        phone_number: normalizedPhone,
        merchant_request_id:
          merchantRequestId || null,
        checkout_request_id:
          checkoutRequestId,
        tax_amount: Number(taxAmount) || 0,
        discount_amount:
          Number(discountAmount) || 0,
        notes,
        result_code: null,
        result_description:
          stkData.ResponseDescription ||
          "STK Push accepted.",
        status: "PENDING",
      })
      .select("*")
      .single();

    if (transactionError) {
      console.error(
        "Failed to save pending M-Pesa transaction:",
        transactionError
      );

      throw new Error(
        "M-Pesa request was accepted, but JESTA could not save the pending transaction."
      );
    }

    console.log(
      "Pending M-Pesa transaction saved:",
      {
        id: transaction.id,
        checkoutRequestId,
        saleNumber,
        businessId: numericBusinessId,
        merchantNumber: shortCode,
      }
    );

    /*
     * ---------------------------------------------------------
     * RETURN SUCCESS TO JESTA FRONTEND
     * ---------------------------------------------------------
     */

    return jsonResponse({
      success: true,
      data: stkData,
      transaction: {
        id: transaction.id,
        checkoutRequestId,
        merchantRequestId,
        saleNumber,
        amount: numericAmount,
        phoneNumber: normalizedPhone,
        status: "PENDING",
      },
    });
  } catch (error) {
    console.error(
      "M-Pesa STK Push error:",
      error
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
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
    const shortCode = Deno.env.get("MPESA_SHORTCODE");
    const passkey = Deno.env.get("MPESA_PASSKEY");

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get(
      "SUPABASE_SERVICE_ROLE_KEY"
    );

    if (
      !consumerKey ||
      !consumerSecret ||
      !shortCode ||
      !passkey
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
     *
     * The service-role client is used only inside this
     * Edge Function. It allows the function to save the
     * pending M-Pesa transaction securely.
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
      throw new Error(
        "Business ID is required."
      );
    }

    if (!saleNumber) {
      throw new Error(
        "Sale number is required."
      );
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
      throw new Error(
        "Invalid business ID."
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
     * Shortcode + Passkey + Timestamp
     *
     * encoded using Base64.
     */

    const password = base64Encode(
      `${shortCode}${passkey}${timestamp}`
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
     *
     * IMPORTANT:
     *
     * We save the complete cart here.
     *
     * When Safaricom later calls mpesa-callback,
     * the callback will use CheckoutRequestID to find
     * this record.
     *
     * Only after successful payment will the callback
     * complete the actual JESTA sale.
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

      /*
       * The customer has already received an STK request,
       * so we make this failure very clear in the logs.
       */
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
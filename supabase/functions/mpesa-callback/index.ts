
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
) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });

const parseTransactionDate = (value: unknown): string | null => {
  const input = String(value ?? "").trim();

  if (!/^\d{14}$/.test(input)) return null;

  const year = Number(input.slice(0, 4));
  const month = Number(input.slice(4, 6));
  const day = Number(input.slice(6, 8));
  const hour = Number(input.slice(8, 10));
  const minute = Number(input.slice(10, 12));
  const second = Number(input.slice(12, 14));

  const date = new Date(
    `${input.slice(0, 4)}-${input.slice(4, 6)}-${input.slice(6, 8)}T${input.slice(8, 10)}:${input.slice(10, 12)}:${input.slice(12, 14)}+03:00`
  );

  if (
    !Number.isFinite(date.getTime()) ||
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() + 1 !== month ||
    date.getUTCDate() !== day ||
    hour > 23 ||
    minute > 59 ||
    second > 59
  ) {
    return null;
  }

  return date.toISOString();
};

const getCallbackItem = (
  items: unknown,
  name: string
): unknown => {
  if (!Array.isArray(items)) return null;

  const item = items.find(
    (entry: unknown) =>
      typeof entry === "object" &&
      entry !== null &&
      (entry as Record<string, unknown>).Name === name
  );

  return item && typeof item === "object"
    ? (item as Record<string, unknown>).Value ?? null
    : null;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse(
      { success: false, error: "Only POST requests are allowed." },
      405
    );
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      console.error("Supabase server configuration is missing.");

      return jsonResponse(
        { success: false, error: "Server configuration error." },
        500
      );
    }

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

    const callbackBody = await req.json();
    const stkCallback = callbackBody?.Body?.stkCallback;

    if (!stkCallback || typeof stkCallback !== "object") {
      return jsonResponse(
        { success: false, error: "Invalid M-Pesa callback payload." },
        400
      );
    }

    const checkoutRequestId = String(
      stkCallback.CheckoutRequestID ?? ""
    ).trim();

    const merchantRequestId = String(
      stkCallback.MerchantRequestID ?? ""
    ).trim();

    const resultCode = stkCallback.ResultCode;
    const resultDescription = String(
      stkCallback.ResultDesc ?? "No result description provided."
    );

    if (
      !checkoutRequestId ||
      !Number.isInteger(resultCode) ||
      typeof resultCode !== "number"
    ) {
      return jsonResponse(
        {
          success: false,
          error: "Invalid checkout ID or result code.",
        },
        400
      );
    }

    // Find the exact checkout. Do not fall back to a different
    // transaction using only the merchant request ID.
    const { data: transaction, error: lookupError } =
      await supabaseAdmin
        .from("mpesa_transactions")
        .select("*")
        .eq("checkout_request_id", checkoutRequestId)
        .maybeSingle();

    if (lookupError) {
      console.error("M-Pesa transaction lookup failed:", lookupError.message);

      return jsonResponse(
        { success: false, error: "Could not look up the transaction." },
        500
      );
    }

    if (!transaction) {
      // A callback can arrive before the STK function has saved the
      // checkout ID. Acknowledge receipt without creating a sale.
      console.error("No matching transaction for checkout:", checkoutRequestId);

      return jsonResponse({
        success: false,
        error: "Transaction not found. Reconciliation is required.",
        checkoutRequestId,
      });
    }

    // Fast path for a callback already processed successfully.
    // The database RPC below independently enforces this under a lock.
    if (transaction.status === "SUCCESS" && transaction.sale_id) {
      return jsonResponse({
        success: true,
        status: "SUCCESS",
        message: "Transaction already processed.",
        transactionId: transaction.id,
        saleId: transaction.sale_id,
        checkoutRequestId,
      });
    }

    // A non-zero Daraja result means the STK request failed or was
    // cancelled. Never let a later failure callback overwrite SUCCESS.
    if (resultCode !== 0) {
      const { error: updateError } = await supabaseAdmin
        .from("mpesa_transactions")
        .update({
          merchant_request_id:
            merchantRequestId || transaction.merchant_request_id,
          result_code: resultCode,
          result_description: resultDescription,
          status: "FAILED",
          updated_at: new Date().toISOString(),
        })
        .eq("id", transaction.id)
        .neq("status", "SUCCESS");

      if (updateError) {
        console.error("Failed to record failed payment:", updateError.message);

        return jsonResponse(
          { success: false, error: "Could not record payment failure." },
          500
        );
      }

      return jsonResponse({
        success: true,
        status: "FAILED",
        transactionId: transaction.id,
        checkoutRequestId,
        resultCode,
        resultDescription,
      });
    }

    // Successful callbacks must contain the actual payment amount and
    // receipt. Never substitute transaction.amount for missing metadata.
    const metadata = stkCallback.CallbackMetadata?.Item;

    const amountValue = getCallbackItem(metadata, "Amount");
    const receiptValue = getCallbackItem(metadata, "MpesaReceiptNumber");
    const phoneValue = getCallbackItem(metadata, "PhoneNumber");
    const dateValue = getCallbackItem(metadata, "TransactionDate");

    const paidAmount =
      typeof amountValue === "number" ||
      typeof amountValue === "string"
        ? Number(amountValue)
        : NaN;

    const receipt =
      typeof receiptValue === "string"
        ? receiptValue.trim()
        : "";

    const phoneNumber =
      typeof phoneValue === "number" ||
      typeof phoneValue === "string"
        ? String(phoneValue)
        : null;

    const transactionDate = parseTransactionDate(dateValue);

    if (
      !Number.isFinite(paidAmount) ||
      paidAmount <= 0 ||
      !receipt
    ) {
      // Do not create a sale or mark the payment successful.
      // Verify this transaction separately with Daraja before resolving it.
      console.error(
        "Successful callback missing valid amount or receipt:",
        {
          transactionId: transaction.id,
          checkoutRequestId,
          hasAmount: Number.isFinite(paidAmount),
          hasReceipt: Boolean(receipt),
        }
      );

      return jsonResponse({
        success: false,
        status: "PROCESSING_ERROR",
        error: "Required payment metadata is missing. Verification is required.",
        transactionId: transaction.id,
      });
    }

    if (
      !Number.isSafeInteger(paidAmount) ||
      paidAmount !== Number(transaction.amount)
    ) {
      console.error("M-Pesa payment amount mismatch:", {
        transactionId: transaction.id,
        checkoutRequestId,
        expectedAmount: transaction.amount,
        receivedAmount: paidAmount,
      });

      const { error: updateError } = await supabaseAdmin
        .from("mpesa_transactions")
        .update({
          result_code: resultCode,
          result_description: "Payment amount mismatch; verification required.",
          status: "PROCESSING_ERROR",
          mpesa_receipt_number: receipt,
          phone_number: phoneNumber ?? transaction.phone_number,
          transaction_date: transactionDate,
          updated_at: new Date().toISOString(),
        })
        .eq("id", transaction.id)
        .neq("status", "SUCCESS");

      if (updateError) {
        console.error("Failed to record amount mismatch:", updateError.message);
      }

      return jsonResponse({
        success: false,
        status: "PROCESSING_ERROR",
        error: "Payment amount mismatch. Verification is required.",
        transactionId: transaction.id,
      });
    }

    // This RPC locks the transaction, validates its state and amount,
    // creates the sale, and updates the M-Pesa transaction atomically.
    // Repeated callbacks return the original sale rather than creating
    // a second one.
    const { data: result, error: processingError } =
      await supabaseAdmin.rpc("process_mpesa_success_callback", {
        p_transaction_id: transaction.id,
        p_checkout_request_id: checkoutRequestId,
        p_merchant_request_id: merchantRequestId || null,
        p_result_code: resultCode,
        p_result_description: resultDescription,
        p_paid_amount: paidAmount,
        p_mpesa_receipt_number: receipt,
        p_phone_number: phoneNumber,
        p_transaction_date: transactionDate,
      });

    if (processingError) {
      console.error("Atomic M-Pesa processing failed:", {
        transactionId: transaction.id,
        checkoutRequestId,
        error: processingError.message,
      });

      // The RPC rolls back its sale and status changes together if it
      // raises an error. Do not independently create or retry the sale here.
      return jsonResponse(
        {
          success: false,
          status: "PROCESSING_ERROR",
          error: "Payment processing requires verification or reconciliation.",
          transactionId: transaction.id,
        },
        500
      );
    }

    if (!result || result.success !== true || !result.sale_id) {
      console.error("Atomic M-Pesa RPC returned an unexpected result:", {
        transactionId: transaction.id,
      });

      return jsonResponse(
        {
          success: false,
          status: "PROCESSING_ERROR",
          error: "Unexpected payment processing result.",
          transactionId: transaction.id,
        },
        500
      );
    }

    return jsonResponse({
      success: true,
      status: "SUCCESS",
      transactionId: result.transaction_id,
      saleId: result.sale_id,
      saleNumber: result.sale_number ?? transaction.sale_number,
      mpesaReceiptNumber: result.mpesa_receipt_number ?? receipt,
      amount: result.amount ?? paidAmount,
      checkoutRequestId,
      alreadyProcessed: result.already_processed === true,
    });
  } catch (error) {
    console.error(
      "M-Pesa callback processing error:",
      error instanceof Error ? error.message : "Unknown error"
    );

    return jsonResponse(
      {
        success: false,
        error: "M-Pesa callback processing failed.",
      },
      500
    );
  }
});

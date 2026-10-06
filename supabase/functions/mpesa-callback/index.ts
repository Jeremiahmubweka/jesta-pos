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

/*
 * Safaricom sends TransactionDate in this format:
 *
 * YYYYMMDDHHMMSS
 *
 * Example:
 * 20261006183031
 *
 * We convert it to an ISO timestamp using Kenya time.
 */
const parseTransactionDate = (
  transactionDate: unknown
) => {
  const value = String(
    transactionDate || ""
  ).trim();

  if (!/^\d{14}$/.test(value)) {
    return null;
  }

  const year = value.substring(0, 4);
  const month = value.substring(4, 6);
  const day = value.substring(6, 8);
  const hour = value.substring(8, 10);
  const minute = value.substring(10, 12);
  const second = value.substring(12, 14);

  return `${year}-${month}-${day}T${hour}:${minute}:${second}+03:00`;
};

/*
 * Extract one item from Safaricom CallbackMetadata.
 */
const getCallbackItem = (
  items: any[],
  name: string
) => {
  const item = items.find(
    (entry) => entry?.Name === name
  );

  return item?.Value ?? null;
};

Deno.serve(async (req) => {
  /*
   * ---------------------------------------------------------
   * CORS
   * ---------------------------------------------------------
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
     * SUPABASE SERVER CONFIGURATION
     * ---------------------------------------------------------
     */

    const supabaseUrl =
      Deno.env.get("SUPABASE_URL");

    const serviceRoleKey =
      Deno.env.get(
        "SUPABASE_SERVICE_ROLE_KEY"
      );

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error(
        "Supabase server configuration is missing."
      );
    }

    /*
     * Create a server-side Supabase client.
     *
     * The callback comes from Safaricom, not from a
     * logged-in browser user, so we use the service role.
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
     * READ SAFARICOM CALLBACK
     * ---------------------------------------------------------
     */

    const callbackBody = await req.json();

    console.log(
      "M-Pesa callback received:",
      JSON.stringify(callbackBody)
    );

    const stkCallback =
      callbackBody?.Body?.stkCallback;

    if (!stkCallback) {
      console.error(
        "Invalid M-Pesa callback payload."
      );

      return jsonResponse({
        success: false,
        error:
          "Invalid M-Pesa callback payload.",
      });
    }

    /*
     * ---------------------------------------------------------
     * BASIC CALLBACK INFORMATION
     * ---------------------------------------------------------
     */

    const merchantRequestId =
      stkCallback.MerchantRequestID || null;

    const checkoutRequestId =
      stkCallback.CheckoutRequestID || null;

    const resultCode = Number(
      stkCallback.ResultCode
    );

    const resultDescription =
      stkCallback.ResultDesc ||
      "No result description provided.";

    if (!checkoutRequestId) {
      console.error(
        "Callback did not contain CheckoutRequestID."
      );

      return jsonResponse({
        success: false,
        error:
          "CheckoutRequestID is missing.",
      });
    }

    /*
     * ---------------------------------------------------------
     * FIND THE PENDING JESTA TRANSACTION
     * ---------------------------------------------------------
     *
     * The STK Push function saved the CheckoutRequestID
     * before returning to the JESTA frontend.
     */

    let transaction = null;

    let transactionError = null;

    /*
     * First try CheckoutRequestID.
     */

    const checkoutResult =
      await supabaseAdmin
        .from("mpesa_transactions")
        .select("*")
        .eq(
          "checkout_request_id",
          checkoutRequestId
        )
        .maybeSingle();

    transaction =
      checkoutResult.data;

    transactionError =
      checkoutResult.error;

    /*
     * If it wasn't found, try MerchantRequestID
     * as a fallback.
     */

    if (
      !transaction &&
      merchantRequestId
    ) {
      const merchantResult =
        await supabaseAdmin
          .from("mpesa_transactions")
          .select("*")
          .eq(
            "merchant_request_id",
            merchantRequestId
          )
          .maybeSingle();

      if (merchantResult.data) {
        transaction =
          merchantResult.data;
        transactionError =
          merchantResult.error;
      }
    }

    if (transactionError) {
      console.error(
        "Error finding M-Pesa transaction:",
        transactionError
      );

      throw transactionError;
    }

    if (!transaction) {
      /*
       * We acknowledge the callback but do not create
       * a sale because we don't know which JESTA sale
       * this payment belongs to.
       */

      console.error(
        "No matching JESTA M-Pesa transaction found:",
        checkoutRequestId
      );

      return jsonResponse({
        success: false,
        error:
          "No matching JESTA M-Pesa transaction found.",
        checkoutRequestId,
      });
    }

    console.log(
      "Matched JESTA M-Pesa transaction:",
      {
        id: transaction.id,
        saleNumber:
          transaction.sale_number,
        checkoutRequestId,
        status: transaction.status,
      }
    );

    /*
     * ---------------------------------------------------------
     * IDEMPOTENCY CHECK
     * ---------------------------------------------------------
     *
     * Safaricom callbacks should not cause the same sale
     * to be completed twice.
     */

    if (
      transaction.status === "SUCCESS" &&
      transaction.sale_id
    ) {
      console.log(
        "Transaction already completed:",
        transaction.id
      );

      return jsonResponse({
        success: true,
        message:
          "M-Pesa transaction was already processed.",
        transactionId:
          transaction.id,
        saleId:
          transaction.sale_id,
      });
    }

    /*
     * ---------------------------------------------------------
     * PAYMENT FAILED / CANCELLED
     * ---------------------------------------------------------
     *
     * ResultCode 0 = successful M-Pesa payment.
     *
     * Anything else means the customer did not
     * successfully complete the payment.
     */

    if (resultCode !== 0) {
      const { error: updateError } =
        await supabaseAdmin
          .from("mpesa_transactions")
          .update({
            merchant_request_id:
              merchantRequestId ||
              transaction.merchant_request_id,
            result_code: resultCode,
            result_description:
              resultDescription,
            status: "FAILED",
            updated_at: new Date().toISOString(),
          })
          .eq(
            "id",
            transaction.id
          );

      if (updateError) {
        console.error(
          "Failed to update failed M-Pesa transaction:",
          updateError
        );
      }

      console.log(
        "M-Pesa payment failed:",
        {
          transactionId:
            transaction.id,
          resultCode,
          resultDescription,
        }
      );

      /*
       * Return 200 so Safaricom knows the callback
       * was received successfully.
       */

      return jsonResponse({
        success: true,
        status: "FAILED",
        transactionId:
          transaction.id,
        checkoutRequestId,
        resultCode,
        resultDescription,
      });
    }

    /*
     * ---------------------------------------------------------
     * SUCCESSFUL PAYMENT
     * ---------------------------------------------------------
     */

    const callbackMetadata =
      stkCallback.CallbackMetadata?.Item ||
      [];

    const amountFromCallback =
      getCallbackItem(
        callbackMetadata,
        "Amount"
      );

    const mpesaReceiptNumber =
      getCallbackItem(
        callbackMetadata,
        "MpesaReceiptNumber"
      );

    const transactionDate =
      getCallbackItem(
        callbackMetadata,
        "TransactionDate"
      );

    const phoneNumber =
      getCallbackItem(
        callbackMetadata,
        "PhoneNumber"
      );

    const paidAmount = Number(
      amountFromCallback ??
        transaction.amount
    );

    /*
     * ---------------------------------------------------------
     * VERIFY PAYMENT AMOUNT
     * ---------------------------------------------------------
     *
     * The amount received from Safaricom must match
     * the amount JESTA expected.
     */

    const expectedAmount = Number(
      transaction.amount
    );

    if (
      !Number.isFinite(paidAmount) ||
      paidAmount <= 0
    ) {
      throw new Error(
        "M-Pesa callback did not contain a valid payment amount."
      );
    }

    if (
      Math.abs(
        paidAmount - expectedAmount
      ) > 0.01
    ) {
      console.error(
        "M-Pesa amount mismatch:",
        {
          expectedAmount,
          paidAmount,
          transactionId:
            transaction.id,
        }
      );

      await supabaseAdmin
        .from("mpesa_transactions")
        .update({
          result_code: resultCode,
          result_description:
            `Amount mismatch. Expected ${expectedAmount}, received ${paidAmount}.`,
          status:
            "PROCESSING_ERROR",
          updated_at:
            new Date().toISOString(),
        })
        .eq(
          "id",
          transaction.id
        );

      return jsonResponse({
        success: false,
        error:
          "M-Pesa payment amount does not match the expected sale amount.",
      });
    }

    /*
     * ---------------------------------------------------------
     * COMPLETE THE JESTA SALE
     * ---------------------------------------------------------
     *
     * THIS is the important point.
     *
     * We do NOT call complete_sale when the STK Push
     * is first sent.
     *
     * We call it ONLY after Safaricom confirms
     * successful payment.
     */

    const {
      data: saleResult,
      error: saleError,
    } = await supabaseAdmin.rpc(
      "complete_sale",
      {
        p_business_id:
          transaction.business_id,

        p_customer_id:
          transaction.customer_id ||
          null,

        p_sale_number:
          transaction.sale_number,

        p_items:
          transaction.items,

        p_amount_paid:
          paidAmount,

        p_payment_method:
          "mpesa",

        p_transaction_reference:
          mpesaReceiptNumber ||
          checkoutRequestId,

        p_tax_amount:
          Number(
            transaction.tax_amount || 0
          ),

        p_discount_amount:
          Number(
            transaction.discount_amount || 0
          ),

        p_notes:
          transaction.notes ||
          null,
      }
    );

    if (saleError) {
      console.error(
        "Failed to complete JESTA sale after M-Pesa payment:",
        saleError
      );

      /*
       * The customer has already paid.
       *
       * Therefore we do NOT mark this simply as FAILED.
       * We use PROCESSING_ERROR so the system knows
       * payment succeeded but sale creation needs attention.
       */

      await supabaseAdmin
        .from("mpesa_transactions")
        .update({
          result_code: resultCode,
          result_description:
            `Payment received, but JESTA sale creation failed: ${saleError.message}`,
          status:
            "PROCESSING_ERROR",
          mpesa_receipt_number:
            mpesaReceiptNumber ||
            null,
          phone_number:
            phoneNumber
              ? String(phoneNumber)
              : transaction.phone_number,
          transaction_date:
            parseTransactionDate(
              transactionDate
            ),
          updated_at:
            new Date().toISOString(),
        })
        .eq(
          "id",
          transaction.id
        );

      return jsonResponse({
        success: false,
        status:
          "PROCESSING_ERROR",
        error:
          "Payment was received, but JESTA could not complete the sale.",
        transactionId:
          transaction.id,
      });
    }

    /*
     * ---------------------------------------------------------
     * GET THE SALE ID
     * ---------------------------------------------------------
     */

    const saleId =
      typeof saleResult === "object" &&
      saleResult !== null
        ? saleResult.id ||
          saleResult.sale_id ||
          null
        : saleResult;

    /*
     * ---------------------------------------------------------
     * UPDATE M-PESA TRANSACTION
     * ---------------------------------------------------------
     */

    const {
      error: finalUpdateError,
    } = await supabaseAdmin
      .from("mpesa_transactions")
      .update({
        merchant_request_id:
          merchantRequestId ||
          transaction.merchant_request_id,

        result_code:
          resultCode,

        result_description:
          resultDescription,

        mpesa_receipt_number:
          mpesaReceiptNumber ||
          null,

        phone_number:
          phoneNumber
            ? String(phoneNumber)
            : transaction.phone_number,

        transaction_date:
          parseTransactionDate(
            transactionDate
          ),

        sale_id:
          saleId,

        status:
          "SUCCESS",

        updated_at:
          new Date().toISOString(),
      })
      .eq(
        "id",
        transaction.id
      );

    if (finalUpdateError) {
      console.error(
        "Sale completed but M-Pesa transaction update failed:",
        finalUpdateError
      );

      /*
       * The sale itself has already been completed.
       *
       * We don't attempt complete_sale again because
       * doing so could create a duplicate sale.
       */

      return jsonResponse({
        success: true,
        warning:
          "Payment and sale were completed, but the M-Pesa transaction record could not be fully updated.",
        transactionId:
          transaction.id,
        saleId,
      });
    }

    /*
     * ---------------------------------------------------------
     * SUCCESS
     * ---------------------------------------------------------
     */

    console.log(
      "M-Pesa payment and JESTA sale completed successfully:",
      {
        transactionId:
          transaction.id,
        saleId,
        saleNumber:
          transaction.sale_number,
        mpesaReceiptNumber,
        paidAmount,
      }
    );

    return jsonResponse({
      success: true,
      status: "SUCCESS",
      transactionId:
        transaction.id,
      saleId,
      saleNumber:
        transaction.sale_number,
      mpesaReceiptNumber,
      amount: paidAmount,
      checkoutRequestId,
    });
  } catch (error) {
    console.error(
      "M-Pesa callback processing error:",
      error
    );

    return jsonResponse(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to process M-Pesa callback.",
      },
      500
    );
  }
});
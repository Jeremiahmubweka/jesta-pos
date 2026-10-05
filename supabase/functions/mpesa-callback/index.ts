const mpesaCallbackCorsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...mpesaCallbackCorsHeaders,
      "Content-Type": "application/json",
    },
  });
}

Deno.serve(async (req) => {
  // Handle browser preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: mpesaCallbackCorsHeaders,
    });
  }

  // Safaricom sends callbacks using POST
  if (req.method !== "POST") {
    return jsonResponse(
      {
        success: false,
        error: "Method not allowed",
      },
      405,
    );
  }

  try {
    const callbackData = await req.json();

    // Log the callback for debugging during sandbox testing
    console.log(
      "M-Pesa callback received:",
      JSON.stringify(callbackData),
    );

    /*
      Safaricom normally sends data in this structure:

      {
        "Body": {
          "stkCallback": {
            "MerchantRequestID": "...",
            "CheckoutRequestID": "...",
            "ResultCode": 0,
            "ResultDesc": "The service request is processed successfully.",
            "CallbackMetadata": {
              "Item": [...]
            }
          }
        }
      }
    */

    const stkCallback =
      callbackData?.Body?.stkCallback;

    if (!stkCallback) {
      console.error(
        "Invalid M-Pesa callback structure",
      );

      return jsonResponse({
        success: false,
        error: "Invalid callback structure",
      });
    }

    const merchantRequestId =
      stkCallback.MerchantRequestID;

    const checkoutRequestId =
      stkCallback.CheckoutRequestID;

    const resultCode =
      stkCallback.ResultCode;

    const resultDescription =
      stkCallback.ResultDesc;

    console.log(
      "MerchantRequestID:",
      merchantRequestId,
    );

    console.log(
      "CheckoutRequestID:",
      checkoutRequestId,
    );

    console.log(
      "ResultCode:",
      resultCode,
    );

    console.log(
      "ResultDescription:",
      resultDescription,
    );

    // Payment successful
    if (resultCode === 0) {
      console.log(
        "M-Pesa payment successful",
      );

      const metadata =
        stkCallback.CallbackMetadata?.Item || [];

      const getMetadataValue = (name: string) => {
        const item = metadata.find(
          (entry: { Name?: string }) =>
            entry.Name === name,
        );

        return item?.Value ?? null;
      };

      const mpesaReceiptNumber =
        getMetadataValue("MpesaReceiptNumber");

      const transactionDate =
        getMetadataValue("TransactionDate");

      const phoneNumber =
        getMetadataValue("PhoneNumber");

      const amount =
        getMetadataValue("Amount");

      console.log(
        "M-Pesa Receipt:",
        mpesaReceiptNumber,
      );

      console.log(
        "Amount:",
        amount,
      );

      console.log(
        "Phone:",
        phoneNumber,
      );

      console.log(
        "Transaction Date:",
        transactionDate,
      );

      /*
        We will later save this information
        into the JESTA mpesa_transactions table
        and update the corresponding sale.

        IMPORTANT:
        We will make this processing idempotent
        so the same callback cannot complete
        a sale twice.
      */

      return jsonResponse({
        success: true,
        message: "Payment callback received",
        status: "SUCCESS",
        merchantRequestId,
        checkoutRequestId,
        mpesaReceiptNumber,
      });
    }

    // Payment failed, cancelled or timed out
    console.log(
      "M-Pesa payment was not successful:",
      resultDescription,
    );

    return jsonResponse({
      success: true,
      message: "Payment callback received",
      status: "FAILED",
      merchantRequestId,
      checkoutRequestId,
      resultCode,
      resultDescription,
    });
  } catch (error) {
    console.error(
      "M-Pesa callback error:",
      error,
    );

    /*
      Return HTTP 200 to Safaricom so the callback
      endpoint itself is acknowledged.
    */

    return jsonResponse({
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Unexpected callback error",
    });
  }
});
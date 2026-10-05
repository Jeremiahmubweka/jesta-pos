declare const Deno: {
  env: {
    get: (key: string) => string | undefined;
  };
  serve: (
    handler: (req: Request) => Promise<Response> | Response,
  ) => void;
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function jsonResponse(
  data: unknown,
  status = 200,
): Response {
  return new Response(
    JSON.stringify(data),
    {
      status,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
    },
  );
}

function base64Encode(
  value: string,
): string {
  return btoa(value);
}

function getKenyaTimestamp(): string {
  const now = new Date();

  const kenyaTime = new Date(
    now.toLocaleString("en-US", {
      timeZone: "Africa/Nairobi",
    }),
  );

  return (
    kenyaTime.getFullYear().toString() +
    String(
      kenyaTime.getMonth() + 1,
    ).padStart(2, "0") +
    String(
      kenyaTime.getDate(),
    ).padStart(2, "0") +
    String(
      kenyaTime.getHours(),
    ).padStart(2, "0") +
    String(
      kenyaTime.getMinutes(),
    ).padStart(2, "0") +
    String(
      kenyaTime.getSeconds(),
    ).padStart(2, "0")
  );
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders,
    });
  }

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
    const body = await req.json();

    const phoneNumber = body.phoneNumber;
    const amount = body.amount;

    if (
      amount === undefined ||
      amount === null ||
      Number(amount) <= 0
    ) {
      return jsonResponse(
        {
          success: false,
          error:
            "Amount must be greater than 0",
        },
        400,
      );
    }

    const numericAmount =
      Math.round(Number(amount));

    if (!Number.isFinite(numericAmount)) {
      return jsonResponse(
        {
          success: false,
          error: "Invalid amount",
        },
        400,
      );
    }

    if (!phoneNumber) {
      return jsonResponse(
        {
          success: false,
          error:
            "Phone number is required",
        },
        400,
      );
    }

    let formattedPhone =
      String(phoneNumber).replace(
        /\s+/g,
        "",
      );

    if (
      formattedPhone.startsWith("+254")
    ) {
      formattedPhone =
        formattedPhone.substring(1);
    } else if (
      formattedPhone.startsWith("0")
    ) {
      formattedPhone =
        "254" +
        formattedPhone.substring(1);
    }

    if (
      !/^2547\d{8}$/.test(
        formattedPhone,
      )
    ) {
      return jsonResponse(
        {
          success: false,
          error:
            "Invalid Kenyan phone number. Use 07XXXXXXXX or 2547XXXXXXXX",
        },
        400,
      );
    }

    const consumerKey =
      Deno.env.get(
        "MPESA_CONSUMER_KEY",
      );

    const consumerSecret =
      Deno.env.get(
        "MPESA_CONSUMER_SECRET",
      );

    const shortCode =
      Deno.env.get(
        "MPESA_SHORTCODE",
      );

    const passkey =
      Deno.env.get(
        "MPESA_PASSKEY",
      );

    if (
      !consumerKey ||
      !consumerSecret ||
      !shortCode ||
      !passkey
    ) {
      console.error(
        "One or more M-Pesa secrets are missing",
      );

      return jsonResponse(
        {
          success: false,
          error:
            "M-Pesa credentials are not configured",
        },
        500,
      );
    }

    const timestamp =
      getKenyaTimestamp();

    const passwordString =
      `${shortCode}${passkey}${timestamp}`;

    const password =
      base64Encode(
        passwordString,
      );

    const credentials =
      `${consumerKey}:${consumerSecret}`;

    const basicAuth =
      base64Encode(
        credentials,
      );

    const tokenResponse =
      await fetch(
        "https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials",
        {
          method: "GET",
          headers: {
            Authorization:
              `Basic ${basicAuth}`,
            Accept:
              "application/json",
          },
        },
      );

    const tokenText =
      await tokenResponse.text();

    if (!tokenResponse.ok) {
      console.error(
        "Daraja OAuth failed:",
        tokenText,
      );

      return jsonResponse(
        {
          success: false,
          error:
            "M-Pesa authentication failed",
        },
        502,
      );
    }

    let tokenData;

    try {
      tokenData =
        JSON.parse(tokenText);
    } catch {
      console.error(
        "Invalid OAuth response:",
        tokenText,
      );

      return jsonResponse(
        {
          success: false,
          error:
            "Invalid M-Pesa authentication response",
        },
        502,
      );
    }

    const accessToken =
      tokenData.access_token;

    if (!accessToken) {
      console.error(
        "OAuth response did not contain an access token",
      );

      return jsonResponse(
        {
          success: false,
          error:
            "M-Pesa access token was not returned",
        },
        502,
      );
    }

    const stkPayload = {
      BusinessShortCode:
        shortCode,

      Password:
        password,

      Timestamp:
        timestamp,

      TransactionType:
        "CustomerPayBillOnline",

      Amount:
        numericAmount,

      PartyA:
        formattedPhone,

      PartyB:
        shortCode,

      PhoneNumber:
        formattedPhone,

      CallBackURL:
        "https://ejconenpabtyfloyjubi.supabase.co/functions/v1/mpesa-callback",

      AccountReference:
        "JESTA",

      TransactionDesc:
        "JESTA POS Payment",
    };

    console.log(
      "Sending STK Push:",
      JSON.stringify({
        ...stkPayload,
        Password:
          "[REDACTED]",
      }),
    );

    const stkResponse =
      await fetch(
        "https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest",
        {
          method: "POST",

          headers: {
            Authorization:
              `Bearer ${accessToken}`,

            "Content-Type":
              "application/json",

            Accept:
              "application/json",
          },

          body:
            JSON.stringify(
              stkPayload,
            ),
        },
      );

    const stkText =
      await stkResponse.text();

    let stkData;

    try {
      stkData =
        JSON.parse(stkText);
    } catch {
      stkData = {
        rawResponse:
          stkText,
      };
    }

    console.log(
      "Daraja STK response:",
      JSON.stringify(
        stkData,
      ),
    );

    if (!stkResponse.ok) {
      return jsonResponse(
        {
          success: false,
          data: stkData,
        },
        400,
      );
    }

    return jsonResponse({
      success: true,
      data: stkData,
    });

  } catch (error) {
    console.error(
      "M-Pesa STK Push error:",
      error,
    );

    return jsonResponse(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "An unexpected error occurred",
      },
      500,
    );
  }
});
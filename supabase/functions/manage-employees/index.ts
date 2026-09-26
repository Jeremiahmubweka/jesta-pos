import { createClient } from "@supabase/supabase-js";

declare const Deno: {
  env: { get(name: string): string | undefined };
  serve(handler: (request: Request) => Response | Promise<Response>): void;
};

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

Deno.serve(async (req) => {
  // =========================================================
  // CORS
  // =========================================================

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
    // =========================================================
    // 1. GET AUTHENTICATED USER'S ACCESS TOKEN
    // =========================================================

    const authHeader = req.headers.get("Authorization");

    if (!authHeader?.startsWith("Bearer ")) {
      return jsonResponse(
        {
          success: false,
          error: "Authentication required.",
        },
        401
      );
    }

    const accessToken = authHeader
      .replace("Bearer ", "")
      .trim();

    if (!accessToken) {
      return jsonResponse(
        {
          success: false,
          error: "Authentication token is missing.",
        },
        401
      );
    }

    // =========================================================
    // 2. SUPABASE ENVIRONMENT VARIABLES
    // =========================================================

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const supabaseServiceRoleKey = Deno.env.get(
      "SUPABASE_SERVICE_ROLE_KEY"
    );

    if (
      !supabaseUrl ||
      !supabaseAnonKey ||
      !supabaseServiceRoleKey
    ) {
      console.error(
        "Required Supabase environment variables are missing."
      );

      return jsonResponse(
        {
          success: false,
          error: "Server configuration is incomplete.",
        },
        500
      );
    }

    // =========================================================
    // 3. CREATE SUPABASE CLIENTS
    // =========================================================

    // Authenticated client.
    // Used to verify the currently logged-in user.
    const supabase = createClient(
      supabaseUrl,
      supabaseAnonKey,
      {
        global: {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      }
    );

    // Service-role client.
    // This key is ONLY used inside this Edge Function.
    const supabaseAdmin = createClient(
      supabaseUrl,
      supabaseServiceRoleKey
    );

    // =========================================================
    // 4. VERIFY CURRENTLY LOGGED-IN USER
    // =========================================================

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      console.error(
        "Authentication error:",
        userError
      );

      return jsonResponse(
        {
          success: false,
          error:
            "Your session is invalid or has expired.",
        },
        401
      );
    }

    // =========================================================
    // 5. GET ADMINISTRATOR PROFILE
    // =========================================================

    const {
      data: adminProfile,
      error: profileError,
    } = await supabaseAdmin
      .from("user_profiles")
      .select(
        "id, full_name, role, is_active, business_id"
      )
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) {
      console.error(
        "Admin profile lookup error:",
        profileError
      );

      return jsonResponse(
        {
          success: false,
          error:
            "Unable to verify your JESTA profile.",
        },
        500
      );
    }

    if (!adminProfile) {
      return jsonResponse(
        {
          success: false,
          error:
            "Your JESTA user profile could not be found.",
        },
        403
      );
    }

    // =========================================================
    // 6. VERIFY ADMINISTRATOR PRIVILEGES
    // =========================================================

    if (
      adminProfile.role?.toLowerCase() !== "admin" ||
      !adminProfile.is_active
    ) {
      return jsonResponse(
        {
          success: false,
          error:
            "Only active administrators can manage employees.",
        },
        403
      );
    }

    if (!adminProfile.business_id) {
      return jsonResponse(
        {
          success: false,
          error:
            "Your account is not linked to a business.",
        },
        400
      );
    }

    // =========================================================
    // 7. READ REQUEST BODY
    // =========================================================

    let body: {
      action?: string;
      full_name?: string;
      email?: string;
      phone?: string;
      password?: string;
      employee_id?: string;
    };

    try {
      body = await req.json();
    } catch {
      return jsonResponse(
        {
          success: false,
          error: "Invalid request body.",
        },
        400
      );
    }

    const action = body.action
      ?.trim()
      .toLowerCase();

    // =========================================================
    // LIST EMPLOYEES
    // =========================================================

    if (action === "list") {
      const {
        data: employeeProfiles,
        error: employeesError,
      } = await supabaseAdmin
        .from("user_profiles")
        .select(
          "id, full_name, phone, role, is_active, business_id"
        )
        .eq(
          "business_id",
          adminProfile.business_id
        )
        .eq("role", "employee")
        .order("full_name", {
          ascending: true,
        });

      if (employeesError) {
        console.error(
          "Employee list lookup error:",
          employeesError
        );

        return jsonResponse(
          {
            success: false,
            error:
              employeesError.message ||
              "Unable to load employees.",
          },
          500
        );
      }

      const employees = await Promise.all(
        (employeeProfiles || []).map(
          async (employee: {
            id: string;
            full_name: string;
            phone: string | null;
            role: string;
            is_active: boolean;
            business_id: string | null;
          }) => {
            const {
              data: authUserData,
              error: authUserError,
            } =
              await supabaseAdmin.auth.admin.getUserById(
                employee.id
              );

            if (authUserError) {
              console.error(
                `Unable to load Auth user ${employee.id}:`,
                authUserError
              );
            }

            return {
              id: employee.id,
              full_name: employee.full_name,
              email:
                authUserData?.user?.email || "",
              phone: employee.phone,
              role: employee.role,
              is_active: employee.is_active,
              business_id: employee.business_id,
            };
          }
        )
      );

      return jsonResponse({
        success: true,
        employees,
      });
    }

    // =========================================================
    // CREATE EMPLOYEE
    // =========================================================

    if (action === "create") {
      const fullName =
        body.full_name?.trim();

      const email = body.email
        ?.trim()
        .toLowerCase();

      const phone =
        body.phone?.trim() || null;

      const password = body.password;

      // -------------------------------------------------------
      // Validate full name
      // -------------------------------------------------------

      if (!fullName) {
        return jsonResponse(
          {
            success: false,
            error:
              "Employee full name is required.",
          },
          400
        );
      }

      // -------------------------------------------------------
      // Validate email
      // -------------------------------------------------------

      if (!email) {
        return jsonResponse(
          {
            success: false,
            error:
              "Employee email is required.",
          },
          400
        );
      }

      const emailPattern =
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      if (!emailPattern.test(email)) {
        return jsonResponse(
          {
            success: false,
            error:
              "Please enter a valid employee email address.",
          },
          400
        );
      }

      // -------------------------------------------------------
      // Validate password
      // -------------------------------------------------------

      if (
        !password ||
        password.length < 8
      ) {
        return jsonResponse(
          {
            success: false,
            error:
              "Employee password must contain at least 8 characters.",
          },
          400
        );
      }

      // =======================================================
      // CREATE SUPABASE AUTH ACCOUNT
      // =======================================================

      const {
        data: createdUserData,
        error: createUserError,
      } =
        await supabaseAdmin.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: {
            full_name: fullName,
          },
        });

      if (
        createUserError ||
        !createdUserData.user
      ) {
        console.error(
          "Auth employee creation error:",
          createUserError
        );

        return jsonResponse(
          {
            success: false,
            error:
              createUserError?.message ||
              "Unable to create employee account.",
          },
          400
        );
      }

      const newUser =
        createdUserData.user;

      // =======================================================
      // CREATE JESTA USER PROFILE
      // =======================================================

      const {
        data: createdProfile,
        error: profileInsertError,
      } = await supabaseAdmin
        .from("user_profiles")
        .insert({
          id: newUser.id,
          full_name: fullName,
          phone,
          role: "employee",
          is_active: true,
          business_id:
            adminProfile.business_id,
        })
        .select(
          "id, full_name, phone, role, is_active, business_id"
        )
        .single();

      // =======================================================
      // ROLLBACK AUTH ACCOUNT IF PROFILE CREATION FAILS
      // =======================================================

      if (profileInsertError) {
        console.error(
          "Employee profile creation error:",
          profileInsertError
        );

        await supabaseAdmin.auth.admin.deleteUser(
          newUser.id
        );

        return jsonResponse(
          {
            success: false,
            error:
              profileInsertError.message ||
              "Unable to create employee profile.",
          },
          500
        );
      }

      // =======================================================
      // RETURN CREATED EMPLOYEE
      // =======================================================

      return jsonResponse({
        success: true,
        message:
          "Employee created successfully.",
        employee: {
          id: createdProfile.id,
          full_name:
            createdProfile.full_name,
          email,
          phone: createdProfile.phone,
          role: createdProfile.role,
          is_active:
            createdProfile.is_active,
          business_id:
            createdProfile.business_id,
        },
      });
    }

    // =========================================================
    // DEACTIVATE EMPLOYEE
    // =========================================================

    if (action === "deactivate") {
      const employeeId =
        body.employee_id?.trim();

      if (!employeeId) {
        return jsonResponse(
          {
            success: false,
            error:
              "Employee ID is required.",
          },
          400
        );
      }

      // -------------------------------------------------------
      // Prevent administrator from deactivating themselves
      // -------------------------------------------------------

      if (employeeId === user.id) {
        return jsonResponse(
          {
            success: false,
            error:
              "You cannot deactivate your own administrator account.",
          },
          400
        );
      }

      // -------------------------------------------------------
      // Find employee in same business
      // -------------------------------------------------------

      const {
        data: employee,
        error: employeeError,
      } = await supabaseAdmin
        .from("user_profiles")
        .select(
          "id, full_name, role, is_active, business_id"
        )
        .eq("id", employeeId)
        .eq(
          "business_id",
          adminProfile.business_id
        )
        .maybeSingle();

      if (employeeError) {
        console.error(
          "Employee lookup error:",
          employeeError
        );

        return jsonResponse(
          {
            success: false,
            error:
              "Unable to find the employee.",
          },
          500
        );
      }

      if (!employee) {
        return jsonResponse(
          {
            success: false,
            error:
              "Employee was not found in your business.",
          },
          404
        );
      }

      if (
        employee.role?.toLowerCase() !==
        "employee"
      ) {
        return jsonResponse(
          {
            success: false,
            error:
              "Only employee accounts can be managed here.",
          },
          400
        );
      }

      // -------------------------------------------------------
      // Revoke Supabase Auth access
      // -------------------------------------------------------

      const {
        error: banError,
      } =
        await supabaseAdmin.auth.admin.updateUserById(
          employeeId,
          {
            ban_duration: "876000h",
          }
        );

      if (banError) {
        console.error(
          "Employee Auth deactivation error:",
          banError
        );

        return jsonResponse(
          {
            success: false,
            error:
              banError.message ||
              "Unable to deactivate employee Auth access.",
          },
          500
        );
      }

      // -------------------------------------------------------
      // Mark employee inactive in JESTA
      // -------------------------------------------------------

      const {
        error: updateError,
      } = await supabaseAdmin
        .from("user_profiles")
        .update({
          is_active: false,
        })
        .eq("id", employeeId)
        .eq(
          "business_id",
          adminProfile.business_id
        );

      if (updateError) {
        console.error(
          "Employee profile deactivation error:",
          updateError
        );

        // Restore Auth access if profile update fails.
        await supabaseAdmin.auth.admin.updateUserById(
          employeeId,
          {
            ban_duration: "none",
          }
        );

        return jsonResponse(
          {
            success: false,
            error:
              "Employee could not be fully deactivated.",
          },
          500
        );
      }

      return jsonResponse({
        success: true,
        message:
          "Employee deactivated successfully.",
      });
    }

    // =========================================================
    // REACTIVATE EMPLOYEE
    // =========================================================

    if (action === "reactivate") {
      const employeeId =
        body.employee_id?.trim();

      if (!employeeId) {
        return jsonResponse(
          {
            success: false,
            error:
              "Employee ID is required.",
          },
          400
        );
      }

      // -------------------------------------------------------
      // Find employee in same business
      // -------------------------------------------------------

      const {
        data: employee,
        error: employeeError,
      } = await supabaseAdmin
        .from("user_profiles")
        .select(
          "id, full_name, role, is_active, business_id"
        )
        .eq("id", employeeId)
        .eq(
          "business_id",
          adminProfile.business_id
        )
        .maybeSingle();

      if (employeeError) {
        console.error(
          "Employee lookup error:",
          employeeError
        );

        return jsonResponse(
          {
            success: false,
            error:
              "Unable to find the employee.",
          },
          500
        );
      }

      if (!employee) {
        return jsonResponse(
          {
            success: false,
            error:
              "Employee was not found in your business.",
          },
          404
        );
      }

      if (
        employee.role?.toLowerCase() !==
        "employee"
      ) {
        return jsonResponse(
          {
            success: false,
            error:
              "Only employee accounts can be managed here.",
          },
          400
        );
      }

      // -------------------------------------------------------
      // Restore Supabase Auth access
      // -------------------------------------------------------

      const {
        error: unbanError,
      } =
        await supabaseAdmin.auth.admin.updateUserById(
          employeeId,
          {
            ban_duration: "none",
          }
        );

      if (unbanError) {
        console.error(
          "Employee Auth reactivation error:",
          unbanError
        );

        return jsonResponse(
          {
            success: false,
            error:
              unbanError.message ||
              "Unable to restore employee Auth access.",
          },
          500
        );
      }

      // -------------------------------------------------------
      // Restore JESTA profile access
      // -------------------------------------------------------

      const {
        error: updateError,
      } = await supabaseAdmin
        .from("user_profiles")
        .update({
          is_active: true,
        })
        .eq("id", employeeId)
        .eq(
          "business_id",
          adminProfile.business_id
        );

      if (updateError) {
        console.error(
          "Employee profile reactivation error:",
          updateError
        );

        // Re-ban Auth account if profile update fails.
        await supabaseAdmin.auth.admin.updateUserById(
          employeeId,
          {
            ban_duration: "876000h",
          }
        );

        return jsonResponse(
          {
            success: false,
            error:
              "Employee could not be fully reactivated.",
          },
          500
        );
      }

      return jsonResponse({
        success: true,
        message:
          "Employee reactivated successfully.",
      });
    }

    // =========================================================
    // INVALID ACTION
    // =========================================================

    return jsonResponse(
      {
        success: false,
        error:
          "Invalid action. Supported actions are list, create, deactivate, and reactivate.",
      },
      400
    );
  } catch (error) {
    console.error(
      "Manage employees function error:",
      error
    );

    return jsonResponse(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "An unexpected server error occurred.",
      },
      500
    );
  }
});
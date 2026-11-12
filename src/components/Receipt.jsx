
import { Printer } from "lucide-react";

function Receipt({ sale }) {
  if (!sale) {
    return null;
  }

  const isPendingSync =
    sale.sync_status === "pending" ||
    sale.status === "pending" ||
    sale.is_offline === true;

  const formatCurrency = (amount) => {
    return `KSh ${Number(amount || 0).toLocaleString("en-KE", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const formatDate = (date) => {
    if (!date) {
      return "-";
    }

    const parsedDate = new Date(date);

    if (Number.isNaN(parsedDate.getTime())) {
      return "-";
    }

    return parsedDate.toLocaleString("en-KE", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  };

  const paymentLabel = {
    cash: "Cash",
    mpesa: "M-Pesa",
    card: "Card",
  };

  const handlePrint = () => {
    window.print();
  };

  const getItemName = (item) => {
    return (
      item.product_name ||
      item.name ||
      item.product?.name ||
      "Product"
    );
  };

  const getItemPrice = (item) => {
    return Number(
      item.unit_price ??
      item.selling_price ??
      item.price ??
      item.product?.selling_price ??
      0
    );
  };

  const getItemTotal = (item) => {
    const quantity = Number(item.quantity || 0);

    const storedTotal =
      item.total_amount ??
      item.line_total ??
      item.total;

    return storedTotal !== undefined && storedTotal !== null
      ? Number(storedTotal)
      : quantity * getItemPrice(item);
  };

  const subtotal =
    sale.subtotal ??
    sale.total_amount ??
    sale.total ??
    0;

  const total =
    sale.total_amount ??
    sale.total ??
    0;

  const amountPaid =
    sale.amount_paid ??
    0;

  const balanceDue =
    sale.balance_due ??
    0;

  const changeAmount =
    sale.change_amount ??
    0;

  return (
    <>
      <div className="receipt-print-area mx-auto w-full max-w-md overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-lg">

        {/* RECEIPT BRAND HEADER */}
        <div className="bg-gray-950 px-6 py-7 text-center text-white">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-white text-xl font-black text-gray-950">
            J.
          </div>

          <h1 className="mt-3 text-2xl font-black tracking-wider">
            JESTA.
          </h1>

          <p className="mt-1 text-sm font-medium text-gray-300">
            JESTA TECHNOLOGIES
          </p>

          <p className="mt-1 text-xs text-gray-400">
            POS & Business Management System
          </p>
        </div>

        {/* RECEIPT STATUS */}
        <div
          className={`border-b px-5 py-4 text-center ${
            isPendingSync
              ? "border-amber-200 bg-amber-50"
              : "border-green-200 bg-green-50"
          }`}
        >
          <div
            className={`flex items-center justify-center gap-2 ${
              isPendingSync
                ? "text-amber-700"
                : "text-green-700"
            }`}
          >
            <div
              className={`flex h-7 w-7 items-center justify-center rounded-full text-white ${
                isPendingSync
                  ? "bg-amber-500"
                  : "bg-green-600"
              }`}
            >
              {isPendingSync ? "!" : "✓"}
            </div>

            <span className="text-sm font-bold">
              {isPendingSync
                ? "PENDING SYNCHRONIZATION"
                : "SALE COMPLETED"}
            </span>
          </div>

          {isPendingSync && (
            <div className="mt-3">
              <p className="text-xs font-semibold text-amber-800">
                Saved on this device
              </p>

              <p className="mt-1 text-xs leading-relaxed text-amber-700">
                This sale has not yet been recorded on the JESTA server.
                It is awaiting synchronization.
              </p>
            </div>
          )}

          {!isPendingSync && (
            <p className="mt-1 text-xs text-green-700">
              Payment transaction recorded.
            </p>
          )}
        </div>

        <div className="p-6">

          {/* SALE DETAILS */}
          <div className="rounded-xl bg-gray-50 p-4">
            <div className="grid grid-cols-2 gap-4 text-xs">

              <div>
                <p className="text-gray-500">
                  Sale Number
                </p>

                <p className="mt-1 break-all font-bold text-gray-900">
                  {sale.sale_number || "-"}
                </p>
              </div>

              <div className="text-right">
                <p className="text-gray-500">
                  Date & Time
                </p>

                <p className="mt-1 font-medium text-gray-900">
                  {formatDate(
                    sale.sale_date || sale.created_at
                  )}
                </p>
              </div>

              <div>
                <p className="text-gray-500">
                  Customer
                </p>

                <p className="mt-1 font-medium text-gray-900">
                  {sale.customer_name || "Walk-in Customer"}
                </p>
              </div>

              <div className="text-right">
                <p className="text-gray-500">
                  Payment
                </p>

                <p className="mt-1 font-bold text-gray-900">
                  {paymentLabel[sale.payment_method] ||
                    sale.payment_method ||
                    "-"}
                </p>
              </div>

            </div>
          </div>

          {/* ITEMS */}
          <div className="mt-6">
            <div className="mb-3 flex items-center justify-between border-b border-gray-200 pb-2">

              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500">
                Items
              </h3>

              <span className="text-xs font-medium text-gray-400">
                {sale.items?.length || 0} item
                {sale.items?.length === 1 ? "" : "s"}
              </span>

            </div>

            <div className="space-y-4">

              {sale.items?.map((item, index) => {
                const quantity = Number(item.quantity || 0);
                const unitPrice = getItemPrice(item);
                const itemTotal = getItemTotal(item);

                return (
                  <div
                    key={item.id || item.product_id || index}
                    className="flex items-start justify-between gap-4"
                  >

                    <div className="min-w-0">

                      <p className="text-sm font-semibold text-gray-900">
                        {getItemName(item)}
                      </p>

                      <p className="mt-1 text-xs text-gray-500">
                        {quantity} × {formatCurrency(unitPrice)}
                      </p>

                    </div>

                    <p className="shrink-0 text-sm font-bold text-gray-900">
                      {formatCurrency(itemTotal)}
                    </p>

                  </div>
                );
              })}

            </div>
          </div>

          {/* TOTALS */}
          <div className="mt-6 rounded-xl border border-gray-200 p-4">

            <div className="space-y-2 text-sm">

              <div className="flex justify-between text-gray-500">
                <span>Subtotal</span>
                <span>
                  {formatCurrency(subtotal)}
                </span>
              </div>

              <div className="flex justify-between text-gray-500">
                <span>Tax</span>
                <span>
                  {formatCurrency(sale.tax_amount ?? sale.tax)}
                </span>
              </div>

              <div className="flex justify-between text-gray-500">
                <span>Discount</span>
                <span>
                  {formatCurrency(sale.discount_amount ?? sale.discount)}
                </span>
              </div>

              <div className="my-3 border-t border-dashed border-gray-300" />

              <div className="flex items-center justify-between">

                <span className="text-base font-bold text-gray-900">
                  TOTAL
                </span>

                <span className="text-xl font-black text-gray-950">
                  {formatCurrency(total)}
                </span>

              </div>

            </div>
          </div>

          {/* PAYMENT SUMMARY */}
          <div className="mt-4 overflow-hidden rounded-xl border border-gray-200">

            <div className="bg-gray-50 px-4 py-3">
              <p className="text-xs font-bold uppercase tracking-wider text-gray-500">
                Payment Summary
              </p>
            </div>

            <div className="space-y-3 p-4">

              <div className="flex justify-between text-sm">

                <span className="text-gray-500">
                  Amount Paid
                </span>

                <span className="font-semibold text-gray-900">
                  {formatCurrency(amountPaid)}
                </span>

              </div>

              <div className="flex justify-between text-sm">

                <span className="text-gray-500">
                  Balance Due
                </span>

                <span
                  className={`font-bold ${
                    Number(balanceDue) > 0
                      ? "text-amber-600"
                      : "text-gray-900"
                  }`}
                >
                  {formatCurrency(balanceDue)}
                </span>

              </div>

              <div
                className={`rounded-lg p-3 ${
                  isPendingSync
                    ? "bg-amber-50"
                    : "bg-green-50"
                }`}
              >

                <div className="flex justify-between">

                  <span
                    className={`text-sm font-semibold ${
                      isPendingSync
                        ? "text-amber-700"
                        : "text-green-700"
                    }`}
                  >
                    Change
                  </span>

                  <span
                    className={`text-lg font-black ${
                      isPendingSync
                        ? "text-amber-700"
                        : "text-green-700"
                    }`}
                  >
                    {formatCurrency(changeAmount)}
                  </span>

                </div>

              </div>

            </div>
          </div>

          {/* OFFLINE TRANSACTION NOTICE */}
          {isPendingSync && (
            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4">

              <p className="text-xs font-bold uppercase tracking-wider text-amber-800">
                Important Notice
              </p>

              <p className="mt-2 text-xs leading-relaxed text-amber-700">
                Keep this receipt for your records. This transaction
                is stored locally and will not appear in online sales,
                inventory or reports until synchronization is completed.
              </p>

              {sale.client_transaction_id && (
                <p className="mt-2 break-all text-[10px] text-amber-600">
                  Transaction ID: {sale.client_transaction_id}
                </p>
              )}

            </div>
          )}

          {/* FOOTER */}
          <div className="mt-6 text-center">

            <div className="mx-auto mb-3 h-px w-24 bg-gray-200" />

            <p className="text-sm font-bold text-gray-900">
              Thank you for shopping with JESTA!
            </p>

            <p className="mt-1 text-xs text-gray-500">
              We appreciate your business.
            </p>

            <p className="mt-3 text-[10px] uppercase tracking-widest text-gray-400">
              Powered by JESTA Technologies
            </p>

          </div>

        </div>
      </div>

      {/* PRINT BUTTON */}
      <div className="receipt-print-controls mx-auto mt-5 flex w-full max-w-md justify-center">

        <button
          type="button"
          onClick={handlePrint}
          className="flex items-center justify-center gap-2 rounded-xl bg-gray-950 px-6 py-3 text-sm font-bold text-white shadow-md transition hover:bg-gray-800 active:scale-[0.98]"
        >
          <Printer size={18} />
          Print Receipt
        </button>

      </div>
    </>
  );
}

export default Receipt;

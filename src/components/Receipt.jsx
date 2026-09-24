import { Printer } from "lucide-react";

function Receipt({ sale }) {
  if (!sale) {
    return null;
  }

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

    return new Date(date).toLocaleString("en-KE", {
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
        <div className="border-b border-gray-200 bg-green-50 px-5 py-4 text-center">
          <div className="flex items-center justify-center gap-2 text-green-700">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-green-600 text-white">
              ✓
            </div>

            <span className="text-sm font-bold">
              SALE COMPLETED
            </span>
          </div>
        </div>

        <div className="p-6">
          {/* SALE DETAILS */}
          <div className="rounded-xl bg-gray-50 p-4">
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <p className="text-gray-500">Sale Number</p>
                <p className="mt-1 font-bold text-gray-900">
                  {sale.sale_number || "-"}
                </p>
              </div>

              <div className="text-right">
                <p className="text-gray-500">Date & Time</p>
                <p className="mt-1 font-medium text-gray-900">
                  {formatDate(
                    sale.sale_date || sale.created_at
                  )}
                </p>
              </div>

              <div>
                <p className="text-gray-500">Customer</p>
                <p className="mt-1 font-medium text-gray-900">
                  {sale.customer_name || "Walk-in Customer"}
                </p>
              </div>

              <div className="text-right">
                <p className="text-gray-500">Payment</p>
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
                const unitPrice = Number(item.unit_price || 0);

                const itemTotal =
                  Number(item.total_amount || 0) ||
                  quantity * unitPrice;

                return (
                  <div
                    key={item.id || index}
                    className="flex items-start justify-between gap-4"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900">
                        {item.product_name || "Product"}
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
                <span>{formatCurrency(sale.subtotal)}</span>
              </div>

              <div className="flex justify-between text-gray-500">
                <span>Tax</span>
                <span>{formatCurrency(sale.tax_amount)}</span>
              </div>

              <div className="flex justify-between text-gray-500">
                <span>Discount</span>
                <span>
                  {formatCurrency(sale.discount_amount)}
                </span>
              </div>

              <div className="my-3 border-t border-dashed border-gray-300" />

              <div className="flex items-center justify-between">
                <span className="text-base font-bold text-gray-900">
                  TOTAL
                </span>

                <span className="text-xl font-black text-gray-950">
                  {formatCurrency(sale.total_amount)}
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
                  {formatCurrency(sale.amount_paid)}
                </span>
              </div>

              <div className="flex justify-between text-sm">
                <span className="text-gray-500">
                  Balance Due
                </span>

                <span
                  className={`font-bold ${
                    Number(sale.balance_due) > 0
                      ? "text-amber-600"
                      : "text-gray-900"
                  }`}
                >
                  {formatCurrency(sale.balance_due)}
                </span>
              </div>

              <div className="rounded-lg bg-green-50 p-3">
                <div className="flex justify-between">
                  <span className="text-sm font-semibold text-green-700">
                    Change
                  </span>

                  <span className="text-lg font-black text-green-700">
                    {formatCurrency(sale.change_amount)}
                  </span>
                </div>
              </div>
            </div>
          </div>

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
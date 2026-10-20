
const form = document.getElementById("payment-form");
const button = document.getElementById("pay-button");
const status = document.getElementById("payment-status");

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (typeof window.Razorpay !== "function") {
    status.textContent = "Payment checkout could not be loaded.";
    return;
  }

  button.disabled = true;
  status.textContent = "Preparing your payment...";

  try {
    // Create the order on your server.
    const response = await fetch("/api/create-order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        amount: document.getElementById("amount").value
      })
    });

    const order = await response.json();

    if (!response.ok) {
      throw new Error(order.error || "Could not create order.");
    }

    const checkout = new Razorpay({
      key: order.keyId,
      amount: order.amount,
      currency: order.currency,
      name: "Your Business Name",
      description: "Customer payment",
      order_id: order.orderId,

      handler: async (result) => {
        status.textContent = "Verifying payment...";

        try {
          const verification = await fetch("/api/verify-payment", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(result)
          });

          const data = await verification.json();

          if (!verification.ok || !data.verified) {
            throw new Error(data.error || "Verification failed.");
          }

          if (data.paymentStatus === "captured") {
            status.textContent =
              "Payment captured. Reference: " + result.razorpay_payment_id;
          } else {
            status.textContent =
              "Signature verified. Payment status: " +
              data.paymentStatus +
              ". Please wait for final confirmation.";
          }
        } catch (error) {
          status.textContent =
            "We could not confirm your payment yet. Please contact support " +
            "with payment reference " + result.razorpay_payment_id +
            ". Do not pay again until the status is checked.";
        } finally {
          button.disabled = false;
        }
      },

      modal: {
        ondismiss: () => {
          status.textContent =
            "Checkout closed. Check your payment status before retrying.";
          button.disabled = false;
        }
      },

      theme: { color: "#1769ff" }
    });

    checkout.on("payment.failed", (result) => {
      status.textContent =
        result.error?.description || "Payment failed. Please check the status.";
      button.disabled = false;
    });

    checkout.open();
  } catch (error) {
    status.textContent = error.message || "Unable to start payment.";
    button.disabled = false;
  }
});

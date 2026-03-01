const getActivationEmailTemplate = (name, activationUrl) => {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Welcome to Our Platform</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f4;">
    <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f4f4f4;">
        <tr>
            <td align="center" style="padding: 40px 20px;">
                <table role="presentation" style="max-width: 600px; width: 100%; border-collapse: collapse; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                    <!-- Header -->
                    <tr>
                        <td style="padding: 40px 40px 30px; text-align: center; background: linear-gradient(135deg, #38513b 0%, #2f4232 100%); border-radius: 8px 8px 0 0;">
                            <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600;">Welcome to Our Platform!</h1>
                        </td>
                    </tr>
                    
                    <!-- Content -->
                    <tr>
                        <td style="padding: 40px 40px 30px;">
                            <p style="margin: 0 0 20px; color: #333333; font-size: 16px; line-height: 1.6;">
                                Hello <strong style="color: #38513b;">${name}</strong>,
                            </p>
                            <p style="margin: 0 0 20px; color: #333333; font-size: 16px; line-height: 1.6;">
                                Thank you for registering with us! We're excited to have you on board.
                            </p>
                            <p style="margin: 0 0 30px; color: #333333; font-size: 16px; line-height: 1.6;">
                                To complete your registration and activate your account, please click the button below. You'll be asked to provide some additional information to finalize your account setup.
                            </p>
                            
                            <!-- CTA Button -->
                            <table role="presentation" style="width: 100%; border-collapse: collapse; margin: 30px 0;">
                                <tr>
                                    <td align="center" style="padding: 0;">
                                        <a href="${activationUrl}" style="display: inline-block; padding: 16px 40px; background-color: #38513b; color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: 600; text-align: center; box-shadow: 0 2px 4px rgba(56, 81, 59, 0.3);">
                                            Activate Your Account
                                        </a>
                                    </td>
                                </tr>
                            </table>
                            
                            <p style="margin: 30px 0 0; color: #666666; font-size: 14px; line-height: 1.6;">
                                If the button doesn't work, you can copy and paste the following link into your browser:
                            </p>
                            <p style="margin: 10px 0 0; color: #38513b; font-size: 14px; word-break: break-all;">
                                ${activationUrl}
                            </p>
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td style="padding: 30px 40px; background-color: #f8f9fa; border-radius: 0 0 8px 8px; border-top: 1px solid #e9ecef;">
                            <p style="margin: 0 0 10px; color: #666666; font-size: 14px; line-height: 1.6;">
                                <strong>Important:</strong> This activation link will expire in 5 minutes for security reasons.
                            </p>
                            <p style="margin: 0; color: #999999; font-size: 12px; line-height: 1.6;">
                                If you didn't create an account with us, please ignore this email.
                            </p>
                            <p style="margin: 20px 0 0; color: #999999; font-size: 12px; line-height: 1.6; text-align: center;">
                                © ${new Date().getFullYear()} Our Platform. All rights reserved.
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
  `;
};

const baseStyles = "margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f4;";
const boxStyle = "max-width: 600px; width: 100%; border-collapse: collapse; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);";
const headerStyle = "padding: 24px 32px; text-align: center; background: linear-gradient(135deg, #38513b 0%, #2f4232 100%); border-radius: 8px 8px 0 0;";
const contentStyle = "padding: 24px 32px; color: #333333; font-size: 15px; line-height: 1.6;";
const footerStyle = "padding: 20px 32px; background-color: #f8f9fa; border-radius: 0 0 8px 8px; border-top: 1px solid #e9ecef; color: #999999; font-size: 12px;";

function wrapHtml(title, body) {
  return `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>${title}</title></head>
<body style="${baseStyles}">
<table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f4f4f4;">
<tr><td align="center" style="padding: 32px 20px;">
<table role="presentation" style="${boxStyle}">
<tr><td style="${headerStyle}"><h1 style="margin: 0; color: #ffffff; font-size: 22px; font-weight: 600;">${title}</h1></td></tr>
<tr><td style="${contentStyle}">${body}</td></tr>
<tr><td style="${footerStyle}">You received this email because of your account. © ${new Date().getFullYear()}</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}

function getOrderConfirmationEmail(buyerName, orderId, totalFormatted, orderLink) {
  const body = `
<p>Hello <strong>${buyerName}</strong>,</p>
<p>Your order has been confirmed. Thank you for your purchase.</p>
<p><strong>Order ID:</strong> ${orderId}</p>
<p><strong>Total:</strong> ${totalFormatted}</p>
<p><a href="${orderLink}" style="display: inline-block; padding: 12px 24px; background-color: #38513b; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600;">View order</a></p>
  `;
  return wrapHtml("Order confirmed", body);
}

function getNewOrderSellerEmail(sellerName, buyerName, orderId, productSummary, totalFormatted, orderLink) {
  const body = `
<p>Hello <strong>${sellerName}</strong>,</p>
<p>You have received a new order from ${buyerName}.</p>
<p><strong>Order ID:</strong> ${orderId}</p>
<p><strong>Items:</strong> ${productSummary}</p>
<p><strong>Total:</strong> ${totalFormatted}</p>
<p><a href="${orderLink}" style="display: inline-block; padding: 12px 24px; background-color: #38513b; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600;">View order</a></p>
  `;
  return wrapHtml("New order received", body);
}

function getOrderShippedEmail(buyerName, orderId, trackingCode, orderLink) {
  const tracking = trackingCode ? ` Tracking: ${trackingCode}` : "";
  const body = `
<p>Hello <strong>${buyerName}</strong>,</p>
<p>Your order <strong>#${orderId}</strong> has been shipped.${tracking}</p>
<p><a href="${orderLink}" style="display: inline-block; padding: 12px 24px; background-color: #38513b; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600;">Track order</a></p>
  `;
  return wrapHtml("Order shipped", body);
}

function getOrderDeliveredEmail(buyerName, orderId, orderLink) {
  const body = `
<p>Hello <strong>${buyerName}</strong>,</p>
<p>Your order <strong>#${orderId}</strong> has been delivered. We hope you're happy with your purchase.</p>
<p><a href="${orderLink}" style="display: inline-block; padding: 12px 24px; background-color: #38513b; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600;">View order</a></p>
  `;
  return wrapHtml("Order delivered", body);
}

function getRefundRequestedBuyerEmail(buyerName, orderId, orderLink) {
  const body = `
<p>Hello <strong>${buyerName}</strong>,</p>
<p>We have received your refund request for order <strong>#${orderId}</strong>. The seller will review it and you will be notified of the outcome.</p>
<p><a href="${orderLink}" style="display: inline-block; padding: 12px 24px; background-color: #38513b; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600;">View order</a></p>
  `;
  return wrapHtml("Refund request received", body);
}

function getRefundRequestedSellerEmail(sellerName, buyerName, orderId, orderLink) {
  const body = `
<p>Hello <strong>${sellerName}</strong>,</p>
<p>${buyerName} has requested a refund for order <strong>#${orderId}</strong>. Please review and approve or decline from your Disputes and Refunds page.</p>
<p><a href="${orderLink}" style="display: inline-block; padding: 12px 24px; background-color: #38513b; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600;">Review refund</a></p>
  `;
  return wrapHtml("Refund request from customer", body);
}

function getRefundApprovedEmail(buyerName, orderId, amountFormatted, orderLink) {
  const body = `
<p>Hello <strong>${buyerName}</strong>,</p>
<p>Your refund for order <strong>#${orderId}</strong> has been approved. The amount of <strong>${amountFormatted}</strong> will be returned to your original payment method.</p>
<p><a href="${orderLink}" style="display: inline-block; padding: 12px 24px; background-color: #38513b; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600;">View order</a></p>
  `;
  return wrapHtml("Refund approved", body);
}

function getRefundRejectedEmail(buyerName, orderId, orderLink) {
  const body = `
<p>Hello <strong>${buyerName}</strong>,</p>
<p>Unfortunately, your refund request for order <strong>#${orderId}</strong> was declined by the seller. You can contact them via inbox if you have questions.</p>
<p><a href="${orderLink}" style="display: inline-block; padding: 12px 24px; background-color: #38513b; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600;">View order</a></p>
  `;
  return wrapHtml("Refund request declined", body);
}

module.exports = {
  getActivationEmailTemplate,
  getOrderConfirmationEmail,
  getNewOrderSellerEmail,
  getOrderShippedEmail,
  getOrderDeliveredEmail,
  getRefundRequestedBuyerEmail,
  getRefundRequestedSellerEmail,
  getRefundApprovedEmail,
  getRefundRejectedEmail,
};







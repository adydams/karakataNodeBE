const nodemailer = require("nodemailer");
const PDFDocument = require("pdfkit");

class EmailService {
  async sendEmail({ to, subject, text, html, attachments = [] }) {
    try {
      // Ensure credentials are provided
      if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
        throw new Error('SMTP credentials (SMTP_USER, SMTP_PASS) are missing from environment variables.');
      }

      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });

      const mailOptions = {
        from: `"Karakata Commerce" <${process.env.SMTP_USER}>`,
        to,
        subject,
        text,
        html,
        attachments,
      };

      const info = await transporter.sendMail(mailOptions);
      console.log("Email sent: %s", info.messageId);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error("Email sending error:", error);
      return { success: false, error: error.message };
    }
  }

  async generateInvoicePdf(orderDetails) {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          margin: 42,
          size: 'A4',
          bufferPages: true
        });

        // Embed a font that supports the Naira symbol (₦)
        const fontPath = 'C:/Windows/Fonts/arial.ttf';
        const fontBoldPath = 'C:/Windows/Fonts/arialbd.ttf';

        try {
          doc.font(fontPath);
        } catch (e) {
          console.warn("Could not load Arial font, falling back to Helvetica");
        }

        const buffers = [];
        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => resolve(Buffer.concat(buffers)));
        doc.on('error', reject);

        const {
          orderId,
          totalAmount,
          shippingFee = 0,
          customerName,
          customerEmail,
          customerPhone,
          shippingAddress,
          shippingDetails = {},
          status,
          createdAt,
          items = []
        } = orderDetails;
        const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
        const left = doc.page.margins.left;
        const right = left + pageWidth;
        const money = value => `₦${Number(value || 0).toLocaleString("en-NG", { minimumFractionDigits: 2 })}`;
        const date = createdAt ? new Date(createdAt).toLocaleDateString("en-US", {
          month: "long", day: "numeric", year: "numeric"
        }) : new Date().toLocaleDateString();
        const subTotal = items.reduce((sum, item) => sum + Number(item.subtotal || 0), 0);
        const baseFee = Number(shippingDetails.baseFee || 0);
        const sourcingFee = Number(shippingDetails.sourcingFee || Math.max(Number(shippingFee) - baseFee, 0));

        doc.rect(0, 0, doc.page.width, doc.page.height).fill("#fffdf9");
        doc.fillColor("#f57c00").font(fontBoldPath).fontSize(22).text("K", left, 42, {
          width: 42, height: 42, align: "center", valign: "center"
        });
        doc.fillColor("#574235").font(fontBoldPath).fontSize(18).text("Karakata Marketplace", left + 55, 47);
        doc.fillColor("#888").font(fontPath).fontSize(9).text("Lagos, Nigeria", left + 55, 70);
        doc.fillColor("#d9d0ca").font(fontBoldPath).fontSize(30).text("INVOICE", right - 170, 46, { width: 170, align: "right" });
        doc.fillColor("#574235").font(fontPath).fontSize(10).text(`#${orderId?.slice(0, 8) || "N/A"}`, right - 170, 82, { width: 170, align: "right" });

        let currentY = 125;
        doc.strokeColor("#e8e1db").dash(2, { space: 5 }).moveTo(left, currentY).lineTo(right, currentY).stroke().undash();
        currentY += 22;

        doc.fillColor("#999").font(fontBoldPath).fontSize(8).text("BILL TO", left, currentY);
        doc.fillColor("#574235").font(fontBoldPath).fontSize(11).text(customerName || "Customer", left, currentY + 16);
        doc.font(fontPath).fontSize(9).text(customerEmail || "N/A", left, currentY + 32);
        doc.text(customerPhone || "N/A", left, currentY + 46);
        doc.text(shippingAddress || "N/A", left, currentY + 60, { width: 220 });

        const metaX = right - 220;
        doc.fillColor("#999").font(fontBoldPath).fontSize(8).text("ORDER DATE", metaX, currentY);
        doc.fillColor("#574235").font(fontPath).fontSize(10).text(date, metaX, currentY + 16);
        doc.fillColor("#999").font(fontBoldPath).fontSize(8).text("STATUS", metaX + 110, currentY);
        doc.fillColor("#f57c00").font(fontBoldPath).fontSize(10).text(status || "PAID", metaX + 110, currentY + 16);

        currentY += 105;
        doc.fillColor("#574235").font(fontBoldPath).fontSize(10).text("PRODUCT", left, currentY);
        doc.text("QTY", left + 290, currentY);
        doc.text("PRICE", left + 345, currentY);
        doc.text("TOTAL", right - 75, currentY, { width: 75, align: "right" });
        doc.strokeColor("#e8e1db").moveTo(left, currentY + 18).lineTo(right, currentY + 18).stroke();
        currentY += 32;

        items.forEach(item => {
          doc.fillColor("#574235").font(fontPath).fontSize(10).text(item.productName || "Unknown Product", left, currentY, { width: 270 });
          doc.fillColor("#777").text(String(item.quantity || 0), left + 290, currentY);
          doc.text(money(item.price), left + 345, currentY);
          doc.fillColor("#574235").font(fontBoldPath).text(money(item.subtotal), right - 75, currentY, { width: 75, align: "right" });
          currentY += 25;
        });

        currentY += 8;
        doc.strokeColor("#e8e1db").moveTo(left, currentY).lineTo(right, currentY).stroke();
        currentY += 20;
        const summaryX = right - 225;
        const summaryRow = (label, value, bold = false) => {
          doc.fillColor(bold ? "#f57c00" : "#777").font(bold ? fontBoldPath : fontPath).fontSize(bold ? 13 : 9)
            .text(label, summaryX, currentY);
          doc.text(value, right - 90, currentY, { width: 90, align: "right" });
          currentY += bold ? 27 : 18;
        };
        summaryRow("Sub Total", money(subTotal));
        summaryRow("Courier Base Fee", money(baseFee));
        summaryRow("Sourcing Fee", money(sourcingFee));
        summaryRow("Shipping Total", money(shippingFee));
        doc.strokeColor("#e8e1db").moveTo(summaryX, currentY).lineTo(right, currentY).stroke();
        currentY += 14;
        summaryRow("Order Total", money(totalAmount), true);
        doc.fillColor("#999").font(fontPath).fontSize(9).text("Thank you for choosing Karakata Marketplace!", left, doc.page.height - 55, { align: "center", width: pageWidth });

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  async streamInvoicePdf(orderDetails, res) {
    try {
      const buffer = await this.generateInvoicePdf(orderDetails);
      res.send(buffer);
    } catch (error) {
      console.error("Error generating PDF buffer:", error);
      if (!res.headersSent) {
        res.status(500).send("Error generating PDF");
      }
    }
  }

  async sendNotificationEmail(userEmail, title, message) {
    return this.sendEmail({
      to: userEmail,
      subject: `[Karakata] ${title}`,
      text: message,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: auto; border: 1px solid #eee; padding: 20px; border-radius: 10px;">
          <h2 style="color: #ea580c;">Karakata Commerce</h2>
          <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
          <h3 style="color: #333;">${title}</h3>
          <p style="color: #666; line-height: 1.5;">${message}</p>
          <div style="margin-top: 30px; text-align: center;">
            <a href="${process.env.FRONTEND_URL}/orders" style="background: #ea580c; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">
              View Your Account
            </a>
          </div>
        </div>
      `,
    });
  }

  async sendWelcomeEmail(userEmail, name) {
    return this.sendEmail({
      to: userEmail,
      subject: "Welcome to Karakata Commerce!",
      text: `Hi ${name}, welcome to the Karakata community!`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: auto; border: 1px solid #eee; padding: 20px; border-radius: 10px;">
          <h2 style="color: #ea580c;">Welcome to Karakata!</h2>
          <p style="color: #666; font-size: 16px;">Hi ${name},</p>
          <p style="color: #666; line-height: 1.5;">Thank you for joining Karakata Commerce. You can now start shopping from our distributed network of stores and pickup stations.</p>
          <div style="margin-top: 30px; text-align: center;">
            <a href="${process.env.FRONTEND_URL}" style="background: #ea580c; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">
              Start Shopping Now
            </a>
          </div>
        </div>
      `,
    });
  }

  async sendLoginAlert(userEmail) {
    return this.sendEmail({
      to: userEmail,
      subject: "Security Alert: New Login Detected",
      text: "A new login was detected on your Karakata account. If this wasn't you, please reset your password immediately.",
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: auto; border: 1px solid #eee; padding: 20px; border-radius: 10px;">
          <h2 style="color: #d32f2f;">Security Alert</h2>
          <p style="color: #666; line-height: 1.5;">A new login was detected on your account. If this was you, you can safely ignore this email.</p>
          <p style="color: #666; line-height: 1.5; font-weight: bold;">If this was NOT you, please secure your account immediately.</p>
          <div style="margin-top: 30px; text-align: center;">
            <a href="${process.env.FRONTEND_URL}/profile" style="background: #d32f2f; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">
              Secure My Account
            </a>
          </div>
        </div>
      `,
    });
  }

  async sendInvoiceEmail(userEmail, orderDetails) {
    const { orderId, totalAmount, customerName, items } = orderDetails;

    const itemsHtml = items.map(item => `
      <tr style="border-bottom: 1px solid #eee;">
        <td style="padding: 10px 0; color: #666;">${item.productName} (x${item.quantity})</td>
        <td style="padding: 10px 0; text-align: right; color: #333; font-weight: bold;">₦${item.subtotal.toLocaleString()}</td>
      </tr>
    `).join('');

    const pdfBuffer = await this.generateInvoicePdf(orderDetails);

    return this.sendEmail({
      to: userEmail,
      subject: `Invoice for Order #${orderId.slice(0, 8)}`,
      text: `Hi ${customerName}, here is your invoice for order #${orderId.slice(0, 8)}. Total: ₦${totalAmount}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: auto; border: 1px solid #eee; padding: 20px; border-radius: 10px;">
          <h2 style="color: #ea580c;">Order Invoice</h2>
          <p style="color: #666;">Hi ${customerName}, thank you for your order!</p>
          <div style="margin: 20px 0; background: #f9f9f9; padding: 15px; border-radius: 8px;">
            <p style="margin: 0; font-size: 14px; color: #888;">Order ID: ${orderId}</p>
            <p style="margin: 0; font-size: 18px; font-weight: bold; color: #333;">Total Amount: ₦${totalAmount.toLocaleString()}</p>
          </div}
          <table style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr style="border-bottom: 2px solid #eee; text-align: left;">
                <th style="padding-bottom: 10px; color: #888; font-size: 14px;">Item</th>
                <th style="padding-bottom: 10px; text-align: right; color: #888; font-size: 14px;">Price</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>
          <div style="margin-top: 30px; text-align: center;">
            <a href="${process.env.FRONTEND_URL}/invoice/${orderId}" style="background: #ea580c; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">
              View Full Invoice & Tracking
            </a>
          </div>
        </div>
      `,
      attachments: [
        {
          filename: `Invoice_${orderId.slice(0, 8)}.pdf`,
          content: pdfBuffer,
          contentType: 'application/pdf'
        }
      ]
    });
  }
}

module.exports = new EmailService();

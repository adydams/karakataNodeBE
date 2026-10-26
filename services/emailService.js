const nodemailer = require("nodemailer");
const PDFDocument = require("pdfkit");
const axios = require("axios");

// pdfkit only embeds JPEG/PNG; product images are often AVIF/WebP from
// Cloudinary, so convert to PNG before embedding.
let sharp = null;
try { sharp = require("sharp"); } catch (_) { /* optional */ }

async function toPdfSafeImage(imageUrl) {
  const response = await axios.get(imageUrl, { responseType: "arraybuffer", timeout: 5000 });
  let data = Buffer.from(response.data);
  const isJpeg = data[0] === 0xff && data[1] === 0xd8;
  const isPng = data[0] === 0x89 && data[1] === 0x50;
  if (isJpeg || isPng || !sharp) return data;
  return sharp(data).png().toBuffer();
}

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
    return new Promise(async (resolve, reject) => {
      try {
        const doc = new PDFDocument({
          margin: 0,
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

        await this.renderInvoicePage(doc, orderDetails, fontPath, fontBoldPath);
        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  async renderInvoicePage(doc, orderDetails, fontPath, fontBoldPath) {
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
    const width = doc.page.width;
    const height = doc.page.height;
    const money = value => `₦${Number(value || 0).toLocaleString("en-NG", { minimumFractionDigits: 2 })}`;
    const date = createdAt ? new Date(createdAt).toLocaleDateString("en-US", {
      month: "long", day: "numeric", year: "numeric"
    }) : new Date().toLocaleDateString();
    const subTotal = items.reduce((sum, item) => sum + Number(item.subtotal || 0), 0);
    const baseFee = Number(shippingDetails.baseFee || 0);
    const sourcingFee = Number(shippingDetails.sourcingFee || Math.max(Number(shippingFee) - baseFee, 0));
    const left = 48;
    const contentWidth = width - 96;
    const right = left + contentWidth;
    const orange = "#f45100";
    const navy = "#16284f";
    const muted = "#52617d";

    // Keep the downloaded PDF visually consistent with the invoice shown in the browser.
    doc.rect(0, 0, width, height).fill("#fff7ed");
    // Soft decorative shapes mirror the checkout confirmation without affecting readability.
    [
      [28, 18, 92, "#fed7aa"],
      [width - 30, 155, 70, "#fdba74"],
      [width - 5, 410, 90, "#fed7aa"],
      [80, height - 18, 78, "#ffedd5"],
      [width - 120, height - 15, 105, "#ccfbf1"]
    ].forEach(([x, y, radius, color]) => {
      doc.circle(x, y, radius).fillOpacity(0.7).fill(color).fillOpacity(1);
    });
    doc.circle(34, 315, 45).lineWidth(8).strokeOpacity(0.18).stroke("#f7a400");
    doc.circle(34, 315, 60).lineWidth(5).strokeOpacity(0.12).stroke("#f7a400");

    doc.fillColor(navy).font(fontBoldPath).fontSize(27)
      .text("Thank you for", left, 48);
    doc.text("your purchase!", left, 82);
    doc.fillColor(muted).font(fontPath).fontSize(9.5)
      .text("Your order will be processed within 24 hours during working days.", left, 132, { width: 225, lineGap: 2 });
    doc.text("We will notify you by email once your order has been shipped.", left, 164, { width: 225, lineGap: 2 });

    const summaryX = 300;
    doc.fillColor(navy).font(fontBoldPath).fontSize(15).text("Order Summary", summaryX, 70);
    doc.strokeColor("#dce5e5").dash(1, { space: 5 }).moveTo(summaryX, 103).lineTo(right, 103).stroke().undash();
    const meta = [
      ["Date", date],
      ["Order Number", orderId?.slice(0, 8) || "N/A"],
      ["Status", status || "PAID"]
    ];
    meta.forEach(([label, value], index) => {
      const x = summaryX + index * 96;
      doc.fillColor(navy).font(fontPath).fontSize(8).text(label, x, 120);
      doc.fillColor(index === 2 ? orange : navy).font(fontBoldPath).fontSize(9)
        .text(value, x, 137, { width: 88, lineGap: 1 });
      if (index < 2) doc.strokeColor("#dce5e5").moveTo(x + 82, 117).lineTo(x + 82, 166).stroke();
    });
    doc.strokeColor("#dce5e5").dash(1, { space: 5 }).moveTo(summaryX, 181).lineTo(right, 181).stroke().undash();

    doc.fillColor(navy).font(fontBoldPath).fontSize(13).text("Billing Address", left, 214);
    const details = [
      ["Name:", customerName || "Customer"],
      ["Address:", shippingAddress || "N/A"],
      ["Phone:", customerPhone || "N/A"],
      ["Email:", customerEmail || "N/A"]
    ];
    let detailY = 250;
    details.forEach(([label, value]) => {
      doc.fillColor(muted).font(fontBoldPath).fontSize(8.5).text(label, left, detailY);
      doc.fillColor(navy).font(fontPath).fontSize(9).text(value, left + 54, detailY, { width: 205, lineGap: 1 });
      detailY += label === "Address:" ? 34 : 19;
    });

    const cardX = summaryX;
    let cardY = 208;
    for (const [index, item] of items.entries()) {
      const cardHeight = 72;
      doc.roundedRect(cardX, cardY, right - cardX, cardHeight, 6).fill("#ffffff");
      doc.roundedRect(cardX, cardY, right - cardX, cardHeight, 6).strokeColor("#d9e5e5").stroke();
      const image = item.productImage || item.image;
      if (image && /^https?:\/\//i.test(image)) {
        try {
          const imageData = await toPdfSafeImage(image);
          doc.image(imageData, cardX + 8, cardY + 8, { fit: [58, 56], align: "center", valign: "center" });
        } catch (imageError) {
          doc.roundedRect(cardX + 8, cardY + 8, 58, 56, 4).fill("#f1f5f4");
        }
      } else {
        doc.roundedRect(cardX + 8, cardY + 8, 58, 56, 4).fill("#f1f5f4");
      }
      doc.fillColor(navy).font(fontBoldPath).fontSize(9.5)
        .text(item.productName || "Unknown Product", cardX + 78, cardY + 19, { width: 120 });
      doc.fillColor(muted).font(fontPath).fontSize(8).text(`Quantity: ${item.quantity || 0}`, cardX + 78, cardY + 38);
      doc.fillColor(navy).font(fontBoldPath).fontSize(10).text(money(item.subtotal), right - 92, cardY + 26, { width: 82, align: "right" });
      cardY += cardHeight + 8;
      if (index >= 7 && items.length > 8) break;
    }

    let totalY = Math.max(cardY + 15, 430);
    doc.strokeColor("#dce5e5").dash(1, { space: 5 }).moveTo(summaryX, totalY).lineTo(right, totalY).stroke().undash();
    totalY += 22;
    const rows = [
      ["Sub Total", subTotal],
      ["Courier Base Fee", baseFee],
      ["Sourcing Fee", sourcingFee],
      ["Shipping Total", shippingFee]
    ];
    rows.forEach(([label, value]) => {
      doc.fillColor(muted).font(fontPath).fontSize(8.5).text(label, summaryX + 12, totalY);
      doc.text(money(value), right - 92, totalY, { width: 82, align: "right" });
      totalY += 18;
    });
    doc.strokeColor("#dce5e5").dash(1, { space: 5 }).moveTo(summaryX, totalY).lineTo(right, totalY).stroke().undash();
    totalY += 20;
    doc.fillColor(navy).font(fontBoldPath).fontSize(13).text("Order Total", summaryX + 12, totalY);
    doc.text(money(totalAmount), right - 110, totalY, { width: 100, align: "right" });
    doc.fillColor(muted).font(fontPath).fontSize(8).text(`Invoice #${orderId || "N/A"}`, left, height - 45);
    doc.text("Karakata Commerce • Lagos, Nigeria", right - 190, height - 45, { width: 190, align: "right" });
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

  async generateInvoiceBundlePdf(invoices) {
        return new Promise(async (resolve, reject) => {
          try {
            const doc = new PDFDocument({ margin: 0, size: "A4", bufferPages: true });
            const fontPath = "C:/Windows/Fonts/arial.ttf";
            const fontBoldPath = "C:/Windows/Fonts/arialbd.ttf";
            try {
              doc.font(fontPath);
            } catch (error) {
              console.warn("Could not load Arial font, falling back to Helvetica");
            }

            const buffers = [];
            doc.on("data", buffers.push.bind(buffers));
            doc.on("end", () => resolve(Buffer.concat(buffers)));
            doc.on("error", reject);

            for (const [index, invoice] of invoices.entries()) {
              if (index > 0) doc.addPage();
              await this.renderInvoicePage(doc, invoice, fontPath, fontBoldPath);
            }

            doc.end();
          } catch (error) {
            reject(error);
          }
        });
  }

  async streamInvoiceBundlePdf(invoices, res) {
    try {
      const buffer = await this.generateInvoiceBundlePdf(invoices);
      res.send(buffer);
    } catch (error) {
      console.error("Error generating invoice bundle:", error);
      if (!res.headersSent) res.status(500).send("Error generating invoice bundle");
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

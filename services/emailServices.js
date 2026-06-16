const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  }
});

const sendEmail = async ({
  to,
  subject,
  text,
  html
}) => {
  try {
    const info = await transporter.sendMail({
      from: `"E-Commerce App" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      text,
      html
    });

    //console.log("Email sent:", info.messageId);

    return {
      success: true,
      messageId: info.messageId
    };
  } catch (error) {
    console.error("Email Error:", error);

    throw new Error("Failed to send email");
  }
};

module.exports = {
  sendEmail
};
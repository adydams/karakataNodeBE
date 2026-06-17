const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
   //host: process.env.EMAIL_HOST,
  // port: process.env.EMAIL_PORT,  
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
    console.log(`Sending email to: ${to}, subject: ${subject}`);
    const info = await transporter.sendMail({
      from: `"Karakata E-Commerce App" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      text,
      html
    });

    console.log("Email sent: %s", info.messageId);

    return {
      success: true, 
      messageId: info.messageId
    };
  } catch (error) {
    console.error("Email Error: %s", error);
    throw new Error("Failed to send email");
  }
};

module.exports = {
  sendEmail
};
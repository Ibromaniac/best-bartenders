const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// 🔥 ADD THIS
transporter.verify((error, success) => {
  if (error) {
    console.error("❌ SMTP VERIFY FAILED:", error);
  } else {
    console.log("✅ SMTP READY");
  }
});

async function sendEmail({ to, subject, html }) {
  try {
    const info = await transporter.sendMail({
      from: `"B.E.S.T Bartenders" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html
    });

    console.log("✅ Email sent:", info.response);
  } catch (err) {
    console.error("❌ Email failed:", err);
  }
}

module.exports = sendEmail;

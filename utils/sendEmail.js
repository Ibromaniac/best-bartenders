async function sendEmail({ to, subject, html }) {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM,
      to: [to],
      subject,
      html,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    console.error("RESEND EMAIL ERROR:", data);
    throw new Error(data.message || "Failed to send email");
  }

  return data;
}

module.exports = sendEmail;
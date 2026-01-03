require("dotenv").config();
const crypto = require("crypto"); // put at top of server.js
const sendEmail = require("./utils/sendEmail");
const bcrypt = require("bcrypt");
const Booking = require("./best-bartenders/models/booking");
const mongoose = require("mongoose");
const session = require("express-session");
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log("MongoDB Connected"))
  .catch(err => console.log(err));

const express = require("express");
const path = require("path");
const cloudinary = require("cloudinary").v2;
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});



const Customer = require("./best-bartenders/models/customer");
const Bartender = require("./best-bartenders/models/bartender");

const multer = require("multer");



// -----------------------
// CLOUDINARY STORAGE
// -----------------------
// -----------------------
// CLOUDINARY STORAGE (FIXED)
// -----------------------
const { CloudinaryStorage } = require("multer-storage-cloudinary");

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: (req, file) => {
    let folder = "best-bartenders/misc";
    let resource_type = "auto"; // allows images + PDFs

    if (file.fieldname === "profile_photo") {
      folder = "best-bartenders/bartenders";
    }

    if (file.fieldname === "bartending_license") {
      folder = "best-bartenders/licenses";
    }

    if (file.fieldname === "government_id") {
      folder = "best-bartenders/ids";
    }

    return {
      folder,
      resource_type
    };
  }
});

const upload = multer({ storage });


// -----------------------
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: "bestbartenders_secret_key",
  resave: false,
  saveUninitialized: false
}));

// Serve static
app.use(express.static(path.join(__dirname, "public")));

// -----------------------
// GET ROUTES
// -----------------------
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "views", "Home-Page.html"));
});

// CUSTOMER ROUTES
app.get("/customer-login", (req, res) => {
    res.sendFile(path.join(__dirname, "views", "customer-login.html"));
});

app.get("/customer-registration", (req, res) => {
    res.sendFile(path.join(__dirname, "views", "customer-registration.html"));
});

app.get("/registration-success", (req, res) => {
    res.sendFile(path.join(__dirname, "views", "registration-success.html"));
});

app.get("/booking-success", (req, res) => {
  res.sendFile(path.join(__dirname, "views", "booking-success.html"));
});

app.get("/customer-dashboard", (req, res) => {
  if (!req.session.customerId) {
    return res.redirect("/customer-login");
  }

  res.sendFile(path.join(__dirname, "views", "customer-dashboard.html"));
});

// BARTENDER ROUTES
app.get("/bartenders-login", (req, res) => {
    res.sendFile(path.join(__dirname, "views", "bartenders-login.html"));
});

app.get("/bartender-registration", (req, res) => {
    res.sendFile(path.join(__dirname, "views", "bartender-registration.html"));
});

app.get("/bartender-registration-success", (req, res) => {
    res.sendFile(path.join(__dirname, "views", "bartender-registration-success.html"));
});

app.get("/booking-details", (req, res) => {
  if (!req.session.customerId) {
    return res.redirect("/customer-login");
  }

  res.sendFile(path.join(__dirname, "views", "booking-details.html"));
});


// -----------------------
// CUSTOMER REGISTRATION (FIXED)
// -----------------------

app.post("/customer-registration", async (req, res) => {
  const { firstname, lastname, address, email, phone, password } = req.body;
  

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const verificationToken = crypto.randomBytes(32).toString("hex");
const verificationExpires = Date.now() + 24 * 60 * 60 * 1000; // 24 hours


const customer = await Customer.create({
  firstname,
  lastname,
  address,
  email,
  phone,
  password: hashedPassword,
  emailVerified: false,
  emailVerificationToken: verificationToken,
  emailVerificationExpires: verificationExpires
});



    const verifyUrl = `${process.env.BASE_URL}/verify-email/${verificationToken}`;

    await sendEmail({
      to: customer.email,
      subject: "Verify your email – B.E.S.T Bartenders",
      html: `
        <h2>Welcome to B.E.S.T Bartenders 🍸</h2>
        <p>Please verify your email to activate your account.</p>
        <a href="${verifyUrl}"
           style="display:inline-block;margin-top:16px;padding:12px 22px;
           background:#d4af37;color:#000;text-decoration:none;
           border-radius:6px;font-weight:bold;">
           Verify Email
        </a>
        
      `
    });

    res.redirect("/registration-success");

  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).send("Email already registered");
    }
    console.error("❌ CUSTOMER REG ERROR:", err);
    res.status(500).send("Customer registration failed");
  }
});

app.get("/verify-email/:token", async (req, res) => {
  try {
    const customer = await Customer.findOne({
  emailVerificationToken: req.params.token,
  emailVerificationExpires: { $gt: Date.now() }
});


    if (!customer) {
      return res.send("Invalid or expired verification link.");
    }

    customer.emailVerified = true;
    customer.emailVerificationToken = null;
    await customer.save();

    res.sendFile(
  path.join(__dirname, "views", "email-verified.html")
);


  } catch (err) {
    console.error("Verification error:", err);
    res.status(500).send("Verification failed");
  }
});

// -----------------------
// CUSTOMER LOGIN (FIXED)
// -----------------------
app.post("/customer-login", async (req, res) => {
  const { email, password } = req.body;

  try {
    const customer = await Customer.findOne({ email });
    if (!customer) {
      return res.status(401).send("Invalid credentials");
    }

    const isMatch = await bcrypt.compare(password, customer.password);
    if (!isMatch) {
      return res.status(401).send("Invalid credentials");
    }

    if (!customer.emailVerified) {
      return res.send("Please verify your email before logging in.");
    }

    req.session.customerId = customer._id;
    res.redirect("/customer-dashboard");

  } catch (err) {
    console.error("❌ LOGIN ERROR:", err);
    res.status(500).send("Login failed");
  }
});


// =======================
// SMART DASHBOARD REDIRECT
// =======================
app.get("/dashboard", (req, res) => {
  if (req.session.customerId) {
    return res.redirect("/customer-dashboard");
  }

  if (req.session.bartenderId) {
    return res.redirect("/bartender-dashboard");
  }

  // Not logged in
  res.redirect("/choose-login");
});

app.get("/choose-login", (req, res) => {
  res.sendFile(path.join(__dirname, "views", "choose-login.html"));
});

// -----------------------
// BARTENDER REGISTRATION WITH FILES
// -----------------------
app.post(
  "/bartender-registration",
  upload.fields([
    { name: "profile_photo", maxCount: 1 },
    { name: "bartending_license", maxCount: 1 },
    { name: "government_id", maxCount: 1 }
  ]),
  async (req, res) => {
    try {
      const {
        firstname,
        lastname,
        email,
        phone,
        password,
        experience,
        skills,
        rate,
        street,
        apt,
        city,
        state,
        zip,
        licenseNumber
      } = req.body;

      const hashedPassword = await bcrypt.hash(password, 10);
      const files = req.files || {};

      let profilePhotoUrl = "";
if (files.profile_photo && files.profile_photo[0]) {
  profilePhotoUrl = files.profile_photo[0].path;
}

      let bartendingLicenseFile = "";
      if (files.bartending_license && files.bartending_license[0]) {
        bartendingLicenseFile = files.bartending_license[0].path;
      }

      let governmentIdFile = "";
      if (files.government_id && files.government_id[0]) {
        governmentIdFile = files.government_id[0].path;
      }

      await Bartender.create({
        firstname,
        lastname,
        email,
        phone,
        password: hashedPassword,
        experience,
        skills,
        rate,
        street,
        apt,
        city,
        state,
        zip,
        licenseNumber,
        profile_photo: profilePhotoUrl,

        bartending_license: bartendingLicenseFile,
        government_id: governmentIdFile,
        approved: false
      });

      // redirect to success page WITH name + photo in URL
      res.redirect(
        "/bartender-registration-success?name=" +
          encodeURIComponent(firstname) +
          "&photo=" +
          encodeURIComponent(profilePhotoUrl)
      );
    } catch (err) {
      console.log(err);
      res.send("Error registering bartender.");
    }
  }
);

// BARTENDER LOGIN
app.post("/bartenders-login", async (req, res) => {
  const { email, password } = req.body;

  try {
    const bartender = await Bartender.findOne({ email });
    if (!bartender) return res.send("No account found");

    const isMatch = await bcrypt.compare(password, bartender.password);
    if (!isMatch) return res.send("Incorrect password");

    if (!bartender.approved) {
      return res.send("Account under review");
    }

    // ✅ SET SESSION
    req.session.bartenderId = bartender._id;

    // ✅ SERVER REDIRECT
    res.redirect("/bartender-dashboard");

  } catch (err) {
    console.log(err);
    res.status(500).send("Login failed");
  }
});

app.get("/book/:id", (req, res) => {
  res.sendFile(path.join(__dirname, "views", "book.html"));
});

app.post("/book", async (req, res) => {

  const {
    customerName,
    customerEmail,
    customerPhone,
    bartenderId,
    eventType,
    eventDate,
    eventTime,
    location
  } = req.body;

  const newBooking = new Booking({
    customerName,
    customerEmail,
    customerPhone,
    bartenderId,
    eventType,
    eventDate,
    eventTime,
    location
  });

  await newBooking.save();

  res.redirect("/booking-success");
  });

// -----------------------
// Bartender Routing
app.get("/my-bookings", async (req, res) => {
  const bookings = await Booking.find({}).populate("bartenderId");
  res.json(bookings);
});
// ✅ LOCKED BARTENDER-ONLY BOOKINGS API
app.get("/api/bartender-bookings/:bartenderId", async (req, res) => {
  try {
    const { bartenderId } = req.params;

    const bookings = await Booking.find({ bartenderId }).sort({ createdAt: -1 });

    res.json(bookings);
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Failed to load bartender bookings" });
  }
});
// =======================
// ✅ CUSTOMER BOOKINGS API (FETCH BY EMAIL)
// =======================
app.get("/api/customer-bookings/:email", async (req, res) => {
  try {
    const { email } = req.params;

    console.log("📩 Fetching bookings for:", email);

    const bookings = await Booking.find({
      customerEmail: email
    }).sort({ createdAt: -1 });

    res.json(bookings);
  } catch (err) {
    console.log("❌ Customer bookings fetch error:", err);
    res.status(500).json({ message: "Failed to load customer bookings" });
  }
});

app.get("/bartender-bookings", (req, res) => {
  res.sendFile(path.join(__dirname, "views", "bartender-bookings.html"));
});

// =======================
// ✅ SMART LOGOUT (CUSTOMER + BARTENDER)
// =======================
app.get("/logout", (req, res) => {
  const isBartender = !!req.session.bartenderId;
  const isCustomer = !!req.session.customerId;

  req.session.destroy(err => {
    if (err) {
      console.error("Logout error:", err);
      return res.redirect("/");
    }

    res.clearCookie("connect.sid");

    if (isBartender) {
      return res.redirect("/bartenders-login");
    }

    if (isCustomer) {
      return res.redirect("/customer-login");
    }

    res.redirect("/");
  });
});

// =======================
// ACCEPT BOOKING (BARTENDER)
// =======================
// =======================
// ACCEPT BOOKING (BARTENDER + EMAILS) ✅ FINAL
// =======================
app.get("/accept/:id", async (req, res) => {
  try {
    if (!req.session.bartenderId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const booking = await Booking.findOne({
      _id: req.params.id,
      bartenderId: req.session.bartenderId
    }).populate("bartenderId");

    if (!booking) {
      return res.status(403).json({ message: "Not your booking" });
    }

    if (booking.status === "Accepted") {
      return res.status(400).json({ message: "Already accepted" });
    }

    booking.status = "Accepted";
    await booking.save();

    // 📧 EMAIL CUSTOMER
    await sendEmail({
      to: booking.customerEmail,
      subject: "Your booking has been accepted 🎉",
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
</head>

<body style="margin:0;padding:0;background:#0b0b0b;font-family:Arial,Helvetica,sans-serif;">

<table role="presentation" width="100%" cellpadding="0" cellspacing="0"
  style="background:#0b0b0b;padding:20px 10px;">
  <tr>
    <td align="center">

      <!-- MAIN CONTAINER -->
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
        style="max-width:600px;background:#111;border-radius:14px;overflow:hidden;">

        <!-- HEADER -->
        <tr>
          <td style="padding:26px;text-align:center;border-bottom:1px solid #222;">
            <h1 style="margin:0;color:#d4af37;font-size:22px;letter-spacing:0.5px;">
              Booking Accepted 🎉
            </h1>
          </td>
        </tr>

        <!-- BODY -->
        <tr>
          <td style="padding:26px;color:#eee;">

            <p style="color:#ccc;line-height:1.6;margin-top:0;">
              Great news! Your booking request has been accepted by a bartender.
            </p>

            <!-- DETAILS CARD -->
            <table width="100%" cellpadding="0" cellspacing="0"
              style="margin:20px 0;background:#0f0f0f;border-radius:10px;">
              <tr>
                <td style="padding:16px;color:#ccc;font-size:14px;line-height:1.7;">

                  <strong style="color:#d4af37;">Event:</strong>
                  ${booking.eventType}<br>

                  <strong style="color:#d4af37;">Date:</strong>
                  ${booking.eventDate}<br>

                  <strong style="color:#d4af37;">Time:</strong>
                  ${booking.eventTime}<br>

                  <strong style="color:#d4af37;">Location:</strong>
                  ${booking.location.split(",").slice(-2).join(", ")}

                </td>
              </tr>
            </table>

            <p style="color:#aaa;font-size:13px;line-height:1.6;">
              Your bartender will contact you shortly to finalize arrangements.
            </p>

            <p style="margin-top:28px;color:#888;font-size:12px;">
              Thank you for choosing<br>
              <strong style="color:#d4af37;">B.E.S.T Bartenders</strong>
            </p>

          </td>
        </tr>

      </table>

    </td>
  </tr>
</table>

</body>
</html>
`


    });

    // 📧 EMAIL BARTENDER
    await sendEmail({
      to: booking.bartenderId.email,
      subject: "You accepted a booking 🍸",
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
</head>

<body style="margin:0;padding:0;background:#0b0b0b;font-family:Arial,Helvetica,sans-serif;">

<table role="presentation" width="100%" cellpadding="0" cellspacing="0"
  style="background:#0b0b0b;padding:20px 10px;">
  <tr>
    <td align="center">

      <!-- MAIN CONTAINER -->
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
        style="max-width:600px;background:#111;border-radius:14px;overflow:hidden;">

        <!-- HEADER -->
        <tr>
          <td style="padding:26px;text-align:center;border-bottom:1px solid #222;">
            <h1 style="margin:0;color:#d4af37;font-size:22px;letter-spacing:0.5px;">
              Booking Confirmed 🍸
            </h1>
          </td>
        </tr>

        <!-- CONTENT -->
        <tr>
          <td style="padding:26px;color:#eee;">

            <p style="color:#ccc;line-height:1.6;margin-top:0;">
              You’ve successfully accepted a booking. Below are the full details:
            </p>

            <!-- DETAILS CARD -->
            <table width="100%" cellpadding="0" cellspacing="0"
              style="margin:20px 0;background:#0f0f0f;border-radius:10px;">
              <tr>
                <td style="padding:16px;color:#ccc;font-size:14px;line-height:1.7;">

                  <strong style="color:#d4af37;">Customer:</strong>
                  ${booking.customerName}<br>

                  <strong style="color:#d4af37;">Email:</strong>
                  ${booking.customerEmail}<br>

                  <strong style="color:#d4af37;">Phone:</strong>
                  ${booking.customerPhone}<br><br>

                  <strong style="color:#d4af37;">Event:</strong>
                  ${booking.eventType}<br>

                  <strong style="color:#d4af37;">Date:</strong>
                  ${booking.eventDate}<br>

                  <strong style="color:#d4af37;">Time:</strong>
                  ${booking.eventTime}<br>

                  <strong style="color:#d4af37;">Address:</strong>
                  ${booking.location}

                </td>
              </tr>
            </table>

            <p style="color:#aaa;font-size:13px;line-height:1.6;">
              Please contact the customer promptly to finalize arrangements.
            </p>

            <p style="margin-top:28px;color:#888;font-size:12px;">
              — <strong style="color:#d4af37;">B.E.S.T Bartenders</strong>
            </p>

          </td>
        </tr>

      </table>

    </td>
  </tr>
</table>

</body>
</html>
`
    });

    res.sendStatus(200);
  } catch (err) {
    console.error("Accept booking error:", err);
    res.status(500).json({ message: "Failed to accept booking" });
  }
});


// =======================
// REJECT BOOKING (BARTENDER)
// =======================
app.get("/reject/:id", async (req, res) => {
  if (!req.session.bartenderId) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const booking = await Booking.findOne({
    _id: req.params.id,
    bartenderId: req.session.bartenderId
  });

  if (!booking) {
    return res.status(403).json({ message: "Not your booking" });
  }

  booking.status = "Rejected";
  await booking.save();

  res.sendStatus(200);
});


app.get("/api/bartenders", async (req, res) => {
  const bartenders = await Bartender.find({});
  res.json(bartenders);
});

app.get("/bartenders", (req, res) => {
  if (!req.session.customerId) {
    return res.redirect("/customer-login");
  }

  res.sendFile(path.join(__dirname, "views", "bartenders.html"));
});


app.get("/api/current-customer", async (req, res) => {
  try {
    if (!req.session.customerId) {
      return res.status(401).json({ message: "Not logged in" });
    }

    const customer = await Customer.findById(req.session.customerId);

    res.json({
      firstname: customer.firstname,
      lastname: customer.lastname,
      email: customer.email,
      profile_photo: customer.profile_photo
    });
  } catch (err) {
    console.log("❌ Current customer error:", err);
    res.status(500).json({ message: "Failed to load customer" });
  }
});

// =======================
// 🔓 ACCEPTED BOOKING DETAILS (BARTENDER ONLY)
// =======================
app.get("/api/booking/accepted/:id", async (req, res) => {
  try {
    if (!req.session.bartenderId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const booking = await Booking.findOne({
      _id: req.params.id,
      bartenderId: req.session.bartenderId,
      status: "Accepted"
    });

    if (!booking) {
      return res.status(403).json({ message: "Access denied" });
    }

    res.json({
      customerName: booking.customerName,
      customerEmail: booking.customerEmail,
      customerPhone: booking.customerPhone,
      location: booking.location,
      eventType: booking.eventType,
      eventDate: booking.eventDate,
      eventTime: booking.eventTime
    });
  } catch (err) {
    console.error("Accepted booking fetch error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// =======================
// ✅ CURRENT LOGGED-IN BARTENDER
// =======================
app.get("/api/current-bartender", async (req, res) => {
  try {
    if (!req.session.bartenderId) {
      return res.status(401).json({ message: "Not logged in" });
    }

    const bartender = await Bartender.findById(req.session.bartenderId);

    res.json({
      _id: bartender._id,
      firstname: bartender.firstname,
      lastname: bartender.lastname,
      email: bartender.email
    });
  } catch (err) {
    console.log("❌ Current bartender error:", err);
    res.status(500).json({ message: "Failed to load bartender" });
  }
});

// =======================
// BARTENDER DASHBOARD PAGE
// =======================
app.get("/bartender-dashboard", (req, res) => {
  if (!req.session.bartenderId) {
    return res.redirect("/bartenders-login");
  }

  res.sendFile(
    path.join(__dirname, "views", "bartender-dashboard.html")
  );
});


// -----------------------
const PORT = process.env.PORT || 3000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});

// GET ONE BOOKING (details page use)
app.get("/api/booking/:id", async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    res.json(booking);
  } catch (err) {
    res.status(500).json({ error: "Booking not found" });
  }
});

// CANCEL BOOKING (customer action)
app.post("/api/cancel-booking/:id", async (req, res) => {
  try {
    await Booking.findByIdAndUpdate(req.params.id, {
      status: "Cancelled"
    });
    res.sendStatus(200);
  } catch (err) {
    res.status(500).json({ error: "Cancel failed" });
  }
});

app.get("/resend-verification", (req, res) => {
  res.sendFile(path.join(__dirname, "views", "resend-verification.html"));
});

app.post("/resend-verification", async (req, res) => {
  const { email } = req.body;

  const customer = await Customer.findOne({ email });

  if (!customer) {
    return res.send("No account found with this email.");
  }

  if (customer.emailVerified) {
    return res.send("Email already verified. Please log in.");
  }

  const newToken = crypto.randomBytes(32).toString("hex");

  customer.emailVerificationToken = newToken;
  customer.emailVerificationExpires = Date.now() + 24 * 60 * 60 * 1000;
  await customer.save();

  const verifyUrl = `${process.env.BASE_URL}/verify-email/${newToken}`;

  await sendEmail({
    to: customer.email,
    subject: "Verify your email – B.E.S.T Bartenders",
    html: `
      <h2>Verify Your Email</h2>
      <p>This link expires in 24 hours.</p>
      <a href="${verifyUrl}">Verify Email</a>
    `
  });

  res.send("Verification email resent. Check your inbox.");
});

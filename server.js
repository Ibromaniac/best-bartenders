require("dotenv").config();
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


app.get("/logout", (req, res) => {
  req.session.destroy(err => {
    if (err) return res.status(500).send("Error logging out");
    res.clearCookie("connect.sid");
    res.redirect("/customer-login");
  });
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

// -----------------------
// CUSTOMER REGISTRATION (FIXED)
// -----------------------

app.post("/customer-registration", async (req, res) => {
  const { firstname, lastname, address, email, phone, password } = req.body;

  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    const customer = await Customer.create({
      firstname,
      lastname,
      address,
      email,
      phone,
      password: hashedPassword
    });

    console.log("✅ Customer saved:", customer);
    res.redirect("/registration-success");

  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).send("Email already registered");
    }
    console.error("❌ CUSTOMER REG ERROR:", err);
    res.status(500).send("Customer registration failed");
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
      return res.status(401).send("Email not found");
    }

    const isMatch = await bcrypt.compare(password, customer.password);
    if (!isMatch) {
      return res.status(401).send("Incorrect password");
    }

    req.session.customerId = customer._id;
    res.redirect("/customer-dashboard");

  } catch (err) {
    console.error("❌ LOGIN ERROR:", err);
    res.status(500).send("Login failed");
  }
});

// =======================
// ✅ LOGOUT ROUTE
// =======================
app.get("/logout", (req, res) => {
  req.session.destroy(err => {
    if (err) {
      console.error("❌ Logout error:", err);
      return res.status(500).send("Error logging out");
    }

    res.clearCookie("connect.sid"); // express-session cookie
    res.redirect("/customer-login");
  });
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

// -----------------------
// BARTENDER LOGIN
// -----------------------
app.post("/bartenders-login", async (req, res) => {
  const { email, password } = req.body;

  try {
    const bartender = await Bartender.findOne({ email });

    if (!bartender) {
      return res.json({ message: "No account found." });
    }

    if (bartender.password !== password) {
      return res.json({ message: "Incorrect password." });
    }

    if (!bartender.approved) {
      return res.json({
        message: "Your account is still under review. Come back later."
      });
    }

    // ✅ SUCCESS RESPONSE
    return res.json({
      message: "Login successful",
      bartenderId: bartender._id
    });

  } catch (err) {
    console.log(err);
    return res.json({ message: "Server error during login" });
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
// -----------------------
app.get("/accept/:id", async (req, res) => {
  await Booking.findByIdAndUpdate(req.params.id, { status: "Accepted" });
  res.redirect("/bartender-bookings");
});

app.get("/reject/:id", async (req, res) => {
  await Booking.findByIdAndUpdate(req.params.id, { status: "Rejected" });
  res.redirect("/bartender-bookings");
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


// -----------------------
const PORT = process.env.PORT || 3000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});

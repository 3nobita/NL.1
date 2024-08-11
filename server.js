const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const path = require('path');
const session = require('express-session');
const Property = require('./models/Property');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(session({
  secret: 'your-secret-key', // Change this to a more secure secret
  resave: false,
  saveUninitialized: true,
}));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

// Admin access middleware
const isAdmin = (req, res, next) => {
  if (req.session.isAdmin) {
    return next();
  }
  res.sendFile(path.join(__dirname, 'views', 'verify-code.html'));
};

// Route to display properties
app.get('/', async (req, res) => {
  try {
    const selectedCategories = req.query.categories ? req.query.categories.split(',') : [];
    let filter = {};

    if (selectedCategories.length > 0) {
      filter.categories = { $in: selectedCategories };
    }

    const allProperties = await Property.find(filter);

    // Categorize properties
    const categorizedProperties = {
      spotlight: allProperties.filter(p => p.categories.includes('Spotlight')),
      featuredDevelopers: allProperties.filter(p => p.categories.includes('Featured Developers')),
      trendingResidences: allProperties.filter(p => p.categories.includes('Trending Residences')),
      signatureDevelopments: allProperties.filter(p => p.categories.includes('SIGNATURE Developments')),
      popularZones: allProperties.filter(p => p.categories.includes('Popular Zones')),
    };

    res.render('index', { 
      properties: categorizedProperties,
      isAdmin: req.session.isAdmin // Pass admin status to the view
    });
  } catch (err) {
    res.status(500).send('Server Error');
  }
});


// Route to display add property form (restricted to admin)
app.get('/add', isAdmin, (req, res) => {
  res.render('add');
});

// Route to handle form submission for adding properties
app.post('/add', isAdmin, async (req, res) => {
  try {
    const { name, description, price, categories, imageUrl } = req.body;
    const newProperty = new Property({
      name,
      description,
      price,
      categories: categories ? categories : [],
      imageUrl // Save the image URL
    });
    await newProperty.save();
    res.redirect('/');
  } catch (err) {
    res.status(500).send('Server Error');
  }
});


// Admin code verification route
app.post('/verify-code', (req, res) => {
  const { code } = req.body;
  const accessCode = '9671'; // Code to access the admin dashboard

  if (code === accessCode) {
    req.session.isAdmin = true;
    res.redirect('/admin');
  } else {
    res.status(401).send('Unauthorized');
  }
});

// Admin dashboard
app.get('/admin', isAdmin, async (req, res) => {
  try {
    const properties = await Property.find();
    res.render('admin-dashboard', { properties });
  } catch (err) {
    res.status(500).send('Server Error');
  }
});

// Route to display edit property form (protected)
// Route to display the edit property form (restricted to admin)
app.get('/admin/edit/:id', isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const property = await Property.findById(id);
    if (!property) {
      return res.status(404).send('Property not found');
    }
    res.render('edit', { property });
  } catch (err) {
    res.status(500).send('Server Error');
  }
});


// Route to handle form submission for updating properties (protected)
app.post('/edit/:id', isAdmin, async (req, res) => {
  try {
    const { name, description, price, categories, imageUrl } = req.body;
    const updatedProperty = await Property.findByIdAndUpdate(req.params.id, {
      name,
      description,
      price,
      categories: categories ? categories : [],
      imageUrl
    }, { new: true });

    if (!updatedProperty) {
      return res.status(404).send('Property not found');
    }
    res.redirect('/');
  } catch (err) {
    res.status(500).send('Server Error');
  }
});
// Route to handle property updates (restricted to admin)
app.post('/admin/update/:id', isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, price, categories, imageUrl } = req.body;
    await Property.findByIdAndUpdate(id, { name, description, price, categories, imageUrl });
    res.redirect('/admin');
  } catch (err) {
    res.status(500).send('Server Error');
  }
});


// Route to handle deletion of a property (protected)
// Route to handle property deletion
app.post('/admin/delete/:id', isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    await Property.findByIdAndDelete(id);
    res.redirect('/admin');
  } catch (err) {
    res.status(500).send('Server Error');
  }
});




// Logout route
app.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/');
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

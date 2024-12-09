const express = require('express');
const session = require('express-session');
const path = require('path');
const logger = require('morgan');
const cookieParser = require('cookie-parser');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const User = require('./models/User');
const configuration = require('./config/globals');
require('dotenv').config();

const app = express();

// Middleware
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// Session setup
app.use(
    session({
        secret: 'your_secret_key', // Change this in production
        resave: false,
        saveUninitialized: false,
    })
);

// Connect to MongoDB
mongoose
    .connect(configuration.ConnectionString.MongoDB, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
    })
    .then(() => {
        console.log('Connected to MongoDB');
    })
    .catch((error) => {
        console.error('Error connecting to MongoDB:', error);
    });

// View engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'hbs');

// Middleware to check authentication
function isAuthenticated(req, res, next) {
    if (req.session.user) {
        next();
    } else {
        res.redirect('/login');
    }
}

// Routes
app.get('/', (req, res) => {
    res.redirect('/login');
});

app.get('/login', (req, res) => {
    res.render('login', { message: req.query.message });
});

app.post('/login', async (req, res) => {
  try {
      const { email, password } = req.body;

      // Check if user exists
      const user = await User.findOne({ email });
      if (!user) {
          return res.redirect('/login?message=Invalid email or password');
      }

      // Compare passwords
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
          return res.redirect('/login?message=Invalid email or password');
      }

      // Set user session
      req.session.user = { id: user._id, email: user.email, name: user.name };
      res.redirect('/home');
  } catch (error) {
      console.error(error);
      res.redirect('/login?message=Something went wrong');
  }
});

// Delete Expense Route
app.post('/delete-expense', isAuthenticated, async (req, res) => {
  try {
      const { expenseId } = req.body;

      // Find the user and remove the specific expense
      const user = await User.findById(req.session.user.id);
      if (!user) {
          return res.redirect('/home?message=User not found');
      }

      // Filter out the expense to delete it
      user.expenses = user.expenses.filter(expense => expense._id.toString() !== expenseId);
      await user.save();

      res.redirect('/home?message=Expense deleted successfully');
  } catch (error) {
      console.error('Error deleting expense:', error);
      res.redirect('/home?message=Failed to delete expense');
  }
});

app.get('/logout', (req, res) => {
  req.session.destroy((err) => {
      if (err) {
          console.error('Error during logout:', err);
          return res.status(500).send('Failed to log out.');
      }
      res.redirect('/login?message=Successfully logged out');
  });
});


app.post('/add-expense', isAuthenticated, async (req, res) => {
  try {
      const { description, amount } = req.body;

      // Log input values
      console.log('Adding expense:', { description, amount });

      if (!description || !amount) {
          console.log('Invalid input');
          return res.redirect('/home?message=All fields are required');
      }

      // Update user expenses
      const user = await User.findByIdAndUpdate(
          req.session.user.id,
          {
              $push: {
                  expenses: { description, amount }, // Add expense
              },
          },
          { new: true } // Return updated document
      );

      console.log('Updated user:', user);
      res.redirect('/home');
  } catch (error) {
      console.error('Error adding expense:', error);
      res.redirect('/home?message=Failed to add expense');
  }
});




app.get('/home', isAuthenticated, async (req, res) => {
  try {
      const user = await User.findById(req.session.user.id).lean();
      res.render('home', {
          user,
          expenses: user.expenses,
      });
  } catch (error) {
      console.error(error);
      res.redirect('/login?message=Something went wrong');
  }
});


app.get('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).send('Error logging out');
        }
        res.redirect('/login');
    });
});

app.get('/register', (req, res) => {
  // You can use a query parameter like `message` to show an error message if needed
  const message = req.query.message || '';
  res.render('login', { message });
});

app.post('/register', async (req, res) => {
  try {
      const { name, email, password } = req.body;

      // Validate input
      if (!name || !email || !password) {
          return res.redirect('/register?message=All fields are required');
      }

      // Check if user already exists
      const existingUser = await User.findOne({ email });
      if (existingUser) {
          return res.redirect('/register?message=User already exists');
      }

      // Hash the password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Save user in the database
      const newUser = new User({
          name,
          email,
          password: hashedPassword,
      });
      await newUser.save();

      // Redirect to login after successful registration
      res.redirect('/login?message=Registration successful, please login');
  } catch (error) {
      console.error(error);
      res.redirect('/register?message=Something went wrong');
  }
});

// Catch-all route for undefined routes
app.use((req, res, next) => {
    const error = new Error('Not Found');
    error.status = 404;
    next(error);
});

// Error handling middleware
app.use((err, req, res) => {
    res.status(err.status || 500);
    res.render('error', { message: err.message, error: err });
});

module.exports = app;

const bcrypt = require('bcrypt'); // Ensure bcrypt is installed

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

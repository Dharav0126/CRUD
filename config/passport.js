const LocalStrategy = require('passport-local').Strategy;
const bcrypt = require('bcrypt');
const { findUserByEmail, findUserById } = require('../models/User');

function initializePassport(passport) {
    passport.use(new LocalStrategy(
        { usernameField: 'email' }, // Use 'email' instead of 'username'
        async (email, password, done) => {
            const user = findUserByEmail(email);
            if (!user) {
                return done(null, false, { message: 'No user with this email' });
            }

            // Compare hashed passwords
            try {
                const match = await bcrypt.compare(password, user.password);
                if (!match) return done(null, false, { message: 'Incorrect password' });
                return done(null, user);
            } catch (err) {
                return done(err);
            }
        }
    ));

    passport.serializeUser((user, done) => done(null, user.id));
    passport.deserializeUser((id, done) => {
        const user = findUserById(id);
        return done(null, user);
    });
}

module.exports = initializePassport;

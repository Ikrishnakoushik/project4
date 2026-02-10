const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true
    },
    role: {
        type: String,
        enum: ['publisher', 'reader'],
        default: 'reader'
    },
    displayName: {
        type: String,
        default: ''
    },
    bio: {
        type: String,
        default: ''
    },
    profilePicture: {
        type: String,
        default: '' // URL or path to image
    },
    loginHistory: [{
        type: Date,
        default: Date.now
    }]
});

module.exports = mongoose.model('User', UserSchema);

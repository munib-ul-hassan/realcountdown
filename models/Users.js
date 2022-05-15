const mongoose = require('mongoose');
const {
    PropertySchema,
    ChatSchema,
    ReviewSchema,
    PromotionalMessageSchema,
    InvitedAgentSchema,
    agentBidSchema,
    ReferralAgreementSchema,
    LogSchema,
    BankDetailsSchema
} = require('./OtherSchema');
//status: {
//     type: String,
//     enum: ['Accepted', 'Rejected', 'Waiting'],
//     default: 'Waiting',
// },
// agentBid: mongoose.Schema.Types.ObjectId,
// commision: String,
// screenName: String,
// profilePicture: String,
const bidSchema = new mongoose.Schema({
    role: String,
    agentId: mongoose.Schema.Types.ObjectId,
    userId: mongoose.Schema.Types.ObjectId,
    bidOnProperty: mongoose.Schema.Types.ObjectId,
    agentProfilePicture: String,
    screenName: String,
    commision: String,
    status: {
            type: String,
            enum: ['Accepted', 'Rejected', 'Waiting', 'Rebid', 'Canceled'],
            default: 'Waiting',
    },
    bidOverAt: Date

});

const adminSchema = new mongoose.Schema({
    name: {
        type: String,
    },
    email: {
        type: String,
        trim: true,
        lowercase: true,
        unique: true,
        validate: {
            validator: function (email) {
                return /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/.test(
                    email
                );
            },
            message: 'Please enter a valid email',
        },
        required: [true, 'Email required'],
    },
    password: {
        type: String,
        required: true,
    },
    role: {
        type: String,
        default: 'admin',
    },
    profilePicture: {
        type: String,
        default: '',
    },

    createdAt: Date,
    updatedAt: Date,
});

const agentSchema = new mongoose.Schema({
    name: {
        type: String,
    },
    screenName: {
        type: String,
    },
    email: {
        type: String,
        trim: true,
        lowercase: true,
        unique: true,
        validate: {
            validator: function (email) {
                return /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/.test(
                    email
                );
            },
            message: 'Please enter a valid email',
        },
        required: [true, 'Email required'],
    },
    password: {
        type: String,
        required: true,
    },
    professionalCategory: {
        type: String,
    },
    professionalTitle: {
        type: String,
    },
    completed: {
        type: String,
        default: '',
    },
    createdAt: Date,
    updatedAt: Date,
    brokerageAddress: {
        type: String,
    },
    brokeragePhone: {
        type: String,
    },
    city: {
        type: String,
    },
    primaryPhone: {
        type: String,
    },
    timeZone: {
        type: String,
    },
    commision: {
        type: String,
    },
    date: Date,
    description: {
        type: String,
    },
    license: String,
    serviceAreas: String,
    state: String,
    reviewOne: String,
    reviewTwo: String,
    reviewThree: String,
    status: {
        type: String,

        validate: {
            validator: function (value) {
                return (
                    ['not decided', 'disapproved', 'approved'].indexOf(
                        value
                    ) !== -1
                );
            },
            message: 'Value must be one of not decided, disapproved, approved',
        },
    },
    role: {
        type: String,
        default: 'agent',
    },
    profilePicture: {
        type: String,
        default: '',
    },
    charity: {
        firm: String,
        donation: {
            type: String,
            default: '10$',
        },
    },
    reviews: [
        {
            text: String,
            stars: Number,
        },
    ],
    companyName: String,
    promotionalMessagesBuyer: {
        charityLocation: String,
    },
    promotionalMessagesSeller: {
        charityLocation: String,
    },
    invited: {
        type: Boolean,
        default: false,
    },
    registrationCharity: String,
});
const sellerSchema = new mongoose.Schema({
    name: String,
    phone: String,
    email: {
        type: String,
        trim: true,
        lowercase: true,
        unique: true,
        validate: {
            validator: function (email) {
                return /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/.test(
                    email
                );
            },
            message: 'Please enter a valid email',
        },
        required: [true, 'Email required'],
    },
    address: String,
    zipCode: String,
    city: String,
    state: String,
    license: String,
    password: {
        type: String,
        required: true,
    },
    role: {
        type: String,
        default: 'seller',
    },
    status: {
        type: String,

        validate: {
            validator: function (value) {
                return (
                    ['not decided', 'disapproved', 'approved'].indexOf(
                        value
                    ) !== -1
                );
            },
            message: 'Value must be one of not decided, disapproved, approved',
        },
    },
    properties: [PropertySchema],
    promotionalMessages: [
        {
            agentName: String,
            agentId: mongoose.Schema.Types.ObjectId,
            message: String,
            approve: Boolean,
        },
    ],
    promotionalMessageState:{
        type: Boolean,
        default: false
    },
    profilePicture: String,
    createdAt: Date,
    updatedAt: Date,
});

const buyerSchema = new mongoose.Schema({
    name: String,
    phone: String,
    email: {
        type: String,
        trim: true,
        lowercase: true,
        unique: true,
        validate: {
            validator: function (email) {
                return /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/.test(
                    email
                );
            },
            message: 'Please enter a valid email',
        },
        required: [true, 'Email required'],
    },
    address: String,
    zipCode: String,
    city: String,
    state: String,
    license: String,
    password: {
        type: String,
        required: true,
    },
    role: {
        type: String,
        default: 'buyer',
    },
    status: {
        type: String,
        validate: {
            validator: function (value) {
                return (
                    ['not decided', 'disapproved', 'approved'].indexOf(
                        value
                    ) !== -1
                );
            },
            message: 'Value must be one of not decided, disapproved, approved',
        },
    },
    properties: [
        {
            area: String,
            addressLine: String,
            state: String,
            zipCode: String,
            check: String,
            countdownOverAt: Date,
            countdown: String,
            isOver: {
                type: Boolean,
                default: false,
            },
            updatetAt: Date,
        },
    ],
    profilePicture: String,
    promotionalMessages: [
        {
            agentName: String,
            agentId: mongoose.Schema.Types.ObjectId,
            message: String,
            approve: Boolean,
        },
    ],
    promotionalMessageState:{
        type: Boolean,
        default: false
    },
    createdAt: Date,
    updatedAt: Date,
});

module.exports = {
    Agent: mongoose.model('Agent', agentSchema),
    Admin: mongoose.model('Admin', adminSchema),
    Seller: mongoose.model('Seller', sellerSchema),
    Buyer: mongoose.model('Buyer', buyerSchema),
    Message: mongoose.model('Message', ChatSchema),
    PromotionalMessage: mongoose.model(
        'PromotionalMessage',
        PromotionalMessageSchema
    ),
    InvitedAgent: mongoose.model('InvitedAgent', InvitedAgentSchema),
    Bid: mongoose.model('Bid', bidSchema),
    ReferralAgreement: mongoose.model('ReferralAgreement', ReferralAgreementSchema),
    Log: mongoose.model('Log', LogSchema),
    BankDetail: mongoose.model('BankDetail', BankDetailsSchema)
};

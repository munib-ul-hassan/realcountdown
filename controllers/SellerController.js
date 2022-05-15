const bcrypt = require('bcrypt');
const { Seller, Admin, Message, Agent, Bid, Log, BankDetail } = require('../models/Users');
const { sellerSchema } = require('./../middleware/validation/user');
const { updatePassword } = require('./../middleware/validation/updateUser');
const { Chat } = require('./Chat');
const addHours = require('date-fns/addHours');
const {
    propertySchema,
    propertySchemaForEdit,
} = require('./../middleware/validation/validations');
const req = require('express/lib/request');
const { v4: uuidv4 } = require('uuid');
const { sendData } = require('./helperFunction');
const { EmailTemplateSeller } = require('./EmailTemplate');
const { sendMail } = require('./sendMailController');
const registerSeller = async (req, res) => {
    const {
        name,
        email,
        phone,
        address,
        zipCode,
        license,
        password,
        city,
        state,
    } = req.body;

    if (
        !name ||
        !phone ||
        !email ||
        !password ||
        !address ||
        !zipCode ||
        !license ||
        !city ||
        !state
    )
        return res.status(400).json({ message: 'All fields are required' });

    try {
        await sellerSchema.validateAsync(req.body);
    } catch (e) {
        return res.render(
            'errorpages/404',
            sendData(400, 'Bad Request', e.message, '/seller/register')
        );
    }

    // check for duplicate usernames in database
    const duplicate = await Seller.exists({ email: email });

    if (duplicate)
        return res.render(
            'errorpages/404',
            sendData(
                409,
                'Conflict',
                'Account with this email already exists',
                '/seller/register'
            )
        );

    try {
        //   encrypt the password
        const hashedPassword = await bcrypt.hash(password, 10);
        // store the new user
        const user = await Seller.create({
            name: name,
            email: email,
            password: hashedPassword,
            phone: phone,
            address: address,
            zipCode: zipCode,
            license: license,
            status: 'not decided',
            profilePicture: '',
            state,
            city,
            createdAt: new Date(),
            updatedAt: new Date(),
        });

        const html = EmailTemplateSeller(
            'Seller Registered',
            'Update Details',
            (await Seller.findOne({ email })).name,
            (await Seller.findOne({ email })).email,
            (await Seller.findOne({ email })).primaryPhone,
            (await Seller.findOne({ email })).state,
            (await Seller.findOne({ email })).city,
            (await Seller.findOne({ email })).commision,
            (await Seller.findOne({ email })).brokerageAddress,
            'http://www.google.com'
        );

        await sendMail(
            process.env.ADMIN_EMAIL,
            'New Seller Registered',
            'New Seller has been registered',
            html
        )
        const sellerEmail  = EmailTemplateSeller(
            'Seller Registered',
            'Details',
            (await Seller.findOne({ email })).name,
            (await Seller.findOne({ email })).email,
            (await Seller.findOne({ email })).primaryPhone,
            (await Seller.findOne({ email })).state,
            (await Seller.findOne({ email })).city,
            (await Seller.findOne({ email })).commision,
            (await Seller.findOne({ email })).brokerageAddress,
            'http://www.google.com'
        );
        await sendMail(
            await Seller.findOne({email}).email,
            'Your Registration was successfull',
            'You have successfully registered, wait 24 to 48 hours for approval',
            sellerEmail
        )
        await Log.create({
            text: `New Seller Registered {email : ${email}}`,
            date: new Date()
        })
        return res.redirect('/seller/');
    } catch (err) {
        console.log(err.message);
        return res.render(
            'errorpages/404',
            sendData(
                500,
                'Internal Server Error',
                err.message,
                '/seller/register'
            )
        );
    }
};
const handleLogout = async (req, res) => {
    if (req.session.user && req.session.role === 'seller') {
        req.session.destroy(function (err) {
            if (err)
                return res.render('errorpages/404', {
                    status: 403,
                    error: 'Forbidden',
                    message: '',
                    url: '/seller/main',
                });
            return res.redirect('/seller/');
        });
    } else {
        return res.redirect('/seller/');
    }
};
const login = async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password)
        return res.render(
            'errorpages/404',
            sendData(
                400,
                'Bad Request',
                'Email and Password are required',
                '/seller/register'
            )
        );

    let foundUser = await Seller.findOne({ email: email });

    if (!foundUser)
        return res.render(
            'errorpages/404',
            sendData(
                401,
                'Unauthorized',
                'Account doesnot exist',
                '/seller/register'
            )
        );

    //   Evaluate password
    const match = await bcrypt.compare(password, foundUser.password);

    if (match && foundUser.status == 'approved') {
        req.session.user = email;
        req.session.name = (await Seller.findOne({ email: email })).name;
        req.session.image = (
            await Seller.findOne({ email: email })
        ).profilePicture;
        req.session.role = 'seller';
        await Log.create({
            text: `Seller Logged in {email : ${email}}`,
            date: new Date()
        })
        return res.redirect('/seller/main');
    }else{
        return res.render('errorpages/not-approved')
    }
    return res.render(
        'errorpages/404',
        sendData(500, 'Internal Server Error', '', '/seller/')
    );
};
const editProfileCredentials = async (req, res) => {
    if (req.session.user && req.session.role === 'seller') {
        const { name, phone } = req.body;
        if (name.length <= 3 || name.length >= 25) {
            return res.render(
                'errorpages/404',
                sendData(
                    400,
                    'Bad Request',
                    'Name must be of length between 3 and 25',
                    '/seller/edit-profile'
                )
            );
        } else if (phone.length < 8 || phone.length > 13) {
            return res.render(
                'errorpages/404',
                sendData(
                    400,
                    'Bad Request',
                    'Phone number must be of length between 8 and 13',
                    '/seller/edit-profile'
                )
            );
        } else {
            try {
                await Seller.updateOne(
                    { email: req.session.user },
                    {
                        name,
                        phone,
                    }
                );
                await Log.create({
                    text: `Seller Updated his profile {email : ${req.session.user}}`,
                    date: new Date()
                })
                res.redirect('/seller/edit-profile');
            } catch (e) {
                return res.render(
                    'errorpages/404',
                    sendData(
                        500,
                        'Internal Server Error',
                        e.message,
                        '/seller/'
                    )
                );
            }
        }
    } else {
        return res.render('errorpages/404', password);
    }
};
const changePassword = async (req, res) => {
    const { password, image } = req.body;
    if (!password || !image)
        return res.render(
            'errorpages/404',
            sendData(
                400,
                'Bad Request',
                'Password and image is required',
                '/seller/edit-profile'
            )
        );
    try {
        await updatePassword.validateAsync({ password });
    } catch (e) {
        return res.render('errorpages/404', {
            status: 400,
            error: 'Bad Request',
            message: e.message,
            url: '/seller/edit-profile',
        });
    }
    try {
        const pwd = await bcrypt.hash(password, 10);
        await Seller.updateOne(
            { email: req.session.user },
            {
                password: pwd,
                profilePicture: image,
            }
        );
        await Log.create({
            text: `Seller Updated his password {email : ${req.session.user}}`,
            date: new Date()
        })
        return res.redirect('/seller/edit-profile');
    } catch (e) {
        return res.render('errorpages/404', {
            status: 500,
            error: 'Internal Server Error',
            message: e.message,
            url: '/seller/edit-profile',
        });
    }
};
const addProperty = async (req, res) => {

    if (req.session.user && req.session.role === 'seller') {
        const {
            propertyName,
            propertyAddress,
            mailingAddress,
            phone,
            zipCode,
            listedByBooker,
            agreeToTerms,
            listedForAgent,
        } = req.body;
        const uuid = uuidv4();
        if (agreeToTerms !== 'on')
            return res.render(
                'errorpages/404',
                sendData(
                    400,
                    'Bad Request',
                    'Please agree to our policies',
                    '/seller/add-property'
                )
            );
        const listedByAnotherBroker = listedByBooker === 'on' ? true : false;
        const listForOpenBid = listedForAgent ? true : false;
        try {
            await propertySchema.validateAsync({
                propertyName,
                propertyAddress,
                mailingAddress,
                phone,
                zipCode,
                listForOpenBid,
            });
        } catch (err) {
            return res.render(
                'errorpages/404',
                sendData(
                    400,
                    'Bad Request',
                    err.message,
                    '/seller/add-property'
                )
            );
        }
        try {
            Seller.findOne({ email: req.session.user }).then((data) => {
                data.properties.push({
                    propertyName,
                    propertyAddress,
                    mailingAddress,
                    phone,
                    zipCode,
                    agreeToTerms: true,
                    listedByAnotherBroker,
                    listForOpenBid,
                    countdown: '',
                    createdAt: new Date(),
                    updatedAt: new Date(),
                });
                const property =
                    data.properties[data.properties.length - 1]._id;
                data.save().then(async function () {
                    if (!listForOpenBid) {
                        await Log.create({
                            text: `Seller added a property {email : ${req.session.user}}`,
                            date: new Date()
                        })
                        return res.redirect('/seller/add-property');
                    }
                    await Log.create({
                        text: `Seller added a property {email : ${req.session.user}}`,
                        date: new Date()
                    })
                    return res.redirect('/seller/countdown?id=' + property);
                });
            });
        } catch (err) {
            return res.render(
                'errorpages/404',
                sendData(
                    400,
                    'Bad Request',
                    err.message,
                    '/seller/add-property'
                )
            );
        }
    } else {
        return res.render(
            'errorpages/404',
            sendData(401, 'Unauthorized', '', '/seller/add-property')
        );
    }
};
const editCountDown = async (req, res) => {

    if (req.session.user && req.session.role === 'seller') {
        const { id } = req.query;
        const { timeCountdown } = req.body;

        const time = timeCountdown.split(' ')[0];
        // addHours(new Date(), parseInt(time))
        try {
            await Seller.updateOne(
                { 'properties._id': id },
                {
                    $set: {
                        'properties.$.countdown': time,
                        'properties.$.updatedAt': new Date(),
                        'properties.$.isOver': false,
                    },
                }
            );
            await Log.create({
                text: `Seller edited countdown for one of his property {email : ${req.session.user}}`,
                date: new Date()
            })
            res.redirect('/seller/countdown?id=' + id);
        } catch (err) {
            res.render(
                'errorpages/404',
                sendData(
                    500,
                    'Internal Server Error',
                    err.message,
                    '/seller/countdown'
                )
            );
        }
    } else {
        return res.render(
            'errorpages/404',
            sendData(401, 'Unauthorized', '', '/seller/add-property')
        );
    }
};
const editPropertyDetails = async (req, res) => {
    if (req.session.user && req.session.role === 'seller') {
        const {
            propertyName,
            propertyAddress,
            mailingAddress,
            phone,
            zipCode,
            property_id,
        } = req.body;
        try {
            await propertySchemaForEdit.validateAsync({
                propertyName,
                propertyAddress,
                mailingAddress,
                phone,
                zipCode,
            });
        } catch (err) {
            return res.render(
                'errorpages/404',
                sendData(
                    400,
                    'Bad Request',
                    err.message,
                    '/seller/add-property'
                )
            );
        }
        try {
            await Seller.updateOne(
                { 'properties._id': property_id },
                {
                    $set: {
                        'properties.$.propertyName': propertyName,
                        'properties.$.propertyAddress': propertyAddress,
                        'properties.$.mailingAddress': mailingAddress,
                        'properties.$.phone': phone,
                        'properties.$.zipCode': zipCode,
                    },
                }
            );
            await Log.create({
                text: `Seller edited property details {email : ${req.session.user}}`,
                date: new Date()
            })
            res.redirect('/seller/saved-properties');
        } catch (err) {}
    } else {
        return res.render(
            'errorpages/404',
            sendData(401, 'Unauthorized', '', '/seller/add-property')
        );
    }
};
const startCountDown = async (req, res) => {
    if (req.session.user && req.session.role == 'seller') {
        const { id } = req.query;
        const as = await Seller.findOne({
            'properties._id': id,
        });
        const property = as.properties.filter((property) => property._id == id);
        // const time = timeCountdown.split(" ")[0];

        try {
            await Seller.updateOne(
                { 'properties._id': id },
                {
                    $set: {
                        'properties.$.countdownOverAt': addHours(
                            new Date(),
                            parseInt(property[0].countdown)
                        ),
                        'properties.$.updatedAt': new Date(),
                        'properties.$.isOver': false,
                    },
                }
            );
            await Log.create({
                text: `Seller started countdown for his property {email : ${req.session.user}}`,
                date: new Date()
            })
            res.redirect('/seller/countdown?id=' + id);
        } catch (err) {
            res.render(
                'errorpages/404',
                sendData(
                    500,
                    'Internal Server Error',
                    err.message,
                    '/seller/countdown'
                )
            );
        }
    } else {
        return res.redirect('/seller/');
    }
};

const acceptBid = async (req, res) => {
    if (req.session.user && req.session.role == 'seller') {
        console.log(req.params,"=============");
        const { id, propertyID } = req.params;
        try {
            const seller = await Seller.findOne({email: req.session.user})
            const exists = await Bid.exists({
                userId: seller._id,
                bidOnProperty: propertyID,
                status: 'Accepted'
            })
            if(exists){
                const prevBidder = await Bid.findOne({
                    userId: seller._id,
                    bidOnProperty: propertyID,
                    status: 'Accepted'
                })
                await Bid.updateOne({agentId: prevBidder.agentId, bidOnProperty: propertyID}, {$set: {status: 'Canceled'}})
            }
            await Bid.updateOne({agentId: id, bidOnProperty: propertyID}, {$set: {status: 'Accepted'}})
            await Bid.updateOne({
                userId:seller._id,
                agentId: id,
                bidOnProperty: propertyID
            },{
                $set: {status: 'Accepted'}
            })
            await Log.create({
                text: `Seller Accepted agent bid {email : ${req.session.user}}`,
                date: new Date()
            })
            return res.redirect('/seller/main');
        } catch (err) {
            console.log(err);
            return res.render(
                'errorpages/404',
                sendData(
                    500,
                    'Internal Server Error',
                    err.message,
                    '/seller/'
                )
            );
        }
    }else{
        return res.redirect('/seller/')
    }
};
const rejectBid = async (req, res) => {
    if (req.session.user && req.session.role == 'seller') {
        const { id, propertyID } = req.params;
        try {
            const seller = await Seller.findOne({email: req.session.user})
console.log(req.params,"==============");
            await Bid.updateOne({
                userId:seller._id,
                agentId: id,
                bidOnProperty: propertyID
            },{
                $set: {status: 'Rejected'}
            })
            await Log.create({
                text: `Seller rejected agent bid {email : ${req.session.user}}`,
                date: new Date()
            })
            return res.redirect('/seller/main');
        } catch (err) {
            console.log(err);
            return res.render(
                'errorpages/404',
                sendData(
                    500,
                    'Internal Server Error',
                    err.message,
                    '/seller/'
                )
            );
        }
    }else{
        return res.redirect('/seller/')
    }
};
const sendMessageToAdmin = async (req, res) => {
    if (req.session.user && req.session.role === 'seller') {
        const { message } = req.body;
        const user = await Seller.findOne({ email: req.session.user }, '_id');
        const userId = user._id;
        const admin = await Admin.findOne({});
        const adminId = admin._id;
        try {
            Chat(message, userId, adminId, userId)
                .then(async (data) => {
                    await Log.create({
                        text: `Seller sent you message {email : ${req.session.user}}`,
                        date: new Date()
                    })
                    return res.redirect('/seller/admin-chat');
                })
                .catch((err) => {
                    {
                        return res.render(
                            'errorpages/404',
                            sendData(500, err.message, '', '/seller/admin-chat')
                        );
                    }
                });
        } catch (err) {
            console.log(err);
            res.render(
                'errorpages/404',
                sendData(
                    500,
                    'Internal Server Error',
                    err.message,
                    '/seller/countdown'
                )
            );
        }
    }
};

const chatWithAgent = async (req, res) => {
    if (req.session.user && req.session.role === 'seller') {
        const { id } = req.params;
        console.log(id);
        const { message } = req.body;
        const user = await Seller.findOne({ email: req.session.user }, '_id');
        const userId = user._id;
        const agent = await Agent.findOne({ _id: id });
        const agentId = agent._id;
        try {
            Chat(message, userId, agentId, userId)
                .then(async (data) => {
                    await Log.create({
                        text: `Seller sent agent a message {email : ${req.session.user}}`,
                        date: new Date()
                    })
                    return res.redirect('/seller/agent-chat');
                })
                .catch((err) => {
                    {
                        return res.render(
                            'errorpages/404',
                            sendData(500, err.message, '', '/seller/agent-chat')
                        );
                    }
                });
        } catch (err) {
            console.log(err);
            res.render(
                'errorpages/404',
                sendData(
                    500,
                    'Internal Server Error',
                    err.message,
                    '/seller/agent-chat'
                )
            );
        }
    }
};
const getStateListing = async (req, res) => {
    const { zipCode, commisionRate } = req.params;
    if (req.session.user && req.session.role == 'seller') {
        try {
            const agents = await Agent.find({ commision: commisionRate });
        } catch (err) {
            return res.render(
                'errorpages/404',
                sendData(
                    500,
                    'Internal Server Error',
                    err.message,
                    '/seller/agent-chat'
                )
            );
        }
    } else {
        res.redirect('/seller/');
    }
};
const sendInvite = async (req, res)=>{
    if(req.session.user && req.session.role == 'seller'){
        const {aid} = req.params;
        const seller = await Seller.findOne({email: req.session.user})
        const agent = await Agent.findOne({_id: aid})
        const text = `Dear ${agent.name}\nI would like you to bid on my other properties as well, upon the completion of this deal. Would love to work together\n. Regards ${seller.name}`
        const html = `<h3>Dear ${agent.name}</h3><p>I would like you to bid on my other properties as well, upon the completion of this deal. Would love to work together.</p><h4>Regards ${seller.name}</h4>`
        await sendMail(agent.email, `Invitation to carry on with the trust`,text, html)
        await Log.create({
            text: `Seller sent invitation upon successfull deal {email : ${email}}`,
            date: new Date()
        })
        return res.redirect('/seller/successfull-bids')
    }else{
        return res.redirect('/seller/')
    }
}
const sendInvitationToBid = async (req, res)=>{
    if(req.session.user && req.session.role == 'seller'){
        const {aid, state} = req.params;
        const agent = await Agent.findOne({_id: aid})
        const seller = await Seller.findOne({email: req.session.user})
        const text = `Dear ${agent.name}\nI would like you to bid on my properties \n. Regards ${seller.name}`
        const html = `<h3>Dear ${agent.name}</h3><p>I would like you to bid on my properties.</p><h4>Regards ${seller.name}</h4>`
        await sendMail(agent.email, `Invitation to carry on with the trust`,text, html)
        if(state == 1){

            return res.redirect('/seller/state-listing')
        }else if(state == 2){
            return res.redirect('/seller/country-listing')
        }
    }else{
        return res.redirect('/seller/')
    }
}
const sendInviteToBidAgain = async (req, res)=>{
    if(req.session.user && req.session.role == 'seller'){
        const {aid} = req.params;
        const agent = await Agent.findOne({_id: aid})
        const seller = await Seller.findOne({email: req.session.user})
        const text = `Dear ${agent.name}\nI would like you to bid on my Again. Lower the commision and I would reconsider your bid\n. Regards ${seller.name}`
        const html = `<h3>Dear ${agent.name}</h3><p>I would like you to bid on my Again. Lower the commision and I would reconsider your bid.</p><h4>Regards ${seller.name}</h4>`
        await sendMail(agent.email, `Invitation to Bid with less commision`,text, html)
        await Log.create({
            text: `Seller sent invitation to rebid with less commision {email : ${seller.email}}`,
            date: new Date()
        })
        return res.redirect('/seller/rejected-bids')
    }else{
        return res.redirect('/seller/')
    }
}
const turnPromotionalMessages = async (req, res)=>{
    if(req.session.user && req.session.role === 'seller'){
        const {btn} = req.body
        console.log(btn)
        await Seller.updateOne({email: req.session.user}, {
            $set: {promotionalMessageState: btn === 'yes' ? true : false}
        })
        return res.redirect('/seller/promotional-messages')
    }else{
        return res.redirect('/seller/')
    }
}
const deletePromotionalMessages = async (req, res)=>{
    if(req.session.user && req.session.role == 'seller'){
        const seller = await Seller.findOne({email: req.session.user})
        seller.promotionalMessages = []
        await seller.save()
        return res.redirect('/seller/promotional-messages')
    }else{
        return res.redirect('/seller/')
    }
}
const postAccountDetails = async (req, res)=>{
    if(req.session.user && req.session.role == 'seller'){
        const {accountNumber, amount} = req.body
        const buyer = await Seller.findOne({email: req.session.user})
        const exists = await BankDetail.exists({
            userId: buyer._id
        })
        if(exists){
            await BankDetail.updateOne({userId: buyer._id},{
                $set: {accountNumber, amount}
            })
        }else{
            await BankDetail.create({
                userId: buyer._id,
                accountNumber,
                amount
            })
        }
        return res.redirect('/seller/promotional-messages')
    }else{
        return res.redirect('/seller/')
    }
}
const deleteMessage = async (req, res)=>{
    if(req.session.user && req.session.role == 'seller'){
        const {mid} = req.params
        const seller = await Seller.findOne({email: req.session.user})

        seller.promotionalMessages = seller.promotionalMessages.filter(message=>!message._id.equals(mid))

        await seller.save();
        return res.redirect('/seller/promotional-messages')
    }else{
        return res.redirect('/seller/')
    }
}
module.exports = {
    registerSeller,
    handleLogout,
    login,
    editProfileCredentials,
    changePassword,
    addProperty,
    editCountDown,
    editPropertyDetails,
    startCountDown,
    acceptBid,
    rejectBid,
    sendMessageToAdmin,
    chatWithAgent,
    getStateListing,
    sendInvite,
    sendInvitationToBid,
    sendInviteToBidAgain,
    turnPromotionalMessages,
    deletePromotionalMessages,
    postAccountDetails,
    deleteMessage
};

const bcrypt = require('bcrypt');
const {
    Agent,
    Seller,
    Admin,
    PromotionalMessage,
    Bid,
    Buyer,
    Log,
    ReferralAgreement,
} = require('../models/Users');
const url = require('url');
const { EmailTemplate } = require('./EmailTemplate');
const { sendMail } = require('./sendMailController');
const {
    agentSchemaStepOne,
    agentSchemaStepTwo,
    agentSchemaStepThree,
    agentSchemaStepFour,
} = require('./../middleware/validation/user');
const {
    updateAgentCredentials,
    updatePassword,
} = require('./../middleware/validation/updateUser');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const { sendData } = require('./helperFunction');
const path = require('path');
const { Chat } = require('./Chat');
const { date } = require('joi');
const { contentSecurityPolicy } = require('helmet');

// APIs here
const registerAgentStepOne = async (req, res) => {
    const {
        name,
        screenName,
        email,
        password,
        professionalCategory,
        professionalTitle,
    } = req.body;

    if (
        !name ||
        !screenName ||
        !email ||
        !password ||
        !professionalCategory ||
        !professionalTitle
    )
        return res.render('errorpages/404', {
            status: 400,
            error: 'Bad Request',
            message: 'All fields are required',
            url: '/agent/register/step1',
        });

    try {
        await agentSchemaStepOne.validateAsync(req.body);
    } catch (e) {
        console.log(e);
        return res.render('errorpages/404', {
            status: 400,
            error: 'Bad Request',
            message: e.message,
            url: '/agent/register/step1',
        });
    }

    // check for duplicate usernames in database
    const duplicate = await Agent.exists({ email: email });

    if (duplicate)
        return res.render('errorpages/404', {
            status: 409,
            error: 'Conflict',
            message: 'Another user with same email exists',
            url: '/agent/register/step1',
        });

    try {
        //   encrypt the password
        const hashedPassword = await bcrypt.hash(password, 10);
        // store the new user

        const user = await Agent.create({
            name: name,
            screenName: screenName,
            email: email,
            password: hashedPassword,
            professionalTitle: professionalTitle,
            professionalCategory: professionalCategory,
            status: 'not decided',
            createdAt: new Date(),
            updatedAt: new Date(),
        });
        return res.redirect(
            url.format({
                pathname: '/agent/register/step2',
                query: {
                    email: (await Agent.findOne({ email })).email,
                },
            })
        );
    } catch (err) {
        res.render('errorpages/404', {
            status: 500,
            error: 'Internal Server Error',
            message: err.message,
            url: '/agent/register/step1',
        });
    }
};
const registerAgentStepOneWithEmailAndPassword = async (req, res) => {
    console.log('hello world frpom email and password');
    const {
        name,
        screenName,
        email,
        password,
        professionalCategory,
        professionalTitle,
    } = req.body;

    if (
        !name ||
        !screenName ||
        !email ||
        !password ||
        !professionalCategory ||
        !professionalTitle
    )
        return res.render('errorpages/404', {
            status: 400,
            error: 'Bad Request',
            message: 'All fields are required',
            url: '/agent/register/step1',
        });

    try {
        await agentSchemaStepOne.validateAsync(req.body);
    } catch (e) {
        console.log(e);
        return res.render('errorpages/404', {
            status: 400,
            error: 'Bad Request',
            message: e.message,
            url: '/agent/register/step1',
        });
    }

    // check for duplicate usernames in database
    const duplicate = await Agent.exists({ email: email });

    if (duplicate)
        return res.render('errorpages/404', {
            status: 409,
            error: 'Conflict',
            message: 'Another user with same email exists',
            url: '/agent/register/step1',
        });

    try {
        //   encrypt the password
        const hashedPassword = await bcrypt.hash(password, 10);
        // store the new user

        const user = await Agent.create({
            name: name,
            screenName: screenName,
            email: email,
            password: hashedPassword,
            professionalTitle: professionalTitle,
            professionalCategory: professionalCategory,
            status: 'not decided',
            invited: true,
            createdAt: new Date(),
            updatedAt: new Date(),
        });
        return res.redirect(
            url.format({
                pathname: '/agent/register/step2',
                query: {
                    email: (await Agent.findOne({ email })).email,
                },
            })
        );
    } catch (err) {
        res.render('errorpages/404', {
            status: 500,
            error: 'Internal Server Error',
            message: err.message,
            url: '/agent/register/step1',
        });
    }
};
const registerAgentStepTwo = async (req, res) => {
    const {
        email,
        city,
        timeZone,
        brokerageAddress,
        primaryPhone,
        brokeragePhone,
    } = req.body;
    console.log(req.body);
    if (
        !email ||
        !city ||
        !timeZone ||
        !brokerageAddress ||
        !primaryPhone ||
        !brokeragePhone
    )
        return res.render('errorpages/404', {
            status: 400,
            error: 'Bad Request',
            message: 'All fields are required',
            url:
                '/agent/register/step2?email=' +
                (await Agent.findOne({ email })).email,
        });

    try {
        await agentSchemaStepTwo.validateAsync(req.body);
    } catch (e) {
        return res.render('errorpages/404', {
            status: 400,
            error: 'Bad Request',
            message: 'All fields are required',
            url:
                '/agent/register/step2?email=' +
                (await Agent.findOne({ email })).email,
        });
    }

    try {
        const user = await Agent.updateOne(
            { email: email },
            {
                city,
                timeZone,
                brokerageAddress,
                primaryPhone,
                brokeragePhone,
            }
        );
        return res.redirect(
            url.format({
                pathname: '/agent/register/step3',
                query: {
                    email: (await Agent.findOne({ email })).email,
                },
            })
        );
    } catch (err) {
        return res.render('errorpages/404', {
            status: 500,
            error: 'Internal Server Error',
            message: err.message,
            url:
                '/agent/register/step2?email=' +
                (await Agent.findOne({ email })).email,
        });
    }
};
const registerAgentStepThree = async (req, res) => {
    let {
        email,
        state,
        date,
        description,
        license,
        serviceAreas,
        commision,
        option,
    } = req.body;
    if (option === 'Yes' && commision <= 3) {
        commision = parseInt(commision);
    } else {
        commision = Number('3');
    }

    if (
        !email ||
        !state ||
        !date ||
        !description ||
        !license ||
        !serviceAreas ||
        !commision
    )
        return res.render('errorpages/404', {
            status: 400,
            error: 'Bad Request',
            message: 'All Fields are required',
            url:
                '/agent/register/step3?email=' +
                (await Agent.findOne({ email })).email,
        });

    try {
        await agentSchemaStepThree.validateAsync({
            email,
            state,
            date,
            description,
            license,
            serviceAreas,
            commision,
            option,
        });
    } catch (e) {
        return res.render('errorpages/404', {
            status: 400,
            error: 'Bad Request',
            message: e.message,
            url:
                '/agent/register/step3?email=' +
                (await Agent.findOne({ email })).email,
        });
    }

    try {
        const user = await Agent.updateOne(
            { email: email },
            {
                state,
                date,
                description,
                license,
                serviceAreas,
                commision,
            }
        );
        return res.redirect(
            url.format({
                pathname: '/agent/register/step4',
                query: {
                    email: (await Agent.findOne({ email })).email,
                },
            })
        );
    } catch (err) {
        return res.render('errorpages/404', {
            status: 500,
            error: 'Internal Server Error',
            message: err.message,
            url:
                '/agent/register/step3?email=' +
                (await Agent.findOne({ email })).email,
        });
    }
};
const registerAgentStepFour = async (req, res) => {
    const { email, reviewOne, reviewTwo, reviewThree } = req.body;

    if (!email || !reviewOne || !reviewTwo || !reviewThree)
        return res.render('errorpages/404', {
            status: 400,
            error: 'Bad Request',
            message: 'All fields are required',
            url:
                '/agent/register/step4?email=' +
                (await Agent.findOne({ email })).email,
        });

    try {
        await agentSchemaStepFour.validateAsync(req.body);
    } catch (e) {
        return res.render('errorpages/404', {
            status: 400,
            message: e.message,
            error: 'Bad Request',
            url:
                '/agent/register/step4?email=' +
                (await Agent.findOne({ email })).email,
        });
    }

    try {
        const user = await Agent.updateOne(
            { email: email },
            {
                reviewOne,
                reviewTwo,
                reviewThree,
                completed: 'Completed',
            }
        );
        const agent = await Agent.findOne({email: email})

        const html = EmailTemplate(
            'Agent Registered',
            'Update Details',
            (await Agent.findOne({ email })).name,
            (await Agent.findOne({ email })).email,
            (await Agent.findOne({ email })).primaryPhone,
            (await Agent.findOne({ email })).state,
            (await Agent.findOne({ email })).city,
            (await Agent.findOne({ email })).commision,
            (await Agent.findOne({ email })).brokerageAddress,
            'http://www.google.com'
        );
        const htmlAgent = EmailTemplate(
            'You Registered As Agent',
            'Your Details',
            (await Agent.findOne({ email })).name,
            (await Agent.findOne({ email })).email,
            (await Agent.findOne({ email })).primaryPhone,
            (await Agent.findOne({ email })).state,
            (await Agent.findOne({ email })).city,
            (await Agent.findOne({ email })).commision,
            (await Agent.findOne({ email })).brokerageAddress,
            'http://www.google.com'
        );
        sendMail(
            process.env.ADMIN_EMAIL,
            'New Agent Registered',
            'New Agent has been registered',
            html
        ).then((data) => {
            sendMail(
                email,
                'You Registration Was Successfull',
                'You have successfully Registered',
                htmlAgent
            ).then((data) => {
                return res.redirect(`/agent/register-plan/${agent._id}`);
            });
        });
    } catch (err) {
        console.log(err.message);
        return res.render('errorpages/404', {
            status: 500,
            error: 'Internal Server Error',
            message: err.message,
            url:
                '/agent/register/step4?email=' +
                (await Agent.findOne({ email })).email,
        });
    }
};
const loginAgent = async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password)
        return res
            .status(400)
            .json({ message: 'email and password are required' });
    let foundUser = await Agent.findOne({ email: email });
    if (!foundUser) return res.sendStatus(401); //Unauthorized
    //   Evaluate password
    const completed = (await Agent.findOne({ email: email })).completed;
    if (completed !== 'Completed') {
        await Agent.deleteOne({ email: email });
        return res.render('errorpages/404', {
            status: 401,
            error: 'Unauthorized',
            message: e.message,
            url: '/agent',
        });
    }
    const match = await bcrypt.compare(password, foundUser.password);

    if (match  && foundUser.status == 'approved') {
        req.session.user = email;
        req.session.name = (await Agent.findOne({ email })).name;
        req.session.role = 'agent';
        return res.redirect('/agent/main');
    }else{
        return res.render('errorpages/not-approved')
    }
};
const handleLogout = async (req, res) => {
    if (req.session.user) {
        req.session.destroy(function (err) {
            if (err)
                return res.render('errorpages/404', {
                    status: 403,
                    error: 'Forbidden',
                    message: '',
                    url: '/agent/main',
                });
            return res.redirect('/agent/');
        });
    } else {
        return res.redirect('/agent/');
    }
};

// const handleRefreshToken = async (req, res) => {
//   const cookies = req.cookies;
//   if (!cookies?.jwt) return res.sendStatus(401);
//   const refreshToken = cookies.jwt;

//   const foundUser = await Agent.exists({ refreshToken: refreshToken });
//   const foundUserCreds = await Agent.findOne({ refreshToken });

//   if (!foundUser) return res.sendStatus(403); //Forbidden
//   //   Evaluate jwt

//   jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET, (err, decoded) => {
//     if (err || foundUserCreds.email !== decoded.email)
//       return res.sendStatus(403);
//     const accessToken = jwt.sign(
//       {
//         email: decoded.email,
//       },
//       process.env.ACCESS_TOKEN_SECRET,
//       { expiresIn: "30s" }
//     );
//     res.json({ accessToken });
//   });
// };
const updateProfile = async (req, res) => {
    const { name, email, brokeragePhone, commision } = req.body;
    console.log(brokeragePhone);
    if (!brokeragePhone || !commision)
        return res.render('errorpages/404', {
            status: 401,
            error: 'Bad Request',
            message: 'All Fields are required',
            url: '/agent/edit-profile',
        });
    try {
        await updateAgentCredentials.validateAsync(req.body);
    } catch (e) {
        return res.render('errorpages/404', {
            status: 500,
            error: 'Internal Server Error',
            message: e.message,
            url: '/agent/edit-profile',
        });
    }
    try {
        await Agent.updateOne(
            { email: req.session.user },
            {
                brokeragePhone,
                commision,
                updatedAt: new Date(),
            }
        );
        res.redirect('/agent/edit-profile');
    } catch (e) {
        return res.render('errorpages/404', {
            status: 500,
            error: 'Internal Server Error',
            message: e.message,
            url: '/agent/edit-profile',
        });
    }
};

const changePassword = async (req, res) => {
    const { password } = req.body;
    console.log(password);
    if (!password)
        return res.render('errorpages/404', {
            status: 401,
            error: 'Bad Request',
            message: 'Password is required',
            url: '/agent/edit-profile',
        });
    try {
        await updatePassword.validateAsync(req.body);
    } catch (e) {
        return res.render('errorpages/404', {
            status: 500,
            error: 'Internal Server Error',
            message: e.message,
            url: '/agent/edit-profile',
        });
    }
    try {
        const pwd = await bcrypt.hash(password, 10);
        await Agent.updateOne(
            { email: req.session.user },
            {
                pwd,
            }
        );
        res.redirect('/agent/edit-profile');
    } catch (e) {
        return res.render('errorpages/404', {
            status: 500,
            error: 'Internal Server Error',
            message: e.message,
            url: '/agent/edit-profile',
        });
    }
};
const changeProfilePicture = async (req, res) => {
    const { profilePicture } = req.body;
    if (req.session.user && req.session.role == 'agent') {
        img = path.join(
            '/',
            profilePicture.split('/').at(-2),
            profilePicture.split('/').at(-1)
        );
        try {
            const data = await Agent.updateOne(
                { email: req.session.user },
                {
                    profilePicture: img,
                }
            );
            return res.redirect('/agent/edit-profile');
        } catch (err) {
            console.log(err);
            return res.render(
                '500',
                'Internal Server Error',
                err.message,
                '/agent/edit-profile'
            );
        }
    } else {
        return res.render(
            'errorpages/404',
            sendData(401, 'Unauthorized', '', '/agent/')
        );
    }
};
const saveCharityDetails = async (req, res) => {
    //charity implementation here
    const { charity_name, charity_name_input } = req.body;

    try {
        if (charity_name_input === '') {
            await Agent.updateOne(
                { email: req.session.user },
                {
                    'charity.firm': charity_name,
                    donation: '10$',
                }
            );
        } else {
            await Agent.updateOne(
                { email: req.session.user },
                {
                    'charity.firm': charity_name_input,
                    donation: '10$',
                }
            );
        }
        const { id } = req.params;
        if (id == 1) {
            return res.status(200).redirect('/agent/seller-countdown');
        } else if (id == 2) {
            return res.status(200).redirect('/agent/buyer-countdown');
        } else {
            return res.redirect('/agent/');
        }
    } catch (e) {
        return res.render(
            'errorpages/404',
            sendData(500, e.message, '', '/agent/charity')
        );
    }
};
const bidForProperty = async (req, res) => {
    if(req.session.user && req.session.role == 'agent'){
        const { id, uid } = req.params;

        try {
            const agent = await Agent.findOne({ email: req.session.user });
            //save the bid
            const {
                screenName,
                profilePicture,
                commision,
                id: agentId,
            } = req.body;
            console.log(req.body)
            console.log(id, uid)
            const seller = await Seller.findOne(
                { _id: uid, 'properties._id': id },
                'properties.$'
            );

            const exist = await Bid.exists({
                agentId: agentId,
                userId: uid,
                bidOnProperty: id,
            });
            console.log(exist)
            if (!exist) {
                console.log(`Inserting record...`)
                await Bid.create({
                    role: 'Seller',
                    agentId: agentId,
                    userId: uid,
                    bidOnProperty: id,
                    agentProfilePicture: profilePicture,
                    screenName: screenName,
                    commision: commision,
                    status: 'Waiting',
                    bidOverAt: seller.properties[0].countdownOverAt,
                });
            }else{
                console.log("Already exists")
                const bid = await Bid.findOne({
                    agentId: agentId,
                    userId: uid,
                    bidOnProperty: id,
                })
                return res.render(
                    'errorpages/404',
                    sendData(500, 'Already Bid', 'You have already placed a bid. To check status go to My Countdown Section', '/agent/seller-countdown')
                );
            }
            return res.redirect('/agent/seller-countdown');
        } catch (err) {
            console.log(err.message)
            return res.redirect('/agent/');
        }
    }else{
        return res.redirect('/agent/')
    }
};

const updateBid = async (req, res) => {
    const { commision, id } = req.body;
    console.log(commision, id);
    try {
        const data = await Agent.updateOne(
            { _id: id },
            { commision: commision }
        );
        console.log(data);
        return res.redirect('/agent/seller-countdown');
    } catch (err) {
        console.log(err);
        return res.render(
            'errorpages/404',
            sendData(500, err.message, '', '/agent/charity')
        );
    }
};
const chatWithAdmin = async (req, res) => {
    if (req.session.user && req.session.role == 'agent') {
        const { message } = req.body;
        try {
            const agent = await Agent.findOne(
                { email: req.session.user },
                '_id'
            );
            const agentId = agent._id;
            const admin = await Admin.findOne({});
            const adminId = admin._id;

            Chat(message, agentId, adminId, agentId)
                .then((data) => {
                    return res.redirect('/agent/admin-chat');
                })
                .catch((err) => {
                    {
                        return res.render(
                            'errorpages/404',
                            sendData(500, err.message, '', '/agent/charity')
                        );
                    }
                });
        } catch (err) {
            console.log(
                '🚀 ~ file: AgentController.js ~ line 630 ~ chatWithAdmin ~ err',
                err
            );
            return res.render(
                'errorpages/404',
                sendData(500, err.message, '', '/agent/admin-chat')
            );
        }
    } else {
        return res.redirect('/agent/');
    }
};

const chatWithParticularRole = async (req, res) => {
    if (req.session.user && req.session.role === 'agent') {
        //sellerId
        const { id, state } = req.params;
        //message
        const { message } = req.body;
        const agent = await Agent.findOne({ email: req.session.user });
        const agentId = agent._id;
        try {
            await Chat(message, id, agentId, agentId);
            if(state == 1){
                return res.redirect(`/agent/chat/${id}/1`);
            }else if(state == 2){
                return res.redirect(`/agent/chat/${id}/2`);
            }
        } catch (err) {
            return res.render(
                'errorpages/404',
                sendData(500, err.message, '', '/agent/chat')
            );
        }
    } else {
        return res.redirect('/agent/');
    }
};

// helper function
const findSellerPropertyCoundown = async (seller, id) => {
    return new Promise((resolve, reject) => {
        seller.bids.forEach((bid) => {
            bid?.propertyBelongsTo?.properties.forEach((property) => {
                resolve(property.countdownOverAt);
            });
        });
    });
};

const removePropertyIfNull = async (seller, _id) => {
    return new Promise((resolve) => {
        const arr = seller.bids.filter(
            (prop) => prop.propertyBelongsTo !== _id
        );
        resolve(arr);
    });
};
const chatSeller = async (req, res) => {
    if (req.session.user && req.session.role == 'agent') {

        try {
            //sellerId
            const { id } = req.params;
            const {state} = req.params;
            //message
            const { message } = req.body;
            const agent = await Agent.findOne({ email: req.session.user });
            const agentId = agent._id;
            try {
                await Chat(message, id, agentId, agentId);

                if(state == 2){
                    return res.redirect(`/agent/buyer-chat`);
                }else{
                    return res.redirect(`/agent/seller-chat`);
                }
            } catch (err) {
                if(state == 2){
                    return res.render(
                        'errorpages/404',
                        sendData(500, err.message, '', '/agent/buyer-chat')
                    );
                }else{
                    return res.render(
                        'errorpages/404',
                        sendData(500, err.message, '', '/agent/seller-chat')
                    );
                }

            }
        } catch (err) {
            const {state} = req.params;
            if(state == 2){
                return res.render(
                    'errorpages/404',
                    sendData(500, err.message, '', '/agent/buyer-chat')
                );
            }else{
                return res.render(
                    'errorpages/404',
                    sendData(500, err.message, '', '/agent/seller-chat')
                );
            }
        }
    } else {
        res.redirect('/agent/');
    }
};
const setPromotionalMessage = async (req, res) => {
    if (req.session.user && req.session.role == 'agent') {
        const { message } = req.body;
        try {
            const agent = await Agent.findOne({ email: req.session.user });
            await PromotionalMessage.create({
                message,
                agentId: agent._id,
            });

            return res.redirect('/agent/promotional-messages');
        } catch (err) {
            return res.render(
                'errorpages/404',
                sendData(500, err.message, '', '/agent/promotional-messages')
            );
        }
    } else {
        res.redirect('/agent/');
    }
};
const setCharityBuyer = async (req, res) => {
    if (req.session.user && req.session.role === 'agent') {
        const { id } = req.params;
        const { charityLocation } = req.body;
        try {
            await Agent.updateOne(
                { email: req.session.user },
                {
                    $set: {
                        'promotionalMessagesBuyer.charityLocation':
                            charityLocation,
                    },
                }
            );
            res.redirect(`/agent/buyer-listing/${id}`);
        } catch (err) {
            return res.render(
                'errorpages/404',
                sendData(500, err.message, '', `/agent/charity-buyer/${id}`)
            );
        }
    } else {
        res.redirect('/agent/');
    }
};
const setCharitySeller = async (req, res) => {
    if (req.session.user && req.session.role === 'agent') {
        const { id } = req.params;
        console.log(id);
        const { charityLocation } = req.body;
        try {
            await Agent.updateOne(
                { email: req.session.user },
                {
                    $set: {
                        'promotionalMessagesSeller.charityLocation':
                            charityLocation,
                    },
                }
            );
            res.redirect(`/agent/seller-listing/${id}`);
        } catch (err) {
            return res.render(
                'errorpages/404',
                sendData(500, err.message, '', `/agent/charity-seller/${id}`)
            );
        }
    } else {
        res.redirect('/agent/');
    }
};
const sendPromotionalMessage = async (req, res) => {
    if (req.session.user && req.session.role === 'agent') {
        try {
            const { checked } = req.body;
            const total = 0;
            total = Array.isArray(checked) ? checked.length : 1;
            const messages = await PromotionalMessage.find({});
            await PromotionalMessage.updateOne(
                { agentId: id },
                { $set: { count: messages.count + total } }
            );
            if (Array.isArray(checked)) {
                // checked.forEach(id=>{
                //     const data = await Buyer.findOne({_id:id})
                //     data.promotionalMessages.push({
                //     })
                // })
            }
        } catch (err) {
            return res.redirect('/agent/');
        }
    }
};
const setBuyerListing = async (req, res) => {
    if (req.session.user && req.session.role === 'agent') {
        const { id } = req.params;
        const { checked } = req.body;
        const totalMessages = Array.isArray(checked) ? checked.length : 1;
        try {
            const agent = await Agent.findOne({ email: req.session.user });
            const count = await PromotionalMessage.findOne({
                agentId: agent._id,
            });
            //! Add count of messages here
            //count.count = count.count += totalMessages;
            //await count.save();
            const message = await PromotionalMessage.findOne({ _id: id });
            console.log(message);
            if (Array.isArray(checked)) {
                checked.forEach(async (person) => {
                    const buyer = await Buyer.findOne({ _id: person });
                    buyer.promotionalMessages.push({
                        agentId: agent._id,
                        message: message.message,
                        approve: false,
                    });
                    await buyer.save();
                });

                return res.redirect(`/agent/buyer-listing/${id}`);
            } else {
                const buyer = await Buyer.findOne({ _id: checked });
                buyer.promotionalMessages.push({
                    agentId: agent._id,
                    message: message.message,
                    approve: false,
                });
                await buyer.save();
                return res.redirect(`/agent/buyer-listing/${id}`);
            }
        } catch (err) {
            console.log(err);
            return res.redirect('/agent/');
        }
    }
};
const setSellerListing = async (req, res) => {
    if (req.session.user && req.session.role === 'agent') {
        const { id } = req.params;
        const { checked } = req.body;
        const totalMessages = Array.isArray(checked) ? checked.length : 1;
        try {
            const agent = await Agent.findOne({ email: req.session.user });
            const count = await PromotionalMessage.findOne({
                agentId: agent._id,
            });
            //! Add count of messages here
            //count.count = count.count += totalMessages;
            //await count.save();
            const message = await PromotionalMessage.findOne({ _id: id });
            console.log(message);
            if (Array.isArray(checked)) {
                checked.forEach(async (person) => {
                    console.log(person);
                    const seller = await Seller.findOne({ _id: person });
                    seller.promotionalMessages.push({
                        agentId: agent._id,
                        message: message.message,
                        approve: false,
                    });
                    await seller.save();
                });

                return res.redirect(`/agent/seller-listing/${id}`);
            } else {
                const seller = await Seller.findOne({ _id: checked });
                seller.promotionalMessages.push({
                    agentId: agent._id,
                    message: message.message,
                    approve: false,
                });
                await seller.save();
                return res.redirect(`/agent/seller-listing/${id}`);
            }
        } catch (err) {
            console.log(err);
            return res.redirect('/agent/');
        }
    }
};
const updateBuyerBid = async (req, res) => {
    const { id } = req.params;
    if (req.session.user && req.session.role == 'agent') {
    } else {
        return res.redirect('/agent/');
    }
};
const bidOnProperty = async (req, res) => {
    if (req.session.user && req.session.role == 'agent') {
        const { id, uid } = req.params;

        try {
            const agent = await Agent.findOne({ email: req.session.user });
            //save the bid
            const {
                screenName,
                profilePicture,
                commision,
                id: agentId,
            } = req.body;

            const buyer = await Buyer.findOne(
                { _id: uid, 'properties._id': id },
                'properties.$'
            );

            const exist = await Bid.findOne({
                agentId: agentId,
                userId: uid,
                bidOnProperty: id,
            }).count();

            if (exist == 0) {
                await Bid.create({
                    role: 'Buyer',
                    agentId: agentId,
                    userId: uid,
                    bidOnProperty: id,
                    agentProfilePicture: profilePicture,
                    screenName: screenName,
                    commision: commision,
                    status: 'Waiting',
                    bidOverAt: buyer.properties[0].countdownOverAt,
                });
            }else if(exist == 1 ){

                const bid = await Bid.findOne({
                    agentId: agentId,
                    userId: uid,
                    bidOnProperty: id,
                })
                return res.render(
                    'errorpages/404',
                    sendData(500, 'Already Bid', 'You have already placed a bid. To check status go to My Countdown Section', '/agent/buyer-countdown')
                );
            }
            return res.redirect('/agent/buyer-countdown');
        } catch (err) {
            console.log(err.message)
            return res.redirect('/agent/');
        }
    } else {
        return res.redirect('/agent/');
    }
};
const rebid = async (req, res)=>{
    if(req.session.user && req.session.role == 'agent'){
        try{
            const {uid, aid, pid} = req.params;
            const  {commision} = req.body;
            const bid = await Bid.findOne({
                userId: uid,
                agentId: aid,
                bidOnProperty: pid
            })

            const exists = await Bid.exists({
                userId: uid,
                agentId: aid,
                bidOnProperty: pid,
                status: 'Rejected'
            })

            await Bid.updateOne({
                userId: uid,
                agentId: aid,
                bidOnProperty: pid
            }, {$set: {status: 'Rebid'}})

            if(exists){
                await Bid.create({
                    userId: uid,
                    agentId: aid,
                    bidOnProperty: pid,
                    status:'Waiting',
                    commision,
                    bidOverAt: bid.bidOverAt,
                    agentProfilePicture: bid.agentProfilePicture,
                    role: bid.role,
                    screenName: bid.screenName
                })
                return res.redirect('/agent/rejected-bids')
            }
        }catch(err){
            console.log(err)
            return res.render(
                'errorpages/404',
                sendData(500, 'Internal Server Error', err.message, '/buyer/')
            );
        }
    }else{
        return res.redirect('/agent/')
    }
}
const inviteOnSuccess = async (req, res)=>{
    if(req.session.user && req.session.role == 'agent'){
        const {uid, state} = req.params;
        const agent = await Agent.findOne({email: req.session.user})
        try{
            if(state == 1){
                const user = await Seller.findOne({_id :uid})
                const text = `Dear ${user.name}\n
                            Upon successfull deal on your property,
                            I invite you to carry this trust forward.
                            Looking forward to great future.\nRegards ${agent.name}`
                const html = `<h3>Dear ${user.name}</h3><p>Upon successfull deal on your property,
                I invite you to carry this trust forward.
                Looking forward to great future.</p><h3>Regards ${agent.name}</h3>`
                await sendMail(user.email, 'Invitation to strengthen agent, seller relationship',text, html)
            }else if(state == 2){
                const user = await Buyer.findOne({_id :uid})
                const text = `Dear ${user.name}\n
                            Upon successfull deal with you,
                            I invite you to carry this trust forward.
                            Looking forward to great future.\nRegards ${agent.name}`
                const html = `<h3>Dear ${user.name}</h3><p>Upon successfull deal with you,
                I invite you to carry this trust forward.
                Looking forward to great future.</p><h3>Regards ${agent.name}</h3>`
                await sendMail(user.email, 'Invitation to strengthen agent, buyer relationship',text, html)
            }

            return res.redirect('/agent/successfull-bids')
        }catch(err){
            return res.render(
                'errorpages/404',
                sendData(500, 'Internal Server Error', err.message, '/agent/successfull-bids')
            );
        }
    }else{
        return res.redirect('/agent/')
    }
}
const reactToReferralAgreement = async (req, res)=>{
    const {aid} = req.params;
    console.log(aid)
    const {brokerB, dateBrokerB, status} = req.body
    if(req.session.user && req.session.role == 'agent'){
        console.log(req.body)
        try{
        await ReferralAgreement.updateOne({_id: aid},{
            $set: {
                brokerB,
                dateBrokerB,
                status: status === 'on' ? 'Accepted' : 'Rejected'
            }

        })
        return res.redirect('/agent/referral-agreement')
    }catch(err){
            console.log(err.message);
            return res.redirect('/agent/referral-agreement')
        }

    }else{
        return res.redirect('/agent/')
    }
}
const stripe = require('stripe')('sk_test_51Kze91K4WqwChaQkcFIRs6OGhdTLyUa0jMXFKcJgsa7Vw3P5W4rnlK16RrEfxSysOLQ0NYONqXx8M6pRnOhxFuID003VviyN4Z');

const getPayment = async (req, res) => {
    try {
        console.log("stripe");
        const { product ,success_url} = req.body;

        const session = await stripe.checkout.sessions.create({
            payment_method_types: ["card"],
            line_items: [
                {
                    price_data: {
                        currency: "usd",
                        product_data: {
                            name: product.name,
                
                        },
                        unit_amount: product.amount * 100,
                    },
                    
                    quantity: product.quantity,
                },
            ],
            mode: "payment",
            success_url: 'http://localhost:3500'+success_url,
            cancel_url: `http://localhost:3500/agent/`,
        });
    console.log("//////",session.id);
        res.json({ id: session.id });

    
    } catch (e) {
res.json(e)
    }
}
module.exports = {
    updateProfile,
    registerAgentStepOne,
    registerAgentStepTwo,
    registerAgentStepThree,
    registerAgentStepFour,
    loginAgent,
    handleLogout,
    changePassword,
    changeProfilePicture,
    saveCharityDetails,
    bidForProperty,
    updateBid,
    chatWithAdmin,
    chatWithParticularRole,
    chatSeller,
    setPromotionalMessage,
    setCharityBuyer,
    setCharitySeller,
    sendPromotionalMessage,
    setBuyerListing,
    setSellerListing,
    registerAgentStepOneWithEmailAndPassword,
    bidOnProperty,
    rebid,
    inviteOnSuccess,
    reactToReferralAgreement,
    getPayment
};

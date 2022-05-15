const bcrypt = require('bcrypt');
const { Buyer, Admin, Bid, Agent, Log, BankDetail } = require('../models/Users');
const { sellerSchema } = require('./../middleware/validation/user');
const { EmailTemplateSeller } = require('./EmailTemplate');
const { sendMail } = require('./sendMailController');
const { sendData } = require('./helperFunction');
const { Chat } = require('./Chat');
const { v4: uuid } = require('uuid');
const addHours = require('date-fns/addHours');
const registerBuyer = async (req, res) => {
    const { name, email, phone, address, zipCode, license, password } =
        req.body;

    if (
        !name ||
        !phone ||
        !email ||
        !password ||
        !address ||
        !zipCode ||
        !license
    )
        return res.render(
            'errorpages/404',
            sendData(
                400,
                'Bad Request',
                'All fields are required',
                '/buyer/register'
            )
        );

    try {
        await sellerSchema.validateAsync(req.body);
    } catch (e) {
        return res.render(
            'errorpages/404',
            sendData(400, 'Bad Request', e.message, '/buyer/register')
        );
    }

    // check for duplicate usernames in database
    const duplicate = await Buyer.exists({ email: email });

    if (duplicate)
        return res.render(
            'errorpages/404',
            sendData(
                409,
                'Conflict',
                'Account with this email already exists',
                '/buyer/register'
            )
        );

    try {
        //   encrypt the password
        const hashedPassword = await bcrypt.hash(password, 10);
        // store the new user
        const user = await Buyer.create({
            name: name,
            email: email,
            password: hashedPassword,
            phone: phone,
            address: address,
            zipCode: zipCode,
            license: license,
            status: 'not decided',
            profilePicture: '',
            createdAt: new Date(),
            updatedAt: new Date(),
        });

        const html = EmailTemplateSeller(
            'Buyer Registered',
            'Details',
            (await Buyer.findOne({ email })).name,
            (await Buyer.findOne({ email })).email,
            (await Buyer.findOne({ email })).primaryPhone,
            (await Buyer.findOne({ email })).state,
            (await Buyer.findOne({ email })).city,
            (await Buyer.findOne({ email })).commision,
            (await Buyer.findOne({ email })).brokerageAddress,
            'http://www.google.com'
        );

        await sendMail(
            process.env.ADMIN_EMAIL,
            'New Buyer Registered',
            'New Buyer has been registered',
            html
        )
        const buyer = EmailTemplateSeller(
            'Buyer Registeration Successful',
            'You have successfully registered to CountdownLLC. Please wait for 24-48 Hours for approval of your profile from admin',
            (await Buyer.findOne({ email })).name,
            (await Buyer.findOne({ email })).email,
            (await Buyer.findOne({ email })).primaryPhone,
            (await Buyer.findOne({ email })).state,
            (await Buyer.findOne({ email })).city,
            (await Buyer.findOne({ email })).commision,
            (await Buyer.findOne({ email })).brokerageAddress,
            'http://www.google.com'
        );
            await sendMail(email,'New Buyer Registered',
            'You have registered successfully',
            html)
            await Log.create({
                text: `Buyer registered successfully {email: ${email}}`,
                date: new Date()
            })
            return res.redirect('/buyer/');
    } catch (err) {
        return res.render(
            'errorpages/404',
            sendData(
                500,
                'Internal Server Error',
                err.message,
                '/buyer/register'
            )
        );
    }
};
const loginUser = async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password)
        return res.render(
            'errorpages/404',
            sendData(
                400,
                'Bad Request',
                'Email and Password are required',
                '/buyer/register'
            )
        );

    let foundUser = await Buyer.findOne({ email: email });

    if (!foundUser)
        return res.render(
            'errorpages/404',
            sendData(
                401,
                'Unauthorized',
                'Account doesnot exist',
                '/buyer/register'
            )
        );

    //   Evaluate password
    const match = await bcrypt.compare(password, foundUser.password);

    if (match  && foundUser.status == 'approved') {
        req.session.user = email;
        req.session.name = (await Buyer.findOne({ email: email })).name;
        req.session.image = (
            await Buyer.findOne({ email: email })
        ).profilePicture;
        req.session.role = 'buyer';
        await Log.create({
            text: `Buyer Logged in {email: ${email}}`,
            date: new Date()
        })
        return res.redirect('/buyer/main');
    }else{
        return res.render('errorpages/not-approved')
    }


};
const handleLogout = async (req, res) => {
    if (req.session.user && req.session.role === 'buyer') {
        await Log.create({
            text: `Buyer Logged out {email: ${req.session.user}}`,
            date: new Date()
        })
        req.session.destroy(async function (err) {
            if (err)
                return res.render('errorpages/404', {
                    status: 403,
                    error: 'Forbidden',
                    message: '',
                    url: '/buyer/main',
                });

            return res.redirect('/buyer/');
        });
    } else {
        return res.redirect('/buyer/');
    }
};

const addProperty = async (req, res) => {
    if (req.session.user && req.session.role == 'buyer') {
        try {
            console.log(req.body);
            const { area, addressLine, state, zipCode, checked } = req.body;
            console.log(checked);
            if (!checked) {
                return res.redirect('/buyer/add-property');
            }
            const insertedUid = uuid().split('-').join('');
            const buyer = await Buyer.findOne({ email: req.session.user });
            buyer.properties.push({
                addressLine,
                state,
                zipCode,
                checked,
            });
            await buyer.save();
            const propId = buyer.properties[buyer.properties.length - 1]._id;
            await Log.create({
                text: `Buyer added his requested {email: ${req.session.user}}`,
                date: new Date()
            })
            return res.redirect(`/buyer/start-countdown/${propId}`);
        } catch (err) {
            return res.render(
                'errorpages/404',
                sendData(500, 'Internal Server Error', err.message, '/buyer/')
            );
        }
    } else return res.redirect('/buyer/');
};
const setCountdown = async (req, res) => {
    if (req.session.user && req.session.role == 'buyer') {
        try {
            const { id } = req.params;
            const { timeCountdown } = req.body;
            const time = timeCountdown.split(' ')[0];
            await Buyer.updateOne(
                {
                    'properties._id': id,
                },
                {
                    $set: {
                        'properties.$.countdown': time,
                        'properties.$.updatedAt': new Date(),
                        'properties.$.isOver': false,
                    },
                }
            );
            await Log.create({
                text: `Buyer set the countdown to his requested {email: ${req.session.user}}`,
                date: new Date()
            })
            return res.redirect(`/buyer/start-countdown/${id}`);
        } catch (err) {}
    } else return res.redirect('/buyer/');
};
const chatAdmin = async (req, res) => {
    if (req.session.user && req.session.role === 'buyer') {
        const { message } = req.body;

        const user = await Buyer.findOne({ email: req.session.user }, '_id');
        const userId = user._id;
        const admin = await Admin.findOne({});
        const adminId = admin._id;
        try {
            await Chat(message, userId, adminId, userId);
            await Log.create({
                text: `Buyer sent you message {email: ${req.session.user}}`,
                date: new Date()
            })
            return res.redirect('/buyer/chat-admin');
        } catch (err) {
            console.log(err);
            res.render(
                'errorpages/404',
                sendData(
                    500,
                    'Internal Server Error',
                    err.message,
                    '/buyer/chat-admin'
                )
            );
        }
    }
};
const startCountDown = async (req, res)=>{
    if (req.session.user && req.session.role == 'buyer') {
        const { id } = req.query;
        const as = await Buyer.findOne({
            'properties._id': id,
        });
        const property = as.properties.filter((property) => property._id == id);
        // const time = timeCountdown.split(" ")[0];

        try {
            await Buyer.updateOne(
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
                text: `Buyer started countdown {email: ${req.session.user}}`,
                date: new Date()
            })
            res.redirect('/buyer/start-countdown/' + id);
        } catch (err) {
            res.render(
                'errorpages/404',
                sendData(
                    500,
                    'Internal Server Error',
                    err.message,
                    '/buyer/start-countdown/'+id
                )
            );
        }
    } else {
        return res.redirect('/buyer/');
    }
}
const acceptBid = async (req, res)=>{
    if(req.session.user && req.session.role == 'buyer'){
        const {aid, pid} = req.params;
        try{

            const buyer = await Buyer.findOne({email: req.session.user})
            const exists = await Bid.exists({
                userId: buyer._id,
                bidOnProperty: pid,
                status: 'Accepted'
            })
            if(exists){
                const prevBidder = await Bid.findOne({
                    userId: buyer._id,
                    bidOnProperty: pid,
                    status: 'Accepted'
                })
                await Bid.updateOne({agentId: prevBidder.agentId, bidOnProperty: pid}, {$set: {status: 'Canceled'}})
            }
            await Bid.updateOne({agentId: aid, bidOnProperty: pid}, {$set: {status: 'Accepted'}})
            await Log.create({
                text: `Buyer accepted bid {email: ${req.session.user}}`,
                date: new Date()
            })
            return res.redirect('/buyer/waiting-bids')
        }catch(err){
            res.render(
                'errorpages/404',
                sendData(
                    500,
                    'Internal Server Error',
                    err.message,
                    '/buyer/start-countdown/'+pid
                )
            );
        }
    }else{
        return res.redirect('/buyer/')
    }
}
const rejectBid = async (req, res)=>{
    if(req.session.user && req.session.role == 'buyer'){
        const {aid, pid} = req.params;
        try{
            await Bid.updateOne({agentId: aid, bidOnProperty: pid}, {$set: {status: 'Rejected'}})
            await Log.create({
                text: `Buyer rejected bid {email: ${req.session.user}}`,
                date: new Date()
            })
            return res.redirect('/buyer/waiting-bids')
        }catch(err){
            res.render(
                'errorpages/404',
                sendData(
                    500,
                    'Internal Server Error',
                    err.message,
                    '/buyer/start-countdown/'+id
                )
            );
        }
    }else{
        return res.redirect('/buyer/')
    }
}
const chatAgent = async (req, res)=>{
    if(req.session.user && req.session.role == 'buyer'){
        const { id } = req.params;

        const { message } = req.body;
        const user = await Buyer.findOne({ email: req.session.user }, '_id');
        const userId = user._id;
        const agent = await Agent.findOne({ _id: id });
        const agentId = agent._id;
        try {
            Chat(message, userId, agentId, userId)
                .then(async (data) => {
                    await Log.create({
                        text: `Buyer messaged agent {email: ${req.session.user}}`,
                        date: new Date()
                    })
                    return res.redirect(`/buyer/chat-agent/${agentId}`);
                })
                .catch((err) => {
                    {
                        return res.render(
                            'errorpages/404',
                            sendData(500, err.message, '', `/buyer/chat-agent/${agentId}`)
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
                    `/buyer/chat-agent/${agentId}`
                )
            );
        }
    }
}
const sendInvitation = async (req, res)=>{
    if(req.session.user && req.session.role == 'buyer'){
        const {aid, state} = req.params;
        const agent = await Agent.findOne({_id: aid})
        const buyer = await Buyer.findOne({email: req.session.user})
        const text = `Dear ${agent.name}\nI would like you to bid on my offer \n. Regards ${buyer.name}`
        const html = `<h3>Dear ${agent.name}</h3><p>I would like you to bid on my offer.</p><h4>Regards ${buyer.name}</h4>`
        await sendMail(agent.email, `Invitation to carry on with the trust`,text, html)
        if(state == 1){
            return res.redirect('/buyer/state-listing')
        }else if(state == 2){
            return res.redirect('/buyer/country-listing')
        }
    }else{
        return res.redirect('/buyer/')
    }
}
const sendInviteOnSuccess = async (req, res)=>{
    if(req.session.user && req.session.role == 'buyer'){
        const {aid} = req.params;
        const buyer = await Buyer.findOne({email: req.session.user})
        const agent = await Agent.findOne({_id: aid})
        const text = `Dear ${agent.name}\nI would like you to bid on my other properties as well, upon the completion of this deal. Would love to work together\n. Regards ${buyer.name}`
        const html = `<h3>Dear ${agent.name}</h3><p>I would like you to bid on my other properties as well, upon the completion of this deal. Would love to work together.</p><h4>Regards ${buyer.name}</h4>`
        await sendMail(agent.email, `Invitation to carry on with the trust`,text, html)
        await Log.create({
            text: `Buyer send invitation to agent on successfull deal {email: ${req.session.user}}`,
            date: new Date()
        })
        return res.redirect('/buyer/successful-bids')
    }else{
        return res.redirect('/buyer/')
    }
}
const editProfile = async (req, res)=>{
    if(req.session.role == 'buyer' && req.session.user){
        const {aid} = req.params
        const {name, phone} = req.body;
        await Buyer.updateOne( {_id: aid},{
            $set: {
                name,
                phone,
            }
        })
        await Log.create({
            text: `Buyer edit his profile {email: ${req.session.user}}`,
            date: new Date()
        })
        return res.redirect('/buyer/edit-profile')
    }else{
        return res.redirect('/buyer/')
    }
}
const updatePassword = async (req, res)=>{

    if(req.session.user && req.session.role == 'buyer'){
        const {aid} = req.params;
        const {password, profilePicture} = req.body
        if(!password)  return res.render(
            'errorpages/404',
            sendData(500, err.message, 'Password cannot be empty', `/buyer/edit-profile`)
        );
        const hash = await bcrypt.hash(password, 10);
        await Buyer.updateOne({_id: aid}, {
            $set: {
                password: hash,
                profilePicture
            }
        })
        await Log.create({
            text: `Buyer updated his password {email: ${req.session.user}}`,
            date: new Date()
        })
        return res.redirect('/buyer/edit-profile')
    }else{
        return res.redirect('/buyer/')
    }
}
const turnPromotionalMessages = async (req, res)=>{
    if(req.session.user && req.session.role === 'buyer'){
        const {btn} = req.body

        await Buyer.updateOne({email: req.session.user}, {
            $set: {promotionalMessageState: btn === 'yes' ? true : false}
        })
        return res.redirect('/buyer/promotional-messages')
    }else{
        return res.redirect('/buyer/')
    }
}
const deletePromotionalMessages = async (req, res)=>{
    if(req.session.user && req.session.role == 'buyer'){
        const buyer = await Buyer.findOne({email: req.session.user})
        buyer.promotionalMessages = []
        await buyer.save()
        return res.redirect('/buyer/promotional-messages')
    }else{
        return res.redirect('/buyer/')
    }
}
const postAccountDetails = async (req, res)=>{
    if(req.session.user && req.session.role == 'buyer'){
        const {accountNumber, amount} = req.body
        const buyer = await Buyer.findOne({email: req.session.user})
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
        return res.redirect('/buyer/promotional-messages')
    }else{
        return res.redirect('/buyer/')
    }
}
const deleteMessage = async (req, res)=>{
    if(req.session.user && req.session.role == 'buyer'){
        const {mid} = req.params
        const buyer = await Buyer.findOne({email: req.session.user})

        buyer.promotionalMessages = buyer.promotionalMessages.filter(message=>!message._id.equals(mid))

        await buyer.save();
        return res.redirect('/buyer/promotional-messages')
    }else{
        return res.redirect('/buyer/')
    }
}
module.exports = {
    registerBuyer,
    handleLogout,
    loginUser,
    addProperty,
    setCountdown,
    chatAdmin,
    chatAgent,
    startCountDown,
    acceptBid,
    rejectBid,
    sendInvitation,
    sendInviteOnSuccess,
    editProfile,
    updatePassword,
    turnPromotionalMessages,
    deletePromotionalMessages,
    postAccountDetails,
    deleteMessage
};

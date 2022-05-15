const { Buyer, Admin, Bid, Agent } = require('../models/Users');
const { sendData } = require('./helperFunction');
const { readMessages } = require('./Chat');
const getLogin = async (req, res) => {
    return res.render('buyer/login');
};
const getRegister = async (req, res) => {
    return res.render('buyer/buyer-reg');
};
const showIndex = async (req, res) => {
    if (req.session.user && req.session.role == 'buyer') {
        const user = await Buyer.findOne({ email: req.session.user });
        const bids = await Bid.find({
            userId: user._id,
            role: 'Buyer',
            status: 'Waiting'
        }).populate({
            path:'userId',
            model: 'Buyer'
        }).populate({
            path: 'agentId',
            model: 'Agent'
        })
        return res.render('buyer/index', {
            name: user.name,
            image: user.profilePicture,
            properties: user.properties,
            bids
        });
    } else return res.redirect('/buyer/');
};
const showProfile = async (req, res) => {
    if (req.session.user && req.session.role === 'buyer') {
        const user = await Buyer.findOne({ email: req.session.user });
        return res.render('buyer/edit-profile', {
            name: user.name,
            image: user.profilePicture,
            user: {
                password: user.password,
                email: req.session.user,
                phone: user.phone,
            },
            id: user._id
        });
    } else {
        return res.redirect('/buyer/');
    }
};
const getAddProperty = async (req, res) => {
    if (req.session.user && req.session.role === 'buyer') {
        const buyer = await Buyer.findOne({ email: req.session.user });

        return res.render('buyer/add-property', {
            name: buyer?.name,
            image: buyer?.profilePicture,
            user: {
                password: buyer?.password,
                email: buyer?.email,
                phone: buyer?.phone,
            },
        });
    } else {
        return res.redirect('/buyer/');
    }
};
const getCountdown = async (req, res) => {
    if (req.session.user && req.session.role == 'buyer') {
        try {
            //prop id
            const { id } = req.params;
            const buyer = await Buyer.findOne({ email: req.session.user });
            let property = {};
            const prop = buyer.properties.filter((element) => {
                if (element._id.equals(id)) {
                    property = element;
                }
            });
            console.log(prop);
            return res.render('buyer/dcards', {
                name: buyer?.name,
                image: buyer?.profilePicture,
                id,
                user: {
                    password: buyer?.password,
                    email: buyer?.email,
                    phone: buyer?.phone,
                },
                property,
            });
        } catch (err) {
            return res.render(
                'errorpages/404',
                sendData(500, 'Internal Server Error', err.message, '/buyer/')
            );
        }
    } else return res.redirect('/buyer/');
};
const getPromotionalMessages = async (req, res) => {
    if (req.session.user && req.session.role == 'buyer') {

        const buyer = await Buyer.findOne({ email: req.session.user });

        if(!buyer.promotionalMessageState) {
            const messages = {
                promotionalMessages: []
            }
            return res.render('buyer/ProMsg', {
            name: buyer?.name,
            image: buyer?.profilePicture,
            messages,
            user: {
                password: buyer?.password,
                email: buyer?.email,
                phone: buyer?.phone,
            },
            state: buyer.promotionalMessageState
            });
        }
        const messages = await Buyer.findOne({
            email: req.session.user,
            'promotionalMessages.approve': true,
        }).populate({
            path: 'promotionalMessages',
            populate: {
                path: 'agentId',
                model: 'Agent',
            },
            state: buyer.promotionalMessageState
        });

        return res.render('buyer/ProMsg', {
            name: buyer?.name,
            image: buyer?.profilePicture,
            messages,
            user: {
                password: buyer?.password,
                email: buyer?.email,
                phone: buyer?.phone,
            },
        });
    } else {
        return res.redirect('/buyer/');
    }
};
const chatAdmin = async (req, res) => {
    if (req.session.user && req.session.role == 'buyer') {
        const data = await Buyer.findOne({ email: req.session.user });
        const buyerId = data._id;
        const admin = await Admin.findOne({}, 'name _id profilePicture');
        const adminId = admin._id;

        const messages = await readMessages(buyerId, adminId);

        return res.render('buyer/adminchat', {
            email: req.session.user,
            name: data.name,
            image: data.profilePicture,
            buyerId,
            messages,
            admin,
        });
    } else return res.redirect('/buyer/');
};
const chatAgent = async (req, res) => {
    if (req.session.user && req.session.role == 'buyer') {
        const {aid} = req.params;
        console.log(aid)
        const data = await Buyer.findOne({ email: req.session.user }).populate({
            path: 'properties',
            populate: {
                path: 'agentBids',
                populate: {
                    path: 'agentBid',
                    model: 'Agent',
                },
            },
        });
        const agent = await Agent.findOne({_id: aid});

        const msgs = await readMessages(data._id, aid);
        if(!msgs){
            return res.render('buyer/chats', {
                email: req.session.user,
                name: data.name,
                image: data.profilePicture,
                properties: data,
                msgs,
                agent,
                data
            });
        }
        let filteredVisibleMessages = [];
        // if(!msgs)


            console.log(msgs)
            msgs.chat.forEach((chat) => {
                if (chat.approved) {
                    filteredVisibleMessages.push(chat);
                } else if (chat.senderId.equals(data._id)) {
                    filteredVisibleMessages.push(chat);
                }
            });
            msgs.chat = filteredVisibleMessages;


        return res.render('buyer/chats', {
            email: req.session.user,
            name: data.name,
            image: data.profilePicture,
            properties: data,
            msgs,
            agent,
            data
        });
    } else return res.redirect('/buyer/');
};
const getAcceptedBids = async (req, res)=>{
    if(req.session.user && req.session.role == 'buyer'){
        const buyer = await Buyer.findOne({email: req.session.user})
        const acceptedBids = await Bid.find({
            userId: buyer._id,
            status: 'Accepted',
            role: 'Buyer',
            bidOverAt: {$gte: new Date()}
        }).populate({
            path: 'agentId',
            model: 'Agent'
        })
        return res.render('buyer/accepted-bids',{
            acceptedBids,
            buyer,
            email: req.session.user,
            name: buyer.name,
            image: buyer.profilePicture,
        })
    }else{
        return res.redirect("/buyer/")
    }
}
const getRejectedBids = async (req, res)=>{
    if(req.session.user && req.session.role == 'buyer'){
        const buyer = await Buyer.findOne({email: req.session.user})
        const rejectedBids = await Bid.find({
            userId: buyer._id,
            status: 'Rejected',
            role: 'Buyer',
            bidOverAt: {$gte: new Date()}
        }).populate({
            path: 'agentId',
            model: 'Agent'
        })
        return res.render('buyer/rejected-bids',{
            rejectedBids,
            buyer,
            email: req.session.user,
            name: buyer.name,
            image: buyer.profilePicture,
        })
    }else{
        return res.redirect("/buyer/")
    }
}
const getWaitingBids = async (req, res)=>{
    if(req.session.user && req.session.role == 'buyer'){
        const buyer = await Buyer.findOne({email: req.session.user})
        const waitingBids = await Bid.find({
            userId: buyer._id,
            status: 'Waiting',
            role: 'Buyer',
            bidOverAt: {$gte: new Date()}
        }).populate({
            path: 'agentId',
            model: 'Agent'
        })
        return res.render('buyer/waiting-bids',{
            waitingBids,
            buyer,
            email: req.session.user,
            name: buyer.name,
            image: buyer.profilePicture,
        })
    }else{
        return res.redirect("/buyer/")
    }
}
const getStateListing = async (req, res)=>{
    if(req.session.user && req.session.role == 'buyer'){
        const agents = await Agent.find({})
        const buyer = await Buyer.findOne({email: req.session.user})
        return res.render('buyer/state-listing',{
            agents,
            email: req.session.user,
            name: buyer.name,
            image: buyer.profilePicture,
            buyer
        })
    }else{
        return res.redirect("/buyer/")
    }
}
const getCountryListing = async (req, res)=>{
    if(req.session.user && req.session.role == 'buyer'){
        const agents = await Agent.find({})
        const buyer = await Buyer.findOne({email: req.session.user})
        return res.render('buyer/country-listing',{
            agents,
            email: req.session.user,
            name: buyer.name,
            image: buyer.profilePicture,
            buyer
        })
    }else{
        return res.redirect("/buyer/")
    }
}
const getSuccessfulBids = async (req, res)=>{
    if(req.session.user && req.session.role == 'buyer'){

        const buyer = await Buyer.findOne({email: req.session.user})
        const bids = await Bid.find({
            userId: buyer._id,
            role: "Buyer",
            status: "Accepted",
            bidOverAt: {$lte: new Date()}

        }).populate({
            path: 'userId',
            model: 'Buyer'
        }).populate({
            path: 'agentId',
            model: 'Agent'
        })
        return res.render('buyer/successful-bids',{
            email: req.session.user,
            name: buyer.name,
            image: buyer.profilePicture,
            bids
        })
    }else{
        return res.redirect('/buyer/')
    }
}
const getMap = async (req, res)=>{
    if(req.session.user && req.session.role == 'buyer'){

        const buyer = await Buyer.findOne({email: req.session.user})
        return res.render('buyer/mapview',{
            email: req.session.user,
            name: buyer.name,
            image: buyer.profilePicture,
        })
    }else{
        return res.redirect('/buyer/')
    }
}
module.exports = {
    getLogin,
    getRegister,
    showIndex,
    showProfile,
    getAddProperty,
    getCountdown,
    getPromotionalMessages,
    chatAdmin,
    chatAgent,
    getAcceptedBids,
    getWaitingBids,
    getRejectedBids,
    getCountryListing,
    getStateListing,
    chatAdmin,
    getSuccessfulBids,
    getMap
};

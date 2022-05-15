const bcrypt = require('bcrypt');
const {
    Admin,
    Agent,
    Message,
    Seller,
    Buyer,
    InvitedAgent,
    ReferralAgreement,
    Log
} = require('../models/Users');
const { sendData } = require('./helperFunction');
const jwt = require('jsonwebtoken');
const { sendMail } = require('./sendMailController');
require('dotenv').config();
const { updatePassword } = require('../middleware/validation/updateUser');
const { Chat } = require('./Chat');
const { el } = require('date-fns/locale');

const registerAdmin = async (req, res) => {
    const { name, email, password } = req.body;
    console.log(req.body)
    if (!email || !password)
        return res.render(
            'errorpages/404',
            sendData(
                400,
                'Bad Request',
                'Email and Password are required',
                '/admin/edit-profile'
            )
        );

    // check for duplicate usernames in database
    const duplicate = await Admin.exists({ email: email });

    if (duplicate)
        return res.render(
            'errorpages/404',
            sendData(
                409,
                'Conflict',
                'Account with this email already exists',
                '/admin/edit-profile'
            )
        );
    //Conflict
    try {
        //   encrypt the password
        const hashedPassword = await bcrypt.hash(password, 10);
        // store the new user

        const user = await Admin.create({
            email: email,
            password: hashedPassword,
            name: name,
            createdAt: new Date(),
            updatedAt: new Date(),
        });
        res.redirect('/admin/edit-profile');
    } catch (err) {
        return res.render(
            'errorpages/404',
            sendData(500, 'Internal Server Error', '', '/admin/edit-profile')
        );
    }
};

const loginAdmin = async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password)
        return res.render('errorpages/404', {
            status: 400,
            error: 'Bad Request',
            message: 'Email and Password are required',
            url: '/admin/',
        });
    let foundUser = await Admin.findOne({ email: email });

    if (!foundUser)
        return res.render('errorpages/404', {
            status: 401,
            error: 'Unauthorized',
            message: '',
            url: '/admin/',
        });

    const match = await bcrypt.compare(password, foundUser.password);

    if (match) {
        await Log.create({
            text: `Admin Logged In`,
            date: new Date()
        })
        req.session.user = email;
        req.session.name = (await Admin.findOne({ email: email })).name;
        req.session.role = 'admin';
        req.session.image = (await Admin.findOne({ email: email })).profilePic;
        return res.redirect('/admin/main');
    } else {
        return res.render('errorpages/404', {
            status: 401,
            error: 'Unauthorized',
            message: '',
            url: '/admin/',
        });
    }
};
const handleLogout = async (req, res) => {
    if (req.session.user) {
        await Log.create({
            text: `Admin Logged out`,
            date: new Date()
        })
        req.session.destroy(function (err) {
            if (err)
                {
                     return res.render('errorpages/404', {
                    status: 403,
                    error: 'Forbidden',
                    message: '',
                    url: '/admin/main',
                });
            }

            return res.redirect('/admin/');
        });
    } else {
        return res.redirect('/admin/');
    }
};

const handleRefreshToken = async (req, res) => {
  const cookies = req.cookies;
  if (!cookies?.jwt) return res.sendStatus(401);
  const refreshToken = cookies.jwt;

  const foundUser = await Admin.exists({ refreshToken: refreshToken });
  const foundUserCreds = await Admin.findOne({ refreshToken });

  if (!foundUser) return res.sendStatus(403); //Forbidden
  //   Evaluate jwt

  jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET, (err, decoded) => {
    if (err || foundUserCreds.email !== decoded.email)
      return res.sendStatus(403);
    const accessToken = jwt.sign(
      {
        email: decoded.email,
      },
      process.env.ACCESS_TOKEN_SECRET,
      { expiresIn: "30s" }
    );
    res.json({ accessToken });
  });
};
// const deleteAgent = async (req, res) => {
//     if (req.query.id) {
//         try {
//             await Agent.deleteOne({ _id: req.query.id });

//             res.redirect('/admin/main');
//         } catch (e) {
//             return res.render('errorpages/404', {
//                 status: 500,
//                 error: 'Internal Server Error',
//                 message: e.message,
//                 url: '/admin/main',
//             });
//         }
//     }
// };
const approveAgent = async (req, res) => {
    const id = req.query.id;
    try {
        const user = await Agent.updateOne(
            { _id: id },
            {
                status: 'approved',
            }
        );
        await Log.create({
            text: `Approved Agent  - Admin`,
            date: new Date()
        })
        console.log(user);
        res.redirect('/admin/main');
    } catch (e) {
        return res.render('errorpages/404', {
            status: 500,
            error: 'Internal Server Error',
            message: e.message,
            url: '/admin/main',
        });
    }
};
const disapproveAgent = async (req, res) => {
    const id = req.query.id;
    try {
        const user = await Agent.updateOne(
            { _id: id },
            {
                status: 'disapproved',
            }
        );
        await Log.create({
            text: `Disapproved Agent  - Admin`,
            date: new Date()
        })
        console.log(user);
        res.redirect('/admin/main');
    } catch (e) {
        return res.render('errorpages/404', {
            status: 500,
            error: 'Internal Server Error',
            message: e.message,
            url: '/admin/main',
        });
    }
};
const changePassword = async (req, res) => {
    const image = req.body.imagePath.split('/');
    const imageName = image[image.length - 1];
    console.log(image);
    const { password } = req.body;
    if (password && image) {
        try {
            await updatePassword.validateAsync({ password });
        } catch (e) {
            return res.render('errorpages/404', {
                status: 500,
                error: 'Internal Server Error',
                message: e.message,
                url: '/admin/edit-profile',
            });
        }
        try {
            const pwd = await bcrypt.hash(password, 10);
            await Admin.updateOne(
                { email: req.session.user },
                {
                    password: pwd,
                }
            );
        } catch (e) {
            return res.render('errorpages/404', {
                status: 500,
                error: 'Internal Server Error',
                message: e.message,
                url: '/admin/edit-profile',
            });
        }
    }
    if (image) {
        try {
            const data = await Admin.updateOne(
                { email: req.session.user },
                {
                    profilePicture: `/images/${imageName}`,
                }
            );
            console.log(data);
            res.redirect('/admin/edit-profile');
        } catch (e) {
            return res.render('errorpages/404', {
                status: 500,
                error: 'Internal Server Error',
                message: e.message,
                url: '/admin/edit-profile',
            });
        }
    }
};
const editProfileCredentials = async (req, res) => {
    const { name } = req.body;

    if (!name)
        return res.render('errorpages/404', {
            status: 400,
            error: 'Bad Request',
            message: 'Email is required',
            url: '/admin/edit-profile',
        });
    try {
        const user = await Admin.updateOne(
            { email: req.session.user },
            {
                name,
            }
        );
        await Log.create({
            text: `Edit profile  - Admin`,
            date: new Date()
        })
        res.redirect('/admin/edit-profile');
    } catch (e) {
        return res.render('errorpages/404', {
            status: 500,
            error: 'Internal Server Error',
            message: e,
            message,
            url: '/admin/edit-profile',
        });
    }
};
const replyMessage = async (req, res) => {
    if (req.session.user && req.session.role == 'admin') {
        const { message } = req.body;
        const { id } = req.params;

        try {
            const admin = await Admin.findOne({ email: req.session.user });

            await Chat(message, id, admin._id, admin._id);

            return res.redirect('/admin/chat-seller');
        } catch (err) {
            res.render(
                'errorpages/404',
                sendData(
                    500,
                    'Internal Server Error',
                    err.message,
                    '/admin/chat-seller'
                )
            );
        }
    }
};
// Message functionality
const replyMessageAgent = async (req, res) => {
    const { message } = req.body;
    const { id } = req.params;
    try {
        const admin = await Admin.findOne({ email: req.session.user });

        await Chat(message, id, admin._id, admin._id);

            await Log.create({
                text: `Replied to agent message - Admin`,
                date: new Date()
            })
        return res.redirect('/admin/chat-agent');
    } catch (err) {
        res.render(
            'errorpages/404',
            sendData(
                500,
                'Internal Server Error',
                err.message,
                '/admin/chat-agent'
            )
        );
    }
};

//Edit Seller
const editSellerDetails = async (req, res) => {
    if (req.session.user && req.session.role == 'admin') {
        try {
            const { address, city, state } = req.body;

            const { id } = req.params;
            await Log.create({
                text: `Edit Seller Details  - Admin`,
                date: new Date()
            })
            await Seller.updateOne(
                { _id: id },
                { $set: { address, city, state } }
            );

            return res.redirect('/admin/seller-review');
        } catch (err) {
            res.render(
                'errorpages/404',
                sendData(
                    500,
                    'Internal Server Error',
                    err.message,
                    '/admin/seller-review'
                )
            );
        }
    } else {
        res.redirect('/admin/');
    }
};
const deleteSeller = async (req, res) => {
    if (req.session.user && req.session.role == 'admin') {
        const { id } = req.params;
        try {
            await Log.create({
                text: `Deleted Seller - Admin`,
                date: new Date()
            })
            await Seller.deleteOne({ _id: id });
            return res.redirect('/admin/seller-review');
        } catch (err) {
            res.render(
                'errorpages/404',
                sendData(
                    500,
                    'Internal Server Error',
                    err.message,
                    '/admin/seller-review'
                )
            );
        }
    } else {
        res.redirect('/admin/');
    }
};
const unapproveSeller = async (req, res) => {
    if (req.session.user && req.session.role == 'admin') {
        const { id } = req.params;
        try {
            await Seller.updateOne(
                { _id: id },
                {
                    $set: {
                        status: 'disapproved',
                    },
                }
            );
            return res.redirect('/admin/seller-review');
        } catch (err) {
            res.render(
                'errorpages/404',
                sendData(
                    500,
                    'Internal Server Error',
                    err.message,
                    '/admin/seller-review'
                )
            );
        }
    } else {
        res.redirect('/admin/');
    }
};
const editBuyerDetails = async (req, res) => {
    if (req.session.user && req.session.role == 'admin') {
        const { id } = req.params;
        const { address, city, state } = req.body;
        try {
            await Buyer.updateOne(
                { _id: id },
                { $set: { address, city, state } }
            );
            await Log.create({
                text: `Edit Buyer Details  - Admin`,
                date: new Date()
            })
            return res.redirect('/admin/buyer-review');
        } catch (err) {
            res.render(
                'errorpages/404',
                sendData(
                    500,
                    'Internal Server Error',
                    err.message,
                    '/admin/buyer-review'
                )
            );
        }
    } else {
        res.redirect('/admin/');
    }
};
const deleteBuyer = async (req, res) => {
    if (req.session.user && req.session.role == 'admin') {
        try {

            await Log.create({
                text: `Deleted Buyer  - Admin`,
                date: new Date()
            })
            await Buyer.deleteOne({ _id: id });
            return res.redirect('/admin/buyer-review');
        } catch (err) {
            res.render(
                'errorpages/404',
                sendData(
                    500,
                    'Internal Server Error',
                    err.message,
                    '/admin/buyer-review'
                )
            );
        }
    } else {
        return res.redirect('/admin/');
    }
};
const unapproveBuyer = async (req, res) => {
    if (req.session.user && req.session.role == 'admin') {
        const { id } = req.params;
        try {
            await Buyer.updateOne(
                { _id: id },
                {
                    $set: {
                        status: 'disapproved',
                    },
                }
            );

            await Log.create({
                text: `Disapproved Buyer - Admin`,
                date: new Date()
            })
            return res.redirect('/admin/buyer-review');
        } catch (err) {
            res.render(
                'errorpages/404',
                sendData(
                    500,
                    'Internal Server Error',
                    err.message,
                    '/admin/buyer-review'
                )
            );
        }
    } else {
        res.redirect('/admin/');
    }
};
const editAgentDetails = async (req, res) => {
    if (req.session.user && req.session.role == 'admin') {
        const { id } = req.params;
        const { address, city, state } = req.body;
        try {
            await Agent.updateOne(
                { _id: id },
                { $set: { brokerageAddress: address, city, state } }
            );

            await Log.create({
                text: `Updated Agent Details - Admin`,
                date: new Date()
            })
            return res.redirect('/admin/agent-review');
        } catch (err) {
            res.render(
                'errorpages/404',
                sendData(
                    500,
                    'Internal Server Error',
                    err.message,
                    '/admin/agent-review'
                )
            );
        }
    } else {
        res.redirect('/admin/');
    }
};
const deleteAgent = async (req, res) => {
    if (req.session.user && req.session.role == 'admin') {
        try {

                await Log.create({
                    text: `Deleted Agent - Admin`,
                    date: new Date()
                })
            await Agent.deleteOne({ _id: id });
            return res.redirect('/admin/agent-review');
        } catch (err) {
            res.render(
                'errorpages/404',
                sendData(
                    500,
                    'Internal Server Error',
                    err.message,
                    '/admin/agent-review'
                )
            );
        }
    } else {
        return res.redirect('/admin/');
    }
};
const unapproveAgent = async (req, res) => {
    if (req.session.user && req.session.role == 'admin') {
        const { id } = req.params;
        try {
            await Agent.updateOne(
                { _id: id },
                {
                    $set: {
                        status: 'disapproved',
                    },
                }
            );
            return res.redirect('/admin/agent-review');
        } catch (err) {
            res.render(
                'errorpages/404',
                sendData(
                    500,
                    'Internal Server Error',
                    err.message,
                    '/admin/agent-review'
                )
            );
        }
    } else {
        res.redirect('/admin/');
    }
};
const upproveRole = async (req, res) => {
    if (req.session.user && req.session.role === 'admin') {
        try {
            const { role } = req.params;
            if (role == 1) {
                const { id } = req.params;
                await Agent.updateOne(
                    { _id: id },
                    {
                        $set: { status: 'approved' },
                    }
                );

                await Log.create({
                    text: `Approved Agent  - Admin`,
                    date: new Date()
                })
                return res.redirect('/admin/main');
            } else if (role == 2) {
                const { id } = req.params;
                await Seller.updateOne(
                    { _id: id },
                    {
                        $set: {
                            status: 'approved',
                        },
                    }
                );

                await Log.create({
                    text: `Approved Seller - Admin`,
                    date: new Date()
                })
                return res.redirect('/admin/main');
            } else if (role == 3) {
                const { id } = req.params;
                await Buyer.updateOne(
                    { _id: id },
                    {
                        $set: { status: 'approved' },
                    }
                );

                await Log.create({
                    text: `Approved Buyer - Admin`,
                    date: new Date()
                })
                return res.redirect('/admin/main');
            }
        } catch (err) {
            console.log(err);
            res.render(
                'errorpages/404',
                sendData(
                    500,
                    'Internal Server Error',
                    err.message,
                    '/admin/agent-review'
                )
            );
        }
    } else {
        res.redirect('/admin/');
    }
};
const deleteRole = async (req, res) => {
    const { id, role } = req.params;
    if (req.session.user && req.session.role === 'admin') {
        try {
            if (role == 1) {

                await Log.create({
                    text: `Dissaproved Seller  - Admin`,
                    date: new Date()
                })
                await Agent.deleteOne({ _id: id });
                return res.redirect('/admin/main');
            } else if (role == 2) {

                await Log.create({
                    text: `Dissaproved Seller - Admin`,
                    date: new Date()
                })
                await Seller.deleteOne({ _id: id });
                return res.redirect('/admin/main');
            } else if (role == 3) {

                await Log.create({
                    text: `Dissaproved Seller - Admin`,
                    date: new Date()
                })
                await Buyer.deleteOne({ _id: id });
                return res.redirect('/admin/main');
            }
        } catch (err) {
            res.render(
                'errorpages/404',
                sendData(
                    500,
                    'Internal Server Error',
                    err.message,
                    '/admin/agent-review'
                )
            );
        }
    } else {
        res.redirect('/admin/');
    }
};
const disapproveRole = async (req, res) => {
    const { id, role } = req.params;
    if (req.session.user && req.session.role === 'admin') {
        try {
            if (role == 1) {
                //Agent
                await Agent.updateOne(
                    { _id: id },
                    {
                        $set: { status: 'disapproved' },
                    }
                );

                await Log.create({
                    text: `Dissaproved Agent - Admin`,
                    date: new Date()
                })
                return res.redirect('/admin/main');
            } else if (role == 2) {
                await Seller.updateOne(
                    { _id: id },
                    {
                        $set: { status: 'disapproved' },
                    }
                );

                await Log.create({
                    text: `Dissaproved Seller  - Admin`,
                    date: new Date()
                })
                return res.redirect('/admin/main');
            } else if (role == 3) {
                await Buyer.updateOne(
                    { _id: id },
                    {
                        $set: { status: 'disapproved' },
                    }
                );

                await Log.create({
                    text: `Dissaproved Buyer - Admin`,
                    date: new Date()
                })
                return res.redirect('/admin/main');
            }
        } catch (err) {
            res.render(
                'errorpages/404',
                sendData(
                    500,
                    'Internal Server Error',
                    err.message,
                    '/admin/agent-review'
                )
            );
        }
    } else {
        res.redirect('/admin/');
    }
};
const editOrApproveMessageAgentToSeller = async (req, res) => {
    if (req.session.user && req.session.role == 'admin') {
        const { messageId, state } = req.params;
        const { message, approve } = req.body;
        console.log(message, approve);
        try {
            if (approve == 'Edit') {
                console.log('edit is run');
                await Message.updateOne(
                    {
                        'chat._id': messageId,
                    },
                    {
                        $set: {
                            'chat.$.message': message,
                        },
                    }
                );
                await Log.create({
                    text: `Edit chat message  - Admin`,
                    date: new Date()
                })
            } else if (approve == 'Approve') {
                await Message.updateOne(
                    {
                        'chat._id': messageId,
                    },
                    {
                        $set: {
                            'chat.$.approved': true,
                        },
                    }
                );
                await Log.create({
                    text: `Approved chat message  - Admin`,
                    date: new Date()
                })
            }
            if(state == 1){
            return res.redirect('/admin/agent-to-seller-message');
            }else if(state == 2){
                return res.redirect('/admin/agent-to-buyer-message');
            }else{
                return res.redirect('/admin/main');
            }
        } catch (err) {
            res.render(
                'errorpages/404',
                sendData(
                    500,
                    'Internal Server Error',
                    err.message,
                    '/admin/agent-review'
                )
            );
        }
    } else {
        res.redirect('/admin/');
    }
};
const setInviteAgent = async (req, res) => {
    if (req.session.user && req.session.role == 'admin') {
        // TODO: later implement phone and company name
        const { name, email, phone, company_name } = req.body;
        try {
            await InvitedAgent.create({
                name,
                brokeragePhone: phone,
                email,
                companyName: company_name,
            });
            await sendMail(
                email,
                'Invitation To Agent',
                `Hello ${name},\nWe hope you are fine. We are inviting you to experience our website. We are sure you will love our platform.\nRegards, Countdown INC.\n`,
                `<p>Hello ${name}</p><p>We hope you are fine. We are inviting you to experience our website. We are sure you will love our platform.Complete Registeration here ${process.env.REGISTER_URL}/step1/${email}/${name}.</p><p>Regards, Countdown INC.</p>`
            );
            await Log.create({
                text: `Invited an agent.details : ${name} - Admin`,
                date: new Date()
            })
            return res.redirect('/admin/create-agent-profile');
        } catch (err) {
            res.render(
                'errorpages/404',
                sendData(
                    500,
                    'Internal Server Error',
                    err.message,
                    '/admin/create-agent-profile'
                )
            );
        }
    } else {
        res.redirect('/admin/');
    }
};
const editPromotionalMessage = async (req, res) => {
    if (req.session.user && req.session.role == 'admin') {
        try {
            //message id
            const { id, buyerId } = req.params;
            const { action, message } = req.body;
            if (action == 'Edit') {
                await Buyer.updateOne(
                    { _id: buyerId, 'promotionalMessages._id': id },
                    { $set: { 'promotionalMessages.$.message': message } }
                );
                const buyer = await Agent.findOne({_id: buyerId})
                await Log.create({
                    text: `Edit promotional message sent by buyer, details - name : ${buyer.name} - Admin`,
                    date: new Date()
                })
                return res.redirect(
                    '/admin/promotional-agent-to-buyer-message'
                );
            } else if (action == 'Approve') {
                await Buyer.updateOne(
                    { _id: buyerId, 'promotionalMessages._id': id },
                    { $set: { 'promotionalMessages.$.approve': true } }
                );
                const buyer = await Agent.findOne({_id: buyerId})
                await Log.create({
                    text: `Approved promotional message sent by buyer, details - Admin`,
                    date: new Date()
                })
                return res.redirect(
                    '/admin/promotional-agent-to-buyer-message'
                );
            } else {
                return res.redirect(
                    '/admin/promotional-agent-to-buyer-message'
                );
            }
        } catch (err) {
            res.render(
                'errorpages/404',
                sendData(
                    500,
                    'Internal Server Error',
                    err.message,
                    '/admin/create-agent-profile'
                )
            );
        }
    } else {
        return res.redirect('/admin/');
    }
};
const editPromotionalMessageSeller = async (req, res) => {
    if (req.session.user && req.session.role == 'admin') {
        try {
            //message id
            const { id, sellerId } = req.params;
            const { action, message } = req.body;
            if (action == 'Edit') {
                await Seller.updateOne(
                    { _id: sellerId, 'promotionalMessages._id': id },
                    { $set: { 'promotionalMessages.$.message': message } }
                );
                const seller = await Agent.findOne({_id: sellerId})
                await Log.create({
                    text: `Edit promotional message sent by seller, details - name : ${seller.name} - Admin`,
                    date: new Date()
                })
                return res.redirect(
                    '/admin/promotional-agent-to-seller-message'
                );
            } else if (action == 'Approve') {
                await Seller.updateOne(
                    { _id: sellerId, 'promotionalMessages._id': id },
                    { $set: { 'promotionalMessages.$.approve': true } }
                );
                const seller = await Agent.findOne({_id: sellerId})
                await Log.create({
                    text: `Approved promotional message sent by seller, details - name : ${seller.name} - Admin`,
                    date: new Date()
                })
                return res.redirect(
                    '/admin/promotional-agent-to-seller-message'
                );
            } else {
                return res.redirect(
                    '/admin/promotional-agent-to-seller-message'
                );
            }
        } catch (err) {
            res.render(
                'errorpages/404',
                sendData(
                    500,
                    'Internal Server Error',
                    err.message,
                    '/admin/create-agent-profile'
                )
            );
        }
    } else {
        return res.redirect('/admin/');
    }
};
const editAgent = async (req, res) => {
    if (req.session.user && req.session.role === 'admin') {
        try {
            const { agentId } = req.params;
            const {
                name,
                professionalCategory,
                professionalTitle,
                license,
                city,
                timeZone,
                brokerageAddress,
                brokeragePhone,
                serviceAreas,
                state,
                reviewOne,
                reviewTwo,
                reviewThree,
                description,
            } = req.body;
            await Agent.updateOne(
                { _id: agentId },
                {
                    $set: {
                        name,
                        professionalCategory,
                        professionalTitle,
                        license,
                        city,
                        timeZone,
                        brokerageAddress,
                        brokeragePhone,
                        serviceAreas,
                        state,
                        reviewOne,
                        reviewTwo,
                        reviewThree,
                        description,
                    },
                }
            );
            const agent = await Agent.findOne({_id: agentId})
            await Log.create({
                text: `Edit agent details, name : ${agent.name} - Admin`,
                date: new Date()
            })
            return res.redirect('/admin/invited-agent');
        } catch (err) {
            return res.render(
                'errorpages/404',
                sendData(
                    500,
                    'Internal Server Error',
                    err.message,
                    '/admin/invited-agent'
                )
            );
        }
    } else {
        return res.redirect('/admin/');
    }
};
const approveAgentInvited = async (req, res) => {
    if (req.session.user && req.session.role == 'admin') {
        try {
            const { id } = req.params;
            await Agent.updateOne(
                { _id: id },
                //disapproved', 'approved'
                { $set: { status: 'approved' } }
            );
            const agent = await Agent.findOne({_id: id})
            await Log.create({
                text: `Approved Invited Agent, name : ${agent.name} - Admin`,
                date: new Date()
            })
            return res.redirect('/admin/invited-agent');
        } catch (err) {
            return res.render(
                'errorpages/404',
                sendData(
                    500,
                    'Internal Server Error',
                    err.message,
                    '/admin/invited-agent'
                )
            );
        }
    } else {
        return res.redirect('/admin/');
    }
};
const disapproveAgentInvited = async (req, res) => {
    if (req.session.user && req.session.role === 'admin') {
        try {
            const { id } = req.params;
            await Agent.updateOne(
                { _id: id },
                { $set: { status: 'disapproved' } }
            );
            await Agent.findOne({_id: id})
            await Log.create({
                text: `Disapproved Invited Agent, name : ${agent.name} - Admin`,
                date: new Date()
            })
            return res.redirect('/admin/invited-agent');
        } catch (err) {
            return res.render(
                'errorpages/404',
                sendData(
                    500,
                    'Internal Server Error',
                    err.message,
                    '/admin/invited-agent'
                )
            );
        }
    } else {
        return res.redirect('/admin/');
    }
};
// brokerAId: mongoose.Schema.Types.ObjectId,
//     brokerBId: mongoose.Schema.Types.ObjectId,
//     price: String,
//     percentage: String,
//     brokerA: String,
//     dateBrokerA:String,
//     brokerB: String,
//     dateBrokerB: String
const sendReferralAgreement = async (req, res)=>{
    if(req.session.user && req.session.role == 'admin'){
        try {
            const admin = await Admin.findOne({email: req.session.user})
            const { id, pid, state, uid, bid} = req.params;
            const {brokerA, brokerB, dateBrokerA, dateBrokerB, price, pgp, pfc, plc, psc, other, additionalTerms} = req.body;
            let percentage;
            let type;
            if((price !== '' || price !== '$') && (pgp == '' && pfc == '' && plc == '' && psc == '' && other == ''))
                {type = 'amount';
                percentage = price + '$'}
            else if(pgp !== '' && (price == '' && pfc == '' && plc == '' && psc == '' && other == ''))
           { type = 'pgp';
            percentage = pgp + '%'}
            else if(pfc !== '' && (price == '' && pgp == '' && plc == '' && psc == '' && other == ''))
            {type = 'pfc';
            percentage = pfc  + '%'}
            else if(plc !== '' && (price == '' && pgp == '' && pfc == '' && psc == '' && other == ''))
                {type=  'plc'
            percentage = plc + '%'}
            else if( psc !== '' && (price == '' && pgp == '' && pfc == '' && plc == '' && other == ''))
           { type=  'psc'
            percentage = psc + '%'}
            else if(other !== '' && (price == '' && pgp == '' && pfc == '' && psc == '' && plc == ''))
               { type='other'
            percentage = other}
            else
                return res.render(
                    'errorpages/404',
                    sendData(
                        401,
                        'Unauthorized',
                        `Please agree to one of 6 points`,
                        '/admin/main'
                    )
                );

            const user = await Agent.findOne({
                _id: id
            })

            if(!percentage){
                return res.render(
                    'errorpages/404',
                    sendData(
                        401,
                        'Unauthorized',
                        `All fields are required`,
                        '/admin/main'
                    )
                );
            }

            await ReferralAgreement.create({
                brokerAId:admin._id,
                brokerBId: id,
                propertyId: pid,
                bidId: bid,
                userId: uid,
                role: state == 2 ? 'Seller' : 'Buyer',
                brokerA,
                brokerB,
                dateBrokerA,
                dateBrokerB,
                percentage,
                additionalTerms,
                type

            });
            const textEmail = `Please check the referral agreement.`
            const html = `<p>Please check the referral agreement. Regards Countdown</p>`
            await sendMail(user.email, `Referral Agreement`,textEmail, html );
            await Log.create({
                text: `Referral agreement sent - Admin`,
                date: new Date()
            })
            if(state == 1){
                return res.redirect('/admin/referral-agreement-agent-to-buyer');
            }else if(state == 2){
                return res.redirect('/admin/referral-agreement-agent-to-seller')
            }else{
                return res.redirect('/admin/main')
            }
        } catch (err) {
            return res.render(
                'errorpages/404',
                sendData(
                    500,
                    'Internal Server Error',
                    err.message,
                    '/admin/main'
                )
            );
        }
    }else{
        return res.redirect('/admin/')
    }
}
const deleteNotification = async (req, res)=>{
    if(req.session.user && req.session.role == 'admin'){
        const {mid} = req.params;
        await Log.create({
            text: `Deleted a Log - Admin`,
            date: new Date()
        })
        await Log.deleteOne({_id: mid})
        return res.redirect('/admin/customize-notification')
    }else{
        return res.redirect('/admin/')
    }
}
const deleteAllNotification = async (req, res)=>{
    if(req.session.user && req.session.role == 'admin'){

        await Log.deleteMany({})

        await Log.create({
            text: `Deleted all previous logs - Admin`,
            date: new Date()
        })
        return res.redirect('/admin/customize-notification')
    }else{
        return res.redirect('/admin/')
    }
}

module.exports = {
    replyMessage,
    approveAgent,
    disapproveAgent,
    deleteAgent,
    registerAdmin,
    loginAdmin,
    handleLogout,
    changePassword,
    editProfileCredentials,
    replyMessageAgent,
    editSellerDetails,
    deleteSeller,
    unapproveSeller,
    editBuyerDetails,
    deleteBuyer,
    unapproveBuyer,
    editAgentDetails,
    unapproveAgent,
    upproveRole,
    deleteRole,
    disapproveRole,
    editOrApproveMessageAgentToSeller,
    setInviteAgent,
    editPromotionalMessage,
    editPromotionalMessageSeller,
    editAgent,
    approveAgentInvited,
    disapproveAgentInvited,
    sendReferralAgreement,
    deleteNotification,
    deleteAllNotification
};

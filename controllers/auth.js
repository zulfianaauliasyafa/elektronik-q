const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const sgMail = require('@sendgrid/mail');
const countries = require('../data/countries.json');
require('dotenv').config();

const { validationResult } = require('express-validator/check')

const User = require('../models/user');
const user = require('../models/user');

const { SEND_GRID_KEY } = require('../config/config');

sgMail.setApiKey(SEND_GRID_KEY);


// ============================================
//  Get Login
// ============================================
exports.getLogin = (req, res, next) => {
  let message = req.flash('error');
  if (message.length > 0) {
    message = message[0];
  } else {
    message = null;
  }
  res.render('auth/login', {
    path: '/login',
    pageTitle: 'Login',
    errorMessage: message,
    oldInput: {
      email: '',
      password: ''
    },
    validationErrors: []
  });
};
// ============================================
// GET Register (aka signin)
// ============================================
exports.getRegister = (req, res, next) => {
  let message = req.flash('error');
  if (message.length > 0) {
    message = message[0];
  } else {
    message = null;
  }
  res.render('auth/register', {
    path: '/register',
    pageTitle: 'Register',
    errorMessage: message,
    oldInput:{
      email: '',
      password: '',
      confirmPassword: '',
      name: '',
      lname: '',
      address1:'',
      address2:'',
      countries: Object.keys(countries),
			cities: countries
    },
    validationErrors: []
  });
};
// ============================================
// GET Edit user
// ============================================
exports.getUserEdit = (req, res, next) => {
	let message = req.flash('error');
	if (message.length > 0) {
		message = message[0];
	} else {
		message = null;
	}
	User.findById(req.session.user._id).then((user) => {
		const { email, name, lname, address1, address2} = user;
		res.render('auth/edit-user', {
			path: '/user-edit',
			pageTitle: 'Edit infos',
			errorMessage: message,
			oldInput: {
				email,
				name,
        lname,
        address1,
        address2,
				countries: Object.keys(countries),
				cities: countries,
			},
			validationErrors: [],
		});
	});
};
// ============================================
//  POST Login
// ============================================
exports.postLogin = (req, res, next) => {
  const email = req.body.email;
  const password = req.body.password;
//validation logic
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).render('auth/login', {
      path: '/login',
      pageTitle: 'Login',
      errorMessage: errors.array()[0].msg,
      oldInput: {
        email: email,
        password: password
      },
      validationErrors: errors.array()
    });
  }
  User.findOne({ email: email })
  .populate({
    path: 'cart',
    populate: {
      path: 'items',
      populate: {
        path: 'productId',
      },
    },
  })
  .then((user) => {
    if (!user) {
      return res.status(422).render('auth/login', {
        path: '/login',
        pageTitle: 'Login',
        errorMessage: 'Your email or password is invalid.',
        oldInput: {
          email: email,
          password: password,
        },
        validationErrors: [],
      });
    }
      bcrypt
        .compare(password, user.password)
        .then(doMatch => {
          if (doMatch) {
            req.session.isLoggedIn = true;
            req.session.user = user;
            //logged top right display
            const total = user.cart.items.reduce((accumulator, currentValue) => {
              const {
                quantity,
                productId: { price },
              } = currentValue;

              return accumulator + quantity * price;
            }, 0);
            req.session.total = total;
            req.session.items = user.cart.items.length;
						return req.session.save((err) => {
							console.log(err);
							res.redirect('/');
						});
					}
    
          return res.status(422).render('auth/login', {
            path: '/login',
            pageTitle: 'Login',
            errorMessage: 'Your email or password is invalid.',
            oldInput: {
              email: email,
              password: password,
            },
            validationErrors: []
          });
        })
        .catch(err => {
          console.log(err);
          res.redirect('/login');
        });
    })
    .catch(err => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};
// ============================================
//  POST Register
// ============================================
exports.postRegister = (req, res, next) => {
  const email = req.body.email;
  const password = req.body.password;
  const name = req.body.name;
  const lname = req.body.lname;
  //email validator
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.log(errors.array());
    return res.status(422)
      .render('auth/register', {
        path: '/register',
        pageTitle: 'Register',
        errorMessage: errors.array()[0].msg,
        //object to render data back again due to error
        oldInput: {
          email: email,
          password: password,
          confirmPassword: req.body.confirmPassword,
          name: name,
          lname:lname,
          countries: Object.keys(countries)
        },
        validationErrors: errors.array()
      });
  }
  // if no validation errors in the controller
  bcrypt
    .hash(password, 12)
    .then(hashedPassword => {
      const user = new User({
        email: email,
        password: hashedPassword,
      name: name,
      lname: lname,
        cart: { items: [] }
      });
      return user.save();
    })
    .then(result => {
      res.redirect('/login');
      const msg = {
        to: email,
        from: 'x19153864@student.ncirl.ie',
        subject: 'Signup succeeded!',
        html: '<h1>You successfully signed up!</h1>',
        templateId: 'd-24bce50c9ea743bf94f18f3212cc210a',
    };
    return sgMail.send(msg);
    })
    .catch(err => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};
// ============================================
//  POST User Edit Details
// ============================================
exports.postUserEdit = (req, res, next) => {
	const {
		body: { email, password, name, address1,
      address2 //add fields
  }} = req;
  console.log(address2)
	//email validator
	const errors = validationResult(req);
	if (!errors.isEmpty()) {
		console.log(errors.array());
		return res.status(422).render('auth/edit-user', {
			path: '/user-edit',
			pageTitle: 'Edit Account Details',
			errorMessage: errors.array()[0].msg,
			//object to render data back again due to error
			oldInput: {
				email: email,
				password: password,
				name: name,
        lname: lname
			},
			validationErrors: errors.array(),
		});
  }
  console.log('test')
	// if no validation errors in the controller
	if (password !== '') {
		bcrypt
			.hash(password, 12)
			.then((hashedPassword) => {
				return User.updateOne(
					{ _id: req.session.user._id },
					{
						email: email,
						password: hashedPassword,
						name: name,
           lname: lname,
          address1: address1,
          address2: address2,
           // countries: countries
						//add fields details here
					}
				);
			})
			.then(() => {
				res.redirect('/');
			})
			.catch((err) => {
				const error = new Error(err);
				error.httpStatusCode = 500;
				return next(error);
			});
	} else {
		User.updateOne(
			{ _id: req.session.user._id },
			{
				email: email,
				name: name,
       lname: lname,
       address1: address1,
          address2: address2,
				//add fields here
			}
		)
			.then(() => {
        console.log('2')
				res.redirect('/');
			})
			.catch((err) => {
        console.log(err)
				const error = new Error(err);
				error.httpStatusCode = 500;
				return next(error);
			});
	}
};
// ============================================
//  POST Logout
// ============================================
exports.postLogout = (req, res, next) => {
  req.session.destroy(err => {
    console.log(err);
    res.redirect('/');
  });
};
// ============================================
//  GET Userdash
// ============================================
exports.getUserDash = (req, res, next) => {
  console.log(req.session.isLoggedIn);
  res.render('auth/userdash', {
    path: '/userdash',
    pageTitle: 'My Account',
  });
};
// ============================================
//  GET Reset password
// ============================================
exports.getReset = (req, res, next) => {
  let message = req.flash('error');
  if (message.length > 0) {
    message = message[0];
  } else {
    message = null;
  }
  res.render('auth/reset', {
    path: '/reset',
    pageTitle: 'Reset Password',
    errorMessage: message
  });
};

// ============================================
//  POST Reset password
// ============================================
exports.postReset = (req, res, next) => {
  crypto.randomBytes(32, (err, buffer) => {
    if (err) {
      console.log(err);
      return res.redirect('/reset');
/*       console.log(err);
			return res.status(422).render('auth/reset', {
				path: '/reset',
				pageTitle: 'Reset Password',
				errorMessage: 'Invalid email, please enter a different one',
				oldInput: {
					email: req.body.email,
				},
				validationErrors: [],
			}); */
		}
    // if no error occured, we can generate a token from the given buffer.
    const token = buffer.toString('hex');
    User.findOne({ email: req.body.email })
      .then(user => {
        // - if we didn't find a user.
        if (!user) {
          req.flash('error', 'No account with that email found.');
          return res.redirect('/reset');
     /*    return res.status(422).render('auth/reset', {
						path: '/reset',
						pageTitle: 'Reset Password',
						errorMessage: 'Unregistered mail, please enter a different one',
						oldInput: {
							email: req.body.email,
						},
						validationErrors: [],
					});  */
				}

        // + if we did found a user.
        user.resetToken = token;
        user.resetTokenExpiration = Date.now() + 3600000; // expiration date set to date now + 1 hour.
        return user.save();
      })
      .then(result => {
        res.redirect('/');
        // now we can send an email after updating the user in the DB.
        // we can configure the email that we want to send.
        const resetMsg = {
            to: req.body.email,
            from: 'x19153864@student.ncirl.ie',
            subject: 'Password Reset',
            html: `        
                <p>Your have requested to reset your password.</p>
                <p>Click this <a href="http://localhost:3000/reset/${token}">Link</a>
                     to set a new password.
                </p>
            `,
        };
        
       return sgMail.send(resetMsg);
      })
      .catch((err) => {
        const error = new Error(err);
        error.httpStatusCode = 500;
        return next(error);
      });
  });
};
// ============================================
//  GET NewPassword Interface
// ============================================
exports.getNewPassword = (req, res, next) => {
  const token = req.params.token;
  User.findOne({ resetToken: token, resetTokenExpiration: { $gt: Date.now() } })
    .then(user => {
      let message = req.flash('error');
      if (message.length > 0) {
        message = message[0];
      } else {
        message = null;
      }
      res.render('auth/new-password', {
        path: '/new-password',
        pageTitle: 'New Password',
        errorMessage: message,
        userId: user._id.toString(),
        passwordToken: token,
      });
    })
    .catch(err => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};
// ============================================
//  POST New Password
// ============================================
exports.postNewPassword = (req, res, next) => {
  const newPassword = req.body.password;
  const userId = req.body.userId;
  const passwordToken = req.body.passwordToken; //to avoid enter random token id via browser
  let resetUser;
  User.findOne({ //find one use rin db
    resetToken: passwordToken,
    resetTokenExpiration: { $gt: Date.now() }, //$gt: greater
    _id: userId
  })
    .then(user => {
      resetUser = user; //defined above on let resetUser
      return bcrypt.hash(newPassword, 12);
    })
    .then(hashedPassword => {
      resetUser.password = hashedPassword;
      resetUser.resetToken = undefined;
      resetUser.resetTokenExpiration = undefined;
      return resetUser.save(); //call save
    })
    .then(result => {
      res.redirect('/login'); //redirect user back to login page 
    })
    .catch(err => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};
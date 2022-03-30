const Product = require('../models/product');
const Order = require('../models/order');
const getTimeStamp = require('../util/getTimeStamp');
const { getUsers } = require('./admin');
const User = require('../models/user');

const fs = require('fs');
const path = require('path');

const { STRIPE_KEY } = require('../config/config');
const stripe = require('stripe')(STRIPE_KEY)

// ============================================
//  Get HomePage
// ============================================
exports.getIndex = (req, res, next) => {
  Product.find()
    .then(products => {
      res.render('shop/index', {
        prods: products,
        pageTitle: 'Home',
        path: '/',
      });
    })
    .catch(err => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};
// ============================================
//  Get all product
// ============================================
exports.getProducts = (req, res, next) => {
  Product.find()
    .then(products => {
      res.render('shop/product-list', {
        prods: products,
        pageTitle: 'All Products',
        path: '/products',
      });
    })
    .catch(err => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};
// ============================================
//  Get product for id
// ============================================
exports.getProduct = (req, res, next) => {
  const prodId = req.params.productId;
  Product.findById(prodId)
    .then(product => {
      res.render('shop/product-detail', {
        product: product,
        pageTitle: product.title,
        path: '/products',
      });
    })
    .catch(err => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};


// ============================================
//  Get Cart
// ============================================
exports.getCart = (req, res, next) => {
  req.user
    .populate('cart.items.productId')
    .execPopulate()
    .then(user => {
      const products = user.cart.items;
      res.render('shop/cart', {
        path: '/cart',
        pageTitle: 'Your Cart',
        products: products
      });
    })
    .catch(err => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

// ============================================
//  Get Post Cart
// ============================================
exports.postCart = (req, res, next) => {
	const prodId = req.body.productId;
	Product.findById(prodId)
	.then((product) => {
			return req.user.addToCart(product);
		})
	.then((result) => {
			console.log(result);
			User.findOne({ _id: req.session.user._id })
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
		const total = 
			user.cart.items.reduce((accumulator, currentValue) => {
				const {
					quantity,
							productId: { price },
						} = currentValue;

						return accumulator + quantity * price;
					}, 0);
					req.session.total = total;
					req.session.items = user.cart.items.length;
					res.redirect('/cart');
				});
		})
		.catch((err) => {
			const error = new Error(err);
			error.httpStatusCode = 500;
			return next(error);
		});
};
// ============================================
//  Deleting product the cart
// ============================================
exports.postCartDeleteProduct = (req, res, next) => {
	const prodId = req.body.productId;
	req.user
		.removeFromCart(prodId)
		.then(() => {
			User.findOne({ _id: req.session.user._id })
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
					const total = user.cart.items.reduce((accumulator, currentValue) => {
						const {
							quantity,
							productId: { price },
						} = currentValue;

						return accumulator + quantity * price;
					}, 0);
					req.session.total = total;
					req.session.items = user.cart.items.length;
					res.redirect('/cart');
				});
		})
		.catch((err) => {
			const error = new Error(err);
			error.httpStatusCode = 500;
			return next(error);
		});
};
// ============================================
//    POST product the cart
// ============================================
exports.postOrder = (req, res, next) => {
  req.user
    .populate('cart.items.productId')
    .execPopulate()
    .then(user => {
      const products = user.cart.items.map(i => {
        return { quantity: i.quantity, product: { ...i.productId._doc } };
      });
      const order = new Order({
        user: {
          email: req.user.email,
          userId: req.user
        },
        products: products
      });
      return order.save();
    })
    .then(result => {
      return req.user.clearCart();
    })
    .then(() => {
      res.redirect('/orders');
    })
    .catch(err => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

// ============================================
//  Get Orders per user
// ============================================
exports.getOrders = (req, res, next) => {
	Order.find({ 'user.userId': req.session.user._id })
		.then((orders) => {
			res.render('shop/orders', {
				path: '/orders',
				pageTitle: 'Your Orders',
				orders: orders,
			});
		})
		.catch((err) => {
			const error = new Error(err);
			error.httpStatusCode = 500;
			return next(error);
		});
};
// ============================================
//  Get ALL Orders
// ============================================
exports.getAllOrders = (req, res, next) => {
	Order.find()
		.then((orders) => {
			const total = orders.reduce((accumulator, currentValue) => {
				const totalOrder = currentValue.products.reduce(
					(accumulatorProduct, currentValueProduct) => {
						const {
							quantity,
							product: { price },
						} = currentValueProduct;
						const priceSum = price * quantity;
						return accumulatorProduct + priceSum;
					},
					0
				);
				return accumulator + totalOrder;
			}, 0);
			orders = orders.map((order) => {
				return {
					...order._doc,
					date: getTimeStamp(order._id.toString()),
				};
			});
			res.render('shop/orders', {
				path: '/orders/admin',
				pageTitle: 'Users Orders',
				orders: orders,
				totalAmount: total,
			});
		})
		.catch((err) => {
			const error = new Error(err);
			error.httpStatusCode = 500;
			return next(error);
		});
};
// ============================================
//  Get About Page
// ============================================  
  exports.getAbout = (req, res, next) => {
    console.log(req.session.isLoggedIn);
      res.render('shop/about', {
        path: '/about',
        pageTitle: 'About',
      });
    };

// ============================================
//  Get Contact Page
// ============================================  
    exports.getContact= (req, res, next) => {
      console.log(req.session.isLoggedIn);
        res.render('shop/contact', {
          path: '/contact',
          pageTitle: 'Contact',
        });
      };

// ============================================
//  Get Tutorial Page
// ============================================  
exports.getTutorial= (req, res, next) => {
  console.log(req.session.isLoggedIn);
    res.render('shop/tutorial', {
      path: '/tutorial',
      pageTitle: 'Tutorial',
    });
  };


// ============================================
//  Get Checkout
// ============================================
exports.getCheckout = (req, res, next) => {
  let products;
  let total = 0;
  req.user
    .populate('cart.items.productId')
    .execPopulate()
    .then(user => {
      products = user.cart.items;
      total = 0;
      products.forEach(p => {
        total += p.quantity * p.productId.price;
      });
//this will create the session key and pass an onject
      return stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: products.map(p => {
          return { //data that stripe needs
            name: p.productId.title,
            description: p.productId.description,
            amount: p.productId.price * 100,
            currency: 'eur',
            quantity: p.quantity
          };
        }),
        //stripe will use below urls to redierct user after actions are completed from their end.
        success_url: req.protocol + '://' + req.get('host') + '/checkout/success', // => http://localhost:3000
        cancel_url: req.protocol + '://' + req.get('host') + '/checkout/cancel'
      });
    })
    .then(session => {
      res.render('shop/checkout', {
        path: '/checkout',
        pageTitle: 'Checkout',
        products: products,
        totalSum: total,
        sessionId: session.id
      });
    })
    .catch(err => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

// ============================================
//  Get Checkout
// ============================================
exports.getCheckoutSuccess = (req, res, next) => {
	req.user
		.populate('cart.items.productId')
		.execPopulate()
		.then((user) => {
			const products = user.cart.items.map(i => {
				return {
					quantity: i.quantity,
					product: { ...i.productId._doc },
					totalPay: i.totalPay,
				};
			});
			const order = new Order({
				user: {
					email: req.user.email,
					userId: req.user,
				},
				products: products,
				totalOrder: req.user.cart.pay,
			});
			return order.save();
		})
		.then((result) => {
			return req.user.clearCart();
		})
		.then(() => {
			res.redirect('/orders');
		})
		.catch((err) => {
			const error = new Error(err);
			error.httpStatusCode = 500;
			return next(error);
		});
};




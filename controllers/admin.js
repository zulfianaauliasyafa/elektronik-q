const mongoose = require('mongoose');
const fileHelper = require('../util/file');
const { validationResult } = require('express-validator/check')

const Product = require('../models/product');
const User = require('../models/user');
const getTimeStamp = require('../util/getTimeStamp');

// ============================================
//  Get Admin Dash
// ============================================
exports.getAdminDash= (req, res, next) => {
  console.log(req.session.isLoggedIn);
    res.render('admin/admindash', {
      path: '/admindash',
      pageTitle: 'Admin Control Panel',
    });
  };
// ============================================
//  Get add Product
// ============================================
exports.getAddProduct = (req, res, next) => {
  res.render('admin/edit-product', {
    pageTitle: 'Add Product',
    path: '/admin/add-product',
    editing: false,
    hasError: false,
    errorMessage: null,
    validationErrors: []
  });
};
// ============================================
//  Post Add Product
// ============================================
exports.postAddProduct = (req, res, next) => {
  const title = req.body.title;
  const image = req.file;
  const price = req.body.price;
  const description = req.body.description;
  if (!image) {  //if image is set. if not i want to return a response w/stat 422
  return res.status(422).render('admin/edit-product', {
    pageTitle: 'Add Product',
    path: '/admin/add-product',
    editing: false,
    hasError: true,
    product: {
      title: title,
      price: price,
      description: description
    },
    errorMessage: 'Attached file is not a valid image.',
    validationErrors: []
  });
}
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    console.log(errors.array());
    return res.status(422).render('admin/edit-product', {
      pageTitle: 'Add Product',
      path: '/admin/add-product',
      editing: false,
      hasError: true,
      product: {
        title: title,
        imageUrl: imageUrl,
        price: price,
        description: description
       },
      errorMessage: errors.array()[0].msg,
      validationErrors: errors.array()
    });
  }
  //files are not stored in the DB, but in a file system
  const imageUrl = image.path; //will store the path of the image

  const product = new Product({
   // _id: new mongoose.Types.ObjectId('5f1f08b551942d8057fba085'),
    title: title,
    imageUrl: imageUrl,
    price: price,
    description: description,
    userId: req.user
  });
  product
    .save()
    .then(result => {
      // console.log(result);
      console.log('PRODUCT CREATED');
      res.redirect('/admin/products');
    })
    .catch(err => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};
// ============================================
//  Get Edit Product
// ============================================
exports.getEditProduct = (req, res, next) => {
  const editMode = req.query.edit;
  if (!editMode) {
    return res.redirect('/');
  }
  const prodId = req.params.productId;
  Product.findById(prodId)
    .then(product => {
      if (!product) {
        return res.redirect('/');
      }
      res.render('admin/edit-product', {
        pageTitle: 'Edit Product',
        path: '/admin/edit-product',
        editing: editMode,
        product: product,
        hasError: false,
        errorMessage: null,
        validationErrors: []
      });
    })
    .catch(err => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};
// ============================================
//  Post Edit Product
// ============================================
exports.postEditProduct = (req, res, next) => {
  const prodId = req.body.productId;
  const updatedTitle = req.body.title;
  const image = req.file; //file extracted by malter
  const updatedPrice = req.body.price;
  const updatedDesc = req.body.description;

  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(422).render('admin/edit-product', {
      pageTitle: 'Edit Product',
      path: '/admin/edit-product',
      editing: true,
      hasError: true,
      product: {
        title: updatedTitle,
        price: updatedPrice,
        description: updatedDesc,
        _id: prodId
      },
      errorMessage: errors.array()[0].msg,
      validationErrors: errors.array()
    });
  }
  Product.findById(prodId)
    .then(product => {
      if (product.userId.toString() !== req.user._id.toString()) {
        return res.redirect('/');
      }
      product.title = updatedTitle;
      product.price = updatedPrice;
      product.description = updatedDesc;
      if (image) {
        fileHelper.deleteFile(product.imageUrl);
        product.imageUrl =  image.path;
      }
      return product.save().then(result => {
        console.log('UPDATED PRODUCT!');
        res.redirect('/admin/products');
      });
    })
    .catch(err => {
    const error = new Error(err);
    error.httpStatusCode = 500;
    return next(error);
    });
};
// ============================================
//  Get all product for user
// ============================================
exports.getProducts = (req, res, next) => {
  Product.find({userId: req.user._id}) //restriction to only display if prod was created
    .then(products => {
      console.log(products);
      res.render('admin/products', {
        prods: products,
        pageTitle: 'Admin Products',
        path: '/admin/products',
      });
    })
    .catch(err => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
      });
};
// ============================================
//  Post Delete product
// ============================================
exports.deleteProduct = (req, res, next) => {
  const prodId = req.params.productId;
  Product.findById(prodId)
    .then(product => {
      if (!product) {
        return next(new Error('Product not found.'));
      }
      fileHelper.deleteFile(product.imageUrl);
      return Product.deleteOne({ _id: prodId, userId: req.user._id });
    })
    .then(() => {
      console.log('DESTROYED PRODUCT');
      res.status(200).json({ message: 'Success!' });
    })
    .catch(err => {
      res.status(500).json({ message: 'Deleting product failed.' });
    });
};

// ============================================
//  Get Admin Users
// ============================================
exports.getUsers= (req, res, next) => {
  User.find().then(users => {
    users = users.map(user => {
      return {
        ...user._doc,
        date: getTimeStamp(user._id.toString())
      }
    })
    res.render('admin/users', {
      pageTitle: 'Admin Users',
      path: '/admin/users',
      users
    });
  })
};
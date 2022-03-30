const path = require('path');
//3rd party modules
const express = require ('express');
const bodyParser = require ('body-parser');
const mongoose = require ('mongoose');
const session = require('express-session');
const MongoDBStore = require('connect-mongodb-session')(session);
const csrf = require ('csurf'); //CSRF
const flash = require ('connect-flash');
const multer  = require('multer');
require ('dotenv').config();
const compression = require('compression');

const errorController = require('./controllers/error')
const User = require('./models/user');

//DB Connection
const MONGODB_URI =  `mongodb://admin:admin123@cluster0-shard-00-00.yzhxm.mongodb.net:27017,cluster0-shard-00-01.yzhxm.mongodb.net:27017,cluster0-shard-00-02.yzhxm.mongodb.net:27017/myFirstDatabase?ssl=true&replicaSet=atlas-sx2aqh-shard-0&authSource=admin&retryWrites=true&w=majority`;


const app = express();
const store = new MongoDBStore({  //constant:store , constructor:MongoDBStore
  uri: MONGODB_URI,
  collection: 'sessions',
});
//CSRF
const csrfProtection = csrf();

const fileStorage = multer.diskStorage({
  destination: (req, res, cb) => {
    cb(null, 'images');
  },
  filename: (req, file, cb) => {
    cb(null, new Date().toISOString() + '-' + file.originalname)
  }
});
const fileFilter = (req, file, cb) => {
  if (
    file.mimetype === 'image/png' ||
    file.mimetype === 'image/jpg' ||
    file.mimetype === 'image/jpeg'
  ) {
    cb(null, true);
  } else {
    cb(null, false);
  }
};
//View Engine Setup
app.set('view engine', 'ejs'); //hbs = handlebars , pug, ejs
app.set('views', 'views');

//routes
const adminRoutes = require('./routes/admin');
const shopRoutes = require('./routes/shop');
const authRoutes = require('./routes/auth');

//add compression as middleware
app.use(compression());

app.use(bodyParser.urlencoded({extended: false}));
// multer config import
app.use(multer({ storage: fileStorage, fileFilter: fileFilter  }).single('image'));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/images', express.static(path.join(__dirname, 'images')));

app.use(
  session({
    secret: 'anystringoftext',
    saveUninitialized: false,
    resave: false,
    store: store
  })
);
// csrf Token for security
app.use(csrfProtection);

//Connect-flash
app.use(flash());

app.use((req, res, next) => { //to pass these data to all of the rendered views
  res.locals.isAuthenticated = req.session.isLoggedIn;
  if(req.session.user) {
    res.locals.role = req.session.user.roles;
    res.locals.name = req.session.user.name;
  }
  if(req.session.total) {
    res.locals.total = req.session.total;
    res.locals.items = req.session.items;
  }
  res.locals.csrfToken = req.csrfToken();
  next();
});


//find user with Id
app.use((req, res, next) => {  
   // throw new Error('Dummy');
  if (!req.session.user) {
    return next();
  }
  User.findById(req.session.user._id) //findById provided by mangoose
    .then(user => {  //user is a mongoose model
      if(!user) {  //check for existance of user 
        return next(); //will rturn next w/o storing
      }
      req.user = user; //storing mongoose model from session into req.user enables all mongoose model method to work
      next();
    })
    //throw new error to wrap error object.
    .catch(err => {
      next(new Error (err));
    });
});



//middleware
app.use('/admin', adminRoutes); 
app.use(shopRoutes);
app.use(authRoutes);


app.get('/error500',errorController.get500);

// catch 404 and forward to error handler
app.use(errorController.get404);

// error handling middleware with 4 arguments
app.use((error, req, res, next) => {
  // res.redirect('/500');
    res.status(500).render('error500', {
    pageTitle: 'Error!',
    path: '/error500',
    isAuthenticated: req.session.isLoggedIn
  });
}); 

mongoose
  .connect(MONGODB_URI, { useNewUrlParser: true })
  .then(result => {
    app.listen(process.env.PORT || 3000);
    console.log('http://localhost:3000');
  })
  .catch(err => {
    console.log(err);
  });

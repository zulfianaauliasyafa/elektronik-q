exports.get404 = (req, res, next) => {
    res.status(404).render('error404', { 
      pageTitle: 'Page Not Found', 
      path:'/error404',
      isAuthenticated: req.session.isLoggedIn 
    });
  };

  exports.get500 = (req, res, next) => {
    res.status(500).render('error500', { 
      pageTitle: 'Error!', 
      path:'/error500',
      isAuthenticated: req.session.isLoggedIn 
    });
  };
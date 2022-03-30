module.exports = (req, res, next) => {
  // make sure the user is logged in.
    if(!req.session.isLoggedIn){
        // redirect to login
        return res.redirect('/login')
      }
      next();
}


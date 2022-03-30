module.exports = (req, res, next) => {
  if(req.session.user.roles !== 'admin') {
    return res.redirect('/');
  }
	next();
};

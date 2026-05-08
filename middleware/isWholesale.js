function isWholesaleApproved(req, res, next) {
  if (!req.user || !req.user.isWholesaleApproved) {
    return res.redirect("/wholesale/not-approved");
  }
  next();
}

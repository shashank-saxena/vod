var express = require('express');
var router = express.Router();

router.get('/app', function (req, res, next) {
  console.log("in rest/app req.params :: ",
  req.param('hub.verify_token'), req.param('hub.challenge'));
  var verify_token = req.param('hub.verify_token');
  if (verify_token === '12345678' && req.param('hub.challenge')) {
    res.send(req.param('hub.challenge'));
  } else {
    res.sendStatus(400);
  }
  
  
});

module.exports = router;
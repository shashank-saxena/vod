var mongoose = require('mongoose');
var passport = require('passport');
var fs = require('fs');
var shortid = require('shortid');

var History = mongoose.model('History');
var User = mongoose.model('User');

var userController = {
  renderIndex: renderIndex,
  login: login,
  register: register,
  renderHistory: renderHistory,
  myHistory: myHistory,
  getProfile: getProfile,
  updateProfile: updateProfile
};

function updateProfile(req, res, next) {
  var response = {
    success: true,
    msg: "",
    data: null
  };
  var user = req.body.user;
  if (user.dob) {
    user.dob = new Date(user.dob).toISOString();
  }
  console.log("req.body :: ", req.body, "req.files :: ", req.files);

  if (req.files && req.files.profilePic) {
    // get the temporary location of the file
    var tmp_path = req.files.profilePic.path;
    // set where the file should actually exists - in this case it is in the "images" directory
    var fileName = req.files.profilePic.name;
    var file_ext = fileName.substr((Math.max(0, fileName.lastIndexOf(".")) || Infinity) + 1);
    var newFileName = shortid.generate()+'.'+ file_ext;
    var target_path = './public/uploads/' + newFileName;
    user["profilePic"] = '/uploads/' + newFileName;
    // move the file from the temporary location to the intended location
    fs.rename(tmp_path, target_path, function (err) {
      if (err) {
        response.msg = "Profile image isn't uploaded successfully, Please try again!";
        response.data = err;
        res.json(response);
      } else {
        // delete the temporary file, so that the explicitly set temporary upload dir does not get filled with unwanted files
        fs.unlink(tmp_path, function () {
          if (err) {
            response.msg = "Profile image isn't uploaded successfully, Please try again!";
            response.data = err;
            res.json(response);
          } else {
            User.update({
              "_id": user._id
            }, user, {
              multi: false
            }, function (err, data) {
              if (err) {
                response.success = false;
                response.msg = "Opps something wrong happen, Please try again!";
                response.data = err;
              } else {
                response.msg = "User profile updated successfully!";
                response.data = data;
              }
              res.json(response);
            });
            console.log('File uploaded to: ' + target_path + ' - ' + req.files.profilePic.size + ' bytes');
          }
        });
      }
    });
  } else {

    User.update({
      "_id": user._id
    }, user, {
      multi: true
    }, function (err, data) {
      if (err) {
        response.success = false;
        response.msg = "Opps something wrong happen, Please try again!";
        response.data = err;
      } else {
        response.msg = "User profile updated successfully!";
        response.data = data;
      }
      res.json(response);
    });
  }
};

function getProfile(req, res, next) {
  var select = {
    __v: false,
    hash: false,
    salt: false
  }
  User.findOne({
    "_id": req.payload._id
  }, select, function (err, udata) {
    if (err) {
      conole.log('err in check username:  ', err);
      return next(err);
    }
    console.log('user data : ', udata);
    //this shows the correct user id
    if (udata) {
      return res.json(udata);
    } else {
      return res.status(400).json({
        message: 'No user details are found!'
      });
    }
  });
};

function myHistory(req, res, next) {
  History.findOne({
    "user": req.payload._id
  }, function (err, hdata) {
    console.log("myHistory err :: ",err,"myHistory hdata :: ", hdata)
    if (err) {
      conole.log('err in find user history:  ', err);
      return next(err);
    } else {
      if(hdata && hdata.user_history){
        res.json(hdata.user_history);
      } else {
        res.json([]);
      }
    }
  });
};

function renderHistory(req, res, next) {
  History.findOne({
    "user": req.payload._id
  }, function (err, hdata) {
    if (err) {
      conole.log('err in find user history:  ', err);
      return next(err);
    }
    console.log('history data : ', hdata); //this shows the correct user id
    if (hdata) {
      if (hdata.user_history.indexOf(req.body.id) == -1) {
        //update schema
        console.log('save to history data : ', hdata);
        hdata.user_history.push(req.body.id);
        hdata.save();
      }
      res.json(hdata);
    } else {
      //save new data to schema
      console.log('create history data : ');
      var history = new History();
      history.user = req.payload._id;
      history.user_history = [req.body.id];
      var promise = history.save();
      promise.then(
        function (history) {
          res.json(history);
        },
        function (error) {
          if (err) {
            console.log("Error :: ", err);
            return next(err);
          }
        }
      );
    }
  });
};

function register(req, res, next) {
  if (!req.body.username || !req.body.password) {
    return res.status(400).json({
      message: 'Please fill out all fields'
    });
  }

  User.findOne({
    "username": req.body.username
  }, function (err, udata) {
    if (err) {
      conole.log('err in check username:  ', err);
      return next(err);
    }
    console.log('history data : ', udata); //this shows the correct user id
    if (udata) {
      return res.status(400).json({
        message: 'A User already exist with this username, please try something diffrent.'
      });
    } else {
      var user = new User();
      user.username = req.body.username;
      user.setPassword(req.body.password)
      user.save(function (err) {
        if (err) {
          return next(err);
        }
        return res.json({
          token: user.generateJWT()
        })
      });
    }
  });
};

function renderIndex(req, res, next) {
  res.render('index');
};

function login(req, res, next) {
  if (!req.body.username || !req.body.password) {
    return res.status(400).json({
      message: 'Please fill out all fields'
    });
  }

  passport.authenticate('local', function (err, user, info) {
    console.log("In post login err : ", err, "user : ", user);
    if (err) {
      return next(err);
    }

    if (user) {
      var new_token = user.generateJWT();
      console.log("new_token genrated by user : ", new_token);
      return res.json({
        token: new_token
      });
    } else {
      return res.status(401).json(info);
    }
  })(req, res, next);
};

module.exports = userController;
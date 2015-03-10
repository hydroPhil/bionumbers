var express = require('express');
var router = express.Router();

var arg_json = { title: 'BioNumbers 2.0' };

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', arg_json);
});

/* GET home page. */
router.get('/about', function(req, res, next) {
  res.render('about', arg_json);
});

/* GET home page. */
router.get('/curate', function(req, res, next) {
  res.render('curate', arg_json);
});

module.exports = router;

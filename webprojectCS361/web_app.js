var express = require('express');
var app = express();
var handlebars = require('express-handlebars').create({
  defaultLayout: 'main'
});
var mysql = require('./dbcon.js');
var bodyParser = require('body-parser');
var session = require('express-session');


app.use(bodyParser.urlencoded({
  extended: false
}));
app.use(bodyParser.json());
app.use(express.static('public'));
app.engine('handlebars', handlebars.engine);
app.use(session({
  secret: 'SuperSecretPassword',
  resave: true,
  saveUninitialized: true
}));
app.set('view engine', 'handlebars');
app.set('port', 4247);

var numThemes = 3;
// tables in sql:
/*

CREATE TABLE g22_users (
    user_id int NOT NULL AUTO_INCREMENT,
    username varchar(25) NOT NULL,
    user_pw varchar(25) NOT NULL,
    theme_option int NOT NULL,
    PRIMARY KEY (user_id)
) engine=innodb;

CREATE TABLE g22_goals (
    goal_id int NOT NULL AUTO_INCREMENT,
    goal_text varchar(200) NOT NULL,
    PRIMARY KEY (goal_id)
) engine=innodb;

CREATE TABLE g22_users_goals (
    fk_user_id int,
    fk_goal_id int,
    foreign key (fk_user_id) references g22_users(user_id),
    foreign key (fk_goal_id) references g22_goals(goal_id),
    primary key (fk_user_id, fk_goal_id)
);

CREATE TABLE g22_health (
    health_id int NOT NULL AUTO_INCREMENT,
    health_value int NOT NULL,
    PRIMARY KEY (health_id)
) engine=innodb;

CREATE TABLE g22_users_health (
    fk_user_id int,
    fk_health_id int,
    foreign key (fk_user_id) references g22_users(user_id),
    foreign key (fk_health_id) references g22_health(health_id),
    primary key (fk_user_id, fk_health_id)
);


*/

// req.session.userID is undefined for non logged in users, and an id coresponding the users table if they're logged in. going to be an issue if someone clears cookies while they're logged in tho, maybe have checks for that

// this is the route handler when the user accesses the page
app.get('/', function(req, res, next) {
  res.render('home');
});

app.post('/attemptLogin', function(req, res, next) {

  if (req.body.username === undefined) {
    res.send(JSON.stringify({
      "errorCode": 2 // error code 2 = username not given
    }));
    return;
  }

  if (req.body.password === undefined) {
    res.send(JSON.stringify({
      "errorCode": 3 // error code 3 = pw not given
    }));
    return;
  }

  if (req.body.username.length > 10) {
    res.send(JSON.stringify({
      "errorCode": 4 // error code 2 = username too long
    }));
    return;
  }

  if (req.body.username.length > 10) {
    res.send(JSON.stringify({
      "errorCode": 5 // error code 2 = pw too long
    }));
    return;
  }

  // check if username and pw match db
  mysql.pool.query("select user_id from g22_users where username = ? and user_pw = ?", [req.body.username, req.body.password], function(err, result) {
    if (err) {
      next(err);
      return;
    }

    if (result.length === 0) { // username/pw doesn't exist in db
      res.send(JSON.stringify({
        "errorCode": 1 // error code 1 = user/pw isn't correct
      }));
    } else { // username/pw does exist in db
      req.session.userID = result[0].user_id;
      res.send(JSON.stringify({
        "errorCode": 0 // error code 0 = user logged in
      }));

    }
  });
});

app.post('/createNewAccount', function(req, res, next) {

  if (req.body.username === undefined) {
    res.send(JSON.stringify({
      "errorCode": 2 // error code 2 = username not given
    }));
    return;
  }

  if (req.body.password === undefined) {
    res.send(JSON.stringify({
      "errorCode": 3 // error code 3 = pw not given
    }));
    return;
  }

  if (req.body.username.length > 10) {
    res.send(JSON.stringify({
      "errorCode": 4 // error code 2 = username too long
    }));
    return;
  }

  if (req.body.username.length > 10) {
    res.send(JSON.stringify({
      "errorCode": 5 // error code 2 = pw too long
    }));
    return;
  }

  // check if username already exists
  mysql.pool.query("select count(username) as c from g22_users where username = ?", [req.body.username], function(err, result) {
    if (err) {
      next(err);
      return;
    }

    if (result[0].c > 0) { // username exists
      res.send(JSON.stringify({
        "errorCode": 1 // error code 1 = username exists
      }));
    } else { // username doesn't exist
      mysql.pool.query("INSERT INTO g22_users (`username`, `user_pw`, `theme_option`) VALUES (?, ?, 0)", [req.body.username, req.body.password], function(err, result) {
        if (err) {
          next(err);
          return;
        }
        req.session.userID = result.insertId;
        res.send(JSON.stringify({
          "errorCode": 0 // error code 0 = OK
        }));
      });
    }
  });
});

// get user id from cookie to send to front end
app.post('/getUserID', function(req, res, next) {

  if (req.session.userID === undefined) {
    res.send(JSON.stringify({
      "errorCode": 1, // error code 1 means no user logged in
      "userID": -1 // -1 to signify no user is currently logged in, as far as the cookie is concerned
    }));
    return;
  } else {
    res.send(JSON.stringify({
      "errorCode": 0, // error code 0 = OK
      "userID": req.session.userID // the user ID for the user logged in according to cookie data
    }));
    return;
  }

});

// get username for the currently logged in user
app.post('/getLoggedInUsername', function(req, res, next) {

  if (req.session.userID === undefined) {
    res.send(JSON.stringify({
      "errorCode": 1, // error code 1 means no user logged in
      "username": -1 // -1 for error
    }));
    return;
  }

  mysql.pool.query("select username from g22_users where user_id = ?", [req.session.userID], function(err, result) {
    if (err) {
      next(err);
      return;
    }

    if (result.length === 0) { // user id provided doesnt exist in db
      res.send(JSON.stringify({
        "errorCode": 2, // error code 2 = db didn't have user id provided
        "username": -1 // -1 for error

      }));
    } else { // user id is found in db
      res.send(JSON.stringify({
        "errorCode": 0, // error code 0 = OK
        "username": result[0].username // user name for the currently logged in user
      }));
    }
  });

});

app.post('/logoutUser', function(req, res, next) {

  req.session.userID = undefined;

  res.send(JSON.stringify({
    "errorCode": 0 // error code 0 = OK
  }));
});

app.post('/addGoal', function(req, res, next) {

  if (req.session.userID === undefined) {
    res.send(JSON.stringify({
      "errorCode": 1, // error code 1 means no user logged in
    }));
    return;
  }

  if (req.body.goal === undefined || req.body.goal.length <= 0) {
    res.send(JSON.stringify({
      "errorCode": 2, // error code 2 means no goal entered
    }));
    return;
  }

  req.body.goal = req.body.goal.replaceAll("\n", "").replaceAll("\r", "");

  if (req.body.goal.length > 140) { // truncate to 140 char if > 140 length
    req.body.goal = req.body.goal.substring(0, 140)
  }

  mysql.pool.query("INSERT INTO g22_goals (`goal_text`) VALUES (?)", [req.body.goal], function(err, result) {
    if (err) {
      next(err);
      return;
    }
    mysql.pool.query("INSERT INTO g22_users_goals (`fk_user_id`,`fk_goal_id`) VALUES (?,?)", [req.session.userID, result.insertId], function(err, result) {
      if (err) {
        next(err);
        return;
      }
      res.send(JSON.stringify({
        "errorCode": 0 // error code 0 = OK
      }));
    });
  });
});

app.post('/getGoals', function(req, res, next) {

  if (req.session.userID === undefined) {
    res.send(JSON.stringify({
      "errorCode": 1, // error code 1 means no user logged in
    }));
    return;
  }

  mysql.pool.query("select g22_goals.goal_text from g22_users inner join g22_users_goals on g22_users_goals.fk_user_id=g22_users.user_id inner join g22_goals on g22_goals.goal_id=g22_users_goals.fk_goal_id where g22_users.user_id = ? order by g22_goals.goal_id asc", [req.session.userID], function(err, result) {
    if (err) {
      next(err);
      return;
    }
    res.send(JSON.stringify({
      "goals": result,
      "errorCode": 0 // error code 0 = OK
    }));
  });
});

app.post('/addHealth', function(req, res, next) {

  if (req.session.userID === undefined) {
    res.send(JSON.stringify({
      "errorCode": 1, // error code 1 means no user logged in
    }));
    return;
  }

  if (req.body.health === undefined || req.body.health <= 0 || req.body.health >= 11) {
    res.send(JSON.stringify({
      "errorCode": 2, // error code 2 means no health entered, or out of bounds
    }));
    return;
  }

  mysql.pool.query("INSERT INTO g22_health (`health_value`) VALUES (?)", [req.body.health], function(err, result) {
    if (err) {
      next(err);
      return;
    }
    mysql.pool.query("INSERT INTO g22_users_health (`fk_user_id`,`fk_health_id`) VALUES (?,?)", [req.session.userID, result.insertId], function(err, result) {
      if (err) {
        next(err);
        return;
      }
      res.send(JSON.stringify({
        "errorCode": 0 // error code 0 = OK
      }));
    });
  });
});

app.post('/getHealth', function(req, res, next) {

  if (req.session.userID === undefined) {
    res.send(JSON.stringify({
      "errorCode": 1, // error code 1 means no user logged in
    }));
    return;
  }

  mysql.pool.query("select g22_health.health_value from g22_users inner join g22_users_health on g22_users_health.fk_user_id=g22_users.user_id inner join g22_health on g22_health.health_id=g22_users_health.fk_health_id where g22_users.user_id = ? order by g22_health.health_id asc", [req.session.userID], function(err, result) {
    if (err) {
      next(err);
      return;
    }
    res.send(JSON.stringify({
      "health": result,
      "errorCode": 0 // error code 0 = OK
    }));
  });
});

app.post('/changeThemeOption', function(req, res, next) {

  if (req.session.userID === undefined) {
    res.send(JSON.stringify({
      "errorCode": 1, // error code 1 means no user logged in
    }));
    return;
  }

  if (req.body.themeOption === undefined || req.body.themeOption < 0 || req.body.themeOption >= numThemes) {
    res.send(JSON.stringify({
      "errorCode": 2, // error code 2 means theme out of bounds or none entered
    }));
    return;
  }

  mysql.pool.query("update g22_users set theme_option = ? where g22_users.user_id = ?;", [req.body.themeOption, req.session.userID], function(err, result) {
    if (err) {
      next(err);
      return;
    }
    res.send(JSON.stringify({
      "errorCode": 0 // error code 0 = OK
    }));
  });
});

app.post('/getThemeOption', function(req, res, next) {

  if (req.session.userID === undefined) {
    res.send(JSON.stringify({
      "errorCode": 1, // error code 1 means no user logged in
    }));
    return;
  }

  mysql.pool.query("select g22_users.theme_option from g22_users where g22_users.user_id = ?", [req.session.userID], function(err, result) {
    if (err) {
      next(err);
      return;
    }
    res.send(JSON.stringify({
      "themeOption": result[0].theme_option,
      "errorCode": 0 // error code 0 = OK
    }));
  });
});


//DAT PHAM
app.get('/additional',function(req, res, next){
  if (req.session.userID === undefined) {
    res.send(JSON.stringify({
      "errorCode": 1, // error code 1 means no user logged in
    }));
    return;
  }
  res.render('additional');
});




// replace all of str1 with st2, set ignore = true to be case sensitive, source: https://stackoverflow.com/questions/2116558/fastest-method-to-replace-all-instances-of-a-character-in-a-string
String.prototype.replaceAll = function(str1, str2, ignore) {
  return this.replace(new RegExp(str1.replace(/([\/\,\!\\\^\$\{\}\[\]\(\)\.\*\+\?\|\<\>\-\&])/g, "\\$&"), (ignore ? "gi" : "g")), (typeof(str2) == "string") ? str2.replace(/\$/g, "$$$$") : str2);
}

app.use(function(req, res) {
  res.status(404);
  res.render('404');
});

app.use(function(err, req, res, next) {
  console.error(err.stack);
  res.status(500);
  res.render('500');
});

app.listen(app.get('port'), function() {});

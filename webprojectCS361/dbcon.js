var mysql = require('mysql');
var pool = mysql.createPool({
  connectionLimit : 10,
  host            : 'classmysql.engr.oregonstate.edu',
  user            : 'cs361_wagnemic',
  password        : 'group22pw',
  database        : 'cs361_wagnemic'
});

module.exports.pool = pool;

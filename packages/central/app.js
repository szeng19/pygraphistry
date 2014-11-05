var express = require('express')
var mongo = require('mongodb')
var app = express()

var MongoClient = mongo.MongoClient
  , assert = require('assert');

var url = 'mongodb://graphistry:graphtheplanet@lighthouse.2.mongolayer.com:10048,lighthouse.3.mongolayer.com:10048/graphistry-prod';
var db;

app.get('/', function (req, res) {
  res.send('Hi there! Please provide a dataset through the URL.');
  res.end()
  return;
})

app.get('/:dataName', function (req, res) {
    db.collection('data_info').findOne({"name": req.param("dataName")}, function(err, doc) {
        if (err) {
            console.log(err);
            res.send('Problem with query');
            res.end();
            return;
        }
        if (doc) {
            // Query only for gpus that have been updated within 30 secs
            var d = new Date();
            d.setSeconds(d.getSeconds() - 30);

            // Get all GPUs that have free memory that can fit the data
            db.collection('gpu_monitor')
                  .find({'gpu_memory_free': {'$gt': doc.size},
                         'updated': {'$gt': d}, },
                         {'sort': ['gpu_memory_free', 'desc']})
                  .toArray(function(err, ips) {

                if (err) {
                    console.log(err);
                    res.send('Problem with query');
                    res.end();
                    return;
                }

                // Are there no servers with enough space?
                if (ips.length == 0) {
                    console.log("All GPUs out of space!");
                    res.send('No servers can fit the data :/');
                    res.end();
                    return;
                }

                // Query only for workers that have been updated within 30 secs
                var d = new Date();
                d.setSeconds(d.getSeconds() - 30);

                // Find all idle node processes
                db.collection('node_monitor').find({'active': false, 
                                                    'updated': {'$gt': d}})
                                                 .toArray(function(err, results) {

                    if (err) {
                        console.log(err);
                        res.send('Problem with query');
                        res.end();
                        return;
                    }

                    // Are all processes busy or dead?
                    if (results.length == 0) {
                        console.log('There is space on a server, but all workers in the fleet are busy or dead (have not pinged home in over 30 seconds).');
                        res.send('There is space on a server, but all workers in the fleet are busy or dead (have not pinged home in over 30 seconds)');
                        res.end();
                        return;
                    }

                    // Try each IP in order of free space
                    for (var i in ips) {
                        var ip = ips[i]['ip'];

                        for (var j in results) {
                            if (results[j]['ip'] != ip) continue;

                            // We found a match
                            var port = results[j]['port'];

                            // Todo: ping process first for safety

                            // 301 redirect?
                            var route = 'http://' + ip + ':' + port;
                            console.log("sending request to " + route)
                            res.redirect(route + '/graph.html')
                            // res.send(route);
                            res.end();
                            return;
                        }
                    }
                });
            });
        } else {
            res.send('Couldn\'t find that dataset');
            res.end();
            return;
        }
    });
});


MongoClient.connect(url, {auto_reconnect: true}, function(err, database) {
  if(err) console.log(err);

  db = database.db('graphistry-prod');

  var server = app.listen(3000, 'localhost', function () {
      var host = server.address().address
      var port = server.address().port
      console.log('router app listening at http://%s:%s', host, port)
    });
});

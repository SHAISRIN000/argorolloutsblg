//Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
//SPDX-License-Identifier: MIT-0

var express = require("express");
var app = express();
var AWSXRay = require('aws-xray-sdk');
var os = require("os");
//Testing const Prometheus = require('prom-client');
//const apiMetrics = require('prometheus-api-metrics');
//app.use(apiMetrics);
//const makeApiMiddleware = require("api-express-exporter");
//app.use(makeApiMiddleware());


const client = require('prom-client');

const collectDefaultMetrics = client.collectDefaultMetrics;

collectDefaultMetrics({ prefix: 'my_application:' });


// a custom histogram metric which represents the latency
// of each call to our API /api/greeting.
const histogram = new client.Histogram({
  name: 'http_response_time_seconds',
  help: 'Duration of HTTP requests in ms',
  labelNames: ['method', 'status_code'],
  buckets: [0.1, 5, 15, 50, 100, 500]
});

const counter = new client.Counter({
    name: 'http_requests_total',
    help: 'Number of get requests.',
    labelNames: ['status_code']
});


var responseStatus = 200;
//Prometheus.collectDefaultMetrics();


app.use(AWSXRay.express.openSegment('Product-Detail-V1'));

app.get("/catalogDetail", (req, res, next) => {
    
    const end = histogram.startTimer();
  const name = req.query.name ? req.query.name : 'World';
  // stop the timer
  //end({ method: req.method, 'status_code': 200 });
  
  
  
  console.log(responseStatus)
  res.status(responseStatus)
  if (responseStatus == 200) {
      console.log("Catalog Detail Version 1 Get Request Successful");
      res.json({
                 "version":"3",
                 "vendors":[ "ABC.com" ]
                  } )
                  
    end({ method: req.method, 'status_code': 200 })  
    counter.inc({'status_code': 200 });
   } else {
        console.log("Catalog Detail Version 1 Get Request has error 500");
        res.json("Error");
        end({ method: req.method, 'status_code': 500 })
             counter.inc({'status_code': 500 });

   }
   next();
});

app.get("/ping", (req, res, next) => {
    counter.inc({'status_code': 500 });
    next();
  res.json("Healthy")
});



app.get('/metrics', (request, response) => {
  response.set('Content-Type', client.register.contentType);
  response.send(client.register.metrics());
});


app.get("/injectFault", (req, res, next) => {
    console.log("host: " + os.hostname() + " will now respond with 500 error.");
    responseStatus=500;
    res.status(500);
    next(new Error("host: " + os.hostname() + " will now respond with 500 error."));
});

app.get("/resetFault", (req, res, next) => {
   console.log("Removed fault injection from host: " + os.hostname());
   responseStatus=200;
   res.json("Removed fault injection from host: " + os.hostname());
});

app.use(AWSXRay.express.closeSegment());

app.listen(3000, () => {
 console.log("Server running on port 3000");
});
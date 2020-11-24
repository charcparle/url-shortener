require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const app = express();
const mongoose = require('mongoose');
const dns = require('dns');

// Basic Configuration
const port = process.env.PORT || 3000;
app.listen(port, function() {
  console.log(`Listening on port ${port}`);
});

// Request Logger
app.use((req,res,next)=>{
  console.log(req.method+" "+req.path+" - "+req.ip);
  next();
})

// Mount the body-parser middleware
app.use(bodyParser.urlencoded({extended:false}));
app.use(bodyParser.json());

// Mongoose - Connect to MongoDB
mongoose.connect(process.env.DB_URI, { useNewUrlParser: true, useUnifiedTopology: true})  
  .then( () => {
    console.log('Connection to the Atlas Cluster is successful!')
  })
  .catch( (err) => console.error(err));


// Handle CORS
app.use(cors({optionsSuccessStatus: 200}));

// Serve static files
app.use('/public', express.static(`${process.cwd()}/public`));

// Landing page
app.get('/', function(req, res) {
  res.sendFile(process.cwd() + '/views/index.html');
});

// Your first API endpoint
app.get('/api/hello', function(req, res) {
  res.json({ greeting: 'hello API' });
});


// Set up DB
const Schema = mongoose.Schema;
const urlSchema = new Schema({
  original: {type: String, required: true},
  short: {type: Number, required: true}
});
let Link = mongoose.model('Link', urlSchema);
console.log(Link);

// Mongoose fn to find Link
//https://stackoverflow.com/questions/24035872/return-results-mongoose-in-find-query-to-a-variable
const findShortURL = (original) => {
  let query =Link.find({original: original},(err, linkFound)=>{
    console.log(`linkFound.length: ${linkFound.length}`);
    if (err) {
      console.error(err);
    } else {
      if (linkFound.length==0) {
        console.log("New entry - ");
      } else {
        console.log("duplicated entry found");
        console.log(`linkFound: ${linkFound}`);
      }
    }
  });
  return query;
}



// Capture the POST URL action, create & save
const regex=/^https*:\/\//;
const follow = /\/\S+/

app.post("/api/shorturl/new",(req,res)=>{
  console.log(`user input: ${req.body.url}`)
  let capture = req.body.url.replace(regex,'').replace(follow,'');
  console.log(`capture: ${capture}`)
  
  dns.lookup(capture,(err,address,family)=>{ //dns.lookup to check hostname
    if (err) {
      console.log(err);
      res.json({error: 'Invalid url'});
    } else if (req.body.url.match(regex)==null) { //address should start with http or https
      console.log(`req.body.url.match(regex): ${req.body.url.match(regex)}`);
      console.log("url should starts with http or https");
      res.json({error: 'Invalid url'});
    } else {
      console.log(`dns-address: ${address}`);
      let query = findShortURL(req.body.url);
      query.exec((err,linkFound)=>{
        if (err) return console.error(err);
        if (linkFound.length==0){ // new entry
          console.log(`None found, linkFound inside query of app.post: ${linkFound}`);
          let linkMaxShort = Link.find().sort({short:-1}).limit(1); // finding the document with largest value of 'short'
          linkMaxShort.exec((err,linkLatest)=>{
            console.log(`linkLatest: ${linkLatest}`)
            if (err) return console.error(err);
            let currentCount = 0; // for a blank db
            if (linkLatest.length>0) {currentCount = linkLatest[0].short;}
            console.log(`currentCount: ${currentCount}`)
            let newLink = new Link({
              original: req.body.url,
              short: currentCount + 1
            });
            newLink.save((err=>{
              if (err) return console.error(err);
            }));
            res.json({original_url: req.body.url, short_url: newLink.short});
          });
        } else { // duplicated entry
          console.log(`Matched, linkFound inside query of app.post: ${linkFound}`);
          console.log(`linkFound[0].short: ${linkFound[0].short}`);
          res.json({original_url: req.body.url, short_url: linkFound[0].short});
        }
      });
    }
  }); 
});

// Redirect URL
app.get("/api/shorturl/:short_url",(req,res)=>{
  console.log(`req.params.short_url: ${req.params.short_url}`);
  let lookupLongURL = Link.find({short: req.params.short_url}, (err)=>{
    if (err) return console.error(err)
  });
  lookupLongURL.exec((err, linkFound)=>{
    console.log(`linkFound: ${linkFound}`);
    if (err) return console.error(err);
    if (linkFound.length==0){
      res.send("Incorrect reference")
    } else {
      res.redirect(linkFound[0].original);
    }
  });
});

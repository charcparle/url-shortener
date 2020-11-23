require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const app = express();
const mongoose = require('mongoose');

// Basic Configuration
const port = process.env.PORT || 3001;

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
app.use(cors());

app.use('/public', express.static(`${process.cwd()}/public`));

// Landing page
app.get('/', function(req, res) {
  res.sendFile(process.cwd() + '/views/index.html');
});

// Your first API endpoint
app.get('/api/hello', function(req, res) {
  res.json({ greeting: 'hello API' });
});

app.listen(port, function() {
  console.log(`Listening on port ${port}`);
});

// Set yp DB
const Schema = mongoose.Schema;
const urlSchema = new Schema({
  original: {type: String, required: true},
  short: {type: Number, required: true}
});
let Link = mongoose.model('Link', urlSchema);
console.log(Link);

// Mongoose fn to store URL
const createShortURL = (original) => {
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

//https://stackoverflow.com/questions/24035872/return-results-mongoose-in-find-query-to-a-variable


// Capture the POST URL action
app.post("/api/shorturl/new",(req,res)=>{
  let query = createShortURL(req.body.url);
  query.exec((err,linkFound)=>{
    if (err) return console.error(err);
    if (linkFound.length==0){
      console.log(`None found, linkFound inside query of app.post: ${linkFound}`);
      let newLink = new Link({
        original: req.body.url,
        short: Math.random()
      })
      newLink.save((err=>{
        if (err) return console.error(err);
      }));
      res.json({original_url: req.body.url, short_url: newLink.short});
    } else {
      console.log(`Matched, linkFound inside query of app.post: ${linkFound}`);
      console.log(`linkFound[0].short: ${linkFound[0].short}`);
      res.json({original_url: req.body.url, short_url: linkFound[0].short});
    }
  });
});

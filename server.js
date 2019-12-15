'use strict';

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');

const mongo = require('mongodb');
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const dns = require('dns');


const app = express();
app.use(cors());
app.use(bodyParser.urlencoded({ extended: false }));
app.use('/public', express.static(process.cwd() + '/public'));


mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });
const urlSchema = new Schema({
  url: { type: String, required: true },
  short: { type: Number, required: true }
});
const Url = mongoose.model('Url', urlSchema);


app.get('/', (req, res) => res.sendFile(process.cwd() + '/views/index.html'));


app.post('/api/shorturl/new', async (req, res) => {
  const sendError = () => res.json({ error: 'invalid URL' });
  const sendData = (url, short) => res.json({ original_url: url, short_url: short });
  
  let { url } = req.body;
  
  try {
     url = new URL(url);
  } catch {
    return sendError();
  };
  
  const data = await Url.findOne({ url: url.href }, '+url +short');
  if (data) return sendData(data.url, data.short);
  
  dns.lookup(url.hostname, async err => {
    if (err) return sendError();

    const count = await Url.estimatedDocumentCount();
    let record = new Url({ url: url.href, short: count });
    const data = await record.save();
    if (data) sendData(data.url, data.short);
  });
});


app.get('/api/shorturl/:url?', async (req, res) => {
  let short = parseInt(req.params.url);
  if (isNaN(short)) return res.json({ error: 'Wrong Format' });
  
  const data = await Url.findOne({ short });
  if (data) res.redirect(data.url);
  else res.json({ error:	"No short url found for given input" });
});


app.listen(process.env.PORT || 3000, () => console.log('Node.js listening ...'));
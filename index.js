const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const path = require('path');

app.set('port', 4001);
app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());

app.get('/', function(req,res) {
  res.send('<H1>Server</h1>');
});

const monkey = require('./monkey')(app, {threshold: 5, limit: 10});

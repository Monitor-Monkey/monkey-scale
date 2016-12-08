# monkey-scale

Automatically scale you node clusters up and down. Also monitor your cluster's performance.

``` bash

const express = require("express");
const app = express();
const monkey = require("monkey");

// normal configuration
app.set("port", 3000);
app.get("/", function(req,res) {
  res.send("<h1>Your Server</h1>");
})

// monkey will listen to the port specified
// pass empty parameters for default configuration
monkey(app, {});

// or set minimum and maximum number of workers
monkey(app, {threshold:4,limit:8});

```

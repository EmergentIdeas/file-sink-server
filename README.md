# File Sink Server

Lets express read and write files using normal RESTful HTTP verbs.

## Why

I want to use something else I wrote, [FileSink](https://www.npmjs.com/package/file-sink), to abstract
away just a little bit of the file system interface. I want callers to be able to read and write "files"
without needing to know where, specifically, on disk they're writing to, or even what they're really writing
to. It could be a file system, http, AWS S3, indexeddb, mongodb, or whatever. The caller shouldn't need to
know how to connect to the underlying resource, how to encrypt/decrypt, or anything more than the relative
path.

This is the bridge between a browser side FileSink and one on the web server which reads/writes the local
file system.

While I have some specific uses in mind for this, it also makes it really easy just to provide RESTful access
to files.

## Install

```
npm install file-sink-server
```

## Usage

```
// Serves the contents of a directory named "public" within the current directory
const port = 3001
const express = require('express')
const FileSink = require('file-sink')
const FileSinkServer = require('file-sink-server')

let sink = new FileSink('./public')
let fss = new FileSinkServer(sink)

let app = express()
let http = require('http');
let server = http.createServer(app)
server.listen(port)

let router = express.Router()
fss.addToRouter(router)

app.use('/myfiles', router)

app.use((err, req, res, next) => {
	res.status(err.status)
	res.end()
})
```

Now if you go to http://localhost:3001/myfiles you'll see a directory listing of the "public"
directory. You'll also be able to upload files with the HTTP PUT verb.


## Options

When creating the FileSinkServer, there are lots of options (check jsdoc). Major among them are:


- authorizationProvider: An async function to decide if access is granted based on the path and request. By default all access is granted.
- errorHandler: A function to respond to the user when an error occurs. 
- serveContent: If true, serves content for file and directory GET requests. True by default. If false you can use a templating engine, static-serve, or whatever to serve the real content and just use this as an overlay to change the content.

There are a fair number of examples in the test cases for how those options work.
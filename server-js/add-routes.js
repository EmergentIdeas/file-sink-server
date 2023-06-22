const path = require('path')
const express = require('express');
const webhandle = require('webhandle');
const FileSink = require('file-sink')
const FileSinkServer = require('./file-sink-server')

const filog = require('filter-log')
let log

const bodyParser = require('body-parser')

module.exports = function(app) {
	log = filog('unknown')
	
	
	let publicSink = new FileSink(webhandle.sinks.project.path + '/public')
	
	let sinkRouter = express.Router()
	// sinkRouter.use(bodyParser.raw({type: 'application/octet-stream'}))
	let publicServer = new FileSinkServer(publicSink, {
	})
	publicServer.addToRouter(sinkRouter)
	app.use('/public', sinkRouter)
	
	

	// add a couple javascript based tripartite templates. More a placeholder
	// for project specific templates than it is a useful library.
	require('./add-templates.js')()
	
	app.get('/sinks', (req, res, next) => {
		console.log(webhandle.sinks)
		res.end()
	})

}


const path = require('path')
const express = require('express');
const webhandle = require('webhandle');
const FileSink = require('file-sink')
const FileSinkServer = require('./file-sink-server')

const filog = require('filter-log')
let log


module.exports = function(app) {
	log = filog('unknown')
	
	
	let publicSink = new FileSink(webhandle.sinks.project.path + '/public')
	
	let sinkRouter = express.Router()
	let publicServer = new FileSinkServer(publicSink, {
	})
	publicServer.addToRouter(sinkRouter)
	app.use('/public', sinkRouter)
	
	

	
	app.get('/sinks', (req, res, next) => {
		console.log(webhandle.sinks)
		res.end()
	})

}


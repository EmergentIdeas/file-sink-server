function resolveTestPattern(pattern) {
	if(!pattern) {
		return null
	}
	pattern = pattern.trim()
	if(pattern.startsWith('/')) {
		let parts = pattern.split('/').filter(part => !! part)
		return new RegExp(parts[0], parts[1])
	}
	return new RegExp(pattern)

}


async function findGET(req, res, next) {
	try {
		let path = this.deteriminePath(req)
		let written = false
		
		if(! await this.authorizationProvider(path, req)) {
			return this.errorHandler(401, null, req, res, next)
		}
		res.set('Content-Type', "application/jsonl+json")
		let events = this.fileSink.find({
			startingPath: path
			, file: req.query.file == 'false' ? false : true
			, directory: req.query.directory == 'false' ? false : true
			, namePattern: resolveTestPattern(req.query.namePattern)
			, pathPattern: resolveTestPattern(req.query.pathPattern)
		})
		events.on('data', info => {
			if(written) {
				res.write("\n")
			}
			res.write(JSON.stringify(this.cleanInfo(info)))
			written = true
		})
		.on('done', () => {
			res.end()
		})
	}
	catch(e) {
		return this.errorHandler(404, e, req, res, next)
	}
}

module.exports = findGET
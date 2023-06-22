async function hashGET(req, res, next) {
	try {
		let path = this.deteriminePath(req)
		
		if(! await this.authorizationProvider(path, req)) {
			return this.errorHandler(401, null, req, res, next)
		}
		let info = await this.getInfo(path)
		if(info.directory) {
			return this.errorHandler(405, null, req, res, next, 'Hash not available on a directory')
		}
		let hash = await this.fileSink.createHash(path)
		res.setHeader('Content-Type', 'text/plain')
		res.end(hash)
	}
	catch(e) {
		return this.errorHandler(404, e, req, res, next)
	}
}

module.exports = hashGET
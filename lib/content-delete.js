async function contentDELETE(req, res, next) {
	try {
		let path = this.deteriminePath(req)
		
		if(! await this.authorizationProvider(path, req)) {
			return this.errorHandler(401, null, req, res, next)
		}
		let info = await this.getInfo(path)
		
		let recursive = req.get('Recursive') != 'false'
		
		try {
			await this.fileSink.rm(path, {
				recursive
			})
			res.end()
		}
		catch(e) {
			// use 409 to indicate we can't do this
			return this.errorHandler(409, e, req, res, next)
		}
	}
	catch(e) {
		return this.errorHandler(404, e, req, res, next)
	}
}

module.exports = contentDELETE
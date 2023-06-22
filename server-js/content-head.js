async function contentHEAD(req, res, next) {
	try {
		let path = this.deteriminePath(req)
		
		if(! await this.authorizationProvider(path, req)) {
			return this.errorHandler(401, null, req, res, next)
		}
		let info = await this.getInfo(path)
		res.set(this.genHTTPHeaderAttributes(info, true))	
		res.end()
	}
	catch(e) {
		return this.errorHandler(404, e, req, res, next)
	}
}

module.exports = contentHEAD
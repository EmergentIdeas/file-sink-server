async function infoGET(req, res, next) {
	try {
		let path = this.deteriminePath(req)
		
		if(! await this.authorizationProvider(path, req)) {
			return this.errorHandler(401, null, req, res, next)
		}
		let info = await this.getInfo(path)
		info = this.cleanInfo(info)
		if(path == '') {
			info.name = this.determineRootName(req)
		}
		res.set(this.genHTTPHeaderAttributes(info))	
		res.json(info)
	}
	catch(e) {
		return this.errorHandler(404, e, req, res, next)
	}
}

module.exports = infoGET
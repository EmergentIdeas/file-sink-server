async function contentGET(req, res, next) {
	try {
		let path = this.deteriminePath(req)
		
		if(! await this.authorizationProvider(path, req)) {
			return this.errorHandler(401, null, req, res, next)
		}
		let info = await this.getInfo(path)
		res.set(this.genHTTPHeaderAttributes(info, false))	
		
		if(info.directory) {
			info = this.cleanInfo(info)
			if(path == '') {
				info.name = this.determineRootName(req)
			}
			res.json(info)
		}
		else {
			let stream = this.fileSink.readStream(path)
			stream.pipe(res)
		}
	}
	catch(e) {
		return this.errorHandler(404, e, req, res, next)
	}
}

module.exports = contentGET
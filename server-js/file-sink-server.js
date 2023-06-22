const mime = require('mime')

let defaultDisallowedStatAttributes = require('./disallowed-stat-attributes')
let defaultAuthorizationProvider = require('./authorization-provider')

let defaultErrorHandler = (status = 404, e, req, res, next, msg = "Not Found") => {
	let err = new Error(msg)
	err.status = status
	err.originalError = e
	next(err)
}

class FileSinkServer {

	
	/**
	 * 
	 * @param {FileSink} fileSink 
	 */
	constructor(fileSink, {
		disallowedStatAttributes = defaultDisallowedStatAttributes,
		errorHandler = defaultErrorHandler,
		authorizationProvider = defaultAuthorizationProvider
	} = {}) {

		this.fileSink = fileSink
		this.disallowedStatAttributes = disallowedStatAttributes
		this.errorHandler = errorHandler
		this.authorizationProvider = authorizationProvider
	}
	
	async getInfo(path) {
		return this.fileSink.getFullFileInfo(path)
	}

	cleanInfo(info) {
		delete info.parent
		delete info.relPath
		
		if(info.stat) {
			for(let attr of this.disallowedStatAttributes) {
				delete info.stat[attr]
			}
		}
		if(info.directory && info.stat) {
			delete info.stat.size
		}
		
		if(info.children) {
			for(let child of info.children) {
				this.cleanInfo(child)
			}
		}
		
		return info
	}
	
	deteriminePath(req) {
		let path = req.params["0"]
		if(!path) {
			path = ''
		}
		while(path.endsWith('/')) {
			path = path.substring(0, path.length - 1)
		}
		return path
	}
	determineRootName(req) {
		let url = req.baseUrl || ''
		return url.split('/').pop()
	}
	
	async infoGET(req, res, next) {
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

	async hashGET(req, res, next) {
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
	
	genHTTPHeaderAttributes(info, headRequest) {
		let result = {
			'File-Type': info.directory ? 'directory' : 'file'
		}
		if(info.children) {
			result['Child-Count'] = info.children.length
		}

		if(!info.directory) {
			let type = mime.getType(info.name)
			if(type) {
				result['Content-Type'] = type
			}
		}
		if(headRequest) {
			if(info.stat && info.stat.size) {
				result['Content-Length'] = info.stat.size
			}
		}
		return result
	}
	
	async contentHEAD(req, res, next) {
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
	
	async contentPUTPATCH(req, res, next) {
		let isPut = req.method == 'PUT'
		try {
			let path = this.deteriminePath(req)
			
			if(! await this.authorizationProvider(path, req)) {
				return this.errorHandler(401, null, req, res, next)
			}
			let info = null
			try {
				info = await this.getInfo(path)
			}	
			catch(e) {
				// No problem, it may not exist
			}
			let requestDirectory = req.get('File-Type') == 'directory'
			
			if(info && info.directory && requestDirectory) {
				// It exists, but it's a directory and we're requesting a directory, so
				return res.end()
			}
			else if(info && info.directory != requestDirectory) {
				// It exists but it exists as a different type
				return this.errorHandler(409, null, req, res, next, "Resource Exists")
			}
			else if(requestDirectory) {
				// It's a directory
				await this.fileSink.mkdir(path)
				return res.end()
			}
			else {
				// We're putting file content
				if(req.closed || req._body) {
					// somebody has read all our data for us
					await this.fileSink.write(path, req.body)
					res.end()
				}
				else {
					// we have to read our own data
					if(isPut) {
						await this.fileSink.rm(path)
					}
					let buffers = []
					let position = 0
					let sink = this.fileSink
					let writing = false
					let streamEnded = false

					function tryDone() {
						if(streamEnded && buffers.length == 0) {
							res.end()
						}
					}
					async function writeIt() {
						if(buffers.length > 0) {
							if(!writing) {
								writing = true

								let oldPosition = position
								let currentBuffer = Buffer.concat(buffers)
								buffers.length = 0
								position += currentBuffer.length
								await sink.write(path, currentBuffer, {position: oldPosition})
								writing = false
								tryDone()
							}
							setTimeout(writeIt, 10)
						}
						else {
							tryDone()
						}
					}


					req.on('end', () => {
						streamEnded = true
						setTimeout(writeIt)
					})
					req.on('data', (chunk) => {
						buffers.push(chunk)
						setTimeout(writeIt)
					})
				}
			}
		}
		catch(e) {
			return this.errorHandler(404, e, req, res, next)
		}
	}
	async contentGET(req, res, next) {
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
	
	/**
	 * Adds the listeners to an express router
	 * @param {Router} router 
	 * @returns 
	 */
	addToRouter(router) {
        router.get(/\$info(.*)/, this.infoGET.bind(this))
        router.get(/\$hash(.*)/, this.hashGET.bind(this))
        router.head(/(.*)/, this.contentHEAD.bind(this))
        router.get(/(.*)/, this.contentGET.bind(this))
        router.put(/(.*)/, this.contentPUTPATCH.bind(this))
        return router
    }


}

module.exports = FileSinkServer
const pathtools = require('path')

async function contentPUTPATCH(req, res, next) {
	let isPut = req.method == 'PUT'
	try {
		let path = this.deteriminePath(req)
		let recursive = req.get('Recursive') != 'false'
		
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
			try {
				await this.fileSink.mkdir(path, {
					recursive: recursive
				})
				return res.end()
			}
			catch(e) {
				return this.errorHandler(400, e, req, res, next)
			}
		}
		else {
			// We're putting file content
			if(req.closed || req._body) {
				// somebody has read all our data for us
				if(isPut) {
					await this.fileSink.write(path, req.body)
					res.end()
				}
				else {
					return this.errorHandler(405, null, req, res, next, "Incompatible content type and HTTP method")
				}
			}
			else {
				// we have to read our own data
				if(isPut && info) {
					// we have to wipe out our previous data if we're doing a put
					// and the file exists
					await this.fileSink.rm(path)
				}
				if(recursive) {
					// this is the default and we want to make sure the parent directories exist.
					let parentPath = pathtools.dirname(path)
					try {
						this.fileSink.mkdir(parentPath, {
							recursive: true
						})
					}
					catch(e) {}
				}
				let buffers = []
				let position = 0
				
				if(!isPut) {
					// If this is a patch request, we set the position based on the request
					try {
						position = parseInt(req.get('Position'))
						if(!Number.isInteger(position)) {
							return this.errorHandler(400, null, req, res, next, "Bad position header")
						}
					}
					catch(e) {
						console.log(e)
						return this.errorHandler(400, e, req, res, next, "Bad position header")
					}
				}
				
				let sink = this.fileSink
				let writing = false
				let streamEnded = false
				let everWritten = false
				let self = this
				let error = false

				async function tryDone() {
					if(error) {
						return
					}
					if(streamEnded && buffers.length == 0) {
						if(!everWritten) {
							// if we've never had any data we'll still need to write/clear
							// the contents of the file.
							try {
								await sink.write(path, '')
							}
							catch(e) {
								error = true
								return self.errorHandler(400, null, req, res, next, "Resource location could not be opened")
							}
						}
						res.end()
					}
				}
				async function writeIt() {
					if(error) {
						return
					}
					if(buffers.length > 0) {
						if(!writing) {
							writing = true

							let oldPosition = position
							let currentBuffer = Buffer.concat(buffers)
							buffers.length = 0
							position += currentBuffer.length
							try {
								await sink.write(path, currentBuffer, {position: oldPosition})
							}
							catch(e) {
								writing = false
								error = true
								return self.errorHandler(400, null, req, res, next, "Resource location could not be opened")
							}

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
					everWritten = true
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

module.exports = contentPUTPATCH
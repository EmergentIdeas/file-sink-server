let defaultDisallowedStatAttributes = require('./disallowed-stat-attributes')
let defaultAuthorizationProvider = require('./authorization-provider')
let defaultErrorHandler = require('./default-error-handler')

const contentHEAD = require('./content-head')
const infoGET = require('./info-get')
const hashGET = require('./hash-get')
const contentPUTPATCH = require('./content-put-patch')
const contentGET = require('./content-get')
const contentDELETE = require('./content-delete')
const genHTTPHeaderAttributes = require('./gen-http-header-attributes')
const cleanInfo = require('./clean-info')

class FileSinkServer {

	
	/**
	 * 
	 * @param {FileSink} fileSink 
	 * @param {object} [options]
	 * @param {function} [options.authorizationProvider] An async function to decide if access is granted based on the path 
	 * and request. By default all access is granted.
	 * @param {array} [options.disallowedStatAttributes] An arry of strings to blacklist the stat attributes that 
	 * should not be sent to the caller
	 * @param {function} [options.errorHandler] A function to respond to the user when an error occurs. By default 
	 * it passes 404 to next() but responds directly to others. The theory here is that it doesn't matter much to the api based
	 * workings what 404 handling is used, as long as 404 is eventually returned. However, the other codes really need to be 
	 * returned and there's little chance a browser is hitting them. There's no need to generate pretty messages.
	 * @param {boolean} [serveContent] If true, serves content for file and directory GET requests. True by default. If false
	 * you can use a templating engine, static-serve, or whatever to serve the real content and just use this as an overlay to
	 * change the content.
	 */
	constructor(fileSink, {
		disallowedStatAttributes = defaultDisallowedStatAttributes,
		errorHandler = defaultErrorHandler,
		authorizationProvider = defaultAuthorizationProvider,
		serveContent = true
	} = {}) {

		this.fileSink = fileSink
		this.disallowedStatAttributes = disallowedStatAttributes
		this.errorHandler = errorHandler
		this.authorizationProvider = authorizationProvider
		this.serveContent = serveContent
	}
	
	async getInfo(path) {
		return this.fileSink.getFullFileInfo(path)
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
	
	genHTTPHeaderAttributes = genHTTPHeaderAttributes
	cleanInfo = cleanInfo	

	infoGET = infoGET
	hashGET = hashGET
	contentHEAD = contentHEAD
	contentPUTPATCH = contentPUTPATCH
	contentGET = contentGET
	contentDELETE = contentDELETE
	
	
	/**
	 * Adds the listeners to an express router
	 * @param {Router} router 
	 * @returns 
	 */
	addToRouter(router) {
        router.get(/(.*)\/\$info\/?$/, this.infoGET.bind(this))
        router.get(/(.*)\/\$hash\/?$/, this.hashGET.bind(this))
        router.put(/(.*)/, this.contentPUTPATCH.bind(this))
        router.patch(/(.*)/, this.contentPUTPATCH.bind(this))
        router.delete(/(.*)/, this.contentDELETE.bind(this))
		if(this.serveContent) {
	        router.head(/(.*)/, this.contentHEAD.bind(this))
        	router.get(/(.*)/, this.contentGET.bind(this))
		}
        return router
    }


}

module.exports = FileSinkServer
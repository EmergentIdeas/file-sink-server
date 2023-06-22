let defaultDisallowedStatAttributes = require('./disallowed-stat-attributes')
let defaultAuthorizationProvider = require('./authorization-provider')
let defaultErrorHandler = require('./default-error-handler')

const contentHEAD = require('./content-head')
const infoGET = require('./info-get')
const hashGET = require('./hash-get')
const contentPUTPATCH = require('./content-put-patch')
const contentGET = require('./content-get')
const genHTTPHeaderAttributes = require('./gen-http-header-attributes')
const cleanInfo = require('./clean-info')

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
	
	
	/**
	 * Adds the listeners to an express router
	 * @param {Router} router 
	 * @returns 
	 */
	addToRouter(router) {
        router.get(/(.*)\/\$info\/?$/, this.infoGET.bind(this))
        router.get(/(.*)\/\$hash\/?$/, this.hashGET.bind(this))
        router.head(/(.*)/, this.contentHEAD.bind(this))
        router.get(/(.*)/, this.contentGET.bind(this))
        router.put(/(.*)/, this.contentPUTPATCH.bind(this))
        router.patch(/(.*)/, this.contentPUTPATCH.bind(this))
        return router
    }


}

module.exports = FileSinkServer
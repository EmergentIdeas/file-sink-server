let defaultErrorHandler = (status = 404, e, req, res, next, msg = "Not Found") => {
	let err = new Error(msg)
	err.status = status
	err.originalError = e
	next(err)
}

module.exports = defaultErrorHandler

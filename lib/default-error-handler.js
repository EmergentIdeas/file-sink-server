let defaultErrorHandler = (status = 404, e, req, res, next, msg = "Not Found") => {
	let err = new Error(msg)
	err.status = status
	err.originalError = e
	if(status == 404) {
		next(err)
	}
	else {
		res.status(err.status)
		res.end()
	}
}

module.exports = defaultErrorHandler

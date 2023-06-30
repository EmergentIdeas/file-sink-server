require('mocha')
var expect = require('chai').expect
var assert = require('chai').assert
const FileSinkServer = require('../lib/file-sink-server')
const FileSink = require('file-sink')
const fs = require('fs')
const axios = require('axios')
let disallowed = require('../lib/disallowed-stat-attributes')

let dirName = fs.mkdtempSync('/tmp/filesinkservertest')
console.log(`temporary directory: ${dirName}`)

let sink = new FileSink(dirName)
let fss = new FileSinkServer(sink)

let testSink = new FileSink('./test-data')

const port = 3001
const express = require('express')


let app = express()
app.set('port', port)
let http = require('http');
let server = http.createServer(app)
server.listen(port)

let router = express.Router()
fss.addToRouter(router)

app.use('/store1', router)

app.use((err, req, res, next) => {
	res.status(err.status)
	res.end()
})

let testData = 'abcdefg'

async function addTests() {
	
	await sink.write('test1.txt', testData) 



	function addTests() {
		it('read file', async function() {
			let response = await axios.get(`http://localhost:${port}/store1/test1.txt`)
			assert.equal(response.data, testData)
		})
		it('read file, trailing slash', async function() {
			let response = await axios.get(`http://localhost:${port}/store1/test1.txt/`)
			assert.equal(response.data, testData)
		})
		it('read info', async function() {
			let response = await axios.get(`http://localhost:${port}/store1/$info`)
			assert.equal(response.data.children.length, 1)
		})
		it('read head', async function() {
			let response = await axios.head(`http://localhost:${port}/store1/test1.txt`)
			assert.equal(response.headers['content-length'], '7')
		})
		it('read hash', async function() {
			let response = await axios.get(`http://localhost:${port}/store1/test1.txt/$hash`)
			assert.equal(response.data, await sink.createHash('test1.txt'))
		})
		it('read hash, missing file', async function() {
			try {
				await axios.get(`http://localhost:${port}/store1/text1.txt/$hash`)
			}
			catch(e) {
				let status = e.response.status
				assert.isTrue(status == 404)
				return
			}
			throw new Error()	
		})
		it('read non-existant file', async function() {
			try {
				await axios.get(`http://localhost:${port}/store1/test2.txt`)
			}
			catch(e) {
				assert.equal(e.response.status, 404)
				return
			}
			throw new Error()	
		})
		it('write blank file', async function() {
			let filename = 'blank.txt'

			let response = await axios({
				method: 'put',
				url: `http://localhost:${port}/store1/${filename}`,
				data: Buffer.from(''),
				headers: {
					'Content-Type': 'application/octet-stream'
				}
			})

			assert.equal(response.status, 200)
			assert.equal(0, (await sink.getFullFileInfo(filename)).stat.size)
		})
		it('write info', async function() {
			let filename = 'campfire.jpg'

			let response = await axios({
				method: 'put',
				url: `http://localhost:${port}/store1/${filename}`,
				data: testSink.readStream(filename),
				headers: {
					'Content-Type': 'application/octet-stream'
				}
			})

			assert.equal(response.status, 200)
			assert.equal(await sink.createHash(filename), await testSink.createHash(filename))
		})
		it('test shorter rewrite', async function() {
			let filename = 'campfire.jpg'

			let response = await axios({
				method: 'put',
				url: `http://localhost:${port}/store1/${filename}`,
				data: testData,
				headers: {
					'Content-Type': 'application/octet-stream'
				}
			})

			assert.equal(response.status, 200)
			assert.equal((await sink.getFullFileInfo(filename)).stat.size, testData.length)
		})
		it('test file info', async function() {
			let filename = 'campfire.jpg'

			let response = await axios({
				method: 'get',
				url: `http://localhost:${port}/store1/${filename}/\$info`
			})

			assert.equal(response.status, 200)
			assert.equal(response.data.stat.size, testData.length)
		})
		it('test file info, trailing slash', async function() {
			let filename = 'campfire.jpg'

			let response = await axios({
				method: 'get',
				url: `http://localhost:${port}/store1/${filename}/\$info/`,
				headers: {
					'Content-Type': 'application/octet-stream'
				}
			})

			assert.equal(response.status, 200)
			assert.equal(response.data.stat.size, testData.length)
		})
		it('patch write', async function() {
			let filename = 'campfire.jpg'

			let response = await axios({
				method: 'patch',
				url: `http://localhost:${port}/store1/${filename}`,
				data: '123',
				headers: {
					'Content-Type': 'application/octet-stream',
					'Position': '1'
				}
			})

			assert.equal(response.status, 200)
			assert.equal((await sink.getFullFileInfo(filename)).stat.size, testData.length)
			
			response = await axios.get(`http://localhost:${port}/store1/${filename}`)
			assert.equal(response.data, 'a123' + testData.substring(4))
			

			response = await axios({
				method: 'patch',
				url: `http://localhost:${port}/store1/${filename}`,
				data: '123',
				headers: {
					'Content-Type': 'application/octet-stream',
					'Position': '7'
				}
			})
			let contentResponse = await axios.get(`http://localhost:${port}/store1/${filename}`)
			let fileInfo = await sink.getFullFileInfo(filename)
			assert.equal(contentResponse.status, 200)
			assert.equal(fileInfo.stat.size, testData.length + 3)
			
			response = await axios.get(`http://localhost:${port}/store1/${filename}`)
			assert.equal(response.data, 'a123' + testData.substring(4) + '123')
		})
		it('mkdir', async function() {
			let filename = 'dir2'

			let response = await axios({
				method: 'put',
				url: `http://localhost:${port}/store1/${filename}`,
				headers: {
					'File-Type': 'directory'
				}
			})

			assert.equal(response.status, 200)
			let name = (await sink.getFullFileInfo(filename)).name
			assert.equal(name, filename)
		})
		it('read hash directory', async function() {
			try {
				await axios.get(`http://localhost:${port}/store1/dir2/$hash`)
			}
			catch(e) {
				let status = e.response.status
				assert.isTrue(status == 405)
				return
			}
			throw new Error()	
		})
		it('mkdir for existing directory', async function() {
			let filename = 'dir2'

			let response = await axios({
				method: 'put',
				url: `http://localhost:${port}/store1/${filename}`,
				headers: {
					'File-Type': 'directory'
				}
			})

			assert.equal(response.status, 200)
			let name = (await sink.getFullFileInfo(filename)).name
			assert.equal(name, filename)
		})
		it('write file to directory', async function() {
			let filename = 'campfire.jpg'
			try {
				await axios({
					method: 'put',
					url: `http://localhost:${port}/store1/dir2`,
					data: testSink.readStream(filename),
					headers: {
						'Content-Type': 'application/octet-stream'
					}
				})
			}
			catch(e) {
				if(!e.response) {
					// This is okay too. What can happen here is that axios is
					// still attempting to send data when the server closes the connection
					// with a status code.
					// That causes axios to ignore the response (seems like a bug) and surface
					// the error is if it were a broken pipe, which means no response body.
				}
				else {
					let status = e.response.status
					assert.isTrue(status == 409)
				}
				return
			}
			throw new Error()	

		})
		it('mkdir for existing file', async function() {
			try {
				await axios({
					method: 'put',
					url: `http://localhost:${port}/store1/campfire.jpg`,
					headers: {
						'File-Type': 'directory'
					}
				})
			}
			catch(e) {
				let status = e.response.status
				assert.isTrue(status == 409)
				return
			}
			throw new Error()	

		})
		it('write info into directory', async function() {
			let filename = 'campfire.jpg'

			let response = await axios({
				method: 'put',
				url: `http://localhost:${port}/store1/dir2/${filename}`,
				data: testSink.readStream(filename),
				headers: {
					'Content-Type': 'application/octet-stream'
				}
			})

			assert.equal(response.status, 200)
			assert.equal(await sink.createHash('dir2/' + filename), await testSink.createHash(filename))
		})
		it('delete file', async function() {
			await axios({
				method: 'delete',
				url: `http://localhost:${port}/store1/campfire.jpg`,
			})
			try {
				await axios({
					method: 'get',
					url: `http://localhost:${port}/store1/campfire.jpg`,
				})
			}
			catch(e) {
				let status = e.response.status
				assert.isTrue(status == 404)
				return
			}
			throw new Error()	

		})
		it('delete directory', async function() {
			try {
				await axios({
					method: 'delete',
					url: `http://localhost:${port}/store1/dir2`,
					headers: {
						Recursive: 'false'
					}
				})
			}
			catch(e) {
				// the delete should return an error code
				let status = e.response.status
				assert.isTrue(status == 409)
			}
			
			// We shouldn't get an error here because the directory still exists
			await axios({
				method: 'get',
				url: `http://localhost:${port}/store1/dir2/$info`,
			})

		})
		it('delete directory', async function() {
			await axios({
				method: 'delete',
				url: `http://localhost:${port}/store1/dir2`
			})
			try {
				await axios({
					method: 'get',
					url: `http://localhost:${port}/store1/dir2/$info`,
				})
				// We should get an error because the directory no longer exists
			}
			catch(e) {
				let status = e.response.status
				assert.isTrue(status == 404)
				return
			}
			throw new Error()	

		})
		it('shutdown', async function() {
			try {
				await sink.rm('', {recursive: true})
			}
			catch(e) {
				console.log(e)
			}
			server.close()
		})
	}

	describe("requested data, initial setup", function() {
		addTests()
	})
}

addTests()
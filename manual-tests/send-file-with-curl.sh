#!/bin/bash
cat test-data/campfire.jpg | curl -X PUT -H "Content-Type: application/octet-stream" --data-binary @-  http://localhost:3000/public/img/campfire.jpg

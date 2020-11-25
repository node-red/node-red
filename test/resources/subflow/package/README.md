curl -H "Content-Type: application/json" --request POST  --data '{"url":"/Users/nol/code/node-red/node-red/test/resources/subflow/test-subflow-mod-1.0.0.tgz","module":"test-subflow-mod"}' http://localhost:1880/nodes

curl --request DELETE http://localhost:1880/nodes/test-subflow-mod
